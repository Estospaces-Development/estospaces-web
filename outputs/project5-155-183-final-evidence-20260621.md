# Project 5 Items 155-183 Final Dev Evidence

Date: 2026-06-21 IST

## Deployed Dev Build

- Cloud Build: `83247323-9b32-47f5-8bdb-1c7b1bd631b5`
- Image: `europe-west2-docker.pkg.dev/project-37e22fd7-55ee-4b1f-841/estospaces/estospaces-web:codex-project5-155-183-final-20260621`
- Cloud Run service: `estospaces-web-dev`
- Cloud Run revision: `estospaces-web-dev-00052-jlj`
- Traffic: `100%`
- URL: `https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app`

## Local Gates

- `npm run typecheck`: passed
- `npm test`: passed, `581/581`
- `npm run build`: passed

## Deployed Project 5 Verifier

- Script: `scripts/project5-155-183-dev-verification.cjs`
- Result: `29 passed, 0 failed, 0 not verified`
- Report: `output/playwright/project5-155-183/2026-06-20T19-05-53-963Z/project5-155-183-dev-verification.md`
- JSON: `output/playwright/project5-155-183/2026-06-20T19-05-53-963Z/project5-155-183-dev-verification.json`

## GitHub Project Range

- Source: `gh project item-list 5 --owner Estospaces-Development --limit 200 --format json`
- Project total count: `183`
- Verified range: Project items `155-183`, `29` items
- Range map: `web-app#155`, `web-app#156`, `web-app#157`, `web-app#158`, `web-app#159`, `web-app#160`, `estospaces-web#3`, `estospaces-web#5`, `estospaces-web#4`, `estospaces-web#6`, `estospaces-web#7`, `estospaces-web#8`, `estospaces-web#9`, `estospaces-web#10`, `estospaces-web#11`, `estospaces-web#12`, `estospaces-web#13`, `estospaces-web#14`, `estospaces-web#15`, `estospaces-web#16`, `web-app#161`, `web-app#162`, `estospaces-web#17`, `estospaces-web#18`, `estospaces-web#19`, `estospaces-web#20`, `estospaces-web#21`, `estospaces-web#22`, `estospaces-web#23`

## Live Dev Proofs

- Admin review approval confirmation and refresh:
  `output/playwright/project5-155-183/live-admin-review-mutation-2026-06-20T19-05-54-016Z`
- Manager add-property validation scroll/default value proof:
  `output/playwright/project5-155-183/live-manager-add-property-2026-06-20T19-05-51-508Z`
- User-created fast-track case appears in manager queue and UI:
  `output/playwright/project5-155-183/live-fast-track-cross-role-2026-06-20T19-05-54-259Z`

## Post-Deploy Log Checks

- `estospaces-web-dev` revision `estospaces-web-dev-00052-jlj`: no severity `ERROR`, no HTTP `5xx`
- Last 10 minute dependency checks:
  - `estospaces-core-service-dev`: no severity `ERROR`, no HTTP `5xx`
  - `estospaces-booking-service-dev`: no severity `ERROR`, no HTTP `5xx`
  - `estospaces-notification-service-dev`: no severity `ERROR`, no HTTP `5xx`

## Extra Regression Fixed During Final Gate

- `src/lib/propertyImages.ts`: narrowed placeholder image filtering so direct `example.com` placeholder images are still ignored, while valid CDN subdomains such as `cdn.example.com` remain usable for admin property thumbnails.
