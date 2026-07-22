# Pre-Commit Checklist

## Non-Negotiable — any commit to `develop`:

- [ ] Code builds (`npm run build`)
- [ ] Unit tests pass (`npm run test`)
- [ ] Flows tested manually in dev
- [ ] No console errors (browser console, E2E `pageerror`)
- [ ] No broken API calls from frontend code
- [ ] Fix works in dev, local, Production
- [ ] Git clean — feature branch + PR to develop

## Clarifications

### "No broken API calls"
This refers to frontend-generated API calls returning errors due to
frontend bugs (wrong URLs, missing headers, bad payloads, etc.).

**Excluded from this check** — pre-existing backend service errors that
the frontend does not cause. Currently tracked exclusions:
- `estospaces-media-service-dev-*` returning 500 on some `/uploads/...`
  paths. Root cause: Go backend (`estospaces-media-service`), outside
  this repo's scope. The E2E script classifies these as
  `backendResponseErrors` (logged for visibility) but does NOT count
  them as test failures. Frontend correctly falls back to placeholder
  images via the global image error handler.

If a media-service 500 is fixed in the backend, remove it from this
exclusion list.

### Git workflow
Use feature branches: `git checkout -b fix/<issue-number>`
Commit → push → PR to `develop`. Do not push directly to `develop`.
