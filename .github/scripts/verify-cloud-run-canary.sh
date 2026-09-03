#!/usr/bin/env bash
set -Eeuo pipefail

: "${SERVICE_TARGET:?SERVICE_TARGET is required}"
: "${CANDIDATE_REVISION:?CANDIDATE_REVISION is required}"
: "${EXPECTED_BUILD_REVISION:?EXPECTED_BUILD_REVISION is required}"
: "${REGION:?REGION is required}"
: "${PROJECT_ID:?PROJECT_ID is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
: "${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"

PROBE_PHASE="${PROBE_PHASE:-initial}"
PROBE_ATTEMPTS="${PROBE_ATTEMPTS:-200}"
PROBE_DEADLINE_SECONDS="${PROBE_DEADLINE_SECONDS:-180}"
PROBE_PREFIX="canary-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${PROBE_PHASE}"

if [[ ! "$PROBE_ATTEMPTS" =~ ^[0-9]+$ ]] || (( PROBE_ATTEMPTS < 1 || PROBE_ATTEMPTS > 200 )); then
  echo "PROBE_ATTEMPTS must be an integer from 1 through 200." >&2
  exit 1
fi
if [[ ! "$PROBE_DEADLINE_SECONDS" =~ ^[0-9]+$ ]] || (( PROBE_DEADLINE_SECONDS < 1 || PROBE_DEADLINE_SECONDS > 300 )); then
  echo "PROBE_DEADLINE_SECONDS must be an integer from 1 through 300." >&2
  exit 1
fi
if [[ ! "$EXPECTED_BUILD_REVISION" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; then
  echo "EXPECTED_BUILD_REVISION must contain the Git SHA, workflow run, and attempt." >&2
  exit 1
fi

probe_surface() {
  local name="$1"
  local base_url="$2"
  local path="$3"
  local expected_kind="$4"
  local deadline=$((SECONDS + PROBE_DEADLINE_SECONDS))

  for ((attempt = 1; attempt <= PROBE_ATTEMPTS && SECONDS < deadline; attempt += 1)); do
    local token="${PROBE_PREFIX}-${name}-${attempt}"
    local separator="?"
    [[ "$path" == *\?* ]] && separator="&"
    local url="${base_url}${path}${separator}canary_probe=${token}"
    local body_file header_file
    body_file="$(mktemp)"
    header_file="$(mktemp)"
    local status="000"
    if ! status="$(curl --silent --show-error --location --connect-timeout 3 --max-time 10 \
      --dump-header "$header_file" --output "$body_file" --write-out '%{http_code}' "$url")"; then
      status="000"
    fi

    local response_ok=0
    if [[ "$status" == "200" ]]; then
      case "$expected_kind" in
        health)
          jq -e '.status == "ok" and .service == "estospaces-web"' "$body_file" >/dev/null && response_ok=1
          ;;
        shell)
          grep -Fq 'id="root"' "$body_file" && response_ok=1
          ;;
        *)
          echo "Unknown response contract ${expected_kind}." >&2
          rm -f "$body_file" "$header_file"
          exit 1
          ;;
      esac
    fi

    local served_build
    served_build="$(awk 'tolower($1) == "x-estospaces-build:" { gsub("\r", "", $2); value=$2 } END { print value }' "$header_file")"
    rm -f "$body_file" "$header_file"
    if [[ "$response_ok" == "1" && "$served_build" == "$EXPECTED_BUILD_REVISION" ]]; then
      echo "Verified ${name}: ${token} was served by build ${EXPECTED_BUILD_REVISION} on ${CANDIDATE_REVISION}."
      return 0
    fi
  done

  echo "No successful ${name} probe was served by expected build ${EXPECTED_BUILD_REVISION}." >&2
  return 1
}

probe_pids=()
probe_surface app_health "https://app.estospaces.com" "/health" health &
probe_pids+=("$!")
probe_surface app_login "https://app.estospaces.com" "/login/" shell &
probe_pids+=("$!")
probe_surface admin_login "https://admin.estospaces.com" "/login/" shell &
probe_pids+=("$!")

probe_failed=0
for probe_pid in "${probe_pids[@]}"; do
  if ! wait "$probe_pid"; then
    probe_failed=1
  fi
done
if (( probe_failed != 0 )); then
  exit 1
fi

MONITORING_TOKEN="$(gcloud auth print-access-token)"
MONITORING_START="$(date -u -d '15 minutes ago' '+%Y-%m-%dT%H:%M:%SZ')"
MONITORING_END="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
MONITORING_FILTER="metric.type=\"run.googleapis.com/request_count\" AND resource.labels.service_name=\"${SERVICE_TARGET}\" AND resource.labels.revision_name=\"${CANDIDATE_REVISION}\" AND resource.labels.location=\"${REGION}\" AND metric.labels.response_code_class=\"5xx\""
MONITORING_RESPONSE="$(mktemp)"
trap 'rm -f "$MONITORING_RESPONSE"' EXIT
curl --fail --silent --show-error --get \
  --header "Authorization: Bearer ${MONITORING_TOKEN}" \
  --data-urlencode "filter=${MONITORING_FILTER}" \
  --data-urlencode "interval.startTime=${MONITORING_START}" \
  --data-urlencode "interval.endTime=${MONITORING_END}" \
  --data-urlencode 'view=FULL' \
  --output "$MONITORING_RESPONSE" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries"
SERVER_ERROR_COUNT="$(jq -r '[.timeSeries[]?.points[]?.value.int64Value | tonumber] | add // 0' "$MONITORING_RESPONSE")"
if (( SERVER_ERROR_COUNT > 0 )); then
  echo "Candidate ${CANDIDATE_REVISION} recorded ${SERVER_ERROR_COUNT} HTTP 5xx responses during canary verification." >&2
  exit 1
fi

echo "Candidate ${CANDIDATE_REVISION} passed build-correlated app/admin route probes and the HTTP 5xx monitoring gate."
