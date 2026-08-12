# Fast Track and important-notification test matrix

This is the bounded release matrix for the Fast Track workflow and its important notifications. It covers the user, manager, and admin roles plus sale/rental concurrency, document persistence, authorization, retries, terminal states, and browser refresh behavior.

## Important notification sound

| ID | Scenario | Expected result | Automated evidence |
| --- | --- | --- | --- |
| N-01 | User receives an appointment, document, payment, contract, or Fast Track update | The bundled Pixabay tone plays once and the toast remains visible | `importantNotificationSound.test.ts` |
| N-02 | Manager receives a property selection, document upload, viewing, application, or Fast Track start | The same bundled tone plays once | `importantNotificationSound.test.ts` |
| N-03 | Admin receives verification, support, or system work | The same bundled tone plays once | `importantNotificationSound.test.ts`, `notificationSoundRoleCoverage.test.ts` |
| N-04 | Three important notifications arrive in one poll | One sound plays for the batch; alerts do not overlap | `notificationSoundRoleCoverage.test.ts` |
| N-05 | A routine welcome, saved-property, or match notification arrives | No sound plays | `importantNotificationSound.test.ts` |
| N-06 | A future notification carries `high`, `urgent`, or `critical` priority metadata | It uses the important sound without a frontend release for the new type | `importantNotificationSound.test.ts` |
| N-07 | Browser blocks autoplay or media playback throws | Polling, toasts, and browser notifications continue without an unhandled error | `importantNotificationSound.test.ts` |
| N-08 | User interacts before the first notification | Audio is primed silently; the real alert remains loud | `importantNotificationSound.test.ts` |

## Fast Track lifecycle

| ID | Scenario | Expected result | Automated evidence |
| --- | --- | --- | --- |
| F-01 | User accepts a manager-shared property | The trusted property/lead/manager context creates or reuses the workspace and notifies both parties | booking `TestUserCreateFastTrackCase*` suite |
| F-02 | Same user/property is started again from another request | Existing active case is reused and no duplicate row is created | booking duplicate-start tests |
| F-03 | Wrong manager tries to reuse another manager's case | Request is rejected without returning case or document data | booking cross-manager negative tests |
| F-04 | Different buyers start on one sale property | Each buyer may have one active case until a winner completes | booking sale lifecycle tests |
| F-05 | Two sale cases complete concurrently | Exactly one winner completes; competitors close with retained history | PostgreSQL cross-instance integration test |
| F-06 | A sold property receives a new sale Fast Track request | Request is rejected | booking sale lifecycle tests |
| F-07 | Different renters start on one rental property | Independent active cases are allowed | booking rental lifecycle tests |
| F-08 | One rental case completes | Other renters remain active | booking rental lifecycle tests |
| F-09 | User uploads identity and address documents | Both persist and are visible to the assigned manager after a fresh GET | booking document upload/reload test |
| F-10 | User refreshes after upload and switches Identity/Address focus | The selected tab follows the URL, survives polling replacement, and remains clickable | `fastTrackWorkspace.test.ts` |
| F-11 | Unassigned manager requests case documents | Access is denied without document metadata | booking ownership tests |
| F-12 | Manager closes an active case at any stage | Case becomes closed, its combination is released, and history/documents remain | booking close tests, `fastTrackWorkspace.test.ts` |
| F-13 | Manager tries to close a completed or rejected case | Terminal history is unchanged and the action is rejected | booking terminal-case tests |
| F-14 | Manager tries the destructive delete endpoint | Access is forbidden and the row remains | booking manager-delete negative test |
| F-15 | Admin uses the destructive delete endpoint | Admin-only operation remains available for controlled cleanup | booking admin-delete test |
| F-16 | A stale action races with sale completion | The stale action cannot reopen the closed competitor | booking stale-action concurrency test |
| F-17 | Manager completes sale handover and user confirms later | Confirmation succeeds while terminal sale state remains completed | booking sale handover test |
| F-18 | Notification delivery fails after case creation | Case state remains retryable and no shared active case is hard-deleted | booking notification/link failure tests |
| F-19 | The 24-hour response deadline passes before a decision | Case stays actionable, shows zero hours plus an overdue escalation, blocks duplicate starts, and can still be advanced or safely closed | booking overdue and legacy-expired recovery tests |

## Required release commands

```powershell
# Web
npx tsx --test src/lib/importantNotificationSound.test.ts src/lib/notificationSoundRoleCoverage.test.ts src/lib/fastTrackWorkspace.test.ts
npm run test:fast-track
npm run typecheck
npm run lint
npm test
npm run build

# Booking service
go test ./internal/bookings -count=1
go vet ./...
go build ./...
govulncheck ./...
```

The PostgreSQL cross-instance test additionally requires `FASTTRACK_POSTGRES_TEST_DSN` and two independent database connections. Browser release proof must repeat the upload/refresh/tab-switch sequence and verify user and manager notification behavior on the exact deployed dev revision.
