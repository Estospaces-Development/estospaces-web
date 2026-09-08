# Activity actions #594 — isolated dev integration

scope=Web ApplicationCard and co-located regression test; dev only.
risk=R2 UI layout, reopened/user-requested verification invokes independent review.
authority=existing user fix/push-to-dev/regression/QA request; no production, infrastructure, paid build retry, or live data maintenance.
dirty_worktree=all pre-existing completion/property/message work retained unchanged in qa-reopened-545-577-20260904/estospaces-web.
required_gates=regression RED/GREEN, full tests, lint, typecheck, build, dependency/security checks, independent review, exact dev revision and original Activity flow at 283x642 before QA.
forbidden_actions=staging unrelated files, production changes, bypassing checks, marking QA from local-only evidence.

Base: origin/develop f3ac0a5a4054a40dea1710bb201bab24e3aec2e8, fetched 8 September 2026. Branch: codex/activity-actions-594-20260908.

Isolation decision: RULES ESTO-WORKTREE-001 requires preserving the mixed candidate. A separate integration worktree was created outside that candidate, rather than reusing its dirty tree for release evidence. This is a narrow exception to the using-git-worktrees skill's generic instruction to reuse an existing linked worktree. No native standalone worktree creation tool is available (thread creation is out of scope). No existing worktree was deleted or altered.

Acceptance: Message and the text primary action remain adjacent at every application status; optional Withdraw occupies its own mobile row; labels, withdrawal eligibility, 44px touch height and single-click navigation are unchanged. Desktop retains an inline action group. No API or dependency changes.

Earlier source: ticket594 independently reproduced on dev; Under Review View measured44x44, versus165.6x44 locally at283x642. Root manually tested Activity > Applications > QA application D6A6ED0A, primary View modal, reload, and Approved1CF97D77. Existing proof outside Git: C:/Users/jeevi/AppData/Local/Temp/estospaces-mobile-proof-20260908. Those captures are combined-candidate proof, not this isolated revision or deployed proof. An independent browser replay was blocked by the verifier's unavailable in-app session; independent source/test review passed. New isolated gates remain pending.

Rollback: revert this task's component/test commit only; no data/schema action.

Status: INCOMPLETE — isolated verification and integration in progress. Do not close the ticket or claim launch readiness.

## Isolated verification, 8 September

- RED on unchanged develop:23 tests,18 fail/5 pass; failures identify three actions occupying the two-column row. GREEN after minimal reviewed delta:23/23 pass,0 skipped.
- Full isolated suite:1,056+486=1,542 pass,0 fail/cancel/skip. Terminal exit0 observed. Earlier1,584 combined-candidate results include unrelated unfinished changes.
- npm run typecheck; npm run lint -- . --max-warnings=0; npm run build:exit0. npm ci used unchanged lockfile; npm audit --audit-level=high:zero vulnerabilities including development dependencies.
- Locked Gitleaks8.30.1 current-tree scan:367.18MB,zero leaks,exit0. Trivy0.73.0 first attempt failed while Vite replaced generated cache files, not a finding/pass. A full unchanged-command repeat after dependency optimization settled passed:package-lock vulnerability and Dockerfile misconfiguration HIGH/CRITICAL gates both zero,exit0. No paths excluded or thresholds changed.
- Dependency-update row N/A:no package/lockfile/dependency changes; no new license introduced. Terraform/backend/data/payment gates N/A:only existing UI button grouping changes, no endpoint/contract/schema/infrastructure/deployment-configuration modification. CI security checks still required.
- Component Git blob33f7bd566cdf12bb2af68ebdfc9945d702eb272f equals reviewed source; test blob1cee36dcf20d38f07673ce81369d4ba404ec1707. Working-file component SHA20DFAABF5A9A38DE940B7DA8A7CE0FBA47BED769877800B78C3EC1F8902A900E differs from earlier mixed checkout only by checkout line endings.

