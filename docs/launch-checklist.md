# Estospaces application release checklist

Status: **NOT SIGNED OFF**. Evidence checkpoint: 5 September 2026.

Estospaces is a React/Vite web app backed by seven Go services, Cloud SQL and media storage on Google Cloud. This checklist covers the current **Web-only application release**. It does not authorize backend deployments, database changes, infrastructure changes, region migration or a mobile-store release. Web runs in `europe-west2`; that alone does not establish every platform resource's location.

Allow 1–3 hours for execution/review **after blockers are resolved**, plus 24 hours of post-release observation. Repairs or missing evidence can extend this; it is not a launch guarantee. No new fixed-cost infrastructure is proposed. Existing hosting, database, storage, network and build usage remain billable. An exact monthly total or zero cost increase has not been established.

Owners: **Agent** = engineering work; **Owner** = product/security decision; **Together** = engineering prepares an exact plan and the owner approves it. Estimates below are active effort unless stated otherwise.

## Current evidence boundary

| Item | Checkpoint | Meaning |
| --- | --- | --- |
| Dev source | `a5c17692b073854108a25d04999c054255feb401` | Latest reviewed Web changes |
| Dev deployment | `estospaces-web-dev-00972-hug`, 100%; CD `33925687311` | Current manual replay target |
| Local regression before PR128 | 1,422 unit tests; lint, typecheck, build and dependency audit passed | Does not replace live workflows |
| CI | Six successful push workflows for a5c17692; PR128 seven checks successful | CI and CD checked separately |
| Fresh bounded dev regression | 109/109, generated `2026-09-04T23:03:09.673Z`; SHA256 `95E4F51314E8D8732E305E774E6BC7C7CB06B306212F1B762BE333188A653F9A` | Current run; independent subreport review pending, not every business journey |
| Live production | `estospaces-web-prod-00035-faz`, 100% | Still the older release |
| Production marker | `c98f5428f446b409a2e42d764dbf2269124b9da8` | Latest dev fixes are not in this artifact |
| Production observation | Nine public HTTPS health checks passed with certificate verification; Web 24-hour queries found zero ERROR/5xx entries | Historical artifact evidence, not new-release sign-off |

Earlier “1,000 scenarios” evidence covers route-startup/authentication, **not 1,000 completed business journeys**. Earlier 109/109 aggregate proof predates the final five merges and lacks an exact revision marker. Neither establishes current whole-application coverage. Manual mobile checks use **283 × 642**; automated proofs must be identified separately.

`PAYMENTS_ENABLED` and `VIRTUAL_TOUR_ENABLED` are false in `src/lib/launchFlags.ts`. This release does not enable either feature. Do not perform real charges or advertise enabled payment/virtual-tour functionality on the strength of this checklist.

## Phase 0 — Acceptance and current-revision proof

- [ ] **Agent — 30–90 minutes:** Complete current-revision user, manager and admin regression, including original reopened-ticket entry points, reload/persistence, cross-role handoffs, failure paths, console/network diagnostics and measured performance.

  > Run the bounded dev platform regression with approved QA credentials held only in the test process. Manually replay mobile defects at 283 × 642. Record the build marker before and after testing, inspect every subreport and report all skipped or failed journeys.

  **You'll know it worked when:** results are bound to a5c17692 / 00972-hug, required checks pass, and skipped checks are not counted as successful workflows.

- [ ] **Agent — 20–40 minutes:** Finish evidence comments for #545, #546, #547 and #553. Compare actual case/recipient identities before calling similarly named threads duplicates. An unavailable original fixture is not a proven fix.

  > Replay each original sequence, compare authoritative read-only data, add sanitized screenshots, revision, tests and limitations. Move a reproduced-and-resolved defect to QA Testing only after verification; preserve legitimate distinct direct chats.

  **You'll know it worked when:** QA can repeat each comment on the named deployment and understand its exact disposition.

- [ ] **Together — 15–30 minutes plus recovery time:** Resolve #299's missing historical `sale-id.pdf`. Safe UI error handling and a fresh synthetic-PDF control do not restore the original approved document.

  > Locate a verified original or backup without exposing private URLs. Prepare a recovery plan before shared-data writes. If this is an obsolete QA fixture, obtain an explicit disposition for that exact record and its release risk; never fabricate or approve replacement identity evidence.

  **You'll know it worked when:** original acceptance passes with recovered authentic data, or the owner explicitly dispositions the fixture. “Continue” does not choose between recovery and retirement.

## Phase 1 — One exact production candidate

- [ ] **Together — 20–40 minutes:** Resolve repository release controls. The read-only audit found main/develop unprotected and no rulesets, while the production environment requires protected branches. Prepare narrow settings before changing them; do not weaken the production environment restriction.

  > Inspect protections, required checks, review permissions and environment policy. Propose enforceable settings, obtain approval for those exact settings, then verify routine direct pushes cannot bypass review.

  **You'll know it worked when:** production can run only from the reviewed protected branch with required gates enforced.

- [ ] **Together — 5–10 minutes:** Cancel or reject obsolete waiting production run `33900690073` before a new dispatch. It targets older main SHA `4f112d0`. Recheck its state first; do not cancel a different or actively serving release by assumption.

  > Confirm the old run still waits and its deploy job has not started, record the exact target, and perform only the specifically authorized cancellation. Do not approve it to clear the queue.

  **You'll know it worked when:** no obsolete run can deploy later or occupy the production concurrency slot.

