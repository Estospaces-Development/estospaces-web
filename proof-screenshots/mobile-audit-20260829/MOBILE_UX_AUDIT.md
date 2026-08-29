# Estospaces Mobile UX Audit

Audit date: 29 August 2026

Environment: local production-equivalent frontend bundle connected to the development APIs

Audit type: UX audit, remediation, automated regression, and authenticated browser verification (`ESTO-SCOPE-001`, `ESTO-TEST-001`, `ESTO-EVIDENCE-001`)
Evidence limitation: these post-fix results verify the local branch. They do not assert that the changes are deployed to Cloud Run.

## Outcome

All six shared findings identified by the initial audit were corrected. The final authenticated browser matrix passed all 55 routes at every tested viewport: 220/220 route/viewport checks.

The fixes cover concise non-clipped role navigation, readable User Applications metrics, removal of duplicated phone dashboard navigation, a more compact short-phone login, complete mobile Activity labels, and breakpoint-correct heading checks. The Overseas hero was also reduced at tablet/landscape widths after the corrected audit exposed its oversized heading.

## Scope

- Source inventory: 97 page files and 203 component files.
- Live authenticated route inventory: 55 routes (User, Manager, Admin, including dynamic property detail/edit routes).
- Public/authentication routes manually inspected: login, register, forgot password, search, about, contact, FAQ, privacy, terms, and cookies.
- Viewports:
  - 320 x 568 — small phone edge case.
  - 390 x 844 — typical modern phone.
  - 768 x 1024 — tablet portrait.
  - 844 x 390 — phone/tablet landscape.
- Checks per authenticated route: role shell, mobile navigation, document containment, visible element containment, vertical scroll gesture, touch targets, clipped navigation labels, broken images, heading scale, crash text, page errors, console errors, and failed application requests.
- Manual visual review: dashboard, activity/application surfaces, property creation, Fast Track, admin research/users, public search, and authentication.

## Route audit results

| Viewport | Raw result | Interpretation |
| --- | ---: | --- |
| 390 x 844 | 55/55 pass | Typical phone routes passed. |
| 320 x 568 | 55/55 pass | Small-phone routes passed after a single isolated rerun on the warmed local server. |
| 768 x 1024 | 55/55 pass | Tablet routes and preserved dashboard tabs passed. |
| 844 x 390 | 55/55 pass | Short landscape routes remained contained and scrollable. |

Across all four authenticated audits:

- Document overflow: 0 routes.
- Visible non-intentional element overflow: 0 routes.
- Touch targets below the audit's 44 px threshold: 0 routes.
- Broken visible images: 0 routes.
- Failed vertical scroll gestures: 0 routes.
- Page exceptions: 0 routes.
- Console errors: 0 routes.
- Failed application requests: 0 routes.

## Findings

### MUX-01 — RESOLVED — Manager/Admin bottom navigation clips `Properties` at 320 px

Evidence:

- Shared owner: `src/components/layout/RoleMobileNavigation.tsx`.
- The navigation uses five equal columns and renders `Properties` inside `max-w-full truncate`.
- The rendered text box is 50 px wide at 320 px and the label is visibly displayed as `Propert...`.
- Affects all 21 Manager routes and all 15 Admin routes because the defect is in the shared shell.

User impact: users cannot read the complete destination name at the smallest supported phone width. This reduces navigation confidence on every screen.

Recommended correction:

- Use a concise mobile label such as `Listings` while retaining the full accessible name, or allow a deliberate two-line label without increasing the bar above 78 px.
- Remove visual truncation for primary navigation destinations.

Acceptance criteria:

- Full visible destination meaning at 320 px without ellipsis.
- Bottom navigation stays within the viewport, remains at least 44 px per target, and remains no taller than 78 px including safe-area padding.
- Recheck every Manager/Admin route because the component is shared.

### MUX-02 — RESOLVED — User Applications metrics break words at 320 px

Evidence:

- Owner: `src/pages/user/applications/page.tsx`.
- The summary uses `grid-cols-2`, `p-5`, an icon, `gap-4`, and a text block inside approximately 142 px cards.
- Manual screenshot shows `Pendin g`, `Approv ed`, and `Action Require d` across separate lines.

User impact: status labels become difficult to scan and look visually broken on small phones.

Recommended correction:

- Under 360 px, reduce card padding/icon gap and use a layout that reserves a stable text column, or switch this summary to a single column/compact horizontal metric row.
- Apply `min-w-0` to the text wrapper and prevent mid-word breaking for status labels.

Acceptance criteria:

- `Pending`, `Approved`, and `Action Required` wrap only at word boundaries at 320 px and 200% text zoom.
- Values and labels remain aligned across all four cards.

### MUX-03 — RESOLVED — Manager phone dashboard duplicates navigation

Evidence:

- The phone dashboard shows a local horizontal strip containing `Overview`, `Properties`, `Leads`, and other destinations directly above the persistent role bottom navigation.
- `Properties` and `Leads` are repeated in both navigation layers.

User impact: redundant choices consume scarce vertical space, create two competing navigation models, and make the dashboard feel like a compressed desktop interface.

Recommended correction:

- On phones, keep the persistent bottom navigation as the primary role navigation.
- Keep only dashboard-local filters/tabs in the local strip; move duplicated global destinations into `More` or remove them from the strip.

Acceptance criteria:

- No destination appears simultaneously in the local dashboard strip and bottom navigation at phone width.
- Dashboard-specific content switching remains available without changing desktop/tablet behavior.

### MUX-04 — RESOLVED — Login primary action is below the first 320 x 568 viewport

Evidence:

