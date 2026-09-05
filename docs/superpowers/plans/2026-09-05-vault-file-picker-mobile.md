# Virtual Storage file picker — narrow layout correction

Scope: Web `VirtualStorageFilePicker` in `src/pages/user/virtual-storage/page.tsx`, development only. R1 isolated responsive presentation; no file, category, upload, validation, security or data handlers change. Preserve separate rental and release-document edits. Rules: ESTO-SCOPE-001, ESTO-WORKTREE-001, ESTO-VERIFY-001, ESTO-EVIDENCE-001.

RED/manual baseline: on dev00984-dac, actual283x642, the selected-button chip takes the available horizontal space and its adjacent `break-all` status renders `No file cho` / `sen`. Page client/scroll widths275/275 prove this is internal cramped wrapping, not root horizontal overflow. Screenshot captured during the manual upload/reload test.

Initial correction at viewport widths up to360px passed the 283x642 empty and selected-file checks: field208/208px, status184px wide, empty20px high, selected40px high, root275/275px. Desktop1440x900 regression exposed the same underlying constraint in the two-column form: picker199px wide, long filename100px high alongside the fixed chooser. This is not a desktop regression from the mobile-only classes; it demonstrates the original width problem also exists inside a narrow desktop column.

Revised smallest correction: allow flex wrapping based on available picker width, and give the filename/status a preferred10rem flex basis with min-width0. It moves onto its own row when both items cannot fit; a wider picker can keep them inline. Keep the native input's full clickable overlay, keyboard focus treatment, file type restriction, full accessible filename and upload callback unchanged. This remains an isolated R1 presentation change, not a new upload behavior.

Verification: preserve and run existing real DOM empty/selected/focus tests; manually replay empty and long-filename states at283x642 and desktop. A DOM emulator cannot prove CSS geometry; do not substitute class-string assertions for the captured before/after layout. This R1 style-only change uses the existing functional regression plus browser geometry (RULES State3 R0/R1 exception), not a new business-behavior test.

Run repository gates and independent scope review before integration. Independent browser availability must be reported honestly. Rollback is an isolated revert of these responsive classes. No production mutation or document approval is authorized by this correction.

## Local manual evidence — revised artifact

Artifact: picker blob `17f6833e2ca4ba5f0523226f5c9aa2e5b6c44cf8`, local Vite4319 backed by development services, authorized QA user, 2026-09-05.

- 283x642: field208/208px, page275/275px; selected32-character synthetic PDF filename uses184px of full-row width and40px height. Screenshot shows complete filename and visible keyboard focus. Tab moves from native picker to Upload; no upload submitted during this layout check.
- 1440x900: narrow desktop field199/199px; selected filename now uses174.55px and40px height, versus100px height before correction. Screenshot shows a readable two-line filename below the chooser. Empty status uses20px height, not split text.
- Selection cleared by reload; no new document created in this local layout check. Browser warning/error sample empty.
- Targeted real DOM tests:5/5, zero failures/skips after the revised artifact.
- Independent source review `/root/review_mobile_final`: PASS for the exact blob, caller and two class changes; fresh5/5 tests and scoped diff-check0; zero unresolved P0-P2. Independent browser not available, so geometry is primary-agent manual evidence only.
- Full repository gates and deployed-original-flow replay must be recorded separately before completion. Local screenshots are displayed in the task, not GitHub attachments.