- [ ] **Agent — 20–40 minutes:** Prepare a reviewed develop-to-main promotion PR. At this checkpoint develop has 12 unique commits and main one unique merge; the main-only merge did not change the merge-base tree. Verify this again before integration.

  > Inspect the complete current Web diff against live production, run required gates and independent review, and record the exact candidate. Do not resolve divergence blindly or merge without exact production authority.

  **You'll know it worked when:** intended changes, tests, independent PASS and immutable source SHA are traceable in one promotion record.

- [ ] **Together — 10–20 minutes:** Obtain explicit approval to merge the named promotion PR from its exact develop SHA into main. After approval, merge through the reviewed path and verify the resulting main SHA and all required checks. Preparing a PR is not permission to merge it.

  > Present the exact source SHA, PR and reviewed diff for main-merge approval. After the owner approves, merge without bypassing protections, record the resulting main SHA and verify its checks before proposing production dispatch.

  **You'll know it worked when:** the approved changes are on the verified main SHA, with merge authority and check results recorded. This does not yet authorize production traffic changes.

- [ ] **Agent — 15–30 minutes:** Establish the protected signed-in production proof path. Approved QA credentials exist in Secret Manager, but the audited Actions repository/environment inventories have no E2E credential names. Do not add secrets silently or use dev credentials in production.

  > Execute the approved Secret Manager-backed proof path in memory, or prepare explicitly approved environment-secret configuration. Record only the secret resource/version reference, never its values. Ensure the release operator can test all three production QA roles.

  **You'll know it worked when:** signed-in proof runs without credentials in source, public logs, artifacts or chat.

- [ ] **Together — 20–40 minutes:** Replace the stale production runbook with an exact candidate plan. A runbook is the ordered deployment and recovery procedure. An image digest is the immutable identity of the built app.

  > Name the verified final main SHA, current rollback revision/digest, numeric error/latency stop thresholds, authenticated journeys, five-minute canary observation, rollback command and monitoring owner. The current workflow builds the candidate after dispatch: define how its emitted immutable digest and SHA/run/attempt build marker must be verified before traffic, then record the actual values when available. Do not invent a pre-build digest. Scope is estospaces-web-prod only; no backend, database, secret, Terraform or region mutation.

  **You'll know it worked when:** an independent verifier passes the runbook and the owner approves that artifact. Old approvals for c98f542 or 4f112d0 do not identify a new merge SHA.

- [ ] **Together — 5–10 minutes:** Obtain explicit production-dispatch and traffic approval for that exact main SHA and reviewed runbook, including its guarded build, 5% canary, 100% promotion and rollback operations.

  > Present the exact main SHA, estospaces-web-prod target and reviewed runbook. Ask for explicit authorization for workflow dispatch and the documented traffic operations, separately from permission to merge main.

  **You'll know it worked when:** the owner approval identifies the exact source, production service and permitted operations before the workflow starts.

## Phase 2 — Controlled release

- [ ] **Agent — 30–60 minutes after exact approval:** Execute the guarded GCP workflow. A canary sends 5% of requests to the new version initially. Verify the exact image before traffic, the public build marker, five-minute observation and recheck before 100% promotion.

  > Deploy only the approved immutable Web artifact, retain the previous revision, inspect every gate and verify final traffic independently. Stop and use the approved rollback on a failed gate.

  **You'll know it worked when:** the approved artifact serves 100%, all canary/final checks pass and rollback remains available.

- [ ] **Agent — 45–90 minutes:** Test the exact production artifact through app.estospaces.com and admin.estospaces.com using approved disposable QA accounts. Check normal HTTPS certificate verification, role routing, discovery, properties, messages, documents, Fast Track, manager/admin operations and affected mobile screens.

  > Replay the agreed production journeys with reload, downstream visibility and error paths. Capture sanitized screenshots and diagnostics. Use only approved synthetic data; do not approve it as genuine legal/identity evidence or mutate customer data.

  **You'll know it worked when:** the new production artifact—not dev or an old artifact—passes the agreed workflow matrix with no release-blocking findings.

## Phase 3 — Operational handoff

- [ ] **Together — 20–40 minutes:** Confirm the incident owner, support escalation, public legal/contact pages, existing error/latency dashboards, backup/PITR status, restore evidence and alert delivery. PITR means restoring the database to a recent point in time. Health alone does not prove recoverability.

  > Collect current read-only operational evidence, identify who responds to a launch incident and where rollback instructions are stored, and report missing evidence. No new monitoring product or subscription is proposed.

  **You'll know it worked when:** a named operator can detect, triage and recover the release, and legal/support information has an owner-approved disposition.

- [ ] **Agent — 24 hours elapsed:** Observe the new release for unhandled application errors, authentication/dependency failures, latency and customer reports. Retain rollback artifacts throughout.

  > Monitor the exact new revision using agreed thresholds. Report meaningful failures and use only approved rollback operations. Arrange the product's scheduled monitoring mechanism if observation continues after the active task; do not claim future observation has happened.

  **You'll know it worked when:** the complete window passes with zero unhandled application errors and required journeys stay healthy. Clean logs from 00035-faz do not count as the new release's observation.

## Completion rule

A QA status, green CI, health 200 or urgency is not launch sign-off. Sign-off requires original acceptance, exact deployment, the agreed functional matrix and operational/observation evidence. Report limitations plainly; never promise literal zero bugs or every possible scenario tested.
