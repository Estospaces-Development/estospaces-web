#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-cloud-run.sh"
TEST_SERVICE_NAME="estospaces-web"
TEST_EXPECTED_SERVICE="estospaces-web"
TEST_HEALTH_HOST="app.estospaces.com/health"

run_case() {
  local scenario="$1"
  local expected_exit="$2"
  local run_attempt="${3:-1}"
  local canary_percent="${4:-100}"
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
    2) printf '{"status":{"traffic":[{"tag":"%s","revisionName":"new-rev"}],"url":"https://service.test"}}\n' "$EXPECTED_TAG" ;;
    *)
      if [[ "$CANARY_PERCENT" == "100" ]]; then
        printf '%s\n' '{"status":{"traffic":[{"percent":100,"revisionName":"new-rev"}],"url":"https://service.test"}}'
      else
        printf '{"status":{"traffic":[{"percent":%s,"revisionName":"new-rev","tag":"%s"},{"percent":%s,"revisionName":"old-rev"}],"url":"https://service.test"}}\n' "$CANARY_PERCENT" "$EXPECTED_TAG" "$((100 - CANARY_PERCENT))"
      fi
      ;;
  esac
elif [[ "$*" == "artifacts docker images describe "* ]]; then
  printf 'sha256:%064d\n' 0
elif [[ "$*" == "run revisions describe "* ]]; then
  ready=True
  image="registry.test/service@sha256:0000000000000000000000000000000000000000000000000000000000000000"
  [[ "$SCENARIO" == "pre_promotion_failure" ]] && ready=False
  [[ "$SCENARIO" == "image_mismatch" ]] && image="registry.test/service@sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  printf '{"spec":{"containers":[{"image":"%s"}]},"status":{"conditions":[{"type":"Ready","status":"%s"}]}}\n' "$image" "$ready"
elif [[ "$*" == *"run services update-traffic"*"old-rev=100"* ]]; then
  echo ROLLBACK >>"$EVENT_LOG"
  [[ "$SCENARIO" != "rollback_failure" ]]
elif [[ "$*" == *"run services update-traffic"*"new-rev=100"* ]]; then
  echo PROMOTE >>"$EVENT_LOG"
elif [[ "$*" == *"run services update-traffic"*"--to-tags="* ]]; then
  echo CANARY >>"$EVENT_LOG"
fi
MOCK

  cat >"$sandbox/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -u
echo "$*" >>"$CURL_LOG"
if [[ "$SCENARIO" == "cancellation" ]]; then
  kill -TERM "$PPID"
  /bin/sleep 0.1
  exit 22
fi
if [[ "$*" != *"$TEST_HEALTH_HOST"* ]]; then
  exit 22
fi
case "$SCENARIO" in
  post_promotion_failure|rollback_failure) exit 22 ;;
  wrong_service) printf '%s\n' '{"status":"ok","service":"wrong-service"}' ;;
  invalid_body) printf '%s\n' '<html>healthy</html>' ;;
  *) printf '{"status":"ok","service":"%s"}\n' "$TEST_EXPECTED_SERVICE" ;;
esac
MOCK

  cat >"$sandbox/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

  chmod +x "$sandbox/bin/gcloud" "$sandbox/bin/curl" "$sandbox/bin/sleep"

  export SCENARIO="$scenario"
  export MOCK_LOG="$sandbox/gcloud.log"
  export CURL_LOG="$sandbox/curl.log"
  export EVENT_LOG="$sandbox/events.log"
  export DESCRIBE_COUNT="$sandbox/describe-count"
  export TEST_HEALTH_HOST TEST_EXPECTED_SERVICE
  export SERVICE_NAME="$TEST_SERVICE_NAME"
  export TARGET_ENV=prod
  export REGION=europe-west2
  export PROJECT_ID=project
  export IMAGE_TAG=registry.test/service:tag
  export GITHUB_RUN_ID=31461798217
  export GITHUB_RUN_ATTEMPT="$run_attempt"
  export GITHUB_OUTPUT="$sandbox/output"
  export EXPECTED_TAG="c$(printf '%s' "${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}" | sha256sum | cut -c1-9)"
  export CANARY_PERCENT="$canary_percent"

  set +e
  PATH="$sandbox/bin:$PATH" bash "$DEPLOY_SCRIPT" >"$sandbox/stdout" 2>"$sandbox/stderr"
  actual_exit=$?
  set -e
  if [[ "$actual_exit" != "$expected_exit" ]]; then
    echo "$scenario: expected exit $expected_exit, got $actual_exit" >&2
    cat "$sandbox/stdout" "$sandbox/stderr" >&2
    return 1
  fi

  expected_tag="$EXPECTED_TAG"
  [[ "${#expected_tag}" == "10" ]]
  combined_length=$((${#SERVICE_NAME} + 1 + ${#TARGET_ENV} + ${#expected_tag}))
  [[ "$combined_length" -le 46 ]]
  grep -q -- "--tag=${expected_tag}" "$sandbox/gcloud.log"
  if [[ "$scenario" == "canary_success" ]]; then
    ! grep -q -- "--remove-tags=${expected_tag}" "$sandbox/gcloud.log"
  else
    grep -q -- "--remove-tags=${expected_tag}" "$sandbox/gcloud.log"
  fi
  if [[ "$scenario" == "post_promotion_failure" || "$scenario" == "wrong_service" || "$scenario" == "invalid_body" || "$scenario" == "rollback_failure" ]]; then
    [[ "$(wc -l <"$sandbox/curl.log")" == "12" ]]
  fi

  case "$scenario" in
    success)
      grep -q PROMOTE "$sandbox/events.log"
      ! grep -q ROLLBACK "$sandbox/events.log"
      grep -q -- "$TEST_HEALTH_HOST" "$sandbox/curl.log"
      grep -q "candidate_revision=new-rev" "$sandbox/output"
      ;;
    canary_success)
      grep -q CANARY "$sandbox/events.log"
      ! grep -q PROMOTE "$sandbox/events.log"
      ! grep -q ROLLBACK "$sandbox/events.log"
      grep -q "candidate_tag=${expected_tag}" "$sandbox/output"
      ;;
    pre_promotion_failure|image_mismatch)
      ! grep -q PROMOTE "$sandbox/events.log" 2>/dev/null
      ! grep -q ROLLBACK "$sandbox/events.log" 2>/dev/null
      ;;
    post_promotion_failure|wrong_service|invalid_body|cancellation)
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

run_case success 0 1
run_case canary_success 0 9 5
run_case pre_promotion_failure 1 2
run_case image_mismatch 1 3
run_case post_promotion_failure 1 4
run_case wrong_service 1 5
run_case invalid_body 1 6
run_case cancellation 143 7
run_case rollback_failure 1 8
echo "Deployment success, canary split, health contract, cleanup, and rollback scenarios passed."
