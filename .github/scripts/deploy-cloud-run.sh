#!/usr/bin/env bash
set -Eeuo pipefail

: "${SERVICE_NAME:?SERVICE_NAME is required}"
: "${TARGET_ENV:?TARGET_ENV is required}"
: "${REGION:?REGION is required}"
: "${PROJECT_ID:?PROJECT_ID is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

SERVICE_TARGET="${SERVICE_NAME}-${TARGET_ENV}"
CANDIDATE_TAG="c$(printf '%s' "${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}" | sha256sum | cut -c1-9)"
TRAFFIC_SHIFTED=0
PREVIOUS_REVISION=""
CANDIDATE_TAG_CREATED=0

rollback() {
  local exit_code="${1:-$?}"
  trap - EXIT INT TERM
  if [[ "$exit_code" == "0" ]]; then
    exit 0
  fi
  if [[ "$TRAFFIC_SHIFTED" == "1" && -n "$PREVIOUS_REVISION" ]]; then
    echo "Deployment failed after promotion; restoring ${PREVIOUS_REVISION}."
    set +e
    gcloud run services update-traffic "$SERVICE_TARGET" \
      --to-revisions="${PREVIOUS_REVISION}=100" \
      --region="$REGION" \
      --project="$PROJECT_ID"
    local rollback_exit=$?
    set -e
    if [[ "$rollback_exit" != "0" ]]; then
      echo "Automatic rollback failed; manual intervention is required." >&2
    fi
  fi
  if [[ "$CANDIDATE_TAG_CREATED" == "1" ]]; then
    echo "Removing candidate tag ${CANDIDATE_TAG}."
    set +e
    gcloud run services update-traffic "$SERVICE_TARGET" \
      --remove-tags="$CANDIDATE_TAG" \
      --region="$REGION" \
      --project="$PROJECT_ID"
    local cleanup_exit=$?
    set -e
    if [[ "$cleanup_exit" != "0" ]]; then
      echo "Failed to remove candidate tag ${CANDIDATE_TAG}; manual intervention is required." >&2
    fi
  fi
  exit "$exit_code"
}
trap 'rollback $?' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

resolve_health_contract() {
  case "$SERVICE_NAME" in
    estospaces-web)
      EXPECTED_SERVICE="estospaces-web"
      PROD_HEALTH_URL="https://app.estospaces.com/health"
      ;;
    estospaces-core-service)
      EXPECTED_SERVICE="core-service"
      PROD_HEALTH_URL="https://core-api.estospaces.com/health"
      ;;
    estospaces-booking-service)
      EXPECTED_SERVICE="booking-service"
      PROD_HEALTH_URL="https://booking-api.estospaces.com/health"
      ;;
    estospaces-payment-service)
      EXPECTED_SERVICE="payment-service"
      PROD_HEALTH_URL="https://payment-api.estospaces.com/health"
      ;;
    estospaces-notification-service)
      EXPECTED_SERVICE="notification-service"
      PROD_HEALTH_URL="https://notification-api.estospaces.com/health"
      ;;
    estospaces-search-service)
      EXPECTED_SERVICE="search-service"
      PROD_HEALTH_URL="https://search-api.estospaces.com/health"
      ;;
    estospaces-media-service)
      EXPECTED_SERVICE="media-service"
      PROD_HEALTH_URL="https://media-api.estospaces.com/health"
      ;;
    estospaces-messaging-service)
      EXPECTED_SERVICE="messaging-service"
      PROD_HEALTH_URL="https://messaging-api.estospaces.com/health"
      ;;
    *)
      echo "No approved health contract for ${SERVICE_NAME}." >&2
      exit 1
      ;;
  esac
}

SERVICE_JSON="$(gcloud run services describe "$SERVICE_TARGET" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format=json)"
PREVIOUS_REVISION="$(jq -r '
  [.status.traffic[]? | select(.percent == 100 and .revisionName != null) | .revisionName][0] // empty
' <<<"$SERVICE_JSON")"
if [[ -z "$PREVIOUS_REVISION" ]]; then
  echo "Cannot establish a single 100%-traffic rollback revision for ${SERVICE_TARGET}." >&2
  exit 1
fi
echo "previous_revision=${PREVIOUS_REVISION}" >> "$GITHUB_OUTPUT"

DIGEST="$(gcloud artifacts docker images describe "$IMAGE_TAG" \
  --project="$PROJECT_ID" \
  --format='value(image_summary.digest)')"