Logs outside Git:C:/Users/jeevi/AppData/Local/Temp/estospaces-activity-594-isolated-20260908.
SHA256:unit.log=9587B9EC747A94624ED37C7F9119265F09C4A236B655912B9ECD0E074898DA9C; typecheck.log=46CF1D3CFA9CB1939A8165484FD096F2AC66C6026730C411D37C0F39395927C0; lint.log=B62972657EE5328DEBF5B98B0285262E936D58D70678832EC81E943E9CF22859; build.log=A739B2A72B2F14D5B5674C8BAE87C263CAE89E8C561823272400B74E84D386E2; gitleaks.log=2B9FACEDE096DEFCE5F2FB9B12A3CC6E542C538E18D67B0B446D414F37FB8CD7.

Root manual isolated proof:127.0.0.1:4320 using existing gcp-dev preset and QA user; Login > Activity > Applications > D6A6ED0A Under Review. Read-only DOM recorded viewport283x642, document275/275(client/scroll), Message44x44, View165.6x44 at same y, Withdraw217.6x44 below. Keyboard Tab reached Withdraw with visible2.4px outline; Enter on View opened APP-D6A6ED0A exactly once. Close > reload > filter > View again opened same application. Approved1CF97D77 View165.6x44 without Withdraw. Desktop1440x900 document1432/1432, Message/View/Withdraw same y635.475 with height44. New viewport-only desktop screenshot avoids older invalid stitched capture.

New proof files in C:/Users/jeevi/AppData/Local/Temp/estospaces-mobile-proof-20260908:594-isolated-mobile.jpg,594-isolated-approved.jpg,594-isolated-desktop.jpg. Raster screenshots can omit scrollbar/browser chrome;283x642 dimensions separately DOM-verified. Sampled browser error/warning logs empty. No application mutation, withdrawal or message send. Network inspector is not exposed by selected browser tool; original dev request/log checks remain pending. Existing historical fixture lacks property/address/price and is not repaired by this button-layout change.

Final independent review and exact deployed original-entry proof pending. No QA transition, main/prod operation or paid Cloud Build submission.

Independent final local review:PASS, verifier Galileo. Exact component/test blobs above; independently counted retained1,542 full passes, matched gate hashes and inspected new screenshots. No unresolved scoped P0/P1/P2 findings. Parent keyboard/reload/viewport checks were not independently replayed; CI and exact deployed proof remain separate gates. Rules ESTO-SCOPE-001, ESTO-TEST-001, ESTO-VERIFY-001, ESTO-EVIDENCE-001.

Additional SHA256:trivy-quiescent.log=AA7C0445F5D0A8E3565935E7133B728DC9B5A144968FEBEE32E41885C83EB53A; isolated-mobile.jpg=E37E2C19DAC21818024CD216E2926F84DA52260BF06E42C7CEA79AC278C2A1D7; isolated-approved.jpg=0F90E1FD5081DE7A7B773EA14CEC59D674EA762F716DBEF659CCB2E9790B2F5E; isolated-desktop.jpg=D177B37A231E2A44561AF78FA5DF405518FDC22EAC5641A11EBBC7E648BA2B0F.

Native isolated review attempt:terminal exit1, CLI workspace out of credits, review interrupted. Retained at external gate directory cli-review.log. This attempt is NOT a passing review and has not been automatically retried. Independent review above remains valid for its stated scope. Earlier completed scoped native review in original candidate is being checked for exact source/test equivalence; do not infer approval from an interrupted run.

Evidence reconciliation:the earlier completed scoped CLI review explicitly inspected only ApplicationCard.tsx/test.tsx for594 and returned PASS after reading the real delta/eligibility. Its retained log SHA256A66F20FA610AF3D22934EE82444623D46808E56F937B36BD07FF0F27F0B70FAD. Root confirmed both original and isolated Git blobs are identical to the hashes recorded above; no new executable delta was introduced by isolation. Therefore this earlier successful exact-source review is retained, alongside Galileo's fresh isolated PASS. The interrupted redundant review is not relabeled successful. A further verifier evidence-reconciliation request could not start because of the same credits issue; it does not replace or retract the already completed isolated review. New or changed code would require a new review. CI and dev proof remain pending.
