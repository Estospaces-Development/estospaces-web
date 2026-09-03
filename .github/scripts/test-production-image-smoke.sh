#!/usr/bin/env bash
set -Eeuo pipefail

workflow=".github/workflows/cd.yml"

grep -Fq 'listen 443 ssl;' "$workflow"
grep -Fq "https://app.estospaces.com/health" "$workflow"
grep -Fq "E2E_PROD_BASE_URL='https://app.estospaces.com'" "$workflow"
grep -Fq "E2E_PROD_APP_BASE_URL='https://app.estospaces.com'" "$workflow"
grep -Fq "E2E_PROD_ADMIN_BASE_URL='https://admin.estospaces.com'" "$workflow"

if grep -Fq ':8443' "$workflow"; then
  echo 'Production exact-image smoke must use canonical HTTPS port 443.' >&2
  exit 1
fi

echo 'Production exact-image canonical-host smoke configuration is valid.'