if [[ ! "$DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "Artifact Registry returned an invalid digest: ${DIGEST}" >&2
  exit 1
fi
IMMUTABLE_IMAGE="${IMAGE_TAG%:*}@${DIGEST}"

gcloud run services update "$SERVICE_TARGET" \
  --image="$IMMUTABLE_IMAGE" \
  --no-traffic \
  --tag="$CANDIDATE_TAG" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  "$@"
CANDIDATE_TAG_CREATED=1

SERVICE_JSON="$(gcloud run services describe "$SERVICE_TARGET" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format=json)"
CANDIDATE_REVISION="$(jq -r --arg tag "$CANDIDATE_TAG" '
  [.status.traffic[]? | select(.tag == $tag and .revisionName != null) | .revisionName][0] // empty
' <<<"$SERVICE_JSON")"
if [[ -z "$CANDIDATE_REVISION" ]]; then
  echo "Candidate revision was not created." >&2
  exit 1
fi

CANDIDATE_JSON="$(gcloud run revisions describe "$CANDIDATE_REVISION" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format=json)"
CANDIDATE_READY="$(jq -r '[.status.conditions[]? | select(.type == "Ready") | .status][0] // "False"' <<<"$CANDIDATE_JSON")"
DEPLOYED_IMAGE="$(jq -r '.spec.containers[0].image // empty' <<<"$CANDIDATE_JSON")"
if [[ "$CANDIDATE_READY" != "True" ]]; then
  echo "Candidate revision did not pass the Cloud Run readiness and startup-probe gate." >&2
  exit 1
fi
if [[ "$DEPLOYED_IMAGE" != "$IMMUTABLE_IMAGE" ]]; then
  echo "Candidate revision image does not match the resolved digest." >&2
  exit 1
fi

gcloud run services update-traffic "$SERVICE_TARGET" \
  --to-revisions="${CANDIDATE_REVISION}=100" \
  --region="$REGION" \
  --project="$PROJECT_ID"
TRAFFIC_SHIFTED=1

SERVICE_JSON="$(gcloud run services describe "$SERVICE_TARGET" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format=json)"
ACTIVE_REVISION="$(jq -r '
  [.status.traffic[]? | select(.percent == 100 and .revisionName != null) | .revisionName][0] // empty
' <<<"$SERVICE_JSON")"
SERVICE_URL="$(jq -r '.status.url // empty' <<<"$SERVICE_JSON")"
if [[ "$ACTIVE_REVISION" != "$CANDIDATE_REVISION" || -z "$SERVICE_URL" ]]; then
  echo "Cloud Run did not route 100% traffic to the candidate revision." >&2
  exit 1
fi

resolve_health_contract
if [[ "$TARGET_ENV" == "prod" ]]; then
  HEALTH_URL="$PROD_HEALTH_URL"
else
  HEALTH_URL="${SERVICE_URL}/health"
fi

HEALTHY=0
for attempt in {1..12}; do
  HEALTH_RESPONSE=""
  if HEALTH_RESPONSE="$(curl --fail --show-error --silent --connect-timeout 10 --max-time 20 "$HEALTH_URL")" &&
    jq -e --arg expected "$EXPECTED_SERVICE" \
      '.status == "ok" and .service == $expected' <<<"$HEALTH_RESPONSE" >/dev/null; then
    HEALTHY=1
    break
  fi
  if [[ "$attempt" != "12" ]]; then
    sleep 5
  fi
done
if [[ "$HEALTHY" != "1" ]]; then
  echo "Health contract failed for ${HEALTH_URL}: expected status=ok and service=${EXPECTED_SERVICE}." >&2
  exit 1
fi

gcloud run services update-traffic "$SERVICE_TARGET" \
  --remove-tags="$CANDIDATE_TAG" \
  --region="$REGION" \
  --project="$PROJECT_ID"
CANDIDATE_TAG_CREATED=0

{
  echo "candidate_revision=${CANDIDATE_REVISION}"
  echo "service_url=${SERVICE_URL}"
  echo "immutable_image=${IMMUTABLE_IMAGE}"
} >> "$GITHUB_OUTPUT"

trap - EXIT INT TERM
echo "Promoted ${CANDIDATE_REVISION} with image ${IMMUTABLE_IMAGE}; rollback target is ${PREVIOUS_REVISION}."
