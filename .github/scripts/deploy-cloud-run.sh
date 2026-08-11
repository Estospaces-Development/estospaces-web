#!/usr/bin/env bash
set -Eeuo pipefail

: "${SERVICE_NAME:?SERVICE_NAME is required}"
: "${TARGET_ENV:?TARGET_ENV is required}"
: "${REGION:?REGION is required}"
: "${PROJECT_ID:?PROJECT_ID is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

SERVICE_TARGET="${SERVICE_NAME}-${TARGET_ENV}"
CANDIDATE_TAG="candidate-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
TRAFFIC_SHIFTED=0
PREVIOUS_REVISION=""

rollback() {
  local exit_code="${1:-$?}"
  trap - ERR INT TERM
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
  exit "$exit_code"
}
trap 'rollback $?' ERR
trap 'rollback 130' INT
trap 'rollback 143' TERM

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

SERVICE_JSON="$(gcloud run services describe "$SERVICE_TARGET" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format=json)"
CANDIDATE_REVISION="$(jq -r --arg tag "$CANDIDATE_TAG" '
  [.status.traffic[]? | select(.tag == $tag and .revisionName != null) | .revisionName][0] // empty
' <<<"$SERVICE_JSON")"
CANDIDATE_URL="$(jq -r --arg tag "$CANDIDATE_TAG" '
  [.status.traffic[]? | select(.tag == $tag and .url != null) | .url][0] // empty
' <<<"$SERVICE_JSON")"
if [[ -z "$CANDIDATE_REVISION" || -z "$CANDIDATE_URL" ]]; then
  echo "Candidate revision or tagged URL was not created." >&2
  exit 1
fi

candidate_healthy=0
for attempt in {1..12}; do
  if curl --fail --show-error --silent --location --connect-timeout 10 --max-time 20 "${CANDIDATE_URL}/health" >/dev/null; then
    candidate_healthy=1
    break
  fi
  echo "Candidate health attempt ${attempt}/12 failed; retrying in 5 seconds."
  sleep 5
done
if [[ "$candidate_healthy" != "1" ]]; then
  echo "Candidate revision failed its health gate." >&2
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

DEPLOYED_IMAGE="$(gcloud run revisions describe "$CANDIDATE_REVISION" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(spec.containers[0].image)')"
if [[ "$DEPLOYED_IMAGE" != "$IMMUTABLE_IMAGE" ]]; then
  echo "Deployed revision image does not match the resolved digest." >&2
  exit 1
fi
curl --fail --show-error --silent --location --connect-timeout 10 --max-time 20 "${SERVICE_URL}/health" >/dev/null

gcloud run services update-traffic "$SERVICE_TARGET" \
  --remove-tags="$CANDIDATE_TAG" \
  --region="$REGION" \
  --project="$PROJECT_ID"

{
  echo "candidate_revision=${CANDIDATE_REVISION}"
  echo "service_url=${SERVICE_URL}"
  echo "immutable_image=${IMMUTABLE_IMAGE}"
} >> "$GITHUB_OUTPUT"

trap - ERR INT TERM
echo "Promoted ${CANDIDATE_REVISION} with image ${IMMUTABLE_IMAGE}; rollback target is ${PREVIOUS_REVISION}."
