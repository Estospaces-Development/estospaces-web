#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-cloud-run.sh"

run_case() {
  local scenario="$1"
  local expected_exit="$2"
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
  printf 'registry.test/service@sha256:%064d\n' 0
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
if [[ "$*" == *"candidate.test/health"* ]]; then
  [[ "$SCENARIO" != "pre_promotion_failure" ]]
elif [[ "$SCENARIO" == "cancellation" ]]; then
  kill -TERM "$PPID"
  /bin/sleep 0.1
  exit 22
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
  export SERVICE_NAME=service
  export TARGET_ENV=prod
  export REGION=europe-west2
  export PROJECT_ID=project
  export IMAGE_TAG=registry.test/service:tag
  export GITHUB_RUN_ID=10
  export GITHUB_RUN_ATTEMPT=1
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

run_case pre_promotion_failure 1
run_case post_promotion_failure 22
run_case cancellation 143
run_case rollback_failure 22
echo "Deployment failure and rollback scenarios passed."
