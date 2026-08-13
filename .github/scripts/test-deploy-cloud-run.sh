#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-cloud-run.sh"

run_case() {
  local scenario="$1"
  local expected_exit="$2"
  local run_attempt="${3:-1}"
  local sandbox
  sandbox="$(mktemp -d)"
  trap 'rm -rf "$sandbox"' RETURN
  mkdir -p "$sandbox/bin"

  cat >"$sandbox/bin/gcloud" <<'MOCK'
#!/usr/bin/env bash
set -u
echo "$*" >>"$MOCK_LOG"
if [[ "$*" == "run services describe "* ]]; then
  count="$(cat "$DESCRIBE_COUNT" 2>/dev/null || echo 0)"
  count=$((count + 1))
  echo "$count" >"$DESCRIBE_COUNT"
  case "$count" in
    1) printf '%s\n' '{"status":{"traffic":[{"percent":100,"revisionName":"old-rev"}],"url":"https://service.test"}}' ;;
    2) printf '%s\n' '{"status":{"traffic":[{"tag":"candidate-10-1","revisionName":"new-rev","url":"https://candidate.test"}]}}' ;;
    *) printf '%s\n' '{"status":{"traffic":[{"percent":100,"revisionName":"new-rev"}],"url":"https://service.test"}}' ;;
  esac
elif [[ "$*" == "artifacts docker images describe "* ]]; then
  printf 'sha256:%064d\n' 0
elif [[ "$*" == "run revisions describe "* ]]; then
  if [[ "$SCENARIO" == "pre_promotion_failure" ]]; then
    printf '%s\n' '{"spec":{"containers":[{"image":"registry.test/service@sha256:0000000000000000000000000000000000000000000000000000000000000000"}]},"status":{"conditions":[{"type":"Ready","status":"False"}]}}'
  else
    printf '%s\n' '{"spec":{"containers":[{"image":"registry.test/service@sha256:0000000000000000000000000000000000000000000000000000000000000000"}]},"status":{"conditions":[{"type":"Ready","status":"True"}]}}'
  fi
elif [[ "$*" == *"run services update-traffic"*"old-rev=100"* ]]; then
  echo ROLLBACK >>"$EVENT_LOG"
  [[ "$SCENARIO" != "rollback_failure" ]]
elif [[ "$*" == *"run services update-traffic"*"new-rev=100"* ]]; then
  echo PROMOTE >>"$EVENT_LOG"
fi
MOCK

  cat >"$sandbox/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -u
if [[ "$SCENARIO" == "cancellation" ]]; then
  kill -TERM "$PPID"
  /bin/sleep 0.1
  exit 22
elif [[ "$*" == *".estospaces.com/health"* ]]; then
  [[ "$SCENARIO" != "post_promotion_failure" && "$SCENARIO" != "rollback_failure" ]]
else
  exit 22
fi
MOCK

  cat >"$sandbox/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

  cat >"$sandbox/bin/jq" <<'MOCK'
#!/usr/bin/env bash
set -u
input="$(cat)"
if [[ "$*" == *"--arg tag"* ]]; then
  if [[ "$*" == *".url"* ]]; then
    echo "https://candidate.test"
  else
    echo "new-rev"
  fi
elif [[ "$*" == *".status.url"* ]]; then
  echo "https://service.test"
elif [[ "$*" == *".status.conditions"* ]]; then
  if [[ "$input" == *'"status":"True"'* ]]; then echo True; else echo False; fi
elif [[ "$*" == *".spec.containers[0].image"* ]]; then
  echo "registry.test/service@sha256:0000000000000000000000000000000000000000000000000000000000000000"
elif [[ "$input" == *"old-rev"* ]]; then
  echo "old-rev"
else
  echo "new-rev"
fi
MOCK
  chmod +x "$sandbox/bin/gcloud" "$sandbox/bin/curl" "$sandbox/bin/sleep" "$sandbox/bin/jq"

  export SCENARIO="$scenario"
  export MOCK_LOG="$sandbox/gcloud.log"
  export EVENT_LOG="$sandbox/events.log"
  export DESCRIBE_COUNT="$sandbox/describe-count"
  export SERVICE_NAME=estospaces-notification-service
  export TARGET_ENV=prod
  export REGION=europe-west2
  export PROJECT_ID=project
  export IMAGE_TAG=registry.test/service:tag
  export GITHUB_RUN_ID=31461798217
  export GITHUB_RUN_ATTEMPT="$run_attempt"
  export GITHUB_OUTPUT="$sandbox/output"

  set +e
  PATH="$sandbox/bin:$PATH" bash "$DEPLOY_SCRIPT" >"$sandbox/stdout" 2>"$sandbox/stderr"
  actual_exit=$?
  set -e
  if [[ "$actual_exit" != "$expected_exit" ]]; then
    echo "$scenario: expected exit $expected_exit, got $actual_exit" >&2
    cat "$sandbox/stdout" "$sandbox/stderr" >&2
    return 1
  fi
  expected_tag="c$(printf '%s' "${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}" | sha256sum | cut -c1-9)"
  [[ "${#expected_tag}" == "10" ]]
  combined_length=$((${#SERVICE_NAME} + 1 + ${#TARGET_ENV} + ${#expected_tag}))
  [[ "$combined_length" -le 46 ]]
  grep -q -- "--tag=${expected_tag}" "$sandbox/gcloud.log"

  case "$scenario" in
    pre_promotion_failure)
      ! grep -q ROLLBACK "$sandbox/events.log" 2>/dev/null
      ;;
    post_promotion_failure|cancellation)
      grep -q PROMOTE "$sandbox/events.log"
      grep -q ROLLBACK "$sandbox/events.log"
      ;;
    rollback_failure)
      grep -q PROMOTE "$sandbox/events.log"
      grep -q ROLLBACK "$sandbox/events.log"
      grep -q "Automatic rollback failed" "$sandbox/stderr"
      ;;
  esac
}

run_case pre_promotion_failure 1 1
run_case post_promotion_failure 1 10
run_case cancellation 143 999999
run_case rollback_failure 1 123456789
echo "Deployment failure and rollback scenarios passed."
