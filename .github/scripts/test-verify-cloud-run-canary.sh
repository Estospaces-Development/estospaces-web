#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-cloud-run-canary.sh"
TEST_BUILD_REVISION="0123456789abcdef0123456789abcdef01234567-123-1"

run_case() {
  local scenario="$1"
  local expected_exit="$2"
  local sandbox
  sandbox="$(mktemp -d)"
  trap 'rm -rf "$sandbox"' RETURN
  mkdir -p "$sandbox/bin"

  cat >"$sandbox/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -u
output_file=""
header_file=""
url="${*: -1}"
while (($#)); do
  case "$1" in
    --output)
      output_file="$2"
      shift 2
      ;;
    --dump-header)
      header_file="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

if [[ "$url" == *'monitoring.googleapis.com'* ]]; then
  if [[ "$SCENARIO" == "candidate_error" ]]; then
    printf '%s\n' '{"timeSeries":[{"points":[{"value":{"int64Value":"1"}}]}]}' >"$output_file"
  else
    printf '%s\n' '{}' >"$output_file"
  fi
  exit 0
fi

if [[ "$SCENARIO" == "deadline" ]]; then
  sleep 2
  exit 28
fi
if [[ "$SCENARIO" == "transient_transport" && "$url" == *'-1' ]]; then
  exit 6
fi
served_build="$TEST_BUILD_REVISION"
[[ "$SCENARIO" == "wrong_build" ]] && served_build="ffffffffffffffffffffffffffffffffffffffff"
printf 'HTTP/2 200\r\nX-Estospaces-Build: %s\r\n\r\n' "$served_build" >"$header_file"
if [[ "$SCENARIO" == "bad_body" ]]; then
  printf '%s\n' '<html>wrong</html>' >"$output_file"
elif [[ "$url" == *'/health?'* ]]; then
  printf '%s\n' '{"status":"ok","service":"estospaces-web"}' >"$output_file"
else
  printf '%s\n' '<html><body><div id="root"></div></body></html>' >"$output_file"
fi
printf '200'
MOCK

  cat >"$sandbox/bin/gcloud" <<'MOCK'
#!/usr/bin/env bash
set -u
[[ "$*" == 'auth print-access-token' ]] && printf '%s\n' 'test-token'
MOCK

  chmod +x "$sandbox/bin/curl" "$sandbox/bin/gcloud"
  export SCENARIO="$scenario"
  export TEST_BUILD_REVISION
  export SERVICE_TARGET=estospaces-web-prod
  export CANDIDATE_REVISION=new-rev
  export EXPECTED_BUILD_REVISION="$TEST_BUILD_REVISION"
  export REGION=europe-west2
  export PROJECT_ID=project
  export GITHUB_RUN_ID=123
  export GITHUB_RUN_ATTEMPT=1
  export PROBE_PHASE=test
  export PROBE_ATTEMPTS=1
  export PROBE_DEADLINE_SECONDS=5
  [[ "$scenario" == "transient_transport" ]] && export PROBE_ATTEMPTS=2
  if [[ "$scenario" == "deadline" ]]; then
    export PROBE_ATTEMPTS=200
    export PROBE_DEADLINE_SECONDS=1
  fi

  set +e
  PATH="$sandbox/bin:$PATH" bash "$VERIFY_SCRIPT" >"$sandbox/stdout" 2>"$sandbox/stderr"
  actual_exit=$?
  set -e
  if [[ "$actual_exit" != "$expected_exit" ]]; then
    echo "$scenario: expected exit $expected_exit, got $actual_exit" >&2
    cat "$sandbox/stdout" "$sandbox/stderr" >&2
    return 1
  fi

  case "$scenario" in
    success|transient_transport)
      grep -q 'passed build-correlated app/admin route probes' "$sandbox/stdout"
      ;;
    bad_body|wrong_build)
      grep -q 'No successful app_health probe' "$sandbox/stderr"
      ;;
    deadline)
      grep -q 'No successful .* probe' "$sandbox/stderr"
      ;;
    candidate_error)
      grep -q 'recorded 1 HTTP 5xx' "$sandbox/stderr"
      ;;
  esac
}

run_case success 0
run_case bad_body 1
run_case wrong_build 1
run_case candidate_error 1
run_case transient_transport 0
run_case deadline 1
echo "Canary build correlation, response contract, bounded deadline, transient transport, and monitoring scenarios passed."