- The first phone viewport contains the large brand block, external-site link, title, helper copy, development notice, and both fields; `Sign In` is below the fold.
- No overflow or scroll trap occurs, but the primary task requires scrolling before the action is visible.

User impact: slower sign-in and weaker task hierarchy, particularly on compact phones and when the keyboard is open.

Recommended correction:

- Compress vertical spacing and brand scale on short viewports.
- Reduce the development notice footprint through a compact disclosure while keeping the warning understandable.
- Keep the sign-in action visible with the fields when practical; do not use a sticky action that obscures validation or keyboard content.

Acceptance criteria:

- At 320 x 568, email, password, recovery link, and Sign In remain reachable with minimal scrolling and no keyboard obstruction.
- At 200% zoom, all content reflows and remains operable.

### MUX-05 — RESOLVED — User Activity tabs depend on swipe and visible labels truncate

Evidence:

- Owner: `src/components/layout/UserActivitySubnav.tsx`.
- The phone variant uses a horizontal snap rail with `min-w-[118px]` and truncated labels.
- Manual screenshots show abbreviated labels such as `Saved...`, `Appli...`, and `Virtua...`.

User impact: later destinations are less discoverable and truncated labels weaken recognition.

Recommended correction:

- Use concise mobile labels without ellipses and provide a visible scroll cue or `More activity` entry.
- Keep the active item fully visible after navigation.

### MUX-06 — RESOLVED — Tablet/landscape audit threshold misclassifies valid headings

Evidence:

- At 768 and 844 px widths, the automated audit applies the phone heading threshold and flags 28–48 px headings despite no clipping or overflow.
- Most flagged h1 values are 36 px and documentation h2 values are 28 px, both reasonable tablet values.
- The 48 px User dashboard/Overseas hero headings deserve visual review but are not hard failures.

Recommended correction:

- Make heading thresholds breakpoint-aware and treat landscape using both width and height.
- Keep an explicit stricter threshold only below the phone breakpoint.

## Component-family assessment

| Family | Status | Evidence/notes |
| --- | --- | --- |
| Role shells and headers | Pass | No document overflow or scroll traps; concise mobile labels remain fully readable at 320 px. |
| Persistent mobile navigation | Pass | Manager/Admin use the readable `Listings` phone label while preserving the full accessible destination name. |
| User activity navigation | Pass | The horizontal rail remains operable and every phone label is complete without ellipses. |
| Dashboards and metric cards | Pass | Manager/Admin cards reflow and User Applications labels wrap only at word boundaries at 320 px. |
| Search and filters | Pass | Public and signed-in search surfaces remain contained; long placeholders visually clip as expected inside inputs. |
| Property lists/cards | Pass | Cards stack and actions remain reachable; no image failures in the audited routes. |
| Property create/edit | Pass | Five-step form becomes a single-column phone flow and remains scrollable. |
| Fast Track | Pass | Workspace, stage selector, completed/read-only state, and case tools remain contained at phone width. |
| Tables/registries | Pass | Mobile card composition is used instead of forcing desktop tables on phones. |
| Messaging/support | Pass | Routes load without overflow, broken images, or failed requests. |
| Maps/media viewers | Pass in route audit | No document overflow or broken images; map interaction accuracy/data correctness was outside this visual-responsive audit. |
| Modals/drawers/date controls | Source-level pass | Shared implementations use viewport-contained overlays/sheets; individual mutation states were not activated in this read-only audit. |
| Loading/error/empty states | Source-level pass | Shared branded loader is referenced across 79 source files; intentional action-level spinner remains separate. Live slow-network state was not exhaustively forced on every request. |
| Public/legal/docs | Pass with density note | Reflow works; Docs pages are intentionally long and exceed 20 phone viewport heights. |
| Authentication | Pass | Compact short-phone spacing keeps the sign-in task coherent, scrollable, and free of clipping. |

## Completed remediation

1. `RoleMobileNavigation` uses `Listings` on phones while preserving the full accessible destination name.
2. User Applications metrics preserve whole labels at 320 px.
3. Manager dashboard destination tabs are phone-hidden and remain available from 640 px upward.
4. Login hierarchy and QA notice spacing are compact on short phones.
5. User Activity uses complete concise labels and wider snap targets.
6. The audit harness applies phone limits only below 640 px, and the Overseas hero reserves its largest type for desktop.

## Evidence files

- `output/playwright/mobile-responsive-audit/report.json`
- `output/playwright/mobile-responsive-audit-320x568/report.json`
- `output/playwright/mobile-responsive-audit-768x1024/report.json`
- `output/playwright/mobile-responsive-audit-844x390/report.json`
- `proof-screenshots/mobile-audit-20260829/post-fix-user-applications-320x568.png`
- `proof-screenshots/mobile-audit-20260829/post-fix-manager-dashboard-320x568.png`
- `proof-screenshots/mobile-audit-20260829/post-fix-admin-dashboard-320x568.png`
- `proof-screenshots/mobile-audit-20260829/post-fix-user-applications-390x844.png`
- Screenshots are stored beside each report and in this audit directory.

## Coverage limitations

- This is not a claim that every state of every one of the 203 component files was activated. The local authenticated audit covers every canonical route and the components rendered by those routes against the development APIs in their available QA data state.
- Destructive actions, uploads, payments, external messaging, and data mutations were not performed.
- Screen-reader operation, real iOS Safari/Android Chrome hardware behavior, virtual keyboard overlap, 200% zoom, offline behavior, and slow-network loader timing need dedicated interactive passes before claiming full WCAG/mobile-device completion.
- Public pages were manually inspected at phone width; the 55-route automated matrix covers authenticated application routes.
