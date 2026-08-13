# Estospaces UK Production Launch Checklist

Estospaces is a React web application backed by seven Go services on Google Cloud Run, with Cloud SQL and supporting Google Cloud services. The current release target is the existing UK region (`europe-west2`). No Mumbai migration or UK resource removal is included.

Estimated remaining active work: 3–5 hours after approvals and QA credentials are available, followed by a monitored soak period. Expected additional infrastructure cost: £0 for this plan because it reuses the existing UK production resources; normal Cloud Run, Cloud SQL, storage, and network usage charges continue.

Legend:

- **You** — requires an owner decision, protected credential entry, or production approval.
- **Agent** — can be executed safely in code or through read-only verification.
- **Together** — the agent prepares and verifies; you approve the production-changing action.

## Phase 0 — Current blockers

- [x] **Agent — 30 minutes:** Keep the application in `europe-west2` and remove Mumbai from the active release plan.

  **You'll know it worked when:** deployment workflows and live inventory use the UK region only.

- [x] **Agent — 2 hours:** Harden search-service shutdown handling, security gates, immutable image deployment, candidate health checks, traffic promotion, rollback, and failed-candidate cleanup.

  **You'll know it worked when:** search CI, CodeQL, Gosec, Trivy, secret scanning, deployment tests, and the UK dev deployment are green.

- [x] **Agent — 1 hour:** Remove shared usernames/passwords from runnable browser proof scripts and require protected environment variables.

  **You'll know it worked when:** source and diff secret scans pass and missing QA credentials stop the tests safely.

- [ ] **You — 15 minutes:** Add disposable dev QA credentials to the GitHub `dev` environment as `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`. Enter them directly in GitHub; never paste passwords into chat or commit them.

  Go to the `estospaces-web` repository → **Settings** → **Environments** → **dev** → **Environment secrets** → **Add secret**.

  **You'll know it worked when:** the full signed-in platform proof can authenticate all three roles without source-code defaults.

## Phase 1 — UK dev release proof

- [x] **Agent — 20 minutes:** Verify `/health` for the web app and all seven dev backend services.

  **You'll know it worked when:** every dev service returns HTTP 200 with status `ok`.

- [x] **Agent — 20 minutes:** Verify public routes on Chromium desktop, Chromium mobile, and Firefox desktop.

  **You'll know it worked when:** all 24 checks pass with zero page, console, and network errors.

- [x] **Agent — 30 minutes:** Verify the live Fast Track user workspace, document focus switching, refresh persistence, stage locking, and a progressed journey where every prior/current tab—including Book your viewing—is reachable.

  **You'll know it worked when:** document focus remains in the URL after refresh, incomplete documents keep Viewing locked, and completed prerequisites unlock all progressed tabs.

- [ ] **Agent — 45–90 minutes after credentials exist:** Run the full signed-in user/manager/admin platform proof, including property creation/media/map/share, Fast Track cross-role notifications/documents/viewings, messaging, payments, verification, and admin review.

  > Run `npm run test:platform:dev` and the focused mutation proofs using only the protected GitHub `dev` environment credentials; fix every failed scenario before production promotion.

  **You'll know it worked when:** the saved proof report shows every required role journey passed and no unexpected HTTP 5xx, console error, or page crash occurred.

## Phase 2 — Production promotion

- [ ] **Together — 15 minutes:** Review the exact production deployment plan. It must use immutable image digests, create zero-traffic candidate revisions, health-check each candidate, retain the current revision as rollback, and avoid database deletion or migration.

  **You'll know it worked when:** the plan names every service, previous revision, candidate digest, health endpoint, rollback command, and confirms the region is `europe-west2`.

- [ ] **You — 5 minutes:** Give explicit approval for the named production service promotions. Approval is required because production traffic will change.

  **You'll know it worked when:** the approval explicitly names the UK production promotion and states that no data deletion, database migration, Terraform apply, region move, or UK resource removal is authorized.

- [ ] **Agent — 45–60 minutes after approval:** Promote the current reviewed images to the existing UK production services one service at a time, beginning with backend dependencies and ending with the web app. Verify each `/health` endpoint before proceeding.

  > Promote only reviewed immutable digests in `europe-west2`; keep the prior revision available; stop and roll back on any health, authentication, or smoke-test failure.

  **You'll know it worked when:** every production backend and web service returns HTTP 200 on `/health`, serves 100% traffic from the approved digest, and passes the production smoke test.

## Phase 3 — Post-launch

- [ ] **Agent — 24 hours:** Monitor Cloud Run errors, latency, authentication failures, payment/webhook errors, notification delivery, and database health. Do not delete rollback revisions during this period.

  **You'll know it worked when:** there are zero unhandled application errors for 24 hours and all core flows remain healthy.

- [ ] **Together — 20 minutes:** Triage the repository’s historical/default-branch Dependabot and Git-history secret-scan findings separately. Do not rotate or delete anything without explicit approval and impact review.

  **You'll know it worked when:** every finding is classified as fixed, false positive, accepted with rationale, or assigned to an approved remediation.
