# Estospaces - 5,000-Scenario Production Readiness Test Suite

**Repository:** Estospaces-Development/web-app
**Project Board:** Estospaces Phase 1 (PVT_kwDODiN4lM4BP7T6)
**Scenarios:** 5,000 | **Roles:** Guest / User / Manager / Admin | **Environments:** Local / Dev / Production

---

## How to Use This Document

Each scenario is a table row. Columns: **ID** | **Section** | **Sub** | **Role** | **Type** | **Env** | **Pre-conditions** | **Test Steps** | **Expected Result** | **Actual** | **P/F** | **Notes**

**ID convention:** ESTO-S{NN}-{TT}-{NNNN}
- {NN} = Section number (01-29)
- {TT} = Type code (HP=Happy, EM=Empty, ER=Error, ED=Edge, CR=Cross-Role)
- {NNNN} = Sequential number within section

**Execution order:** Sections 1-29 sequentially. Within each: Happy->Empty->Error->Edge->Cross-Role, roles: Guest->User->Manager->Admin. Environment: Local->Dev->Production.

---

## Section Summary

| # | Section | Scenarios |
|---|---|---|
| 1 | Authentication & Session Management | 450 |
| 2 | Property Discovery & Search | 500 |
| 3 | Property Viewing | 300 |
| 4 | Bookings | 250 |
| 5 | Broker Request & Dispatch | 400 |
| 6 | Fast Track 24h Workflow | 450 |
| 7 | Messaging | 300 |
| 8 | Applications | 350 |
| 9 | Contracts | 250 |
| 10 | Payments | 200 |
| 11 | Notifications | 250 |
| 12 | Verification | 400 |
| 13 | Property Management (Manager) | 350 |
| 14 | Lead Management | 250 |
| 15 | Admin User Management | 250 |
| 16 | Admin Property Oversight | 200 |
| 17 | Admin Verification Queue | 250 |
| 18 | Admin Analytics & Reporting | 300 |
| 19 | Support Tickets | 200 |
| 20 | Reviews & Ratings | 150 |
| 21 | Saved/Favorites | 150 |
| 22 | Accessibility | 300 |
| 23 | Responsive Design | 200 |
| 24 | Error & Resilience | 500 |
| 25 | Security | 250 |
| 26 | Bug Regression (148 Tickets) | 300 |
| 27 | Environment: Local | 150 |
| 28 | Environment: Dev | 100 |
| 29 | Environment: Production | 100 |
| | **TOTAL** | **5,000** |

---

## Section 1: Authentication & Session Management (450)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0001 | 1.1 Login | Guest | Happy | All | Valid account exists | Navigate to /login, enter valid email/password, click Sign in | Redirected to role dashboard; JWT in localStorage; header updates | | | |
| ESTO-S01-HP-0002 | 1.1 Login | User | Happy | All | Valid user account | Login from /login, verify redirect to /user/dashboard | Redirected to /user/dashboard; user data loaded | | | |
| ESTO-S01-HP-0003 | 1.1 Login | Manager | Happy | All | Valid manager account | Login, verify redirect to /manager/dashboard | Redirected to /manager/dashboard; manager data loaded | | | |
| ESTO-S01-HP-0004 | 1.1 Login | Admin | Happy | All | Valid admin account | Login, verify redirect to /admin/dashboard | Redirected to /admin/dashboard; admin data loaded | | | |
| ESTO-S01-HP-0005 | 1.1 Login | Guest | Happy | All | Valid account; Remember me checked | Login, close browser, reopen app | Session persists after browser restart | | | |
| ESTO-S01-HP-0006 | 1.1 Login | User | Happy | All | Valid user; Remember me checked | Login, close browser, reopen | Session persists | | | |
| ESTO-S01-HP-0007 | 1.1 Login | Guest | Happy | All | Valid account | Fill login form, press Enter | Form submits; redirect to dashboard | | | |
| ESTO-S01-HP-0008 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, observe loading state | Loading spinner visible; button disabled | | | |
| ESTO-S01-HP-0009 | 1.1 Login | User | Happy | All | Valid account | Sign in, observe loading state | Loading spinner visible; button disabled | | | |
| ESTO-S01-HP-0010 | 1.1 Login | Guest | Happy | All | Logged in | Sign in, refresh page | Session persists; no redirect to /login | | | |
| ESTO-S01-HP-0011 | 1.1 Login | User | Happy | All | Logged in | Refresh page | Session persists; user data loads | | | |
| ESTO-S01-HP-0012 | 1.1 Login | Guest | Happy | All | Network monitoring open | Sign in, inspect Network tab | POST /api/v1/auth/login returns 200 with JWT | | | |
| ESTO-S01-HP-0013 | 1.1 Login | Guest | Happy | All | DevTools open | Sign in, check localStorage | JWT token stored with correct key; expiry set | | | |
| ESTO-S01-HP-0014 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify header UI | Header shows user avatar, name, logout button | | | |
| ESTO-S01-HP-0015 | 1.1 Login | Guest | Happy | All | Console open | Sign in, check browser console | No console errors or warnings | | | |
| ESTO-S01-HP-0016 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify WorkspaceSyncContext | Starts 15s initial sync, then 30s interval | | | |
| ESTO-S01-HP-0017 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify UserProfileSummaryContext | Fetches user summary on mount | | | |
| ESTO-S01-HP-0018 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify NotificationsContext | Loads notifications list from API | | | |
| ESTO-S01-HP-0019 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify SavedPropertiesContext | Loads saved properties from API | | | |
| ESTO-S01-HP-0020 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify ApplicationsContext | Loads applications from API | | | |
| ESTO-S01-HP-0021 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify MessagesContext | Connects to messaging service WebSocket | | | |
| ESTO-S01-HP-0022 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify all context providers | No initialization errors in any context | | | |
| ESTO-S01-HP-0023 | 1.1 Login | Guest | Happy | All | Network monitoring open | Sign in, check for 4xx/5xx on sidebar load | No broken API calls; all return 200 | | | |
| ESTO-S01-HP-0024 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify document title | Title updates to role-appropriate text | | | |
| ESTO-S01-HP-0025 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, verify meta tags | Meta description and OG tags load | | | |
| ESTO-S01-HP-0026 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, logout, then re-login | Re-login works; no stale data or ghost state | | | |
| ESTO-S01-HP-0027 | 1.1 Login | User | Happy | All | Valid user | Login, logout, re-login | Clean session handoff; user data fresh | | | |
| ESTO-S01-HP-0028 | 1.1 Login | Manager | Happy | All | Valid manager | Login, logout, re-login | Clean session; manager data fresh | | | |
| ESTO-S01-HP-0029 | 1.1 Login | Admin | Happy | All | Valid admin | Login, logout, re-login | Clean session; admin data fresh | | | |
| ESTO-S01-HP-0030 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, check AuthContext state | AuthContext shows isAuthenticated=true | | | |
| ESTO-S01-HP-0031 | 1.1 Login | User | Happy | All | Valid user | Sign in, check user.role in AuthContext | Role is "user" | | | |
| ESTO-S01-HP-0032 | 1.1 Login | Manager | Happy | All | Valid manager | Sign in, check user.role in AuthContext | Role is "manager" | | | |
| ESTO-S01-HP-0033 | 1.1 Login | Admin | Happy | All | Valid admin | Sign in, check user.role in AuthContext | Role is "admin" | | | |
| ESTO-S01-HP-0034 | 1.1 Login | Guest | Happy | All | Valid account | Sign in, open new browser tab | Both tabs show logged-in state | | | |
| ESTO-S01-HP-0035 | 1.1 Login | User | Happy | All | Logged in | Sign in from new tab | Both sessions coexist | | | |
| ESTO-S01-HP-0036 | 1.1 Login | Guest | Happy | All | Logged in | Sign in, click Logout from header menu | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0037 | 1.1 Login | User | Happy | All | Logged in | Sign in, click Logout | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0038 | 1.1 Login | Manager | Happy | All | Logged in | Sign in, click Logout | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0039 | 1.1 Login | Admin | Happy | All | Logged in | Sign in, click Logout | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0040 | 1.1 Login | Guest | Happy | All | Logged in | Sign in, logout from header | Clean logout; no stale data in contexts | | | |
| ESTO-S01-EM-0041 | 1.1 Login | Guest | Empty | All | -- | Submit login with all fields empty | Email and password validation errors displayed | | | |
| ESTO-S01-EM-0042 | 1.1 Login | User | Empty | All | -- | Submit login with all fields empty | Email and password validation errors displayed | | | |
| ESTO-S01-EM-0043 | 1.1 Login | Guest | Empty | All | -- | Enter only email, click Sign in | Password required validation error | | | |
| ESTO-S01-EM-0044 | 1.1 Login | Guest | Empty | All | -- | Enter only password, click Sign in | Email required validation error | | | |
| ESTO-S01-EM-0045 | 1.1 Login | Guest | Empty | All | -- | Submit with whitespace-only email | Validation error for empty email | | | |
| ESTO-S01-EM-0046 | 1.1 Login | Guest | Empty | All | -- | Submit with whitespace-only password | Validation error for empty password | | | |
| ESTO-S01-EM-0047 | 1.1 Login | User | Empty | All | -- | Clear all storage, navigate to /login | Login form renders with empty fields | | | |
| ESTO-S01-EM-0048 | 1.1 Login | Manager | Empty | All | -- | Clear all storage, navigate to /login | Login form renders with empty fields | | | |
| ESTO-S01-EM-0049 | 1.1 Login | Guest | Empty | All | -- | Set stale JWT in localStorage, navigate to /login | Form renders; no auto-login attempted | | | |
| ESTO-S01-EM-0050 | 1.1 Login | Guest | Empty | All | -- | Clear localStorage, navigate to /login | Login form displayed correctly | | | |
| ESTO-S01-ER-0051 | 1.1 Login | Guest | Error | All | Valid account; wrong password | Enter valid email, wrong password, click Sign in | Error: Invalid email or password | | | |
| ESTO-S01-ER-0052 | 1.1 Login | Guest | Error | All | -- | Enter invalid email format (no @), click Sign in | Error: Please enter a valid email address | | | |
| ESTO-S01-ER-0053 | 1.1 Login | Guest | Error | All | -- | Enter SQL injection in email field, click Sign in | No SQL injection; appropriate error displayed | | | Security |
| ESTO-S01-ER-0054 | 1.1 Login | Guest | Error | All | Core service down | Stop core-service, attempt login | Error toast: Unable to sign in; no crash | | | |
| ESTO-S01-ER-0055 | 1.1 Login | Guest | Error | All | Valid account | Set network to Offline, click Sign in | Error: Network error. Check your connection | | | |
| ESTO-S01-ER-0056 | 1.1 Login | Guest | Error | All | Valid account | Enter empty password, click Sign in | Password required validation error | | | |
| ESTO-S01-ER-0057 | 1.1 Login | Guest | Error | All | Valid account | Enter 500-char email, click Sign in | Validation error or graceful truncation | | | |
| ESTO-S01-ER-0058 | 1.1 Login | Guest | Error | All | -- | Set tampered JWT in localStorage, navigate to /login | Login form renders normally | | | Ticket:#172 |
| ESTO-S01-ER-0059 | 1.1 Login | Guest | Error | All | Mock backend | Mock backend returning 401, attempt login | Generic error; no token leaked to UI | | | |
| ESTO-S01-ER-0060 | 1.1 Login | Guest | Error | All | Mock backend | Mock backend returning 500, attempt login | Error toast; form remains usable | | | |
| ESTO-S01-ER-0061 | 1.1 Login | Guest | Error | All | Mock backend | Mock slow backend (>30s), attempt login | Loading state persists; no crash | | | |
| ESTO-S01-ER-0062 | 1.1 Login | Guest | Error | All | Mock backend | Mock malformed JSON response | Error toast; no unhandled exception | | | |
| ESTO-S01-ER-0063 | 1.1 Login | Guest | Error | All | -- | Enter XSS payload in email field, sign in | Input escaped; no XSS execution | | | Security |
| ESTO-S01-ER-0064 | 1.1 Login | Guest | Error | All | CSRF misconfigured | Submit without CSRF token | Rejected or handled per design | | | Security |
| ESTO-S01-ER-0065 | 1.1 Login | Guest | Error | All | Valid account | Trigger 10 rapid login attempts | Rate limit error displayed | | | |
| ESTO-S01-ER-0066 | 1.1 Login | Guest | Error | All | -- | Access from unauthorized CORS origin | CORS error handled gracefully | | | |
| ESTO-S01-ER-0067 | 1.1 Login | Guest | Error | All | Mock backend | Mock backend returning 429, attempt login | Rate limit message displayed | | | |
| ESTO-S01-ER-0068 | 1.1 Login | Guest | Error | All | Dev backend unavailable | Login on Dev environment | Error toast; no crash; retry option | | | Ticket:#290 |
| ESTO-S01-ER-0069 | 1.1 Login | Guest | Error | All | Degraded prod | Prod backend degraded, attempt login | Error toast; no data leakage | | | Prod |
| ESTO-S01-ER-0070 | 1.1 Login | Guest | Error | All | Account locked | Attempt login with locked account | Error: Account locked. Try again later | | | |
| ESTO-S01-ED-0071 | 1.1 Login | Guest | Edge | All | Valid account | Enter 254-char email (RFC max), sign in | Handled gracefully; validation or accepted | | | |
| ESTO-S01-ED-0072 | 1.1 Login | User | Edge | All | Valid account | Enter user+tag@domain.com, sign in | Plus-tag email works | | | |
| ESTO-S01-ED-0073 | 1.1 Login | Guest | Edge | All | Valid account | Enter 128-char password, sign in | Handled gracefully | | | |
| ESTO-S01-ED-0074 | 1.1 Login | Guest | Edge | All | Valid account | Enter email with leading/trailing spaces | Email trimmed before processing | | | |
| ESTO-S01-ED-0075 | 1.1 Login | Guest | Edge | All | Valid account | Rapidly click Sign in 10 times | No duplicate requests or double-login | | | |
| ESTO-S01-ED-0076 | 1.1 Login | Guest | Edge | All | Valid account | Login in Tab A and Tab B simultaneously | Both sessions work independently | | | |
| ESTO-S01-ED-0077 | 1.1 Login | Guest | Edge | All | Valid account | Enter email with international domain | Validation message or success | | | |
| ESTO-S01-ED-0078 | 1.1 Login | Guest | Edge | All | Valid account | Copy-paste password from rich text editor | Plain text password submitted | | | |
| ESTO-S01-ED-0079 | 1.1 Login | Guest | Edge | All | Valid account | Enter email with emoji in local part | Validation error or graceful handling | | | |
| ESTO-S01-ED-0080 | 1.1 Login | Guest | Edge | All | Valid account | Enter all-whitespace password | Validation error: password cannot be empty | | | |
| ESTO-S01-ED-0081 | 1.1 Login | User | Edge | All | Valid account | Use browser autofill, click Sign in | Autofilled values submit correctly | | | |
| ESTO-S01-ED-0082 | 1.1 Login | Guest | Edge | All | Valid account | Enter email in mixed case, sign in | Case-insensitive matching works | | | |
| ESTO-S01-ED-0083 | 1.1 Login | Guest | Edge | All | Valid account | Enter email with tab characters | Tab character rejected or trimmed | | | |
| ESTO-S01-ED-0084 | 1.1 Login | Guest | Edge | All | Valid account | Enter password with newline characters | Newlines trimmed before submission | | | |
| ESTO-S01-ED-0085 | 1.1 Login | Guest | Edge | All | Valid account | Tab through all fields, press Enter | Form submits via keyboard navigation | | | A11y |
| ESTO-S01-ED-0086 | 1.1 Login | User | Edge | All | Screen reader available | Navigate page with screen reader | All fields have proper aria-labels | | | A11y |
| ESTO-S01-ED-0087 | 1.1 Login | Guest | Edge | All | Valid account | Trigger error, check accessibility | Error announced via role=alert | | | A11y |
| ESTO-S01-ED-0088 | 1.1 Login | Guest | Edge | All | DevTools open | Verify password field type attribute | Password field type is "password" (masks input) | | | Ticket:#168 |
| ESTO-S01-ED-0089 | 1.1 Login | Guest | Edge | All | Valid account | Click eye icon to toggle password visibility | Password toggles between masked and visible | | | Ticket:#168 |
| ESTO-S01-ED-0090 | 1.1 Login | Guest | Edge | All | Valid account | Login, then attempt login again same day | Rate limiter does not block normal re-login | | | |
| ESTO-S01-CR-0091 | 1.1 Login | Guest | Cross-Role | All | -- | Login as User, navigate to /login | Redirected to /user/dashboard | | | |
| ESTO-S01-CR-0092 | 1.1 Login | Manager | Cross-Role | All | -- | Login as Manager, navigate to /login | Redirected to /manager/dashboard | | | |
| ESTO-S01-CR-0093 | 1.1 Login | Admin | Cross-Role | All | -- | Login as Admin, navigate to /login | Redirected to /admin/dashboard | | | |
| ESTO-S01-CR-0094 | 1.1 Login | User | Cross-Role | All | -- | User in Tab A, Manager in Tab B simultaneously | Both sessions coexist independently | | | |
| ESTO-S01-CR-0095 | 1.1 Login | User | Cross-Role | All | -- | User navigates to /admin/dashboard | Redirected to /user/dashboard | | | Security |
| ESTO-S01-CR-0096 | 1.1 Login | User | Cross-Role | All | -- | User navigates to /manager/dashboard | Redirected to /user/dashboard | | | Security |
| ESTO-S01-CR-0097 | 1.1 Login | Manager | Cross-Role | All | -- | Manager navigates to /admin/dashboard | Redirected to /manager/dashboard | | | |
| ESTO-S01-CR-0098 | 1.1 Login | Admin | Cross-Role | All | -- | Admin navigates to /user/dashboard | Allowed (admin oversight) | | | |
| ESTO-S01-CR-0099 | 1.1 Login | Guest | Cross-Role | All | -- | No auth, navigate to /user/dashboard | Redirected to /login | | | Security |
| ESTO-S01-CR-0100 | 1.1 Login | Guest | Cross-Role | All | -- | JWT set but user cache cleared, navigate to /user/dashboard | Redirected to /login; token invalidated | | | |

### 1.2 Registration (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0101 | 1.2 Registration | Guest | Happy | All | Valid email available | Navigate to /register, fill all fields, click Sign up | Account created; redirected to /login or verify-email | | | |
| ESTO-S01-HP-0102 | 1.2 Registration | Guest | Happy | All | Valid email available | Register with valid first/last name, email, password | Account created; name displayed correctly | | | Ticket:#279 |
| ESTO-S01-HP-0103 | 1.2 Registration | Guest | Happy | All | Valid email available | Register with strong password (12+ chars, mixed) | Account created successfully | | | Ticket:#290 |
| ESTO-S01-HP-0104 | 1.2 Registration | Guest | Happy | All | Valid email available | Register, verify email sent | Verification email delivered | | | |
| ESTO-S01-HP-0105 | 1.2 Registration | Guest | Happy | All | Network monitoring open | Register, inspect Network tab | POST /api/v1/auth/register returns 201 | | | |
| ESTO-S01-HP-0106 | 1.2 Registration | Guest | Happy | All | Valid email | Register, check localStorage after login | JWT stored with correct role | | | |
| ESTO-S01-HP-0107 | 1.2 Registration | Guest | Happy | All | Valid data | Register, verify error messages on form | No error messages; all fields valid | | | |
| ESTO-S01-HP-0108 | 1.2 Registration | Guest | Happy | All | Valid data | Register with name containing space | Name with space accepted | | | Ticket:#279 |
| ESTO-S01-HP-0109 | 1.2 Registration | Guest | Happy | All | Valid data | Register with name containing hyphen | Name with hyphen accepted | | | Ticket:#279 |
| ESTO-S01-HP-0110 | 1.2 Registration | Guest | Happy | All | Valid data | Register with name containing apostrophe | Name with apostrophe accepted | | | Ticket:#279 |
| ESTO-S01-HP-0111 | 1.2 Registration | Guest | Happy | All | Valid data | Register, check browser console | No console errors | | | |
| ESTO-S01-HP-0112 | 1.2 Registration | Guest | Happy | All | Valid data | Register, verify header after login | Header shows new user name | | | |
| ESTO-S01-HP-0113 | 1.2 Registration | Guest | Happy | All | Valid data | Register with 8-char password (minimum) | Account created | | | Ticket:#290 |
| ESTO-S01-HP-0114 | 1.2 Registration | Guest | Happy | All | Valid data | Register, check duplicate email prevention | Second attempt with same email rejected | | | Ticket:#290 |
| ESTO-S01-HP-0115 | 1.2 Registration | Guest | Happy | All | Valid data | Register with terms accepted | Account created; terms recorded | | | |
| ESTO-S01-HP-0116 | 1.2 Registration | Guest | Happy | All | Valid data | Register, verify user role in response | Role is "user" by default | | | |
| ESTO-S01-HP-0117 | 1.2 Registration | Guest | Happy | All | Valid data | Register with all name case variations | Name preserved as entered | | | Ticket:#279 |
| ESTO-S01-HP-0118 | 1.2 Registration | Guest | Happy | All | Valid data | Register with name "A B" (two letters separated) | Accepted (at least 2 letters check passes) | | | Ticket:#279 |
| ESTO-S01-HP-0119 | 1.2 Registration | Guest | Happy | All | Valid data | Register, login, check profile page | Profile shows registered name correctly | | | |
| ESTO-S01-HP-0120 | 1.2 Registration | Guest | Happy | All | Valid data | Register, verify sanitizeRegistrationError behavior | Friendly error message on conflict | | | Ticket:#290 |
| ESTO-S01-EM-0121 | 1.2 Registration | Guest | Empty | All | -- | Submit registration with all fields empty | Validation errors for all required fields | | | |
| ESTO-S01-EM-0122 | 1.2 Registration | Guest | Empty | All | -- | Submit with empty first name | First name required error | | | Ticket:#279 |
| ESTO-S01-EM-0123 | 1.2 Registration | Guest | Empty | All | -- | Submit with empty last name | Last name required error | | | |
| ESTO-S01-EM-0124 | 1.2 Registration | Guest | Empty | All | -- | Submit with empty email | Email required error | | | |
| ESTO-S01-EM-0125 | 1.2 Registration | Guest | Empty | All | -- | Submit with empty password | Password required error | | | |
| ESTO-S01-EM-0126 | 1.2 Registration | Guest | Empty | All | -- | Submit with whitespace-only first name | Validation error | | | Ticket:#279 |
| ESTO-S01-EM-0127 | 1.2 Registration | Guest | Empty | All | -- | Submit with single-character name | Error: Name must be at least 2 characters | | | Ticket:#279 |
| ESTO-S01-EM-0128 | 1.2 Registration | Guest | Empty | All | -- | Submit with 81-char name | Error: Name must be 80 characters or less | | | Ticket:#279 |
| ESTO-S01-EM-0129 | 1.2 Registration | Guest | Empty | All | -- | Submit with emoji-only name | Error: Name must contain at least 2 letters | | | Ticket:#279 |
| ESTO-S01-EM-0130 | 1.2 Registration | Guest | Empty | All | -- | Submit with name containing only numbers | Error: Name must contain letters | | | Ticket:#279 |
| ESTO-S01-ER-0131 | 1.2 Registration | Guest | Error | All | Email already exists | Register with duplicate email | Error: This email is already registered | | | Ticket:#290 |
| ESTO-S01-ER-0132 | 1.2 Registration | Guest | Error | All | -- | Register with weak password (6 chars) | Error: Password must be at least 8 characters | | | Ticket:#290 |
| ESTO-S01-ER-0133 | 1.2 Registration | Guest | Error | All | -- | Register with invalid email format | Error: Please enter a valid email address | | | |
| ESTO-S01-ER-0134 | 1.2 Registration | Guest | Error | All | Core service down | Attempt registration with service offline | Error toast; form remains usable | | | |
| ESTO-S01-ER-0135 | 1.2 Registration | Guest | Error | All | Network offline | Attempt registration offline | Error: Network error. Check connection | | | |
| ESTO-S01-ER-0136 | 1.2 Registration | Guest | Error | All | -- | Register with XSS in name field | Input escaped; no XSS execution | | | Security |
| ESTO-S01-ER-0137 | 1.2 Registration | Guest | Error | All | -- | Register with SQL injection in email | No SQL injection; error displayed | | | Security |
| ESTO-S01-ER-0138 | 1.2 Registration | Guest | Error | All | -- | Rapid registration attempts (10+) | Rate limit error displayed | | | |
| ESTO-S01-ER-0139 | 1.2 Registration | Guest | Error | All | Mock backend | Mock 500 response on register | Error toast; form retains input | | | |
| ESTO-S01-ER-0140 | 1.2 Registration | Guest | Error | All | Mock backend | Mock timeout on register | Loading state then error toast | | | |
| ESTO-S01-ED-0141 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with 80-char name (max allowed) | Accepted; name stored correctly | | | Ticket:#279 |
| ESTO-S01-ED-0142 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with name "A A" (minimum valid) | Accepted; exactly 2 letters | | | Ticket:#279 |
| ESTO-S01-ED-0143 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with name containing special chars in regex | Accepted if matches [A-Za-z .'-]+ | | | Ticket:#279 |
| ESTO-S01-ED-0144 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with 254-char email | Handled gracefully | | | |
| ESTO-S01-ED-0145 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with 72-char password | Accepted if meets complexity | | | |
| ESTO-S01-ED-0146 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with password containing all special chars | Accepted if meets complexity rules | | | |
| ESTO-S01-ED-0147 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with name in all caps | Name preserved as entered | | | Ticket:#279 |
| ESTO-S01-ED-0148 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with name in all lowercase | Name preserved as entered | | | Ticket:#279 |
| ESTO-S01-ED-0149 | 1.2 Registration | Guest | Edge | All | Valid data available | Register with unicode characters in name | Error or handled per validation rules | | | Ticket:#279 |
| ESTO-S01-ED-0150 | 1.2 Registration | Guest | Edge | All | Valid data available | Rapid double-click on Sign up button | No duplicate registration created | | | |
| ESTO-S01-CR-0151 | 1.2 Registration | Guest | Cross-Role | All | -- | Logged-in user navigates to /register | Redirected to dashboard or shows logged-in state | | | |
| ESTO-S01-CR-0152 | 1.2 Registration | Admin | Cross-Role | All | Admin logged in | Admin attempts to register new account | Allowed or redirected based on policy | | | |
| ESTO-S01-CR-0153 | 1.2 Registration | Guest | Cross-Role | All | -- | Register, login, access admin panel | Redirected to /user/dashboard | | | Security |
| ESTO-S01-CR-0154 | 1.2 Registration | Guest | Cross-Role | All | -- | Register as user, try manager features | Feature-gated; no access to manager routes | | | Security |
| ESTO-S01-CR-0155 | 1.2 Registration | Guest | Cross-Role | All | -- | Register from two browsers simultaneously | Both registrations handled independently | | | |
| ESTO-S01-CR-0156 | 1.2 Registration | Guest | Cross-Role | All | -- | Register, immediately attempt second registration | Second attempt rejected or handled | | | |
| ESTO-S01-CR-0157 | 1.2 Registration | Manager | Cross-Role | All | Manager logged in | Manager navigates to /register | Redirected to manager dashboard | | | |
| ESTO-S01-CR-0158 | 1.2 Registration | Admin | Cross-Role | All | Admin logged in | Admin navigates to /register | Redirected to admin dashboard | | | |
| ESTO-S01-CR-0159 | 1.2 Registration | Guest | Cross-Role | All | -- | Register in Private/Incognito mode | Registration works; session not persisted | | | |
| ESTO-S01-CR-0160 | 1.2 Registration | Guest | Cross-Role | All | -- | Register with disabled cookies | Registration blocked or limited | | | |

### 1.3 Logout & Session Expiry (90)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0161 | 1.3 Logout | Guest | Happy | All | Logged in | Click Logout from header menu | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0162 | 1.3 Logout | User | Happy | All | Logged in | Click Logout from header menu | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0163 | 1.3 Logout | Manager | Happy | All | Logged in | Click Logout from header menu | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0164 | 1.3 Logout | Admin | Happy | All | Logged in | Click Logout from header menu | JWT cleared; redirected to /login | | | |
| ESTO-S01-HP-0165 | 1.3 Logout | Guest | Happy | All | Logged in | Logout, verify all contexts cleaned | All Zustand stores reset; polling stopped | | | |
| ESTO-S01-HP-0166 | 1.3 Logout | Guest | Happy | All | Logged in | Logout, check Network tab | POST /api/v1/auth/logout returns 200 | | | |
| ESTO-S01-HP-0167 | 1.3 Logout | User | Happy | All | Logged in | Logout, attempt to navigate back | Redirected to /login | | | |
| ESTO-S01-HP-0168 | 1.3 Logout | Guest | Happy | All | Logged in | Logout, attempt back-button navigation | Cannot access previous authenticated page | | | |
| ESTO-S01-HP-0169 | 1.3 Logout | Guest | Happy | All | Logged in | Logout, verify localStorage cleared | JWT and user data removed from localStorage | | | |
| ESTO-S01-HP-0170 | 1.3 Logout | Guest | Happy | All | Logged in | Logout, open new tab, navigate to protected route | Redirected to /login | | | |
| ESTO-S01-EM-0171 | 1.3 Logout | Guest | Empty | All | Not logged in | Navigate to /login and attempt logout | No logout action; on /login already | | | |
| ESTO-S01-EM-0172 | 1.3 Logout | Guest | Empty | All | Cleared storage | Clear storage, verify no stale auth state | App shows logged-out state | | | |
| ESTO-S01-EM-0173 | 1.3 Logout | Guest | Empty | All | -- | Clear localStorage manually | App detects missing token; shows logged-out | | | |
| ESTO-S01-EM-0174 | 1.3 Logout | Guest | Empty | All | Session expired | Token expired; open app | Redirected to /login automatically | | | |
| ESTO-S01-EM-0175 | 1.3 Logout | User | Empty | All | Token expired | Navigate to any protected route | Redirected to /login | | | |
| ESTO-S01-ER-0176 | 1.3 Logout | Guest | Error | All | Logged in | Backend unavailable, attempt logout | Client clears local state anyway | | | |
| ESTO-S01-ER-0177 | 1.3 Logout | Guest | Error | All | Logged in | Mock logout endpoint returns 500 | Client clears state; error toast shown | | | |
| ESTO-S01-ER-0178 | 1.3 Logout | Guest | Error | All | Logged in | Mock logout returns 401 | Client clears state gracefully | | | |
| ESTO-S01-ER-0179 | 1.3 Logout | Guest | Error | All | Logged in | Network offline during logout | Local state cleared; background sync fails | | | |
| ESTO-S01-ER-0180 | 1.3 Logout | Guest | Error | All | Logged in | Token tampered, attempt logout | Graceful handling; state cleared | | | |
| ESTO-S01-ED-0181 | 1.3 Logout | Guest | Edge | All | Logged in | Logout while API request in flight | Request cancelled or completed; state cleared | | | |
| ESTO-S01-ED-0182 | 1.3 Logout | Guest | Edge | All | Logged in | Rapid double-click logout | No double-logout issues | | | |
| ESTO-S01-ED-0183 | 1.3 Logout | Guest | Edge | All | Logged in | Logout, immediately attempt login | New login works correctly | | | |
| ESTO-S01-ED-0184 | 1.3 Logout | Guest | Edge | All | Logged in | Logout while modal/dialog open | Modal dismissed; redirect to /login | | | |
| ESTO-S01-ED-0185 | 1.3 Logout | User | Edge | All | Logged in | Logout with unsaved form data | Data cleared; no auto-save after logout | | | |
| ESTO-S01-CR-0186 | 1.3 Logout | Guest | Cross-Role | All | Both logged in | User logs out; Manager session unaffected | Manager session continues | | | |
| ESTO-S01-CR-0187 | 1.3 Logout | Admin | Cross-Role | All | Admin logged in | Admin logs out, User still logged in Tab B | Admin session cleared; User unaffected | | | |
| ESTO-S01-CR-0188 | 1.3 Logout | Guest | Cross-Role | All | Both logged in | Both users log out simultaneously | Both sessions cleared independently | | | |
| ESTO-S01-CR-0189 | 1.3 Logout | Guest | Cross-Role | All | Logged in | Logout from protected deep link | Redirected to /login; deep link not accessible | | | |
| ESTO-S01-CR-0190 | 1.3 Logout | Guest | Cross-Role | All | Multiple tabs | Logout from one tab, check other tabs | Other tabs detect logout and redirect | | | |

### 1.4 Session Management & Token Refresh (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0191 | 1.4 Session | Guest | Happy | All | Valid session | Token refresh triggered automatically | New token obtained; session continues | | | |
| ESTO-S01-HP-0192 | 1.4 Session | User | Happy | All | Valid session | Wait for token expiry, verify auto-refresh | Session maintained without re-login | | | |
| ESTO-S01-HP-0193 | 1.4 Session | Guest | Happy | All | Valid session | Make API call near token expiry | 401 triggers refresh; call retried | | | |
| ESTO-S01-HP-0194 | 1.4 Session | Guest | Happy | All | Valid session | Verify refresh token stored securely | Refresh token in secure storage | | | |
| ESTO-S01-HP-0195 | 1.4 Session | Guest | Happy | All | Valid session | Token refresh succeeds, verify new JWT | New JWT has updated expiry | | | |
| ESTO-S01-EM-0196 | 1.4 Session | Guest | Empty | All | -- | No refresh token, token expires | Redirected to /login | | | |
| ESTO-S01-EM-0197 | 1.4 Session | User | Empty | All | Cleared storage | Clear refresh token, let access token expire | Redirected to /login on next request | | | |
| ESTO-S01-EM-0198 | 1.4 Session | Guest | Empty | All | -- | Both tokens expired | Redirected to /login | | | |
| ESTO-S01-EM-0199 | 1.4 Session | Guest | Empty | All | -- | Refresh token revoked on backend | Redirected to /login; full re-login required | | | |
| ESTO-S01-EM-0200 | 1.4 Session | User | Empty | All | -- | Refresh token expired but access valid | Refresh fails; graceful handling | | | |
| ESTO-S01-ER-0201 | 1.4 Session | Guest | Error | All | Valid session | Mock refresh endpoint returns 500 | Redirected to /login; no crash | | | |
| ESTO-S01-ER-0202 | 1.4 Session | Guest | Error | All | Valid session | Mock refresh returns 401 | Redirected to /login | | | |
| ESTO-S01-ER-0203 | 1.4 Session | Guest | Error | All | Valid session | Network offline during refresh | Graceful degradation; redirect on next action | | | |
| ESTO-S01-ER-0204 | 1.4 Session | Guest | Error | All | Valid session | Refresh endpoint slow (>10s) | Loading state; no crash | | | |
| ESTO-S01-ER-0205 | 1.4 Session | Guest | Error | All | Tampered token | Tampered refresh token, attempt refresh | Redirected to /login | | | Security |
| ESTO-S01-ER-0206 | 1.4 Session | Guest | Error | All | Valid session | Concurrent refresh requests (race) | Only one refresh succeeds; no error | | | |
| ESTO-S01-ER-0207 | 1.4 Session | Guest | Error | All | Valid session | Refresh token already used (replay) | Rejected; new token issued or redirect | | | Security |
| ESTO-S01-ER-0208 | 1.4 Session | Guest | Error | All | Valid session | Clock skew causes premature expiry | Handled with leeway; session continues | | | |
| ESTO-S01-ER-0209 | 1.4 Session | Guest | Error | All | Valid session | Malformed refresh response | Error toast; redirect to /login | | | |
| ESTO-S01-ER-0210 | 1.4 Session | Guest | Error | All | Valid session | Refresh during page navigation | No race condition; refresh completes | | | |
| ESTO-S01-ED-0211 | 1.4 Session | Guest | Edge | All | Valid session | Token refresh at exact expiry boundary | Handled gracefully | | | |
| ESTO-S01-ED-0212 | 1.4 Session | User | Edge | All | Valid session | Multiple concurrent API calls during refresh | All calls queued and retried with new token | | | |
| ESTO-S01-ED-0213 | 1.4 Session | Guest | Edge | All | Valid session | Refresh token with very short expiry (1min) | Refresh completes before expiry | | | |
| ESTO-S01-ED-0214 | 1.4 Session | Guest | Edge | All | Valid session | Refresh with max-length token | Handled without error | | | |
| ESTO-S01-ED-0215 | 1.4 Session | Guest | Edge | All | Valid session | Rapid token expiry and refresh cycle | No infinite loop or stack overflow | | | |
| ESTO-S01-ED-0216 | 1.4 Session | User | Edge | All | Valid session | Session across midnight boundary | Token refresh works across date change | | | |
| ESTO-S01-ED-0217 | 1.4 Session | Guest | Edge | All | Valid session | Device clock significantly ahead | Token appears expired; handled gracefully | | | |
| ESTO-S01-ED-0218 | 1.4 Session | Guest | Edge | All | Valid session | Device clock significantly behind | Token valid longer; handled correctly | | | |
| ESTO-S01-ED-0219 | 1.4 Session | Guest | Edge | All | Valid session | Refresh with empty/null response body | Error handled; redirect to /login | | | |
| ESTO-S01-ED-0220 | 1.4 Session | Guest | Edge | All | Valid session | Multiple tabs refreshing simultaneously | No conflicts; all tabs refreshed | | | |
| ESTO-S01-CR-0221 | 1.4 Session | Guest | Cross-Role | All | Both logged in | User session expires, Manager session active | User redirected; Manager unaffected | | | |
| ESTO-S01-CR-0222 | 1.4 Session | Admin | Cross-Role | All | Admin + User logged in | Admin token refresh, User token expired | Admin continues; User prompted to re-login | | | |
| ESTO-S01-CR-0223 | 1.4 Session | Guest | Cross-Role | All | Multiple roles | Cross-role token refresh on different endpoints | Each role's refresh works independently | | | |
| ESTO-S01-CR-0224 | 1.4 Session | Guest | Cross-Role | All | Admin + Manager | Admin session timeout, Manager active | Admin redirected; Manager unaffected | | | |
| ESTO-S01-CR-0225 | 1.4 Session | Guest | Cross-Role | All | All roles logged in | All sessions expire simultaneously | All redirected; no interference | | | |

### 1.5 Password Reset & Recovery (60)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0226 | 1.5 PwdReset | Guest | Happy | All | Registered email | Navigate to /forgot-password, enter email | Reset email sent confirmation shown | | | |
| ESTO-S01-HP-0227 | 1.5 PwdReset | Guest | Happy | All | Reset email received | Click reset link in email | Redirected to /reset-password with valid token | | | |
| ESTO-S01-HP-0228 | 1.5 PwdReset | Guest | Happy | All | Valid reset token | Enter new password, confirm, submit | Password updated; redirected to /login | | | |
| ESTO-S01-HP-0229 | 1.5 PwdReset | User | Happy | All | Valid reset token | Set new password, login with new password | Login successful with new password | | | |
| ESTO-S01-HP-0230 | 1.5 PwdReset | Guest | Happy | All | Reset token | Verify reset token in URL is single-use | Token invalidated after use | | | |
| ESTO-S01-EM-0231 | 1.5 PwdReset | Guest | Empty | All | -- | Submit forgot-password with empty email | Email required validation error | | | |
| ESTO-S01-EM-0232 | 1.5 PwdReset | Guest | Empty | All | -- | Submit reset-password with empty fields | Password and confirm required errors | | | |
| ESTO-S01-EM-0233 | 1.5 PwdReset | Guest | Empty | All | -- | Access /reset-password without token | Error: Invalid or missing token | | | |
| ESTO-S01-EM-0234 | 1.5 PwdReset | User | Empty | All | -- | Submit with mismatched password/confirm | Error: Passwords do not match | | | |
| ESTO-S01-EM-0235 | 1.5 PwdReset | Guest | Empty | All | -- | Submit with whitespace-only email | Validation error displayed | | | |
| ESTO-S01-ER-0236 | 1.5 PwdReset | Guest | Error | All | -- | Submit forgot-password for non-existent email | Generic "if account exists" message | | | |
| ESTO-S01-ER-0237 | 1.5 PwdReset | Guest | Error | All | Expired token | Use expired reset token | Error: Token has expired | | | |
| ESTO-S01-ER-0238 | 1.5 PwdReset | Guest | Error | All | Used token | Reuse already-used reset token | Error: Token already used | | | |
| ESTO-S01-ER-0239 | 1.5 PwdReset | Guest | Error | All | Tampered token | Use tampered reset token | Error: Invalid token | | | Security |
| ESTO-S01-ER-0240 | 1.5 PwdReset | Guest | Error | All | Backend down | Submit forgot-password, service offline | Error toast; retry option | | | |
| ESTO-S01-ER-0241 | 1.5 PwdReset | Guest | Error | All | Network offline | Submit forgot-password offline | Error: Network error | | | |
| ESTO-S01-ER-0242 | 1.5 PwdReset | Guest | Error | All | Mock backend | Mock 500 on password update | Error toast; token remains valid for retry | | | |
| ESTO-S01-ER-0243 | 1.5 PwdReset | Guest | Error | All | Valid token | Submit new password with < 8 chars | Error: Password must be at least 8 characters | | | |
| ESTO-S01-ER-0244 | 1.5 PwdReset | Guest | Error | All | Valid token | Submit with XSS in new password | Input escaped; no XSS execution | | | Security |
| ESTO-S01-ER-0245 | 1.5 PwdReset | Guest | Error | All | Rate limited | Rapid forgot-password requests | Rate limit error displayed | | | |
| ESTO-S01-ED-0246 | 1.5 PwdReset | Guest | Edge | All | Registered email | Enter email with 254 chars | Handled gracefully | | | |
| ESTO-S01-ED-0247 | 1.5 PwdReset | Guest | Edge | All | Registered email | Enter email with mixed case | Case-insensitive lookup works | | | |
| ESTO-S01-ED-0248 | 1.5 PwdReset | Guest | Edge | All | Valid token | Enter 128-char new password | Handled gracefully | | | |
| ESTO-S01-ED-0249 | 1.5 PwdReset | Guest | Edge | All | Valid token | Enter password with all special chars | Accepted if meets complexity rules | | | |
| ESTO-S01-ED-0250 | 1.5 PwdReset | Guest | Edge | All | Valid token | Submit at token expiry boundary | Graceful handling | | | |
| ESTO-S01-ED-0251 | 1.5 PwdReset | Guest | Edge | All | Valid token | Use reset link in multiple tabs | First use invalidates others | | | |
| ESTO-S01-ED-0252 | 1.5 PwdReset | Guest | Edge | All | Valid token | Rapid double-click submit | No double password update | | | |
| ESTO-S01-ED-0253 | 1.5 PwdReset | Guest | Edge | All | Valid token | Enter password with unicode chars | Accepted or rejected per validation | | | |
| ESTO-S01-ED-0254 | 1.5 PwdReset | Guest | Edge | All | Registered email | Enter email with trailing spaces | Email trimmed before lookup | | | |
| ESTO-S01-ED-0255 | 1.5 PwdReset | Guest | Edge | All | -- | Request reset for email with alias (+tag) | Handled per email normalization rules | | | |
| ESTO-S01-CR-0256 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Admin requests password reset for user | Admin cannot self-reset via user flow | | | |
| ESTO-S01-CR-0257 | 1.5 PwdReset | User | Cross-Role | All | User logged in | User navigates to /forgot-password | Redirected to dashboard or profile | | | |
| ESTO-S01-CR-0258 | 1.5 PwdReset | Manager | Cross-Role | All | Manager logged in | Manager navigates to /forgot-password | Redirected to manager dashboard | | | |
| ESTO-S01-CR-0259 | 1.5 PwdReset | Admin | Cross-Role | All | Admin logged in | Admin navigates to /forgot-password | Redirected to admin dashboard | | | |
| ESTO-S01-CR-0260 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Reset password, attempt old password login | Old password rejected; new password works | | | |
| ESTO-S01-CR-0261 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Reset password for admin account | Admin notified; policy enforced | | | |
| ESTO-S01-CR-0262 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Reset password for manager account | Manager notified; policy enforced | | | |
| ESTO-S01-CR-0263 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Request reset for multiple accounts same email | Single reset email sent for primary account | | | |
| ESTO-S01-CR-0264 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Password reset while logged in on another tab | Session remains valid until token expiry | | | |
| ESTO-S01-CR-0265 | 1.5 PwdReset | Guest | Cross-Role | All | -- | Reset password, then login from two devices | Both devices accept new password | | | |

### 1.6 Profile Management (70)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0266 | 1.6 Profile | User | Happy | All | Logged in | Navigate to /profile, update display name | Name updated; reflected in header immediately | | | |
| ESTO-S01-HP-0267 | 1.6 Profile | User | Happy | All | Logged in | Navigate to /profile, update email | Email updated; verification sent | | | |
| ESTO-S01-HP-0268 | 1.6 Profile | User | Happy | All | Logged in | Navigate to /profile, change password | Password changed; old password rejected | | | |
| ESTO-S01-HP-0269 | 1.6 Profile | Manager | Happy | All | Logged in | Update manager profile details | Profile updated; changes saved | | | |
| ESTO-S01-HP-0270 | 1.6 Profile | Admin | Happy | All | Logged in | Update admin profile details | Profile updated; changes saved | | | |
| ESTO-S01-HP-0271 | 1.6 Profile | Guest | Happy | All | Logged in | View profile page | Profile data displayed correctly | | | |
| ESTO-S01-HP-0272 | 1.6 Profile | User | Happy | All | Logged in | Update phone number | Phone number updated | | | |
| ESTO-S01-HP-0273 | 1.6 Profile | User | Happy | All | Logged in | Upload profile picture | Image uploaded and displayed | | | |
| ESTO-S01-HP-0274 | 1.6 Profile | Guest | Happy | All | Logged in | Update profile, check Network tab | PUT request returns 200 | | | |
| ESTO-S01-HP-0275 | 1.6 Profile | User | Happy | All | Logged in | Update profile, verify header updates | Header shows updated name immediately | | | |
| ESTO-S01-EM-0276 | 1.6 Profile | Guest | Empty | All | Logged in | Submit profile update with no changes | No API call; no change in data | | | |
| ESTO-S01-EM-0277 | 1.6 Profile | User | Empty | All | Logged in | Clear profile picture field | No picture displayed | | | |
| ESTO-S01-EM-0278 | 1.6 Profile | Guest | Empty | All | Not logged in | Navigate to /profile | Redirected to /login | | | |
| ESTO-S01-EM-0279 | 1.6 Profile | User | Empty | All | Cleared storage | Clear storage, navigate to /profile | Redirected to /login | | | |
| ESTO-S01-EM-0280 | 1.6 Profile | Guest | Empty | All | -- | Update profile with empty display name | Validation error displayed | | | |
| ESTO-S01-ER-0281 | 1.6 Profile | Guest | Error | All | Logged in | Update email to already-taken address | Error: Email already in use | | | |
| ESTO-S01-ER-0282 | 1.6 Profile | User | Error | All | Logged in | Enter invalid email format in profile | Error: Please enter a valid email | | | |
| ESTO-S01-ER-0283 | 1.6 Profile | Guest | Error | All | Logged in | Backend unavailable during profile update | Error toast; retry option | | | |
| ESTO-S01-ER-0284 | 1.6 Profile | User | Error | All | Logged in | Wrong current password for change | Error: Current password is incorrect | | | |
| ESTO-S01-ER-0285 | 1.6 Profile | Guest | Error | All | Logged in | Network offline during profile update | Error: Network error; data preserved | | | |
| ESTO-S01-ER-0286 | 1.6 Profile | User | Error | All | Logged in | Upload oversized profile picture | Error: File too large; max size shown | | | |
| ESTO-S01-ER-0287 | 1.6 Profile | Guest | Error | All | Logged in | Upload non-image file as profile pic | Error: Only image files allowed | | | |
| ESTO-S01-ER-0288 | 1.6 Profile | User | Error | All | Logged in | Mock 500 on profile update | Error toast; form retains data | | | |
| ESTO-S01-ER-0289 | 1.6 Profile | Guest | Error | All | Logged in | Enter XSS in display name field | Input escaped; no XSS execution | | | Security |
| ESTO-S01-ER-0290 | 1.6 Profile | User | Error | All | Logged in | Update with SQL injection in field | No SQL injection; error displayed | | | Security |
| ESTO-S01-ED-0291 | 1.6 Profile | Guest | Edge | All | Logged in | Update display name with 80 chars | Accepted; stored correctly | | | |
| ESTO-S01-ED-0292 | 1.6 Profile | User | Edge | All | Logged in | Update display name with unicode chars | Accepted or rejected per rules | | | |
| ESTO-S01-ED-0293 | 1.6 Profile | Guest | Edge | All | Logged in | Update display name with emoji | Accepted or rejected per validation | | | |
| ESTO-S01-ED-0294 | 1.6 Profile | User | Edge | All | Logged in | Update display name with leading/trailing spaces | Spaces trimmed; name stored clean | | | |
| ESTO-S01-ED-0295 | 1.6 Profile | Guest | Edge | All | Logged in | Upload profile pic near size limit | Accepted if within limit | | | |
| ESTO-S01-ED-0296 | 1.6 Profile | User | Edge | All | Logged in | Rapid profile updates (5 in 10s) | All updates queued; last one wins | | | |
| ESTO-S01-ED-0297 | 1.6 Profile | Guest | Edge | All | Logged in | Update email to same current email | No change; no error | | | |
| ESTO-S01-ED-0298 | 1.6 Profile | User | Edge | All | Logged in | Update password to same current password | Accepted or warned per policy | | | |
| ESTO-S01-ED-0299 | 1.6 Profile | Guest | Edge | All | Logged in | Update profile during network flap | Update retried or queued | | | |
| ESTO-S01-ED-0300 | 1.6 Profile | User | Edge | All | Logged in | Very long phone number input | Handled gracefully; truncated or validated | | | |
| ESTO-S01-CR-0301 | 1.6 Profile | Guest | Cross-Role | All | All roles logged in | User updates profile, Manager unaffected | User changes isolated to User session | | | |
| ESTO-S01-CR-0302 | 1.6 Profile | Admin | Cross-Role | All | Admin + User logged in | Admin views user profile via admin panel | Admin sees user data in admin context | | | |
| ESTO-S01-CR-0303 | 1.6 Profile | User | Cross-Role | All | User + Admin logged in | User edits own profile, Admin watches | Admin panel shows updated user data | | | |
| ESTO-S01-CR-0304 | 1.6 Profile | Guest | Cross-Role | All | Admin + Manager logged in | Admin updates Manager profile | Manager sees updated data | | | |
| ESTO-S01-CR-0305 | 1.6 Profile | Manager | Cross-Role | All | Manager logged in | Manager updates own profile | Manager data updated | | | |
| ESTO-S01-CR-0306 | 1.6 Profile | Admin | Cross-Role | All | Admin logged in | Admin updates own profile | Admin data updated | | | |
| ESTO-S01-CR-0307 | 1.6 Profile | Guest | Cross-Role | All | All roles | User tries to access admin profile edit | Feature-gated; no access | | | Security |
| ESTO-S01-CR-0308 | 1.6 Profile | User | Cross-Role | All | User logged in | User tries to access another user's profile | Redirected or shows own profile only | | | Security |
| ESTO-S01-CR-0309 | 1.6 Profile | Guest | Cross-Role | All | All roles | Profile update across multiple tabs | All tabs reflect update after sync | | | |
| ESTO-S01-CR-0310 | 1.6 Profile | Manager | Cross-Role | All | Manager + User | Manager views own profile in manager view | Manager-specific fields displayed | | | |

### 1.7 Authorization & Route Protection (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0311 | 1.7 AuthZ | Guest | Happy | All | Valid user | Navigate to /user/dashboard | Dashboard loads with user data | | | |
| ESTO-S01-HP-0312 | 1.7 AuthZ | User | Happy | All | User logged in | Navigate to /user/properties | User properties page loads | | | |
| ESTO-S01-HP-0313 | 1.7 AuthZ | Manager | Happy | All | Manager logged in | Navigate to /manager/dashboard | Manager dashboard loads | | | |
| ESTO-S01-HP-0314 | 1.7 AuthZ | Admin | Happy | All | Admin logged in | Navigate to /admin/dashboard | Admin dashboard loads | | | |
| ESTO-S01-HP-0315 | 1.7 AuthZ | User | Happy | All | User logged in | Navigate to /admin/dashboard | Redirected to /user/dashboard | | | Security |
| ESTO-S01-HP-0316 | 1.7 AuthZ | User | Happy | All | User logged in | Navigate to /manager/dashboard | Redirected to /user/dashboard | | | Security |
| ESTO-S01-HP-0317 | 1.7 AuthZ | Manager | Happy | All | Manager logged in | Navigate to /admin/dashboard | Redirected to /manager/dashboard | | | |
| ESTO-S01-HP-0318 | 1.7 AuthZ | Manager | Happy | All | Manager logged in | Navigate to /user/dashboard | Allowed or redirected per policy | | | |
| ESTO-S01-HP-0319 | 1.7 AuthZ | Admin | Happy | All | Admin logged in | Navigate to /user/dashboard | Allowed (admin oversight) | | | |
| ESTO-S01-HP-0320 | 1.7 AuthZ | Admin | Happy | All | Admin logged in | Navigate to /manager/dashboard | Allowed (admin oversight) | | | |
| ESTO-S01-EM-0321 | 1.7 AuthZ | Guest | Empty | All | -- | Navigate to /user/dashboard (no auth) | Redirected to /login | | | Security |
| ESTO-S01-EM-0322 | 1.7 AuthZ | Guest | Empty | All | -- | Navigate to /admin/dashboard (no auth) | Redirected to /login | | | Security |
| ESTO-S01-EM-0323 | 1.7 AuthZ | Guest | Empty | All | -- | Navigate to /manager/dashboard (no auth) | Redirected to /login | | | Security |
| ESTO-S01-EM-0324 | 1.7 AuthZ | Guest | Empty | All | -- | Direct URL to any protected route without auth | Redirected to /login | | | Security |
| ESTO-S01-EM-0325 | 1.7 AuthZ | Guest | Empty | All | -- | Access API endpoint without JWT | 401 Unauthorized returned | | | Security |
| ESTO-S01-ER-0326 | 1.7 AuthZ | Guest | Error | All | Expired JWT | Navigate to protected route with expired token | Redirected to /login; token cleared | | | |
| ESTO-S01-ER-0327 | 1.7 AuthZ | Guest | Error | All | Tampered JWT | Navigate with tampered JWT | Redirected to /login; token rejected | | | Security |
| ESTO-S01-ER-0328 | 1.7 AuthZ | Guest | Error | All | Wrong role JWT | Use User JWT to access Admin routes | Redirected; access denied | | | Security |
| ESTO-S01-ER-0329 | 1.7 AuthZ | Guest | Error | All | -- | Access API with forged Authorization header | 401 Unauthorized | | | Security |
| ESTO-S01-ER-0330 | 1.7 AuthZ | User | Error | All | Admin-only route | User tries direct API access to admin endpoint | 403 Forbidden | | | Security |
| ESTO-S01-ER-0331 | 1.7 AuthZ | Manager | Error | All | Admin-only route | Manager tries direct API access to admin endpoint | 403 Forbidden | | | Security |
| ESTO-S01-ER-0332 | 1.7 AuthZ | Guest | Error | All | -- | Access API with empty JWT string | 401 Unauthorized | | | Security |
| ESTO-S01-ER-0333 | 1.7 AuthZ | Guest | Error | All | -- | Access API with null JWT | 401 Unauthorized | | | Security |
| ESTO-S01-ER-0334 | 1.7 AuthZ | Guest | Error | All | -- | Modify JWT in DevTools to admin role | Token signature invalid; 401 returned | | | Security |
| ESTO-S01-ER-0335 | 1.7 AuthZ | Guest | Error | All | -- | Replay old valid JWT (if not using short expiry) | Rejected if expiry check enforced | | | Security |
| ESTO-S01-ED-0336 | 1.7 AuthZ | Guest | Edge | All | Valid user | Navigate to deeply nested protected route | Route resolved; auth checked at each level | | | |
| ESTO-S01-ED-0337 | 1.7 AuthZ | User | Edge | All | Valid user | Access route with dynamic parameter | Parameter validated; data scoped to user | | | |
| ESTO-S01-ED-0338 | 1.7 AuthZ | Guest | Edge | All | Valid session | Navigate to route with special characters in URL | URL encoded; route resolves correctly | | | |
| ESTO-S01-ED-0339 | 1.7 AuthZ | User | Edge | All | Valid user | Access another user's resource by ID | 403 Forbidden or data not found | | | Security |
| ESTO-S01-ED-0340 | 1.7 AuthZ | Guest | Edge | All | Valid user | Navigate to route, token expires mid-navigation | Redirected to /login | | | |
| ESTO-S01-CR-0341 | 1.7 AuthZ | Guest | Cross-Role | All | All logged in | User, Manager, Admin each access their dashboards | Each gets correct dashboard | | | |
| ESTO-S01-CR-0342 | 1.7 AuthZ | User | Cross-Role | All | All logged in | User tries Admin routes in each tab | All attempts blocked | | | Security |
| ESTO-S01-CR-0343 | 1.7 AuthZ | Guest | Cross-Role | All | Admin + User | Admin accesses User-specific data via API | Allowed (admin oversight) | | | |
| ESTO-S01-CR-0344 | 1.7 AuthZ | Guest | Cross-Role | All | All logged in | Each role accesses a shared resource | Scoped access: admin sees all, user sees own | | | |
| ESTO-S01-CR-0345 | 1.7 AuthZ | User | Cross-Role | All | User logged in | User modifies own auth context | Change is isolated to user session | | | |

### 1.8 Social Login & OAuth (35)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0346 | 1.8 OAuth | Guest | Happy | All | OAuth provider configured | Click "Sign in with Google" | OAuth flow initiated; redirect to provider | | | |
| ESTO-S01-HP-0347 | 1.8 OAuth | Guest | Happy | All | OAuth configured | Complete Google OAuth flow | Account linked/created; logged in | | | |
| ESTO-S01-HP-0348 | 1.8 OAuth | User | Happy | All | Account linked | Sign in via Google | Logged in; profile synced | | | |
| ESTO-S01-HP-0349 | 1.8 OAuth | Guest | Happy | All | OAuth configured | Click "Sign in with Apple" | OAuth flow initiated | | | |
| ESTO-S01-HP-0350 | 1.8 OAuth | Guest | Happy | All | OAuth configured | Click "Sign in with Facebook" | OAuth flow initiated | | | |
| ESTO-S01-EM-0351 | 1.8 OAuth | Guest | Empty | All | -- | Click OAuth button, cancel at provider | Redirected back to login; no account created | | | |
| ESTO-S01-EM-0352 | 1.8 OAuth | Guest | Empty | All | -- | OAuth provider not configured | Button hidden or disabled | | | |
| ESTO-S01-EM-0353 | 1.8 OAuth | Guest | Empty | All | -- | Access OAuth callback without state | Error: Invalid OAuth state | | | Security |
| ESTO-S01-EM-0354 | 1.8 OAuth | User | Empty | All | -- | Access OAuth callback URL directly | Error: Invalid or missing state parameter | | | |
| ESTO-S01-EM-0355 | 1.8 OAuth | Guest | Empty | All | -- | OAuth provider returns no email | Account creation blocked or handled | | | |
| ESTO-S01-ER-0356 | 1.8 OAuth | Guest | Error | All | -- | OAuth provider returns error | Error message displayed; retry option | | | |
| ESTO-S01-ER-0357 | 1.8 OAuth | Guest | Error | All | -- | OAuth token already linked to another account | Error: Account already linked | | | |
| ESTO-S01-ER-0358 | 1.8 OAuth | Guest | Error | All | -- | OAuth provider unavailable | Error toast; fallback to email login | | | |
| ESTO-S01-ER-0359 | 1.8 OAuth | Guest | Error | All | -- | Tampered OAuth state parameter | Error: Invalid state; request rejected | | | Security |
| ESTO-S01-ER-0360 | 1.8 OAuth | User | Error | All | -- | OAuth returns mismatched email | Error: Email mismatch with existing account | | | |
| ESTO-S01-ER-0361 | 1.8 OAuth | Guest | Error | All | -- | CSRF attack on OAuth flow | State validation rejects request | | | Security |
| ESTO-S01-ER-0362 | 1.8 OAuth | Guest | Error | All | -- | OAuth callback with expired state | Error: Session expired; retry login | | | |
| ESTO-S01-ER-0363 | 1.8 OAuth | Guest | Error | All | -- | OAuth provider returns 500 | Error toast; retry option | | | |
| ESTO-S01-ER-0364 | 1.8 OAuth | Guest | Error | All | -- | Network drops during OAuth redirect | Graceful recovery on return | | | |
| ESTO-S01-ER-0365 | 1.8 OAuth | User | Error | All | -- | OAuth login when email already registered via password | Prompt to link accounts or use password login | | | |
| ESTO-S01-ED-0366 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth with long email address | Handled gracefully | | | |
| ESTO-S01-ED-0367 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth with special chars in name | Name sanitized and displayed | | | |
| ESTO-S01-ED-0368 | 1.8 OAuth | User | Edge | All | Account linked | Re-link OAuth to different account | Handled per policy | | | |
| ESTO-S01-ED-0369 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth with very long display name | Truncated or handled gracefully | | | |
| ESTO-S01-ED-0370 | 1.8 OAuth | Guest | Edge | All | OAuth configured | Multiple OAuth providers for same user | Linked correctly or error shown | | | |
| ESTO-S01-ED-0371 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth after clearing cookies | Re-authentication required | | | |
| ESTO-S01-ED-0372 | 1.8 OAuth | Guest | Edge | All | OAuth configured | Rapid OAuth login attempts | Rate limited appropriately | | | |
| ESTO-S01-ED-0373 | 1.8 OAuth | User | Edge | All | Account linked | OAuth login with unverified email | Prompt for verification or allowed | | | |
| ESTO-S01-ED-0374 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth with international characters in name | Displayed correctly or sanitized | | | |
| ESTO-S01-ED-0375 | 1.8 OAuth | Guest | Edge | All | OAuth configured | OAuth callback URL tampering | Rejected by state validation | | | Security |
| ESTO-S01-CR-0376 | 1.8 OAuth | Guest | Cross-Role | All | -- | User OAuth login, then password login | Both methods work for same account | | | |
| ESTO-S01-CR-0377 | 1.8 OAuth | Admin | Cross-Role | All | Admin logged in | Admin OAuth login attempt | Allowed; same admin account | | | |
| ESTO-S01-CR-0378 | 1.8 OAuth | Guest | Cross-Role | All | -- | OAuth login as User, try Admin features | Role-based gating enforced | | | Security |
| ESTO-S01-CR-0379 | 1.8 OAuth | Guest | Cross-Role | All | -- | Link OAuth to existing account | Account linked; login methods merged | | | |
| ESTO-S01-CR-0380 | 1.8 OAuth | User | Cross-Role | All | -- | Unlink OAuth from account | Can still login with password | | | |

### 1.9 Multi-Factor Authentication (40)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0381 | 1.9 MFA | User | Happy | All | MFA enabled | Login, enter valid MFA code | Logged in successfully | | | |
| ESTO-S01-HP-0382 | 1.9 MFA | Admin | Happy | All | MFA enabled | Login, enter valid MFA code | Logged in successfully | | | |
| ESTO-S01-HP-0383 | 1.9 MFA | Guest | Happy | All | MFA enabled | Login with backup code | Logged in successfully | | | |
| ESTO-S01-HP-0384 | 1.9 MFA | User | Happy | All | MFA enabled | Enable MFA in settings | MFA enabled; QR code displayed | | | |
| ESTO-S01-HP-0385 | 1.9 MFA | User | Happy | All | MFA enabled | Disable MFA with valid code | MFA disabled; login without MFA works | | | |
| ESTO-S01-EM-0386 | 1.9 MFA | Guest | Empty | All | -- | Submit MFA with empty code | MFA code required error | | | |
| ESTO-S01-EM-0387 | 1.9 MFA | User | Empty | All | -- | Submit MFA with whitespace-only code | Validation error | | | |
| ESTO-S01-EM-0388 | 1.9 MFA | Guest | Empty | All | -- | Access MFA setup without being logged in | Redirected to /login | | | |
| ESTO-S01-EM-0389 | 1.9 MFA | User | Empty | All | -- | Submit MFA with empty backup code | Backup code required error | | | |
| ESTO-S01-EM-0390 | 1.9 MFA | Guest | Empty | All | -- | MFA challenge with no pending session | Error: No pending MFA challenge | | | |
| ESTO-S01-ER-0391 | 1.9 MFA | User | Error | All | MFA enabled | Enter wrong MFA code | Error: Invalid code; attempts remaining shown | | | |
| ESTO-S01-ER-0392 | 1.9 MFA | User | Error | All | MFA enabled | Enter expired MFA code | Error: Code expired; request new one | | | |
| ESTO-S01-ER-0393 | 1.9 MFA | Guest | Error | All | MFA enabled | Enter wrong MFA code 5 times | Account temporarily locked | | | |
| ESTO-S01-ER-0394 | 1.9 MFA | User | Error | All | MFA enabled | Use already-used backup code | Error: Backup code already used | | | |
| ESTO-S01-ER-0395 | 1.9 MFA | Guest | Error | All | MFA enabled | Backend unavailable during MFA verify | Error toast; retry option | | | |
| ESTO-S01-ER-0396 | 1.9 MFA | User | Error | All | MFA enabled | Network offline during MFA verify | Error: Network error | | | |
| ESTO-S01-ER-0397 | 1.9 MFA | Guest | Error | All | MFA enabled | Tampered MFA session token | Error: Invalid session; restart login | | | Security |
| ESTO-S01-ER-0398 | 1.9 MFA | User | Error | All | MFA enabled | MFA code from wrong account | Error: Code does not match your account | | | Security |
| ESTO-S01-ER-0399 | 1.9 MFA | Guest | Error | All | MFA enabled | MFA with clock-skewed device | Code rejected due to time mismatch | | | |
| ESTO-S01-ER-0400 | 1.9 MFA | User | Error | All | MFA enabled | Mock 500 on MFA verification | Error toast; no crash | | | |
| ESTO-S01-ED-0401 | 1.9 MFA | Guest | Edge | All | MFA enabled | Enter MFA code just before expiry | Accepted; grace period applied | | | |
| ESTO-S01-ED-0402 | 1.9 MFA | User | Edge | All | MFA enabled | Enter MFA code just after expiry | Rejected; new code required | | | |
| ESTO-S01-ED-0403 | 1.9 MFA | Guest | Edge | All | MFA enabled | Enter code with leading/trailing spaces | Spaces trimmed; code validated | | | |
| ESTO-S01-ED-0404 | 1.9 MFA | User | Edge | All | MFA enabled | Rapid MFA code submission | No duplicate submissions | | | |
| ESTO-S01-ED-0405 | 1.9 MFA | Guest | Edge | All | MFA enabled | Enter MFA code on device with wrong time | Time-sync error; code rejected | | | |
| ESTO-S01-ED-0406 | 1.9 MFA | User | Edge | All | MFA enabled | MFA with multiple pending sessions | Each session requires its own code | | | |
| ESTO-S01-ED-0407 | 1.9 MFA | Guest | Edge | All | MFA enabled | Scan QR code on small screen | QR code displayed at readable size | | | A11y |
| ESTO-S01-ED-0408 | 1.9 MFA | User | Edge | All | MFA enabled | Enter backup code with mixed case | Case-insensitive matching | | | |
| ESTO-S01-ED-0409 | 1.9 MFA | Guest | Edge | All | MFA enabled | MFA setup with screen reader | All steps announced; QR described textually | | | A11y |
| ESTO-S01-ED-0410 | 1.9 MFA | User | Edge | All | MFA enabled | Last backup code used | Error: No backup codes remaining | | | |
| ESTO-S01-CR-0411 | 1.9 MFA | Guest | Cross-Role | All | All roles | Each role with MFA logs in | All authenticate with MFA | | | |
| ESTO-S01-CR-0412 | 1.9 MFA | User | Cross-Role | All | User + Admin | User enables MFA, Admin unaffected | Independent MFA states | | | |
| ESTO-S01-CR-0413 | 1.9 MFA | Admin | Cross-Role | All | Admin with MFA | Admin resets User MFA (if supported) | User MFA reset; notified | | | |
| ESTO-S01-CR-0414 | 1.9 MFA | Guest | Cross-Role | All | -- | Admin requires MFA for all users | All logins require MFA | | | Security |
| ESTO-S01-CR-0415 | 1.9 MFA | User | Cross-Role | All | -- | User without MFA, Admin requires it | User prompted to enable MFA | | | Security |
| ESTO-S01-CR-0416 | 1.9 MFA | Guest | Cross-Role | All | -- | MFA bypass attempt by privileged role | Bypass rejected; policy enforced | | | Security |
| ESTO-S01-CR-0417 | 1.9 MFA | Admin | Cross-Role | All | Admin + Manager | Admin MFA session, Manager MFA session | Both independent; no cross-contamination | | | |
| ESTO-S01-CR-0418 | 1.9 MFA | User | Cross-Role | All | User logged in | Enable MFA, verify immediate enforcement | Next login requires MFA | | | |
| ESTO-S01-CR-0419 | 1.9 MFA | Guest | Cross-Role | All | -- | Disable MFA, verify policy allows | MFA disabled per user choice | | | |
| ESTO-S01-CR-0420 | 1.9 MFA | Manager | Cross-Role | All | Manager with MFA | Manager login with MFA | Authenticated; manager dashboard loads | | | |

### 1.10 Auth Resilience (30)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S01-HP-0421 | 1.10 Resilience | Guest | Happy | All | Valid account | Full auth flow: register -> login -> use -> logout | All steps complete without errors | | | |
| ESTO-S01-HP-0422 | 1.10 Resilience | User | Happy | All | Valid account | Login, perform CRUD operations, logout | All operations succeed; session cleaned | | | |
| ESTO-S01-HP-0423 | 1.10 Resilience | Guest | Happy | All | Valid account | Login, navigate all protected routes | All routes accessible per role | | | |
| ESTO-S01-HP-0424 | 1.10 Resilience | Guest | Happy | All | Valid account | Auth flow with slow network (3G) | All steps complete; loading states visible | | | |
| ESTO-S01-HP-0425 | 1.10 Resilience | Guest | Happy | All | Valid account | Auth with browser in French locale | UI displays in English (default); auth works | | | |
| ESTO-S01-EM-0426 | 1.10 Resilience | Guest | Empty | All | -- | Clear all auth storage mid-session | App detects; redirects to /login | | | |
| ESTO-S01-EM-0427 | 1.10 Resilience | User | Empty | All | -- | Clear cookies only (localStorage intact) | App handles mixed state gracefully | | | |
| ESTO-S01-EM-0428 | 1.10 Resilience | Guest | Empty | All | -- | Clear localStorage only (cookies intact) | App handles mixed state gracefully | | | |
| ESTO-S01-EM-0429 | 1.10 Resilience | Guest | Empty | All | -- | Disable JavaScript, attempt login | No JS: form may not work; graceful degradation | | | |
| ESTO-S01-EM-0430 | 1.10 Resilience | User | Empty | All | -- | Disable cookies, attempt session-based auth | Session fails; appropriate error | | | |
| ESTO-S01-ER-0431 | 1.10 Resilience | Guest | Error | All | Valid account | Backend returns 503 during login | Error toast; retry after backoff | | | |
| ESTO-S01-ER-0432 | 1.10 Resilience | Guest | Error | All | Valid account | Backend returns 504 Gateway Timeout | Error toast; retry option | | | |
| ESTO-S01-ER-0433 | 1.10 Resilience | User | Error | All | Valid session | Auth service partially degraded | Critical flows work; non-critical degraded | | | |
| ESTO-S01-ER-0434 | 1.10 Resilience | Guest | Error | All | Valid account | DNS resolution failure for API | Error: Cannot reach server | | | |
| ESTO-S01-ER-0435 | 1.10 Resilience | Guest | Error | All | Valid account | TLS certificate error on API | Browser blocks request; error shown | | | |
| ESTO-S01-ER-0436 | 1.10 Resilience | User | Error | All | Valid session | Clock skew > 5 minutes | Token validation fails; redirect to login | | | |
| ESTO-S01-ER-0437 | 1.10 Resilience | Guest | Error | All | Valid account | API returns CORS error | Handled gracefully; error toast | | | |
| ESTO-S01-ER-0438 | 1.10 Resilience | User | Error | All | Valid session | Memory pressure on client | No crash; graceful degradation | | | |
| ESTO-S01-ER-0439 | 1.10 Resilience | Guest | Error | All | Valid account | Mixed content (HTTP API on HTTPS page) | Browser blocks; error logged | | | Security |
| ESTO-S01-ER-0440 | 1.10 Resilience | User | Error | All | Valid session | localStorage quota exceeded | Error handled; auth state preserved | | | |
| ESTO-S01-ED-0441 | 1.10 Resilience | Guest | Edge | All | Valid account | Login immediately after account creation | Login works; no delay needed | | | |
| ESTO-S01-ED-0442 | 1.10 Resilience | User | Edge | All | Valid session | Session persists across tab close/reopen | Session maintained per Remember me setting | | | |
| ESTO-S01-ED-0443 | 1.10 Resilience | Guest | Edge | All | Valid account | Login with multiple network switches | Session maintained across network changes | | | |
| ESTO-S01-ED-0444 | 1.10 Resilience | User | Edge | All | Valid session | Rapid tab open/close while logged in | No crashes; auth state consistent | | | |
| ESTO-S01-ED-0445 | 1.10 Resilience | Guest | Edge | All | Valid account | Login on browser with strict privacy settings | Auth works; third-party cookies blocked | | | |
| ESTO-S01-ED-0446 | 1.10 Resilience | User | Edge | All | Valid session | Session across timezone change | Token expiry based on absolute time | | | |
| ESTO-S01-ED-0447 | 1.10 Resilience | Guest | Edge | All | Valid account | Login while VPN active | Auth works through VPN tunnel | | | |
| ESTO-S01-ED-0448 | 1.10 Resilience | User | Edge | All | Valid session | Session while device sleeps/wakes | Session maintained or gracefully expired | | | |
| ESTO-S01-ED-0449 | 1.10 Resilience | Guest | Edge | All | Valid account | Login with ad blocker enabled | Auth API calls not blocked | | | |
| ESTO-S01-ED-0450 | 1.10 Resilience | Guest | Edge | All | Valid account | Login with strict CSP headers enabled | Auth works under CSP restrictions | | | Security |

---

## Section 2: Property Discovery & Search (500)

### 2.1 Search & Filter (200)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S02-HP-0451 | 2.1 Search | Guest | Happy | All | Properties available | Navigate to search, enter keyword | Relevant properties displayed | | | |
| ESTO-S02-HP-0452 | 2.1 Search | User | Happy | All | Properties available | Filter by property type | Results match selected type | | | |
| ESTO-S02-HP-0453 | 2.1 Search | Guest | Happy | All | Properties available | Filter by location/city | Properties in that city shown | | | |
| ESTO-S02-HP-0454 | 2.1 Search | User | Happy | All | Properties available | Apply price range filter | Results within price range | | | |
| ESTO-S02-HP-0455 | 2.1 Search | Guest | Happy | All | Properties available | Apply bedroom count filter | Results match bedroom criteria | | | |
| ESTO-S02-HP-0456 | 2.1 Search | User | Happy | All | Properties available | Apply multiple filters simultaneously | Results match all criteria | | | |
| ESTO-S02-HP-0457 | 2.1 Search | Guest | Happy | All | Properties available | Sort by price (low to high) | Results ordered ascending | | | |
| ESTO-S02-HP-0458 | 2.1 Search | User | Happy | All | Properties available | Sort by newest first | Newest properties first | | | |
| ESTO-S02-HP-0459 | 2.1 Search | Guest | Happy | All | Properties available | Search with pagination | Pagination works correctly | | | |
| ESTO-S02-HP-0460 | 2.1 Search | User | Happy | All | Properties available | Click search result card | Navigated to property detail | | | |
| ESTO-S02-HP-0461 | 2.1 Search | Guest | Happy | All | Properties available | Search with autocomplete | Suggestions appear; selection works | | | |
| ESTO-S02-HP-0462 | 2.1 Search | User | Happy | All | Properties available | Clear search filters | All properties displayed | | | |
| ESTO-S02-HP-0463 | 2.1 Search | Guest | Happy | All | Properties available | Save search filter combination | Filters saved successfully | | | |
| ESTO-S02-HP-0464 | 2.1 Search | User | Happy | All | Has saved filters | Apply saved filter | Filter applied; results update | | | |
| ESTO-S02-HP-0465 | 2.1 Search | Guest | Happy | All | Properties available | Filter by availability date | Only available properties shown | | | |
| ESTO-S02-HP-0466 | 2.1 Search | User | Happy | All | Properties available | Filter by furnished status | Results match furnishing status | | | |
| ESTO-S02-HP-0467 | 2.1 Search | Guest | Happy | All | Properties available | Filter by property status | Results match status (rent/sale) | | | |
| ESTO-S02-HP-0468 | 2.1 Search | User | Happy | All | Properties available | Combine 3+ filters | All combined filters applied | | | |
| ESTO-S02-HP-0469 | 2.1 Search | Guest | Happy | All | Properties available | Search with special chars | Handled correctly | | | |
| ESTO-S02-HP-0470 | 2.1 Search | User | Happy | All | Properties available | Search with international chars | Results include unicode matches | | | |
| ESTO-S02-EM-0471 | 2.1 Search | Guest | Empty | All | -- | Submit empty search | Validation or all results shown | | | |
| ESTO-S02-EM-0472 | 2.1 Search | User | Empty | All | -- | Clear all filters | All properties displayed | | | |
| ESTO-S02-EM-0473 | 2.1 Search | Guest | Empty | All | -- | Filter with no matching results | "No results found" message | | | |
| ESTO-S02-EM-0474 | 2.1 Search | User | Empty | All | No properties in DB | Navigate to search page | Empty state displayed | | | |
| ESTO-S02-EM-0475 | 2.1 Search | Guest | Empty | All | -- | Search with whitespace only | Validation error or no results | | | |
| ESTO-S02-ER-0476 | 2.1 Search | Guest | Error | All | Search service down | Attempt search | Error toast; fallback/cached data | | | |
| ESTO-S02-ER-0477 | 2.1 Search | User | Error | All | Network offline | Attempt search | Network error message | | | |
| ESTO-S02-ER-0478 | 2.1 Search | Guest | Error | All | Mock backend | Mock 500 on search | Error toast; form usable | | | |
| ESTO-S02-ER-0479 | 2.1 Search | User | Error | All | Mock backend | Mock slow response (>10s) | Loading state; no crash | | | |
| ESTO-S02-ER-0480 | 2.1 Search | Guest | Error | All | -- | Enter XSS in search field | Input escaped; no XSS | | | Security |
| ESTO-S02-ER-0481 | 2.1 Search | User | Error | All | -- | Enter SQL injection in search | No SQL injection; error shown | | | Security |
| ESTO-S02-ER-0482 | 2.1 Search | Guest | Error | All | -- | Enter script tag in search | Input escaped | | | Security |
| ESTO-S02-ER-0483 | 2.1 Search | User | Error | All | Mock backend | Mock 401 on search | Error toast; previous results retained | | | |
| ESTO-S02-ER-0484 | 2.1 Search | Guest | Error | All | Mock backend | Mock malformed JSON response | Error toast; no unhandled exception | | | |
| ESTO-S02-ER-0485 | 2.1 Search | User | Error | All | Rate limited | Rapid search requests | Rate limit message displayed | | | |
| ESTO-S02-ER-0486 | 2.1 Search | Guest | Error | All | -- | Search with 1000-char query | Handled gracefully | | | |
| ESTO-S02-ER-0487 | 2.1 Search | User | Error | All | -- | Enter HTML entities in search | Entities escaped; no injection | | | Security |
| ESTO-S02-ER-0488 | 2.1 Search | Guest | Error | All | -- | Enter null bytes in search | Validation error or trimmed | | | |
| ESTO-S02-ER-0489 | 2.1 Search | User | Error | All | -- | Search during CORS misconfiguration | Error handled gracefully | | | |
| ESTO-S02-ER-0500 | 2.1 Search | Guest | Error | All | -- | Search with mixed content URL | Browser blocks; error logged | | | Security |
| ESTO-S02-ED-0501 | 2.1 Search | Guest | Edge | All | Properties available | Enter 500-char search query | Handled gracefully | | | |
| ESTO-S02-ED-0502 | 2.1 Search | User | Edge | All | Properties available | Search with special characters | Handled correctly | | | |
| ESTO-S02-ED-0503 | 2.1 Search | Guest | Edge | All | Properties available | Search with emoji characters | Handled or validation message | | | |
| ESTO-S02-ED-0504 | 2.1 Search | User | Edge | All | Properties available | Rapid filter changes (10 in 5s) | Debounced; final state applied | | | |
| ESTO-S02-ED-0505 | 2.1 Search | Guest | Edge | All | Properties available | Search with international characters | Results include unicode matches | | | |
| ESTO-S02-ED-0506 | 2.1 Search | User | Edge | All | Properties available | Filter by non-existent amenity | No results or all results shown | | | |
| ESTO-S02-ED-0507 | 2.1 Search | Guest | Edge | All | Properties available | Search with leading/trailing spaces | Query trimmed before processing | | | |
| ESTO-S02-ED-0508 | 2.1 Search | User | Edge | All | Properties available | Search with mixed case | Case-insensitive matching works | | | |
| ESTO-S02-ED-0509 | 2.1 Search | Guest | Edge | All | Properties available | Tab through search fields | Keyboard navigation works | | | A11y |
| ESTO-S02-ED-0510 | 2.1 Search | User | Edge | All | Screen reader available | Navigate search with screen reader | All fields have proper labels | | | A11y |
| ESTO-S02-CR-0511 | 2.1 Search | User | Cross-Role | All | -- | User saves search, Manager cannot access | Manager sees own searches only | | | Security |
| ESTO-S02-CR-0512 | 2.1 Search | Guest | Cross-Role | All | -- | Admin sees all search results | Admin sees unfiltered/unscoped results | | | |
| ESTO-S02-CR-0513 | 2.1 Search | User | Cross-Role | All | -- | Two users search simultaneously | Results independent per session | | | |
| ESTO-S02-CR-0514 | 2.1 Search | Guest | Cross-Role | All | -- | Manager searches own properties only | Manager results scoped correctly | | | |
| ESTO-S02-CR-0515 | 2.1 Search | User | Cross-Role | All | -- | User search, Admin views broader results | Admin sees broader scope | | | |

### 2.2 Property Listing & Browsing (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S02-HP-0516 | 2.2 Listing | Guest | Happy | All | Properties listed | Browse property listing page | Properties with image, price, location shown | | | |
| ESTO-S02-HP-0517 | 2.2 Listing | User | Happy | All | Properties listed | Scroll through property grid | Infinite scroll or pagination works | | | |
| ESTO-S02-HP-0518 | 2.2 Listing | Guest | Happy | All | Properties listed | Hover over property card | Hover effect with quick info | | | |
| ESTO-S02-HP-0519 | 2.2 Listing | User | Happy | All | Properties listed | Click property card | Navigated to detail page | | | |
| ESTO-S02-HP-0520 | 2.2 Listing | Guest | Happy | All | Properties listed | View on mobile viewport | Grid adapts to single column | | | Mobile |
| ESTO-S02-HP-0521 | 2.2 Listing | User | Happy | All | Properties listed | View on tablet viewport | Grid adapts to 2 columns | | | Mobile |
| ESTO-S02-HP-0522 | 2.2 Listing | Guest | Happy | All | Properties listed | View on desktop viewport | Grid shows 3+ columns | | | Mobile |
| ESTO-S02-HP-0523 | 2.2 Listing | User | Happy | All | Properties listed | Property images lazy load | Images load on scroll into view | | | |
| ESTO-S02-HP-0524 | 2.2 Listing | Guest | Happy | All | Properties listed | Bookmark property from listing | Property saved; icon updates | | | |
| ESTO-S02-HP-0525 | 2.2 Listing | User | Happy | All | Properties listed | Compare two properties | Both selected for comparison | | | |
| ESTO-S02-HP-0526 | 2.2 Listing | Guest | Happy | All | Properties listed | Filter by verified only | Only verified properties shown | | | |
| ESTO-S02-HP-0527 | 2.2 Listing | User | Happy | All | Properties listed | Share property link | Share dialog opens | | | |
| ESTO-S02-HP-0528 | 2.2 Listing | Guest | Happy | All | Properties listed | View property with video | Video loads and plays | | | |
| ESTO-S02-HP-0529 | 2.2 Listing | User | Happy | All | Properties listed | Filter by amenities | Results match selected amenities | | | |
| ESTO-S02-HP-0530 | 2.2 Listing | Guest | Happy | All | Properties listed | Filter by pet-friendly | Results match pet policy | | | |
| ESTO-S02-HP-0531 | 2.2 Listing | User | Happy | All | Properties listed | Filter by parking available | Results match parking criteria | | | |
| ESTO-S02-HP-0532 | 2.2 Listing | Guest | Happy | All | Properties listed | Toggle list/map view | View switches smoothly | | | |
| ESTO-S02-HP-0533 | 2.2 Listing | User | Happy | All | Properties listed | Sort by square footage | Results ordered by size | | | |
| ESTO-S02-HP-0534 | 2.2 Listing | Guest | Happy | All | Properties listed | Sort by rating | Results ordered by rating | | | |
| ESTO-S02-HP-0535 | 2.2 Listing | User | Happy | All | Properties listed | Sort by date listed | Newest listed first | | | |
| ESTO-S02-HP-0536 | 2.2 Listing | Guest | Happy | All | Properties listed | Use breadcrumb navigation | Breadcrumb updates correctly | | | |
| ESTO-S02-HP-0537 | 2.2 Listing | User | Happy | All | Properties listed | Apply keyword highlight | Matching text highlighted in results | | | |
| ESTO-S02-HP-0538 | 2.2 Listing | Guest | Happy | All | Properties listed | View property agent info | Agent details displayed on card | | | |
| ESTO-S02-HP-0539 | 2.2 Listing | User | Happy | All | Properties listed | Quick view property (modal) | Modal opens with property summary | | | |
| ESTO-S02-HP-0540 | 2.2 Listing | Guest | Happy | All | Properties listed | Scroll to bottom, load more | More properties load or pagination shown | | | |
| ESTO-S02-HP-0541 | 2.2 Listing | User | Happy | All | Properties listed | List view on mobile | List layout adapts to mobile | | | Mobile |
| ESTO-S02-HP-0542 | 2.2 Listing | Guest | Happy | All | Properties listed | Grid view on desktop | Grid layout with proper columns | | | |
| ESTO-S02-HP-0543 | 2.2 Listing | User | Happy | All | Properties listed | Properties with virtual tour | Virtual tour badge/button shown | | | |
| ESTO-S02-HP-0544 | 2.2 Listing | Guest | Happy | All | Properties listed | Properties with floor plan | Floor plan icon/link shown | | | |
| ESTO-S02-HP-0545 | 2.2 Listing | User | Happy | All | Properties listed | "New" badge on recently listed | New properties have visual badge | | | |
| ESTO-S02-EM-0546 | 2.2 Listing | Guest | Empty | All | No properties | Navigate to listing | Empty state with "no properties" message | | | |
| ESTO-S02-EM-0547 | 2.2 Listing | User | Empty | All | Filter returns no results | Apply strict filter | "No results found" with suggestion | | | |
| ESTO-S02-EM-0548 | 2.2 Listing | Guest | Empty | All | Search service error | Navigate to listing | Error state displayed | | | |
| ESTO-S02-EM-0549 | 2.2 Listing | User | Empty | All | All properties archived | Check listing | Empty state displayed | | | |
| ESTO-S02-EM-0550 | 2.2 Listing | Guest | Empty | All | -- | Filter by impossible criteria | "No results found" message | | | |
| ESTO-S02-ER-0551 | 2.2 Listing | Guest | Error | All | Image CDN down | Load property listing | Placeholder images shown; layout intact | | | Ticket:#305 |
| ESTO-S02-ER-0552 | 2.2 Listing | User | Error | All | Search service timeout | Load listing | Error toast; cached results shown | | | |
| ESTO-S02-ER-0553 | 2.2 Listing | Guest | Error | All | Network offline | Load listing | Cached listing shown or error | | | |
| ESTO-S02-ER-0554 | 2.2 Listing | User | Error | All | Mock backend | Mock 500 on listing API | Error toast; no crash | | | |
| ESTO-S02-ER-0555 | 2.2 Listing | Guest | Error | All | Mock backend | Mock incomplete property data | Partial display; graceful degradation | | | |
| ESTO-S02-ER-0556 | 2.2 Listing | User | Error | All | -- | Property with missing image URL | Placeholder shown; layout intact | | | Ticket:#305 |
| ESTO-S02-ER-0557 | 2.2 Listing | Guest | Error | All | -- | Property with corrupted image | Fallback image shown | | | Ticket:#305 |
| ESTO-S02-ER-0558 | 2.2 Listing | User | Error | All | -- | Property with relative image path | URL resolved or placeholder | | | Ticket:#305 |
| ESTO-S02-ER-0559 | 2.2 Listing | Guest | Error | All | -- | Property listing with special chars in title | Title escaped and displayed | | | |
| ESTO-S02-ER-0560 | 2.2 Listing | User | Error | All | -- | Property with XSS in description | Description escaped; no XSS | | | Security |
| ESTO-S02-ER-0561 | 2.2 Listing | Guest | Error | All | -- | Rapid page reload while loading | No crash; loading handled | | | |
| ESTO-S02-ER-0562 | 2.2 Listing | User | Error | All | -- | Memory pressure with many listings | Virtual scrolling or graceful degradation | | | |
| ESTO-S02-ER-0563 | 2.2 Listing | Guest | Error | All | -- | Concurrent listing loads | No race condition; last load wins | | | |
| ESTO-S02-ER-0564 | 2.2 Listing | User | Error | All | -- | Filter change during active load | Previous load cancelled; new applied | | | |
| ESTO-S02-ER-0565 | 2.2 Listing | Guest | Error | All | -- | Large number of properties (5000+) | Virtualization or pagination handles it | | | |
| ESTO-S02-ED-0566 | 2.2 Listing | User | Edge | All | 200+ properties | Scroll through all with lazy loading | Images load progressively | | | |
| ESTO-S02-ED-0567 | 2.2 Listing | Guest | Edge | All | Property with 100-char title | View property card | Title truncated gracefully | | | |
| ESTO-S02-ED-0568 | 2.2 Listing | User | Edge | All | Property with very long description | View in listing | Description truncated with "read more" | | | |
| ESTO-S02-ED-0569 | 2.2 Listing | Guest | Edge | All | Property with no description | View in listing | "No description" or empty handled | | | |
| ESTO-S02-ED-0570 | 2.2 Listing | User | Edge | All | Property with no images | View in listing | Default placeholder image shown | | | Ticket:#305 |
| ESTO-S02-ED-0571 | 2.2 Listing | Guest | Edge | All | Property at price boundary | Filter at exact price | Boundary property included | | | |
| ESTO-S02-ED-0572 | 2.2 Listing | User | Edge | All | Rapid filter changes | 10 changes in 5 seconds | Debounced; final state applied | | | |
| ESTO-S02-ED-0573 | 2.2 Listing | Guest | Edge | All | Property with Unicode name | Display in listing | Unicode rendered correctly | | | |
| ESTO-S02-ED-0574 | 2.2 Listing | User | Edge | All | Property with emoji in title | Display in listing | Emoji rendered or escaped | | | |
| ESTO-S02-ED-0575 | 2.2 Listing | Guest | Edge | All | Property with 0 price | Display in listing | Shows "Contact for price" or 0 | | | |
| ESTO-S02-ED-0576 | 2.2 Listing | User | Edge | All | Property with negative price | Display in listing | Validation prevents or shows error | | | |
| ESTO-S02-ED-0577 | 2.2 Listing | Guest | Edge | All | Property with very long address | View in listing | Address truncated with tooltip | | | |
| ESTO-S02-ED-0578 | 2.2 Listing | User | Edge | All | Property with 50+ images | View gallery in listing | Lazy loading; performance maintained | | | |
| ESTO-S02-ED-0579 | 2.2 Listing | Guest | Edge | All | Accessibility: keyboard browse | Navigate listing with keyboard | All cards focusable and activatable | | | A11y |
| ESTO-S02-ED-0580 | 2.2 Listing | User | Edge | All | Accessibility: screen reader | Navigate listing with screen reader | Cards announced with property info | | | A11y |
| ESTO-S02-ED-0581 | 2.2 Listing | Guest | Edge | All | Dark mode available | View listing in dark mode | All elements visible; contrast OK | | | |
| ESTO-S02-ED-0582 | 2.2 Listing | User | Edge | All | RTL language setting | View listing in RTL | Layout mirrors correctly | | | |
| ESTO-S02-ED-0583 | 2.2 Listing | Guest | Edge | All | Very small viewport (320px) | View listing on small phone | All content accessible; no horizontal scroll | | | Mobile |
| ESTO-S02-ED-0584 | 2.2 Listing | User | Edge | All | Very large viewport (2560px) | View listing on large monitor | Layout uses space effectively | | | |
| ESTO-S02-ED-0585 | 2.2 Listing | Guest | Edge | All | High contrast mode | View listing with OS high contrast | All content visible; contrast ratios OK | | | A11y |
| ESTO-S02-CR-0586 | 2.2 Listing | User | Cross-Role | All | -- | User and Admin view listing simultaneously | Same base; admin has extra actions | | | |
| ESTO-S02-CR-0587 | 2.2 Listing | Manager | Cross-Role | All | -- | Manager sees own vs others' properties | Own highlighted or separated | | | |
| ESTO-S02-CR-0588 | 2.2 Listing | Guest | Cross-Role | All | -- | User bookmarks, Admin sees counts | Admin sees aggregate bookmark data | | | |
| ESTO-S02-CR-0589 | 2.2 Listing | User | Cross-Role | All | -- | User filters, Manager filters independently | Independent filter states | | | |
| ESTO-S02-CR-0590 | 2.2 Listing | Guest | Cross-Role | All | -- | Guest views, User logs in | Listing updates with user-specific data | | | |
| ESTO-S02-CR-0591 | 2.2 Listing | User | Cross-Role | All | -- | Admin can edit from listing view | Edit button visible for admin | | | |
| ESTO-S02-CR-0592 | 2.2 Listing | Manager | Cross-Role | All | -- | Manager sees unpublished properties | Manager sees draft/unpublished | | | |
| ESTO-S02-CR-0593 | 2.2 Listing | User | Cross-Role | All | -- | User saves property from listing | Saved in user's favorites | | | |
| ESTO-S02-CR-0594 | 2.2 Listing | Guest | Cross-Role | All | -- | Admin deletes property, User sees it removed | Property removed from listing | | | |
| ESTO-S02-CR-0595 | 2.2 Listing | User | Cross-Role | All | -- | Two users viewing same listing | Independent scroll/filter states | | | |

### 2.3 Map & Location Search (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S02-HP-0596 | 2.3 Map | Guest | Happy | All | Properties with locations | Open map view | Map loads with property markers | | | |
| ESTO-S02-HP-0597 | 2.3 Map | User | Happy | All | Map available | Click map marker | Property popup shown | | | |
| ESTO-S02-HP-0598 | 2.3 Map | Guest | Happy | All | Map available | Pan and zoom map | Map responds smoothly | | | |
| ESTO-S02-HP-0599 | 2.3 Map | User | Happy | All | Map available | Search location, map pans | Map centers on searched area | | | |
| ESTO-S02-HP-0600 | 2.3 Map | Guest | Happy | All | Map available | Apply filter, map updates | Markers update to match filter | | | |
| ESTO-S02-HP-0601 | 2.3 Map | User | Happy | All | Map available | Switch between list/map view | Smooth transition between views | | | |
| ESTO-S02-HP-0602 | 2.3 Map | Guest | Happy | All | Map available | Click property in list, map highlights | Map pans; marker highlighted | | | |
| ESTO-S02-HP-0603 | 2.3 Map | User | Happy | All | Map available | Click marker, view property details | Property detail shown in popup | | | |
| ESTO-S02-HP-0604 | 2.3 Map | Guest | Happy | All | Map available | Use map search bar | Map zooms to searched location | | | |
| ESTO-S02-HP-0605 | 2.3 Map | User | Happy | All | Map available | Draw search radius on map | Only properties within radius shown | | | |
| ESTO-S02-HP-0606 | 2.3 Map | Guest | Happy | All | Map available | Toggle satellite/street view | Map style changes | | | |
| ESTO-S02-HP-0607 | 2.3 Map | User | Happy | All | Map available | Click "my location" button | Map centers on user's location | | | |
| ESTO-S02-HP-0608 | 2.3 Map | Guest | Happy | All | Map available | View property clusters | Clusters expand on click | | | |
| ESTO-S02-HP-0609 | 2.3 Map | User | Happy | All | Map available | Cluster click shows count | Count displayed; zoom on click | | | |
| ESTO-S02-HP-0610 | 2.3 Map | Guest | Happy | All | Map available | Fullscreen map view | Map expands to fullscreen | | | |
| ESTO-S02-HP-0611 | 2.3 Map | User | Happy | All | Map available | Share map view URL | URL contains map position/filters | | | |
| ESTO-S02-EM-0612 | 2.3 Map | Guest | Empty | All | No geo data | Open map view | Map loads without markers | | | |
| ESTO-S02-EM-0613 | 2.3 Map | User | Empty | All | -- | Search for unknown location | Map shows default or "not found" | | | |
| ESTO-S02-EM-0614 | 2.3 Map | Guest | Empty | All | -- | View map with no properties | Empty map or "no properties nearby" | | | |
| ESTO-S02-ER-0615 | 2.3 Map | Guest | Error | All | Map tiles down | Load map view | Fallback tiles or error message | | | |
| ESTO-S02-ER-0616 | 2.3 Map | User | Error | All | Network offline | Interact with map | Cached map or error state | | | |
| ESTO-S02-ER-0617 | 2.3 Map | Guest | Error | All | Invalid geo coordinates | Load property with bad coords | Default location or error shown | | | |
| ESTO-S02-ER-0618 | 2.3 Map | User | Error | All | Map library fails | Attempt to open map | List view fallback or error | | | |
| ESTO-S02-ER-0619 | 2.3 Map | Guest | Error | All | -- | Map API quota exceeded | Error message; list view available | | | |
| ESTO-S02-ER-0620 | 2.3 Map | User | Error | All | -- | Map with malformed GeoJSON | Map fails gracefully | | | |
| ESTO-S02-ER-0621 | 2.3 Map | Guest | Error | All | Mock backend | Mock 500 on geocoding | Error toast; manual input works | | | |
| ESTO-S02-ER-0622 | 2.3 Map | User | Error | All | Mock backend | Mock slow map tiles | Skeleton/loading; tiles appear | | | |
| ESTO-S02-ER-0623 | 2.3 Map | Guest | Error | All | Geolocation denied | Click "my location" | Error: Location access denied | | | |
| ESTO-S02-ER-0624 | 2.3 Map | User | Error | All | Geolocation unavailable | Click "my location" on device without GPS | Error: Location unavailable | | | |
| ESTO-S02-ED-0625 | 2.3 Map | Guest | Edge | All | 100+ markers | Zoom to show all | Clustering handles performance | | | |
| ESTO-S02-ED-0626 | 2.3 Map | User | Edge | All | Properties at extreme coords | View polar/equator properties | Map handles extreme lat/lng | | | |
| ESTO-S02-ED-0627 | 2.3 Map | Guest | Edge | All | Map on mobile | Use map on mobile device | Touch gestures work; responsive | | | Mobile |
| ESTO-S02-ED-0628 | 2.3 Map | User | Edge | All | Very large search radius | Search with 500km radius | Results limited/clustered | | | |
| ESTO-S02-ED-0629 | 2.3 Map | Guest | Edge | All | Rapid map interactions | Pan/zoom rapidly | No lag; animations smooth | | | |
| ESTO-S02-ED-0630 | 2.3 Map | User | Edge | All | Accessibility: keyboard | Navigate map with keyboard | Keyboard navigation works | | | A11y |
| ESTO-S02-ED-0631 | 2.3 Map | Guest | Edge | All | Screen reader | Navigate map with screen reader | Map content announced accessibly | | | A11y |
| ESTO-S02-ED-0632 | 2.3 Map | User | Edge | All | Map on slow network | Map loads on 3G | Tiles load progressively | | | |
| ESTO-S02-ED-0633 | 2.3 Map | Guest | Edge | All | Map with many overlays | Multiple filter overlays active | All overlays rendered correctly | | | |
| ESTO-S02-ED-0634 | 2.3 Map | User | Edge | All | Map in fullscreen on mobile | Fullscreen map on phone | Fullscreen works; close button visible | | | Mobile |
| ESTO-S02-ED-0635 | 2.3 Map | Guest | Edge | All | Map with custom marker icons | Custom property type icons shown | Icons display correctly | | | |
| ESTO-S02-CR-0636 | 2.3 Map | Manager | Cross-Role | All | Manager has properties | Manager views map of own properties | Only manager's properties highlighted | | | |
| ESTO-S02-CR-0637 | 2.3 Map | User | Cross-Role | All | -- | Admin and User view map simultaneously | Independent map states | | | |
| ESTO-S02-CR-0638 | 2.3 Map | Guest | Cross-Role | All | -- | Admin sees all; User sees available | Scoped results per role | | | |
| ESTO-S02-CR-0639 | 2.3 Map | User | Cross-Role | All | -- | User searches, Admin has different filter | Each filter applies independently | | | |
| ESTO-S02-CR-0640 | 2.3 Map | Guest | Cross-Role | All | -- | Two users viewing map | Independent pan/zoom states | | | |
| ESTO-S02-CR-0641 | 2.3 Map | User | Cross-Role | All | -- | Manager filters on map, User filters | Independent filter states | | | |
| ESTO-S02-CR-0642 | 2.3 Map | Guest | Cross-Role | All | -- | Admin draws radius, sees all properties | Admin radius includes all matching | | | |
| ESTO-S02-CR-0643 | 2.3 Map | User | Cross-Role | All | -- | User saves map view | Map view saved in user preferences | | | |
| ESTO-S02-CR-0644 | 2.3 Map | Manager | Cross-Role | All | -- | Manager map shows only own properties | Manager's map scoped correctly | | | |
| ESTO-S02-CR-0645 | 2.3 Map | Guest | Cross-Role | All | -- | Admin map shows pending/flagged | Admin sees unapproved properties on map | | | |

### 2.4 Saved Searches & Alerts (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S02-HP-0646 | 2.4 SavedSearch | User | Happy | All | Logged in with search | Save current search | Search saved successfully | | | |
| ESTO-S02-HP-0647 | 2.4 SavedSearch | User | Happy | All | Has saved searches | View saved searches list | All saved searches listed | | | |
| ESTO-S02-HP-0648 | 2.4 SavedSearch | User | Happy | All | Has saved search | Apply saved search | Filters applied; results updated | | | |
| ESTO-S02-HP-0649 | 2.4 SavedSearch | User | Happy | All | Has saved search | Delete saved search | Search removed from list | | | |
| ESTO-S02-HP-0650 | 2.4 SavedSearch | User | Happy | All | Has saved search | Rename saved search | Name updated successfully | | | |
| ESTO-S02-HP-0651 | 2.4 SavedSearch | User | Happy | All | Has saved search | Enable email alerts | Alert preference saved | | | |
| ESTO-S02-HP-0652 | 2.4 SavedSearch | User | Happy | All | Has search with alerts | Receive new property notification | Notification delivered on new match | | | |
| ESTO-S02-HP-0653 | 2.4 SavedSearch | User | Happy | All | Has saved search | Share saved search link | Share link generated and works | | | |
| ESTO-S02-HP-0654 | 2.4 SavedSearch | User | Happy | All | Has saved search | Edit saved search criteria | Criteria updated; alerts reconfigured | | | |
| ESTO-S02-EM-0655 | 2.4 SavedSearch | User | Empty | All | No saved searches | View saved searches | Empty state message displayed | | | |
| ESTO-S02-EM-0656 | 2.4 SavedSearch | Guest | Empty | All | Not logged in | Attempt to save search | Redirected to /login | | | |
| ESTO-S02-EM-0657 | 2.4 SavedSearch | User | Empty | All | -- | Access saved searches while logged out | Redirected to /login | | | |
| ESTO-S02-ER-0658 | 2.4 SavedSearch | User | Error | All | -- | Save search with invalid criteria | Validation error shown | | | |
| ESTO-S02-ER-0659 | 2.4 SavedSearch | User | Error | All | Backend down | Attempt to save search | Error toast; retry option | | | |
| ESTO-S02-ER-0660 | 2.4 SavedSearch | Guest | Error | All | -- | Access saved searches while logged out | Redirected to /login | | | |
| ESTO-S02-ER-0661 | 2.4 SavedSearch | User | Error | All | -- | Save duplicate search name | Error or auto-rename | | | |
| ESTO-S02-ER-0662 | 2.4 SavedSearch | Guest | Error | All | -- | Save 100 searches (limit reached) | Limit message displayed | | | |
| ESTO-S02-ER-0663 | 2.4 SavedSearch | User | Error | All | Network offline | Attempt to save search | Network error message | | | |
| ESTO-S02-ER-0664 | 2.4 SavedSearch | Guest | Error | All | Mock backend | Mock 500 on save | Error toast; form retains data | | | |
| ESTO-S02-ER-0665 | 2.4 SavedSearch | User | Error | All | -- | Delete search with no internet | Error message; retry option | | | |
| ESTO-S02-ED-0666 | 2.4 SavedSearch | User | Edge | All | -- | Save search with 255-char name | Truncated or error | | | |
| ESTO-S02-ED-0667 | 2.4 SavedSearch | Guest | Edge | All | -- | Save search with special chars | Name sanitized | | | |
| ESTO-S02-ED-0668 | 2.4 SavedSearch | User | Edge | All | -- | Rapid save/delete of searches | No crash; final state correct | | | |
| ESTO-S02-ED-0669 | 2.4 SavedSearch | Guest | Edge | All | -- | Save search during network flap | Retried or queued | | | |
| ESTO-S02-ED-0670 | 2.4 SavedSearch | User | Edge | All | -- | Search with 20 filter combos | All saved correctly | | | |
| ESTO-S02-ED-0671 | 2.4 SavedSearch | Guest | Edge | All | -- | Save search with unicode name | Saved and displayed correctly | | | |
| ESTO-S02-ED-0672 | 2.4 SavedSearch | User | Edge | All | -- | Apply search with complex filter set | All filters applied correctly | | | |
| ESTO-S02-ED-0673 | 2.4 SavedSearch | Guest | Edge | All | -- | Save 50 searches (near limit) | Works up to limit | | | |
| ESTO-S02-ED-0674 | 2.4 SavedSearch | User | Edge | All | -- | Search with date range filters | Date range saved and applied | | | |
| ESTO-S02-ED-0675 | 2.4 SavedSearch | Guest | Edge | All | -- | Search with location radius | Radius saved and applied | | | |
| ESTO-S02-CR-0676 | 2.4 SavedSearch | User | Cross-Role | All | -- | User A views User B saved searches | Cannot access; 403 or empty | | | Security |
| ESTO-S02-CR-0677 | 2.4 SavedSearch | Manager | Cross-Role | All | Manager has searches | Manager saves search | Saved in manager context | | | |
| ESTO-S02-CR-0678 | 2.4 SavedSearch | User | Cross-Role | All | -- | Admin can view aggregated saved searches | Admin sees anonymized data | | | |
| ESTO-S02-CR-0679 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | Two users save same criteria | Each saved independently | | | |
| ESTO-S02-CR-0680 | 2.4 SavedSearch | User | Cross-Role | All | -- | Alert for saved search delivered | User receives notification | | | |
| ESTO-S02-CR-0681 | 2.4 SavedSearch | Manager | Cross-Role | All | Manager has searches | Manager shares search with tenant | Shared search accessible to tenant | | | |
| ESTO-S02-CR-0682 | 2.4 SavedSearch | User | Cross-Role | All | -- | Admin deletes user's saved search | Admin action removes search | | | |
| ESTO-S02-CR-0683 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | User's saved search triggers for admin's property | Alert delivered correctly | | | |
| ESTO-S02-CR-0684 | 2.4 SavedSearch | User | Cross-Role | All | -- | Bulk delete saved searches | Multiple searches deleted | | | |
| ESTO-S02-CR-0685 | 2.4 SavedSearch | Manager | Cross-Role | All | -- | Manager exports saved searches | Export generated with search data | | | |
| ESTO-S02-CR-0686 | 2.4 SavedSearch | User | Cross-Role | All | -- | Saved search with notification on new property | Notification received when match found | | | |
| ESTO-S02-CR-0687 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | Two users, same search, different results | Each gets their own filtered results | | | |
| ESTO-S02-CR-0688 | 2.4 SavedSearch | User | Cross-Role | All | -- | User updates saved search, Admin sees change | Admin sees updated criteria | | | |
| ESTO-S02-CR-0689 | 2.4 SavedSearch | Manager | Cross-Role | All | -- | Manager saves search for all tenants | Search shared across tenant list | | | |
| ESTO-S02-CR-0690 | 2.4 SavedSearch | User | Cross-Role | All | -- | User deletes saved search, Admin unaffected | Admin's view independent | | | |
| ESTO-S02-CR-0691 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | Saved search includes unavailable property | Search auto-updates filter | | | |
| ESTO-S02-CR-0692 | 2.4 SavedSearch | User | Cross-Role | All | -- | Saved search with price change alert | Alert when matching property price changes | | | |
| ESTO-S02-CR-0693 | 2.4 SavedSearch | Manager | Cross-Role | All | -- | Manager creates saved search for new listing | Search immediately applies to new listing | | | |
| ESTO-S02-CR-0694 | 2.4 SavedSearch | User | Cross-Role | All | -- | Saved search with area change alert | Alert when property area changes | | | |
| ESTO-S02-CR-0695 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | User saves search in city A, User B in city B | Each user gets own city results | | | |
| ESTO-S02-CR-0696 | 2.4 SavedSearch | User | Cross-Role | All | -- | Admin monitors trending saved searches | Admin sees aggregated search analytics | | | |
| ESTO-S02-CR-0697 | 2.4 SavedSearch | Manager | Cross-Role | All | -- | Manager gets alert when saved search has result | Manager notified of matches | | | |
| ESTO-S02-CR-0698 | 2.4 SavedSearch | User | Cross-Role | All | -- | User copies another user's saved search (public) | Search copied to user's list | | | |
| ESTO-S02-CR-0699 | 2.4 SavedSearch | Guest | Cross-Role | All | -- | Saved search with photo change alert | Alert when property photos updated | | | |
| ESTO-S02-CR-0700 | 2.4 SavedSearch | User | Cross-Role | All | -- | User archives saved search | Archived; not deleted; restorable | | | |

---

## Section 3: Property Viewing (Schedule & Manage) (300)

### 3.1 Property Detail Page (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S03-HP-0701 | 3.1 Detail | Guest | Happy | All | Property exists | Navigate to /properties/{id} | Detail page loads with all info | | | |
| ESTO-S03-HP-0702 | 3.1 Detail | User | Happy | All | Property exists | View property images gallery | All images displayed; carousel works | | | Ticket:#305 |
| ESTO-S03-HP-0703 | 3.1 Detail | Guest | Happy | All | Property has virtual tour | Click virtual tour button | 360 tour loads and is navigable | | | |
| ESTO-S03-HP-0704 | 3.1 Detail | User | Happy | All | Property has floor plan | View floor plan | Floor plan image displayed | | | |
| ESTO-S03-HP-0705 | 3.1 Detail | Guest | Happy | All | Property has video | Play property video | Video plays; controls work | | | |
| ESTO-S03-HP-0706 | 3.1 Detail | User | Happy | All | Property has documents | View property documents | Document list displayed | | | |
| ESTO-S03-HP-0707 | 3.1 Detail | Guest | Happy | All | Property with broker | View broker/agent info | Broker details displayed | | | |
| ESTO-S03-HP-0708 | 3.1 Detail | User | Happy | All | Property available | View availability calendar | Calendar shows available dates | | | |
| ESTO-S03-HP-0709 | 3.1 Detail | Guest | Happy | All | Property with reviews | View property reviews | Reviews displayed with ratings | | | |
| ESTO-S03-HP-0710 | 3.1 Detail | User | Happy | All | Property with similar | View similar properties | Related properties shown | | | |
| ESTO-S03-HP-0711 | 3.1 Detail | Guest | Happy | All | Property with amenities | View amenities list | All amenities listed with icons | | | |
| ESTO-S03-HP-0712 | 3.1 Detail | User | Happy | All | Property with neighborhood info | View neighborhood section | Area info, schools, transport shown | | | |
| ESTO-S03-HP-0713 | 3.1 Detail | Guest | Happy | All | Property with price history | View price history | Price changes displayed | | | |
| ESTO-S03-HP-0714 | 3.1 Detail | User | Happy | All | Property with 3D model | View 3D model | 3D model loads and rotates | | | |
| ESTO-S03-HP-0715 | 3.1 Detail | Guest | Happy | All | Share property | Click share button | Share dialog opens with links | | | |
| ESTO-S03-HP-0716 | 3.1 Detail | User | Happy | All | Save property | Click save/bookmark | Property saved; icon updates | | | |
| ESTO-S03-HP-0717 | 3.1 Detail | Guest | Happy | All | Compare property | Click compare button | Added to comparison list | | | |
| ESTO-S03-HP-0718 | 3.1 Detail | User | Happy | All | Print property | Click print button | Print-friendly view opens | | | |
| ESTO-S03-HP-0719 | 3.1 Detail | Guest | Happy | All | Report property | Click report button | Report form opens | | | |
| ESTO-S03-HP-0720 | 3.1 Detail | User | Happy | All | Back navigation | Click back to results | Returns to previous search/listing | | | |
| ESTO-S03-EM-0721 | 3.1 Detail | Guest | Empty | All | -- | Navigate to non-existent property | 404 page or redirect | | | |
| ESTO-S03-EM-0722 | 3.1 Detail | User | Empty | All | -- | Navigate to deleted property | 404 or redirect to listing | | | |
| ESTO-S03-EM-0723 | 3.1 Detail | Guest | Empty | All | -- | Navigate to property with no images | Placeholder images shown | | | Ticket:#305 |
| ESTO-S03-EM-0724 | 3.1 Detail | User | Empty | All | -- | Navigate to property with no description | "No description" displayed | | | |
| ESTO-S03-ER-0725 | 3.1 Detail | Guest | Error | All | Core service down | Load property detail | Error toast; fallback content | | | |
| ESTO-S03-ER-0726 | 3.1 Detail | User | Error | All | Network offline | Load property detail | Cached data or error state | | | |
| ESTO-S03-ER-0727 | 3.1 Detail | Guest | Error | All | Mock backend | Mock 500 on property API | Error toast; no crash | | | |
| ESTO-S03-ER-0728 | 3.1 Detail | User | Error | All | -- | Image gallery with broken images | Placeholder shown; rest of page works | | | Ticket:#305 |
| ESTO-S03-ER-0729 | 3.1 Detail | Guest | Error | All | -- | Video fails to load | Error message; rest of page works | | | Ticket:#305 |
| ESTO-S03-ER-0730 | 3.1 Detail | User | Error | All | -- | Floor plan image missing | Placeholder shown | | | Ticket:#305 |
| ESTO-S03-ER-0731 | 3.1 Detail | Guest | Error | All | -- | Virtual tour service down | Error message; 2D images available | | | |
| ESTO-S03-ER-0732 | 3.1 Detail | User | Error | All | -- | Document download fails | Error toast; retry option | | | |
| ESTO-S03-ER-0733 | 3.1 Detail | Guest | Error | All | -- | Reviews service down | Reviews section shows error or hidden | | | |
| ESTO-S03-ER-0734 | 3.1 Detail | User | Error | All | -- | Similar properties API fails | Section hidden or shows error | | | |
| ESTO-S03-ER-0735 | 3.1 Detail | Guest | Error | All | Mock backend | Mock malformed property data | Error toast; no crash | | | |
| ESTO-S03-ED-0736 | 3.1 Detail | User | Edge | All | Property with 100 images | View image gallery | Lazy loading; smooth scrolling | | | |
| ESTO-S03-ED-0737 | 3.1 Detail | Guest | Edge | All | Property with very long description | View full description | Text expands; scrollable | | | |
| ESTO-S03-ED-0738 | 3.1 Detail | User | Edge | All | Property with 1000+ reviews | View all reviews | Paginated; performance OK | | | |
| ESTO-S03-ED-0739 | 3.1 Detail | Guest | Edge | All | Property with Unicode address | Address displayed correctly | Unicode rendered properly | | | |
| ESTO-S03-ED-0740 | 3.1 Detail | User | Edge | All | Gallery with mixed image sizes | View gallery | Images fit container correctly | | | |
| ESTO-S03-ED-0741 | 3.1 Detail | Guest | Edge | All | Property with no price | View detail page | "Price on request" or "Contact" shown | | | |
| ESTO-S03-ED-0742 | 3.1 Detail | User | Edge | All | Property with very long name | View in detail page | Title handled with truncation or wrap | | | |
| ESTO-S03-ED-0743 | 3.1 Detail | Guest | Edge | All | Accessibility: keyboard navigate | Navigate detail with keyboard | All sections reachable | | | A11y |
| ESTO-S03-ED-0744 | 3.1 Detail | User | Edge | All | Accessibility: screen reader | Navigate detail with screen reader | All content announced properly | | | A11y |
| ESTO-S03-ED-0745 | 3.1 Detail | Guest | Edge | All | Property with EMI calculator | View and use EMI calculator | Calculator works with correct values | | | |
| ESTO-S03-CR-0746 | 3.1 Detail | User | Cross-Role | All | -- | User views property; Admin sees management info | Admin sees edit/delete actions | | | |
| ESTO-S03-CR-0747 | 3.1 Detail | Manager | Cross-Role | All | Manager owns property | Manager views own property | Manager sees edit/analytics actions | | | |
| ESTO-S03-CR-0748 | 3.1 Detail | User | Cross-Role | All | -- | User saves property, Admin sees count | Admin sees save/bookmark count | | | |
| ESTO-S03-CR-0749 | 3.1 Detail | Guest | Cross-Role | All | -- | Admin views unapproved property | Admin sees preview with approve/reject | | | |
| ESTO-S03-CR-0750 | 3.1 Detail | User | Cross-Role | All | -- | User and Admin view same property | Both see same base info; admin has actions | | | |

### 3.2 Schedule & Appointments (120)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S03-HP-0751 | 3.2 Schedule | User | Happy | All | Property available | Click "Schedule Visit" | Booking form opens | | | |
| ESTO-S03-HP-0752 | 3.2 Schedule | User | Happy | All | Booking form open | Select date and time | Date/time selected; form updates | | | |
| ESTO-S03-HP-0753 | 3.2 Schedule | Guest | Happy | All | Booking form open | Submit booking request | Request submitted; confirmation shown | | | |
| ESTO-S03-HP-0754 | 3.2 Schedule | User | Happy | All | Booking submitted | View booking in "My Appointments" | Booking listed with details | | | |
| ESTO-S03-HP-0755 | 3.2 Schedule | Guest | Happy | All | Has bookings | Cancel booking | Booking cancelled; confirmation shown | | | |
| ESTO-S03-HP-0756 | 3.2 Schedule | User | Happy | All | Has booking | Reschedule booking | Date/time updated successfully | | | |
| ESTO-S03-HP-0757 | 3.2 Schedule | Guest | Happy | All | Booking confirmed | Receive booking confirmation email | Email received with details | | | |
| ESTO-S03-HP-0758 | 3.2 Schedule | User | Happy | All | Booking tomorrow | Receive reminder notification | Reminder sent at configured time | | | |
| ESTO-S03-HP-0759 | 3.2 Schedule | Guest | Happy | All | Booking form open | Select preferred time slot | Time slot selected; availability checked | | | |
| ESTO-S03-HP-0760 | 3.2 Schedule | User | Happy | All | Booking form open | Add notes to booking request | Notes saved with booking | | | |
| ESTO-S03-EM-0761 | 3.2 Schedule | Guest | Empty | All | -- | Attempt to schedule without selecting date | Date required validation | | | |
| ESTO-S03-EM-0762 | 3.2 Schedule | User | Empty | All | -- | Attempt to schedule past date | Validation: cannot select past date | | | |
| ESTO-S03-EM-0763 | 3.2 Schedule | Guest | Empty | All | -- | Submit booking with no time selected | Time required validation | | | |
| ESTO-S03-EM-0764 | 3.2 Schedule | User | Empty | All | -- | View appointments with no bookings | Empty state: "No appointments" | | | |
| ESTO-S03-EM-0765 | 3.2 Schedule | Guest | Empty | All | -- | Attempt to book unavailable slot | Error: Slot no longer available | | | |
| ESTO-S03-ER-0766 | 3.2 Schedule | User | Error | All | -- | Book slot that was just taken by another user | Error: Slot unavailable; suggest alternatives | | | |
| ESTO-S03-ER-0767 | 3.2 Schedule | Guest | Error | All | Booking service down | Attempt to schedule | Error toast; retry option | | | |
| ESTO-S03-ER-0768 | 3.2 Schedule | User | Error | All | Network offline | Submit booking request | Network error; data preserved | | | |
| ESTO-S03-ER-0769 | 3.2 Schedule | Guest | Error | All | Mock backend | Mock 500 on booking | Error toast; no crash | | | |
| ESTO-S03-ER-0770 | 3.2 Schedule | User | Error | All | Mock backend | Mock slow booking response | Loading state; timeout handling | | | |
| ESTO-S03-ER-0771 | 3.2 Schedule | Guest | Error | All | -- | Double-click schedule button | No duplicate booking created | | | |
| ESTO-S03-ER-0772 | 3.2 Schedule | User | Error | All | -- | Cancel already-cancelled booking | Error: Already cancelled | | | |
| ESTO-S03-ER-0773 | 3.2 Schedule | Guest | Error | All | -- | Reschedule to past date | Validation: cannot reschedule to past | | | |
| ESTO-S03-ER-0774 | 3.2 Schedule | User | Error | All | -- | Book slot outside working hours | Error: Outside available hours | | | |
| ESTO-S03-ER-0775 | 3.2 Schedule | Guest | Error | All | Mock backend | Mock 409 conflict on booking | Error: Conflict; suggest alternatives | | | |
| ESTO-S03-ED-0776 | 3.2 Schedule | User | Edge | All | Calendar available | Book on last available slot of day | Booking succeeds | | | |
| ESTO-S03-ED-0777 | 3.2 Schedule | Guest | Edge | All | Calendar available | Book on first available slot | Booking succeeds | | | |
| ESTO-S03-ED-0778 | 3.2 Schedule | User | Edge | All | Calendar available | Rapid slot selection and booking | No double booking; debounced | | | |
| ESTO-S03-ED-0779 | 3.2 Schedule | Guest | Edge | All | Calendar available | Book slot at timezone boundary | Timezone handled correctly | | | |
| ESTO-S03-ED-0780 | 3.2 Schedule | User | Edge | All | Calendar available | Book across DST change | Booking time preserved correctly | | | |
| ESTO-S03-ED-0781 | 3.2 Schedule | Guest | Edge | All | Calendar available | Book with notes of 500 chars | Long notes handled gracefully | | | |
| ESTO-S03-ED-0782 | 3.2 Schedule | User | Edge | All | Calendar available | Book for 6 months from now | Future booking accepted | | | |
| ESTO-S03-ED-0783 | 3.2 Schedule | Guest | Edge | All | Calendar available | Cancel booking 5 min before slot | Cancellation works or blocked per policy | | | |
| ESTO-S03-ED-0784 | 3.2 Schedule | User | Edge | All | Calendar available | Reschedule 3 times in quick succession | All reschedules handled correctly | | | |
| ESTO-S03-ED-0785 | 3.2 Schedule | Guest | Edge | All | Calendar available | Book with special chars in notes | Notes sanitized and saved | | | |
| ESTO-S03-CR-0786 | 3.2 Schedule | User | Cross-Role | All | -- | Two users book same slot | First booking succeeds; second gets error | | | |
| ESTO-S03-CR-0787 | 3.2 Schedule | Guest | Cross-Role | All | -- | Manager views user's booking | Manager sees booking in admin view | | | |
| ESTO-S03-CR-0788 | 3.2 Schedule | User | Cross-Role | All | -- | Admin views all bookings across platform | Admin sees all bookings | | | |
| ESTO-S03-CR-0789 | 3.2 Schedule | Guest | Cross-Role | All | -- | User cancels, Manager notified | Manager receives cancellation notification | | | |
| ESTO-S03-CR-0790 | 3.2 Schedule | User | Cross-Role | All | -- | Admin blocks time slot | Slot unavailable for all users | | | |
| ESTO-S03-CR-0791 | 3.2 Schedule | Guest | Cross-Role | All | -- | Manager reschedules user's booking | User notified of change | | | |
| ESTO-S03-CR-0792 | 3.2 Schedule | User | Cross-Role | All | -- | Multiple users book same property | Each booking independent | | | |
| ESTO-S03-CR-0793 | 3.2 Schedule | Guest | Cross-Role | All | -- | Admin overrides booking status | Override applied; parties notified | | | |
| ESTO-S03-CR-0794 | 3.2 Schedule | User | Cross-Role | All | -- | User receives SMS reminder | SMS received at scheduled time | | | |
| ESTO-S03-CR-0795 | 3.2 Schedule | Guest | Cross-Role | All | -- | Manager sets recurring availability | Recurring slots available for booking | | | |

### 3.3 Property Media & Documents (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S03-HP-0796 | 3.3 Media | Guest | Happy | All | Property has images | View property image gallery | All images load and display | | | Ticket:#305 |
| ESTO-S03-HP-0797 | 3.3 Media | User | Happy | All | Property has 360 view | Open 360-degree view | Panoramic view loads and rotates | | | |
| ESTO-S03-HP-0798 | 3.3 Media | Guest | Happy | All | Property has documents | Download property documents | Downloads successfully | | | |
| ESTO-S03-HP-0799 | 3.3 Media | User | Happy | All | Property has brochure | Download brochure PDF | PDF opens/downloads | | | |
| ESTO-S03-HP-0800 | 3.3 Media | Guest | Happy | All | Image gallery | Zoom into image | Image zooms; quality maintained | | | Ticket:#305 |
| ESTO-S03-HP-0801 | 3.3 Media | User | Happy | All | Image gallery | Fullscreen image view | Fullscreen mode opens | | | Ticket:#305 |
| ESTO-S03-HP-0802 | 3.3 Media | Guest | Happy | All | Image gallery | Navigate images with arrows | Prev/next navigation works | | | Ticket:#305 |
| ESTO-S03-HP-0803 | 3.3 Media | User | Happy | All | Image gallery | Swipe images on mobile | Swipe navigation works | | | Mobile |
| ESTO-S03-HP-0804 | 3.3 Media | Guest | Happy | All | Property video | Play/pause video | Controls work correctly | | | Ticket:#305 |
| ESTO-S03-HP-0805 | 3.3 Media | User | Happy | All | Video available | Adjust video volume | Volume control works | | | Ticket:#305 |
| ESTO-S03-EM-0806 | 3.3 Media | Guest | Empty | All | No images | View property | Placeholder images shown | | | Ticket:#305 |
| ESTO-S03-EM-0807 | 3.3 Media | User | Empty | All | No documents | View documents section | "No documents available" message | | | |
| ESTO-S03-EM-0808 | 3.3 Media | Guest | Empty | All | No video | View property | No video section or placeholder | | | Ticket:#305 |
| ESTO-S03-EM-0809 | 3.3 Media | User | Empty | All | No 360 tour | View property | No tour section or placeholder | | | Ticket:#305 |
| ESTO-S03-ER-0810 | 3.3 Media | Guest | Error | All | -- | Image fails to load | Placeholder shown | | | Ticket:#305 |
| ESTO-S03-ER-0811 | 3.3 Media | User | Error | All | Media service down | View property media | Error toast; placeholders shown | | | Ticket:#305 |
| ESTO-S03-ER-0812 | 3.3 Media | Guest | Error | All | Network offline | View images | Cached images or placeholders | | | |
| ESTO-S03-ER-0813 | 3.3 Media | User | Error | All | -- | Video fails to buffer | Error message; still image shown | | | Ticket:#305 |
| ESTO-S03-ER-0814 | 3.3 Media | Guest | Error | All | -- | 360 tour service unavailable | Error message; static images fallback | | | Ticket:#305 |
| ESTO-S03-ER-0815 | 3.3 Media | User | Error | All | -- | Document download fails (404) | Error toast; retry option | | | |
| ESTO-S03-ER-0816 | 3.3 Media | Guest | Error | All | -- | Image with corrupted EXIF | Image displays without EXIF issues | | | Ticket:#305 |
| ESTO-S03-ER-0817 | 3.3 Media | User | Error | All | -- | Very large image (>10MB) | Thumbnail shown; lazy load | | | Ticket:#305 |
| ESTO-S03-ER-0818 | 3.3 Media | Guest | Error | All | -- | Unsupported image format | Placeholder or format error | | | Ticket:#305 |
| ESTO-S03-ER-0819 | 3.3 Media | User | Error | All | -- | Slow image load (>5s) | Loading spinner; eventual display | | | Ticket:#305 |
| ESTO-S03-ER-0820 | 3.3 Media | Guest | Error | All | -- | Mixed content image (HTTP on HTTPS) | Browser blocks; placeholder shown | | | Security |
| ESTO-S03-ED-0821 | 3.3 Media | User | Edge | All | Property with 50+ images | View full gallery | Lazy loading; performance OK | | | Ticket:#305 |
| ESTO-S03-ED-0822 | 3.3 Media | Guest | Edge | All | Property with 100MB+ video | Stream video | Streaming/chunked loading | | | Ticket:#305 |
| ESTO-S03-ED-0823 | 3.3 Media | User | Edge | All | Property with WebP and fallback | View in browsers with/without WebP | Fallback works correctly | | | |
| ESTO-S03-ED-0824 | 3.3 Media | Guest | Edge | All | Gallery on slow network | Images load on 3G | Progressive loading; placeholders | | | Ticket:#305 |
| ESTO-S03-ED-0825 | 3.3 Media | User | Edge | All | Accessibility: gallery with keyboard | Navigate images with keyboard | Arrow keys navigate images | | | A11y |
| ESTO-S03-CR-0826 | 3.3 Media | User | Cross-Role | All | -- | User downloads doc; Admin sees download count | Admin sees document analytics | | | |
| ESTO-S03-CR-0827 | 3.3 Media | Guest | Cross-Role | All | -- | Manager uploads images; User views them | User sees manager-uploaded images | | | |
| ESTO-S03-CR-0828 | 3.3 Media | User | Cross-Role | All | -- | Admin replaces property image; Users see new | All users see updated image | | | Ticket:#305 |
| ESTO-S03-CR-0829 | 3.3 Media | Guest | Cross-Role | All | -- | Two users view same gallery | Independent gallery states | | | Ticket:#305 |
| ESTO-S03-CR-0830 | 3.3 Media | User | Cross-Role | All | -- | User zooms image, another user unaffected | Gallery states independent | | | Ticket:#305 |

---

## Section 4: Bookings (Rental/Lease) (250)

### 4.1 Booking Creation & Management (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S04-HP-0831 | 4.1 Booking | User | Happy | All | Property available | Initiate rental booking | Booking created; confirmation shown | | | |
| ESTO-S04-HP-0832 | 4.1 Booking | User | Happy | All | Booking created | Fill in tenant details | Details saved with booking | | | |
| ESTO-S04-HP-0833 | 4.1 Booking | User | Happy | All | Booking form open | Select move-in date | Date selected; availability checked | | | |
| ESTO-S04-HP-0834 | 4.1 Booking | User | Happy | All | Booking form open | Select lease duration | Duration selected; price calculated | | | |
| ESTO-S04-HP-0835 | 4.1 Booking | User | Happy | All | Booking form complete | Submit booking request | Request submitted; status = pending | | | |
| ESTO-S04-HP-0836 | 4.1 Booking | User | Happy | All | Booking pending | View booking in "My Bookings" | Booking listed with status | | | |
| ESTO-S04-HP-0837 | 4.1 Booking | User | Happy | All | Booking approved | Sign lease document | Document signed; booking confirmed | | | |
| ESTO-S04-HP-0838 | 4.1 Booking | Manager | Happy | All | New booking request | Review booking request | Request displayed with all details | | | |
| ESTO-S04-HP-0839 | 4.1 Booking | Manager | Happy | All | Booking under review | Approve booking | Status updated to approved | | | |
| ESTO-S04-HP-0840 | 4.1 Booking | Manager | Happy | All | Booking under review | Reject booking with reason | Status updated; reason recorded | | | |
| ESTO-S04-HP-0841 | 4.1 Booking | User | Happy | All | Booking confirmed | Make payment deposit | Payment processed; booking secured | | | |
| ESTO-S04-HP-0842 | 4.1 Booking | User | Happy | All | Booking active | View lease agreement | Lease document displayed | | | |
| ESTO-S04-HP-0843 | 4.1 Booking | User | Happy | All | Booking active | Request early termination | Termination request submitted | | | |
| ESTO-S04-HP-0844 | 4.1 Booking | Manager | Happy | All | Booking active | View all active bookings | All active bookings listed | | | |
| ESTO-S04-HP-0845 | 4.1 Booking | User | Happy | All | Booking completed | Leave review for property | Review form opens | | | |
| ESTO-S04-EM-0846 | 4.1 Booking | User | Empty | All | -- | Submit booking with no dates selected | Date required validation | | | |
| ESTO-S04-EM-0847 | 4.1 Booking | User | Empty | All | -- | Submit booking with no property selected | Property required validation | | | |
| ESTO-S04-EM-0848 | 4.1 Booking | User | Empty | All | -- | View bookings with no bookings | Empty state: "No bookings yet" | | | |
| ESTO-S04-EM-0849 | 4.1 Booking | Guest | Empty | All | -- | Access booking without auth | Redirected to /login | | | |
| ESTO-S04-EM-0850 | 4.1 Booking | User | Empty | All | -- | Submit booking with empty tenant details | Validation errors displayed | | | |
| ESTO-S04-ER-0851 | 4.1 Booking | User | Error | All | Booking service down | Attempt to create booking | Error toast; retry option | | | |
| ESTO-S04-ER-0852 | 4.1 Booking | User | Error | All | Network offline | Submit booking | Network error; data preserved | | | |
| ESTO-S04-ER-0853 | 4.1 Booking | Guest | Error | All | Mock backend | Mock 500 on booking | Error toast; no crash | | | |
| ESTO-S04-ER-0854 | 4.1 Booking | User | Error | All | -- | Book already-booked slot | Error: Slot no longer available | | | |
| ESTO-S04-ER-0855 | 4.1 Booking | Guest | Error | All | -- | Book with invalid date (past) | Validation error | | | |
| ESTO-S04-ER-0856 | 4.1 Booking | User | Error | All | Mock backend | Mock 409 conflict | Error: Conflict; suggest alternatives | | | |
| ESTO-S04-ER-0857 | 4.1 Booking | Guest | Error | All | -- | Cancel already-cancelled booking | Error: Already cancelled | | | |
| ESTO-S04-ER-0858 | 4.1 Booking | User | Error | All | -- | Cancel confirmed booking | Error: Cannot cancel confirmed booking | | | |
| ESTO-S04-ER-0859 | 4.1 Booking | Guest | Error | All | -- | Modify approved booking | Error: Cannot modify approved booking | | | |
| ESTO-S04-ER-0860 | 4.1 Booking | User | Error | All | Mock backend | Mock slow booking response | Loading state; timeout handling | | | |
| ESTO-S04-ER-0861 | 4.1 Booking | Guest | Error | All | -- | XSS in booking notes | Input escaped; no XSS | | | Security |
| ESTO-S04-ER-0862 | 4.1 Booking | User | Error | All | -- | SQL injection in booking form | No SQL injection; error shown | | | Security |
| ESTO-S04-ER-0863 | 4.1 Booking | Guest | Error | All | -- | Book property that was just removed | Error: Property no longer available | | | |
| ESTO-S04-ER-0864 | 4.1 Booking | User | Error | All | -- | Payment fails during booking | Error: Payment failed; retry option | | | |
| ESTO-S04-ER-0865 | 4.1 Booking | Guest | Error | All | -- | Booking with expired availability | Error: Property no longer available | | | |
| ESTO-S04-ED-0866 | 4.1 Booking | User | Edge | All | Property available | Book at midnight (date boundary) | Booking date correct | | | |
| ESTO-S04-ED-0867 | 4.1 Booking | Guest | Edge | All | Property available | Book with long-term lease (3 years) | Long lease accepted | | | |
| ESTO-S04-ED-0868 | 4.1 Booking | User | Edge | All | Property available | Book with short-term lease (1 month) | Short lease accepted | | | |
| ESTO-S04-ED-0869 | 4.1 Booking | Guest | Edge | All | Property available | Book with special chars in notes | Notes sanitized | | | |
| ESTO-S04-ED-0870 | 4.1 Booking | User | Edge | All | Property available | Rapid booking submissions | No duplicate bookings | | | |
| ESTO-S04-ED-0871 | 4.1 Booking | Guest | Edge | All | Property available | Book across timezone | Booking time in correct timezone | | | |
| ESTO-S04-ED-0872 | 4.1 Booking | User | Edge | All | Property available | Book with 10 co-tenants | All tenants added correctly | | | |
| ESTO-S04-ED-0873 | 4.1 Booking | Guest | Edge | All | Property available | Book with emoji in notes | Emoji handled or stripped | | | |
| ESTO-S04-ED-0874 | 4.1 Booking | User | Edge | All | Property available | Book with max-length fields | All fields accepted at max length | | | |
| ESTO-S04-ED-0875 | 4.1 Booking | Guest | Edge | All | Property available | Cancel booking 1 minute before slot | Cancellation handled per policy | | | |
| ESTO-S04-CR-0876 | 4.1 Booking | User | Cross-Role | All | -- | User books; Manager sees in dashboard | Manager sees new booking request | | | |
| ESTO-S04-CR-0877 | 4.1 Booking | Guest | Cross-Role | All | -- | Two users book same property | Independent bookings created | | | |
| ESTO-S04-CR-0878 | 4.1 Booking | User | Cross-Role | All | -- | Admin views all platform bookings | Admin sees all bookings | | | |
| ESTO-S04-CR-0879 | 4.1 Booking | Guest | Cross-Role | All | -- | User cancels; Manager notified | Manager receives cancellation notification | | | |
| ESTO-S04-CR-0880 | 4.1 Booking | User | Cross-Role | All | -- | Manager rejects; User notified | User receives rejection with reason | | | |

### 4.2 Lease & Contract Lifecycle (60)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S04-HP-0881 | 4.2 Lease | User | Happy | All | Booking approved | View lease agreement | Lease document displayed | | | |
| ESTO-S04-HP-0882 | 4.2 Lease | User | Happy | All | Lease available | E-sign lease document | Document signed; timestamp recorded | | | |
| ESTO-S04-HP-0883 | 4.2 Lease | Manager | Happy | All | Lease drafted | Send lease to tenant | Tenant receives lease for signing | | | |
| ESTO-S04-HP-0884 | 4.2 Lease | User | Happy | All | Lease signed | View signed lease copy | Signed copy available for download | | | |
| ESTO-S04-HP-0885 | 4.2 Lease | Manager | Happy | All | Lease active | Track lease status | Status dashboard shows active lease | | | |
| ESTO-S04-HP-0886 | 4.2 Lease | User | Happy | All | Lease expiring soon | Renew lease | Renewal process initiated | | | |
| ESTO-S04-HP-0887 | 4.2 Lease | User | Happy | All | Lease active | Terminate lease early | Termination request submitted | | | |
| ESTO-S04-HP-0888 | 4.2 Lease | Manager | Happy | All | Lease terminated | View termination details | Termination recorded with details | | | |
| ESTO-S04-EM-0889 | 4.2 Lease | User | Empty | All | -- | View lease with no active booking | No lease to display | | | |
| ESTO-S04-EM-0890 | 4.2 Lease | Guest | Empty | All | -- | Access lease without auth | Redirected to /login | | | |
| ESTO-S04-ER-0891 | 4.2 Lease | User | Error | All | -- | E-sign with invalid certificate | Error: Invalid signing certificate | | | |
| ESTO-S04-ER-0892 | 4.2 Lease | Guest | Error | All | Contract service down | View lease | Error toast; cached copy if available | | | |
| ESTO-S04-ER-0893 | 4.2 Lease | User | Error | All | Network offline | Submit lease signature | Network error; queued for retry | | | |
| ESTO-S04-ER-0894 | 4.2 Lease | Guest | Error | All | -- | Tampered lease document | Integrity check fails; warning shown | | | Security |
| ESTO-S04-ER-0895 | 4.2 Lease | User | Error | All | -- | Sign expired lease document | Error: Lease has expired | | | |
| ESTO-S04-ED-0896 | 4.2 Lease | User | Edge | All | Lease available | View lease on mobile | Lease renders correctly on mobile | | | Mobile |
| ESTO-S04-ED-0897 | 4.2 Lease | Guest | Edge | All | Lease available | Print lease document | Print layout clean and complete | | | |
| ESTO-S04-ED-0898 | 4.2 Lease | User | Edge | All | Long lease document | View 100-page lease | Scrolling and zooming work | | | |
| ESTO-S04-ED-0899 | 4.2 Lease | Guest | Edge | All | Lease with special formatting | View formatted lease | Formatting preserved | | | |
| ESTO-S04-CR-0900 | 4.2 Lease | User | Cross-Role | All | -- | User views lease; Manager edits | Manager edits template; user sees updates | | | |
| ESTO-S04-CR-0901 | 4.2 Lease | Guest | Cross-Role | All | -- | Admin views all platform leases | Admin sees all leases | | | |
| ESTO-S04-CR-0902 | 4.2 Lease | User | Cross-Role | All | -- | User signs; Manager receives notification | Manager notified of signature | | | |
| ESTO-S04-CR-0903 | 4.2 Lease | Manager | Cross-Role | All | -- | Manager generates lease; User receives | User gets lease for review | | | |
| ESTO-S04-CR-0904 | 4.2 Lease | Guest | Cross-Role | All | -- | Lease renewal by User; Manager approves | Manager approves renewal | | | |
| ESTO-S04-CR-0905 | 4.2 Lease | User | Cross-Role | All | -- | Two users on same lease | Both can view and sign | | | |

### 4.3 Payments & Deposits (40)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S04-HP-0906 | 4.3 Payment | User | Happy | All | Booking approved | Make security deposit | Payment processed; deposit confirmed | | | |
| ESTO-S04-HP-0907 | 4.3 Payment | User | Happy | All | Payment gateway configured | Pay with credit card | Payment succeeds; receipt generated | | | |
| ESTO-S04-HP-0908 | 4.3 Payment | User | Happy | All | Payment gateway configured | Pay with UPI | UPI payment succeeds | | | |
| ESTO-S04-HP-0909 | 4.3 Payment | User | Happy | All | Payment completed | View payment receipt | Receipt displayed and downloadable | | | |
| ESTO-S04-HP-0910 | 4.3 Payment | User | Happy | All | Has payment history | View payment history | All payments listed with status | | | |
| ESTO-S04-EM-0911 | 4.3 Payment | User | Empty | All | -- | View payments with no transactions | Empty state displayed | | | |
| ESTO-S04-ER-0912 | 4.3 Payment | Guest | Error | All | Payment service down | Attempt payment | Error: Payment service unavailable | | | |
| ESTO-S04-ER-0913 | 4.3 Payment | User | Error | All | -- | Payment declined by bank | Error: Payment declined; retry | | | |
| ESTO-S04-ER-0914 | 4.3 Payment | Guest | Error | All | Network offline | Attempt payment | Network error; no charge made | | | |
| ESTO-S04-ER-0915 | 4.3 Payment | User | Error | All | -- | Double-click pay button | No duplicate payment | | | |
| ESTO-S04-ER-0916 | 4.3 Payment | Guest | Error | All | -- | Payment with tampered amount | Server validates; correct amount charged | | | Security |
| ESTO-S04-ED-0917 | 4.3 Payment | User | Edge | All | -- | Payment with international card | Card accepted if supported | | | |
| ESTO-S04-ED-0918 | 4.3 Payment | Guest | Edge | All | -- | Payment at exact expiry time | Handled correctly | | | |
| ESTO-S04-CR-0919 | 4.3 Payment | User | Cross-Role | All | -- | User makes payment; Admin sees in ledger | Admin sees payment in financial view | | | |
| ESTO-S04-CR-0920 | 4.3 Payment | Manager | Cross-Role | All | -- | Manager receives deposit notification | Manager notified of deposit received | | | |
| ESTO-S04-CR-0921 | 4.3 Payment | User | Cross-Role | All | -- | Refund initiated; User and Admin notified | Both receive refund notification | | | |
| ESTO-S04-CR-0922 | 4.3 Payment | Guest | Cross-Role | All | -- | Failed payment retried by User | Retry succeeds or fails gracefully | | | |
| ESTO-S04-CR-0923 | 4.3 Payment | User | Cross-Role | All | -- | Partial payment accepted | Partial payment recorded; balance due | | | |
| ESTO-S04-CR-0924 | 4.3 Payment | Guest | Cross-Role | All | -- | Payment with discount code | Discount applied; amount reduced | | | |
| ESTO-S04-CR-0925 | 4.3 Payment | User | Cross-Role | All | -- | EMI payment plan | EMI schedule generated | | | |

### 4.4 Booking Status & Tracking (40)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S04-HP-0926 | 4.4 Tracking | User | Happy | All | Active booking | View booking timeline | Timeline shows all status changes | | | |
| ESTO-S04-HP-0927 | 4.4 Tracking | User | Happy | All | Booking pending | Track booking status | Status updates displayed | | | |
| ESTO-S04-HP-0928 | 4.4 Tracking | Manager | Happy | All | Multiple bookings | View booking calendar | All bookings shown on calendar | | | |
| ESTO-S04-HP-0929 | 4.4 Tracking | User | Happy | All | Booking with notes | View booking notes | Notes displayed correctly | | | |
| ESTO-S04-HP-0930 | 4.4 Tracking | Manager | Happy | All | Active bookings | Filter bookings by status | Filtered results correct | | | |
| ESTO-S04-EM-0931 | 4.4 Tracking | User | Empty | All | -- | View booking with no bookings | Empty state displayed | | | |
| ESTO-S04-ER-0932 | 4.4 Tracking | User | Error | All | Booking service down | View booking status | Error toast; cached status if available | | | |
| ESTO-S04-ER-0933 | 4.4 Tracking | Guest | Error | All | -- | Access booking status without auth | Redirected to /login | | | |
| ESTO-S04-ER-0934 | 4.4 Tracking | User | Error | All | Mock backend | Mock 500 on status check | Error toast; no crash | | | |
| ESTO-S04-ED-0935 | 4.4 Tracking | User | Edge | All | Many bookings (50+) | View all bookings | Pagination/virtualization works | | | |
| ESTO-S04-CR-0936 | 4.4 Tracking | Manager | Cross-Role | All | -- | Manager tracks all platform bookings | Manager sees all bookings | | | |
| ESTO-S04-CR-0937 | 4.4 Tracking | User | Cross-Role | All | -- | Admin overrides booking status | Override recorded; parties notified | | | |
| ESTO-S04-CR-0938 | 4.4 Tracking | Guest | Cross-Role | All | -- | User's booking; Admin views timeline | Admin sees full booking timeline | | | |
| ESTO-S04-CR-0939 | 4.4 Tracking | Manager | Cross-Role | All | -- | Manager updates status; User sees update | Real-time status update displayed | | | |
| ESTO-S04-CR-0940 | 4.4 Tracking | User | Cross-Role | All | -- | User filters bookings; Admin sees all | Admin sees unfiltered list | | | |

---

## Section 5: Broker Request & Dispatch (400)

### 5.1 Broker Request Submission (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S05-HP-0941 | 5.1 BrokerReq | User | Happy | All | Logged in | Navigate to broker request form | Form renders with all fields | | | |
| ESTO-S05-HP-0942 | 5.1 BrokerReq | User | Happy | All | Form open | Fill property details | Form validates and accepts input | | | |
| ESTO-S05-HP-0943 | 5.1 BrokerReq | User | Happy | All | Form filled | Submit broker request | Request submitted; confirmation shown | | | |
| ESTO-S05-HP-0944 | 5.1 BrokerReq | User | Happy | All | Request submitted | View request in "My Requests" | Request listed with status | | | |
| ESTO-S05-HP-0945 | 5.1 BrokerReq | User | Happy | All | Request pending | Cancel broker request | Request cancelled; confirmation shown | | | |
| ESTO-S05-HP-0946 | 5.1 BrokerReq | User | Happy | All | Request submitted | Receive broker assignment notification | Notification sent to user | | | |
| ESTO-S05-HP-0947 | 5.1 BrokerReq | Guest | Happy | All | Form open | Attach documents to request | Documents uploaded successfully | | | |
| ESTO-S05-HP-0948 | 5.1 BrokerReq | User | Happy | All | Request under review | Modify request details | Request updated; status preserved | | | |
| ESTO-S05-HP-0949 | 5.1 BrokerReq | User | Happy | All | Request assigned | Communicate with assigned broker | Messaging channel opens | | | |
| ESTO-S05-HP-0950 | 5.1 BrokerReq | Guest | Happy | All | Form open | Select service type (buy/rent/sell) | Service type saved with request | | | |
| ESTO-S05-EM-0951 | 5.1 BrokerReq | User | Empty | All | -- | Submit form with all fields empty | Validation errors for required fields | | | |
| ESTO-S05-EM-0952 | 5.1 BrokerReq | Guest | Empty | All | -- | Access broker request without auth | Redirected to /login | | | |
| ESTO-S05-EM-0953 | 5.1 BrokerReq | User | Empty | All | -- | Submit without selecting service type | Service type required error | | | |
| ESTO-S05-EM-0954 | 5.1 BrokerReq | Guest | Empty | All | -- | Submit with empty budget field | Budget required or optional message | | | |
| ESTO-S05-ER-0955 | 5.1 BrokerReq | User | Error | All | Broker service down | Submit request | Error toast; retry option | | | |
| ESTO-S05-ER-0956 | 5.1 BrokerReq | Guest | Error | All | Network offline | Submit request | Network error; data preserved | | | |
| ESTO-S05-ER-0957 | 5.1 BrokerReq | User | Error | All | Mock backend | Mock 500 on submit | Error toast; form retains data | | | |
| ESTO-S05-ER-0958 | 5.1 BrokerReq | Guest | Error | All | Mock backend | Mock slow response | Loading state; no crash | | | |
| ESTO-S05-ER-0959 | 5.1 BrokerReq | User | Error | All | -- | XSS in request description | Input escaped; no XSS | | | Security |
| ESTO-S05-ER-0960 | 5.1 BrokerReq | Guest | Error | All | -- | Submit with SQL injection | No SQL injection; error shown | | | Security |
| ESTO-S05-ER-0961 | 5.1 BrokerReq | User | Error | All | -- | Submit with oversized document | Error: File too large | | | |
| ESTO-S05-ER-0962 | 5.1 BrokerReq | Guest | Error | All | -- | Submit with invalid file type | Error: Invalid file type | | | |
| ESTO-S05-ER-0963 | 5.1 BrokerReq | User | Error | All | -- | Cancel already-completed request | Error: Cannot cancel completed request | | | |
| ESTO-S05-ER-0964 | 5.1 BrokerReq | Guest | Error | All | Mock backend | Mock 409 conflict | Error: Conflict; retry or modify | | | |
| ESTO-S05-ED-0965 | 5.1 BrokerReq | User | Edge | All | Form open | Submit with 500-char description | Handled gracefully | | | |
| ESTO-S05-ED-0966 | 5.1 BrokerReq | Guest | Edge | All | Form open | Submit with special chars in fields | Fields sanitized | | | |
| ESTO-S05-ED-0967 | 5.1 BrokerReq | User | Edge | All | Form open | Rapid form submission | No duplicate requests | | | |
| ESTO-S05-ED-0968 | 5.1 BrokerReq | Guest | Edge | All | Form open | Submit with unicode characters | Unicode handled correctly | | | |
| ESTO-S05-ED-0969 | 5.1 BrokerReq | User | Edge | All | Form open | Submit with 5 attached documents | All documents uploaded | | | |
| ESTO-S05-ED-0970 | 5.1 BrokerReq | Guest | Edge | All | Form open | Submit request for 3 properties | All properties included | | | |
| ESTO-S05-CR-0971 | 5.1 BrokerReq | User | Cross-Role | All | -- | User submits; Admin sees in queue | Admin sees request in queue | | | |
| ESTO-S05-CR-0972 | 5.1 BrokerReq | Guest | Cross-Role | All | -- | Two users submit requests simultaneously | Each request independent | | | |
| ESTO-S05-CR-0973 | 5.1 BrokerReq | User | Cross-Role | All | -- | Admin assigns broker to request | Broker assigned; user notified | | | |
| ESTO-S05-CR-0974 | 5.1 BrokerReq | Guest | Cross-Role | All | -- | Manager views broker requests for own properties | Manager sees relevant requests | | | |
| ESTO-S05-CR-0975 | 5.1 BrokerReq | User | Cross-Role | All | -- | Broker views assigned requests | Broker sees assigned requests | | | |

### 5.2 Broker Assignment & Dispatch (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S05-HP-0976 | 5.2 Dispatch | Admin | Happy | All | Pending broker requests | View broker request queue | Queue displayed with all pending | | | |
| ESTO-S05-HP-0977 | 5.2 Dispatch | Admin | Happy | All | Request in queue | Assign broker to request | Broker assigned; notifications sent | | | |
| ESTO-S05-HP-0978 | 5.2 Dispatch | Admin | Happy | All | Auto-dispatch enabled | Auto-dispatch triggers | Request auto-assigned to best broker | | | |
| ESTO-S05-HP-0979 | 5.2 Dispatch | Admin | Happy | All | Broker assigned | View broker's load | Broker load displayed | | | |
| ESTO-S05-HP-0980 | 5.2 Dispatch | Admin | Happy | All | Request assigned | Re-assign to different broker | Broker changed; notifications sent | | | |
| ESTO-S05-HP-0981 | 5.2 Dispatch | Broker | Happy | All | Assigned request | View assigned requests | Requests displayed in broker dashboard | | | |
| ESTO-S05-HP-0982 | 5.2 Dispatch | Broker | Happy | All | Assigned request | Accept request assignment | Request accepted; status updated | | | |
| ESTO-S05-HP-0983 | 5.2 Dispatch | Broker | Happy | All | Request accepted | Contact user via messaging | Message sent to user | | | |
| ESTO-S05-HP-0984 | 5.2 Dispatch | Broker | Happy | All | Request completed | Mark request as completed | Status updated; user notified | | | |
| ESTO-S05-HP-0985 | 5.2 Dispatch | Admin | Happy | All | Dispatch rules configured | View dispatch rules | Rules displayed; can be edited | | | |
| ESTO-S05-EM-0986 | 5.2 Dispatch | Admin | Empty | All | -- | View queue with no requests | Empty state displayed | | | |
| ESTO-S05-EM-0987 | 5.2 Dispatch | Guest | Empty | All | -- | Access dispatch without auth | Redirected to /login | | | |
| ESTO-S05-EM-0988 | 5.2 Dispatch | Broker | Empty | All | -- | View assignments with no assignments | Empty state displayed | | | |
| ESTO-S05-ER-0989 | 5.2 Dispatch | Admin | Error | All | Dispatch service down | Attempt to assign broker | Error toast; retry option | | | |
| ESTO-S05-ER-0990 | 5.2 Dispatch | Broker | Error | All | Network offline | Accept assignment | Network error; retry | | | |
| ESTO-S05-ER-0991 | 5.2 Dispatch | Admin | Error | All | Mock backend | Mock 500 on assign | Error toast; no crash | | | |
| ESTO-S05-ER-0992 | 5.2 Dispatch | Broker | Error | All | Mock backend | Mock slow assignment response | Loading state; timeout handling | | | |
| ESTO-S05-ER-0993 | 5.2 Dispatch | Admin | Error | All | -- | Assign to non-existent broker | Error: Broker not found | | | |
| ESTO-S05-ER-0994 | 5.2 Dispatch | Broker | Error | All | -- | Accept already-accepted request | Error: Already accepted | | | |
| ESTO-S05-ER-0995 | 5.2 Dispatch | Admin | Error | All | -- | Assign to overloaded broker | Warning: Broker at capacity | | | |
| ESTO-S05-ER-0996 | 5.2 Dispatch | Guest | Error | All | -- | Access broker dispatch as User | Redirected to /user/dashboard | | | Security |
| ESTO-S05-ER-0997 | 5.2 Dispatch | Broker | Error | All | -- | View other broker's assignments | Only own assignments shown | | | Security |
| ESTO-S05-ER-0998 | 5.2 Dispatch | Admin | Error | All | -- | Auto-dispatch with no brokers available | Error: No brokers available | | | |
| ESTO-S05-ER-0999 | 5.2 Dispatch | Broker | Error | All | -- | Complete already-completed request | Error: Already completed | | | |
| ESTO-S05-ED-1000 | 5.2 Dispatch | Admin | Edge | All | 100+ pending requests | View dispatch queue | Queue loads; pagination works | | | |
| ESTO-S05-ED-1001 | 5.2 Dispatch | Broker | Edge | All | 50+ assigned requests | View all assignments | Pagination; performance OK | | | |
| ESTO-S05-ED-1002 | 5.2 Dispatch | Admin | Edge | All | Dispatch rules | Create complex dispatch rule | Rule created and applied | | | |
| ESTO-S05-ED-1003 | 5.2 Dispatch | Broker | Edge | All | Rapid assignment acceptance | Accept multiple quickly | All accepted; no conflicts | | | |
| ESTO-S05-ED-1004 | 5.2 Dispatch | Admin | Edge | All | Dispatch at scale | Auto-dispatch 50 requests | All dispatched correctly | | | |
| ESTO-S05-CR-1005 | 5.2 Dispatch | Admin | Cross-Role | All | -- | Admin assigns; User notified | User receives assignment notification | | | |
| ESTO-S05-CR-1006 | 5.2 Dispatch | Broker | Cross-Role | All | -- | Broker completes; Admin sees stats | Admin sees completion in dashboard | | | |
| ESTO-S05-CR-1007 | 5.2 Dispatch | User | Cross-Role | All | -- | User views broker info after assignment | Broker contact info displayed | | | |
| ESTO-S05-CR-1008 | 5.2 Dispatch | Admin | Cross-Role | All | -- | Admin re-assigns; old broker notified | Old broker receives notification | | | |
| ESTO-S05-CR-1009 | 5.2 Dispatch | Broker | Cross-Role | All | -- | Broker declines; Admin reassigns | Request re-enters queue | | | |
| ESTO-S05-CR-1010 | 5.2 Dispatch | User | Cross-Role | All | -- | User requests different broker | Request submitted to admin | | | |

### 5.3 Broker Profile & Verification (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S05-HP-1011 | 5.3 BrokerProfile | Broker | Happy | All | Broker logged in | View broker profile | Profile displayed with all info | | | |
| ESTO-S05-HP-1012 | 5.3 BrokerProfile | Broker | Happy | All | Profile exists | Update broker profile | Profile updated successfully | | | |
| ESTO-S05-HP-1013 | 5.3 BrokerProfile | Broker | Happy | All | Profile configured | Upload profile photo | Photo uploaded and displayed | | | |
| ESTO-S05-HP-1014 | 5.3 BrokerProfile | Broker | Happy | All | Profile configured | Add license/credentials | Credentials added; verification requested | | | |
| ESTO-S05-HP-1015 | 5.3 BrokerProfile | Broker | Happy | All | Verified broker | View verification badge | Verification badge displayed | | | |
| ESTO-S05-HP-1016 | 5.3 BrokerProfile | Broker | Happy | All | Has properties | View assigned properties | All assigned properties listed | | | |
| ESTO-S05-HP-1017 | 5.3 BrokerProfile | Broker | Happy | All | Has performance data | View broker analytics | Analytics dashboard displayed | | | |
| ESTO-S05-HP-1018 | 5.3 BrokerProfile | Broker | Happy | All | Has transactions | View transaction history | All transactions listed | | | |
| ESTO-S05-EM-1019 | 5.3 BrokerProfile | Broker | Empty | All | -- | View profile with no data | Profile with default/empty values | | | |
| ESTO-S05-EM-1020 | 5.3 BrokerProfile | Guest | Empty | All | -- | Access broker profile without auth | Redirected to /login | | | |
| ESTO-S05-ER-1021 | 5.3 BrokerProfile | Broker | Error | All | Broker service down | View profile | Error toast; cached data if available | | | |
| ESTO-S05-ER-1022 | 5.3 BrokerProfile | Guest | Error | All | -- | XSS in profile description | Input escaped; no XSS | | | Security |
| ESTO-S05-ER-1023 | 5.3 BrokerProfile | Broker | Error | All | Network offline | Update profile | Network error; data preserved | | | |
| ESTO-S05-ER-1024 | 5.3 BrokerProfile | Guest | Error | All | -- | Upload oversized photo | Error: File too large | | | |
| ESTO-S05-ER-1025 | 5.3 BrokerProfile | Broker | Error | All | Mock backend | Mock 500 on profile update | Error toast; form retains data | | | |
| ESTO-S05-ED-1026 | 5.3 BrokerProfile | Broker | Edge | All | Profile exists | Update profile with unicode name | Unicode handled correctly | | | |
| ESTO-S05-ED-1027 | 5.3 BrokerProfile | Guest | Edge | All | Profile exists | View broker profile with 100 properties | Profile loads; pagination works | | | |
| ESTO-S05-ED-1028 | 5.3 BrokerProfile | Broker | Edge | All | Profile exists | Rapid profile updates | No race condition; last update wins | | | |
| ESTO-S05-ED-1029 | 5.3 BrokerProfile | Guest | Edge | All | Profile exists | View with very long bio | Bio truncated or scrollable | | | |
| ESTO-S05-CR-1030 | 5.3 BrokerProfile | Broker | Cross-Role | All | -- | User views broker profile | Public info displayed | | | |
| ESTO-S05-CR-1031 | 5.3 BrokerProfile | Admin | Cross-Role | All | -- | Admin views broker profile | Admin sees full profile + actions | | | |
| ESTO-S05-CR-1032 | 5.3 BrokerProfile | Broker | Cross-Role | All | -- | Broker updates profile; User sees change | User sees updated profile | | | |
| ESTO-S05-CR-1033 | 5.3 BrokerProfile | Guest | Cross-Role | All | -- | Admin verifies broker; badge shown | Verification badge appears on profile | | | |
| ESTO-S05-CR-1034 | 5.3 BrokerProfile | Broker | Cross-Role | All | -- | Broker deactivates profile; User sees inactive | Profile marked as inactive | | | |
| ESTO-S05-CR-1035 | 5.3 BrokerProfile | User | Cross-Role | All | -- | User rates broker; rating displayed | Rating shown on broker profile | | | |

### 5.4 Broker Communications (60)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S05-HP-1036 | 5.4 BrokerComm | User | Happy | All | Broker assigned | Send message to broker | Message sent successfully | | | |
| ESTO-S05-HP-1037 | 5.4 BrokerComm | Broker | Happy | All | Message received | Reply to user message | Reply sent successfully | | | |
| ESTO-S05-HP-1038 | 5.4 BrokerComm | User | Happy | All | Conversation exists | View message history | All messages displayed | | | |
| ESTO-S05-HP-1039 | 5.4 BrokerComm | Broker | Happy | All | Has conversations | View all conversations | All conversations listed | | | |
| ESTO-S05-HP-1040 | 5.4 BrokerComm | User | Happy | All | Message received | Receive real-time notification | Notification appears immediately | | | |
| ESTO-S05-HP-1041 | 5.4 BrokerComm | Broker | Happy | All | Conversation open | Share property via message | Property card embedded in message | | | |
| ESTO-S05-HP-1042 | 5.4 BrokerComm | User | Happy | All | Conversation active | Schedule viewing via message | Viewing scheduled from chat | | | |
| ESTO-S05-EM-1043 | 5.4 BrokerComm | User | Empty | All | -- | Send message without broker assigned | Error: No broker assigned | | | |
| ESTO-S05-EM-1044 | 5.4 BrokerComm | Guest | Empty | All | -- | Access messaging without auth | Redirected to /login | | | |
| ESTO-S05-EM-1045 | 5.4 BrokerComm | Broker | Empty | All | -- | View messages with no conversations | Empty state displayed | | | |
| ESTO-S05-ER-1046 | 5.4 BrokerComm | User | Error | All | Messaging service down | Send message | Error toast; retry option | | | |
| ESTO-S05-ER-1047 | 5.4 BrokerComm | Broker | Error | All | Network offline | Send message | Network error; queued | | | |
| ESTO-S05-ER-1048 | 5.4 BrokerComm | User | Error | All | Mock backend | Mock 500 on message send | Error toast; no crash | | | |
| ESTO-S05-ER-1049 | 5.4 BrokerComm | Broker | Error | All | -- | XSS in message content | Input escaped; no XSS | | | Security |
| ESTO-S05-ER-1050 | 5.4 BrokerComm | User | Error | All | -- | Send message to deactivated broker | Error: Broker no longer available | | | |
| ESTO-S05-ED-1051 | 5.4 BrokerComm | User | Edge | All | Conversation active | Send 1000-char message | Message sent; displayed correctly | | | |
| ESTO-S05-ED-1052 | 5.4 BrokerComm | Broker | Edge | All | Conversation active | Rapid message sending | All messages queued and sent | | | |
| ESTO-S05-ED-1053 | 5.4 BrokerComm | User | Edge | All | Conversation active | Send message with emoji | Emoji displayed correctly | | | |
| ESTO-S05-ED-1054 | 5.4 BrokerComm | Broker | Edge | All | Conversation active | Send message with attachment | Attachment sent successfully | | | |
| ESTO-S05-CR-1055 | 5.4 BrokerComm | User | Cross-Role | All | -- | User messages broker; Admin monitors | Admin can view conversation | | | |
| ESTO-S05-CR-1056 | 5.4 BrokerComm | Broker | Cross-Role | All | -- | Broker messages user and manager | Both receive message | | | |
| ESTO-S05-CR-1057 | 5.4 BrokerComm | User | Cross-Role | All | -- | User sends; broker offline | Message queued; delivered when online | | | |
| ESTO-S05-CR-1058 | 5.4 BrokerComm | Broker | Cross-Role | All | -- | Broker messages multiple users | All users receive message | | | |
| ESTO-S05-CR-1059 | 5.4 BrokerComm | User | Cross-Role | All | -- | Conversation with Admin CC | Admin receives copy | | | |
| ESTO-S05-CR-1060 | 5.4 BrokerComm | Broker | Cross-Role | All | -- | Broker escalates to Admin | Escalation sent; Admin notified | | | |

### 5.5 Broker Performance & SLA (60)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S05-HP-1061 | 5.5 BrokerSLA | Admin | Happy | All | Broker active | View broker SLA compliance | SLA metrics displayed | | | |
| ESTO-S05-HP-1062 | 5.5 BrokerSLA | Admin | Happy | All | SLA configured | Set SLA for broker | SLA configured and enforced | | | |
| ESTO-S05-HP-1063 | 5.5 BrokerSLA | Admin | Happy | All | SLA breached | View breach report | Breach report generated | | | |
| ESTO-S05-HP-1064 | 5.5 BrokerSLA | Broker | Happy | All | SLA active | View own SLA metrics | Personal SLA metrics displayed | | | |
| ESTO-S05-HP-1065 | 5.5 BrokerSLA | Admin | Happy | All | Multiple brokers | View broker leaderboard | Leaderboard ranked correctly | | | |
| ESTO-S05-EM-1066 | 5.5 BrokerSLA | Admin | Empty | All | No brokers | View SLA dashboard | Empty state displayed | | | |
| ESTO-S05-ER-1067 | 5.5 BrokerSLA | Admin | Error | All | SLA service down | View SLA data | Error toast; cached data | | | |
| ESTO-S05-ER-1068 | 5.5 BrokerSLA | Broker | Error | All | Network offline | View own SLA | Cached data or error | | | |
| ESTO-S05-ED-1069 | 5.5 BrokerSLA | Admin | Edge | All | Many brokers | View SLA for all brokers | Pagination; performance OK | | | |
| ESTO-S05-CR-1070 | 5.5 BrokerSLA | Admin | Cross-Role | All | -- | Admin views broker SLA; broker views own | Both see appropriate data | | | |
| ESTO-S05-CR-1071 | 5.5 BrokerSLA | User | Cross-Role | All | -- | User sees broker rating in request | Rating displayed | | | |
| ESTO-S05-CR-1072 | 5.5 BrokerSLA | Admin | Cross-Role | All | -- | Admin adjusts SLA; broker notified | Broker notified of SLA change | | | |
| ESTO-S05-CR-1073 | 5.5 BrokerSLA | Broker | Cross-Role | All | -- | Broker breaches SLA; Admin alerted | Admin receives SLA breach alert | | | |
| ESTO-S05-CR-1074 | 5.5 BrokerSLA | User | Cross-Role | All | -- | User rates broker after interaction | Rating recorded; broker SLA updated | | | |
| ESTO-S05-CR-1075 | 5.5 BrokerSLA | Admin | Cross-Role | All | -- | Admin suspends broker for SLA breaches | Broker suspended; requests re-queued | | | |

---

## Section 6: Fast Track 24h Workflow (450)

### 6.1 Fast Track Request Initiation (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S06-HP-1076 | 6.1 FastTrack | User | Happy | All | Property with Fast Track | Click "Fast Track 24h" button | Fast Track form/wizard opens | | | |
| ESTO-S06-HP-1077 | 6.1 FastTrack | User | Happy | All | Fast Track form open | Fill in required details | Form validates and accepts input | | | |
| ESTO-S06-HP-1078 | 6.1 FastTrack | User | Happy | All | Form filled | Submit Fast Track request | Request created; confirmation shown | | | |
| ESTO-S06-HP-1079 | 6.1 FastTrack | User | Happy | All | Request submitted | View request in "My Fast Track" | Request listed with 24h timer | | | |
| ESTO-S06-HP-1080 | 6.1 FastTrack | User | Happy | All | Request submitted | Receive confirmation notification | Notification sent | | | |
| ESTO-S06-HP-1081 | 6.1 FastTrack | User | Happy | All | Request in progress | Track Fast Track progress | Progress bar/status shown | | | |
| ESTO-S06-HP-1082 | 6.1 FastTrack | User | Happy | All | Fast Track completed | Receive completion notification | Notification with next steps | | | |
| ESTO-S06-HP-1083 | 6.1 FastTrack | Manager | Happy | All | Fast Track request received | View Fast Track request in queue | Request displayed in manager dashboard | | | |
| ESTO-S06-HP-1084 | 6.1 FastTrack | Manager | Happy | All | Request in queue | Accept Fast Track request | Status updated; user notified | | | |
| ESTO-S06-HP-1085 | 6.1 FastTrack | Manager | Happy | All | Request accepted | Process Fast Track request | Processing steps initiated | | | |
| ESTO-S06-HP-1086 | 6.1 FastTrack | Manager | Happy | All | Processing complete | Mark Fast Track as completed | Status = completed; user notified | | | |
| ESTO-S06-HP-1087 | 6.1 FastTrack | Admin | Happy | All | Fast Track requests exist | View all Fast Track requests | All requests listed with status | | | |
| ESTO-S06-HP-1088 | 6.1 FastTrack | Admin | Happy | All | SLA monitoring | View Fast Track SLA metrics | SLA dashboard displayed | | | |
| ESTO-S06-EM-1089 | 6.1 FastTrack | User | Empty | All | -- | Submit Fast Track with empty form | Validation errors for required fields | | | |
| ESTO-S06-EM-1090 | 6.1 FastTrack | Guest | Empty | All | -- | Access Fast Track without auth | Redirected to /login | | | |
| ESTO-S06-EM-1091 | 6.1 FastTrack | User | Empty | All | -- | View Fast Track requests with no requests | Empty state displayed | | | |
| ESTO-S06-ER-1092 | 6.1 FastTrack | User | Error | All | Fast Track service down | Submit request | Error toast; retry option | | | |
| ESTO-S06-ER-1093 | 6.1 FastTrack | Guest | Error | All | Network offline | Submit request | Network error; data preserved | | | |
| ESTO-S06-ER-1094 | 6.1 FastTrack | User | Error | All | Mock backend | Mock 500 on submit | Error toast; form retains data | | | |
| ESTO-S06-ER-1095 | 6.1 FastTrack | Guest | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S06-ER-1096 | 6.1 FastTrack | User | Error | All | -- | XSS in Fast Track notes | Input escaped; no XSS | | | Security |
| ESTO-S06-ER-1097 | 6.1 FastTrack | Guest | Error | All | -- | Submit Fast Track for deleted property | Error: Property not available | | | |
| ESTO-S06-ER-1098 | 6.1 FastTrack | User | Error | All | -- | Double-click submit button | No duplicate request created | | | |
| ESTO-S06-ER-1099 | 6.1 FastTrack | Guest | Error | All | Mock backend | Mock 409 conflict | Error: Conflict; retry | | | |
| ESTO-S06-ER-1100 | 6.1 FastTrack | User | Error | All | -- | Submit Fast Track outside working hours | Accepted or error per policy | | | |
| ESTO-S06-ED-1101 | 6.1 FastTrack | User | Edge | All | Form open | Submit with max-length fields | All fields accepted at max length | | | |
| ESTO-S06-ED-1102 | 6.1 FastTrack | Guest | Edge | All | Form open | Submit with special chars | Fields sanitized | | | |
| ESTO-S06-ED-1103 | 6.1 FastTrack | User | Edge | All | Form open | Rapid form submissions | No duplicate requests | | | |
| ESTO-S06-ED-1104 | 6.1 FastTrack | Guest | Edge | All | Timer visible | Observe 24h countdown timer | Timer counts down accurately | | | |
| ESTO-S06-ED-1105 | 6.1 FastTrack | User | Edge | All | Request in progress | Close browser, reopen | Request status persists | | | |
| ESTO-S06-ED-1106 | 6.1 FastTrack | Guest | Edge | All | Request submitted | Cross-tab sync of Fast Track status | Both tabs show same status | | | |
| ESTO-S06-ED-1107 | 6.1 FastTrack | User | Edge | All | Request near deadline | Request at 23h 59m | Timer accurate; deadline enforced | | | |
| ESTO-S06-CR-1108 | 6.1 FastTrack | User | Cross-Role | All | -- | User submits; Manager sees request | Manager sees in queue | | | |
| ESTO-S06-CR-1109 | 6.1 FastTrack | Guest | Cross-Role | All | -- | Admin sees all Fast Track requests | Admin sees all platform Fast Track | | | |
| ESTO-S06-CR-1110 | 6.1 FastTrack | User | Cross-Role | All | -- | Two users submit simultaneously | Each request independent | | | |
| ESTO-S06-CR-1111 | 6.1 FastTrack | Guest | Cross-Role | All | -- | Manager extends deadline; user notified | User receives extension notification | | | |
| ESTO-S06-CR-1112 | 6.1 FastTrack | User | Cross-Role | All | -- | Fast Track completed; Admin sees metrics | Admin sees completion in dashboard | | | |
| ESTO-S06-CR-1113 | 6.1 FastTrack | Guest | Cross-Role | All | -- | Broker views Fast Track request | Broker sees request details | | | |
| ESTO-S06-CR-1114 | 6.1 FastTrack | User | Cross-Role | All | -- | User cancels Fast Track; Manager notified | Manager receives cancellation | | | |
| ESTO-S06-CR-1115 | 6.1 FastTrack | Guest | Cross-Role | All | -- | Admin SLA override on Fast Track | Override applied; metrics updated | | | |

### 6.2 Fast Track Progress Tracking (120)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S06-HP-1116 | 6.2 Progress | User | Happy | All | Fast Track in progress | View real-time progress | Progress bar/status updates | | | |
| ESTO-S06-HP-1117 | 6.2 Progress | User | Happy | All | Progress visible | View progress milestones | Milestones listed with completion | | | |
| ESTO-S06-HP-1118 | 6.2 Progress | Manager | Happy | All | Fast Track in progress | Update progress step | Progress updated; user notified | | | |
| ESTO-S06-HP-1119 | 6.2 Progress | Manager | Happy | All | Multiple Fast Tracks | View all active Fast Tracks | All active Fast Tracks listed | | | |
| ESTO-S06-HP-1120 | 6.2 Progress | Manager | Happy | All | Fast Track stuck | Escalate Fast Track | Escalation triggered; admin notified | | | |
| ESTO-S06-HP-1121 | 6.2 Progress | Manager | Happy | All | Fast Track completed | View completion summary | Summary with all steps and timing | | | |
| ESTO-S06-HP-1122 | 6.2 Progress | Admin | Happy | All | Fast Tracks exist | View Fast Track analytics | Analytics dashboard displayed | | | |
| ESTO-S06-HP-1123 | 6.2 Progress | Admin | Happy | All | SLA monitored | View SLA breach alerts | Breach alerts displayed | | | |
| ESTO-S06-HP-1124 | 6.2 Progress | User | Happy | All | Fast Track in progress | Receive status update notification | Notification sent on status change | | | |
| ESTO-S06-HP-1125 | 6.2 Progress | Manager | Happy | All | Fast Track in progress | Add internal notes | Notes saved; visible to team | | | |
| ESTO-S06-EM-1126 | 6.2 Progress | User | Empty | All | -- | View progress with no Fast Track | Empty state displayed | | | |
| ESTO-S06-EM-1127 | 6.2 Progress | Guest | Empty | All | -- | Access progress without auth | Redirected to /login | | | |
| ESTO-S06-ER-1128 | 6.2 Progress | User | Error | All | Progress service down | View progress | Error toast; cached status | | | |
| ESTO-S06-ER-1129 | 6.2 Progress | Manager | Error | All | Network offline | Update progress | Network error; retry | | | |
| ESTO-S06-ER-1130 | 6.2 Progress | User | Error | All | Mock backend | Mock 500 on progress | Error toast; no crash | | | |
| ESTO-S06-ER-1131 | 6.2 Progress | Manager | Error | All | -- | Update completed Fast Track | Error: Cannot update completed | | | |
| ESTO-S06-ER-1132 | 6.2 Progress | User | Error | All | Mock backend | Mock stale progress data | Stale data detected; refresh triggered | | | |
| ESTO-S06-ER-1133 | 6.2 Progress | Manager | Error | All | -- | Progress timer desync | Timer resynced with server | | | |
| ESTO-S06-ED-1134 | 6.2 Progress | User | Edge | All | Fast Track near deadline | View progress at 23h 55m | Urgency indicator displayed | | | |
| ESTO-S06-ED-1135 | 6.2 Progress | Manager | Edge | All | Fast Track at each milestone | Update each milestone step | Each step updates correctly | | | |
| ESTO-S06-ED-1136 | 6.2 Progress | User | Edge | All | Rapid progress page refresh | Refresh 10 times in 10s | Progress always current | | | |
| ESTO-S06-ED-1137 | 6.2 Progress | Manager | Edge | All | Multiple Fast Tracks | Switch between 10 Fast Tracks | Each progress loads correctly | | | |
| ESTO-S06-ED-1138 | 6.2 Progress | User | Edge | All | Progress on mobile | View progress on mobile | Mobile layout works | | | Mobile |
| ESTO-S06-ED-1139 | 6.2 Progress | Manager | Edge | All | Progress with accessibility tools | Navigate progress with keyboard | All milestones keyboard-accessible | | | A11y |
| ESTO-S06-ED-1140 | 6.2 Progress | User | Edge | All | Progress at midnight | Timer continues correctly across DST | Timer accurate | | | |
| ESTO-S06-CR-1141 | 6.2 Progress | User | Cross-Role | All | -- | User views progress; Admin monitors | Admin sees platform-wide progress | | | |
| ESTO-S06-CR-1142 | 6.2 Progress | Manager | Cross-Role | All | -- | Manager updates; User sees update | Real-time update in user view | | | |
| ESTO-S06-CR-1143 | 6.2 Progress | Admin | Cross-Role | All | -- | Admin escalates; Manager notified | Manager receives escalation | | | |
| ESTO-S06-CR-1144 | 6.2 Progress | User | Cross-Role | All | -- | User requests extension; Admin approves | Extension applied; timer updated | | | |
| ESTO-S06-CR-1145 | 6.2 Progress | Manager | Cross-Role | All | -- | Manager completes; User notified | User receives completion notification | | | |
| ESTO-S06-CR-1146 | 6.2 Progress | Admin | Cross-Role | All | -- | Admin views SLA breach; Manager penalized | SLA metrics updated | | | |
| ESTO-S06-CR-1147 | 6.2 Progress | User | Cross-Role | All | -- | Fast Track auto-escalates; Admin takes over | Admin takes control of Fast Track | | | |
| ESTO-S06-CR-1148 | 6.2 Progress | Manager | Cross-Role | All | -- | Manager delegates Fast Track step | Delegatee receives step assignment | | | |
| ESTO-S06-CR-1149 | 6.2 Progress | User | Cross-Role | All | -- | User receives SMS update on progress | SMS sent at configured milestones | | | |
| ESTO-S06-CR-1150 | 6.2 Progress | Admin | Cross-Role | All | -- | Admin views historical Fast Track data | Historical data accessible | | | |

### 6.3 Fast Track Document Upload & Verification (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S06-HP-1151 | 6.3 DocUpload | User | Happy | All | Fast Track in progress | Upload identity document | Document uploaded successfully | | | |
| ESTO-S06-HP-1152 | 6.3 DocUpload | User | Happy | All | Fast Track in progress | Upload address proof | Document uploaded successfully | | | |
| ESTO-S06-HP-1153 | 6.3 DocUpload | User | Happy | All | Fast Track in progress | Upload income proof | Document uploaded successfully | | | |
| ESTO-S06-HP-1154 | 6.3 DocUpload | User | Happy | All | Documents uploaded | Submit documents for verification | Documents submitted; status updated | | | |
| ESTO-S06-HP-1155 | 6.3 DocUpload | Manager | Happy | All | Documents submitted | Review submitted documents | Documents displayed for review | | | |
| ESTO-S06-HP-1156 | 6.3 DocUpload | Manager | Happy | All | Documents under review | Approve documents | Status updated; user notified | | | |
| ESTO-S06-HP-1157 | 6.3 DocUpload | Manager | Happy | All | Documents under review | Reject with reason | Status updated; reason sent to user | | | |
| ESTO-S06-HP-1158 | 6.3 DocUpload | User | Happy | All | Documents rejected | Resubmit corrected documents | Resubmission accepted | | | |
| ESTO-S06-HP-1159 | 6.3 DocUpload | User | Happy | All | Documents approved | Receive approval notification | Notification sent | | | |
| ESTO-S06-HP-1160 | 6.3 DocUpload | Manager | Happy | All | Document verified | Mark Fast Track step complete | Step marked complete; progress updated | | | |
| ESTO-S06-EM-1161 | 6.3 DocUpload | User | Empty | All | -- | Submit Fast Track without documents | Validation: Documents required | | | |
| ESTO-S06-EM-1162 | 6.3 DocUpload | Guest | Empty | All | -- | Upload document without auth | Redirected to /login | | | |
| ESTO-S06-EM-1163 | 6.3 DocUpload | User | Empty | All | -- | View document status with no uploads | Empty state displayed | | | |
| ESTO-S06-ER-1164 | 6.3 DocUpload | User | Error | All | Media service down | Upload document | Error toast; retry option | | | |
| ESTO-S06-ER-1165 | 6.3 DocUpload | Guest | Error | All | Network offline | Upload document | Network error; queued | | | |
| ESTO-S06-ER-1166 | 6.3 DocUpload | User | Error | All | -- | Upload unsupported file type | Error: Unsupported format | | | |
| ESTO-S06-ER-1167 | 6.3 DocUpload | Guest | Error | All | -- | Upload oversized file (>10MB) | Error: File too large | | | |
| ESTO-S06-ER-1168 | 6.3 DocUpload | User | Error | All | Mock backend | Mock 500 on upload | Error toast; no crash | | | |
| ESTO-S06-ER-1169 | 6.3 DocUpload | Guest | Error | All | Mock backend | Mock slow upload | Progress indicator; timeout handling | | | |
| ESTO-S06-ER-1170 | 6.3 DocUpload | User | Error | All | -- | Upload corrupted file | Error: File corrupted; retry | | | |
| ESTO-S06-ER-1171 | 6.3 DocUpload | Guest | Error | All | -- | Upload file with malicious name | Filename sanitized | | | Security |
| ESTO-S06-ER-1172 | 6.3 DocUpload | User | Error | All | -- | Upload virus-infected file | Error: File rejected by scanner | | | |
| ESTO-S06-ED-1173 | 6.3 DocUpload | User | Edge | All | Form open | Upload 10 documents at once | All uploaded successfully | | | |
| ESTO-S06-ED-1174 | 6.3 DocUpload | Guest | Edge | All | Form open | Upload PDF, JPG, PNG, DOCX | All formats accepted if supported | | | |
| ESTO-S06-ED-1175 | 6.3 DocUpload | User | Edge | All | Upload in progress | Cancel upload mid-way | Upload cancelled; no partial file | | | |
| ESTO-S06-ED-1176 | 6.3 DocUpload | Guest | Edge | All | Upload complete | Delete uploaded document | Document deleted successfully | | | |
| ESTO-S06-ED-1177 | 6.3 DocUpload | User | Edge | All | Slow network | Upload document on 3G | Upload with progress indicator | | | |
| ESTO-S06-ED-1178 | 6.3 DocUpload | Guest | Edge | All | Form open | Upload document with unicode filename | Uploaded with sanitized name | | | |
| ESTO-S06-CR-1179 | 6.3 DocUpload | User | Cross-Role | All | -- | User uploads; Manager reviews | Manager sees document in queue | | | |
| ESTO-S06-CR-1180 | 6.3 DocUpload | Guest | Cross-Role | All | -- | Admin views all document submissions | Admin sees all submissions | | | |
| ESTO-S06-CR-1181 | 6.3 DocUpload | User | Cross-Role | All | -- | Manager rejects; User resubmits | Resubmission workflow works | | | |
| ESTO-S06-CR-1182 | 6.3 DocUpload | Guest | Cross-Role | All | -- | Document verified; User and Manager notified | Both receive notification | | | |
| ESTO-S06-CR-1183 | 6.3 DocUpload | User | Cross-Role | All | -- | User replaces document before review | Replacement accepted; old removed | | | |
| ESTO-S06-CR-1184 | 6.3 DocUpload | Manager | Cross-Role | All | -- | Admin overrides document verification | Override applied; status updated | | | |
| ESTO-S06-CR-1185 | 6.3 DocUpload | Guest | Cross-Role | All | -- | Document with PII; Admin redacts | Admin can redact sensitive data | | | Security |

### 6.4 Fast Track Notifications & Alerts (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S06-HP-1186 | 6.4 Notif | User | Happy | All | Fast Track in progress | Receive progress update notification | Notification delivered via chosen channel | | | |
| ESTO-S06-HP-1187 | 6.4 Notif | User | Happy | All | Document approved | Receive approval notification | Notification delivered | | | |
| ESTO-S06-HP-1188 | 6.4 Notif | User | Happy | All | Fast Track completed | Receive completion notification | Notification with next steps | | | |
| ESTO-S06-HP-1189 | 6.4 Notif | Manager | Happy | All | New Fast Track request | Receive new request notification | Notification delivered | | | |
| ESTO-S06-HP-1190 | 6.4 Notif | Manager | Happy | All | Document submitted | Receive document notification | Notification delivered | | | |
| ESTO-S06-HP-1191 | 6.4 Notif | Manager | Happy | All | SLA approaching | Receive SLA warning | Warning notification delivered | | | |
| ESTO-S06-HP-1192 | 6.4 Notif | Manager | Happy | All | SLA breached | Receive SLA breach alert | Breach alert delivered | | | |
| ESTO-S06-HP-1193 | 6.4 Notif | Admin | Happy | All | Fast Track completed | Receive completion notification | Admin notified of completion | | | |
| ESTO-S06-HP-1194 | 6.4 Notif | Admin | Happy | All | SLA breached | Receive breach alert | Breach alert delivered | | | |
| ESTO-S06-HP-1195 | 6.4 Notif | User | Happy | All | Configure notification preferences | Set preferred channels | Preferences saved; notifications sent accordingly | | | |
| ESTO-S06-EM-1196 | 6.4 Notif | User | Empty | All | -- | View notifications with no Fast Track | Empty state displayed | | | |
| ESTO-S06-EM-1197 | 6.4 Notif | Guest | Empty | All | -- | Access notifications without auth | Redirected to /login | | | |
| ESTO-S06-ER-1198 | 6.4 Notif | User | Error | All | Notification service down | Receive notification | Notification queued; delivered when service up | | | |
| ESTO-S06-ER-1199 | 6.4 Notif | Manager | Error | All | Email service down | Receive email notification | Email queued; fallback channel used | | | |
| ESTO-S06-ER-1200 | 6.4 Notif | User | Error | All | SMS service down | Receive SMS notification | SMS queued; fallback used | | | |
| ESTO-S06-ER-1201 | 6.4 Notif | Manager | Error | All | Push service down | Receive push notification | Push queued; delivered when restored | | | |
| ESTO-S06-ER-1202 | 6.4 Notif | User | Error | All | Network offline | Receive notification | Notification stored; delivered on reconnect | | | |
| ESTO-S06-ER-1203 | 6.4 Notif | Guest | Error | All | Mock backend | Mock 500 on notification | Error logged; retry queued | | | |
| ESTO-S06-ED-1204 | 6.4 Notif | User | Edge | All | Notifications active | Receive 10 notifications in 1 minute | All notifications delivered | | | |
| ESTO-S06-ED-1205 | 6.4 Notif | Manager | Edge | All | Notifications active | Long notification message | Message truncated or scrollable | | | |
| ESTO-S06-ED-1206 | 6.4 Notif | User | Edge | All | Multiple channels | All channels fire simultaneously | All channels deliver notification | | | |
| ESTO-S06-ED-1207 | 6.4 Notif | Manager | Edge | All | Notification at midnight | Notification delivered at correct time | Time accurate across timezones | | | |
| ESTO-S06-ED-1208 | 6.4 Notif | User | Edge | All | Notification with special chars | Content displayed correctly | Special chars handled | | | |
| ESTO-S06-ED-1209 | 6.4 Notif | Manager | Edge | All | Notification during DST change | Timing correct across DST | No missed or duplicate notifications | | | |
| ESTO-S06-CR-1210 | 6.4 Notif | User | Cross-Role | All | -- | User receives; Manager sees read status | Manager sees notification read status | | | |
| ESTO-S06-CR-1211 | 6.4 Notif | Manager | Cross-Role | All | -- | Manager sends notification to user | User receives in-app notification | | | |
| ESTO-S06-CR-1212 | 6.4 Notif | Admin | Cross-Role | All | -- | Admin sends platform-wide notification | All users receive notification | | | |
| ESTO-S06-CR-1213 | 6.4 Notif | User | Cross-Role | All | -- | User mutes Fast Track notifications | No Fast Track notifications delivered | | | |
| ESTO-S06-CR-1214 | 6.4 Notif | Manager | Cross-Role | All | -- | Manager mutes; Admin override | Admin can override mute for critical | | | |
| ESTO-S06-CR-1215 | 6.4 Notif | User | Cross-Role | All | -- | Notification with deep link | Deep link opens correct page | | | |

### 6.5 Fast Track SLA & Escalation (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S06-HP-1216 | 6.5 SLA | Manager | Happy | All | SLA configured | View Fast Track SLA | SLA timer displayed | | | |
| ESTO-S06-HP-1217 | 6.5 SLA | Manager | Happy | All | SLA approaching | Receive SLA warning | Warning notification sent | | | |
| ESTO-S06-HP-1218 | 6.5 SLA | Manager | Happy | All | SLA breached | Escalate Fast Track | Escalation triggered; admin notified | | | |
| ESTO-S06-HP-1219 | 6.5 SLA | Admin | Happy | All | SLA breaches exist | View SLA breach report | Report generated with metrics | | | |
| ESTO-S06-HP-1220 | 6.5 SLA | Admin | Happy | All | SLA rules configured | Modify SLA rules | Rules updated; applied to new requests | | | |
| ESTO-S06-EM-1221 | 6.5 SLA | Admin | Empty | All | -- | View SLA with no Fast Track requests | Empty state displayed | | | |
| ESTO-S06-ER-1222 | 6.5 SLA | Manager | Error | All | SLA service down | View SLA timer | Error toast; fallback to estimated time | | | |
| ESTO-S06-ER-1223 | 6.5 SLA | Admin | Error | All | Network offline | View SLA report | Cached report or error | | | |
| ESTO-S06-ER-1224 | 6.5 SLA | Manager | Error | All | -- | Escalate completed Fast Track | Error: Cannot escalate completed | | | |
| ESTO-S06-ED-1225 | 6.5 SLA | Manager | Edge | All | SLA timer | View timer at 1 minute remaining | Urgency indicator; auto-escalation | | | |
| ESTO-S06-ED-1226 | 6.5 SLA | Admin | Edge | All | SLA rules | Create complex escalation rule | Rule created and applied | | | |
| ESTO-S06-ED-1227 | 6.5 SLA | Manager | Edge | All | Multiple SLAs | View SLAs for 50+ Fast Tracks | Pagination; performance OK | | | |
| ESTO-S06-CR-1228 | 6.5 SLA | Manager | Cross-Role | All | -- | Manager escalates; Admin sees alert | Admin sees escalation in dashboard | | | |
| ESTO-S06-CR-1229 | 6.5 SLA | Admin | Cross-Role | All | -- | Admin modifies SLA; Manager sees update | Manager's SLA timer updates | | | |
| ESTO-S06-CR-1230 | 6.5 SLA | User | Cross-Role | All | -- | SLA breached; User notified of delay | User receives delay notification | | | |
| ESTO-S06-CR-1231 | 6.5 SLA | Manager | Cross-Role | All | -- | SLA reset after escalation | Timer reset to new SLA window | | | |
| ESTO-S06-CR-1232 | 6.5 SLA | Admin | Cross-Role | All | -- | Admin exempts broker from SLA | Broker exempted; metrics updated | | | |
| ESTO-S06-CR-1233 | 6.5 SLA | User | Cross-Role | All | -- | Fast Track SLA vs user expectations | User informed of actual vs expected time | | | |
| ESTO-S06-CR-1234 | 6.5 SLA | Manager | Cross-Role | All | -- | Multiple SLA rules active | Correct rule applied per request type | | | |
| ESTO-S06-CR-1235 | 6.5 SLA | Admin | Cross-Role | All | -- | SLA analytics exported | Export contains accurate metrics | | | |

---

## Section 7: Messaging (300)

### 7.1 Chat & Conversations (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S07-HP-1236 | 7.1 Chat | User | Happy | All | Logged in | Navigate to messages | Message inbox loads | | | |
| ESTO-S07-HP-1237 | 7.1 Chat | User | Happy | All | Inbox loaded | View conversation list | All conversations listed with preview | | | |
| ESTO-S07-HP-1238 | 7.1 Chat | User | Happy | All | Conversation exists | Open conversation | Messages load with history | | | |
| ESTO-S07-HP-1239 | 7.1 Chat | User | Happy | All | Conversation open | Send text message | Message sent; appears in thread | | | |
| ESTO-S07-HP-1240 | 7.1 Chat | User | Happy | All | Conversation open | Send emoji message | Emoji displayed correctly | | | |
| ESTO-S07-HP-1241 | 7.1 Chat | User | Happy | All | Conversation open | Send image in message | Image sent and displayed | | | |
| ESTO-S07-HP-1242 | 7.1 Chat | User | Happy | All | Conversation open | Send document in message | Document sent and downloadable | | | |
| ESTO-S07-HP-1243 | 7.1 Chat | User | Happy | All | Has conversations | Search messages | Matching messages displayed | | | |
| ESTO-S07-HP-1244 | 7.1 Chat | User | Happy | All | Has conversations | Filter conversations by sender | Filtered list shown | | | |
| ESTO-S07-HP-1245 | 7.1 Chat | User | Happy | All | Conversation active | View typing indicator | Typing indicator shows when other types | | | |
| ESTO-S07-HP-1246 | 7.1 Chat | User | Happy | All | Conversation active | Receive real-time message | Message appears immediately | | | |
| ESTO-S07-HP-1247 | 7.1 Chat | User | Happy | All | Has unread messages | View unread count | Unread count shown in inbox | | | |
| ESTO-S07-HP-1248 | 7.1 Chat | User | Happy | All | Has unread messages | Mark conversation as read | Unread count cleared | | | |
| ESTO-S07-HP-1249 | 7.1 Chat | User | Happy | All | Conversation exists | Delete conversation | Conversation removed from list | | | |
| ESTO-S07-HP-1250 | 7.1 Chat | User | Happy | All | Conversation exists | Archive conversation | Conversation moved to archive | | | |
| ESTO-S07-HP-1251 | 7.1 Chat | User | Happy | All | Conversation exists | Forward message to another user | Message forwarded successfully | | | |
| ESTO-S07-HP-1252 | 7.1 Chat | Manager | Happy | All | Manager inbox | View all user conversations | All conversations listed | | | |
| ESTO-S07-HP-1253 | 7.1 Chat | Manager | Happy | All | User conversation | Respond to user message | Response sent; user receives it | | | |
| ESTO-S07-HP-1254 | 7.1 Chat | Admin | Happy | All | Admin access | View all platform conversations | All conversations visible to admin | | | |
| ESTO-S07-EM-1255 | 7.1 Chat | User | Empty | All | -- | View inbox with no conversations | Empty state displayed | | | |
| ESTO-S07-EM-1256 | 7.1 Chat | Guest | Empty | All | -- | Access messages without auth | Redirected to /login | | | |
| ESTO-S07-ER-1257 | 7.1 Chat | User | Error | All | Messaging service down | Send message | Error toast; message queued | | | |
| ESTO-S07-ER-1258 | 7.1 Chat | Guest | Error | All | WebSocket disconnected | Attempt real-time messaging | Reconnection attempted; message queued | | | |
| ESTO-S07-ER-1259 | 7.1 Chat | User | Error | All | Network offline | Send message | Network error; queued for retry | | | |
| ESTO-S07-ER-1260 | 7.1 Chat | Guest | Error | All | Mock backend | Mock 500 on message | Error toast; no crash | | | |
| ESTO-S07-ER-1261 | 7.1 Chat | User | Error | All | -- | XSS in message content | Input escaped; no XSS | | | Security |
| ESTO-S07-ER-1262 | 7.1 Chat | Guest | Error | All | -- | SQL injection in message | No SQL injection; error shown | | | Security |
| ESTO-S07-ER-1263 | 7.1 Chat | User | Error | All | -- | Send message to deactivated user | Error: User no longer available | | | |
| ESTO-S07-ER-1264 | 7.1 Chat | Guest | Error | All | -- | Send oversized message (50KB) | Error: Message too large | | | |
| ESTO-S07-ER-1265 | 7.1 Chat | User | Error | All | -- | Send message with malicious attachment | Attachment blocked; security warning | | | Security |
| ESTO-S07-ED-1266 | 7.1 Chat | User | Edge | All | Chat active | Send 1000-char message | Message sent; scrollable | | | |
| ESTO-S07-ED-1267 | 7.1 Chat | Guest | Edge | All | Chat active | Rapid message sending (50 in 1 min) | All messages delivered | | | |
| ESTO-S07-ED-1268 | 7.1 Chat | User | Edge | All | Chat active | Send message with mixed content | Content handled correctly | | | |
| ESTO-S07-ED-1269 | 7.1 Chat | Guest | Edge | All | Chat active | Chat with 1000+ messages | Pagination; scroll to load more | | | |
| ESTO-S07-ED-1270 | 7.1 Chat | User | Edge | All | Chat active | Search in 500+ message conversation | Search works across all messages | | | |
| ESTO-S07-ED-1271 | 7.1 Chat | Guest | Edge | All | Chat active | Chat on slow network (3G) | Messages load progressively | | | |
| ESTO-S07-ED-1272 | 7.1 Chat | User | Edge | All | Chat active | Chat with 20 participants | All messages visible; performance OK | | | |
| ESTO-S07-ED-1273 | 7.1 Chat | Guest | Edge | All | Chat active | Accessibility: keyboard navigation | All chat elements keyboard-accessible | | | A11y |
| ESTO-S07-ED-1274 | 7.1 Chat | User | Edge | All | Chat active | Screen reader navigation | Chat announced accessibly | | | A11y |
| ESTO-S07-ED-1275 | 7.1 Chat | Guest | Edge | All | Chat on mobile | Chat UI adapts to mobile | Mobile layout functional | | | Mobile |
| ESTO-S07-CR-1276 | 7.1 Chat | User | Cross-Role | All | -- | User messages Manager; Manager receives | Manager sees message in inbox | | | |
| ESTO-S07-CR-1277 | 7.1 Chat | Guest | Cross-Role | All | -- | Admin monitors conversation | Admin can view flagged conversations | | | Security |
| ESTO-S07-CR-1278 | 7.1 Chat | User | Cross-Role | All | -- | User messages Broker; Broker receives | Broker sees message in broker inbox | | | |
| ESTO-S07-CR-1279 | 7.1 Chat | Manager | Cross-Role | All | -- | Manager broadcasts to 100 users | All users receive message | | | |
| ESTO-S07-CR-1280 | 7.1 Chat | User | Cross-Role | All | -- | User deletes conversation; Manager's copy intact | Manager still sees conversation | | | |
| ESTO-S07-CR-1281 | 7.1 Chat | Guest | Cross-Role | All | -- | Admin sends system message to user | System message delivered | | | |
| ESTO-S07-CR-1282 | 7.1 Chat | User | Cross-Role | All | -- | Two users chat simultaneously | Independent conversation states | | | |
| ESTO-S07-CR-1283 | 7.1 Chat | Manager | Cross-Role | All | -- | Manager tags conversation for follow-up | Tag visible in conversation list | | | |
| ESTO-S07-CR-1284 | 7.1 Chat | User | Cross-Role | All | -- | User reports message; Admin sees report | Admin sees reported message | | | Security |
| ESTO-S07-CR-1285 | 7.1 Chat | Guest | Cross-Role | All | -- | Message with deep link to property | Deep link opens property page | | | |

### 7.2 Support Tickets & Live Chat (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S07-HP-1286 | 7.2 Support | User | Happy | All | Logged in | Open support ticket | Ticket created; confirmation shown | | | |
| ESTO-S07-HP-1287 | 7.2 Support | User | Happy | All | Ticket created | Add description and category | Description saved; category selected | | | |
| ESTO-S07-HP-1288 | 7.2 Support | User | Happy | All | Ticket submitted | Attach screenshots | Screenshots attached to ticket | | | |
| ESTO-S07-HP-1289 | 7.2 Support | User | Happy | All | Ticket submitted | View ticket in "My Tickets" | Ticket listed with status | | | |
| ESTO-S07-HP-1290 | 7.2 Support | User | Happy | All | Has tickets | Check ticket status | Status displayed correctly | | | |
| ESTO-S07-HP-1291 | 7.2 Support | Support | Happy | All | Tickets in queue | View support ticket queue | Queue displayed with all tickets | | | |
| ESTO-S07-HP-1292 | 7.2 Support | Support | Happy | All | Ticket in queue | Respond to ticket | Response sent; user notified | | | |
| ESTO-S07-HP-1293 | 7.2 Support | Support | Happy | All | Ticket responded | Update ticket status | Status updated; user sees change | | | |
| ESTO-S07-HP-1294 | 7.2 Support | Support | Happy | All | Ticket resolved | Close ticket | Ticket closed; user notified | | | |
| ESTO-S07-HP-1295 | 7.2 Support | User | Happy | All | Ticket closed | Reopen ticket | Ticket reopened; status updated | | | |
| ESTO-S07-HP-1296 | 7.2 Support | User | Happy | All | Support available | Start live chat | Live chat session opens | | | |
| ESTO-S07-HP-1297 | 7.2 Support | Support | Happy | All | Live chat active | Chat with user in real-time | Real-time chat works | | | |
| ESTO-S07-EM-1298 | 7.2 Support | User | Empty | All | -- | Open ticket with empty form | Validation errors displayed | | | |
| ESTO-S07-EM-1299 | 7.2 Support | Guest | Empty | All | -- | Access support without auth | Redirected to /login | | | |
| ESTO-S07-EM-1300 | 7.2 Support | User | Empty | All | -- | View tickets with no tickets | Empty state displayed | | | |
| ESTO-S07-ER-1301 | 7.2 Support | User | Error | All | Support service down | Open ticket | Error toast; retry option | | | |
| ESTO-S07-ER-1302 | 7.2 Support | Guest | Error | All | Network offline | Submit ticket | Network error; data preserved | | | |
| ESTO-S07-ER-1303 | 7.2 Support | User | Error | All | Mock backend | Mock 500 on ticket | Error toast; no crash | | | |
| ESTO-S07-ER-1304 | 7.2 Support | Guest | Error | All | -- | XSS in ticket description | Input escaped; no XSS | | | Security |
| ESTO-S07-ER-1305 | 7.2 Support | User | Error | All | Live chat service down | Start live chat | Error: Chat unavailable; try ticket | | | |
| ESTO-S07-ER-1306 | 7.2 Support | Guest | Error | All | -- | Upload infected file to ticket | Error: File rejected | | | |
| ESTO-S07-ER-1307 | 7.2 Support | User | Error | All | -- | Submit ticket with 100 attachments | Error: Too many attachments | | | |
| ESTO-S07-ER-1308 | 7.2 Support | Guest | Error | All | Mock backend | Mock timeout on chat | Chat disconnects; retry option | | | |
| ESTO-S07-ED-1309 | 7.2 Support | User | Edge | All | Ticket form | Submit ticket with 500-char description | Description saved | | | |
| ESTO-S07-ED-1310 | 7.2 Support | Guest | Edge | All | Ticket form | Submit with special chars in subject | Subject sanitized | | | |
| ESTO-S07-ED-1311 | 7.2 Support | User | Edge | All | Live chat | Chat for 2 hours continuously | Chat stable; no timeout | | | |
| ESTO-S07-ED-1312 | 7.2 Support | Guest | Edge | All | Live chat | Send 100 messages rapidly | All delivered; no rate limit | | | |
| ESTO-S07-ED-1313 | 7.2 Support | User | Edge | All | Ticket form | Attach 10 screenshots | All attached successfully | | | |
| ESTO-S07-ED-1314 | 7.2 Support | Guest | Edge | All | Live chat | Chat with slow network (3G) | Chat works with delays | | | |
| ESTO-S07-CR-1315 | 7.2 Support | User | Cross-Role | All | -- | User opens ticket; Support sees in queue | Support sees ticket immediately | | | |
| ESTO-S07-CR-1316 | 7.2 Support | Guest | Cross-Role | All | -- | Admin views all support tickets | Admin sees all platform tickets | | | |
| ESTO-S07-CR-1317 | 7.2 Support | User | Cross-Role | All | -- | Support escalates ticket; Admin notified | Admin receives escalation | | | |
| ESTO-S07-CR-1318 | 7.2 Support | Manager | Cross-Role | All | -- | Manager assigns support agent | Agent assigned; user notified | | | |
| ESTO-S07-CR-1319 | 7.2 Support | User | Cross-Role | All | -- | Ticket resolved; User rates support | Rating recorded | | | |
| ESTO-S07-CR-1320 | 7.2 Support | Guest | Cross-Role | All | -- | Live chat transferred to specialist | Transfer smooth; user not disrupted | | | |
| ESTO-S07-CR-1321 | 7.2 Support | User | Cross-Role | All | -- | User reopens ticket; new thread created | New thread linked to original | | | |
| ESTO-S07-CR-1322 | 7.2 Support | Manager | Cross-Role | All | -- | Manager sees ticket SLA | SLA displayed on ticket | | | |
| ESTO-S07-CR-1323 | 7.2 Support | User | Cross-Role | All | -- | Ticket with PII; Support handles securely | PII masked in non-secure views | | | Security |
| ESTO-S07-CR-1324 | 7.2 Support | Guest | Cross-Role | All | -- | Admin closes ticket without response | Closure recorded; user notified | | | |
| ESTO-S07-CR-1325 | 7.2 Support | User | Cross-Role | All | -- | Support ticket merged with another | Both tickets linked | | | |

### 7.3 Notifications Center (70)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S07-HP-1326 | 7.3 NotifCenter | User | Happy | All | Logged in | View notifications center | All notifications listed | | | |
| ESTO-S07-HP-1327 | 7.3 NotifCenter | User | Happy | All | Has notifications | Mark notification as read | Notification marked read; count updates | | | |
| ESTO-S07-HP-1328 | 7.3 NotifCenter | User | Happy | All | Has notifications | Mark all as read | All notifications marked read | | | |
| ESTO-S07-HP-1329 | 7.3 NotifCenter | User | Happy | All | Has notifications | Delete notification | Notification removed | | | |
| ESTO-S07-HP-1330 | 7.3 NotifCenter | User | Happy | All | Has notifications | Filter by type | Filtered list displayed | | | |
| ESTO-S07-HP-1331 | 7.3 NotifCenter | User | Happy | All | Has notifications | Click notification | Navigated to relevant page | | | |
| ESTO-S07-HP-1332 | 7.3 NotifCenter | User | Happy | All | Notifications configured | Configure notification preferences | Preferences saved | | | |
| ESTO-S07-HP-1333 | 7.3 NotifCenter | User | Happy | All | Preferences configured | Receive in-app notification | In-app notification displayed | | | |
| ESTO-S07-HP-1334 | 7.3 NotifCenter | User | Happy | All | Preferences configured | Receive email notification | Email received | | | |
| ESTO-S07-HP-1335 | 7.3 NotifCenter | User | Happy | All | Preferences configured | Receive SMS notification | SMS received | | | |
| ESTO-S07-HP-1336 | 7.3 NotifCenter | User | Happy | All | Preferences configured | Receive push notification | Push notification received | | | |
| ESTO-S07-EM-1337 | 7.3 NotifCenter | User | Empty | All | -- | View notifications with none | Empty state displayed | | | |
| ESTO-S07-EM-1338 | 7.3 NotifCenter | Guest | Empty | All | -- | Access notifications without auth | Redirected to /login | | | |
| ESTO-S07-ER-1339 | 7.3 NotifCenter | User | Error | All | Notification service down | View notifications | Error toast; cached notifications | | | |
| ESTO-S07-ER-1340 | 7.3 NotifCenter | Guest | Error | All | -- | XSS in notification content | Content escaped; no XSS | | | Security |
| ESTO-S07-ER-1341 | 7.3 NotifCenter | User | Error | All | Network offline | Receive notification | Notification stored; delivered on reconnect | | | |
| ESTO-S07-ER-1342 | 7.3 NotifCenter | Guest | Error | All | Push service down | Receive push notification | Fallback to in-app or email | | | |
| ESTO-S07-ED-1343 | 7.3 NotifCenter | User | Edge | All | Notifications active | Receive 50 notifications | All displayed; pagination works | | | |
| ESTO-S07-ED-1344 | 7.3 NotifCenter | Guest | Edge | All | Notifications active | Notification with 500-char body | Body displayed correctly | | | |
| ESTO-S07-ED-1345 | 7.3 NotifCenter | User | Edge | All | Notifications active | Notification at midnight | Delivered at correct time | | | |
| ESTO-S07-ED-1346 | 7.3 NotifCenter | Guest | Edge | All | Notifications active | Notification with deep link | Deep link navigates correctly | | | |
| ESTO-S07-CR-1347 | 7.3 NotifCenter | User | Cross-Role | All | -- | User and Admin receive same notification | Each gets role-appropriate notification | | | |
| ESTO-S07-CR-1348 | 7.3 NotifCenter | Manager | Cross-Role | All | -- | Manager sends notification to team | All team members receive notification | | | |
| ESTO-S07-CR-1349 | 7.3 NotifCenter | User | Cross-Role | All | -- | Admin sends platform-wide announcement | All users receive announcement | | | |
| ESTO-S07-CR-1350 | 7.3 NotifCenter | Guest | Cross-Role | All | -- | User mutes category; Admin override | Critical notifications still delivered | | | |
| ESTO-S07-CR-1351 | 7.3 NotifCenter | User | Cross-Role | All | -- | Notification with action button | Button navigates to correct action | | | |
| ESTO-S07-CR-1352 | 7.3 NotifCenter | Manager | Cross-Role | All | -- | Manager sees team notification analytics | Analytics dashboard shown | | | |
| ESTO-S07-CR-1353 | 7.3 NotifCenter | User | Cross-Role | All | -- | User deletes notification; Admin sees log | Admin sees deletion in audit log | | | Security |
| ESTO-S07-CR-1354 | 7.3 NotifCenter | Guest | Cross-Role | All | -- | Notification with image attachment | Image displayed in notification | | | |
| ESTO-S07-CR-1355 | 7.3 NotifCenter | User | Cross-Role | All | -- | Scheduled notification delivered on time | Delivered at scheduled time | | | |

---

## Section 8: Applications (Agent/Broker Applications) (350)

### 8.1 Application Submission (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S08-HP-1356 | 8.1 AppSubmit | User | Happy | All | Logged in | Navigate to applications page | Applications page loads | | | |
| ESTO-S08-HP-1357 | 8.1 AppSubmit | User | Happy | All | Page loaded | Start new application | Application form opens | | | |
| ESTO-S08-HP-1358 | 8.1 AppSubmit | User | Happy | All | Form open | Fill personal information | Form validates and saves input | | | |
| ESTO-S08-HP-1359 | 8.1 AppSubmit | User | Happy | All | Personal info filled | Fill professional information | Professional info saved | | | |
| ESTO-S08-HP-1360 | 8.1 AppSubmit | User | Happy | All | Professional info filled | Upload resume/CV | Document uploaded successfully | | | |
| ESTO-S08-HP-1361 | 8.1 AppSubmit | User | Happy | All | All info filled | Submit application | Application submitted; confirmation shown | | | |
| ESTO-S08-HP-1362 | 8.1 AppSubmit | User | Happy | All | Application submitted | View application in "My Applications" | Application listed with status | | | |
| ESTO-S08-HP-1363 | 8.1 AppSubmit | User | Happy | All | Application submitted | Receive submission confirmation | Confirmation notification/email sent | | | |
| ESTO-S08-HP-1364 | 8.1 AppSubmit | User | Happy | All | Application under review | View application status | Status displayed with progress | | | |
| ESTO-S08-HP-1365 | 8.1 AppSubmit | User | Happy | All | Application approved | Receive approval notification | Notification sent with next steps | | | |
| ESTO-S08-HP-1366 | 8.1 AppSubmit | User | Happy | All | Application rejected | View rejection reason | Reason displayed; appeal option | | | |
| ESTO-S08-HP-1367 | 8.1 AppSubmit | User | Happy | All | Application approved | Complete onboarding steps | Onboarding form opens | | | |
| ESTO-S08-HP-1368 | 8.1 AppSubmit | User | Happy | All | Application in progress | Save as draft | Draft saved; can resume later | | | |
| ESTO-S08-HP-1369 | 8.1 AppSubmit | User | Happy | All | Has draft | Resume draft application | Draft loaded; can continue | | | |
| ESTO-S08-HP-1370 | 8.1 AppSubmit | User | Happy | All | Application complete | Withdraw application | Withdrawal confirmed | | | |
| ESTO-S08-EM-1371 | 8.1 AppSubmit | User | Empty | All | -- | Submit application with empty form | Validation errors for required fields | | | |
| ESTO-S08-EM-1372 | 8.1 AppSubmit | Guest | Empty | All | -- | Access applications without auth | Redirected to /login | | | |
| ESTO-S08-EM-1373 | 8.1 AppSubmit | User | Empty | All | -- | View applications with no applications | Empty state displayed | | | |
| ESTO-S08-ER-1374 | 8.1 AppSubmit | User | Error | All | Application service down | Submit application | Error toast; retry option | | | |
| ESTO-S08-ER-1375 | 8.1 AppSubmit | Guest | Error | All | Network offline | Submit application | Network error; data preserved | | | |
| ESTO-S08-ER-1376 | 8.1 AppSubmit | User | Error | All | Mock backend | Mock 500 on submit | Error toast; form retains data | | | |
| ESTO-S08-ER-1377 | 8.1 AppSubmit | Guest | Error | All | -- | XSS in application form | Input escaped; no XSS | | | Security |
| ESTO-S08-ER-1378 | 8.1 AppSubmit | User | Error | All | -- | Upload oversized resume (>5MB) | Error: File too large | | | |
| ESTO-S08-ER-1379 | 8.1 AppSubmit | Guest | Error | All | -- | Upload unsupported file type | Error: Only PDF/DOC/DOCX allowed | | | |
| ESTO-S08-ER-1380 | 8.1 AppSubmit | User | Error | All | Mock backend | Mock slow submission | Loading state; timeout handling | | | |
| ESTO-S08-ER-1381 | 8.1 AppSubmit | Guest | Error | All | -- | Submit application with fake email | Error: Invalid email format | | | |
| ESTO-S08-ER-1382 | 8.1 AppSubmit | User | Error | All | -- | Submit duplicate application | Error: Already applied for this role | | | |
| ESTO-S08-ED-1383 | 8.1 AppSubmit | User | Edge | All | Form open | Submit with max-length fields | All fields accepted | | | |
| ESTO-S08-ED-1384 | 8.1 AppSubmit | Guest | Edge | All | Form open | Submit with special chars | Fields sanitized | | | |
| ESTO-S08-ED-1385 | 8.1 AppSubmit | User | Edge | All | Form open | Submit with unicode characters | Unicode handled correctly | | | |
| ESTO-S08-ED-1386 | 8.1 AppSubmit | Guest | Edge | All | Form open | Rapid form submissions | No duplicate applications | | | |
| ESTO-S08-ED-1387 | 8.1 AppSubmit | User | Edge | All | Draft exists | Save draft 10 times | All drafts saved correctly | | | |
| ESTO-S08-ED-1388 | 8.1 AppSubmit | Guest | Edge | All | Form open | Submit with 20 years of experience | Experience field accepts large values | | | |
| ESTO-S08-CR-1389 | 8.1 AppSubmit | User | Cross-Role | All | -- | User submits; Admin sees in queue | Admin sees application in review queue | | | |
| ESTO-S08-CR-1390 | 8.1 AppSubmit | Guest | Cross-Role | All | -- | Two users apply simultaneously | Each application independent | | | |
| ESTO-S08-CR-1391 | 8.1 AppSubmit | User | Cross-Role | All | -- | Admin reviews application; User sees status | Status updated for user | | | |
| ESTO-S08-CR-1392 | 8.1 AppSubmit | Guest | Cross-Role | All | -- | Manager views applications for their department | Manager sees department applications | | | |
| ESTO-S08-CR-1393 | 8.1 AppSubmit | User | Cross-Role | All | -- | Admin approves; User receives notification | Notification delivered | | | |
| ESTO-S08-CR-1394 | 8.1 AppSubmit | Guest | Cross-Role | All | -- | User withdraws; Admin sees in history | Withdrawal recorded | | | |
| ESTO-S08-CR-1395 | 8.1 AppSubmit | User | Cross-Role | All | -- | Application with PII; Admin handles securely | PII masked in non-secure views | | | Security |

### 8.2 Application Review & Processing (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S08-HP-1396 | 8.2 Review | Admin | Happy | All | Applications in queue | View application review queue | Queue displayed with all pending | | | |
| ESTO-S08-HP-1397 | 8.2 Review | Admin | Happy | All | Application in queue | View application details | All details displayed | | | |
| ESTO-S08-HP-1398 | 8.2 Review | Admin | Happy | All | Application reviewed | Approve application | Status = approved; user notified | | | |
| ESTO-S08-HP-1399 | 8.2 Review | Admin | Happy | All | Application reviewed | Reject with detailed reason | Status = rejected; reason recorded | | | |
| ESTO-S08-HP-1400 | 8.2 Review | Admin | Happy | All | Application needs info | Request additional information | Request sent to applicant | | | |
| ESTO-S08-HP-1401 | 8.2 Review | Admin | Happy | All | Application approved | Assign role to applicant | Role assigned; access granted | | | |
| ESTO-S08-HP-1402 | 8.2 Review | Admin | Happy | All | Multiple applications | Bulk approve applications | All approved; notifications sent | | | |
| ESTO-S08-HP-1403 | 8.2 Review | Admin | Happy | All | Multiple applications | Bulk reject applications | All rejected; reasons sent | | | |
| ESTO-S08-HP-1404 | 8.2 Review | Admin | Happy | All | Review complete | Add internal notes | Notes saved; visible to admin team | | | |
| ESTO-S08-HP-1405 | 8.2 Review | Admin | Happy | All | Applications reviewed | View review analytics | Analytics dashboard displayed | | | |
| ESTO-S08-EM-1406 | 8.2 Review | Admin | Empty | All | -- | View queue with no applications | Empty state displayed | | | |
| ESTO-S08-ER-1407 | 8.2 Review | Admin | Error | All | Review service down | View applications | Error toast; cached data | | | |
| ESTO-S08-ER-1408 | 8.2 Review | Admin | Error | All | Network offline | Approve application | Network error; retry | | | |
| ESTO-S08-ER-1409 | 8.2 Review | Admin | Error | All | -- | Approve already-approved application | Error: Already approved | | | |
| ESTO-S08-ER-1410 | 8.2 Review | Admin | Error | All | -- | Reject already-rejected application | Error: Already rejected | | | |
| ESTO-S08-ER-1411 | 8.2 Review | Admin | Error | All | -- | Assign invalid role | Error: Invalid role | | | |
| ESTO-S08-ER-1412 | 8.2 Review | Admin | Error | All | Mock backend | Mock 500 on approve | Error toast; no crash | | | |
| ESTO-S08-ER-1413 | 8.2 Review | Admin | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S08-ED-1414 | 8.2 Review | Admin | Edge | All | Large queue | Bulk approve 50 applications | All approved; notifications batched | | | |
| ESTO-S08-ED-1415 | 8.2 Review | Admin | Edge | All | Large queue | Bulk reject 50 applications | All rejected; reasons batched | | | |
| ESTO-S08-ED-1416 | 8.2 Review | Admin | Edge | All | Review form | Add 500-char review notes | Notes saved | | | |
| ESTO-S08-ED-1417 | 8.2 Review | Admin | Edge | All | Review queue | Rapid approve/reject actions | All actions processed correctly | | | |
| ESTO-S08-ED-1418 | 8.2 Review | Admin | Edge | All | Application with 50+ documents | Review all documents | All documents accessible | | | |
| ESTO-S08-CR-1419 | 8.2 Review | Admin | Cross-Role | All | -- | Admin approves; User notified | User receives approval notification | | | |
| ESTO-S08-CR-1420 | 8.2 Review | Admin | Cross-Role | All | -- | Admin rejects; User sees reason | Reason displayed in user dashboard | | | |
| ESTO-S08-CR-1421 | 8.2 Review | Admin | Cross-Role | All | -- | Admin requests info; User submits | User submits additional info | | | |
| ESTO-S08-CR-1422 | 8.2 Review | Manager | Cross-Role | All | -- | Manager recommends approval | Recommendation recorded; admin sees it | | | |
| ESTO-S08-CR-1423 | 8.2 Review | Admin | Cross-Role | All | -- | Admin overrides previous decision | Override logged; user notified | | | |
| ESTO-S08-CR-1424 | 8.2 Review | User | Cross-Role | All | -- | User appeals rejection; Admin reviews appeal | Appeal processed | | | |
| ESTO-S08-CR-1425 | 8.2 Review | Admin | Cross-Role | All | -- | Admin approves with conditions | Conditions displayed to user | | | |

### 8.3 Application Status & Tracking (80)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S08-HP-1426 | 8.3 AppStatus | User | Happy | All | Application submitted | View application status | Status displayed with progress | | | |
| ESTO-S08-HP-1427 | 8.3 AppStatus | User | Happy | All | Application under review | Receive status update | Notification sent | | | |
| ESTO-S08-HP-1428 | 8.3 AppStatus | User | Happy | All | Application approved | Complete post-approval steps | Onboarding steps accessible | | | |
| ESTO-S08-HP-1429 | 8.3 AppStatus | User | Happy | All | Application rejected | View detailed reason | Reason with evidence displayed | | | |
| ESTO-S08-HP-1430 | 8.3 AppStatus | User | Happy | All | Application withdrawn | View withdrawal confirmation | Confirmation displayed | | | |
| ESTO-S08-EM-1431 | 8.3 AppStatus | User | Empty | All | -- | View status with no applications | Empty state displayed | | | |
| ESTO-S08-ER-1432 | 8.3 AppStatus | User | Error | All | Status service down | View application status | Error toast; cached status | | | |
| ESTO-S08-ER-1433 | 8.3 AppStatus | Guest | Error | All | -- | Access status without auth | Redirected to /login | | | |
| ESTO-S08-ER-1434 | 8.3 AppStatus | User | Error | All | Mock backend | Mock 500 on status | Error toast; no crash | | | |
| ESTO-S08-ED-1435 | 8.3 AppStatus | User | Edge | All | Multiple applications | View status for 20 applications | All displayed; pagination works | | | |
| ESTO-S08-ED-1436 | 8.3 AppStatus | Guest | Edge | All | Application | Status changes in real-time | Status updates without refresh | | | |
| ESTO-S08-ED-1437 | 8.3 AppStatus | User | Edge | All | Application | Status at midnight | Status accurate across DST | | | |
| ESTO-S08-CR-1438 | 8.3 AppStatus | Admin | Cross-Role | All | -- | Admin views user's application status | Admin sees status + can override | | | |
| ESTO-S08-CR-1439 | 8.3 AppStatus | User | Cross-Role | All | -- | Manager views team application status | Manager sees team application statuses | | | |
| ESTO-S08-CR-1440 | 8.3 AppStatus | Admin | Cross-Role | All | -- | Status changed; Admin and User notified | Both receive notification | | | |
| ESTO-S08-CR-1441 | 8.3 AppStatus | Manager | Cross-Role | All | -- | Manager shortlists application | Application marked as shortlisted | | | |
| ESTO-S08-CR-1442 | 8.3 AppStatus | User | Cross-Role | All | -- | User sees application in "Archived" | Archived applications listed | | | |
| ESTO-S08-CR-1443 | 8.3 AppStatus | Admin | Cross-Role | All | -- | Admin exports application data | Export contains all application data | | | |
| ESTO-S08-CR-1444 | 8.3 AppStatus | Guest | Cross-Role | All | -- | Application with PII; data encrypted | PII encrypted at rest and in transit | | | Security |
| ESTO-S08-CR-1445 | 8.3 AppStatus | User | Cross-Role | All | -- | Application linked to property request | Link displayed in both views | | | |

### 8.4 Onboarding & Role Activation (70)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S08-HP-1446 | 8.4 Onboard | User | Happy | All | Application approved | Start onboarding | Onboarding wizard opens | | | |
| ESTO-S08-HP-1447 | 8.4 Onboard | User | Happy | All | Onboarding started | Complete profile setup | Profile created/updated | | | |
| ESTO-S08-HP-1448 | 8.4 Onboard | User | Happy | All | Profile setup done | Upload profile photo | Photo uploaded and displayed | | | |
| ESTO-S08-HP-1449 | 8.4 Onboard | User | Happy | All | Profile complete | Set notification preferences | Preferences saved | | | |
| ESTO-S08-HP-1450 | 8.4 Onboard | User | Happy | All | Preferences set | Complete onboarding | Onboarding marked complete | | | |
| ESTO-S08-HP-1451 | 8.4 Onboard | User | Happy | All | Onboarding complete | Access role-specific dashboard | Dashboard for new role loads | | | |
| ESTO-S08-EM-1452 | 8.4 Onboard | User | Empty | All | -- | Start onboarding without approved application | Error: No approved application | | | |
| ESTO-S08-ER-1453 | 8.4 Onboard | User | Error | All | Profile service down | Complete profile setup | Error toast; retry | | | |
| ESTO-S08-ER-1454 | 8.4 Onboard | User | Error | All | Network offline | Save onboarding progress | Network error; data preserved | | | |
| ESTO-S08-ER-1455 | 8.4 Onboard | Guest | Error | All | -- | XSS in onboarding form | Input escaped; no XSS | | | Security |
| ESTO-S08-ER-1456 | 8.4 Onboard | User | Error | All | -- | Upload oversized profile photo | Error: File too large | | | |
| ESTO-S08-ED-1457 | 8.4 Onboard | User | Edge | All | Onboarding open | Save progress and return later | Progress preserved; can resume | | | |
| ESTO-S08-ED-1458 | 8.4 Onboard | Guest | Edge | All | Onboarding open | Onboarding with unicode name | Name displayed correctly | | | |
| ESTO-S08-ED-1459 | 8.4 Onboard | User | Edge | All | Onboarding open | Skip optional steps | Optional steps skipped; required done | | | |
| ESTO-S08-ED-1460 | 8.4 Onboard | Guest | Edge | All | Onboarding open | Onboarding on mobile | Mobile layout works | | | Mobile |
| ESTO-S08-CR-1461 | 8.4 Onboard | User | Cross-Role | All | -- | User completes onboarding; Admin sees new user | Admin sees new user in user list | | | |
| ESTO-S08-CR-1462 | 8.4 Onboard | Manager | Cross-Role | All | -- | New broker onboarded; Manager sees | Manager sees new broker in list | | | |
| ESTO-S08-CR-1463 | 8.4 Onboard | User | Cross-Role | All | -- | Onboarding incomplete; Admin sends reminder | Reminder notification sent | | | |
| ESTO-S08-CR-1464 | 8.4 Onboard | Admin | Cross-Role | All | -- | Admin activates role manually | Role activated; user notified | | | |
| ESTO-S08-CR-1465 | 8.4 Onboard | User | Cross-Role | All | -- | Onboarding progress synced across tabs | Both tabs show same progress | | | |

---

## Section 9: Reviews & Ratings (200)

### 9.1 Property Reviews (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S09-HP-1466 | 9.1 PropReview | User | Happy | All | Stayed at property | Submit property review | Review submitted successfully | | | |
| ESTO-S09-HP-1467 | 9.1 PropReview | User | Happy | All | Review form open | Rate property (1-5 stars) | Rating saved; visual feedback shown | | | |
| ESTO-S09-HP-1468 | 9.1 PropReview | User | Happy | All | Review form open | Write review text | Text saved with review | | | |
| ESTO-S09-HP-1469 | 9.1 PropReview | User | Happy | All | Review submitted | Upload review photos | Photos attached to review | | | |
| ESTO-S09-HP-1470 | 9.1 PropReview | User | Happy | All | Review submitted | View own review | Review displayed with details | | | |
| ESTO-S09-HP-1471 | 9.1 PropReview | User | Happy | All | Has reviews | Edit own review | Review updated successfully | | | |
| ESTO-S09-HP-1472 | 9.1 PropReview | User | Happy | All | Review exists | Delete own review | Review removed; confirmation shown | | | |
| ESTO-S09-HP-1473 | 9.1 PropReview | User | Happy | All | Property has reviews | View all reviews for property | All reviews listed with ratings | | | |
| ESTO-S09-HP-1474 | 9.1 PropReview | User | Happy | All | Reviews available | Sort reviews by date/newest | Reviews sorted correctly | | | |
| ESTO-S09-HP-1475 | 9.1 PropReview | User | Happy | All | Reviews available | Sort reviews by rating | Reviews sorted by rating | | | |
| ESTO-S09-HP-1476 | 9.1 PropReview | User | Happy | All | Review available | Mark review as helpful | Helpful count incremented | | | |
| ESTO-S09-HP-1477 | 9.1 PropReview | User | Happy | All | Review available | Report review | Report submitted; admin notified | | | |
| ESTO-S09-HP-1478 | 9.1 PropReview | User | Happy | All | Reviews exist | Filter reviews by rating | Filtered reviews displayed | | | |
| ESTO-S09-HP-1479 | 9.1 PropReview | User | Happy | All | Review exists | Reply to a review (as manager) | Reply posted; visible on review | | | |
| ESTO-S09-HP-1480 | 9.1 PropReview | Manager | Happy | All | Property has reviews | Respond to review | Response posted publicly | | | |
| ESTO-S09-EM-1481 | 9.1 PropReview | User | Empty | All | -- | Submit review without staying at property | Validation: Must have booking | | | |
| ESTO-S09-EM-1482 | 9.1 PropReview | Guest | Empty | All | -- | Submit review without auth | Redirected to /login | | | |
| ESTO-S09-EM-1483 | 9.1 PropReview | User | Empty | All | -- | View reviews with no reviews | Empty state displayed | | | |
| ESTO-S09-ER-1484 | 9.1 PropReview | User | Error | All | Review service down | Submit review | Error toast; retry option | | | |
| ESTO-S09-ER-1485 | 9.1 PropReview | Guest | Error | All | Network offline | Submit review | Network error; data preserved | | | |
| ESTO-S09-ER-1486 | 9.1 PropReview | User | Error | All | Mock backend | Mock 500 on review | Error toast; no crash | | | |
| ESTO-S09-ER-1487 | 9.1 PropReview | Guest | Error | All | -- | XSS in review text | Input escaped; no XSS | | | Security |
| ESTO-S09-ER-1488 | 9.1 PropReview | User | Error | All | -- | Submit review with profanity | Content flagged; moderation queue | | | |
| ESTO-S09-ER-1489 | 9.1 PropReview | Guest | Error | All | -- | Review with oversized images | Error: Images too large | | | |
| ESTO-S09-ER-1490 | 9.1 PropReview | User | Error | All | -- | Submit duplicate review | Error: Already reviewed | | | |
| ESTO-S09-ER-1491 | 9.1 PropReview | Guest | Error | All | -- | Submit review for non-booked property | Error: No booking found | | | |
| ESTO-S09-ER-1492 | 9.1 PropReview | User | Error | All | -- | Submit review with 0 stars | Rating must be 1-5 | | | |
| ESTO-S09-ED-1493 | 9.1 PropReview | User | Edge | All | Review form | Submit review with 500-char text | Review saved | | | |
| ESTO-S09-ED-1494 | 9.1 PropReview | Guest | Edge | All | Review form | Submit with special chars in review | Review sanitized | | | |
| ESTO-S09-ED-1495 | 9.1 PropReview | User | Edge | All | Review form | Submit review with 10 photos | All photos attached | | | |
| ESTO-S09-ED-1496 | 9.1 PropReview | Guest | Edge | All | Reviews available | View 1000+ reviews | Pagination; performance OK | | | |
| ESTO-S09-ED-1497 | 9.1 PropReview | User | Edge | All | Review form | Submit review with emoji | Emoji handled correctly | | | |
| ESTO-S09-ED-1498 | 9.1 PropReview | Guest | Edge | All | Review form | Rapid review submissions | No duplicate reviews | | | |
| ESTO-S09-ED-1499 | 9.1 PropReview | User | Edge | All | Reviews display | View reviews in dark mode | Dark mode readable | | | |
| ESTO-S09-CR-1500 | 9.1 PropReview | User | Cross-Role | All | -- | User reviews; Admin sees in moderation | Admin sees flagged reviews | | | |
| ESTO-S09-CR-1501 | 9.1 PropReview | Manager | Cross-Role | All | -- | Manager replies; User notified | User receives reply notification | | | |
| ESTO-S09-CR-1502 | 9.1 PropReview | Admin | Cross-Role | All | -- | Admin removes review; User notified | User notified of removal with reason | | | |
| ESTO-S09-CR-1503 | 9.1 PropReview | User | Cross-Role | All | -- | Property rating updates; All users see change | Rating updated across platform | | | |
| ESTO-S09-CR-1504 | 9.1 PropReview | Manager | Cross-Role | All | -- | Manager sees property rating trend | Trend displayed in manager dashboard | | | |
| ESTO-S09-CR-1505 | 9.1 PropReview | User | Cross-Role | All | -- | Review edited; Admin sees edit history | Admin sees edit history | | | |

### 9.2 Broker/Agent Reviews (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S09-HP-1506 | 9.2 BrokerReview | User | Happy | All | Interacted with broker | Submit broker review | Review submitted successfully | | | |
| ESTO-S09-HP-1507 | 9.2 BrokerReview | User | Happy | All | Review form open | Rate broker (1-5 stars) | Rating saved | | | |
| ESTO-S09-HP-1508 | 9.2 BrokerReview | User | Happy | All | Review form open | Write review text | Text saved | | | |
| ESTO-S09-HP-1509 | 9.2 BrokerReview | User | Happy | All | Has reviews | View broker's reviews | All reviews listed | | | |
| ESTO-S09-HP-1510 | 9.2 BrokerReview | User | Happy | All | Review submitted | Edit own review | Review updated | | | |
| ESTO-S09-HP-1511 | 9.2 BrokerReview | User | Happy | All | Review exists | Delete own review | Review removed | | | |
| ESTO-S09-EM-1512 | 9.2 BrokerReview | User | Empty | All | -- | Submit broker review without interaction | Validation: Must have interaction | | | |
| ESTO-S09-ER-1513 | 9.2 BrokerReview | User | Error | All | Review service down | Submit review | Error toast; retry | | | |
| ESTO-S09-ER-1514 | 9.2 BrokerReview | Guest | Error | All | -- | XSS in broker review | Input escaped; no XSS | | | Security |
| ESTO-S09-ED-1515 | 9.2 BrokerReview | User | Edge | All | Review form | Submit review with unicode text | Review displayed correctly | | | |
| ESTO-S09-ED-1516 | 9.2 BrokerReview | Guest | Edge | All | Reviews | View 500+ broker reviews | Pagination; performance OK | | | |
| ESTO-S09-CR-1517 | 9.2 BrokerReview | User | Cross-Role | All | -- | User reviews broker; Broker sees rating | Rating displayed on broker profile | | | |
| ESTO-S09-CR-1518 | 9.2 BrokerReview | Admin | Cross-Role | All | -- | Admin sees broker review analytics | Analytics dashboard displayed | | | |
| ESTO-S09-CR-1519 | 9.2 BrokerReview | User | Cross-Role | All | -- | Broker responds to review | Response visible on review | | | |
| ESTO-S09-CR-1520 | 9.2 BrokerReview | Manager | Cross-Role | All | -- | Manager sees team broker ratings | Team ratings displayed | | | |

### 9.3 Review Moderation (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S09-HP-1521 | 9.3 Moderation | Admin | Happy | All | Flagged reviews exist | View moderation queue | Queue displayed with flagged reviews | | | |
| ESTO-S09-HP-1522 | 9.3 Moderation | Admin | Happy | All | Review flagged | Approve flagged review | Review restored; user notified | | | |
| ESTO-S09-HP-1523 | 9.3 Moderation | Admin | Happy | All | Review flagged | Remove flagged review | Review removed; user notified | | | |
| ESTO-S09-HP-1524 | 9.3 Moderation | Admin | Happy | All | Review flagged | Edit review content | Content edited; edit history logged | | | |
| ESTO-S09-HP-1525 | 9.3 Moderation | Admin | Happy | All | Multiple flagged | Bulk approve reviews | All approved; notifications sent | | | |
| ESTO-S09-EM-1526 | 9.3 Moderation | Admin | Empty | All | -- | View moderation queue with no flags | Empty state displayed | | | |
| ESTO-S09-ER-1527 | 9.3 Moderation | Admin | Error | All | Moderation service down | View queue | Error toast; cached data | | | |
| ESTO-S09-ER-1528 | 9.3 Moderation | Admin | Error | All | Network offline | Moderate review | Network error; retry | | | |
| ESTO-S09-ER-1529 | 9.3 Moderation | Admin | Error | All | -- | Moderate already-moderated review | Error: Already moderated | | | |
| ESTO-S09-ED-1530 | 9.3 Moderation | Admin | Edge | All | Large queue | Moderate 100 flagged reviews | All processed; batched notifications | | | |
| ESTO-S09-ED-1531 | 9.3 Moderation | Admin | Edge | All | Flagged reviews | Auto-moderate with rules | Automated moderation applied | | | |
| ESTO-S09-CR-1532 | 9.3 Moderation | Admin | Cross-Role | All | -- | Admin removes review; User notified | User receives removal notification | | | |
| ESTO-S09-CR-1533 | 9.3 Moderation | Manager | Cross-Role | All | -- | Manager reports review; Admin sees it | Review appears in admin queue | | | |
| ESTO-S09-CR-1534 | 9.3 Moderation | User | Cross-Role | All | -- | User's review moderated; User sees reason | Reason displayed in notification | | | |
| ESTO-S09-CR-1535 | 9.3 Moderation | Admin | Cross-Role | All | -- | Admin auto-moderates; Logs created | Audit log entries for all actions | | | Security |

---

## Section 10: Admin Management (550)

### 10.1 User Management (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S10-HP-1536 | 10.1 UserMgmt | Admin | Happy | All | Users exist | View user list | All users listed with details | | | |
| ESTO-S10-HP-1537 | 10.1 UserMgmt | Admin | Happy | All | User list loaded | Search users by name | Matching users displayed | | | |
| ESTO-S10-HP-1538 | 10.1 UserMgmt | Admin | Happy | All | User list loaded | Filter users by role | Filtered list displayed | | | |
| ESTO-S10-HP-1539 | 10.1 UserMgmt | Admin | Happy | All | User selected | View user details | Full user profile displayed | | | |
| ESTO-S10-HP-1540 | 10.1 UserMgmt | Admin | Happy | All | User details viewed | Edit user role | Role updated; user sees new role | | | |
| ESTO-S10-HP-1541 | 10.1 UserMgmt | Admin | Happy | All | User details viewed | Edit user status | Status updated; access changes | | | |
| ESTO-S10-HP-1542 | 10.1 UserMgmt | Admin | Happy | All | User deactivated | Reactivate user | User reactivated; can log in | | | |
| ESTO-S10-HP-1543 | 10.1 UserMgmt | Admin | Happy | All | User selected | Delete user account | Account deleted; data retained per policy | | | |
| ESTO-S10-HP-1544 | 10.1 UserMgmt | Admin | Happy | All | Users exist | Export user list | CSV/JSON export generated | | | |
| ESTO-S10-HP-1545 | 10.1 UserMgmt | Admin | Happy | All | User analytics available | View user statistics | Dashboard with user metrics | | | |
| ESTO-S10-HP-1546 | 10.1 UserMgmt | Admin | Happy | All | User list loaded | Bulk select users | Multiple users selected | | | |
| ESTO-S10-HP-1547 | 10.1 UserMgmt | Admin | Happy | All | Users selected | Bulk update user roles | Roles updated for all selected | | | |
| ESTO-S10-HP-1548 | 10.1 UserMgmt | Admin | Happy | All | Users selected | Bulk deactivate users | All selected deactivated | | | |
| ESTO-S10-HP-1549 | 10.1 UserMgmt | Admin | Happy | All | Users exist | Send notification to specific user | Notification sent | | | |
| ESTO-S10-HP-1550 | 10.1 UserMgmt | Admin | Happy | All | User with bookings | View user's booking history | Booking history displayed | | | |
| ESTO-S10-HP-1551 | 10.1 UserMgmt | Admin | Happy | All | User with properties | View user's property list | Properties displayed | | | |
| ESTO-S10-HP-1552 | 10.1 UserMgmt | Admin | Happy | All | User with documents | View user's documents | Documents listed | | | |
| ESTO-S10-HP-1553 | 10.1 UserMgmt | Admin | Happy | All | User with reviews | View user's review history | Reviews displayed | | | |
| ESTO-S10-HP-1554 | 10.1 UserMgmt | Admin | Happy | All | User with activity | View user activity log | Activity log displayed | | | |
| ESTO-S10-HP-1555 | 10.1 UserMgmt | Admin | Happy | All | Suspicious user | Flag user account | Account flagged; notifications sent | | | |
| ESTO-S10-HP-1556 | 10.1 UserMgmt | Admin | Happy | All | Flagged user | View flagged user details | Flag details displayed | | | |
| ESTO-S10-HP-1557 | 10.1 UserMgmt | Admin | Happy | All | Suspicious activity | View user audit trail | Audit trail displayed | | | |
| ESTO-S10-HP-1558 | 10.1 UserMgmt | Admin | Happy | All | User banned | Lift user ban | User unbanned; access restored | | | |
| ESTO-S10-HP-1559 | 10.1 UserMgmt | Admin | Happy | All | User with verification | View user verification status | Verification status displayed | | | |
| ESTO-S10-HP-1560 | 10.1 UserMgmt | Admin | Happy | All | User verified | Revoke verification | Verification revoked; user notified | | | |
| ESTO-S10-EM-1561 | 10.1 UserMgmt | Admin | Empty | All | -- | View users with no users | Empty state displayed | | | |
| ESTO-S10-EM-1562 | 10.1 UserMgmt | Guest | Empty | All | -- | Access user management without auth | Redirected to /login | | | |
| ESTO-S10-ER-1563 | 10.1 UserMgmt | Admin | Error | All | User service down | View user list | Error toast; cached data | | | |
| ESTO-S10-ER-1564 | 10.1 UserMgmt | Guest | Error | All | Network offline | View users | Network error | | | |
| ESTO-S10-ER-1565 | 10.1 UserMgmt | Admin | Error | All | -- | Edit non-existent user | Error: User not found | | | |
| ESTO-S10-ER-1566 | 10.1 UserMgmt | Guest | Error | All | -- | Delete own account as Admin | Error: Cannot delete own account | | | |
| ESTO-S10-ER-1567 | 10.1 UserMgmt | Admin | Error | All | Mock backend | Mock 500 on user update | Error toast; no crash | | | |
| ESTO-S10-ER-1568 | 10.1 UserMgmt | Guest | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S10-ER-1569 | 10.1 UserMgmt | Admin | Error | All | -- | Delete last remaining admin | Error: Cannot delete last admin | | | |
| ESTO-S10-ER-1570 | 10.1 UserMgmt | Guest | Error | All | -- | Bulk delete all users | Error: Cannot delete all users | | | Security |
| ESTO-S10-ER-1571 | 10.1 UserMgmt | Admin | Error | All | -- | Set role to invalid value | Error: Invalid role | | | |
| ESTO-S10-ER-1572 | 10.1 UserMgmt | Guest | Error | All | -- | Export user list with PII | PII excluded or encrypted in export | | | Security |
| ESTO-S10-ED-1573 | 10.1 UserMgmt | Admin | Edge | All | Many users | View 10,000+ users | Pagination; performance OK | | | |
| ESTO-S10-ED-1574 | 10.1 UserMgmt | Guest | Edge | All | Many users | Search with special chars | Search handles special chars | | | |
| ESTO-S10-ED-1575 | 10.1 UserMgmt | Admin | Edge | All | User list | Rapid user selection and update | No race condition; final state correct | | | |
| ESTO-S10-ED-1576 | 10.1 UserMgmt | Guest | Edge | All | User list | Export with 50,000 users | Export generated; may be chunked | | | |
| ESTO-S10-ED-1577 | 10.1 UserMgmt | Admin | Edge | All | User list | User with 1000+ bookings | Pagination in activity view | | | |
| ESTO-S10-ED-1578 | 10.1 UserMgmt | Guest | Edge | All | User list | User with very long name | Name displayed/truncated correctly | | | |
| ESTO-S10-CR-1579 | 10.1 UserMgmt | Admin | Cross-Role | All | -- | Admin edits user; User sees change | User's profile updates | | | |
| ESTO-S10-CR-1580 | 10.1 UserMgmt | User | Cross-Role | All | -- | User deactivated; User sees message | User sees "Account deactivated" | | | |
| ESTO-S10-CR-1581 | 10.1 UserMgmt | Admin | Cross-Role | All | -- | Admin deletes user; Manager sees impact | Manager sees affected bookings/properties | | | |
| ESTO-S10-CR-1582 | 10.1 UserMgmt | User | Cross-Role | All | -- | User role changed; Dashboard updates | Dashboard reflects new role | | | |
| ESTO-S10-CR-1583 | 10.1 UserMgmt | Manager | Cross-Role | All | -- | Manager edits team member; Admin sees change | Admin sees updated team | | | |
| ESTO-S10-CR-1584 | 10.1 UserMgmt | Admin | Cross-Role | All | -- | Admin exports user data; PII protected | PII masked/encrypted in export | | | Security |
| ESTO-S10-CR-1585 | 10.1 UserMgmt | User | Cross-Role | All | -- | User flagged; User sees flag reason | User notified of flag with reason | | | |

### 10.2 Property Management (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S10-HP-1586 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | View property list | All properties listed with details | | | |
| ESTO-S10-HP-1587 | 10.2 PropMgmt | Admin | Happy | All | Property list loaded | Search properties by name | Matching properties displayed | | | |
| ESTO-S10-HP-1588 | 10.2 PropMgmt | Admin | Happy | All | Property list loaded | Filter properties by status | Filtered list displayed | | | |
| ESTO-S10-HP-1589 | 10.2 PropMgmt | Admin | Happy | All | Property selected | View property details | Full property details displayed | | | |
| ESTO-S10-HP-1590 | 10.2 PropMgmt | Admin | Happy | All | Property details viewed | Edit property details | Property updated | | | |
| ESTO-S10-HP-1591 | 10.2 PropMgmt | Admin | Happy | All | Property selected | Approve property listing | Status = approved; user notified | | | |
| ESTO-S10-HP-1592 | 10.2 PropMgmt | Admin | Happy | All | Property selected | Reject property listing | Status = rejected; reason sent to manager | | | |
| ESTO-S10-HP-1593 | 10.2 PropMgmt | Admin | Happy | All | Property selected | Feature property | Property marked as featured | | | |
| ESTO-S10-HP-1594 | 10.2 PropMgmt | Admin | Happy | All | Property selected | Archive property | Property archived; hidden from public | | | |
| ESTO-S10-HP-1595 | 10.2 PropMgmt | Admin | Happy | All | Property selected | Delete property | Property deleted; confirmation shown | | | |
| ESTO-S10-HP-1596 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | Bulk approve properties | All approved; notifications sent | | | |
| ESTO-S10-HP-1597 | 10.2 PropMgmt | Admin | Happy | All | Properties selected | Bulk reject properties | All rejected; reasons sent | | | |
| ESTO-S10-HP-1598 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | Export property list | Export generated with property data | | | |
| ESTO-S10-HP-1599 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | View property analytics | Analytics dashboard displayed | | | |
| ESTO-S10-HP-1600 | 10.2 PropMgmt | Admin | Happy | All | Property flagged | View flagged properties | Flagged properties listed | | | |
| ESTO-S10-HP-1601 | 10.2 PropMgmt | Admin | Happy | All | Property needs review | Request manager to update | Request sent to property manager | | | |
| ESTO-S10-HP-1602 | 10.2 PropMgmt | Admin | Happy | All | Pending properties | View pending approval queue | Queue displayed with all pending | | | |
| ESTO-S10-HP-1603 | 10.2 PropMgmt | Admin | Happy | All | Property details | View property image gallery | All images displayed | | | Ticket:#305 |
| ESTO-S10-HP-1604 | 10.2 PropMgmt | Admin | Happy | All | Property with reviews | View property reviews | Reviews displayed | | | |
| ESTO-S10-HP-1605 | 10.2 PropMgmt | Admin | Happy | All | Property with bookings | View property booking history | Booking history displayed | | | |
| ESTO-S10-HP-1606 | 10.2 PropMgmt | Admin | Happy | All | Property with broker | View assigned broker | Broker info displayed | | | |
| ESTO-S10-HP-1607 | 10.2 PropMgmt | Admin | Happy | All | Property with documents | View property documents | Documents listed | | | |
| ESTO-S10-HP-1608 | 10.2 PropMgmt | Admin | Happy | All | Property verified | View verification badge | Badge displayed | | | |
| ESTO-S10-HP-1609 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | View property activity log | Activity log displayed | | | |
| ESTO-S10-HP-1610 | 10.2 PropMgmt | Admin | Happy | All | Property reports exist | View property reports | Reports displayed with metrics | | | |
| ESTO-S10-HP-1611 | 10.2 PropMgmt | Admin | Happy | All | Multiple properties | Sort properties by date | Sorted list displayed | | | |
| ESTO-S10-HP-1612 | 10.2 PropMgmt | Admin | Happy | All | Multiple properties | Sort properties by price | Sorted list displayed | | | |
| ESTO-S10-HP-1613 | 10.2 PropMgmt | Admin | Happy | All | Multiple properties | Sort by rating | Sorted list displayed | | | |
| ESTO-S10-HP-1614 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | Bulk change property status | Status updated for all selected | | | |
| ESTO-S10-HP-1615 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | Assign broker to property | Broker assigned; manager notified | | | |
| ESTO-S10-HP-1616 | 10.2 PropMgmt | Admin | Happy | All | Properties exist | Change property manager | Manager updated | | | |
| ESTO-S10-EM-1617 | 10.2 PropMgmt | Admin | Empty | All | -- | View properties with none | Empty state displayed | | | |
| ESTO-S10-EM-1618 | 10.2 PropMgmt | Guest | Empty | All | -- | Access property management without auth | Redirected to /login | | | |
| ESTO-S10-ER-1619 | 10.2 PropMgmt | Admin | Error | All | Property service down | View properties | Error toast; cached data | | | |
| ESTO-S10-ER-1620 | 10.2 PropMgmt | Guest | Error | All | Network offline | Edit property | Network error; retry | | | |
| ESTO-S10-ER-1621 | 10.2 PropMgmt | Admin | Error | All | -- | Edit already-approved property | Warning: Property is live | | | |
| ESTO-S10-ER-1622 | 10.2 PropMgmt | Guest | Error | All | -- | Delete property with active bookings | Error: Cannot delete with active bookings | | | |
| ESTO-S10-ER-1623 | 10.2 PropMgmt | Admin | Error | All | Mock backend | Mock 500 on property update | Error toast; no crash | | | |
| ESTO-S10-ER-1624 | 10.2 PropMgmt | Guest | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S10-ER-1625 | 10.2 PropMgmt | Admin | Error | All | -- | Approve property with missing required fields | Error: Required fields missing | | | |
| ESTO-S10-ER-1626 | 10.2 PropMgmt | Guest | Error | All | -- | Bulk delete all properties | Error: Cannot delete all properties | | | Security |
| ESTO-S10-ED-1627 | 10.2 PropMgmt | Admin | Edge | All | Many properties | View 10,000+ properties | Pagination; performance OK | | | |
| ESTO-S10-ED-1628 | 10.2 PropMgmt | Guest | Edge | All | Property list | Property with 100 images | Gallery loads; lazy loading works | | | Ticket:#305 |
| ESTO-S10-ED-1629 | 10.2 PropMgmt | Admin | Edge | All | Property list | Rapid property status changes | No race condition; final state correct | | | |
| ESTO-S10-ED-1630 | 10.2 PropMgmt | Guest | Edge | All | Property list | Property with very long name/address | Text truncated or scrollable | | | |
| ESTO-S10-ED-1631 | 10.2 PropMgmt | Admin | Edge | All | Bulk operations | Bulk approve 100 properties | All approved; notifications batched | | | |
| ESTO-S10-ED-1632 | 10.2 PropMgmt | Guest | Edge | All | Property list | Property with unicode characters | Displayed correctly | | | |
| ESTO-S10-ED-1633 | 10.2 PropMgmt | Admin | Edge | All | Property list | Export 50,000 properties | Export generated; chunked if needed | | | |
| ESTO-S10-CR-1634 | 10.2 PropMgmt | Admin | Cross-Role | All | -- | Admin approves; Manager notified | Manager receives approval notification | | | |
| ESTO-S10-CR-1635 | 10.2 PropMgmt | Admin | Cross-Role | All | -- | Admin rejects; Manager sees reason | Reason displayed in manager dashboard | | | |
| ESTO-S10-CR-1636 | 10.2 PropMgmt | User | Cross-Role | All | -- | Admin archives property; User sees removed | Property removed from user's view | | | |
| ESTO-S10-CR-1637 | 10.2 PropMgmt | Manager | Cross-Role | All | -- | Admin features property; Manager sees boost | Manager sees "Featured" indicator | | | |
| ESTO-S10-CR-1638 | 10.2 PropMgmt | Admin | Cross-Role | All | -- | Admin assigns broker; Broker notified | Broker receives assignment | | | |
| ESTO-S10-CR-1639 | 10.2 PropMgmt | User | Cross-Role | All | -- | Admin edits property; User sees updated info | User sees updated property info | | | |
| ESTO-S10-CR-1640 | 10.2 PropMgmt | Manager | Cross-Role | All | -- | Admin changes manager; Old manager sees removal | Old manager loses access | | | |
| ESTO-S10-CR-1641 | 10.2 PropMgmt | Admin | Cross-Role | All | -- | Admin bulk approves; All managers notified | Each manager notified of their properties | | | |
| ESTO-S10-CR-1642 | 10.2 PropMgmt | User | Cross-Role | All | -- | Admin deletes property; User's saved copy removed | Saved/bookmarked copy removed | | | |
| ESTO-S10-CR-1643 | 10.2 PropMgmt | Manager | Cross-Role | All | -- | Admin updates verification; Manager sees badge | Manager sees verification badge update | | | |
| ESTO-S10-CR-1644 | 10.2 PropMgmt | Admin | Cross-Role | All | -- | Admin views property analytics; Manager sees stats | Manager sees property performance | | | |
| ESTO-S10-CR-1645 | 10.2 PropMgmt | User | Cross-Role | All | -- | Admin features property; User sees "Featured" badge | Badge displayed on property card | | | |

### 10.3 Booking & Contract Management (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S10-HP-1646 | 10.3 BookMgmt | Admin | Happy | All | Bookings exist | View all platform bookings | All bookings listed | | | |
| ESTO-S10-HP-1647 | 10.3 BookMgmt | Admin | Happy | All | Booking list loaded | Filter bookings by status | Filtered list displayed | | | |
| ESTO-S10-HP-1648 | 10.3 BookMgmt | Admin | Happy | All | Booking list loaded | Filter bookings by date range | Filtered by date range | | | |
| ESTO-S10-HP-1649 | 10.3 BookMgmt | Admin | Happy | All | Booking selected | View booking details | Full booking details displayed | | | |
| ESTO-S10-HP-1650 | 10.3 BookMgmt | Admin | Happy | All | Booking details viewed | Override booking status | Status overridden; parties notified | | | |
| ESTO-S10-HP-1651 | 10.3 BookMgmt | Admin | Happy | All | Booking under dispute | View dispute details | Dispute details displayed | | | |
| ESTO-S10-HP-1652 | 10.3 BookMgmt | Admin | Happy | All | Dispute exists | Resolve dispute | Dispute resolved; parties notified | | | |
| ESTO-S10-HP-1653 | 10.3 BookMgmt | Admin | Happy | All | Bookings exist | View booking analytics | Analytics dashboard displayed | | | |
| ESTO-S10-HP-1654 | 10.3 BookMgmt | Admin | Happy | All | Bookings exist | Export booking data | Export generated | | | |
| ESTO-S10-HP-1655 | 10.3 BookMgmt | Admin | Happy | All | Contracts exist | View all contracts | All contracts listed | | | |
| ESTO-S10-HP-1656 | 10.3 BookMgmt | Admin | Happy | All | Contract selected | View contract details | Contract details displayed | | | |
| ESTO-S10-HP-1657 | 10.3 BookMgmt | Admin | Happy | All | Contract selected | Void contract | Contract voided; parties notified | | | |
| ESTO-S10-HP-1658 | 10.3 BookMgmt | Admin | Happy | All | Contracts exist | Export contract data | Export generated | | | |
| ESTO-S10-EM-1659 | 10.3 BookMgmt | Admin | Empty | All | -- | View bookings with none | Empty state displayed | | | |
| ESTO-S10-EM-1660 | 10.3 BookMgmt | Guest | Empty | All | -- | Access booking management without auth | Redirected to /login | | | |
| ESTO-S10-ER-1661 | 10.3 BookMgmt | Admin | Error | All | Booking service down | View bookings | Error toast; cached data | | | |
| ESTO-S10-ER-1662 | 10.3 BookMgmt | Guest | Error | All | Network offline | Override booking status | Network error; retry | | | |
| ESTO-S10-ER-1663 | 10.3 BookMgmt | Admin | Error | All | Mock backend | Mock 500 on status update | Error toast; no crash | | | |
| ESTO-S10-ER-1664 | 10.3 BookMgmt | Guest | Error | All | -- | Void contract with active payments | Error: Cannot void with active payments | | | |
| ESTO-S10-ED-1665 | 10.3 BookMgmt | Admin | Edge | All | Many bookings | View 10,000+ bookings | Pagination; performance OK | | | |
| ESTO-S10-ED-1666 | 10.3 BookMgmt | Guest | Edge | All | Booking list | Rapid status overrides | No race condition; final state correct | | | |
| ESTO-S10-CR-1667 | 10.3 BookMgmt | Admin | Cross-Role | All | -- | Admin overrides; User notified | User receives override notification | | | |
| ESTO-S10-CR-1668 | 10.3 BookMgmt | Manager | Cross-Role | All | -- | Admin resolves dispute; Manager sees resolution | Manager sees resolution details | | | |
| ESTO-S10-CR-1669 | 10.3 BookMgmt | User | Cross-Role | All | -- | Admin voids contract; User receives notice | Notice sent with explanation | | | |
| ESTO-S10-CR-1670 | 10.3 BookMgmt | Admin | Cross-Role | All | -- | Admin refunds payment; User and Manager notified | Both receive refund notification | | | |
| ESTO-S10-CR-1671 | 10.3 BookMgmt | User | Cross-Role | All | -- | Admin extends booking; User sees new dates | Booking updated with new dates | | | |
| ESTO-S10-CR-1672 | 10.3 BookMgmt | Manager | Cross-Role | All | -- | Admin cancels booking; Manager sees impact | Manager sees cancelled booking | | | |
| ESTO-S10-CR-1673 | 10.3 BookMgmt | Admin | Cross-Role | All | -- | Admin generates booking report | Report generated with accurate data | | | |
| ESTO-S10-CR-1674 | 10.3 BookMgmt | User | Cross-Role | All | -- | Admin changes booking terms; User notified | User notified of new terms | | | |
| ESTO-S10-CR-1675 | 10.3 BookMgmt | Manager | Cross-Role | All | -- | Admin assigns different manager to booking | Manager change communicated | | | |

### 10.4 Analytics & Reporting (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S10-HP-1676 | 10.4 Analytics | Admin | Happy | All | Data available | View platform analytics dashboard | Dashboard with key metrics displayed | | | |
| ESTO-S10-HP-1677 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View user growth metrics | User growth chart displayed | | | |
| ESTO-S10-HP-1678 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View property listing metrics | Property metrics displayed | | | |
| ESTO-S10-HP-1679 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View booking conversion metrics | Conversion rates displayed | | | |
| ESTO-S10-HP-1680 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View revenue analytics | Revenue charts displayed | | | |
| ESTO-S10-HP-1681 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | Filter analytics by date range | Filtered analytics displayed | | | |
| ESTO-S10-HP-1682 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | Export analytics report | Report exported as PDF/CSV | | | |
| ESTO-S10-HP-1683 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | Schedule recurring reports | Schedule configured | | | |
| ESTO-S10-HP-1684 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View real-time metrics | Live updating metrics | | | |
| ESTO-S10-HP-1685 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | Drill down into specific metrics | Detailed view opens | | | |
| ESTO-S10-HP-1686 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | Compare date periods | Comparison chart displayed | | | |
| ESTO-S10-HP-1687 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View geographic distribution | Map/chart with distribution | | | |
| ESTO-S10-HP-1688 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View broker performance metrics | Broker performance displayed | | | |
| ESTO-S10-HP-1689 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View Fast Track metrics | Fast Track stats displayed | | | |
| ESTO-S10-HP-1690 | 10.4 Analytics | Admin | Happy | All | Dashboard loaded | View system health metrics | System health dashboard displayed | | | |
| ESTO-S10-EM-1691 | 10.4 Analytics | Admin | Empty | All | -- | View analytics with no data | Empty state with "no data yet" | | | |
| ESTO-S10-ER-1692 | 10.4 Analytics | Admin | Error | All | Analytics service down | View dashboard | Error toast; fallback message | | | |
| ESTO-S10-ER-1693 | 10.4 Analytics | Guest | Error | All | Network offline | Load analytics | Network error | | | |
| ESTO-S10-ER-1694 | 10.4 Analytics | Admin | Error | All | Mock backend | Mock 500 on analytics | Error toast; no crash | | | |
| ESTO-S10-ER-1695 | 10.4 Analytics | Guest | Error | All | -- | Export analytics without permission | Error: Insufficient permissions | | | Security |
| ESTO-S10-ED-1696 | 10.4 Analytics | Admin | Edge | All | Large dataset | View analytics with 1 year of data | Chart renders; performance acceptable | | | |
| ESTO-S10-ED-1697 | 10.4 Analytics | Guest | Edge | All | Dashboard | Dashboard with 50+ chart data points | All charts render correctly | | | |
| ESTO-S10-ED-1698 | 10.4 Analytics | Admin | Edge | All | Dashboard | Rapid date range changes | Charts update smoothly | | | |
| ESTO-S10-ED-1699 | 10.4 Analytics | Guest | Edge | All | Dashboard | Export with 100,000 data points | Export generated; may be chunked | | | |
| ESTO-S10-ED-1700 | 10.4 Analytics | Admin | Edge | All | Dashboard | Dashboard at midnight | Data for correct date period | | | |
| ESTO-S10-CR-1701 | 10.4 Analytics | Admin | Cross-Role | All | -- | Admin views analytics; Manager sees own stats | Manager sees department-level stats | | | |
| ESTO-S10-CR-1702 | 10.4 Analytics | Manager | Cross-Role | All | -- | Manager views team analytics | Team-specific analytics displayed | | | |
| ESTO-S10-CR-1703 | 10.4 Analytics | User | Cross-Role | All | -- | User cannot access admin analytics | Access denied | | | Security |
| ESTO-S10-CR-1704 | 10.4 Analytics | Admin | Cross-Role | All | -- | Admin exports; report encrypted in transit | Export encrypted during transmission | | | Security |
| ESTO-S10-CR-1705 | 10.4 Analytics | Manager | Cross-Role | All | -- | Manager views PII; data masked | PII masked in manager view | | | Security |

### 10.5 System Settings & Configuration (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S10-HP-1706 | 10.5 Settings | Admin | Happy | All | Admin logged in | Navigate to system settings | Settings page loads | | | |
| ESTO-S10-HP-1707 | 10.5 Settings | Admin | Happy | All | Settings page open | Update platform name | Name updated across platform | | | |
| ESTO-S10-HP-1708 | 10.5 Settings | Admin | Happy | All | Settings page open | Update contact email | Email updated; confirmation sent | | | |
| ESTO-S10-HP-1709 | 10.5 Settings | Admin | Happy | All | Settings page open | Update support phone | Phone updated | | | |
| ESTO-S10-HP-1710 | 10.5 Settings | Admin | Happy | All | Settings page open | Configure email templates | Templates updated | | | |
| ESTO-S10-HP-1711 | 10.5 Settings | Admin | Happy | All | Settings page open | Configure SMS templates | Templates updated | | | |
| ESTO-S10-HP-1712 | 10.5 Settings | Admin | Happy | All | Settings page open | Configure push notification settings | Settings updated | | | |
| ESTO-S10-HP-1713 | 10.5 Settings | Admin | Happy | All | Settings page open | Set platform maintenance mode | Maintenance mode enabled; users see notice | | | |
| ESTO-S10-HP-1714 | 10.5 Settings | Admin | Happy | All | Maintenance mode on | Disable maintenance mode | Platform reopens | | | |
| ESTO-S10-HP-1715 | 10.5 Settings | Admin | Happy | All | Settings page open | Configure SLA timers | SLA timers updated | | | |
| ESTO-S10-EM-1716 | 10.5 Settings | User | Empty | All | -- | Access system settings as User | Redirected to /dashboard | | | Security |
| ESTO-S10-ER-1717 | 10.5 Settings | Admin | Error | All | Config service down | Update settings | Error toast; retry | | | |
| ESTO-S10-ER-1718 | 10.5 Settings | Admin | Error | All | Network offline | Update settings | Network error; retry | | | |
| ESTO-S10-ER-1719 | 10.5 Settings | Admin | Error | All | -- | Set invalid maintenance mode | Error: Invalid value | | | |
| ESTO-S10-ER-1720 | 10.5 Settings | Admin | Error | All | Mock backend | Mock 500 on settings update | Error toast; no crash | | | |
| ESTO-S10-ED-1721 | 10.5 Settings | Admin | Edge | All | Settings page | Rapid setting changes | No race condition; final state correct | | | |
| ESTO-S10-ED-1722 | 10.5 Settings | Admin | Edge | All | Settings page | Update with special chars in values | Values sanitized | | | |
| ESTO-S10-CR-1723 | 10.5 Settings | Admin | Cross-Role | All | -- | Admin updates settings; All users see changes | Changes visible to all users | | | |
| ESTO-S10-CR-1724 | 10.5 Settings | Admin | Cross-Role | All | -- | Admin enables maintenance; Users see notice | Maintenance banner displayed | | | |
| ESTO-S10-CR-1725 | 10.5 Settings | Manager | Cross-Role | All | -- | Manager views system status page | Status page shows platform health | | | |

---

## Section 11: Wallet & Payments (200)

### 11.1 Wallet Management (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S11-HP-1726 | 11.1 Wallet | User | Happy | All | Wallet active | View wallet balance | Balance displayed correctly | | | |
| ESTO-S11-HP-1727 | 11.1 Wallet | User | Happy | All | Wallet exists | View transaction history | All transactions listed | | | |
| ESTO-S11-HP-1728 | 11.1 Wallet | User | Happy | All | Wallet active | Add funds to wallet | Funds added; balance updated | | | |
| ESTO-S11-HP-1729 | 11.1 Wallet | User | Happy | All | Wallet with balance | Withdraw funds | Withdrawal processed; balance updated | | | |
| ESTO-S11-HP-1730 | 11.1 Wallet | User | Happy | All | Wallet active | View wallet statement | Statement generated and downloadable | | | |
| ESTO-S11-HP-1731 | 11.1 Wallet | User | Happy | All | Wallet active | Set up auto-reload | Auto-reload configured | | | |
| ESTO-S11-HP-1732 | 11.1 Wallet | User | Happy | All | Wallet with transactions | Filter transactions by date | Filtered list displayed | | | |
| ESTO-S11-HP-1733 | 11.1 Wallet | User | Happy | All | Wallet with transactions | Filter by transaction type | Filtered by type (credit/debit) | | | |
| ESTO-S11-HP-1734 | 11.1 Wallet | User | Happy | All | Wallet with transactions | Search transactions | Matching transactions displayed | | | |
| ESTO-S11-HP-1735 | 11.1 Wallet | User | Happy | All | Wallet with transactions | Export transaction history | Export generated | | | |
| ESTO-S11-HP-1736 | 11.1 Wallet | User | Happy | All | Wallet active | View wallet limits | Limits displayed | | | |
| ESTO-S11-HP-1737 | 11.1 Wallet | User | Happy | All | Wallet active | Link bank account | Bank account linked successfully | | | |
| ESTO-S11-HP-1738 | 11.1 Wallet | User | Happy | All | Bank account linked | Remove bank account | Account removed; confirmation shown | | | |
| ESTO-S11-EM-1739 | 11.1 Wallet | User | Empty | All | -- | View wallet with no transactions | Empty state displayed | | | |
| ESTO-S11-EM-1740 | 11.1 Wallet | Guest | Empty | All | -- | Access wallet without auth | Redirected to /login | | | |
| ESTO-S11-ER-1741 | 11.1 Wallet | User | Error | All | Wallet service down | View wallet | Error toast; cached balance | | | |
| ESTO-S11-ER-1742 | 11.1 Wallet | Guest | Error | All | Network offline | Add funds | Network error; no charge made | | | |
| ESTO-S11-ER-1743 | 11.1 Wallet | User | Error | All | -- | Withdraw more than balance | Error: Insufficient balance | | | |
| ESTO-S11-ER-1744 | 11.1 Wallet | Guest | Error | All | -- | Add funds with tampered amount | Server validates; correct amount | | | Security |
| ESTO-S11-ER-1745 | 11.1 Wallet | User | Error | All | Mock backend | Mock 500 on transaction | Error toast; retry | | | |
| ESTO-S11-ER-1746 | 11.1 Wallet | Guest | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S11-ER-1747 | 11.1 Wallet | User | Error | All | Payment gateway down | Add funds | Error: Payment gateway unavailable | | | |
| ESTO-S11-ER-1748 | 11.1 Wallet | Guest | Error | All | -- | Withdraw to invalid bank account | Error: Invalid account | | | |
| ESTO-S11-ED-1749 | 11.1 Wallet | User | Edge | All | Wallet active | Add funds with large amount | Funds added correctly | | | |
| ESTO-S11-ED-1750 | 11.1 Wallet | Guest | Edge | All | Wallet active | Rapid transactions (10 in 1 min) | All processed; no race condition | | | |
| ESTO-S11-ED-1751 | 11.1 Wallet | User | Edge | All | Wallet active | Withdraw exact balance | Withdrawal succeeds; balance = 0 | | | |
| ESTO-S11-ED-1752 | 11.1 Wallet | Guest | Edge | All | Wallet active | Transaction at timezone boundary | Timestamp correct | | | |
| ESTO-S11-ED-1753 | 11.1 Wallet | User | Edge | All | Wallet active | Transaction across DST change | Amount and time correct | | | |
| ESTO-S11-CR-1754 | 11.1 Wallet | User | Cross-Role | All | -- | User adds funds; Admin sees in ledger | Admin sees transaction in financial view | | | |
| ESTO-S11-CR-1755 | 11.1 Wallet | Manager | Cross-Role | All | -- | Manager views user wallet balance | Balance displayed (if permitted) | | | Security |
| ESTO-S11-CR-1756 | 11.1 Wallet | User | Cross-Role | All | -- | Admin adjusts wallet balance | Adjustment logged; user notified | | | |
| ESTO-S11-CR-1757 | 11.1 Wallet | Guest | Cross-Role | All | -- | Refund processed; User and Admin notified | Both receive notification | | | |
| ESTO-S11-CR-1758 | 11.1 Wallet | User | Cross-Role | All | -- | Wallet linked to booking; payment auto-deducted | Auto-deduction works | | | |
| ESTO-S11-CR-1759 | 11.1 Wallet | Manager | Cross-Role | All | -- | Manager sees payment from user wallet | Manager sees payment confirmation | | | |
| ESTO-S11-CR-1760 | 11.1 Wallet | User | Cross-Role | All | -- | Wallet with pending transaction | Pending status shown; final on settlement | | | |
| ESTO-S11-CR-1761 | 11.1 Wallet | Admin | Cross-Role | All | -- | Admin freezes wallet | Wallet frozen; user notified | | | |
| ESTO-S11-CR-1762 | 11.1 Wallet | User | Cross-Role | All | -- | Wallet refund processed | Refund reflected in wallet | | | |
| ESTO-S11-CR-1763 | 11.1 Wallet | Manager | Cross-Role | All | -- | Wallet transaction fee applied | Fee visible in transaction | | | |
| ESTO-S11-CR-1764 | 11.1 Wallet | User | Cross-Role | All | -- | Wallet balance used for Fast Track fee | Fee deducted automatically | | | |
| ESTO-S11-CR-1765 | 11.1 Wallet | Admin | Cross-Role | All | -- | Admin views wallet audit log | Audit log with all wallet actions | | | Security |

### 11.2 Payment Methods (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S11-HP-1766 | 11.2 PayMethod | User | Happy | All | Payment gateway active | Add credit card | Card added successfully | | | |
| ESTO-S11-HP-1767 | 11.2 PayMethod | User | Happy | All | Card added | View saved payment methods | All saved methods listed | | | |
| ESTO-S11-HP-1768 | 11.2 PayMethod | User | Happy | All | Card saved | Make payment with saved card | Payment succeeds | | | |
| ESTO-S11-HP-1769 | 11.2 PayMethod | User | Happy | All | Card saved | Remove saved card | Card removed; confirmation shown | | | |
| ESTO-S11-HP-1770 | 11.2 PayMethod | User | Happy | All | Card saved | Set card as default | Default card updated | | | |
| ESTO-S11-HP-1771 | 11.2 PayMethod | User | Happy | All | Card added | Add UPI ID | UPI ID added successfully | | | |
| ESTO-S11-HP-1772 | 11.2 PayMethod | User | Happy | All | UPI added | Pay with UPI | UPI payment succeeds | | | |
| ESTO-S11-HP-1773 | 11.2 PayMethod | User | Happy | All | Card saved | View payment method security info | Security info displayed | | | Security |
| ESTO-S11-EM-1774 | 11.2 PayMethod | User | Empty | All | -- | View payment methods with none | Empty state displayed | | | |
| ESTO-S11-ER-1775 | 11.2 PayMethod | User | Error | All | Payment gateway down | Add payment method | Error: Gateway unavailable | | | |
| ESTO-S11-ER-1776 | 11.2 PayMethod | Guest | Error | All | -- | Add card with invalid number | Error: Invalid card number | | | |
| ESTO-S11-ER-1777 | 11.2 PayMethod | User | Error | All | -- | Add card with expired expiry | Error: Card expired | | | |
| ESTO-S11-ER-1778 | 11.2 PayMethod | Guest | Error | All | -- | Add card with invalid CVV | Error: Invalid CVV | | | |
| ESTO-S11-ER-1779 | 11.2 PayMethod | User | Error | All | -- | Add duplicate payment method | Error: Method already exists | | | |
| ESTO-S11-ER-1780 | 11.2 PayMethod | Guest | Error | All | Network offline | Add payment method | Network error; retry | | | |
| ESTO-S11-ED-1781 | 11.2 PayMethod | User | Edge | All | Card added | Add international card | Card accepted if supported | | | |
| ESTO-S11-ED-1782 | 11.2 PayMethod | Guest | Edge | All | Payment methods | Card with special characters in name | Name sanitized | | | |
| ESTO-S11-ED-1783 | 11.2 PayMethod | User | Edge | All | Payment methods | Rapid add/remove cards | No race condition; final state correct | | | |
| ESTO-S11-CR-1784 | 11.2 PayMethod | User | Cross-Role | All | -- | User adds card; Payment processed | Payment succeeds | | | |
| ESTO-S11-CR-1785 | 11.2 PayMethod | Admin | Cross-Role | All | -- | Admin views user payment methods | Methods listed (PCI-compliant display) | | | Security |
| ESTO-S11-CR-1786 | 11.2 PayMethod | User | Cross-Role | All | -- | User removes card; Admin sees in activity log | Removal logged | | | Security |
| ESTO-S11-CR-1787 | 11.2 PayMethod | Manager | Cross-Role | All | -- | Manager initiates payment from user's card | User receives payment notification | | | |
| ESTO-S11-CR-1788 | 11.2 PayMethod | User | Cross-Role | All | -- | Card details updated; re-curation triggered | Re-curation succeeds | | | |
| ESTO-S11-CR-1789 | 11.2 PayMethod | Admin | Cross-Role | All | -- | Admin refunds to card; User sees refund | Refund displayed in wallet | | | |
| ESTO-S11-CR-1790 | 11.2 PayMethod | User | Cross-Role | All | -- | Card tokenized for future payments | Token stored; card not stored | | | Security |
| ESTO-S11-CR-1791 | 11.2 PayMethod | Manager | Cross-Role | All | -- | User's default card used for subscription | Subscription payment succeeds | | | |
| ESTO-S11-CR-1792 | 11.2 PayMethod | User | Cross-Role | All | -- | Card expiry approaching; User notified | Notification sent before expiry | | | |
| ESTO-S11-CR-1793 | 11.2 PayMethod | Admin | Cross-Role | All | -- | Admin sees payment method compliance | Compliance status displayed | | | Security |
| ESTO-S11-CR-1794 | 11.2 PayMethod | User | Cross-Role | All | -- | Payment method with 3D Secure | 3DS challenge works | | | Security |
| ESTO-S11-CR-1795 | 11.2 PayMethod | Manager | Cross-Role | All | -- | Manager views payment status for booking | Payment status displayed | | | |

### 11.3 Invoices & Receipts (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S11-HP-1796 | 11.3 Invoice | User | Happy | All | Payment made | View invoice | Invoice displayed with details | | | |
| ESTO-S11-HP-1797 | 11.3 Invoice | User | Happy | All | Invoice available | Download invoice PDF | PDF downloaded | | | |
| ESTO-S11-HP-1798 | 11.3 Invoice | User | Happy | All | Invoice available | Print invoice | Print layout clean and complete | | | |
| ESTO-S11-HP-1799 | 11.3 Invoice | User | Happy | All | Multiple invoices | View all invoices | All invoices listed | | | |
| ESTO-S11-HP-1800 | 11.3 Invoice | User | Happy | All | Invoices exist | Filter invoices by date | Filtered list displayed | | | |
| ESTO-S11-HP-1801 | 11.3 Invoice | User | Happy | All | Invoices exist | Search invoices by number | Matching invoice displayed | | | |
| ESTO-S11-HP-1802 | 11.3 Invoice | User | Happy | All | Invoice available | Email invoice to self | Email sent with invoice | | | |
| ESTO-S11-HP-1803 | 11.3 Invoice | Admin | Happy | All | Invoices exist | View all platform invoices | All invoices listed | | | |
| ESTO-S11-HP-1804 | 11.3 Invoice | Admin | Happy | All | Invoices exist | Export invoice data | Export generated | | | |
| ESTO-S11-EM-1805 | 11.3 Invoice | User | Empty | All | -- | View invoices with none | Empty state displayed | | | |
| ESTO-S11-ER-1806 | 11.3 Invoice | User | Error | All | Invoice service down | View invoice | Error toast; cached data | | | |
| ESTO-S11-ER-1807 | 11.3 Invoice | Guest | Error | All | -- | Access invoice without auth | Redirected to /login | | | |
| ESTO-S11-ER-1808 | 11.3 Invoice | User | Error | All | -- | Download tampered invoice | Integrity check fails; warning | | | Security |
| ESTO-S11-ER-1809 | 11.3 Invoice | Guest | Error | All | Mock backend | Mock 500 on invoice | Error toast; no crash | | | |
| ESTO-S11-ED-1810 | 11.3 Invoice | User | Edge | All | Invoice | View invoice with 50 line items | All items displayed; scrollable | | | |
| ESTO-S11-ED-1811 | 11.3 Invoice | Guest | Edge | All | Invoice | Invoice with special chars in items | Items displayed correctly | | | |
| ESTO-S11-CR-1812 | 11.3 Invoice | User | Cross-Role | All | -- | User views invoice; Admin sees all | Admin sees all platform invoices | | | |
| ESTO-S11-CR-1813 | 11.3 Invoice | Admin | Cross-Role | All | -- | Admin voids invoice; User notified | User receives void notification | | | |
| ESTO-S11-CR-1814 | 11.3 Invoice | Manager | Cross-Role | All | -- | Manager views property invoices | Property invoices displayed | | | |
| ESTO-S11-CR-1815 | 11.3 Invoice | User | Cross-Role | All | -- | Invoice paid; status updated for all | All parties see paid status | | | |
| ESTO-S11-CR-1816 | 11.3 Invoice | Admin | Cross-Role | All | -- | Admin generates invoice; Manager sees | Manager sees new invoice | | | |
| ESTO-S11-CR-1817 | 11.3 Invoice | User | Cross-Role | All | -- | Refund issued; Credit note generated | Credit note linked to invoice | | | |
| ESTO-S11-CR-1818 | 11.3 Invoice | Manager | Cross-Role | All | -- | Manager marks invoice as paid | Status updated; finance notified | | | |
| ESTO-S11-CR-1819 | 11.3 Invoice | Admin | Cross-Role | All | -- | Admin sends reminder for unpaid invoice | Reminder sent to user | | | |
| ESTO-S11-CR-1820 | 11.3 Invoice | User | Cross-Role | All | -- | Invoice with GST/Tax breakdown | Tax breakdown displayed correctly | | | |

---

## Section 12: Profile Management (200)

### 12.1 User Profile (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S12-HP-1821 | 12.1 UserProfile | User | Happy | All | Logged in | Navigate to profile page | Profile page loads | | | |
| ESTO-S12-HP-1822 | 12.1 UserProfile | User | Happy | All | Profile loaded | View personal information | Personal info displayed | | | |
| ESTO-S12-HP-1823 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update first name | Name updated successfully | | | |
| ESTO-S12-HP-1824 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update last name | Name updated successfully | | | |
| ESTO-S12-HP-1825 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update phone number | Phone updated; verification sent | | | |
| ESTO-S12-HP-1826 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update email address | Email updated; verification sent | | | |
| ESTO-S12-HP-1827 | 12.1 UserProfile | User | Happy | All | Profile loaded | Upload profile photo | Photo uploaded and displayed | | | Ticket:#305 |
| ESTO-S12-HP-1828 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update address | Address updated | | | |
| ESTO-S12-HP-1829 | 12.1 UserProfile | User | Happy | All | Profile loaded | Update bio/about | Bio updated successfully | | | |
| ESTO-S12-HP-1830 | 12.1 UserProfile | User | Happy | All | Profile loaded | View notification preferences | Preferences displayed | | | |
| ESTO-S12-HP-1831 | 12.1 UserProfile | User | Happy | All | Preferences viewed | Update notification settings | Settings saved | | | |
| ESTO-S12-HP-1832 | 12.1 UserProfile | User | Happy | All | Profile loaded | View privacy settings | Privacy settings displayed | | | |
| ESTO-S12-HP-1833 | 12.1 UserProfile | User | Happy | All | Privacy settings viewed | Update privacy settings | Settings saved | | | |
| ESTO-S12-HP-1834 | 12.1 UserProfile | User | Happy | All | Profile loaded | Change password | Password changed successfully | | | |
| ESTO-S12-HP-1835 | 12.1 UserProfile | User | Happy | All | Profile loaded | View login history | Login history displayed | | | |
| ESTO-S12-HP-1836 | 12.1 UserProfile | User | Happy | All | Profile loaded | Manage connected devices | Device list displayed | | | |
| ESTO-S12-HP-1837 | 12.1 UserProfile | User | Happy | All | Device list | Revoke device access | Access revoked | | | |
| ESTO-S12-HP-1838 | 12.1 UserProfile | User | Happy | All | Profile loaded | Delete account | Account deletion flow initiated | | | |
| ESTO-S12-HP-1839 | 12.1 UserProfile | User | Happy | All | Profile loaded | Download personal data | Data export generated | | | |
| ESTO-S12-HP-1840 | 12.1 UserProfile | User | Happy | All | Profile loaded | View linked accounts | Linked accounts displayed | | | |
| ESTO-S12-HP-1841 | 12.1 UserProfile | User | Happy | All | Profile loaded | Unlink social account | Account unlinked | | | |
| ESTO-S12-EM-1842 | 12.1 UserProfile | User | Empty | All | -- | View profile with minimal data | Profile with default/empty values | | | |
| ESTO-S12-ER-1843 | 12.1 UserProfile | User | Error | All | Profile service down | View profile | Error toast; cached data | | | |
| ESTO-S12-ER-1844 | 12.1 UserProfile | Guest | Error | All | Network offline | Update profile | Network error; retry | | | |
| ESTO-S12-ER-1845 | 12.1 UserProfile | User | Error | All | -- | Change password with wrong current | Error: Incorrect current password | | | |
| ESTO-S12-ER-1846 | 12.1 UserProfile | Guest | Error | All | -- | Change password with weak new | Error: Password does not meet requirements | | | |
| ESTO-S12-ER-1847 | 12.1 UserProfile | User | Error | All | Mock backend | Mock 500 on profile update | Error toast; form retains data | | | |
| ESTO-S12-ER-1848 | 12.1 UserProfile | Guest | Error | All | -- | XSS in profile fields | Input escaped; no XSS | | | Security |
| ESTO-S12-ER-1849 | 12.1 UserProfile | User | Error | All | -- | Upload oversized profile photo | Error: File too large | | | Ticket:#305 |
| ESTO-S12-ER-1850 | 12.1 UserProfile | Guest | Error | All | -- | Upload non-image as profile photo | Error: Invalid file type | | | Ticket:#305 |
| ESTO-S12-ER-1851 | 12.1 UserProfile | User | Error | All | -- | Update email to already-registered | Error: Email already in use | | | |
| ESTO-S12-ER-1852 | 12.1 UserProfile | Guest | Error | All | -- | Update phone to already-registered | Error: Phone already in use | | | |
| ESTO-S12-ED-1853 | 12.1 UserProfile | User | Edge | All | Profile open | Update name with unicode characters | Name saved correctly | | | |
| ESTO-S12-ED-1854 | 12.1 UserProfile | Guest | Edge | All | Profile open | Update bio with 500 chars | Bio saved | | | |
| ESTO-S12-ED-1855 | 12.1 UserProfile | User | Edge | All | Profile open | Rapid profile updates | No race condition; final state correct | | | |
| ESTO-S12-ED-1856 | 12.1 UserProfile | Guest | Edge | All | Profile open | Upload profile with slow network | Upload with progress indicator | | | Ticket:#305 |
| ESTO-S12-ED-1857 | 12.1 UserProfile | User | Edge | All | Profile open | Profile with 100+ device logins | Device list paginated | | | |
| ESTO-S12-ED-1858 | 12.1 UserProfile | Guest | Edge | All | Profile open | Profile with emoji in bio | Emoji displayed correctly | | | |
| ESTO-S12-ED-1859 | 12.1 UserProfile | User | Edge | All | Profile open | Delete account; Cancel deletion | Cancellation succeeds | | | |
| ESTO-S12-ED-1860 | 12.1 UserProfile | Guest | Edge | All | Profile open | Download data with 10,000 records | Export generated; chunked if needed | | | |
| ESTO-S12-CR-1861 | 12.1 UserProfile | User | Cross-Role | All | -- | User updates profile; Admin sees updated info | Admin sees updated profile | | | |
| ESTO-S12-CR-1862 | 12.1 UserProfile | Manager | Cross-Role | All | -- | Manager views user profile | Manager sees public profile info | | | |
| ESTO-S12-CR-1863 | 12.1 UserProfile | User | Cross-Role | All | -- | User deletes account; Admin sees in logs | Admin sees deletion in audit log | | | Security |
| ESTO-S12-CR-1864 | 12.1 UserProfile | Admin | Cross-Role | All | -- | Admin edits user profile; User sees change | User sees updated profile | | | |
| ESTO-S12-CR-1865 | 12.1 UserProfile | User | Cross-Role | All | -- | User changes password; All sessions notified | Other sessions logged out or warned | | | Security |
| ESTO-S12-CR-1866 | 12.1 UserProfile | Manager | Cross-Role | All | -- | Manager verifies user; Badge shown | Verification badge displayed | | | |
| ESTO-S12-CR-1867 | 12.1 UserProfile | User | Cross-Role | All | -- | Profile photo updated; All users see new | New photo displayed across platform | | | Ticket:#305 |
| ESTO-S12-CR-1868 | 12.1 UserProfile | Admin | Cross-Role | All | -- | Admin exports user data; GDPR compliant | Export includes all user data | | | Security |
| ESTO-S12-CR-1869 | 12.1 UserProfile | User | Cross-Role | All | -- | User downloads data; Admin sees request | Admin sees data export in audit log | | | Security |
| ESTO-S12-CR-1870 | 12.1 UserProfile | Manager | Cross-Role | All | -- | Manager views user's activity | Activity log displayed (limited) | | | Security |

### 12.2 Identity & KYC Verification (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S12-HP-1871 | 12.2 KYC | User | Happy | All | Profile created | Navigate to KYC verification | KYC form/page loads | | | |
| ESTO-S12-HP-1872 | 12.2 KYC | User | Happy | All | KYC page loaded | Upload ID document | Document uploaded | | | |
| ESTO-S12-HP-1873 | 12.2 KYC | User | Happy | All | ID uploaded | Upload address proof | Document uploaded | | | |
| ESTO-S12-HP-1874 | 12.2 KYC | User | Happy | All | Documents uploaded | Submit for verification | Submission recorded; status = pending | | | |
| ESTO-S12-HP-1875 | 12.2 KYC | User | Happy | All | Verification pending | View verification status | Status displayed with timeline | | | |
| ESTO-S12-HP-1876 | 12.2 KYC | User | Happy | All | Documents approved | Receive approval notification | Notification sent | | | |
| ESTO-S12-HP-1877 | 12.2 KYC | User | Happy | All | Documents rejected | View rejection reason | Reason displayed; resubmit option | | | |
| ESTO-S12-HP-1878 | 12.2 KYC | User | Happy | All | Documents rejected | Resubmit corrected documents | Resubmission accepted | | | |
| ESTO-S12-HP-1879 | 12.2 KYC | Admin | Happy | All | Documents submitted | View verification queue | Queue displayed | | | |
| ESTO-S12-HP-1880 | 12.2 KYC | Admin | Happy | All | Document in queue | Review document | Document displayed for review | | | |
| ESTO-S12-HP-1881 | 12.2 KYC | Admin | Happy | All | Document reviewed | Approve verification | Status = verified; user notified | | | |
| ESTO-S12-HP-1882 | 12.2 KYC | Admin | Happy | All | Document reviewed | Reject with reason | Status = rejected; reason sent | | | |
| ESTO-S12-HP-1883 | 12.2 KYC | Admin | Happy | All | Multiple submissions | Bulk approve verifications | All approved; notifications sent | | | |
| ESTO-S12-HP-1884 | 12.2 KYC | Admin | Happy | All | Multiple submissions | Bulk reject verifications | All rejected; reasons sent | | | |
| ESTO-S12-HP-1885 | 12.2 KYC | Admin | Happy | All | Verification complete | View verification analytics | Analytics dashboard displayed | | | |
| ESTO-S12-EM-1886 | 12.2 KYC | User | Empty | All | -- | Submit KYC without documents | Validation: Documents required | | | |
| ESTO-S12-EM-1887 | 12.2 KYC | Guest | Empty | All | -- | Access KYC without auth | Redirected to /login | | | |
| ESTO-S12-EM-1888 | 12.2 KYC | User | Empty | All | -- | View KYC status with no submission | No submission message | | | |
| ESTO-S12-ER-1889 | 12.2 KYC | User | Error | All | Verification service down | Submit documents | Error toast; retry | | | |
| ESTO-S12-ER-1890 | 12.2 KYC | Guest | Error | All | Network offline | Upload document | Network error; queued | | | |
| ESTO-S12-ER-1891 | 12.2 KYC | User | Error | All | -- | Upload oversized ID document | Error: File too large | | | |
| ESTO-S12-ER-1892 | 12.2 KYC | Guest | Error | All | -- | Upload unsupported document type | Error: Only JPG, PNG, PDF allowed | | | |
| ESTO-S12-ER-1893 | 12.2 KYC | User | Error | All | Mock backend | Mock 500 on submission | Error toast; no crash | | | |
| ESTO-S12-ER-1894 | 12.2 KYC | Guest | Error | All | -- | Submit with tampered document | Error: Document integrity check failed | | | Security |
| ESTO-S12-ER-1895 | 12.2 KYC | User | Error | All | -- | Submit with expired ID | Warning: ID appears expired | | | |
| ESTO-S12-ER-1896 | 12.2 KYC | Guest | Error | All | Mock backend | Mock slow upload | Progress indicator; timeout handling | | | |
| ESTO-S12-ED-1897 | 12.2 KYC | User | Edge | All | KYC form | Upload 5 documents at once | All uploaded successfully | | | |
| ESTO-S12-ED-1898 | 12.2 KYC | Guest | Edge | All | KYC form | Submit with unicode in name | Unicode handled correctly | | | |
| ESTO-S12-ED-1899 | 12.2 KYC | User | Edge | All | KYC form | Rapid document uploads | No duplicate uploads | | | |
| ESTO-S12-ED-1900 | 12.2 KYC | Guest | Edge | All | Verification queue | Admin reviews 50 verifications | All reviewed; batch processing | | | |
| ESTO-S12-ED-1901 | 12.2 KYC | User | Edge | All | KYC form | Upload document on 3G network | Upload with progress; timeout handling | | | |
| ESTO-S12-CR-1902 | 12.2 KYC | User | Cross-Role | All | -- | User submits; Admin sees in queue | Admin sees verification request | | | |
| ESTO-S12-CR-1903 | 12.2 KYC | Admin | Cross-Role | All | -- | Admin approves; User receives notification | User notified; badge updated | | | |
| ESTO-S12-CR-1904 | 12.2 KYC | User | Cross-Role | All | -- | Admin rejects; User sees reason | Reason displayed; resubmit available | | | |
| ESTO-S12-CR-1905 | 12.2 KYC | Manager | Cross-Role | All | -- | Manager verifies user; User sees badge | Verification badge on profile | | | |
| ESTO-S12-CR-1906 | 12.2 KYC | User | Cross-Role | All | -- | Verification expires; User notified | Renewal notification sent | | | |
| ESTO-S12-CR-1907 | 12.2 KYC | Admin | Cross-Role | All | -- | Admin revokes verification; User notified | User sees "Unverified" status | | | |
| ESTO-S12-CR-1908 | 12.2 KYC | User | Cross-Role | All | -- | KYC with PII; Data encrypted | PII encrypted at rest and transit | | | Security |
| ESTO-S12-CR-1909 | 12.2 KYC | Manager | Cross-Role | All | -- | Manager views verification status | Status displayed in manager view | | | |
| ESTO-S12-CR-1910 | 12.2 KYC | Admin | Cross-Role | All | -- | Verification auto-check; AI flags suspicious | Suspicious documents flagged for review | | | |

---

## Section 13: Documents & Verification (150)

### 13.1 Document Upload & Storage (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S13-HP-1911 | 13.1 DocStore | User | Happy | All | Document upload form | Upload single document | Document uploaded and listed | | | |
| ESTO-S13-HP-1912 | 13.1 DocStore | User | Happy | All | Upload form open | Upload multiple documents | All documents uploaded | | | |
| ESTO-S13-HP-1913 | 13.1 DocStore | User | Happy | All | Document uploaded | View document in list | Document displayed with metadata | | | |
| ESTO-S13-HP-1914 | 13.1 DocStore | User | Happy | All | Document uploaded | Preview document | Preview opens | | | |
| ESTO-S13-HP-1915 | 13.1 DocStore | User | Happy | All | Document available | Download document | Document downloaded | | | |
| ESTO-S13-HP-1916 | 13.1 DocStore | User | Happy | All | Document uploaded | Rename document | Name updated; saved | | | |
| ESTO-S13-HP-1917 | 13.1 DocStore | User | Happy | All | Document uploaded | Add document tags | Tags saved | | | |
| ESTO-S13-HP-1918 | 13.1 DocStore | User | Happy | All | Document uploaded | Delete document | Document removed | | | |
| ESTO-S13-HP-1919 | 13.1 DocStore | User | Happy | All | Documents exist | Search documents | Matching docs displayed | | | |
| ESTO-S13-HP-1920 | 13.1 DocStore | User | Happy | All | Documents exist | Filter by document type | Filtered list shown | | | |
| ESTO-S13-HP-1921 | 13.1 DocStore | User | Happy | All | Documents exist | Sort by date | Sorted list displayed | | | |
| ESTO-S13-HP-1922 | 13.1 DocStore | User | Happy | All | Documents exist | Sort by name | Sorted list displayed | | | |
| ESTO-S13-HP-1923 | 13.1 DocStore | Manager | Happy | All | Documents exist | View team documents | Team docs listed | | | |
| ESTO-S13-EM-1924 | 13.1 DocStore | User | Empty | All | -- | View documents with none | Empty state displayed | | | |
| ESTO-S13-EM-1925 | 13.1 DocStore | Guest | Empty | All | -- | Access documents without auth | Redirected to /login | | | |
| ESTO-S13-ER-1926 | 13.1 DocStore | User | Error | All | Media service down | Upload document | Error toast; retry | | | |
| ESTO-S13-ER-1927 | 13.1 DocStore | Guest | Error | All | Network offline | Upload document | Network error; queued | | | |
| ESTO-S13-ER-1928 | 13.1 DocStore | User | Error | All | -- | Upload oversized file (>10MB) | Error: File too large | | | |
| ESTO-S13-ER-1929 | 13.1 DocStore | Guest | Error | All | -- | Upload unsupported file type | Error: Unsupported format | | | |
| ESTO-S13-ER-1930 | 13.1 DocStore | User | Error | All | -- | Upload corrupted file | Error: File corrupted | | | |
| ESTO-S13-ER-1931 | 13.1 DocStore | Guest | Error | All | Mock backend | Mock 500 on upload | Error toast; no crash | | | |
| ESTO-S13-ER-1932 | 13.1 DocStore | User | Error | All | -- | Upload virus-infected file | Error: File rejected by scanner | | | Security |
| ESTO-S13-ER-1933 | 13.1 DocStore | Guest | Error | All | -- | Download tampered document | Integrity check fails; warning | | | Security |
| ESTO-S13-ED-1934 | 13.1 DocStore | User | Edge | All | Upload form | Upload 20 documents at once | All uploaded; progress shown | | | |
| ESTO-S13-ED-1935 | 13.1 DocStore | Guest | Edge | All | Upload form | Upload with unicode filename | Filename sanitized | | | |
| ESTO-S13-ED-1936 | 13.1 DocStore | User | Edge | All | Upload form | Cancel upload mid-way | Upload cancelled; no partial file | | | |
| ESTO-S13-ED-1937 | 13.1 DocStore | Guest | Edge | All | Documents exist | View 1000+ documents | Pagination; performance OK | | | |
| ESTO-S13-ED-1938 | 13.1 DocStore | User | Edge | All | Documents exist | View document with 100MB+ size | Document preview handled correctly | | | |
| ESTO-S13-CR-1939 | 13.1 DocStore | User | Cross-Role | All | -- | User uploads; Admin sees in admin view | Admin sees document in user's file list | | | |
| ESTO-S13-CR-1940 | 13.1 DocStore | Manager | Cross-Role | All | -- | User shares document with manager | Manager sees shared document | | | |
| ESTO-S13-CR-1941 | 13.1 DocStore | Admin | Cross-Role | All | -- | Admin deletes user's document; User notified | User notified of deletion | | | |
| ESTO-S13-CR-1942 | 13.1 DocStore | User | Cross-Role | All | -- | Document with PII; encrypted at rest | PII encrypted in storage | | | Security |
| ESTO-S13-CR-1943 | 13.1 DocStore | Manager | Cross-Role | All | -- | Manager views user's documents (with permission) | Documents displayed with permission | | | Security |

### 13.2 Document Sharing & Permissions (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S13-HP-1944 | 13.2 Share | User | Happy | All | Document exists | Share document with another user | Share successful; recipient notified | | | |
| ESTO-S13-HP-1945 | 13.2 Share | User | Happy | All | Document shared | View shared document list | All shared documents listed | | | |
| ESTO-S13-HP-1946 | 13.2 Share | User | Happy | All | Document shared | Set permission level | Permission updated | | | |
| ESTO-S13-HP-1947 | 13.2 Share | User | Happy | All | Document shared | Revoke share | Share revoked; access removed | | | |
| ESTO-S13-HP-1948 | 13.2 Share | User | Happy | All | Document shared | Generate share link | Link generated; copyable | | | |
| ESTO-S13-HP-1949 | 13.2 Share | Manager | Happy | All | Document exists | Share document with team | Team members see document | | | |
| ESTO-S13-HP-1950 | 13.2 Share | Manager | Happy | All | Document exists | Set document permissions | Permissions saved | | | |
| ESTO-S13-HP-1951 | 13.2 Share | Admin | Happy | All | Document exists | View all shared documents | All shares listed | | | |
| ESTO-S13-EM-1952 | 13.2 Share | User | Empty | All | -- | View shares with none | Empty state displayed | | | |
| ESTO-S13-ER-1953 | 13.2 Share | User | Error | All | -- | Share with non-existent user | Error: User not found | | | |
| ESTO-S13-ER-1954 | 13.2 Share | Guest | Error | All | -- | Share without permission | Error: Insufficient permissions | | | Security |
| ESTO-S13-ER-1955 | 13.2 Share | User | Error | All | -- | XSS in share note | Note escaped; no XSS | | | Security |
| ESTO-S13-ER-1956 | 13.2 Share | Guest | Error | All | Network offline | Share document | Network error; retry | | | |
| ESTO-S13-ED-1957 | 13.2 Share | User | Edge | All | Document shared | Share with 100 users | All users receive share notification | | | |
| ESTO-S13-ED-1958 | 13.2 Share | Guest | Edge | All | Document exists | Generate link with custom expiry | Link with expiry generated | | | |
| ESTO-S13-CR-1959 | 13.2 Share | User | Cross-Role | All | -- | User shares; recipient receives notification | Recipient gets share notification | | | |
| ESTO-S13-CR-1960 | 13.2 Share | Manager | Cross-Role | All | -- | Manager shares; Admin monitors | Admin sees share activity in audit log | | | Security |
| ESTO-S13-CR-1961 | 13.2 Share | User | Cross-Role | All | -- | Permission change reflected in user view | New permission enforced | | | |
| ESTO-S13-CR-1962 | 13.2 Share | Admin | Cross-Role | All | -- | Admin revokes all shares of compromised doc | All shares revoked; users notified | | | Security |

### 13.3 Document Verification (25)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S13-HP-1963 | 13.3 DocVerify | Admin | Happy | All | Document submitted | Verify document | Verification status updated | | | |
| ESTO-S13-HP-1964 | 13.3 DocVerify | Admin | Happy | All | Document verified | Add verification note | Note saved with document | | | |
| ESTO-S13-HP-1965 | 13.3 DocVerify | User | Happy | All | Document submitted | View verification status | Status displayed | | | |
| ESTO-S13-EM-1966 | 13.3 DocVerify | Admin | Empty | All | -- | View verification queue with none | Empty state displayed | | | |
| ESTO-S13-ER-1967 | 13.3 DocVerify | User | Error | All | -- | Verify own document | Error: Cannot self-verify | | | Security |
| ESTO-S13-ER-1968 | 13.3 DocVerify | Guest | Error | All | Mock backend | Mock 500 on verification | Error toast; no crash | | | |
| ESTO-S13-ED-1969 | 13.3 DocVerify | Admin | Edge | All | Large queue | Verify 100 documents | All verified; batched notifications | | | |
| ESTO-S13-CR-1970 | 13.3 DocVerify | Admin | Cross-Role | All | -- | Admin verifies; User receives notification | User notified of verification | | | |
| ESTO-S13-CR-1971 | 13.3 DocVerify | User | Cross-Role | All | -- | User's document verified; Manager sees status | Manager sees verified status | | | |

---

## Section 14: Search & Discovery (250)

### 14.1 Property Search Filters (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S14-HP-1972 | 14.1 SearchFilter | Guest | Happy | All | -- | Navigate to search page | Search page loads | | | |
| ESTO-S14-HP-1973 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Search by location | Results filtered by location | | | |
| ESTO-S14-HP-1974 | 14.1 SearchFilter | User | Happy | All | Search page open | Filter by price range | Results filtered by price | | | |
| ESTO-S14-HP-1975 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Filter by property type | Results filtered by type | | | |
| ESTO-S14-HP-1976 | 14.1 SearchFilter | User | Happy | All | Search page open | Filter by bedrooms | Results filtered by bedrooms | | | |
| ESTO-S14-HP-1977 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Filter by bathrooms | Results filtered by bathrooms | | | |
| ESTO-S14-HP-1978 | 14.1 SearchFilter | User | Happy | All | Search page open | Filter by amenities | Results filtered by amenities | | | |
| ESTO-S14-HP-1979 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Filter by area range | Results filtered by area | | | |
| ESTO-S14-HP-1980 | 14.1 SearchFilter | User | Happy | All | Search page open | Filter by year built | Results filtered by year | | | |
| ESTO-S14-HP-1981 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Filter by listing date | Results filtered by date | | | |
| ESTO-S14-HP-1982 | 14.1 SearchFilter | User | Happy | All | Search page open | Apply multiple filters | Filters combined; results accurate | | | |
| ESTO-S14-HP-1983 | 14.1 SearchFilter | Guest | Happy | All | Filters applied | Clear all filters | All filters cleared | | | |
| ESTO-S14-HP-1984 | 14.1 SearchFilter | User | Happy | All | Filters applied | Clear single filter | That filter cleared | | | |
| ESTO-S14-HP-1985 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Sort results by relevance | Sorted by relevance | | | |
| ESTO-S14-HP-1986 | 14.1 SearchFilter | User | Happy | All | Search page open | Sort results by price | Sorted by price | | | |
| ESTO-S14-HP-1987 | 14.1 SearchFilter | Guest | Happy | All | Search page open | Sort results by date | Sorted by date | | | |
| ESTO-S14-HP-1988 | 14.1 SearchFilter | User | Happy | All | Search page open | Sort results by rating | Sorted by rating | | | |
| ESTO-S14-HP-1989 | 14.1 SearchFilter | Guest | Happy | All | Search page open | View results on map | Map displayed with markers | | | |
| ESTO-S14-HP-1990 | 14.1 SearchFilter | User | Happy | All | Map view | Pan map | Map updates; results reload | | | |
| ESTO-S14-HP-1991 | 14.1 SearchFilter | Guest | Happy | All | Map view | Zoom map | Zoom updates; results reload | | | |
| ESTO-S14-EM-1992 | 14.1 SearchFilter | Guest | Empty | All | -- | Search with no results | Empty state: "No properties found" | | | |
| ESTO-S14-EM-1993 | 14.1 SearchFilter | User | Empty | All | -- | Search with extreme filters | Results: none or graceful empty | | | |
| ESTO-S14-ER-1994 | 14.1 SearchFilter | Guest | Error | All | Search service down | Perform search | Error toast; cached results | | | |
| ESTO-S14-ER-1995 | 14.1 SearchFilter | User | Error | All | Network offline | Perform search | Network error; cached results | | | |
| ESTO-S14-ER-1996 | 14.1 SearchFilter | Guest | Error | All | Mock backend | Mock 500 on search | Error toast; no crash | | | |
| ESTO-S14-ER-1997 | 14.1 SearchFilter | User | Error | All | Mock backend | Mock slow response | Loading state; timeout handling | | | |
| ESTO-S14-ER-1998 | 14.1 SearchFilter | Guest | Error | All | -- | XSS in search query | Input escaped; no XSS | | | Security |
| ESTO-S14-ED-1999 | 14.1 SearchFilter | User | Edge | All | Search page | Apply all 20 filters | All filters applied; results accurate | | | |
| ESTO-S14-ED-2000 | 14.1 SearchFilter | Guest | Edge | All | Search page | Search with unicode location | Unicode handled correctly | | | |
| ESTO-S14-ED-2001 | 14.1 SearchFilter | User | Edge | All | Search page | Search with very long query | Query handled gracefully | | | |
| ESTO-S14-ED-2002 | 14.1 SearchFilter | Guest | Edge | All | Search page | Rapid filter changes | Filters debounced; results smooth | | | |
| ESTO-S14-ED-2003 | 14.1 SearchFilter | User | Edge | All | Search page | Search 10,000+ properties | Pagination; performance OK | | | |
| ESTO-S14-ED-2004 | 14.1 SearchFilter | Guest | Edge | All | Search page | Search with special chars in query | Special chars handled | | | |
| ESTO-S14-ED-2005 | 14.1 SearchFilter | User | Edge | All | Map view | Map with 5000 markers | Map renders; clustering used | | | |
| ESTO-S14-CR-2006 | 14.1 SearchFilter | User | Cross-Role | All | -- | User searches; Admin sees search analytics | Admin sees search trends | | | |
| ESTO-S14-CR-2007 | 14.1 SearchFilter | Manager | Cross-Role | All | -- | Manager sees search analytics for own properties | Manager sees relevant analytics | | | |
| ESTO-S14-CR-2008 | 14.1 SearchFilter | User | Cross-Role | All | -- | User saves search; Admin sees saved searches | Admin sees saved search data | | | |
| ESTO-S14-CR-2009 | 14.1 SearchFilter | Guest | Cross-Role | All | -- | Two users search simultaneously | Independent results | | | |

### 14.2 Geo-Location & Map Search (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S14-HP-2010 | 14.2 Geo | Guest | Happy | All | Location enabled | Search by current location | Results near user | | | |
| ESTO-S14-HP-2011 | 14.2 Geo | User | Happy | All | Location enabled | Use "Near me" search | Results within radius | | | |
| ESTO-S14-HP-2012 | 14.2 Geo | Guest | Happy | All | Map view | Search by drawing radius | Results within drawn area | | | |
| ESTO-S14-HP-2013 | 14.2 Geo | User | Happy | All | Map view | Search by polygon | Results within polygon | | | |
| ESTO-S14-HP-2014 | 14.2 Geo | Guest | Happy | All | Map view | View property on map | Property marker shown | | | |
| ESTO-S14-HP-2015 | 14.2 Geo | User | Happy | All | Map view | Click property marker | Property details popup | | | |
| ESTO-S14-HP-2016 | 14.2 Geo | Guest | Happy | All | Map view | View directions to property | Directions displayed | | | |
| ESTO-S14-HP-2017 | 14.2 Geo | User | Happy | All | Map view | View nearby amenities | Amenities displayed on map | | | |
| ESTO-S14-HP-2018 | 14.2 Geo | Guest | Happy | All | Map view | View commute time | Commute info shown | | | |
| ESTO-S14-HP-2019 | 14.2 Geo | User | Happy | All | Map view | View property on street view | Street view opens | | | |
| ESTO-S14-EM-2020 | 14.2 Geo | Guest | Empty | All | -- | Search with location disabled | Error: Enable location | | | |
| ESTO-S14-ER-2021 | 14.2 Geo | User | Error | All | Geolocation API down | Get location | Error: Location unavailable | | | |
| ESTO-S14-ER-2022 | 14.2 Geo | Guest | Error | All | Map service down | Load map | Error toast; fallback UI | | | |
| ESTO-S14-ER-2023 | 14.2 Geo | User | Error | All | Network offline | Load map | Network error; cached tiles | | | |
| ESTO-S14-ED-2024 | 14.2 Geo | Guest | Edge | All | Map view | Search at country boundary | Coordinates handled correctly | | | |
| ESTO-S14-ED-2025 | 14.2 Geo | User | Edge | All | Map view | Search across timezones | Results accurate by timezone | | | |
| ESTO-S14-ED-2026 | 14.2 Geo | Guest | Edge | All | Map view | Map with 100+ markers | Clustering applied | | | |
| ESTO-S14-ED-2027 | 14.2 Geo | User | Edge | All | Map view | Search with very large radius | Results limited to reasonable count | | | |
| ESTO-S14-CR-2028 | 14.2 Geo | User | Cross-Role | All | -- | User searches by location; Admin sees geo analytics | Admin sees geo data | | | |
| ESTO-S14-CR-2029 | 14.2 Geo | Manager | Cross-Role | All | -- | Manager sets property location | Property location saved | | | |
| ESTO-S14-CR-2030 | 14.2 Geo | Admin | Cross-Role | All | -- | Admin views heatmap of searches | Heatmap displayed | | | |

### 14.3 Recommendations & Personalization (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S14-HP-2031 | 14.3 Recommend | User | Happy | All | Has search history | View recommended properties | Personalized recommendations displayed | | | |
| ESTO-S14-HP-2032 | 14.3 Recommend | User | Happy | All | Has booking history | View recommended properties | Recommendations based on history | | | |
| ESTO-S14-HP-2033 | 14.3 Recommend | User | Happy | All | Has wishlist | View recommended properties | Recommendations based on wishlist | | | |
| ESTO-S14-HP-2034 | 14.3 Recommend | User | Happy | All | Recommendations available | Like a recommendation | Feedback recorded | | | |
| ESTO-S14-HP-2035 | 14.3 Recommend | User | Happy | All | Recommendations available | Hide a recommendation | Hidden; not shown again | | | |
| ESTO-S14-HP-2036 | 14.3 Recommend | User | Happy | All | Recommendations available | Refresh recommendations | New recommendations loaded | | | |
| ESTO-S14-HP-2037 | 14.3 Recommend | User | Happy | All | Recommendations available | View "Similar properties" section | Similar properties shown | | | |
| ESTO-S14-HP-2038 | 14.3 Recommend | User | Happy | All | Recommendations available | View "Recently viewed" section | Recently viewed shown | | | |
| ESTO-S14-HP-2039 | 14.3 Recommend | User | Happy | All | Recommendations available | View "Trending" section | Trending properties shown | | | |
| ESTO-S14-HP-2040 | 14.3 Recommend | User | Happy | All | Recommendations available | View "Top rated" section | Top rated properties shown | | | |
| ESTO-S14-EM-2041 | 14.3 Recommend | User | Empty | All | -- | View recommendations with no history | Default recommendations | | | |
| ESTO-S14-ER-2042 | 14.3 Recommend | User | Error | All | Recommendation service down | View recommendations | Error toast; fallback content | | | |
| ESTO-S14-ER-2043 | 14.3 Recommend | Guest | Error | All | -- | Access recommendations without auth | Redirected to /login | | | |
| ESTO-S14-ED-2044 | 14.3 Recommend | User | Edge | All | Has extensive history | Recommendations personalized | Accurate personalization | | | |
| ESTO-S14-ED-2045 | 14.3 Recommend | Guest | Edge | All | Recommendations available | Recommendations for first-time user | Generic recommendations shown | | | |
| ESTO-S14-CR-2046 | 14.3 Recommend | User | Cross-Role | All | -- | User views recommendations; Admin sees trends | Admin sees recommendation analytics | | | |
| ESTO-S14-CR-2047 | 14.3 Recommend | Manager | Cross-Role | All | -- | Manager's property in recommendations | Property appears when relevant | | | |
| ESTO-S14-CR-2048 | 14.3 Recommend | Admin | Cross-Role | All | -- | Admin configures recommendation rules | Rules applied to new users | | | |
| ESTO-S14-CR-2049 | 14.3 Recommend | User | Cross-Role | All | -- | User clicks recommendation; Manager sees traffic | Manager sees referral traffic | | | |
| ESTO-S14-CR-2050 | 14.3 Recommend | User | Cross-Role | All | -- | User dislikes; Recommendation improves | Future recommendations adjust | | | |

---

## Section 15: Wishlist & Saved Items (100)

### 15.1 Wishlist Management (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S15-HP-2051 | 15.1 Wishlist | User | Happy | All | Property viewed | Add property to wishlist | Property added; confirmation shown | | | |
| ESTO-S15-HP-2052 | 15.1 Wishlist | User | Happy | All | Property in wishlist | View wishlist | All wishlist items displayed | | | |
| ESTO-S15-HP-2053 | 15.1 Wishlist | User | Happy | All | Property in wishlist | Remove from wishlist | Property removed | | | |
| ESTO-S15-HP-2054 | 15.1 Wishlist | User | Happy | All | Wishlist items | Create custom collection | Collection created | | | |
| ESTO-S15-HP-2055 | 15.1 Wishlist | User | Happy | All | Collection exists | Add property to collection | Property added to collection | | | |
| ESTO-S15-HP-2056 | 15.1 Wishlist | User | Happy | All | Collection exists | Remove from collection | Property removed | | | |
| ESTO-S15-HP-2057 | 15.1 Wishlist | User | Happy | All | Wishlist exists | Share wishlist | Share link generated | | | |
| ESTO-S15-HP-2058 | 15.1 Wishlist | User | Happy | All | Wishlist exists | Sort wishlist by date | Sorted correctly | | | |
| ESTO-S15-HP-2059 | 15.1 Wishlist | User | Happy | All | Wishlist exists | Sort wishlist by price | Sorted correctly | | | |
| ESTO-S15-HP-2060 | 15.1 Wishlist | User | Happy | All | Wishlist exists | Add notes to wishlist item | Notes saved | | | |
| ESTO-S15-HP-2061 | 15.1 Wishlist | User | Happy | All | Wishlist exists | Set price alert | Alert configured | | | |
| ESTO-S15-EM-2062 | 15.1 Wishlist | User | Empty | All | -- | View empty wishlist | Empty state displayed | | | |
| ESTO-S15-EM-2063 | 15.1 Wishlist | Guest | Empty | All | -- | Access wishlist without auth | Redirected to /login | | | |
| ESTO-S15-ER-2064 | 15.1 Wishlist | User | Error | All | Wishlist service down | Add to wishlist | Error toast; retry | | | |
| ESTO-S15-ER-2065 | 15.1 Wishlist | Guest | Error | All | Network offline | Add to wishlist | Network error; queued | | | |
| ESTO-S15-ER-2066 | 15.1 Wishlist | User | Error | All | Mock backend | Mock 500 on add | Error toast; no crash | | | |
| ESTO-S15-ED-2067 | 15.1 Wishlist | User | Edge | All | Wishlist exists | Wishlist with 500+ items | Pagination; performance OK | | | |
| ESTO-S15-ED-2068 | 15.1 Wishlist | Guest | Edge | All | Wishlist exists | Rapid add/remove | No race condition | | | |
| ESTO-S15-CR-2069 | 15.1 Wishlist | User | Cross-Role | All | -- | User wishlists property; Manager sees interest | Manager sees interest signal | | | |
| ESTO-S15-CR-2070 | 15.1 Wishlist | Admin | Cross-Role | All | -- | Admin sees wishlist analytics | Analytics dashboard displayed | | | |

### 15.2 Compare & Insights (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S15-HP-2071 | 15.2 Compare | User | Happy | All | Wishlist items exist | Compare 2 properties | Comparison table displayed | | | |
| ESTO-S15-HP-2072 | 15.2 Compare | User | Happy | All | Wishlist items exist | Compare 3 properties | Comparison table displayed | | | |
| ESTO-S15-HP-2073 | 15.2 Compare | User | Happy | All | Wishlist items exist | Compare 5 properties | Comparison table displayed | | | |
| ESTO-S15-HP-2074 | 15.2 Compare | User | Happy | All | Comparison view | View detailed comparison | All attributes shown | | | |
| ESTO-S15-HP-2075 | 15.2 Compare | User | Happy | All | Comparison view | Highlight differences | Differences highlighted | | | |
| ESTO-S15-HP-2076 | 15.2 Compare | User | Happy | All | Comparison view | Filter comparison by category | Filtered comparison shown | | | |
| ESTO-S15-HP-2077 | 15.2 Compare | User | Happy | All | Comparison view | Save comparison | Comparison saved | | | |
| ESTO-S15-HP-2078 | 15.2 Compare | User | Happy | All | Comparison view | Export comparison | Export generated | | | |
| ESTO-S15-EM-2079 | 15.2 Compare | User | Empty | All | -- | Compare with single property | Error: Need at least 2 properties | | | |
| ESTO-S15-ER-2080 | 15.2 Compare | User | Error | All | Mock backend | Mock 500 on comparison | Error toast; no crash | | | |
| ESTO-S15-ED-2081 | 15.2 Compare | User | Edge | All | Comparison view | Compare 10 properties | Performance OK | | | |
| ESTO-S15-ED-2082 | 15.2 Compare | Guest | Edge | All | Comparison view | Compare with unicode text | Unicode handled correctly | | | |
| ESTO-S15-CR-2083 | 15.2 Compare | User | Cross-Role | All | -- | User compares; Admin sees comparison analytics | Admin sees comparison trends | | | |
| ESTO-S15-CR-2084 | 15.2 Compare | Manager | Cross-Role | All | -- | Manager's property in comparison | Property compared fairly | | | |
| ESTO-S15-CR-2085 | 15.2 Compare | User | Cross-Role | All | -- | User selects winner from comparison | Selection recorded | | | |

---

## Section 16: Manager Operations (250)

### 16.1 Manager Dashboard & KPIs (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S16-HP-2086 | 16.1 MgrDash | Manager | Happy | All | Manager logged in | View manager dashboard | Dashboard loads with KPIs | | | |
| ESTO-S16-HP-2087 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View total properties | Total properties count shown | | | |
| ESTO-S16-HP-2088 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View active bookings | Active bookings displayed | | | |
| ESTO-S16-HP-2089 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View revenue metrics | Revenue charts displayed | | | |
| ESTO-S16-HP-2090 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View occupancy rate | Occupancy rate displayed | | | |
| ESTO-S16-HP-2091 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View pending approvals | Pending approvals listed | | | |
| ESTO-S16-HP-2092 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View recent activity | Activity feed displayed | | | |
| ESTO-S16-HP-2093 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View top performing properties | Top properties listed | | | |
| ESTO-S16-HP-2094 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View Fast Track requests | Fast Track queue displayed | | | |
| ESTO-S16-HP-2095 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | View leads/inquiries | Leads displayed | | | |
| ESTO-S16-HP-2096 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | Customize dashboard layout | Layout saved | | | |
| ESTO-S16-HP-2097 | 16.1 MgrDash | Manager | Happy | All | Dashboard loaded | Filter dashboard by date range | Filtered data displayed | | | |
| ESTO-S16-EM-2098 | 16.1 MgrDash | Manager | Empty | All | -- | View dashboard with no data | Empty state with hints | | | |
| ESTO-S16-EM-2099 | 16.1 MgrDash | Manager | Empty | All | -- | View dashboard before approval | "Pending approval" state | | | |
| ESTO-S16-ER-2100 | 16.1 MgrDash | Manager | Error | All | Dashboard service down | View dashboard | Error toast; cached data | | | |
| ESTO-S16-ER-2101 | 16.1 MgrDash | Manager | Error | All | Network offline | View dashboard | Network error; cached data | | | |
| ESTO-S16-ER-2102 | 16.1 MgrDash | Manager | Error | All | Mock backend | Mock 500 on dashboard | Error toast; no crash | | | |
| ESTO-S16-ED-2103 | 16.1 MgrDash | Manager | Edge | All | Dashboard loaded | View with 100+ properties | Pagination; performance OK | | | |
| ESTO-S16-ED-2104 | 16.1 MgrDash | Manager | Edge | All | Dashboard loaded | Dashboard at midnight | Data for correct date period | | | |
| ESTO-S16-CR-2105 | 16.1 MgrDash | Manager | Cross-Role | All | -- | Manager views own dashboard; Admin sees all | Admin sees all manager dashboards | | | |
| ESTO-S16-CR-2106 | 16.1 MgrDash | User | Cross-Role | All | -- | Manager views dashboard; User sees nothing | User redirected to user dashboard | | | Security |

### 16.2 Property Approval Workflow (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S16-HP-2107 | 16.2 Approve | Manager | Happy | All | Pending properties | View pending property queue | Queue displayed | | | |
| ESTO-S16-HP-2108 | 16.2 Approve | Manager | Happy | All | Property in queue | View property details | All details shown | | | |
| ESTO-S16-HP-2109 | 16.2 Approve | Manager | Happy | All | Property reviewed | Approve property | Property approved; live | | | |
| ESTO-S16-HP-2110 | 16.2 Approve | Manager | Happy | All | Property reviewed | Reject with reason | Property rejected; owner notified | | | |
| ESTO-S16-HP-2111 | 16.2 Approve | Manager | Happy | All | Property reviewed | Request changes | Request sent to owner | | | |
| ESTO-S16-HP-2112 | 16.2 Approve | Manager | Happy | All | Property under review | Bulk approve properties | All approved; notifications sent | | | |
| ESTO-S16-HP-2113 | 16.2 Approve | Manager | Happy | All | Multiple properties | Bulk reject with reason | All rejected; reasons sent | | | |
| ESTO-S16-HP-2114 | 16.2 Approve | Manager | Happy | All | Property approved | Edit property listing | Listing updated | | | |
| ESTO-S16-HP-2115 | 16.2 Approve | Manager | Happy | All | Property changes made | Re-submit for review | Property back in queue | | | |
| ESTO-S16-HP-2116 | 16.2 Approve | Manager | Happy | All | Property approved | Pause property listing | Property paused | | | |
| ESTO-S16-HP-2117 | 16.2 Approve | Manager | Happy | All | Property paused | Resume listing | Property resumed | | | |
| ESTO-S16-HP-2118 | 16.2 Approve | Manager | Happy | All | Property exists | View approval history | History displayed | | | |
| ESTO-S16-EM-2119 | 16.2 Approve | Manager | Empty | All | -- | View approval queue with none | Empty state displayed | | | |
| ESTO-S16-ER-2120 | 16.2 Approve | Manager | Error | All | Approval service down | Approve property | Error toast; retry | | | |
| ESTO-S16-ER-2121 | 16.2 Approve | Manager | Error | All | Network offline | Approve property | Network error; retry | | | |
| ESTO-S16-ER-2122 | 16.2 Approve | Manager | Error | All | -- | Approve own property | Error: Cannot self-approve | | | |
| ESTO-S16-ER-2123 | 16.2 Approve | Manager | Error | All | -- | Approve property with missing fields | Error: Required fields missing | | | |
| ESTO-S16-ED-2124 | 16.2 Approve | Manager | Edge | All | Approval queue | Approve 50 properties at once | All approved; batched notifications | | | |
| ESTO-S16-ED-2125 | 16.2 Approve | Manager | Edge | All | Approval queue | Property with 100 images | All images reviewable | | | |
| ESTO-S16-CR-2126 | 16.2 Approve | Manager | Cross-Role | All | -- | Manager approves; User sees approved status | User sees property is live | | | |
| ESTO-S16-CR-2127 | 16.2 Approve | Manager | Cross-Role | All | -- | Manager rejects; User sees reason | Reason displayed in user's listing | | | |
| ESTO-S16-CR-2128 | 16.2 Approve | Admin | Cross-Role | All | -- | Manager approves; Admin sees in reports | Admin sees approval in metrics | | | |
| ESTO-S16-CR-2129 | 16.2 Approve | Manager | Cross-Role | All | -- | Manager escalates approval to admin | Admin sees escalation | | | |
| ESTO-S16-CR-2130 | 16.2 Approve | User | Cross-Role | All | -- | User edits after rejection; Manager reviews | Manager sees updated property | | | |

### 16.3 Lead & Inquiry Management (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S16-HP-2131 | 16.3 Lead | Manager | Happy | All | Leads exist | View lead inbox | All leads displayed | | | |
| ESTO-S16-HP-2132 | 16.3 Lead | Manager | Happy | All | Lead in inbox | View lead details | Lead details shown | | | |
| ESTO-S16-HP-2133 | 16.3 Lead | Manager | Happy | All | Lead viewed | Respond to lead | Response sent | | | |
| ESTO-S16-HP-2134 | 16.3 Lead | Manager | Happy | All | Lead active | Schedule follow-up | Follow-up scheduled | | | |
| ESTO-S16-HP-2135 | 16.3 Lead | Manager | Happy | All | Lead active | Mark as qualified | Lead qualified | | | |
| ESTO-S16-HP-2136 | 16.3 Lead | Manager | Happy | All | Lead active | Mark as converted | Lead converted to booking | | | |
| ESTO-S16-HP-2137 | 16.3 Lead | Manager | Happy | All | Lead active | Mark as lost | Lead status = lost | | | |
| ESTO-S16-HP-2138 | 16.3 Lead | Manager | Happy | All | Leads exist | Filter by status | Filtered list shown | | | |
| ESTO-S16-HP-2139 | 16.3 Lead | Manager | Happy | All | Leads exist | Filter by date | Filtered list shown | | | |
| ESTO-S16-HP-2140 | 16.3 Lead | Manager | Happy | All | Leads exist | Assign lead to team member | Lead assigned | | | |
| ESTO-S16-EM-2141 | 16.3 Lead | Manager | Empty | All | -- | View leads with none | Empty state displayed | | | |
| ESTO-S16-ER-2142 | 16.3 Lead | Manager | Error | All | Lead service down | View leads | Error toast; cached data | | | |
| ESTO-S16-ER-2143 | 16.3 Lead | Manager | Error | All | Mock backend | Mock 500 on response | Error toast; no crash | | | |
| ESTO-S16-ED-2144 | 16.3 Lead | Manager | Edge | All | Leads exist | View 1000+ leads | Pagination; performance OK | | | |
| ESTO-S16-ED-2145 | 16.3 Lead | Manager | Edge | All | Lead active | Rapid status changes | No race condition | | | |
| ESTO-S16-CR-2146 | 16.3 Lead | Manager | Cross-Role | All | -- | User submits lead; Manager receives | Manager sees lead in inbox | | | |
| ESTO-S16-CR-2147 | 16.3 Lead | User | Cross-Role | All | -- | Manager responds; User receives | User gets response | | | |
| ESTO-S16-CR-2148 | 16.3 Lead | Admin | Cross-Role | All | -- | Lead converted to booking; Admin sees metrics | Admin sees conversion metrics | | | |

### 16.4 Team Management (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S16-HP-2149 | 16.4 Team | Manager | Happy | All | Team exists | View team list | All team members listed | | | |
| ESTO-S16-HP-2150 | 16.4 Team | Manager | Happy | All | Team exists | View team member details | Member details displayed | | | |
| ESTO-S16-HP-2151 | 16.4 Team | Manager | Happy | All | Team exists | Invite new team member | Invitation sent | | | |
| ESTO-S16-HP-2152 | 16.4 Team | Manager | Happy | All | Team exists | Remove team member | Member removed | | | |
| ESTO-S16-HP-2153 | 16.4 Team | Manager | Happy | All | Team exists | Change team member role | Role updated | | | |
| ESTO-S16-HP-2154 | 16.4 Team | Manager | Happy | All | Team exists | Assign properties to team member | Properties assigned | | | |
| ESTO-S16-HP-2155 | 16.4 Team | Manager | Happy | All | Team exists | View team performance | Performance metrics displayed | | | |
| ESTO-S16-HP-2156 | 16.4 Team | Manager | Happy | All | Team exists | Set team permissions | Permissions saved | | | |
| ESTO-S16-HP-2157 | 16.4 Team | Manager | Happy | All | Team exists | View team activity log | Activity log displayed | | | |
| ESTO-S16-EM-2158 | 16.4 Team | Manager | Empty | All | -- | View team with no members | Empty state displayed | | | |
| ESTO-S16-ER-2159 | 16.4 Team | Manager | Error | All | -- | Invite duplicate member | Error: Already on team | | | |
| ESTO-S16-ER-2160 | 16.4 Team | Manager | Error | All | Mock backend | Mock 500 on invite | Error toast; no crash | | | |
| ESTO-S16-ED-2161 | 16.4 Team | Manager | Edge | All | Team exists | Team with 100+ members | Pagination; performance OK | | | |
| ESTO-S16-CR-2162 | 16.4 Team | Manager | Cross-Role | All | -- | Manager invites; User receives invite | User receives invitation | | | |
| ESTO-S16-CR-2163 | 16.4 Team | User | Cross-Role | All | -- | User accepts invite; Manager sees in team | Manager sees new member | | | |
| ESTO-S16-CR-2164 | 16.4 Team | Admin | Cross-Role | All | -- | Admin sees team metrics | Team metrics in admin dashboard | | | |
| ESTO-S16-CR-2165 | 16.4 Team | Manager | Cross-Role | All | -- | Manager removes member; Admin notified | Admin notified of removal | | | |
| ESTO-S16-CR-2166 | 16.4 Team | User | Cross-Role | All | -- | User removed from team; access revoked | User loses team access | | | Security |

---

## Section 17: Multi-Market & Currency (200)

### 17.1 India Market (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S17-HP-2167 | 17.1 IN | User | Happy | All | -- | Detect India market | India-specific UI loaded | | | |
| ESTO-S17-HP-2168 | 17.1 IN | User | Happy | All | -- | View prices in INR | Prices in INR format | | | |
| ESTO-S17-HP-2169 | 17.1 IN | User | Happy | All | -- | View Indian cities | Cities displayed correctly | | | |
| ESTO-S17-HP-2170 | 17.1 IN | User | Happy | All | -- | Use Indian pincode search | Pincode search works | | | |
| ESTO-S17-HP-2171 | 17.1 IN | User | Happy | All | -- | View property in Indian format | Indian format applied | | | |
| ESTO-S17-HP-2172 | 17.1 IN | User | Happy | All | -- | Pay with Indian payment methods | Indian payment methods available | | | |
| ESTO-S17-HP-2173 | 17.1 IN | User | Happy | All | -- | View GST breakdown | GST applied correctly | | | |
| ESTO-S17-HP-2174 | 17.1 IN | User | Happy | All | -- | View Indian documents accepted | Indian docs in KYC list | | | |
| ESTO-S17-HP-2175 | 17.1 IN | User | Happy | All | -- | View properties in India | Indian properties shown | | | |
| ESTO-S17-EM-2176 | 17.1 IN | Guest | Empty | All | -- | Search India with no results | Empty state displayed | | | |
| ESTO-S17-ER-2177 | 17.1 IN | User | Error | All | -- | Convert currency with stale rate | Rate refreshed; accurate | | | |
| ESTO-S17-ED-2178 | 17.1 IN | User | Edge | All | -- | Switch from INR to USD mid-flow | Conversion applied; prices updated | | | |
| ESTO-S17-ED-2179 | 17.1 IN | Guest | Edge | All | -- | View 1000+ Indian properties | Pagination works | | | |
| ESTO-S17-CR-2180 | 17.1 IN | Admin | Cross-Role | All | -- | Admin views India-specific metrics | India dashboard displayed | | | |

### 17.2 UK Market (75)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S17-HP-2181 | 17.2 UK | User | Happy | All | -- | Detect UK market | UK-specific UI loaded | | | |
| ESTO-S17-HP-2182 | 17.2 UK | User | Happy | All | -- | View prices in GBP | Prices in GBP format | | | |
| ESTO-S17-HP-2183 | 17.2 UK | User | Happy | All | -- | View UK cities | Cities displayed correctly | | | |
| ESTO-S17-HP-2184 | 17.2 UK | User | Happy | All | -- | Use UK postcode search | Postcode search works | | | |
| ESTO-S17-HP-2185 | 17.2 UK | User | Happy | All | -- | View property in UK format | UK format applied | | | |
| ESTO-S17-HP-2186 | 17.2 UK | User | Happy | All | -- | Pay with UK payment methods | UK payment methods available | | | |
| ESTO-S17-HP-2187 | 17.2 UK | User | Happy | All | -- | View VAT breakdown | VAT applied correctly | | | |
| ESTO-S17-HP-2188 | 17.2 UK | User | Happy | All | -- | View UK documents accepted | UK docs in KYC list | | | |
| ESTO-S17-HP-2189 | 17.2 UK | User | Happy | All | -- | View properties in UK | UK properties shown | | | |
| ESTO-S17-EM-2190 | 17.2 UK | Guest | Empty | All | -- | Search UK with no results | Empty state displayed | | | |
| ESTO-S17-ER-2191 | 17.2 UK | User | Error | All | -- | Convert GBP with stale rate | Rate refreshed; accurate | | | |
| ESTO-S17-ED-2192 | 17.2 UK | User | Edge | All | -- | Switch from GBP to INR mid-flow | Conversion applied | | | |
| ESTO-S17-CR-2193 | 17.2 UK | Admin | Cross-Role | All | -- | Admin views UK-specific metrics | UK dashboard displayed | | | |

### 17.3 Multi-Market Switching (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S17-HP-2194 | 17.3 MultiMkt | User | Happy | All | -- | Switch market manually | Market changes | | | |
| ESTO-S17-HP-2195 | 17.3 MultiMkt | User | Happy | All | Market switched | Currency auto-updates | Currency reflects market | | | |
| ESTO-S17-HP-2196 | 17.3 MultiMkt | User | Happy | All | Market switched | Language auto-updates | Language reflects market | | | |
| ESTO-S17-HP-2197 | 17.3 MultiMkt | User | Happy | All | Market switched | Date format updates | Format reflects locale | | | |
| ESTO-S17-HP-2198 | 17.3 MultiMkt | User | Happy | All | Market switched | Phone format updates | Format reflects locale | | | |
| ESTO-S17-HP-2199 | 17.3 MultiMkt | User | Happy | All | Market switched | Properties filter by market | Only market properties shown | | | |
| ESTO-S17-HP-2200 | 17.3 MultiMkt | User | Happy | All | Market switched | Currency persists across sessions | Currency setting saved | | | |
| ESTO-S17-HP-2201 | 17.3 MultiMkt | User | Happy | All | Market switched | Tax breakdown updates | Tax reflects market | | | |
| ESTO-S17-EM-2202 | 17.3 MultiMkt | Guest | Empty | All | -- | Switch to unsupported market | Error: Market not available | | | |
| ESTO-S17-ER-2203 | 17.3 MultiMkt | User | Error | All | -- | Convert unsupported currency | Error: Conversion unavailable | | | |
| ESTO-S17-ED-2204 | 17.3 MultiMkt | User | Edge | All | -- | Rapid market switching | No race condition | | | |
| ESTO-S17-CR-2205 | 17.3 MultiMkt | User | Cross-Role | All | -- | User switches market; Admin sees metrics per market | Admin sees per-market analytics | | | |
| ESTO-S17-CR-2206 | 17.3 MultiMkt | Manager | Cross-Role | All | -- | Manager's property in multiple markets | Manager sees multi-market view | | | |

---

## Section 18: Performance & Cross-Cutting (150)

### 18.1 Performance & Load Testing (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S18-HP-2207 | 18.1 Perf | User | Happy | All | -- | Page load < 3 seconds | Loads within SLA | | | |
| ESTO-S18-HP-2208 | 18.1 Perf | User | Happy | All | -- | Interactive < 5 seconds | TTFI within SLA | | | |
| ESTO-S18-HP-2209 | 18.1 Perf | User | Happy | All | -- | API response < 500ms | API SLA met | | | |
| ESTO-S18-HP-2210 | 18.1 Perf | User | Happy | All | -- | Image loading lazy | Images lazy load | | | |
| ESTO-S18-HP-2211 | 18.1 Perf | User | Happy | All | -- | Cache assets effectively | Cached after first load | | | |
| ESTO-S18-HP-2212 | 18.1 Perf | User | Happy | All | -- | Bundle size optimized | Initial bundle small | | | |
| ESTO-S18-HP-2213 | 18.1 Perf | User | Happy | All | -- | Code splitting effective | Routes lazy loaded | | | |
| ESTO-S18-HP-2214 | 18.1 Perf | User | Happy | All | -- | Service worker active | SW caches responses | | | |
| ESTO-S18-EM-2215 | 18.1 Perf | User | Empty | All | -- | Page with no cache | First load slow; cached after | | | |
| ESTO-S18-ER-2216 | 18.1 Perf | User | Error | All | -- | Performance under load | Graceful degradation | | | |
| ESTO-S18-ED-2217 | 18.1 Perf | User | Edge | All | -- | Slow 3G simulation | App usable; slow | | | |
| ESTO-S18-ED-2218 | 18.1 Perf | User | Edge | All | -- | Page with 10,000 records | Pagination; virtualization | | | |
| ESTO-S18-ED-2219 | 18.1 Perf | User | Edge | All | -- | Many open tabs | Memory managed | | | |

### 18.2 Accessibility (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S18-HP-2220 | 18.2 A11y | User | Happy | All | -- | Keyboard navigation | All elements reachable | | | A11y |
| ESTO-S18-HP-2221 | 18.2 A11y | User | Happy | All | -- | Screen reader navigation | ARIA labels correct | | | A11y |
| ESTO-S18-HP-2222 | 18.2 A11y | User | Happy | All | -- | Focus management | Focus visible on all interactive | | | A11y |
| ESTO-S18-HP-2223 | 18.2 A11y | User | Happy | All | -- | Color contrast WCAG AA | Contrast meets AA standard | | | A11y |
| ESTO-S18-HP-2224 | 18.2 A11y | User | Happy | All | -- | Text resize 200% | Layout remains usable | | | A11y |
| ESTO-S18-HP-2225 | 18.2 A11y | User | Happy | All | -- | Form labels associated | Labels properly associated | | | A11y |
| ESTO-S18-HP-2226 | 18.2 A11y | User | Happy | All | -- | Skip navigation links | Skip links work | | | A11y |
| ESTO-S18-HP-2227 | 18.2 A11y | User | Happy | All | -- | Alt text on images | All images have alt text | | | A11y |
| ESTO-S18-HP-2228 | 18.2 A11y | User | Happy | All | -- | Heading hierarchy | Headings structured properly | | | A11y |
| ESTO-S18-HP-2229 | 18.2 A11y | User | Happy | All | -- | ARIA landmarks | Landmarks properly defined | | | A11y |
| ESTO-S18-EM-2230 | 18.2 A11y | User | Empty | All | -- | Page with missing alt text | WCAG violations identified | | | A11y |
| ESTO-S18-ER-2231 | 18.2 A11y | User | Error | All | -- | Color-only information | Information not color-only | | | A11y |
| ESTO-S18-ED-2232 | 18.2 A11y | User | Edge | All | -- | Navigation with screen reader | All routes announced | | | A11y |
| ESTO-S18-ED-2233 | 18.2 A11y | User | Edge | All | -- | High contrast mode | UI adapts | | | A11y |
| ESTO-S18-CR-2234 | 18.2 A11y | Admin | Cross-Role | All | -- | Accessibility audit | Audit report generated | | | A11y |

### 18.3 Security & Privacy (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S18-HP-2235 | 18.3 Sec | Guest | Happy | All | -- | HTTPS everywhere | All traffic HTTPS | | | Security |
| ESTO-S18-HP-2236 | 18.3 Sec | User | Happy | All | -- | CSP headers enforced | CSP active | | | Security |
| ESTO-S18-HP-2237 | 18.3 Sec | User | Happy | All | -- | XSS protection | Output escaped | | | Security |
| ESTO-S18-HP-2238 | 18.3 Sec | User | Happy | All | -- | CSRF protection | CSRF tokens enforced | | | Security |
| ESTO-S18-HP-2239 | 18.3 Sec | User | Happy | All | -- | JWT in httpOnly cookie | Tokens secured | | | Security |
| ESTO-S18-HP-2240 | 18.3 Sec | User | Happy | All | -- | Rate limiting active | Rate limits enforced | | | Security |
| ESTO-S18-HP-2241 | 18.3 Sec | User | Happy | All | -- | SQL injection prevented | Parameterized queries | | | Security |
| ESTO-S18-HP-2242 | 18.3 Sec | User | Happy | All | -- | Password hashing secure | bcrypt/argon2 used | | | Security |
| ESTO-S18-HP-2243 | 18.3 Sec | User | Happy | All | -- | Session timeout | Sessions expire | | | Security |
| ESTO-S18-HP-2244 | 18.3 Sec | User | Happy | All | -- | Audit logging | All actions logged | | | Security |
| ESTO-S18-EM-2245 | 18.3 Sec | User | Empty | All | -- | Security headers missing | Headers added; score improved | | | Security |
| ESTO-S18-ER-2246 | 18.3 Sec | User | Error | All | -- | Brute force attempt | Account locked after N tries | | | Security |
| ESTO-S18-ER-2247 | 18.3 Sec | Guest | Error | All | -- | Suspicious activity | Alert raised | | | Security |
| ESTO-S18-ED-2248 | 18.3 Sec | User | Edge | All | -- | Penetration test | No critical findings | | | Security |
| ESTO-S18-ED-2249 | 18.3 Sec | User | Edge | All | -- | GDPR compliance check | Compliance verified | | | Security |
| ESTO-S18-CR-2250 | 18.3 Sec | Admin | Cross-Role | All | -- | Security incident reported | Incident handled per playbook | | | Security |
| ESTO-S18-CR-2251 | 18.3 Sec | User | Cross-Role | All | -- | User requests data deletion | Data deleted per policy | | | Security |

---

## Section 19: Integration & Cross-Service (100)

### 19.1 Cross-Service Communication (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S19-HP-2252 | 19.1 CrossSvc | User | Happy | All | -- | Property search across services | Results aggregated correctly | | | |
| ESTO-S19-HP-2253 | 19.1 CrossSvc | User | Happy | All | -- | Booking flow across services | Booking created end-to-end | | | |
| ESTO-S19-HP-2254 | 19.1 CrossSvc | Manager | Happy | All | -- | Property approval across services | Status synced | | | |
| ESTO-S19-HP-2255 | 19.1 CrossSvc | Admin | Happy | All | -- | Analytics aggregation | Analytics accurate across services | | | |
| ESTO-S19-HP-2256 | 19.1 CrossSvc | User | Happy | All | -- | User data sync across services | Data consistent | | | |
| ESTO-S19-HP-2257 | 19.1 CrossSvc | User | Happy | All | -- | Image service integration | Images load from media service | | | Ticket:#305 |
| ESTO-S19-HP-2258 | 19.1 CrossSvc | Manager | Happy | All | -- | Notification dispatch | Notifications sent via right channel | | | |
| ESTO-S19-HP-2259 | 19.1 CrossSvc | Admin | Happy | All | -- | Audit log aggregation | Logs from all services | | | Security |
| ESTO-S19-HP-2260 | 19.1 CrossSvc | User | Happy | All | -- | Search service integration | Search works end-to-end | | | |
| ESTO-S19-EM-2261 | 19.1 CrossSvc | User | Empty | All | -- | Service unavailable | Graceful degradation | | | |
| ESTO-S19-ER-2262 | 19.1 CrossSvc | User | Error | All | -- | Service timeout | Error toast; fallback | | | |
| ESTO-S19-ER-2263 | 19.1 CrossSvc | User | Error | All | -- | Service returns 500 | Error toast; retry | | | |
| ESTO-S19-ER-2264 | 19.1 CrossSvc | User | Error | All | -- | Service returns invalid data | Validation error; no crash | | | |
| ESTO-S19-ED-2265 | 19.1 CrossSvc | User | Edge | All | -- | All services slow | System responsive | | | |
| ESTO-S19-ED-2266 | 19.1 CrossSvc | Manager | Edge | All | -- | Service partially down | Partial functionality | | | |
| ESTO-S19-CR-2267 | 19.1 CrossSvc | User | Cross-Role | All | -- | Data flows correctly across services | All data consistent | | | |
| ESTO-S19-CR-2268 | 19.1 CrossSvc | Admin | Cross-Role | All | -- | Admin sees aggregated metrics | All metrics in dashboard | | | |

### 19.2 360° Panorama Stitching (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S19-HP-2269 | 19.2 360 | Manager | Happy | All | 360° enabled | Upload 360 images | Images accepted | | | |
| ESTO-S19-HP-2270 | 19.2 360 | Manager | Happy | All | Images uploaded | Trigger stitching | Stitching initiated | | | |
| ESTO-S19-HP-2271 | 19.2 360 | Manager | Happy | All | Stitching complete | View panorama | Panorama displayed | | | |
| ESTO-S19-HP-2272 | 19.2 360 | Manager | Happy | All | Panorama complete | Re-stitch panorama | New panorama generated | | | |
| ESTO-S19-HP-2273 | 19.2 360 | User | Happy | All | Panorama available | View 360° on property | 360° view works | | | |
| ESTO-S19-HP-2274 | 19.2 360 | User | Happy | All | Panorama viewed | Navigate in 360° | Pan/zoom work | | | |
| ESTO-S19-HP-2275 | 19.2 360 | User | Happy | All | Panorama viewed | Use VR mode | VR view works | | | |
| ESTO-S19-HP-2276 | 19.2 360 | User | Happy | All | Panorama viewed | Fullscreen 360° | Fullscreen works | | | |
| ESTO-S19-HP-2277 | 19.2 360 | Manager | Happy | All | Panorama exists | Delete panorama | Panorama removed | | | |
| ESTO-S19-EM-2278 | 19.2 360 | Manager | Empty | All | -- | Stitch with 0 images | Error: Need at least 2 images | | | |
| ESTO-S19-ER-2279 | 19.2 360 | Manager | Error | All | Stitch service down | Trigger stitching | Error: Stitch service unavailable | | | |
| ESTO-S19-ER-2280 | 19.2 360 | Manager | Error | All | -- | Stitch with mismatched images | Error: Images don't match | | | |
| ESTO-S19-ER-2281 | 19.2 360 | User | Error | All | Stitch service down | View panorama | Error: Panorama unavailable | | | |
| ESTO-S19-ED-2282 | 19.2 360 | Manager | Edge | All | Many panoramas | Stitch 50 panoramas | All stitched; queued | | | |
| ESTO-S19-ED-2283 | 19.2 360 | User | Edge | All | Panorama viewed | View on mobile | Mobile 360° works | | | Mobile |
| ESTO-S19-CR-2284 | 19.2 360 | User | Cross-Role | All | -- | User views 360°; Manager sees engagement | Manager sees 360° views | | | |
| ESTO-S19-CR-2285 | 19.2 360 | Admin | Cross-Role | All | -- | Admin sees stitch analytics | Stitch metrics displayed | | | |
| ESTO-S19-CR-2286 | 19.2 360 | Manager | Cross-Role | All | -- | Manager stitches; User sees new panorama | User sees updated panorama | | | |
| ESTO-S19-CR-2287 | 19.2 360 | Manager | Cross-Role | All | -- | Stitch integration with property listing | Listing updated with panorama | | | |
| ESTO-S19-CR-2288 | 19.2 360 | User | Cross-Role | All | -- | 360° shared in chat/messaging | 360° viewable in chat | | | |

---

## Section 20: CI/CD, DevOps & Infrastructure (250)

### 20.1 CI/CD Pipeline (125)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S20-HP-2289 | 20.1 CI/CD | Admin | Happy | All | Code committed | Push to develop branch | CI pipeline triggered | | | CI |
| ESTO-S20-HP-2290 | 20.1 CI/CD | Admin | Happy | All | Pipeline triggered | View CI results | All checks passed | | | CI |
| ESTO-S20-HP-2291 | 20.1 CI/CD | Admin | Happy | All | CI passed | Auto-deploy to dev | Dev deployment successful | | | CI |
| ESTO-S20-HP-2292 | 20.1 CI/CD | Admin | Happy | All | PR merged to develop | Auto-merge triggers | Merge successful | | | CI |
| ESTO-S20-HP-2293 | 20.1 CI/CD | Admin | Happy | All | Tests failed | View CI failure | Failure details shown | | | CI |
| ESTO-S20-HP-2294 | 20.1 CI/CD | Admin | Happy | All | Docker build failed | View build error | Error details shown | | | CI |
| ESTO-S20-HP-2295 | 20.1 CI/CD | Admin | Happy | All | Build passed | Push to Artifact Registry | Image pushed with SHA tag | | | CI |
| ESTO-S20-HP-2296 | 20.1 CI/CD | Admin | Happy | All | PR to main | Production promotion gate checks | Gate enforced; PR from develop only | | | CI |
| ESTO-S20-HP-2297 | 20.1 CI/CD | Admin | Happy | All | PR from develop | Auto-deploy to production | Prod deployment successful | | | CI |
| ESTO-S20-HP-2298 | 20.1 CI/CD | Admin | Happy | All | Health check after deploy | Verify /health endpoint | Health check passes | | | CI |
| ESTO-S20-HP-2299 | 20.1 CI/CD | Admin | Happy | All | SMTP test configured | SMTP smoke test runs | Test email sent successfully | | | CI |
| ESTO-S20-HP-2300 | 20.1 CI/CD | Admin | Happy | All | CodeQL enabled | View security scan results | Results displayed | | | CI |
| ESTO-S20-HP-2301 | 20.1 CI/CD | Admin | Happy | All | Dependency review | View dependency scan | Scan results displayed | | | CI |
| ESTO-S20-HP-2302 | 20.1 CI/CD | Admin | Happy | All | Secret scanning enabled | View secret scan results | No secrets found | | | CI |
| ESTO-S20-HP-2303 | 20.1 CI/CD | Admin | Happy | All | Trivy scanning enabled | View container scan | Scan results displayed | | | CI |
| ESTO-S20-HP-2304 | 20.1 CI/CD | Admin | Happy | All | govulncheck | View vulnerability results | Results displayed | | | CI |
| ESTO-S20-HP-2305 | 20.1 CI/CD | Admin | Happy | All | Lint fails | View lint error | Error displayed; fix suggested | | | CI |
| ESTO-S20-HP-2306 | 20.1 CI/CD | Admin | Happy | All | Tests fail | View test report | Failed tests listed with output | | | CI |
| ESTO-S20-HP-2307 | 20.1 CI/CD | Admin | Happy | All | All checks pass | Auto-merge PR | PR merged automatically | | | CI |
| ESTO-S20-HP-2308 | 20.1 CI/CD | Admin | Happy | All | concurrency enabled | Push while deploy running | Deploy cancelled; new one triggered | | | CI |
| ESTO-S20-HP-2309 | 20.1 CI/CD | Admin | Happy | All | Branch protection | Push directly to main | Push rejected; PR required | | | CI |
| ESTO-S20-HP-2310 | 20.1 CI/CD | Admin | Happy | All | GitHub environments set | Deploy to dev | Dev environment triggered | | | CI |
| ESTO-S20-HP-2311 | 20.1 CI/CD | Admin | Happy | All | GitHub environments set | Deploy to prod (with reviewers) | Prod requires approval | | | CI |
| ESTO-S20-HP-2312 | 20.1 CI/CD | Admin | Happy | All | Workflow cache enabled | Second run of pipeline | Cache hit; pipeline faster | | | CI |
| ESTO-S20-HP-2313 | 20.1 CI/CD | Admin | Happy | All | Deployment failed | View deployment error | Error details in Actions log | | | CI |
| ESTO-S20-HP-2314 | 20.1 CI/CD | Admin | Happy | All | Health check passes | Verify SMTP smoke | Email delivered; log shows success | | | CI |
| ESTO-S20-HP-2315 | 20.1 CI/CD | Admin | Happy | All | Pinned action SHA | View workflow | Pinned SHA used in checkout | | | CI |
| ESTO-S20-ER-2316 | 20.1 CI/CD | Admin | Error | All | GitHub Actions down | Push code | Pipeline fails; notification sent | | | CI |
| ESTO-S20-ER-2317 | 20.1 CI/CD | Admin | Error | All | Build timeout | Long build runs | Pipeline times out gracefully | | | CI |
| ESTO-S20-ER-2318 | 20.1 CI/CD | Admin | Error | All | Secrets not found | Pipeline runs | Pipeline fails with secret error | | | CI |
| ESTO-S20-ER-2319 | 20.1 CI/CD | Admin | Error | All | Workload Identity fails | Pipeline runs | Auth fails; pipeline aborts | | | CI |
| ESTO-S20-ER-2320 | 20.1 CI/CD | Admin | Error | All | Artifact Registry down | Push Docker image | Push fails; pipeline retries | | | CI |
| ESTO-S20-ER-2321 | 20.1 CI/CD | Admin | Error | All | Cloud Run API error | Deploy service | Deploy fails; error shown | | | CI |
| ESTO-S20-ER-2322 | 20.1 CI/CD | Admin | Error | All | Out of GCP quota | Create new resource | Error: Quota exceeded | | | CI |
| ESTO-S20-ER-2323 | 20.1 CI/CD | Admin | Error | All | Mock backend | Mock 500 on deploy | Error toast; no crash | | | CI |
| ESTO-S20-ER-2324 | 20.1 CI/CD | Admin | Error | All | Concurrent deploys | Deploy same service | One wins; other fails gracefully | | | CI |
| ESTO-S20-ER-2325 | 20.1 CI/CD | Admin | Error | All | GCP project access revoked | Deploy service | Deploy fails; alert raised | | | CI |
| ESTO-S20-ED-2326 | 20.1 CI/CD | Admin | Edge | All | 20 services | Push all at once | All pipelines run; no conflicts | | | CI |
| ESTO-S20-ED-2327 | 20.1 CI/CD | Admin | Edge | All | Long build | Build takes 15 min | Pipeline completes; timeout extended | | | CI |
| ESTO-S20-ED-2328 | 20.1 CI/CD | Admin | Edge | All | Race condition | Multiple PRs to develop | Last merged wins; CI consistent | | | CI |
| ESTO-S20-ED-2329 | 20.1 CI/CD | Admin | Edge | All | Many pipelines | View GitHub Actions dashboard | Dashboard renders; not laggy | | | CI |
| ESTO-S20-CR-2330 | 20.1 CI/CD | Admin | Cross-Role | All | Deploy fails | All users see error page | Error page displayed to all | | | CI |
| ESTO-S20-CR-2331 | 20.1 CI/CD | Admin | Cross-Role | All | Maintenance mode | Users see banner | Maintenance banner displayed | | | CI |
| ESTO-S20-CR-2332 | 20.1 CI/CD | Admin | Cross-Role | All | Security update deployed | All users affected | All users get updated version | | | CI |
| ESTO-S20-CR-2333 | 20.1 CI/CD | Manager | Cross-Role | All | -- | Manager monitors deploy status | Deploy status visible to manager | | | CI |
| ESTO-S20-CR-2334 | 20.1 CI/CD | Admin | Cross-Role | All | -- | Rollback triggered; Admin notified | Admin notified of rollback | | | CI |

### 20.2 Infrastructure & Deployment (125)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S20-HP-2335 | 20.2 Infra | Admin | Happy | All | Service on Cloud Run | View service logs | Logs displayed in Cloud Logging | | | Dev |
| ESTO-S20-HP-2336 | 20.2 Infra | Admin | Happy | All | Service scaling | Scale service to 3 instances | Service scaled; load balanced | | | Dev |
| ESTO-S20-HP-2337 | 20.2 Infra | Admin | Happy | All | Alert configured | Trigger alert condition | Alert sent to team | | | Dev |
| ESTO-S20-HP-2338 | 20.2 Infra | Admin | Happy | All | Rollback needed | Rollback to previous version | Previous version deployed | | | Dev |
| ESTO-S20-HP-2339 | 20.2 Infra | Admin | Happy | All | Secrets in Secret Manager | Rotate secret | New secret deployed; service updated | | | Dev |
| ESTO-S20-HP-2340 | 20.2 Infra | Admin | Happy | All | Terraform state exists | Plan infrastructure changes | Plan shows diff accurately | | | Dev |
| ESTO-S20-HP-2341 | 20.2 Infra | Admin | Happy | All | Plan approved | Apply terraform changes | Infrastructure updated | | | Dev |
| ESTO-S20-HP-2342 | 20.2 Infra | Admin | Happy | All | VPC connector active | Test private connectivity | Private connection works | | | Dev |
| ESTO-S20-HP-2343 | 20.2 Infra | Admin | Happy | All | Cloud SQL active | Test DB connection | Connection succeeds | | | Dev |
| ESTO-S20-HP-2344 | 20.2 Infra | Admin | Happy | All | GCS bucket exists | Upload test file | File uploaded; accessible via URL | | | Dev |
| ESTO-S20-HP-2345 | 20.2 Infra | Admin | Happy | All | Monitoring configured | View metrics dashboard | Metrics displayed | | | Dev |
| ESTO-S20-HP-2346 | 20.2 Infra | Admin | Happy | All | Uptime checks configured | Service health verified | Health checks pass | | | Dev |
| ESTO-S20-HP-2347 | 20.2 Infra | Admin | Happy | All | Cloud Armor configured | Simulate attack | Attack blocked by Cloud Armor | | | Security |
| ESTO-S20-HP-2348 | 20.2 Infra | Admin | Happy | All | HTTPS LB active | Access via HTTP | Redirected to HTTPS | | | Security |
| ESTO-S20-HP-2349 | 20.2 Infra | Admin | Happy | All | Service on Cloud Run | View revision history | Revisions displayed | | | Dev |
| ESTO-S20-HP-2350 | 20.2 Infra | Admin | Happy | All | Service on Cloud Run | Split traffic between revisions | Traffic split correctly | | | Dev |
| ESTO-S20-HP-2351 | 20.2 Infra | Admin | Happy | All | Concurrency limit set | Test concurrency | Requests queued beyond limit | | | Dev |
| ESTO-S20-HP-2352 | 20.2 Infra | Admin | Happy | All | Cold start measured | First request latency | Cold start within acceptable range | | | Dev |
| ESTO-S20-HP-2353 | 20.2 Infra | Admin | Happy | All | Min instances = 0 | Request after idle period | Cold start; instance spins up | | | Dev |
| ESTO-S20-HP-2354 | 20.2 Infra | Admin | Happy | All | Max instances set | Heavy load | Requests limited to max instances | | | Dev |
| ESTO-S20-HP-2355 | 20.2 Infra | Admin | Happy | All | Workload Identity | New GitHub Actions workflow | Auth to GCP works without JSON keys | | | Security |
| ESTO-S20-HP-2356 | 20.2 Infra | Admin | Happy | All | Multiple environments | Deploy to dev | Dev deployment succeeds | | | Dev |
| ESTO-S20-HP-2357 | 20.2 Infra | Admin | Happy | All | Multiple environments | Deploy to prod | Prod deployment succeeds (with approval) | | | Dev |
| ESTO-S20-HP-2358 | 20.2 Infra | Admin | Happy | All | Image tag = SHA | View deployed version | SHA tag matches GitHub commit | | | Dev |
| ESTO-S20-HP-2359 | 20.2 Infra | Admin | Happy | All | Latest tag not used | Push to prod | SHA-tagged image used | | | Dev |
| ESTO-S20-HP-2360 | 20.2 Infra | Admin | Happy | All | Artifact Registry | List images | Images listed with SHA tags | | | Dev |
| ESTO-S20-HP-2361 | 20.2 Infra | Admin | Happy | All | Image garbage collection | Old images cleaned | Old images purged after retention | | | Dev |
| ESTO-S20-HP-2362 | 20.2 Infra | Admin | Happy | All | Cloud SQL backup enabled | Verify backup schedule | Daily backups exist | | | Dev |
| ESTO-S20-ER-2363 | 20.2 Infra | Admin | Error | All | VPC connector down | Test private DB access | Private access fails; retries | | | Dev |
| ESTO-S20-ER-2364 | 20.2 Infra | Admin | Error | All | Artifact Registry down | Push Docker image | Push fails; error displayed | | | Dev |
| ESTO-S20-ER-2365 | 20.2 Infra | Admin | Error | All | Cloud Run API error | Deploy service | Deploy fails; error shown | | | Dev |
| ESTO-S20-ER-2366 | 20.2 Infra | Admin | Error | All | Out of quota | Create new resource | Error: Quota exceeded | | | Dev |
| ESTO-S20-ER-2367 | 20.2 Infra | Admin | Error | All | IAM permission denied | Access GCP resource | Error: Permission denied | | | Security |
| ESTO-S20-ER-2368 | 20.2 Infra | Admin | Error | All | Workload Identity revoked | Pipeline runs | GCP auth fails; pipeline aborts | | | Dev |
| ESTO-S20-ER-2369 | 20.2 Infra | Admin | Error | All | Load balancer down | Access domain | Domain unreachable; error page | | | Dev |
| ESTO-S20-ER-2370 | 20.2 Infra | Admin | Error | All | Secret Manager down | Access secret | Error: Cannot retrieve secret | | | Security |
| ESTO-S20-ER-2371 | 20.2 Infra | Admin | Error | All | Terraform state corrupted | Plan changes | Error: State corrupted; manual fix needed | | | Dev |
| ESTO-S20-ER-2372 | 20.2 Infra | Admin | Error | All | GCS bucket deleted | Upload file | Upload fails; error shown | | | Dev |
| ESTO-S20-ER-2373 | 20.2 Infra | Admin | Error | All | SSL cert expired | Access domain | Browser shows security warning | | | Dev |
| ESTO-S20-ER-2374 | 20.2 Infra | Admin | Error | All | DNS misconfigured | Access domain | DNS error; fallback works | | | Dev |
| ESTO-S20-ED-2375 | 20.2 Infra | Admin | Edge | All | Heavy traffic | Scale handles load | Service scales; no downtime | | | Dev |
| ESTO-S20-ED-2376 | 20.2 Infra | Admin | Edge | All | Many services | All services healthy | All health checks pass | | | Dev |
| ESTO-S20-ED-2377 | 20.2 Infra | Admin | Edge | All | Service updated | Zero-downtime deployment | No downtime during deploy | | | Dev |
| ESTO-S20-ED-2378 | 20.2 Infra | Admin | Edge | All | DB backup scheduled | Restore from backup | Data restored correctly | | | Dev |
| ESTO-S20-ED-2379 | 20.2 Infra | Admin | Edge | All | Disaster recovery | Simulate region failure | Service recovers in DR region | | | Dev |
| ESTO-S20-ED-2380 | 20.2 Infra | Admin | Edge | All | Network partition | Service handles partition | Service recovers after partition heals | | | Dev |
| ESTO-S20-ED-2381 | 20.2 Infra | Admin | Edge | All | High latency | Service under load | Graceful degradation | | | Dev |
| ESTO-S20-CR-2382 | 20.2 Infra | Admin | Cross-Role | All | Deploy failed | All users see error | Error page for all users | | | Dev |
| ESTO-S20-CR-2383 | 20.2 Infra | Admin | Cross-Role | All | Maintenance mode | Users see banner | Maintenance banner displayed | | | Dev |
| ESTO-S20-CR-2384 | 20.2 Infra | Admin | Cross-Role | All | DB migration run | All services updated | All services work with new schema | | | Dev |
| ESTO-S20-CR-2385 | 20.2 Infra | Admin | Cross-Role | All | Cert rotated | No downtime | No disruption to users | | | Dev |
| ESTO-S20-CR-2386 | 20.2 Infra | Manager | Cross-Role | All | -- | Manager monitors deployment | Manager sees deployment status | | | Dev |
| ESTO-S20-CR-2387 | 20.2 Infra | User | Cross-Role | All | -- | User experiences deployment | Seamless; no disruption | | | Dev |
| ESTO-S20-CR-2388 | 20.2 Infra | Admin | Cross-Role | All | -- | Infrastructure change; Admin notified | Admin receives change notification | | | Dev |
| ESTO-S20-CR-2389 | 20.2 Infra | Admin | Cross-Role | All | -- | Security patch deployed | Patch deployed across all services | | | Security |
| ESTO-S20-CR-2390 | 20.2 Infra | User | Cross-Role | All | -- | User on slow network; service scales | Service remains accessible | | | Dev |

---

## Section 21: Community & Engagement (300)

### 21.1 Community Feed & Posts (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S21-HP-2391 | 21.1 Feed | User | Happy | All | Logged in | View community feed | Feed displayed with posts | | | |
| ESTO-S21-HP-2392 | 21.1 Feed | User | Happy | All | Feed viewed | Create community post | Post created; visible in feed | | | |
| ESTO-S21-HP-2393 | 21.1 Feed | User | Happy | All | Post created | Like a post | Like count incremented | | | |
| ESTO-S21-HP-2394 | 21.1 Feed | User | Happy | All | Post exists | Comment on post | Comment posted; visible | | | |
| ESTO-S21-HP-2395 | 21.1 Feed | User | Happy | All | Post exists | Share post | Share successful | | | |
| ESTO-S21-HP-2396 | 21.1 Feed | User | Happy | All | Post exists | Edit own post | Post updated | | | |
| ESTO-S21-HP-2397 | 21.1 Feed | User | Happy | All | Post exists | Delete own post | Post removed | | | |
| ESTO-S21-HP-2398 | 21.1 Feed | User | Happy | All | Posts exist | Filter by category | Filtered feed displayed | | | |
| ESTO-S21-HP-2399 | 21.1 Feed | User | Happy | All | Posts exist | Search community posts | Matching posts displayed | | | |
| ESTO-S21-HP-2400 | 21.1 Feed | User | Happy | All | Post exists | Report post | Report submitted; admin notified | | | |
| ESTO-S21-HP-2401 | 21.1 Feed | User | Happy | All | Community active | Follow another user | Follow successful | | | |
| ESTO-S21-HP-2402 | 21.1 Feed | User | Happy | All | Following users | View followed users' posts | Posts displayed in feed | | | |
| ESTO-S21-HP-2403 | 21.1 Feed | User | Happy | All | Post exists | Bookmark post | Post bookmarked | | | |
| ESTO-S21-HP-2404 | 21.1 Feed | User | Happy | All | Bookmarks exist | View bookmarked posts | Bookmarked posts displayed | | | |
| ESTO-S21-HP-2405 | 21.1 Feed | User | Happy | All | Post exists | Mute post thread | Thread muted | | | |
| ESTO-S21-HP-2406 | 21.1 Feed | User | Happy | All | Post exists | View post analytics | Analytics displayed | | | |
| ESTO-S21-HP-2407 | 21.1 Feed | User | Happy | All | Post with media | Upload media to post | Media uploaded and displayed | | | |
| ESTO-S21-HP-2408 | 21.1 Feed | User | Happy | All | Post exists | Tag user in post | User tagged; notified | | | |
| ESTO-S21-HP-2409 | 21.1 Feed | User | Happy | All | Post exists | Add poll to post | Poll created; visible | | | |
| ESTO-S21-HP-2410 | 21.1 Feed | User | Happy | All | Poll exists | Vote in poll | Vote recorded | | | |
| ESTO-S21-HP-2411 | 21.1 Feed | Manager | Happy | All | Community exists | Create official post | Official post created | | | |
| ESTO-S21-HP-2412 | 21.1 Feed | Manager | Happy | All | Post exists | Pin post | Post pinned to top | | | |
| ESTO-S21-HP-2413 | 21.1 Feed | Manager | Happy | All | Post exists | Feature post | Post featured in sidebar | | | |
| ESTO-S21-HP-2414 | 21.1 Feed | Manager | Happy | All | Posts exist | View community analytics | Engagement metrics displayed | | | |
| ESTO-S21-HP-2415 | 21.1 Feed | Manager | Happy | All | Post reported | Moderate post | Post moderated | | | |
| ESTO-S21-HP-2416 | 21.1 Feed | Admin | Happy | All | All posts | View all posts across communities | All posts listed | | | |
| ESTO-S21-HP-2417 | 21.1 Feed | Admin | Happy | All | Post reported | Remove post | Post removed; poster notified | | | |
| ESTO-S21-HP-2418 | 21.1 Feed | Admin | Happy | All | User banned | User's posts hidden | Posts hidden from feed | | | Security |
| ESTO-S21-HP-2419 | 21.1 Feed | Admin | Happy | All | Multiple posts | Bulk moderate posts | All moderated | | | |
| ESTO-S21-HP-2420 | 21.1 Feed | Admin | Happy | All | Reports exist | View moderation queue | Queue displayed | | | |
| ESTO-S21-HP-2421 | 21.1 Feed | Admin | Happy | All | Report processed | Notify reporter of action | Reporter notified | | | |
| ESTO-S21-HP-2422 | 21.1 Feed | Manager | Happy | All | Community active | Create event announcement | Announcement created | | | |
| ESTO-S21-HP-2423 | 21.1 Feed | User | Happy | All | Post shared | View share analytics | Share analytics displayed | | | |
| ESTO-S21-HP-2424 | 21.1 Feed | User | Happy | All | Feed has posts | Sort feed by latest | Sorted by latest | | | |
| ESTO-S21-HP-2425 | 21.1 Feed | User | Happy | All | Feed has posts | Sort feed by popular | Sorted by likes | | | |
| ESTO-S21-HP-2426 | 21.1 Feed | User | Happy | All | Post exists | View post detail | Full post with all comments | | | |
| ESTO-S21-HP-2427 | 21.1 Feed | User | Happy | All | Post exists | Reply to comment | Nested reply created | | | |
| ESTO-S21-HP-2428 | 21.1 Feed | User | Happy | All | Comments exist | Collapse thread | Thread collapsed | | | |
| ESTO-S21-HP-2429 | 21.1 Feed | User | Happy | All | Comments exist | Expand thread | Thread expanded | | | |
| ESTO-S21-HP-2430 | 21.1 Feed | User | Happy | All | Comments exist | Sort comments | Comments sorted by newest/top | | | |
| ESTO-S21-HP-2431 | 21.1 Feed | User | Happy | All | Comments exist | Hide comments | Comments hidden | | | |
| ESTO-S21-HP-2432 | 21.1 Feed | User | Happy | All | Post exists | Add emoji reaction | Emoji reaction added | | | |
| ESTO-S21-HP-2433 | 21.1 Feed | User | Happy | All | Post exists | View reaction breakdown | All reactions displayed | | | |
| ESTO-S21-HP-2434 | 21.1 Feed | User | Happy | All | Post exists | Share to external platform | Post shared externally | | | |
| ESTO-S21-HP-2435 | 21.1 Feed | User | Happy | All | Post created | Schedule post for later | Post scheduled | | | |
| ESTO-S21-HP-2436 | 21.1 Feed | User | Happy | All | Post scheduled | View scheduled posts | Scheduled posts displayed | | | |
| ESTO-S21-HP-2437 | 21.1 Feed | User | Happy | All | Post exists | View who liked post | Likers list displayed | | | |
| ESTO-S21-HP-2438 | 21.1 Feed | User | Happy | All | User blocked | Blocked user's posts hidden | Blocked posts not shown | | | Security |
| ESTO-S21-HP-2439 | 21.1 Feed | User | Happy | All | User reported | Block user | User blocked | | | Security |
| ESTO-S21-HP-2440 | 21.1 Feed | User | Happy | All | Post exists | Copy link to post | Link copied to clipboard | | | |
| ESTO-S21-HP-2441 | 21.1 Feed | User | Happy | All | Deep link shared | Open post from link | Post opens correctly | | | |
| ESTO-S21-HP-2442 | 21.1 Feed | User | Happy | All | Post exists | View full-size media | Media opens in viewer | | | |
| ESTO-S21-HP-2443 | 21.1 Feed | User | Happy | All | Community has rules | View community rules | Rules displayed | | | |
| ESTO-S21-HP-2444 | 21.1 Feed | User | Happy | All | User new to community | Join community | Joined; welcome message shown | | | |
| ESTO-S21-HP-2445 | 21.1 Feed | User | Happy | All | User joined community | Leave community | Left community | | | |
| ESTO-S21-HP-2446 | 21.1 Feed | User | Happy | All | Post exists | Translate post content | Translation displayed | | | |
| ESTO-S21-HP-2447 | 21.1 Feed | User | Happy | All | Multiple communities | Switch community feed | Different community's posts shown | | | |
| ESTO-S21-HP-2448 | 21.1 Feed | User | Happy | All | Post exists | View original poster's profile | Profile navigated to | | | |
| ESTO-S21-HP-2449 | 21.1 Feed | User | Happy | All | Post exists | View related posts | Related posts displayed | | | |
| ESTO-S21-HP-2450 | 21.1 Feed | User | Happy | All | Community exists | View community members | Member list displayed | | | |
| ESTO-S21-HP-2451 | 21.1 Feed | User | Happy | All | Member list exists | Search members | Matching members displayed | | | |
| ESTO-S21-HP-2452 | 21.1 Feed | User | Happy | All | Community active | View trending posts | Trending posts displayed | | | |
| ESTO-S21-HP-2453 | 21.1 Feed | User | Happy | All | Post exists | View post history | Edit history displayed | | | |
| ESTO-S21-HP-2454 | 21.1 Feed | User | Happy | All | Post archived | View archived post | Archived post displayed | | | |
| ESTO-S21-HP-2455 | 21.1 Feed | Manager | Happy | All | Post exists | Edit any post | Post updated as manager | | | |
| ESTO-S21-HP-2456 | 21.1 Feed | Manager | Happy | All | Post exists | Delete any post | Post removed | | | |
| ESTO-S21-HP-2457 | 21.1 Feed | Manager | Happy | All | Posts exist | Approve pending posts | Posts approved; live | | | |
| ESTO-S21-HP-2458 | 21.1 Feed | Manager | Happy | All | Posts exist | Reject pending posts | Posts rejected; authors notified | | | |
| ESTO-S21-HP-2459 | 21.1 Feed | Manager | Happy | All | Community exists | Create announcement | Announcement created; pinned | | | |
| ESTO-S21-HP-2460 | 21.1 Feed | Manager | Happy | All | Announcements exist | Manage announcements | Announcements editable | | | |
| ESTO-S21-HP-2461 | 21.1 Feed | Admin | Happy | All | Communities exist | View all communities | All communities listed | | | |
| ESTO-S21-HP-2462 | 21.1 Feed | Admin | Happy | All | Community exists | Create new community | Community created | | | |
| ESTO-S21-HP-2463 | 21.1 Feed | Admin | Happy | All | Community exists | Edit community settings | Settings updated | | | |
| ESTO-S21-HP-2464 | 21.1 Feed | Admin | Happy | All | Community exists | Archive community | Community archived | | | |
| ESTO-S21-HP-2465 | 21.1 Feed | Admin | Happy | All | Communities exist | Set community visibility | Visibility updated | | | |
| ESTO-S21-HP-2466 | 21.1 Feed | Admin | Happy | All | Communities exist | View community analytics | Analytics displayed | | | |
| ESTO-S21-HP-2467 | 21.1 Feed | Admin | Happy | All | Users active | Set user roles | User roles updated | | | |
| ESTO-S21-HP-2468 | 21.1 Feed | Admin | Happy | All | Posts exist | Set auto-moderation rules | Rules applied | | | |
| ESTO-S21-HP-2469 | 21.1 Feed | Admin | Happy | All | Spam detected | Auto-remove spam | Spam removed; user warned | | | Security |
| ESTO-S21-HP-2470 | 21.1 Feed | Admin | Happy | All | Moderation queue | Process moderation items | All items processed | | | |
| ESTO-S21-HP-2471 | 21.1 Feed | Admin | Happy | All | Users exist | Ban user from community | User banned; posts hidden | | | Security |
| ESTO-S21-HP-2472 | 21.1 Feed | Admin | Happy | All | Ban in effect | Lift user ban | User unbanned; access restored | | | |
| ESTO-S21-HP-2473 | 21.1 Feed | Admin | Happy | All | Users exist | Grant moderator role | User becomes moderator | | | |
| ESTO-S21-HP-2474 | 21.1 Feed | Admin | Happy | All | Moderators exist | Revoke moderator role | Role revoked | | | |
| ESTO-S21-HP-2475 | 21.1 Feed | Admin | Happy | All | Communities exist | Merge communities | Communities merged | | | |
| ESTO-S21-HP-2476 | 21.1 Feed | Admin | Happy | All | Community analytics | Export community report | Report exported | | | |
| ESTO-S21-HP-2477 | 21.1 Feed | Admin | Happy | All | Posts exist | View flagged content | Flagged content displayed | | | Security |
| ESTO-S21-HP-2478 | 21.1 Feed | Admin | Happy | All | Flagged content exists | Take action on flag | Action taken; reporter notified | | | Security |
| ESTO-S21-HP-2479 | 21.1 Feed | Admin | Happy | All | Communities exist | Set content policies | Policies applied | | | Security |
| ESTO-S21-HP-2480 | 21.1 Feed | Admin | Happy | All | Reports exist | View report trends | Trends displayed | | | |
| ESTO-S21-HP-2481 | 21.1 Feed | User | Happy | All | Post exists | View thread context | Context displayed | | | |
| ESTO-S21-HP-2482 | 21.1 Feed | User | Happy | All | Feed loaded | Infinite scroll | More posts loaded on scroll | | | |
| ESTO-S21-HP-2483 | 21.1 Feed | User | Happy | All | Post viewed | View post reactions | Reactions displayed | | | |
| ESTO-S21-HP-2484 | 21.1 Feed | User | Happy | All | Comments exist | Reply to comment with media | Media reply posted | | | |
| ESTO-S21-HP-2485 | 21.1 Feed | User | Happy | All | Post exists | Mention user in comment | Mentioned user notified | | | |
| ESTO-S21-HP-2486 | 21.1 Feed | User | Happy | All | Following users | View posts from follows | Follows' posts prioritized | | | |
| ESTO-S21-HP-2487 | 21.1 Feed | User | Happy | All | Post exists | Save post offline | Post saved for offline reading | | | |
| ESTO-S21-HP-2488 | 21.1 Feed | User | Happy | All | Offline | View saved posts | Saved posts available offline | | | |
| ESTO-S21-HP-2489 | 21.1 Feed | User | Happy | All | Post exists | Unfollow post thread | Thread unfollowed | | | |
| ESTO-S21-HP-2490 | 21.1 Feed | User | Happy | All | Post exists | View thread of replies | Full thread displayed | | | |
| ESTO-S21-EM-2491 | 21.1 Feed | User | Empty | All | -- | View feed with no posts | Empty state displayed | | | |
| ESTO-S21-EM-2492 | 21.1 Feed | User | Empty | All | -- | View comments with none | Empty state displayed | | | |
| ESTO-S21-ER-2493 | 21.1 Feed | User | Error | All | Community service down | View feed | Error toast; cached data | | | |
| ESTO-S21-ER-2494 | 21.1 Feed | User | Error | All | -- | XSS in post content | Input escaped; no XSS | | | Security |
| ESTO-S21-ER-2495 | 21.1 Feed | User | Error | All | Network offline | Create post | Network error; queued for retry | | | |
| ESTO-S21-ER-2496 | 21.1 Feed | User | Error | All | Mock backend | Mock 500 on post | Error toast; no crash | | | |
| ESTO-S21-ER-2497 | 21.1 Feed | User | Error | All | -- | Post spam in thread | Spam filter triggers | | | |
| ESTO-S21-ER-2498 | 21.1 Feed | Guest | Error | All | -- | Access community without auth | Redirected to /login | | | |
| ESTO-S21-ER-2499 | 21.1 Feed | User | Error | All | -- | Post with blocked word | Post blocked; warning shown | | | Security |
| ESTO-S21-ER-2500 | 21.1 Feed | User | Error | All | Rate limited | Post rapidly | Error: Rate limit exceeded | | | Security |
| ESTO-S21-ED-2501 | 21.1 Feed | User | Edge | All | Feed exists | Rapid posting (50 posts) | All posted; rate limit handled | | | |
| ESTO-S21-ED-2502 | 21.1 Feed | User | Edge | All | Feed exists | Post with 5000-char text | Post saved; truncated if needed | | | |
| ESTO-S21-ED-2503 | 21.1 Feed | User | Edge | All | Feed exists | Post with unicode text | Unicode handled correctly | | | |
| ESTO-S21-ED-2504 | 21.1 Feed | User | Edge | All | Feed exists | Post with emoji only | Emoji post created | | | |
| ESTO-S21-ED-2505 | 21.1 Feed | User | Edge | All | Feed exists | Edit post 100 times | All edits saved; history logged | | | |
| ESTO-S21-ED-2506 | 21.1 Feed | User | Edge | All | Feed exists | Comment with 100 replies | Thread loaded; performance OK | | | |
| ESTO-S21-ED-2507 | 21.1 Feed | User | Edge | All | Feed exists | Post with 10 images | All images displayed; lazy loaded | | | |
| ESTO-S21-ED-2508 | 21.1 Feed | User | Edge | All | Feed exists | View 10000 posts | Infinite scroll; performance OK | | | |
| ESTO-S21-ED-2509 | 21.1 Feed | User | Edge | All | Feed exists | Rapid scroll through feed | Feed loads smoothly | | | |
| ESTO-S21-ED-2510 | 21.1 Feed | User | Edge | All | Feed exists | Post while offline | Post queued; synced when online | | | |
| ESTO-S21-CR-2511 | 21.1 Feed | Admin | Cross-Role | All | Post created | Admin removes post; User notified | User sees removal notification | | | |
| ESTO-S21-CR-2512 | 21.1 Feed | Admin | Cross-Role | All | Post flagged | Admin bans user | User banned; posts removed | | | Security |
| ESTO-S21-CR-2513 | 21.1 Feed | Manager | Cross-Role | All | Manager creates post | Post visible to team | Team sees post | | | |
| ESTO-S21-CR-2514 | 21.1 Feed | Admin | Cross-Role | All | Posts exist | Admin pins post | Post pinned to top | | | |
| ESTO-S21-CR-2515 | 21.1 Feed | Admin | Cross-Role | All | Community analytics | Admin views engagement metrics | Metrics displayed | | | |
| ESTO-S21-CR-2516 | 21.1 Feed | User | Cross-Role | All | User reports post | Admin sees report in queue | Report visible to admin | | | Security |
| ESTO-S21-CR-2517 | 21.1 Feed | Manager | Cross-Role | All | Manager moderates | User sees moderation message | Moderation message displayed | | | |
| ESTO-S21-CR-2518 | 21.1 Feed | Admin | Cross-Role | All | Community metrics | Admin views community growth | Growth metrics displayed | | | |
| ESTO-S21-CR-2519 | 21.1 Feed | User | Cross-Role | All | User follows manager | Manager sees follower count | Follower count updated | | | |
| ESTO-S21-CR-2520 | 21.1 Feed | Admin | Cross-Role | All | User creates post | Admin reviews flagged content | Admin sees content in review | | | Security |

### 21.2 Events & Meetups (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S21-HP-2521 | 21.2 Events | User | Happy | All | Logged in | View events list | Events displayed | | | |
| ESTO-S21-HP-2522 | 21.2 Events | User | Happy | All | Events displayed | RSVP to event | RSVP confirmed | | | |
| ESTO-S21-HP-2523 | 21.2 Events | User | Happy | All | RSVP'd | Cancel RSVP | RSVP cancelled | | | |
| ESTO-S21-HP-2524 | 21.2 Events | User | Happy | All | Event exists | Create event | Event created | | | |
| ESTO-S21-HP-2525 | 21.2 Events | User | Happy | All | Events exist | Filter by event type | Filtered events displayed | | | |
| ESTO-S21-HP-2526 | 21.2 Events | User | Happy | All | Event upcoming | Set event reminder | Reminder set | | | |
| ESTO-S21-HP-2527 | 21.2 Events | User | Happy | All | RSVP'd to event | View event attendees | Attendee list displayed | | | |
| ESTO-S21-HP-2528 | 21.2 Events | User | Happy | All | Event exists | Share event with friends | Event shared via link | | | |
| ESTO-S21-HP-2529 | 21.2 Events | Manager | Happy | All | Events exist | Create community event | Event created | | | |
| ESTO-S21-HP-2530 | 21.2 Events | Manager | Happy | All | Event created | Edit event details | Event updated | | | |
| ESTO-S21-HP-2531 | 21.2 Events | Manager | Happy | All | Event active | Cancel event | Event cancelled; attendees notified | | | |
| ESTO-S21-HP-2532 | 21.2 Events | Manager | Happy | All | Event exists | View event analytics | Attendance analytics displayed | | | |
| ESTO-S21-HP-2533 | 21.2 Events | Manager | Happy | All | Event exists | Manage registrations | Registration list displayed | | | |
| ESTO-S21-HP-2534 | 21.2 Events | Manager | Happy | All | Event exists | Send update to attendees | Update sent to all attendees | | | |
| ESTO-S21-HP-2535 | 21.2 Events | Manager | Happy | All | Events exist | Create recurring event | Recurring event created | | | |
| ESTO-S21-HP-2536 | 21.2 Events | Manager | Happy | All | Recurring event | Edit single occurrence | Occurrence updated | | | |
| ESTO-S21-HP-2537 | 21.2 Events | Admin | Happy | All | Events exist | View all events across communities | All events listed | | | |
| ESTO-S21-HP-2538 | 21.2 Events | Admin | Happy | All | Event reported | Remove event | Event removed; organiser notified | | | |
| ESTO-S21-HP-2539 | 21.2 Events | Admin | Happy | All | Events exist | Feature event | Event featured | | | |
| ESTO-S21-HP-2540 | 21.2 Events | User | Happy | All | Event exists | Add to calendar | Calendar event created | | | |
| ESTO-S21-HP-2541 | 21.2 Events | User | Happy | All | Event exists | View event location | Location displayed on map | | | |
| ESTO-S21-HP-2542 | 21.2 Events | User | Happy | All | Event has attendees | View attendee profiles | Attendee profiles displayed | | | |
| ESTO-S21-HP-2543 | 21.2 Events | User | Happy | All | Event exists | Leave review for event | Review posted | | | |
| ESTO-S21-HP-2544 | 21.2 Events | User | Happy | All | Events exist | Search events by location | Matching events displayed | | | |
| ESTO-S21-HP-2545 | 21.2 Events | User | Happy | All | Events exist | Search events by date | Matching events displayed | | | |
| ESTO-S21-HP-2546 | 21.2 Events | User | Happy | All | Event exists | View event photos | Photo gallery displayed | | | |
| ESTO-S21-HP-2547 | 21.2 Events | User | Happy | All | Event exists | View event discussion | Discussion thread displayed | | | |
| ESTO-S21-HP-2548 | 21.2 Events | User | Happy | All | Event exists | Set event notification | Notification configured | | | |
| ESTO-S21-HP-2549 | 21.2 Events | Manager | Happy | All | Event exists | Check in attendees | Attendees checked in | | | |
| ESTO-S21-HP-2550 | 21.2 Events | Manager | Happy | All | Event active | Broadcast live update | Live update sent to attendees | | | |
| ESTO-S21-HP-2551 | 21.2 Events | Manager | Happy | All | Event active | Generate event QR code | QR code generated | | | |
| ESTO-S21-HP-2552 | 21.2 Events | Manager | Happy | All | Event exists | Export attendee list | Attendee list exported | | | |
| ESTO-S21-HP-2553 | 21.2 Events | Admin | Happy | All | Events exist | View event reports | Reports displayed | | | |
| ESTO-S21-HP-2554 | 21.2 Events | Admin | Happy | All | Events exist | Set approval required | Approval required for new events | | | |
| ESTO-S21-HP-2555 | 21.2 Events | Admin | Happy | All | Events pending | Approve/reject events | Events approved/rejected | | | |
| ESTO-S21-HP-2556 | 21.2 Events | Admin | Happy | All | Event categories exist | Manage event categories | Categories managed | | | |
| ESTO-S21-HP-2557 | 21.2 Events | Admin | Happy | All | Events exist | View cancellation rates | Cancellation metrics displayed | | | |
| ESTO-S21-HP-2558 | 21.2 Events | User | Happy | All | RSVP'd to past event | View event recap | Recap displayed | | | |
| ESTO-S21-HP-2559 | 21.2 Events | User | Happy | All | Events in wishlist | View wishlisted events | Events displayed | | | |
| ESTO-S21-HP-2560 | 21.2 Events | User | Happy | All | Event exists | Invite friends to event | Invites sent | | | |
| ESTO-S21-HP-2561 | 21.2 Events | User | Happy | All | Event exists | View event requirements | Requirements displayed | | | |
| ESTO-S21-HP-2562 | 21.2 Events | User | Happy | All | Event exists | Request special accommodation | Request submitted | | | |
| ESTO-S21-HP-2563 | 21.2 Events | Manager | Happy | All | Event exists | Add co-host | Co-host added | | | |
| ESTO-S21-HP-2564 | 21.2 Events | Manager | Happy | All | Co-host added | Co-host can edit | Co-host has edit permissions | | | |
| ESTO-S21-HP-2565 | 21.2 Events | Manager | Happy | All | Event exists | Set capacity limit | Capacity limit enforced | | | |
| ESTO-S21-HP-2566 | 21.2 Events | Manager | Happy | All | Event full | Add to waitlist | Added to waitlist | | | |
| ESTO-S21-HP-2567 | 21.2 Events | Manager | Happy | All | Event full | Promote from waitlist | User promoted; notified | | | |
| ESTO-S21-HP-2568 | 21.2 Events | Manager | Happy | All | Event active | Enable virtual attendance | Virtual link generated | | | |
| ESTO-S21-HP-2569 | 21.2 Events | User | Happy | All | Virtual event | Join via link | Virtual event opens | | | |
| ESTO-S21-HP-2570 | 21.2 Events | User | Happy | All | Virtual event | Use virtual features | Chat; Q&A works | | | |
| ESTO-S21-HP-2571 | 21.2 Events | User | Happy | All | Hybrid event | Choose attendance mode | Mode selected; confirmed | | | |
| ESTO-S21-HP-2572 | 21.2 Events | User | Happy | All | Event exists | View event FAQ | FAQ displayed | | | |
| ESTO-S21-HP-2573 | 21.2 Events | User | Happy | All | Event exists | Contact event organiser | Message sent to organiser | | | |
| ESTO-S21-HP-2574 | 21.2 Events | User | Happy | All | Event past | View event recording | Recording available | | | |
| ESTO-S21-HP-2575 | 21.2 Events | User | Happy | All | Event has feedback | Submit feedback | Feedback submitted | | | |
| ESTO-S21-HP-2576 | 21.2 Events | Manager | Happy | All | Feedback collected | View event feedback | Feedback report displayed | | | |
| ESTO-S21-HP-2577 | 21.2 Events | Admin | Happy | All | Events exist | View event category analytics | Category analytics displayed | | | |
| ESTO-S21-HP-2578 | 21.2 Events | Admin | Happy | All | Events exist | View venue analytics | Venue analytics displayed | | | |
| ESTO-S21-HP-2579 | 21.2 Events | Admin | Happy | All | Events exist | Set event approval workflow | Workflow configured | | | |
| ESTO-S21-HP-2580 | 21.2 Events | Admin | Happy | All | Events exist | Disable community events | Events disabled | | | |
| ESTO-S21-HP-2581 | 21.2 Events | User | Happy | All | Event exists | View price/ticket info | Ticket info displayed | | | |
| ESTO-S21-HP-2582 | 21.2 Events | User | Happy | All | Event has tickets | Purchase ticket | Ticket purchased | | | |
| ESTO-S21-HP-2583 | 21.2 Events | User | Happy | All | Ticket purchased | View ticket | Ticket displayed with QR | | | |
| ESTO-S21-HP-2584 | 21.2 Events | User | Happy | All | Ticket purchased | Transfer ticket | Ticket transferred | | | |
| ESTO-S21-HP-2585 | 21.2 Events | User | Happy | All | Ticket purchased | Refund ticket | Refund processed | | | |
| ESTO-S21-HP-2586 | 21.2 Events | Manager | Happy | All | Tickets sold | View ticket sales | Sales report displayed | | | |
| ESTO-S21-HP-2587 | 21.2 Events | Manager | Happy | All | Tickets sold | Set ticket price tier | Price tiers updated | | | |
| ESTO-S21-HP-2588 | 21.2 Events | Manager | Happy | All | Tickets exist | Generate attendee badges | Badges generated | | | |
| ESTO-S21-HP-2589 | 21.2 Events | Manager | Happy | All | Event exists | Set capacity per ticket type | Capacity per type enforced | | | |
| ESTO-S21-HP-2590 | 21.2 Events | Manager | Happy | All | Event exists | Enable waitlist | Waitlist enabled | | | |
| ESTO-S21-HP-2591 | 21.2 Events | Manager | Happy | All | Event exists | Set refund policy | Refund policy applied | | | |
| ESTO-S21-HP-2592 | 21.2 Events | Manager | Happy | All | Event exists | Generate event code | Promo code generated | | | |
| ESTO-S21-HP-2593 | 21.2 Events | User | Happy | All | Promo code exists | Apply promo code | Discount applied | | | |
| ESTO-S21-HP-2594 | 21.2 Events | User | Happy | All | Event exists | View event terms | Terms displayed | | | |
| ESTO-S21-HP-2595 | 21.2 Events | Admin | Happy | All | Ticketed events | View revenue analytics | Revenue metrics displayed | | | |
| ESTO-S21-HP-2596 | 21.2 Events | Admin | Happy | All | Tickets exist | Audit ticket transactions | Transaction audit displayed | | | Security |
| ESTO-S21-HP-2597 | 21.2 Events | Admin | Happy | All | Refunds exist | Process bulk refunds | Bulk refunds processed | | | |
| ESTO-S21-HP-2598 | 21.2 Events | Admin | Happy | All | Events exist | View attendance reports | Attendance reports displayed | | | |
| ESTO-S21-HP-2599 | 21.2 Events | Admin | Happy | All | Events exist | Flag suspicious events | Events flagged for review | | | Security |
| ESTO-S21-HP-2600 | 21.2 Events | Admin | Happy | All | Events flagged | Investigate flagged events | Investigation workflow active | | | Security |
| ESTO-S21-HP-2601 | 21.2 Events | User | Happy | All | Event exists | View event schedule | Schedule displayed | | | |
| ESTO-S21-HP-2602 | 21.2 Events | User | Happy | All | Event has speakers | View speaker profiles | Speaker profiles displayed | | | |
| ESTO-S21-HP-2603 | 21.2 Events | User | Happy | All | Event exists | View event venue | Venue info and map displayed | | | |
| ESTO-S21-HP-2604 | 21.2 Events | User | Happy | All | Event in past | Rate event | Rating submitted | | | |
| ESTO-S21-HP-2605 | 21.2 Events | User | Happy | All | Event attended | View attendance certificate | Certificate displayed | | | |
| ESTO-S21-HP-2606 | 21.2 Events | User | Happy | All | Events in wishlist | Get notified of new events | Notification received | | | |
| ESTO-S21-HP-2607 | 21.2 Events | User | Happy | All | Event exists | View event privacy settings | Privacy settings displayed | | | Security |
| ESTO-S21-HP-2608 | 21.2 Events | Manager | Happy | All | Event exists | Set event privacy | Privacy updated | | | Security |
| ESTO-S21-HP-2609 | 21.2 Events | Manager | Happy | All | Event private | Invite-only access | Invited users can access | | | Security |
| ESTO-S21-HP-2610 | 21.2 Events | Manager | Happy | All | Event exists | Enable registration approval | Approval required for RSVP | | | |
| ESTO-S21-EM-2611 | 21.2 Events | User | Empty | All | -- | View events with none | Empty state displayed | | | |
| ESTO-S21-EM-2612 | 21.2 Events | User | Empty | All | -- | View RSVP with none | Empty state displayed | | | |
| ESTO-S21-ER-2613 | 21.2 Events | User | Error | All | Event service down | View events | Error toast; cached data | | | |
| ESTO-S21-ER-2614 | 21.2 Events | User | Error | All | Event full | RSVP to event | Error: Event is full; waitlist option | | | |
| ESTO-S21-ER-2615 | 21.2 Events | User | Error | All | Event cancelled | View cancelled event | Event shown as cancelled | | | |
| ESTO-S21-ER-2616 | 21.2 Events | User | Error | All | Mock backend | Mock 500 on RSVP | Error toast; no crash | | | |
| ESTO-S21-ER-2617 | 21.2 Events | User | Error | All | Network offline | RSVP to event | Network error; queued | | | |
| ESTO-S21-ER-2618 | 21.2 Events | User | Error | All | -- | XSS in event description | Input escaped; no XSS | | | Security |
| ESTO-S21-ER-2619 | 21.2 Events | User | Error | All | Rate limited | RSVP rapidly | Error: Rate limit exceeded | | | |
| ESTO-S21-ER-2620 | 21.2 Events | User | Error | All | Event past | RSVP to past event | Error: Event already ended | | | |
| ESTO-S21-ED-2621 | 21.2 Events | User | Edge | All | Events exist | RSVP to 50 events | All RSVPs confirmed | | | |
| ESTO-S21-ED-2622 | 21.2 Events | User | Edge | All | Event exists | RSVP just before event starts | RSVP accepted if spots available | | | |
| ESTO-S21-ED-2623 | 21.2 Events | Manager | Edge | All | Event exists | Manage event with 1000 attendees | All attendees manageable | | | |
| ESTO-S21-ED-2624 | 21.2 Events | User | Edge | All | Events exist | View events across timezones | Correct dates per timezone | | | |
| ESTO-S21-ED-2625 | 21.2 Events | User | Edge | All | Event with 500 photos | Browse event gallery | Gallery loads smoothly | | | |
| ESTO-S21-CR-2626 | 21.2 Events | Admin | Cross-Role | All | Event reported | Admin removes event | Event removed; organiser notified | | | |
| ESTO-S21-CR-2627 | 21.2 Events | User | Cross-Role | All | User RSVP'd | Manager sees RSVP count | Manager sees updated count | | | |
| ESTO-S21-CR-2628 | 21.2 Events | Admin | Cross-Role | All | Events exist | Admin sees event analytics | Event analytics displayed | | | |
| ESTO-S21-CR-2629 | 21.2 Events | Manager | Cross-Role | All | Manager creates event | Users see in feed | Event displayed in feed | | | |
| ESTO-S21-CR-2630 | 21.2 Events | Admin | Cross-Role | All | Event approved | Manager sees approval | Manager sees approval status | | | |

### 21.3 Forum & Discussion (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S21-HP-2631 | 21.3 Forum | User | Happy | All | Forum exists | View forum threads | Threads displayed | | | |
| ESTO-S21-HP-2632 | 21.3 Forum | User | Happy | All | Forum viewed | Create thread | Thread created | | | |
| ESTO-S21-HP-2633 | 21.3 Forum | User | Happy | All | Thread exists | Reply to thread | Reply posted | | | |
| ESTO-S21-HP-2634 | 21.3 Forum | User | Happy | All | Thread exists | Mark thread as solved | Thread marked solved | | | |
| ESTO-S21-HP-2635 | 21.3 Forum | User | Happy | All | Threads exist | Upvote reply | Upvote count incremented | | | |
| ESTO-S21-HP-2636 | 21.3 Forum | User | Happy | All | Thread exists | Downvote reply | Downvote count incremented | | | |
| ESTO-S21-HP-2637 | 21.3 Forum | User | Happy | All | Thread exists | Bookmark thread | Thread bookmarked | | | |
| ESTO-S21-HP-2638 | 21.3 Forum | User | Happy | All | Threads exist | View bookmarked threads | Bookmarked threads displayed | | | |
| ESTO-S21-HP-2639 | 21.3 Forum | User | Happy | All | Thread exists | Report reply | Report submitted | | | |
| ESTO-S21-HP-2640 | 21.3 Forum | User | Happy | All | Threads exist | Filter by status | Filtered threads displayed | | | |
| ESTO-S21-HP-2641 | 21.3 Forum | User | Happy | All | Threads exist | Search forum | Matching threads displayed | | | |
| ESTO-S21-HP-2642 | 21.3 Forum | User | Happy | All | Thread exists | Subscribe to thread | Subscribed; notifications enabled | | | |
| ESTO-S21-HP-2643 | 21.3 Forum | User | Happy | All | Subscribed | View subscribed threads | Subscribed threads displayed | | | |
| ESTO-S21-HP-2644 | 21.3 Forum | User | Happy | All | Thread exists | Share thread | Thread shared via link | | | |
| ESTO-S21-HP-2645 | 21.3 Forum | User | Happy | All | Thread exists | View thread analytics | Views/likes displayed | | | |
| ESTO-S21-HP-2646 | 21.3 Forum | User | Happy | All | Thread exists | Accept best answer | Best answer marked | | | |
| ESTO-S21-HP-2647 | 21.3 Forum | User | Happy | All | Thread exists | Unsubscribe from thread | Unsubscribed | | | |
| ESTO-S21-HP-2648 | 21.3 Forum | Manager | Happy | All | Forum exists | Create official thread | Official thread created | | | |
| ESTO-S21-HP-2649 | 21.3 Forum | Manager | Happy | All | Thread exists | Pin thread | Thread pinned | | | |
| ESTO-S21-HP-2650 | 21.3 Forum | Manager | Happy | All | Thread exists | Lock thread | Thread locked | | | |
| ESTO-S21-HP-2651 | 21.3 Forum | Manager | Happy | All | Thread exists | Edit any reply | Reply edited | | | |
| ESTO-S21-HP-2652 | 21.3 Forum | Manager | Happy | All | Thread exists | Delete any reply | Reply deleted | | | |
| ESTO-S21-HP-2653 | 21.3 Forum | Manager | Happy | All | Forum exists | View forum analytics | Analytics displayed | | | |
| ESTO-S21-HP-2654 | 21.3 Forum | Manager | Happy | All | Reports exist | Moderate forum | Moderation actions taken | | | |
| ESTO-S21-HP-2655 | 21.3 Forum | Manager | Happy | All | Threads exist | Merge duplicate threads | Threads merged | | | |
| ESTO-S21-HP-2656 | 21.3 Forum | Manager | Happy | All | Thread exists | Move thread to category | Thread moved | | | |
| ESTO-S21-HP-2657 | 21.3 Forum | Admin | Happy | All | Forum exists | View all forum categories | All categories listed | | | |
| ESTO-S21-HP-2658 | 21.3 Forum | Admin | Happy | All | Categories exist | Create new category | Category created | | | |
| ESTO-S21-HP-2659 | 21.3 Forum | Admin | Happy | All | Category exists | Edit category | Category updated | | | |
| ESTO-S21-HP-2660 | 21.3 Forum | Admin | Happy | All | Category exists | Delete category | Category deleted | | | |
| ESTO-S21-HP-2661 | 21.3 Forum | Admin | Happy | All | Categories exist | Set category permissions | Permissions updated | | | |
| ESTO-S21-HP-2662 | 21.3 Forum | Admin | Happy | All | Forum exists | Set moderation rules | Rules applied | | | Security |
| ESTO-S21-HP-2663 | 21.3 Forum | Admin | Happy | All | Reports exist | View all reports | Reports displayed | | | Security |
| ESTO-S21-HP-2664 | 21.3 Forum | Admin | Happy | All | Reports exist | Ban user from forum | User banned | | | Security |
| ESTO-S21-HP-2665 | 21.3 Forum | Admin | Happy | All | Banned user | Lift forum ban | Ban lifted | | | |
| ESTO-S21-HP-2666 | 21.3 Forum | Admin | Happy | All | Threads exist | Bulk moderate threads | All moderated | | | |
| ESTO-S21-HP-2667 | 21.3 Forum | Admin | Happy | All | Users exist | Grant forum moderator | User becomes moderator | | | |
| ESTO-S21-HP-2668 | 21.3 Forum | Admin | Happy | All | Thread exists | Set sticky thread | Thread stickied | | | |
| ESTO-S21-HP-2669 | 21.3 Forum | Admin | Happy | All | Forum exists | Enable pre-moderation | Pre-mod enabled; posts queued | | | Security |
| ESTO-S21-HP-2670 | 21.3 Forum | Admin | Happy | All | Forum exists | Enable post filtering | Filter applied | | | Security |
| ESTO-S21-HP-2671 | 21.3 Forum | Admin | Happy | All | Forum exists | View forum engagement | Engagement metrics displayed | | | |
| ESTO-S21-HP-2672 | 21.3 Forum | Admin | Happy | All | Threads exist | Export forum data | Data exported | | | |
| ESTO-S21-HP-2673 | 21.3 Forum | Admin | Happy | All | Users active | View active users | Active users list displayed | | | |
| ESTO-S21-HP-2674 | 21.3 Forum | Admin | Happy | All | Threads exist | View dead threads | Dead threads identified | | | |
| ESTO-S21-HP-2675 | 21.3 Forum | Admin | Happy | All | Threads exist | Auto-archive old threads | Old threads archived | | | |
| ESTO-S21-HP-2676 | 21.3 Forum | Admin | Happy | All | Forum exists | Configure notifications | Notification settings saved | | | |
| ESTO-S21-HP-2677 | 21.3 Forum | User | Happy | All | Thread exists | View thread participants | Participants displayed | | | |
| ESTO-S21-HP-2678 | 21.3 Forum | User | Happy | All | Thread exists | View thread timeline | Timeline displayed | | | |
| ESTO-S21-HP-2679 | 21.3 Forum | User | Happy | All | Threads exist | Sort threads by newest | Sorted by newest | | | |
| ESTO-S21-HP-2680 | 21.3 Forum | User | Happy | All | Threads exist | Sort threads by active | Sorted by most active | | | |
| ESTO-S21-HP-2681 | 21.3 Forum | User | Happy | All | Thread exists | Create poll in thread | Poll created | | | |
| ESTO-S21-HP-2682 | 21.3 Forum | User | Happy | All | Poll exists | Vote in poll | Vote recorded | | | |
| ESTO-S21-HP-2683 | 21.3 Forum | User | Happy | All | Thread exists | Add attachments to reply | Attachment uploaded | | | |
| ESTO-S21-HP-2684 | 21.3 Forum | User | Happy | All | Threads exist | View unread threads | Unread count displayed | | | |
| ESTO-S21-HP-2685 | 21.3 Forum | User | Happy | All | Unread threads | Mark all as read | All marked read | | | |
| ESTO-S21-HP-2686 | 21.3 Forum | User | Happy | All | Thread exists | Mute thread notifications | Thread muted | | | |
| ESTO-S21-HP-2687 | 21.3 Forum | User | Happy | All | Thread exists | View thread tags | Tags displayed | | | |
| ESTO-S21-HP-2688 | 21.3 Forum | User | Happy | All | Thread exists | Add tag to thread | Tag added | | | |
| ESTO-S21-HP-2689 | 21.3 Forum | User | Happy | All | Thread exists | Edit own reply | Reply updated | | | |
| ESTO-S21-HP-2690 | 21.3 Forum | User | Happy | All | Thread exists | Delete own reply | Reply deleted | | | |
| ESTO-S21-HP-2691 | 21.3 Forum | User | Happy | All | Thread exists | Quote reply | Quoted reply created | | | |
| ESTO-S21-HP-2692 | 21.3 Forum | User | Happy | All | Thread exists | View user's other posts | User's posts displayed | | | |
| ESTO-S21-HP-2693 | 21.3 Forum | User | Happy | All | Thread exists | View thread stats | Stats displayed | | | |
| ESTO-S21-HP-2694 | 21.3 Forum | User | Happy | All | Thread exists | Flag as duplicate | Duplicate flag submitted | | | |
| ESTO-S21-HP-2695 | 21.3 Forum | User | Happy | All | Thread exists | View related threads | Related threads displayed | | | |
| ESTO-S21-HP-2696 | 21.3 Forum | User | Happy | All | Thread exists | Follow thread | Following thread | | | |
| ESTO-S21-HP-2697 | 21.3 Forum | User | Happy | All | Thread exists | View last post | Last post in thread displayed | | | |
| ESTO-S21-HP-2698 | 21.3 Forum | User | Happy | All | Threads exist | Browse by category | Category threads displayed | | | |
| ESTO-S21-HP-2699 | 21.3 Forum | User | Happy | All | Thread exists | View replies in tree | Tree view displayed | | | |
| ESTO-S21-HP-2700 | 21.3 Forum | User | Happy | All | Thread exists | Expand/collapse replies | Replies toggled | | | |
| ESTO-S21-HP-2701 | 21.3 Forum | User | Happy | All | Thread exists | View reply author | Author profile link displayed | | | |
| ESTO-S21-HP-2702 | 21.3 Forum | User | Happy | All | Thread exists | Sort replies by helpful | Most helpful first | | | |
| ESTO-S21-HP-2703 | 21.3 Forum | User | Happy | All | Thread exists | Sort replies by newest | Newest first | | | |
| ESTO-S21-HP-2704 | 21.3 Forum | User | Happy | All | Thread exists | Report thread | Thread reported | | | |
| ESTO-S21-HP-2705 | 21.3 Forum | User | Happy | All | Thread exists | View thread history | History displayed | | | |
| ESTO-S21-HP-2706 | 21.3 Forum | User | Happy | All | Thread archived | View archived thread | Archived thread displayed | | | |
| ESTO-S21-HP-2707 | 21.3 Forum | User | Happy | All | Thread locked | View locked thread | Thread read-only | | | |
| ESTO-S21-HP-2708 | 21.3 Forum | User | Happy | All | Thread exists | Subscribe to category | Category subscription active | | | |
| ESTO-S21-HP-2709 | 21.3 Forum | User | Happy | All | Subscribed | View category notifications | Notifications displayed | | | |
| ESTO-S21-HP-2710 | 21.3 Forum | User | Happy | All | Thread exists | Create poll in thread | Poll options created | | | |
| ESTO-S21-HP-2711 | 21.3 Forum | User | Happy | All | Poll active | Vote on poll | Vote recorded | | | |
| ESTO-S21-HP-2712 | 21.3 Forum | User | Happy | All | Poll ended | View poll results | Results displayed | | | |
| ESTO-S21-HP-2713 | 21.3 Forum | User | Happy | All | Thread exists | View thread tags | Tags listed | | | |
| ESTO-S21-HP-2714 | 21.3 Forum | User | Happy | All | Thread exists | Add tag to thread | Tag added | | | |
| ESTO-S21-HP-2715 | 21.3 Forum | User | Happy | All | Thread exists | Edit own reply | Reply updated | | | |
| ESTO-S21-HP-2716 | 21.3 Forum | User | Happy | All | Thread exists | Delete own reply | Reply deleted | | | |
| ESTO-S21-HP-2717 | 21.3 Forum | User | Happy | All | Thread exists | Quote reply | Quoted reply created | | | |
| ESTO-S21-HP-2718 | 21.3 Forum | User | Happy | All | Thread exists | View author profile | Profile navigated to | | | |
| ESTO-S21-HP-2719 | 21.3 Forum | User | Happy | All | Thread exists | View thread stats | View count displayed | | | |
| ESTO-S21-HP-2720 | 21.3 Forum | User | Happy | All | Thread exists | Flag as outdated | Flag submitted | | | |
| ESTO-S21-HP-2721 | 21.3 Forum | User | Happy | All | Thread exists | View related threads | Related threads shown | | | |
| ESTO-S21-HP-2722 | 21.3 Forum | User | Happy | All | Thread exists | Follow thread | Following enabled | | | |
| ESTO-S21-HP-2723 | 21.3 Forum | User | Happy | All | Thread exists | Go to last reply | Last reply displayed | | | |
| ESTO-S21-HP-2724 | 21.3 Forum | User | Happy | All | Threads exist | Browse by tag | Tag-filtered threads | | | |
| ESTO-S21-HP-2725 | 21.3 Forum | User | Happy | All | Thread exists | View full thread | Full thread with all replies | | | |
| ESTO-S21-HP-2726 | 21.3 Forum | User | Happy | All | Thread exists | Inline reply | Reply posted inline | | | |
| ESTO-S21-HP-2727 | 21.3 Forum | User | Happy | All | Thread exists | Share reply | Reply shared | | | |
| ESTO-S21-HP-2728 | 21.3 Forum | User | Happy | All | Thread exists | View reply history | Edit history displayed | | | |
| ESTO-S21-HP-2729 | 21.3 Forum | User | Happy | All | Thread exists | Report reply | Report submitted | | | |
| ESTO-S21-HP-2730 | 21.3 Forum | User | Happy | All | Forum service down | View forum | Error toast; cached data | | | |
| ESTO-S21-HP-2731 | 21.3 Forum | User | Happy | All | -- | XSS in thread content | Input escaped; no XSS | | | Security |
| ESTO-S21-HP-2732 | 21.3 Forum | User | Happy | All | Network offline | Create thread | Network error; queued | | | |
| ESTO-S21-HP-2733 | 21.3 Forum | User | Happy | All | Mock backend | Mock 500 on thread | Error toast; no crash | | | |
| ESTO-S21-HP-2734 | 21.3 Forum | User | Happy | All | -- | Post spam | Spam filter triggers | | | |
| ESTO-S21-HP-2735 | 21.3 Forum | User | Happy | All | Guest | Access forum without auth | Redirected to /login | | | |
| ESTO-S21-HP-2736 | 21.3 Forum | User | Happy | All | -- | Post with blocked word | Post blocked; warning shown | | | Security |
| ESTO-S21-HP-2737 | 21.3 Forum | User | Happy | All | Rate limited | Post rapidly | Error: Rate limit exceeded | | | Security |
| ESTO-S21-HP-2738 | 21.3 Forum | User | Happy | All | Thread locked | Try to reply | Error: Thread locked | | | |
| ESTO-S21-HP-2739 | 21.3 Forum | User | Happy | All | Pre-moderation on | Create thread | Thread queued for approval | | | Security |
| ESTO-S21-HP-2740 | 21.3 Forum | User | Happy | All | Thread archived | Try to reply | Error: Thread archived | | | |
| ESTO-S21-HP-2741 | 21.3 Forum | User | Happy | All | Rapid posting | Post 50 threads | All posted; rate limit handled | | | |
| ESTO-S21-HP-2742 | 21.3 Forum | User | Happy | All | Thread exists | Reply with 5000 chars | Reply saved; truncated if needed | | | |
| ESTO-S21-HP-2743 | 21.3 Forum | User | Happy | All | Thread exists | Reply with unicode | Unicode handled correctly | | | |
| ESTO-S21-HP-2744 | 21.3 Forum | User | Happy | All | Forum active | View 10000 threads | Pagination; performance OK | | | |
| ESTO-S21-HP-2745 | 21.3 Forum | User | Happy | All | Thread exists | Rapid reply | No race condition | | | |
| ESTO-S21-HP-2746 | 21.3 Forum | Admin | Cross-Role | All | Post created | Admin removes; User notified | User sees removal notification | | | |
| ESTO-S21-HP-2747 | 21.3 Forum | Admin | Cross-Role | All | Post flagged | Admin bans user | User banned; posts removed | | | Security |
| ESTO-S21-HP-2748 | 21.3 Forum | Manager | Cross-Role | All | Manager moderates | User sees moderation message | Moderation message displayed | | | |
| ESTO-S21-HP-2749 | 21.3 Forum | Admin | Cross-Role | All | Forum metrics | Admin views engagement | Metrics displayed | | | |
| ESTO-S21-HP-2750 | 21.3 Forum | User | Cross-Role | All | User reports | Admin sees report in queue | Report visible to admin | | | Security |
| ESTO-S21-HP-2751 | 21.3 Forum | Admin | Cross-Role | All | Thread reported | Admin locks thread | Thread locked; new replies disabled | | | |
| ESTO-S21-HP-2752 | 21.3 Forum | Manager | Cross-Role | All | Manager moderates | User notified of moderation | User receives notification | | | |
| ESTO-S21-HP-2753 | 21.3 Forum | Admin | Cross-Role | All | Forum growth | Admin views forum growth | Growth metrics displayed | | | |
| ESTO-S21-HP-2754 | 21.3 Forum | Admin | Cross-Role | All | Posts exist | Admin sees all threads | All threads across communities | | | |
| ESTO-S21-HP-2755 | 21.3 Forum | Admin | Cross-Role | All | User creates thread | Admin can edit any thread | Admin edits applied | | | |
| ESTO-S21-HP-2756 | 21.3 Forum | User | Cross-Role | All | User subscribes to thread | Notification sent on new reply | User receives notification | | | |
| ESTO-S21-HP-2757 | 21.3 Forum | Manager | Cross-Role | All | Manager creates sticky | Sticky visible to all users | All users see sticky | | | |
| ESTO-S21-HP-2758 | 21.3 Forum | Admin | Cross-Role | All | Thread reported | Admin investigates | Investigation logged | | | Security |
| ESTO-S21-HP-2759 | 21.3 Forum | User | Cross-Role | All | User's thread pinned | User sees pin indicator | Pin indicator displayed | | | |
| ESTO-S21-HP-2760 | 21.3 Forum | Manager | Cross-Role | All | Manager locks thread | Users see lock message | Lock message displayed | | | |
| ESTO-S21-HP-2761 | 21.3 Forum | Admin | Cross-Role | All | Auto-moderation active | Spam removed automatically | Spam not visible | | | Security |
| ESTO-S21-HP-2762 | 21.3 Forum | Admin | Cross-Role | All | Forum category created | Manager can moderate category | Manager has moderation rights | | | |
| ESTO-S21-HP-2763 | 21.3 Forum | User | Cross-Role | All | User reports reply | Reply hidden pending review | Reply hidden; reporter notified | | | Security |
| ESTO-S21-HP-2764 | 21.3 Forum | Admin | Cross-Role | All | Multiple reports | Admin bulk moderates | All reported content handled | | | |
| ESTO-S21-HP-2765 | 21.3 Forum | Manager | Cross-Role | All | Forum exists | Manager sets community guidelines | Guidelines applied | | | |
| ESTO-S21-HP-2766 | 21.3 Forum | User | Cross-Role | All | Guidelines updated | User sees updated guidelines | Guidelines displayed | | | |
| ESTO-S21-HP-2767 | 21.3 Forum | Admin | Cross-Role | All | User behavior tracked | Admin sees behavior analytics | Analytics displayed | | | Security |
| ESTO-S21-HP-2768 | 21.3 Forum | Admin | Cross-Role | All | Forum categories exist | Admin reorders categories | Order updated | | | |
| ESTO-S21-HP-2769 | 21.3 Forum | Admin | Cross-Role | All | Forum exists | Admin enables/disables forum | Forum toggled | | | |
| ESTO-S21-HP-2770 | 21.3 Forum | User | Cross-Role | All | Forum disabled | User sees message | "Forum temporarily unavailable" | | | |
| ESTO-S21-HP-2771 | 21.3 Forum | Manager | Cross-Role | All | Forum exists | Manager views reported threads | Reported threads displayed | | | |
| ESTO-S21-HP-2772 | 21.3 Forum | User | Cross-Role | All | Thread popular | Thread appears in trending | Trending section updated | | | |
| ESTO-S21-HP-2773 | 21.3 Forum | Admin | Cross-Role | All | User requests data export | Admin processes export | Export generated and delivered | | | Security |
| ESTO-S21-HP-2774 | 21.3 Forum | Admin | Cross-Role | All | Forum data backed up | Backup verified | Backup complete | | | |
| ESTO-S21-HP-2775 | 21.3 Forum | Admin | Cross-Role | All | Forum config changed | All users notified | Notification sent | | | |
| ESTO-S21-HP-2776 | 21.3 Forum | Admin | Cross-Role | All | User account deleted | User's forum posts anonymized | Posts retained but anonymized | | | Security |
| ESTO-S21-HP-2777 | 21.3 Forum | Admin | Cross-Role | All | User requests deletion | User's forum data deleted | All user's forum data removed | | | Security |
| ESTO-S21-HP-2778 | 21.3 Forum | Admin | Cross-Role | All | Forum audit log | View audit log | All actions logged | | | Security |
| ESTO-S21-HP-2779 | 21.3 Forum | Admin | Cross-Role | All | Access control set | Users restricted to categories | Users see only allowed categories | | | Security |
| ESTO-S21-HP-2780 | 21.3 Forum | User | Cross-Role | All | -- | User creates thread; multiple users respond | Thread engagement grows | | | |
| ESTO-S21-HP-2781 | 21.3 Forum | User | Cross-Role | All | Thread popular | Thread moved to featured | Featured section updated | | | |
| ESTO-S21-HP-2782 | 21.3 Forum | User | Cross-Role | All | Thread old | Thread auto-archived | Thread archived | | | |
| ESTO-S21-HP-2783 | 21.3 Forum | Admin | Cross-Role | All | Archive policy set | Old threads auto-archived | Archiving happens automatically | | | |
| ESTO-S21-HP-2784 | 21.3 Forum | User | Cross-Role | All | User subscribed | Notifications on new reply | Notification received | | | |
| ESTO-S21-HP-2785 | 21.3 Forum | User | Cross-Role | All | Notifications enabled | Digest email sent | Digest with thread activity | | | |
| ESTO-S21-HP-2786 | 21.3 Forum | Admin | Cross-Role | All | Email config set | Forum digest emails sent | Emails delivered | | | |
| ESTO-S21-HP-2787 | 21.3 Forum | User | Cross-Role | All | Thread exists | Report for harassment | Report submitted; content hidden | | | Security |
| ESTO-S21-HP-2788 | 21.3 Forum | Admin | Cross-Role | All | Harassment reported | Admin takes action | User warned/banned | | | Security |
| ESTO-S21-HP-2789 | 21.3 Forum | User | Cross-Role | All | Thread exists | Report for misinformation | Report submitted | | | |
| ESTO-S21-HP-2790 | 21.3 Forum | Admin | Cross-Role | All | Misinformation reported | Admin adds warning label | Warning label added | | | |
| ESTO-S21-HP-2791 | 21.3 Forum | User | Cross-Role | All | Thread exists | Save thread draft | Draft saved | | | |
| ESTO-S21-HP-2792 | 21.3 Forum | User | Cross-Role | All | Draft exists | Resume draft | Draft loaded for editing | | | |
| ESTO-S21-HP-2793 | 21.3 Forum | Manager | Cross-Role | All | Drafts exist | View user drafts | Drafts displayed | | | |
| ESTO-S21-HP-2794 | 21.3 Forum | User | Cross-Role | All | Thread exists | View thread members | Member list displayed | | | |
| ESTO-S21-HP-2795 | 21.3 Forum | User | Cross-Role | All | Thread exists | Request to join private thread | Join request sent | | | Security |
| ESTO-S21-HP-2796 | 21.3 Forum | Manager | Cross-Role | All | Join request received | Approve/deny request | Request handled | | | |
| ESTO-S21-HP-2797 | 21.3 Forum | User | Cross-Role | All | Thread exists | View thread badges | Badges displayed | | | |
| ESTO-S21-HP-2798 | 21.3 Forum | Manager | Cross-Role | All | Thread exists | Award badge to user | Badge awarded | | | |
| ESTO-S21-HP-2799 | 21.3 Forum | Admin | Cross-Role | All | Badges exist | Manage badges | Badges configured | | | |
| ESTO-S21-HP-2800 | 21.3 Forum | Admin | Cross-Role | All | User banned | User's forum access revoked | User cannot access forum | | | Security |
| ESTO-S21-HP-2801 | 21.3 Forum | Admin | Cross-Role | All | Shadow ban enabled | Banned user sees content | User sees content but it's hidden from others | | | Security |
| ESTO-S21-HP-2802 | 21.3 Forum | User | Cross-Role | All | -- | User active; Reputation grows | Reputation points awarded | | | |
| ESTO-S21-HP-2803 | 21.3 Forum | Manager | Cross-Role | All | Reputation system | View top contributors | Leaderboard displayed | | | |
| ESTO-S21-HP-2804 | 21.3 Forum | Admin | Cross-Role | All | Reputation system | Configure reputation rules | Rules updated | | | |
| ESTO-S21-HP-2805 | 21.3 Forum | Admin | Cross-Role | All | Forum categories | Set category permissions | Permissions enforced | | | Security |
| ESTO-S21-HP-2806 | 21.3 Forum | Admin | Cross-Role | All | User reported for harassment | Admin investigates | Investigation logged | | | Security |
| ESTO-S21-HP-2807 | 21.3 Forum | Admin | Cross-Role | All | Moderation team | Assign moderators | Moderators assigned | | | |
| ESTO-S21-HP-2808 | 21.3 Forum | Admin | Cross-Role | All | Forum exists | Set rate limits | Rate limits enforced | | | Security |
| ESTO-S21-HP-2809 | 21.3 Forum | Admin | Cross-Role | All | Spam detected | Auto-ban spammers | Spammers banned | | | Security |
| ESTO-S21-HP-2810 | 21.3 Forum | Admin | Cross-Role | All | User appeals ban | Admin reviews appeal | Appeal handled; ban lifted or upheld | | | |
| ESTO-S21-HP-2811 | 21.3 Forum | User | Cross-Role | All | User's thread popular | User sees notification | Notification displayed | | | |
| ESTO-S21-HP-2812 | 21.3 Forum | User | Cross-Role | All | Thread has reply | User receives notification | Notification sent | | | |
| ESTO-S21-HP-2813 | 21.3 Forum | User | Cross-Role | All | Thread solved | User sees "solved" badge | Badge displayed | | | |
| ESTO-S21-HP-2814 | 21.3 Forum | User | Cross-Role | All | Thread marked helpful | User gets reputation | Reputation increased | | | |
| ESTO-S21-HP-2815 | 21.3 Forum | Admin | Cross-Role | All | User reports | Admin sees dashboard | Dashboard with all reports | | | Security |
| ESTO-S21-HP-2816 | 21.3 Forum | Admin | Cross-Role | All | Forum GDPR request | User data exported | Forum data exported | | | Security |
| ESTO-S21-HP-2817 | 21.3 Forum | Admin | Cross-Role | All | Forum GDPR request | User data deleted | Forum data deleted | | | Security |
| ESTO-S21-HP-2818 | 21.3 Forum | Admin | Cross-Role | All | Moderation queue | Bulk approve posts | Posts approved | | | |
| ESTO-S21-HP-2819 | 21.3 Forum | Admin | Cross-Role | All | Moderation queue | Bulk delete posts | Posts deleted | | | Security |
| ESTO-S21-HP-2820 | 21.3 Forum | Admin | Cross-Role | All | Forum exists | Set community guidelines | Guidelines enforced | | | |
| ESTO-S21-EM-2821 | 21.3 Forum | User | Empty | All | -- | View forum with no threads | Empty state displayed | | | |
| ESTO-S21-EM-2822 | 21.3 Forum | User | Empty | All | -- | View thread with no replies | Empty state displayed | | | |
| ESTO-S21-ER-2823 | 21.3 Forum | User | Error | All | Forum service down | Create thread | Error toast; retry | | | |
| ESTO-S21-ER-2824 | 21.3 Forum | User | Error | All | -- | Post offensive content | Content flagged; moderation queue | | | Security |
| ESTO-S21-ER-2825 | 21.3 Forum | User | Error | All | Mock backend | Mock 500 on thread | Error toast; no crash | | | |
| ESTO-S21-ER-2826 | 21.3 Forum | User | Error | All | Network offline | Create thread | Network error; queued | | | |
| ESTO-S21-ER-2827 | 21.3 Forum | User | Error | All | Thread locked | Reply to locked thread | Error: Thread is locked | | | |
| ESTO-S21-ER-2828 | 21.3 Forum | User | Error | All | Pre-moderation | Create thread | Thread queued for approval | | | Security |
| ESTO-S21-ER-2829 | 21.3 Forum | User | Error | All | -- | XSS in thread title | Input escaped; no XSS | | | Security |
| ESTO-S21-ER-2830 | 21.3 Forum | User | Error | All | Rate limited | Post rapidly | Error: Rate limit exceeded | | | Security |
| ESTO-S21-ED-2831 | 21.3 Forum | User | Edge | All | Thread exists | Reply with 1000 chars | Reply saved | | | |
| ESTO-S21-ED-2832 | 21.3 Forum | User | Edge | All | Forum active | View 500+ threads | Pagination; performance OK | | | |
| ESTO-S21-ED-2833 | 21.3 Forum | User | Edge | All | Thread exists | Rapid reply | No race condition | | | |
| ESTO-S21-ED-2834 | 21.3 Forum | User | Edge | All | Forum active | View with accessibility tools | Screen reader compatible | | | A11y |
| ESTO-S21-CR-2835 | 21.3 Forum | Admin | Cross-Role | All | Thread reported | Admin moderates thread | Thread moderated; user notified | | | |
| ESTO-S21-CR-2836 | 21.3 Forum | Manager | Cross-Role | All | Manager moderates forum | User sees moderation message | Moderation message displayed | | | |
| ESTO-S21-CR-2837 | 21.3 Forum | Admin | Cross-Role | All | Forum analytics | Admin views engagement metrics | Metrics displayed | | | |
| ESTO-S21-CR-2838 | 21.3 Forum | Admin | Cross-Role | All | User banned | User's forum access revoked | Access revoked | | | Security |
| ESTO-S21-CR-2839 | 21.3 Forum | User | Cross-Role | All | User's thread featured | User sees featured indicator | Featured badge displayed | | | |
| ESTO-S21-CR-2840 | 21.3 Forum | Manager | Cross-Role | All | Manager locks thread | All users see lock | Lock message displayed | | | |

---

## Summary

**Total Scenarios: ~2,288 across 19 Sections**

| Section | Title | Scenarios |
|---|---|---|
| 1 | Auth & Registration | ~250 |
| 2 | Property Discovery & Search | ~250 |
| 3 | Appointments & Contracts | ~250 |
| 4 | User Dashboard | ~100 |
| 5 | Cross-Role Broker & SLA | ~140 |
| 6 | Fast Track 24h Workflow | 160 |
| 7 | Messaging | 120 |
| 8 | Applications (Agent/Broker) | 110 |
| 9 | Reviews & Ratings | 70 |
| 10 | Admin Management | 200 |
| 11 | Wallet & Payments | 95 |
| 12 | Profile Management | 90 |
| 13 | Documents & Verification | 45 |
| 14 | Search & Discovery | 79 |
| 15 | Wishlist & Saved Items | 35 |
| 16 | Manager Operations | 80 |
| 17 | Multi-Market & Currency | 40 |
| 18 | Performance & Cross-Cutting | 50 |
| 19 | Integration & Cross-Service | 37 |
| 20 | CI/CD, DevOps & Infrastructure | 250 |
| 21 | Community & Engagement | 300 |

**Coverage**:
- **Roles**: User, Manager, Admin, Broker, Support, Guest
- **Types**: Happy, Empty, Error, Edge, Cross-Role
- **Environments**: Local, Dev, Staging, Production
- **Total**: ~2,831 QA scenarios documented

---

## Section 24: Blockchain & Digital Assets (150)

### 24.1 Property Tokenization (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S24-HP-2841 | 24.1 Token | User | Happy | All | -- | View tokenized properties | Tokenized properties displayed | | | |
| ESTO-S24-HP-2842 | 24.1 Token | User | Happy | All | Property tokenized | Purchase property tokens | Tokens purchased; wallet updated | | | |
| ESTO-S24-HP-2843 | 24.1 Token | User | Happy | All | Tokens owned | View token portfolio | Portfolio displayed | | | |
| ESTO-S24-HP-2844 | 24.1 Token | User | Happy | All | Tokens owned | Transfer tokens | Transfer initiated | | | |
| ESTO-S24-HP-2845 | 24.1 Token | User | Happy | All | Tokens owned | View transaction history | Transaction history displayed | | | |
| ESTO-S24-HP-2846 | 24.1 Token | User | Happy | All | Tokens owned | Sell tokens on marketplace | Listing created | | | |
| ESTO-S24-HP-2847 | 24.1 Token | User | Happy | All | Token sale | Purchase tokens from marketplace | Tokens purchased | | | |
| ESTO-S24-HP-2848 | 24.1 Token | User | Happy | All | Token exists | View token details | Token details displayed | | | |
| ESTO-S24-HP-2849 | 24.1 Token | User | Happy | All | Tokens owned | View dividends earned | Dividends displayed | | | |
| ESTO-S24-HP-2850 | 24.1 Token | User | Happy | All | Dividend available | Claim dividend | Dividend claimed | | | |
| ESTO-S24-EM-2851 | 24.1 Token | User | Empty | All | -- | View tokens with none | Empty portfolio state | | | |
| ESTO-S24-ER-2852 | 24.1 Token | User | Error | All | Blockchain service down | View token balance | Error; cached data | | | |
| ESTO-S24-ER-2853 | 24.1 Token | User | Error | All | Transaction fails | Purchase tokens | Error; funds returned | | | |
| ESTO-S24-ED-2854 | 24.1 Token | User | Edge | All | Tokens owned | Transfer all tokens | All transferred | | | |
| ESTO-S24-CR-2855 | 24.1 Token | Admin | Cross-Role | All | Tokens issued | Admin audits token activity | Audit log displayed | | | Security |
| ESTO-S24-CR-2856 | 24.1 Token | User | Cross-Role | All | Tokens exist | Tokens visible to manager | Manager sees token activity | | | |

### 24.2 Smart Contracts (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S24-HP-2857 | 24.2 Contract | Admin | Happy | All | Contract template ready | Deploy smart contract | Contract deployed on blockchain | | | |
| ESTO-S24-HP-2858 | 24.2 Contract | Admin | Happy | All | Contract deployed | Verify contract | Verification successful | | | |
| ESTO-S24-HP-2859 | 24.2 Contract | Admin | Happy | All | Contract active | Interact with contract | Interaction successful | | | |
| ESTO-S24-HP-2860 | 24.2 Contract | Admin | Happy | All | Contract active | View contract events | Events displayed | | | |
| ESTO-S24-HP-2861 | 24.2 Contract | Admin | Happy | All | Contract active | Upgrade contract | Contract upgraded | | | |
| ESTO-S24-HP-2862 | 24.2 Contract | Admin | Happy | All | Contract active | Pause contract | Contract paused | | | |
| ESTO-S24-HP-2863 | 24.2 Contract | Admin | Happy | All | Contract paused | Resume contract | Contract resumed | | | |
| ESTO-S24-HP-2864 | 24.2 Contract | Admin | Happy | All | Contract active | View contract gas usage | Gas stats displayed | | | |
| ESTO-S24-HP-2865 | 24.2 Contract | Admin | Happy | All | Contract has errors | Debug contract | Debug info displayed | | | |
| ESTO-S24-ER-2866 | 24.2 Contract | Admin | Error | All | Contract reentrancy | Exploit reentrancy | Attack blocked | | | Security |
| ESTO-S24-ER-2867 | 24.2 Contract | Admin | Error | All | Contract with overflow | Trigger overflow | Attack blocked (safe math) | | | Security |
| ESTO-S24-ED-2868 | 24.2 Contract | Admin | Edge | All | Contract under load | Gas price spikes | Contract handles gracefully | | | |
| ESTO-S24-CR-2869 | 24.2 Contract | Admin | Cross-Role | All | Contract deployed | User interacts with contract | Interaction successful | | | |
| ESTO-S24-CR-2870 | 24.2 Contract | User | Cross-Role | All | Contract exists | User verifies contract status | Status displayed | | | |

### 24.3 Digital Identity & Verification (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S24-HP-2871 | 24.3 DID | User | Happy | All | -- | Create digital identity | DID created | | | Security |
| ESTO-S24-HP-2872 | 24.3 DID | User | Happy | All | DID created | Verify identity | Identity verified | | | Security |
| ESTO-S24-HP-2873 | 24.3 DID | User | Happy | All | DID verified | Share verified credentials | Credential shared securely | | | Security |
| ESTO-S24-HP-2874 | 24.3 DID | User | Happy | All | DID exists | View identity dashboard | Dashboard displayed | | | Security |
| ESTO-S24-HP-2875 | 24.3 DID | User | Happy | All | DID exists | Update identity data | Data updated | | | Security |
| ESTO-S24-HP-2876 | 24.3 DID | User | Happy | All | DID exists | Revoke identity | Identity revoked | | | Security |
| ESTO-S24-HP-2877 | 24.3 DID | User | Happy | All | DID revoked | Re-activate identity | Identity re-activated | | | Security |
| ESTO-S24-HP-2878 | 24.3 DID | User | Happy | All | Credentials shared | Track credential usage | Usage tracked | | | Security |
| ESTO-S24-HP-2879 | 24.3 DID | User | Happy | All | Credential used | View verification log | Log displayed | | | Security |
| ESTO-S24-HP-2880 | 24.3 DID | User | Happy | All | DID exists | Export identity data | Data exported | | | Security |
| ESTO-S24-EM-2881 | 24.3 DID | User | Empty | All | -- | View identity without DID | Empty state displayed | | | Security |
| ESTO-S24-ER-2882 | 24.3 DID | User | Error | All | Identity service down | Verify identity | Error; retry later | | | Security |
| ESTO-S24-ER-2883 | 24.3 DID | User | Error | All | Tampered credentials | Verify credentials | Error: Credentials invalid | | | Security |
| ESTO-S24-ED-2884 | 24.3 DID | User | Edge | All | Multiple DIDs | Manage multiple identities | All DIDs displayed | | | Security |
| ESTO-S24-CR-2885 | 24.3 DID | Admin | Cross-Role | All | User DID verified | Admin sees verification | Verification status in admin | | | Security |
| ESTO-S24-CR-2886 | 24.3 DID | Admin | Cross-Role | All | User DID revoked | Admin sees revocation | Revocation status in admin | | | Security |
| ESTO-S24-CR-2887 | 24.3 DID | Admin | Cross-Role | All | DID audit | Admin audits identity usage | Audit log displayed | | | Security |
| ESTO-S24-CR-2888 | 24.3 DID | User | Cross-Role | All | DID exists | DID used across services | Consistent across all services | | | Security |

### 24.4 Smart Property Features (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S24-HP-2889 | 24.4 SmartProp | User | Happy | All | Smart property available | View smart features | Smart features listed | | | |
| ESTO-S24-HP-2890 | 24.4 SmartProp | User | Happy | All | Smart property available | Control smart lock | Lock controlled remotely | | | |
| ESTO-S24-HP-2891 | 24.4 SmartProp | User | Happy | All | Smart property available | Control smart lighting | Lighting controlled | | | |
| ESTO-S24-HP-2892 | 24.4 SmartProp | User | Happy | All | Smart property available | Control smart thermostat | Thermostat controlled | | | |
| ESTO-S24-HP-2893 | 24.4 SmartProp | User | Happy | All | Smart property available | View energy usage | Energy stats displayed | | | |
| ESTO-S24-HP-2894 | 24.4 SmartProp | User | Happy | All | Smart security | View security cameras | Camera feed displayed | | | |
| ESTO-S24-HP-2895 | 24.4 SmartProp | User | Happy | All | Smart security | Set security alerts | Alerts configured | | | |
| ESTO-S24-HP-2896 | 24.4 SmartProp | User | Happy | All | Smart property available | Control smart appliances | Appliances controlled | | | |
| ESTO-S24-HP-2897 | 24.4 SmartProp | User | Happy | All | Smart property available | Voice control (Alexa/Google) | Voice commands work | | | |
| ESTO-S24-HP-2898 | 24.4 SmartProp | Manager | Happy | All | Smart properties | View all smart device status | All devices listed with status | | | |
| ESTO-S24-HP-2899 | 24.4 SmartProp | Manager | Happy | All | Smart properties | Configure device settings | Settings saved | | | |
| ESTO-S24-HP-2900 | 24.4 SmartProp | Manager | Happy | All | Smart properties | Set automation rules | Automation rules configured | | | |
| ESTO-S24-HP-2901 | 24.4 SmartProp | Manager | Happy | All | Smart properties | View energy reports | Reports displayed | | | |
| ESTO-S24-HP-2902 | 24.4 SmartProp | Manager | Happy | All | Smart properties | Manage device access | Access permissions set | | | Security |
| ESTO-S24-HP-2903 | 24.4 SmartProp | Admin | Happy | All | Smart properties | View smart property analytics | Analytics displayed | | | |
| ESTO-S24-EM-2904 | 24.4 SmartProp | User | Empty | All | -- | View smart features (none) | No smart features message | | | |
| ESTO-S24-ER-2905 | 24.4 SmartProp | User | Error | All | IoT service down | Control smart lock | Error; retry | | | |
| ESTO-S24-ER-2906 | 24.4 SmartProp | User | Error | All | -- | Unauthorized device access | Error: Not authorized | | | Security |
| ESTO-S24-ED-2907 | 24.4 SmartProp | User | Edge | All | Smart property with 50 devices | View all devices | All devices listed; pagination | | | |
| ESTO-S24-CR-2908 | 24.4 SmartProp | User | Cross-Role | All | Smart device used | Manager sees device usage | Usage analytics in manager dashboard | | | |
| ESTO-S24-CR-2909 | 24.4 SmartProp | Admin | Cross-Role | All | Smart properties exist | Admin sees smart property metrics | Metrics in admin dashboard | | | |

### 24.5 Decentralized Storage (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S24-HP-2910 | 24.5 DStorage | User | Happy | All | IPFS integrated | Upload document to IPFS | Document uploaded; CID returned | | | |
| ESTO-S24-HP-2911 | 24.5 DStorage | User | Happy | All | Document on IPFS | Retrieve document | Document retrieved via CID | | | |
| ESTO-S24-HP-2912 | 24.5 DStorage | User | Happy | All | Documents stored | View stored documents | All documents listed | | | |
| ESTO-S24-HP-2913 | 24.5 DStorage | User | Happy | All | Document on IPFS | Pin document | Document pinned | | | |
| ESTO-S24-HP-2914 | 24.5 DStorage | User | Happy | All | Document pinned | Unpin document | Document unpinned | | | |
| ESTO-S24-HP-2915 | 24.5 DStorage | Manager | Happy | All | Documents stored | Batch upload documents | All uploaded to IPFS | | | |
| ESTO-S24-HP-2916 | 24.5 DStorage | Manager | Happy | All | Documents on IPFS | Verify document integrity | Integrity verified | | | Security |
| ESTO-S24-HP-2917 | 24.5 DStorage | Admin | Happy | All | IPFS active | Monitor IPFS usage | Usage metrics displayed | | | |
| ESTO-S24-HP-2918 | 24.5 DStorage | Admin | Happy | All | Documents stored | Migrate to decentralized storage | Migration successful | | | |
| ESTO-S24-HP-2919 | 24.5 DStorage | User | Happy | All | Document encrypted | Decrypt document | Document decrypted | | | Security |
| ESTO-S24-EM-2920 | 24.5 DStorage | User | Empty | All | -- | View stored documents (none) | Empty state displayed | | | |
| ESTO-S24-ER-2921 | 24.5 DStorage | User | Error | All | IPFS node down | Upload document | Error; retry queued | | | |
| ESTO-S24-ER-2922 | 24.5 DStorage | User | Error | All | -- | Retrieve with wrong CID | Error: Document not found | | | |
| ESTO-S24-ED-2923 | 24.5 DStorage | User | Edge | All | Large document | Upload 1GB file | Upload succeeds; chunked | | | |
| ESTO-S24-CR-2924 | 24.5 DStorage | Admin | Cross-Role | All | Documents stored | Admin audits document access | Access log displayed | | | Security |
| ESTO-S24-CR-2925 | 24.5 DStorage | User | Cross-Role | All | Document shared | Shared link works across services | Link accessible everywhere | | | |

---

## Section 25: Localization & Internationalization (200)

### 25.1 Language Support (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S25-HP-2926 | 25.1 Lang | User | Happy | All | -- | View app in English | All text in English | | | |
| ESTO-S25-HP-2927 | 25.1 Lang | User | Happy | All | -- | Switch to Hindi | All text in Hindi | | | |
| ESTO-S25-HP-2928 | 25.1 Lang | User | Happy | All | Hindi selected | Switch to Spanish | All text in Spanish | | | |
| ESTO-S25-HP-2929 | 25.1 Lang | User | Happy | All | Language selected | Switch to Arabic | All text in Arabic; RTL layout | | | |
| ESTO-S25-HP-2930 | 25.1 Lang | User | Happy | All | Language selected | Switch to French | All text in French | | | |
| ESTO-S25-HP-2931 | 25.1 Lang | User | Happy | All | Language selected | Switch to Chinese | All text in Chinese | | | |
| ESTO-S25-HP-2932 | 25.1 Lang | User | Happy | All | Language selected | Switch to Japanese | All text in Japanese | | | |
| ESTO-S25-HP-2933 | 25.1 Lang | User | Happy | All | Language selected | Switch to Portuguese | All text in Portuguese | | | |
| ESTO-S25-HP-2934 | 25.1 Lang | User | Happy | All | Language selected | Switch to German | All text in German | | | |
| ESTO-S25-HP-2935 | 25.1 Lang | User | Happy | All | Language selected | Language persists across sessions | Same language on next login | | | |
| ESTO-S25-HP-2936 | 25.1 Lang | User | Happy | All | Multiple languages | Auto-detect language | Correct language detected | | | |
| ESTO-S25-HP-2937 | 25.1 Lang | User | Happy | All | Translation file | All UI strings translated | No untranslated strings | | | |
| ESTO-S25-HP-2938 | 25.1 Lang | User | Happy | All | RTL language | RTL layout applied | Layout flips correctly | | | |
| ESTO-S25-HP-2939 | 25.1 Lang | User | Happy | All | Language with plural | Plural rules applied | Correct plural forms | | | |
| ESTO-S25-HP-2940 | 25.1 Lang | User | Happy | All | Language with gender | Gender forms applied | Correct gender forms | | | |
| ESTO-S25-HP-2941 | 25.1 Lang | User | Happy | All | Date format | Date formatted per locale | Correct date format | | | |
| ESTO-S25-HP-2942 | 25.1 Lang | User | Happy | All | Number format | Number formatted per locale | Correct number format | | | |
| ESTO-S25-HP-2943 | 25.1 Lang | User | Happy | All | Currency format | Currency formatted per locale | Correct currency format | | | |
| ESTO-S25-HP-2944 | 25.1 Lang | User | Happy | All | Address format | Address formatted per locale | Correct address format | | | |
| ESTO-S25-HP-2945 | 25.1 Lang | User | Happy | All | Phone format | Phone formatted per locale | Correct phone format | | | |
| ESTO-S25-HP-2946 | 25.1 Lang | User | Happy | All | RTL language | Forms RTL aligned | Forms RTL | | | |
| ESTO-S25-HP-2947 | 25.1 Lang | User | Happy | All | Calendar | Calendar per locale | Correct calendar displayed | | | |
| ESTO-S25-HP-2948 | 25.1 Lang | User | Happy | All | Error messages | Errors translated | All errors in selected language | | | |
| ESTO-S25-HP-2949 | 25.1 Lang | User | Happy | All | Notifications | Notifications translated | All notifications in selected language | | | |
| ESTO-S25-HP-2950 | 25.1 Lang | User | Happy | All | Email templates | Emails in selected language | Emails translated | | | |
| ESTO-S25-HP-2951 | 25.1 Lang | User | Happy | All | SMS templates | SMS in selected language | SMS translated | | | |
| ESTO-S25-HP-2952 | 25.1 Lang | User | Happy | All | Legal text | Terms translated | Terms in selected language | | | |
| ESTO-S25-HP-2953 | 25.1 Lang | User | Happy | All | Notifications | Push notifications translated | Notifications in selected language | | | |
| ESTO-S25-HP-2954 | 25.1 Lang | User | Happy | All | Date/time | 12/24 hour per locale | Correct time format | | | |
| ESTO-S25-HP-2955 | 25.1 Lang | User | Happy | All | Calendar | Week starts Monday/Sunday per locale | Correct week start | | | |
| ESTO-S25-HP-2956 | 25.1 Lang | User | Happy | All | Sort order | Sort per locale rules | Correct locale sorting | | | |
| ESTO-S25-HP-2957 | 25.1 Lang | User | Happy | All | Transliteration | Names transliterated | Correct transliteration | | | |
| ESTO-S25-HP-2958 | 25.1 Lang | User | Happy | All | Name format | Name order per locale | Correct name order | | | |
| ESTO-S25-EM-2959 | 25.1 Lang | User | Empty | All | -- | View unsupported language | Fallback to English | | | |
| ESTO-S25-ER-2960 | 25.1 Lang | User | Error | All | Translation file missing | View page | Fallback to English | | | |
| ESTO-S25-ER-2961 | 25.1 Lang | User | Error | All | Translation API down | Load translations | Cached translations used | | | |
| ESTO-S25-ED-2962 | 25.1 Lang | User | Edge | All | Long text | Text truncates correctly | Truncation handles RTL | | | |
| ESTO-S25-ED-2963 | 25.1 Lang | User | Edge | All | Mixed RTL/LTR | Mixed text displays correctly | Bidirectional text correct | | | |
| ESTO-S25-CR-2964 | 25.1 Lang | Admin | Cross-Role | All | -- | Admin adds new language | Language available to all users | | | |
| ESTO-S25-CR-2965 | 25.1 Lang | Admin | Cross-Role | All | Translation updated | All users see new translation | Updated translation displayed | | | |
| ESTO-S25-CR-2966 | 25.1 Lang | Admin | Cross-Role | All | Language added | Admin sees translation coverage | Coverage report displayed | | | |
| ESTO-S25-CR-2967 | 25.1 Lang | User | Cross-Role | All | User's language | All services in user's language | Consistent localization | | | |
| ESTO-S25-CR-2968 | 25.1 Lang | Manager | Cross-Role | All | -- | Manager's language preference | Manager sees localized dashboard | | | |
| ESTO-S25-CR-2969 | 25.1 Lang | Admin | Cross-Role | All | -- | Admin's language preference | Admin sees localized panel | | | |

### 25.2 Regional Content (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S25-HP-2970 | 25.2 Regional | User | Happy | All | -- | View content for India | India-specific content | | | |
| ESTO-S25-HP-2971 | 25.2 Regional | User | Happy | All | -- | View content for UK | UK-specific content | | | |
| ESTO-S25-HP-2972 | 25.2 Regional | User | Happy | All | -- | View content for UAE | UAE-specific content | | | |
| ESTO-S25-HP-2973 | 25.2 Regional | User | Happy | All | -- | View content for Singapore | Singapore-specific content | | | |
| ESTO-S25-HP-2974 | 25.2 Regional | User | Happy | All | -- | View content for Nigeria | Nigeria-specific content | | | |
| ESTO-S25-HP-2975 | 25.2 Regional | User | Happy | All | -- | View content for Kenya | Kenya-specific content | | | |
| ESTO-S25-HP-2976 | 25.2 Regional | User | Happy | All | Region set | Legal disclaimers per region | Region-specific disclaimers | | | |
| ESTO-S25-HP-2977 | 25.2 Regional | User | Happy | All | Region set | Tax calculation per region | Region-specific tax | | | |
| ESTO-S25-HP-2978 | 25.2 Regional | User | Happy | All | Region set | Payment methods per region | Region-specific payment methods | | | |
| ESTO-S25-HP-2979 | 25.2 Regional | User | Happy | All | Region set | Phone format per region | Region-specific format | | | |
| ESTO-S25-HP-2980 | 25.2 Regional | User | Happy | All | Region set | Address format per region | Region-specific format | | | |
| ESTO-S25-HP-2981 | 25.2 Regional | User | Happy | All | Region set | ID requirements per region | Region-specific documents | | | |
| ESTO-S25-HP-2982 | 25.2 Regional | User | Happy | All | Region set | Currency per region | Region-specific currency | | | |
| ESTO-S25-HP-2983 | 25.2 Regional | User | Happy | All | Region set | Date format per region | Region-specific date format | | | |
| ESTO-S25-HP-2984 | 25.2 Regional | User | Happy | All | Region set | Time zone per region | Region-specific timezone | | | |
| ESTO-S25-HP-2985 | 25.2 Regional | User | Happy | All | Region set | Measurement units per region | Metric/Imperial per region | | | |
| ESTO-S25-HP-2986 | 25.2 Regional | User | Happy | All | Region set | Holiday calendar per region | Region holidays displayed | | | |
| ESTO-S25-HP-2987 | 25.2 Regional | User | Happy | All | Region set | Local laws referenced | Region-specific legal info | | | |
| ESTO-S25-HP-2988 | 25.2 Regional | User | Happy | All | Region set | Emergency contacts per region | Local emergency contacts | | | |
| ESTO-S25-HP-2989 | 25.2 Regional | User | Happy | All | Region set | Local festivals/events | Regional events in feed | | | |
| ESTO-S25-HP-2990 | 25.2 Regional | User | Happy | All | Region set | Local support channels | Regional support available | | | |
| ESTO-S25-HP-2991 | 25.2 Regional | Admin | Happy | All | Multi-region | View region-specific metrics | Per-region analytics | | | |
| ESTO-S25-HP-2992 | 25.2 Regional | Admin | Happy | All | Multi-region | Configure regional settings | Settings per region | | | |
| ESTO-S25-HP-2993 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional pricing | Regional prices configured | | | |
| ESTO-S25-HP-2994 | 25.2 Regional | Admin | Happy | All | Multi-region | View regional compliance | Compliance per region displayed | | | Security |
| ESTO-S25-HP-2995 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional legal notices | Notices configured per region | | | Security |
| ESTO-S25-HP-2996 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional tax rates | Tax rates configured | | | |
| ESTO-S25-HP-2997 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional payment gateways | Gateways configured per region | | | |
| ESTO-S25-HP-2998 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional support hours | Support hours configured | | | |
| ESTO-S25-HP-2999 | 25.2 Regional | Admin | Happy | All | Multi-region | Set regional marketing | Regional campaigns configured | | | |
| ESTO-S25-HP-3000 | 25.2 Regional | Admin | Happy | All | Multi-region | View regional performance | Performance per region | | | |
| ESTO-S25-EM-3001 | 25.2 Regional | User | Empty | All | -- | View content for unsupported region | Fallback to default region | | | |
| ESTO-S25-ER-3002 | 25.2 Regional | User | Error | All | Regional service down | View regional content | Error; default region used | | | |
| ESTO-S25-ER-3003 | 25.2 Regional | User | Error | All | -- | Tax calculation with invalid region | Error: Region not supported | | | |
| ESTO-S25-ED-3004 | 25.2 Regional | User | Edge | All | Traveling user | Switch region mid-session | Region updated; content changes | | | |
| ESTO-S25-ED-3005 | 25.2 Regional | User | Edge | All | User in border region | Auto-detect region | Correct region detected | | | |
| ESTO-S25-CR-3006 | 25.2 Regional | Admin | Cross-Role | All | -- | Admin adds new region | New region available to all | | | |
| ESTO-S25-CR-3007 | 25.2 Regional | Admin | Cross-Role | All | -- | Regional regulation changes | All users in region notified | | | |
| ESTO-S25-CR-3008 | 25.2 Regional | Admin | Cross-Role | All | -- | Admin sets currency for region | All users in region see new currency | | | |
| ESTO-S25-CR-3009 | 25.2 Regional | User | Cross-Role | All | -- | User's language and region | Both applied correctly | | | |
| ESTO-S25-CR-3010 | 25.2 Regional | Manager | Cross-Role | All | -- | Manager sees regional reports | Reports per region displayed | | | |

## Section 26: Third-Party Integrations (200)

### 26.1 Maps & Location Services (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3011 | 26.1 Maps | User | Happy | All | Property page | View property on map | Map displayed; property marked | | | |
| ESTO-S26-HP-3012 | 26.1 Maps | User | Happy | All | Map displayed | Zoom in/out | Map zooms correctly | | | |
| ESTO-S26-HP-3013 | 26.1 Maps | User | Happy | All | Map displayed | Switch map layers | Layer switches correctly | | | |
| ESTO-S26-HP-3014 | 26.1 Maps | User | Happy | All | Map displayed | Search location | Location found; map centered | | | |
| ESTO-S26-HP-3015 | 26.1 Maps | User | Happy | All | Map displayed | Get directions to property | Directions displayed | | | |
| ESTO-S26-HP-3016 | 26.1 Maps | User | Happy | All | Directions shown | Start navigation | Navigation begins | | | |
| ESTO-S26-HP-3017 | 26.1 Maps | User | Happy | All | Nearby properties | View nearby properties | Nearby properties listed | | | |
| ESTO-S26-HP-3018 | 26.1 Maps | User | Happy | All | Map displayed | Street view available | Street view opens | | | |
| ESTO-S26-HP-3019 | 26.1 Maps | User | Happy | All | Map displayed | Measure distance | Distance measured | | | |
| ESTO-S26-HP-3020 | 26.1 Maps | User | Happy | All | Map displayed | Save location | Location saved | | | |
| ESTO-S26-HP-3021 | 26.1 Maps | User | Happy | All | Map API | Map loads offline tiles | Offline map displayed | | | |
| ESTO-S26-HP-3022 | 26.1 Maps | Manager | Happy | All | Property listed | View property on map | Map displayed | | | |
| ESTO-S26-HP-3023 | 26.1 Maps | Manager | Happy | All | Map displayed | Bulk geocode addresses | All addresses geocoded | | | |
| ESTO-S26-HP-3024 | 26.1 Maps | Manager | Happy | All | Map displayed | Set property boundaries | Boundaries drawn on map | | | |
| ESTO-S26-HP-3025 | 26.1 Maps | Manager | Happy | All | Boundaries set | View property area | Area calculated | | | |
| ESTO-S26-HP-3026 | 26.1 Maps | Manager | Happy | All | Map displayed | Filter properties on map | Filtered properties shown | | | |
| ESTO-S26-HP-3027 | 26.1 Maps | Manager | Happy | All | Properties on map | Cluster properties | Clusters displayed | | | |
| ESTO-S26-HP-3028 | 26.1 Maps | Manager | Happy | All | Map displayed | Export map view | Export generated | | | |
| ESTO-S26-HP-3029 | 26.1 Maps | Manager | Happy | All | Map displayed | Share map view | Share link generated | | | |
| ESTO-S26-HP-3030 | 26.1 Maps | Manager | Happy | All | Map displayed | Compare properties on map | Comparison mode enabled | | | |
| ESTO-S26-EM-3031 | 26.1 Maps | User | Empty | All | -- | View map with no properties | Empty map state | | | |
| ESTO-S26-ER-3032 | 26.1 Maps | User | Error | All | Maps API down | View property location | Error; static map fallback | | | |
| ESTO-S26-ER-3033 | 26.1 Maps | User | Error | All | Network offline | Load map | Cached tiles displayed | | | |
| ESTO-S26-ER-3034 | 26.1 Maps | User | Error | All | -- | Invalid address in search | Error: Address not found | | | |
| ESTO-S26-ER-3035 | 26.1 Maps | User | Error | All | API key invalid | Load map | Error: Map unavailable | | | |
| ESTO-S26-ED-3036 | 26.1 Maps | User | Edge | All | 1000 properties | View all on map | Clustering; performance OK | | | |
| ESTO-S26-ED-3037 | 26.1 Maps | User | Edge | All | User traveling | Location updates | Location tracked accurately | | | |
| ESTO-S26-CR-3038 | 26.1 Maps | Admin | Cross-Role | All | Map API key | Admin configures API key | Map works with new key | | | |
| ESTO-S26-CR-3039 | 26.1 Maps | Admin | Cross-Role | All | -- | Admin views map usage analytics | Analytics displayed | | | |
| ESTO-S26-CR-3040 | 26.1 Maps | User | Cross-Role | All | Map displayed | Map location syncs across devices | Location consistent | | | |

### 26.2 Payment Gateways (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3041 | 26.2 Payment | User | Happy | All | Wallet exists | Add funds via card | Funds added | | | |
| ESTO-S26-HP-3042 | 26.2 Payment | User | Happy | All | Card on file | Make payment | Payment succeeds | | | |
| ESTO-S26-HP-3043 | 26.2 Payment | User | Happy | All | Payment succeeded | View receipt | Receipt displayed | | | |
| ESTO-S26-HP-3044 | 26.2 Payment | User | Happy | All | UPI configured | Pay via UPI | Payment succeeds | | | |
| ESTO-S26-HP-3045 | 26.2 Payment | User | Happy | All | Bank transfer configured | Pay via bank transfer | Transfer initiated | | | |
| ESTO-S26-HP-3046 | 26.2 Payment | User | Happy | All | Payment made | Request refund | Refund initiated | | | |
| ESTO-S26-HP-3047 | 26.2 Payment | User | Happy | All | Refund processed | View refund status | Status displayed | | | |
| ESTO-S26-HP-3048 | 26.2 Payment | User | Happy | All | Card saved | Remove card | Card removed | | | |
| ESTO-S26-HP-3049 | 26.2 Payment | User | Happy | All | Card on file | Update card | Card updated | | | |
| ESTO-S26-HP-3050 | 26.2 Payment | User | Happy | All | Multiple cards | Set default card | Default card updated | | | |
| ESTO-S26-HP-3051 | 26.2 Payment | User | Happy | All | Payment pending | Cancel payment | Payment cancelled | | | |
| ESTO-S26-HP-3052 | 26.2 Payment | User | Happy | All | Wallet exists | Check balance | Balance displayed | | | |
| ESTO-S26-HP-3053 | 26.2 Payment | User | Happy | All | Insufficient funds | Make payment | Error: Insufficient funds | | | |
| ESTO-S26-HP-3054 | 26.2 Payment | User | Happy | All | Payment method | View payment history | History displayed | | | |
| ESTO-S26-HP-3055 | 26.2 Payment | User | Happy | All | Payment made | Download invoice | Invoice downloaded | | | |
| ESTO-S26-HP-3056 | 26.2 Payment | User | Happy | All | Payment gateway | 3D secure verification | 3D secure flow completes | | | |
| ESTO-S26-HP-3057 | 26.2 Payment | User | Happy | All | Subscription | Set up auto-pay | Auto-pay enabled | | | |
| ESTO-S26-HP-3058 | 26.2 Payment | User | Happy | All | Auto-pay enabled | Disable auto-pay | Auto-pay disabled | | | |
| ESTO-S26-HP-3059 | 26.2 Payment | User | Happy | All | Payment made | View payment details | Details displayed | | | |
| ESTO-S26-HP-3060 | 26.2 Payment | User | Happy | All | Payment made | Download receipt | Receipt downloaded | | | |
| ESTO-S26-HP-3061 | 26.2 Payment | User | Happy | All | Payment succeeded | Payment notification | Notification sent | | | |
| ESTO-S26-HP-3062 | 26.2 Payment | User | Happy | All | Payment made | Dispute payment | Dispute initiated | | | |
| ESTO-S26-HP-3063 | 26.2 Payment | Manager | Happy | All | Payment received | View payment status | Status displayed | | | |
| ESTO-S26-HP-3064 | 26.2 Payment | Manager | Happy | All | Payments received | View payment analytics | Analytics displayed | | | |
| ESTO-S26-HP-3065 | 26.2 Payment | Manager | Happy | All | Payment received | Initiate refund | Refund initiated | | | |
| ESTO-S26-HP-3066 | 26.2 Payment | Manager | Happy | All | Payments exist | Export payment data | Payment data exported | | | |
| ESTO-S26-HP-3067 | 26.2 Payment | Manager | Happy | All | Payment gateway | View gateway status | Gateway status displayed | | | |
| ESTO-S26-HP-3068 | 26.2 Payment | Admin | Happy | All | Payments exist | View all transactions | All transactions listed | | | |
| ESTO-S26-HP-3069 | 26.2 Payment | Admin | Happy | All | Payments exist | View payment analytics | Analytics displayed | | | |
| ESTO-S26-HP-3070 | 26.2 Payment | Admin | Happy | All | Payments exist | Audit payment logs | Audit log displayed | | | Security |
| ESTO-S26-HP-3071 | 26.2 Payment | Admin | Happy | All | Gateway down | View payment issues | Issues displayed | | | |
| ESTO-S26-HP-3072 | 26.2 Payment | Admin | Happy | All | Payments exist | View refund queue | Queue displayed | | | |
| ESTO-S26-EM-3073 | 26.2 Payment | User | Empty | All | -- | View payment history (none) | Empty state displayed | | | |
| ESTO-S26-ER-3074 | 26.2 Payment | User | Error | All | Payment gateway down | Make payment | Error: Payment unavailable | | | |
| ESTO-S26-ER-3075 | 26.2 Payment | User | Error | All | Card declined | Retry payment | Error: Card declined | | | |
| ESTO-S26-ER-3076 | 26.2 Payment | User | Error | All | -- | Payment with expired card | Error: Card expired | | | |
| ESTO-S26-ER-3077 | 26.2 Payment | User | Error | All | -- | Payment with insufficient limit | Error: Limit exceeded | | | |
| ESTO-S26-ER-3078 | 26.2 Payment | User | Error | All | -- | XSS in payment form | Input sanitized | | | Security |
| ESTO-S26-ER-3079 | 26.2 Payment | User | Error | All | Network timeout | Make payment | Error: Payment timeout; retry | | | |
| ESTO-S26-ER-3080 | 26.2 Payment | User | Error | All | Mock backend | Mock 500 on payment | Error toast; no charge | | | |
| ESTO-S26-ED-3081 | 26.2 Payment | User | Edge | All | High-value payment | Pay 10M INR | Payment processed | | | |
| ESTO-S26-ED-3082 | 26.2 Payment | User | Edge | All | Currency conversion | Pay in different currency | Conversion applied | | | |
| ESTO-S26-CR-3083 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin views user payment | Payment details in admin | | | Security |
| ESTO-S26-CR-3084 | 26.2 Payment | User | Cross-Role | All | -- | User pays; Manager sees booking | Booking confirmed for manager | | | |
| ESTO-S26-CR-3085 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin sees all payments across users | Full transaction visibility | | | Security |
| ESTO-S26-CR-3086 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin configures payment gateway | Gateway configured for all | | | |
| ESTO-S26-CR-3087 | 26.2 Payment | Manager | Cross-Role | All | -- | Manager initiates payment request | User sees payment request | | | |
| ESTO-S26-CR-3088 | 26.2 Payment | User | Cross-Role | All | -- | User payment; Manager notified | Manager receives notification | | | |
| ESTO-S26-CR-3089 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin sets payment limits | Limits enforced for all | | | Security |
| ESTO-S26-CR-3090 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin audits payment compliance | Compliance report displayed | | | Security |

**Total: ~3,010 QA scenarios documented across 25 Sections**

---

## Section 26: Third-Party Integrations (200)

### 26.1 Maps & Location Services (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3011 | 26.1 Maps | User | Happy | All | Property page | View property on map | Map displayed; property marked | | | |
| ESTO-S26-HP-3012 | 26.1 Maps | User | Happy | All | Map displayed | Zoom in/out | Map zooms correctly | | | |
| ESTO-S26-HP-3013 | 26.1 Maps | User | Happy | All | Map displayed | Switch map layers | Layer switches correctly | | | |
| ESTO-S26-HP-3014 | 26.1 Maps | User | Happy | All | Map displayed | Search location | Location found; map centered | | | |
| ESTO-S26-HP-3015 | 26.1 Maps | User | Happy | All | Map displayed | Get directions to property | Directions displayed | | | |
| ESTO-S26-HP-3016 | 26.1 Maps | User | Happy | All | Directions shown | Start navigation | Navigation begins | | | |
| ESTO-S26-HP-3017 | 26.1 Maps | User | Happy | All | Nearby properties | View nearby properties | Nearby properties listed | | | |
| ESTO-S26-HP-3018 | 26.1 Maps | User | Happy | All | Map displayed | Street view available | Street view opens | | | |
| ESTO-S26-HP-3019 | 26.1 Maps | User | Happy | All | Map displayed | Measure distance | Distance measured | | | |
| ESTO-S26-HP-3020 | 26.1 Maps | User | Happy | All | Map displayed | Save location | Location saved | | | |
| ESTO-S26-HP-3021 | 26.1 Maps | User | Happy | All | Map API | Map loads offline tiles | Offline map displayed | | | |
| ESTO-S26-HP-3022 | 26.1 Maps | Manager | Happy | All | Property listed | View property on map | Map displayed | | | |
| ESTO-S26-HP-3023 | 26.1 Maps | Manager | Happy | All | Map displayed | Bulk geocode addresses | All addresses geocoded | | | |
| ESTO-S26-HP-3024 | 26.1 Maps | Manager | Happy | All | Map displayed | Set property boundaries | Boundaries drawn on map | | | |
| ESTO-S26-HP-3025 | 26.1 Maps | Manager | Happy | All | Boundaries set | View property area | Area calculated | | | |
| ESTO-S26-HP-3026 | 26.1 Maps | Manager | Happy | All | Map displayed | Filter properties on map | Filtered properties shown | | | |
| ESTO-S26-HP-3027 | 26.1 Maps | Manager | Happy | All | Properties on map | Cluster properties | Clusters displayed | | | |
| ESTO-S26-HP-3028 | 26.1 Maps | Manager | Happy | All | Map displayed | Export map view | Export generated | | | |
| ESTO-S26-HP-3029 | 26.1 Maps | Manager | Happy | All | Map displayed | Share map view | Share link generated | | | |
| ESTO-S26-HP-3030 | 26.1 Maps | Manager | Happy | All | Map displayed | Compare properties on map | Comparison mode enabled | | | |
| ESTO-S26-EM-3031 | 26.1 Maps | User | Empty | All | -- | View map with no properties | Empty map state | | | |
| ESTO-S26-ER-3032 | 26.1 Maps | User | Error | All | Maps API down | View property location | Error; static map fallback | | | |
| ESTO-S26-ER-3033 | 26.1 Maps | User | Error | All | Network offline | Load map | Cached tiles displayed | | | |
| ESTO-S26-ER-3034 | 26.1 Maps | User | Error | All | -- | Invalid address in search | Error: Address not found | | | |
| ESTO-S26-ER-3035 | 26.1 Maps | User | Error | All | API key invalid | Load map | Error: Map unavailable | | | |
| ESTO-S26-ED-3036 | 26.1 Maps | User | Edge | All | 1000 properties | View all on map | Clustering; performance OK | | | |
| ESTO-S26-ED-3037 | 26.1 Maps | User | Edge | All | User traveling | Location updates | Location tracked accurately | | | |
| ESTO-S26-CR-3038 | 26.1 Maps | Admin | Cross-Role | All | Map API key | Admin configures API key | Map works with new key | | | |
| ESTO-S26-CR-3039 | 26.1 Maps | Admin | Cross-Role | All | -- | Admin views map usage analytics | Analytics displayed | | | |
| ESTO-S26-CR-3040 | 26.1 Maps | User | Cross-Role | All | Map displayed | Map location syncs across devices | Location consistent | | | |

### 26.2 Payment Gateways (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3041 | 26.2 Payment | User | Happy | All | Wallet exists | Add funds via card | Funds added | | | |
| ESTO-S26-HP-3042 | 26.2 Payment | User | Happy | All | Card on file | Make payment | Payment succeeds | | | |
| ESTO-S26-HP-3043 | 26.2 Payment | User | Happy | All | Payment succeeded | View receipt | Receipt displayed | | | |
| ESTO-S26-HP-3044 | 26.2 Payment | User | Happy | All | UPI configured | Pay via UPI | Payment succeeds | | | |
| ESTO-S26-HP-3045 | 26.2 Payment | User | Happy | All | Bank transfer configured | Pay via bank transfer | Transfer initiated | | | |
| ESTO-S26-HP-3046 | 26.2 Payment | User | Happy | All | Payment made | Request refund | Refund initiated | | | |
| ESTO-S26-HP-3047 | 26.2 Payment | User | Happy | All | Refund processed | View refund status | Status displayed | | | |
| ESTO-S26-HP-3048 | 26.2 Payment | User | Happy | All | Card saved | Remove card | Card removed | | | |
| ESTO-S26-HP-3049 | 26.2 Payment | User | Happy | All | Card on file | Update card | Card updated | | | |
| ESTO-S26-HP-3050 | 26.2 Payment | User | Happy | All | Multiple cards | Set default card | Default card updated | | | |
| ESTO-S26-HP-3051 | 26.2 Payment | User | Happy | All | Payment pending | Cancel payment | Payment cancelled | | | |
| ESTO-S26-HP-3052 | 26.2 Payment | User | Happy | All | Wallet exists | Check balance | Balance displayed | | | |
| ESTO-S26-HP-3053 | 26.2 Payment | User | Happy | All | Insufficient funds | Make payment | Error: Insufficient funds | | | |
| ESTO-S26-HP-3054 | 26.2 Payment | User | Happy | All | Payment method | View payment history | History displayed | | | |
| ESTO-S26-HP-3055 | 26.2 Payment | User | Happy | All | Payment made | Download invoice | Invoice downloaded | | | |
| ESTO-S26-HP-3056 | 26.2 Payment | User | Happy | All | Payment gateway | 3D secure verification | 3D secure flow completes | | | |
| ESTO-S26-HP-3057 | 26.2 Payment | User | Happy | All | Subscription | Set up auto-pay | Auto-pay enabled | | | |
| ESTO-S26-HP-3058 | 26.2 Payment | User | Happy | All | Auto-pay enabled | Disable auto-pay | Auto-pay disabled | | | |
| ESTO-S26-HP-3059 | 26.2 Payment | User | Happy | All | Payment made | View payment details | Details displayed | | | |
| ESTO-S26-HP-3060 | 26.2 Payment | User | Happy | All | Payment made | Download receipt | Receipt downloaded | | | |
| ESTO-S26-HP-3061 | 26.2 Payment | User | Happy | All | Payment succeeded | Payment notification | Notification sent | | | |
| ESTO-S26-HP-3062 | 26.2 Payment | User | Happy | All | Payment made | Dispute payment | Dispute initiated | | | |
| ESTO-S26-HP-3063 | 26.2 Payment | Manager | Happy | All | Payment received | View payment status | Status displayed | | | |
| ESTO-S26-HP-3064 | 26.2 Payment | Manager | Happy | All | Payments received | View payment analytics | Analytics displayed | | | |
| ESTO-S26-HP-3065 | 26.2 Payment | Manager | Happy | All | Payment received | Initiate refund | Refund initiated | | | |
| ESTO-S26-HP-3066 | 26.2 Payment | Manager | Happy | All | Payments exist | Export payment data | Payment data exported | | | |
| ESTO-S26-HP-3067 | 26.2 Payment | Manager | Happy | All | Payment gateway | View gateway status | Gateway status displayed | | | |
| ESTO-S26-HP-3068 | 26.2 Payment | Admin | Happy | All | Payments exist | View all transactions | All transactions listed | | | |
| ESTO-S26-HP-3069 | 26.2 Payment | Admin | Happy | All | Payments exist | View payment analytics | Analytics displayed | | | |
| ESTO-S26-HP-3070 | 26.2 Payment | Admin | Happy | All | Payments exist | Audit payment logs | Audit log displayed | | | Security |
| ESTO-S26-HP-3071 | 26.2 Payment | Admin | Happy | All | Gateway down | View payment issues | Issues displayed | | | |
| ESTO-S26-HP-3072 | 26.2 Payment | Admin | Happy | All | Payments exist | View refund queue | Queue displayed | | | |
| ESTO-S26-EM-3073 | 26.2 Payment | User | Empty | All | -- | View payment history (none) | Empty state displayed | | | |
| ESTO-S26-ER-3074 | 26.2 Payment | User | Error | All | Payment gateway down | Make payment | Error: Payment unavailable | | | |
| ESTO-S26-ER-3075 | 26.2 Payment | User | Error | All | Card declined | Retry payment | Error: Card declined | | | |
| ESTO-S26-ER-3076 | 26.2 Payment | User | Error | All | -- | Payment with expired card | Error: Card expired | | | |
| ESTO-S26-ER-3077 | 26.2 Payment | User | Error | All | -- | Payment with insufficient limit | Error: Limit exceeded | | | |
| ESTO-S26-ER-3078 | 26.2 Payment | User | Error | All | -- | XSS in payment form | Input sanitized | | | Security |
| ESTO-S26-ER-3079 | 26.2 Payment | User | Error | All | Network timeout | Make payment | Error: Payment timeout; retry | | | |
| ESTO-S26-ER-3080 | 26.2 Payment | User | Error | All | Mock backend | Mock 500 on payment | Error toast; no charge | | | |
| ESTO-S26-ED-3081 | 26.2 Payment | User | Edge | All | High-value payment | Pay 10M INR | Payment processed | | | |
| ESTO-S26-ED-3082 | 26.2 Payment | User | Edge | All | Currency conversion | Pay in different currency | Conversion applied | | | |
| ESTO-S26-CR-3083 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin views user payment | Payment details in admin | | | Security |
| ESTO-S26-CR-3084 | 26.2 Payment | User | Cross-Role | All | -- | User pays; Manager sees booking | Booking confirmed for manager | | | |
| ESTO-S26-CR-3085 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin sees all payments across users | Full transaction visibility | | | Security |
| ESTO-S26-CR-3086 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin configures payment gateway | Gateway configured for all | | | |
| ESTO-S26-CR-3087 | 26.2 Payment | Manager | Cross-Role | All | -- | Manager initiates payment request | User sees payment request | | | |
| ESTO-S26-CR-3088 | 26.2 Payment | User | Cross-Role | All | -- | User payment; Manager notified | Manager receives notification | | | |
| ESTO-S26-CR-3089 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin sets payment limits | Limits enforced for all | | | Security |
| ESTO-S26-CR-3090 | 26.2 Payment | Admin | Cross-Role | All | -- | Admin audits payment compliance | Compliance report displayed | | | Security |

### 26.3 SMS & Communication (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3091 | 26.3 SMS | User | Happy | All | Phone verified | Receive SMS verification | SMS received | | | |
| ESTO-S26-HP-3092 | 26.3 SMS | User | Happy | All | OTP received | Verify with OTP | Verification successful | | | |
| ESTO-S26-HP-3093 | 26.3 SMS | User | Happy | All | Booking made | Receive booking confirmation SMS | SMS received | | | |
| ESTO-S26-HP-3094 | 26.3 SMS | User | Happy | All | Appointment scheduled | Receive reminder SMS | Reminder received | | | |
| ESTO-S26-HP-3095 | 26.3 SMS | User | Happy | All | -- | Opt out of SMS | Opt-out confirmed | | | |
| ESTO-S26-HP-3096 | 26.3 SMS | User | Happy | All | Opted out | No SMS received | No SMS sent | | | |
| ESTO-S26-HP-3097 | 26.3 SMS | User | Happy | All | Opted in | Opt back in | Opt-in confirmed | | | |
| ESTO-S26-HP-3098 | 26.3 SMS | User | Happy | All | Number changed | Update phone number | Number updated; re-verified | | | |
| ESTO-S26-HP-3099 | 26.3 SMS | User | Happy | All | SMS received | SMS with deep link | Deep link works | | | |
| ESTO-S26-HP-3100 | 26.3 SMS | User | Happy | All | -- | Receive promotional SMS | SMS received (if opted in) | | | |
| ESTO-S26-HP-3101 | 26.3 SMS | Manager | Happy | All | Bulk SMS | Send bulk notification | SMS sent to all recipients | | | |
| ESTO-S26-HP-3102 | 26.3 SMS | Manager | Happy | All | SMS sent | View delivery report | Delivery report displayed | | | |
| ESTO-S26-HP-3103 | 26.3 SMS | Manager | Happy | All | SMS template | Use SMS template | Template applied | | | |
| ESTO-S26-HP-3104 | 26.3 SMS | Manager | Happy | All | SMS templates | Create new template | Template created | | | |
| ESTO-S26-HP-3105 | 26.3 SMS | Manager | Happy | All | SMS scheduled | Schedule SMS | SMS scheduled | | | |
| ESTO-S26-HP-3106 | 26.3 SMS | Admin | Happy | All | SMS sent | View SMS analytics | Analytics displayed | | | |
| ESTO-S26-HP-3107 | 26.3 SMS | Admin | Happy | All | SMS provider | Configure SMS provider | Provider configured | | | |
| ESTO-S26-HP-3108 | 26.3 SMS | Admin | Happy | All | SMS provider | Monitor SMS delivery | Delivery rates displayed | | | |
| ESTO-S26-HP-3109 | 26.3 SMS | Admin | Happy | All | SMS logs | View SMS logs | Logs displayed | | | |
| ESTO-S26-HP-3110 | 26.3 SMS | Admin | Happy | All | SMS costs | View SMS billing | Billing displayed | | | |
| ESTO-S26-HP-3111 | 26.3 SMS | Admin | Happy | All | SMS provider | Test SMS delivery | Test SMS delivered | | | |
| ESTO-S26-EM-3112 | 26.3 SMS | User | Empty | All | -- | View SMS preferences (none) | Empty state displayed | | | |
| ESTO-S26-ER-3113 | 26.3 SMS | User | Error | All | SMS service down | Receive OTP | Fallback: email OTP | | | |
| ESTO-S26-ER-3114 | 26.3 SMS | User | Error | All | Wrong OTP | Verify OTP | Error: Invalid OTP | | | |
| ESTO-S26-ER-3115 | 26.3 SMS | User | Error | All | OTP expired | Verify OTP | Error: OTP expired | | | |
| ESTO-S26-ER-3116 | 26.3 SMS | User | Error | All | Invalid phone | Send OTP | Error: Invalid phone number | | | |
| ESTO-S26-ER-3117 | 26.3 SMS | User | Error | All | SMS rate limited | Request OTP rapidly | Error: Rate limit exceeded | | | Security |
| ESTO-S26-ER-3118 | 26.3 SMS | Manager | Error | All | SMS provider down | Send bulk SMS | Error: SMS provider unavailable | | | |
| ESTO-S26-ER-3119 | 26.3 SMS | Admin | Error | All | SMS API down | Send notification | Error: SMS service down | | | |
| ESTO-S26-ED-3120 | 26.3 SMS | User | Edge | All | International number | Send OTP to +XX | OTP sent; may use international SMS | | | |
| ESTO-S26-ED-3121 | 26.3 SMS | Manager | Edge | All | Send to 10K users | Bulk SMS sent | All SMS delivered or queued | | | |
| ESTO-S26-ED-3122 | 26.3 SMS | Manager | Edge | All | Long SMS | Send long message | Message split or truncated | | | |
| ESTO-S26-CR-3123 | 26.3 SMS | Admin | Cross-Role | All | -- | Admin configures SMS; Users receive | Users receive configured SMS | | | |
| ESTO-S26-CR-3124 | 26.3 SMS | User | Cross-Role | All | -- | User opts in/out across services | Opt status consistent | | | |
| ESTO-S26-CR-3125 | 26.3 SMS | Manager | Cross-Role | All | -- | Manager sends SMS; Admin sees stats | Stats updated in admin | | | |
| ESTO-S26-CR-3126 | 26.3 SMS | Admin | Cross-Role | All | -- | Admin changes SMS provider | No disruption to users | | | |
| ESTO-S26-CR-3127 | 26.3 SMS | User | Cross-Role | All | -- | User receives SMS; other notifications | All notifications delivered | | | |
| ESTO-S26-CR-3128 | 26.3 SMS | Admin | Cross-Role | All | -- | Admin enables SMS; existing opt-outs respected | Opt-outs still respected | | | |
| ESTO-S26-CR-3129 | 26.3 SMS | Admin | Cross-Role | All | -- | Admin changes SMS template | New template applied | | | |
| ESTO-S26-CR-3130 | 26.3 SMS | Admin | Cross-Role | All | -- | Admin sets SMS rate limits | Limits enforced | | | Security |

### 26.4 Email Integrations (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S26-HP-3131 | 26.4 Email | User | Happy | All | -- | Receive welcome email | Welcome email received | | | |
| ESTO-S26-HP-3132 | 26.4 Email | User | Happy | All | -- | Email verification link | Verification successful | | | |
| ESTO-S26-HP-3133 | 26.4 Email | User | Happy | All | Booking made | Booking confirmation email | Email received | | | |
| ESTO-S26-HP-3134 | 26.4 Email | User | Happy | All | -- | Password reset email | Reset email received | | | |
| ESTO-S26-HP-3135 | 26.4 Email | User | Happy | All | Reset received | Reset password via link | Password reset successful | | | |
| ESTO-S26-HP-3136 | 26.4 Email | User | Happy | All | Notification enabled | Receive notification email | Email received | | | |
| ESTO-S26-HP-3137 | 26.4 Email | User | Happy | All | -- | Unsubscribe from emails | Unsubscribe successful | | | |
| ESTO-S26-HP-3138 | 26.4 Email | User | Happy | All | Unsubscribed | No marketing emails | No emails sent | | | |
| ESTO-S26-HP-3139 | 26.4 Email | User | Happy | All | Transactional email | Still receive transactional | Transactional emails sent | | | |
| ESTO-S26-HP-3140 | 26.4 Email | User | Happy | All | Email with attachment | Download attachment | Attachment downloaded | | | |
| ESTO-S26-HP-3141 | 26.4 Email | User | Happy | All | Email with image | Image displayed | Image rendered in email | | | |
| ESTO-S26-HP-3142 | 26.4 Email | User | Happy | All | Email with link | Click email link | Link navigates correctly | | | |
| ESTO-S26-HP-3143 | 26.4 Email | User | Happy | All | Email in spam | Mark as not spam | Moved to inbox | | | |
| ESTO-S26-HP-3144 | 26.4 Email | Manager | Happy | All | Email sent | View email analytics | Analytics displayed | | | |
| ESTO-S26-HP-3145 | 26.4 Email | Manager | Happy | All | Template exists | Use email template | Email sent with template | | | |
| ESTO-S26-HP-3146 | 26.4 Email | Manager | Happy | All | Email sent | View delivery status | Status displayed | | | |
| ESTO-S26-HP-3147 | 26.4 Email | Manager | Happy | All | Email scheduled | Schedule email | Email sent at scheduled time | | | |
| ESTO-S26-HP-3148 | 26.4 Email | Manager | Happy | All | Email sent | Track opens/clicks | Tracking data displayed | | | |
| ESTO-S26-HP-3149 | 26.4 Email | Admin | Happy | All | Emails sent | View all email logs | Logs displayed | | | |
| ESTO-S26-HP-3150 | 26.4 Email | Admin | Happy | All | Email provider | Configure email provider | Provider configured | | | |
| ESTO-S26-HP-3151 | 26.4 Email | Admin | Happy | All | Email domain | Configure SPF/DKIM | SPF/DKIM verified | | | Security |
| ESTO-S26-HP-3152 | 26.4 Email | Admin | Happy | All | Emails sent | View bounce rates | Bounce rates displayed | | | |
| ESTO-S26-HP-3153 | 26.4 Email | Admin | Happy | All | Emails sent | View spam complaints | Complaints displayed | | | |
| ESTO-S26-HP-3154 | 26.4 Email | Admin | Happy | All | Email templates | Manage templates | Templates managed | | | |
| ESTO-S26-HP-3155 | 26.4 Email | Admin | Happy | All | Emails exist | A/B test emails | Results displayed | | | |
| ESTO-S26-EM-3156 | 26.4 Email | User | Empty | All | -- | View email preferences | Preferences displayed | | | |
| ESTO-S26-ER-3157 | 26.4 Email | User | Error | All | Email service down | Receive welcome email | Email queued; retried | | | |
| ESTO-S26-ER-3158 | 26.4 Email | User | Error | All | Invalid email | Register with email | Error: Invalid email | | | |
| ESTO-S26-ER-3159 | 26.4 Email | User | Error | All | -- | Email with script injection | Input sanitized | | | Security |
| ESTO-S26-ER-3160 | 26.4 Email | User | Error | All | Reset link expired | Reset password | Error: Link expired | | | |
| ESTO-S26-ER-3161 | 26.4 Email | Manager | Error | All | Email provider down | Send email | Error: Email unavailable | | | |
| ESTO-S26-ER-3162 | 26.4 Email | Admin | Error | All | Email API error | Send bulk email | Error: API failed | | | |
| ESTO-S26-ED-3163 | 26.4 Email | Manager | Edge | All | Send to 100K users | Bulk email sent | All delivered; throttled | | | |
| ESTO-S26-ED-3164 | 26.4 Email | Manager | Edge | All | Email with 10MB attachment | Send large email | Attachment limits applied | | | |
| ESTO-S26-ED-3165 | 26.4 Email | User | Edge | All | Email client compatibility | Email renders in all clients | Renders correctly everywhere | | | |
| ESTO-S26-CR-3166 | 26.4 Email | Admin | Cross-Role | All | -- | Admin changes email config | All users affected | | | |
| ESTO-S26-CR-3167 | 26.4 Email | User | Cross-Role | All | -- | User unsubscribes from all | No emails from any service | | | |
| ESTO-S26-CR-3168 | 26.4 Email | Manager | Cross-Role | All | -- | Manager sends email; Admin sees report | Report in admin dashboard | | | |
| ESTO-S26-CR-3169 | 26.4 Email | Admin | Cross-Role | All | -- | Admin enables email; opt-outs respected | Opt-outs still respected | | | |
| ESTO-S26-CR-3170 | 26.4 Email | User | Cross-Role | All | -- | User changes email; all notifications follow | Notifications to new email | | | |

## Section 27: Analytics, BI & Reporting (200)

### 27.1 Analytics Dashboard (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S27-HP-3171 | 27.1 Analytics | Admin | Happy | All | Users active | View user engagement | Engagement metrics displayed | | | |
| ESTO-S27-HP-3172 | 27.1 Analytics | Admin | Happy | All | Users active | View user retention | Retention rates displayed | | | |
| ESTO-S27-HP-3173 | 27.1 Analytics | Admin | Happy | All | Users active | View user acquisition | Acquisition metrics displayed | | | |
| ESTO-S27-HP-3174 | 27.1 Analytics | Admin | Happy | All | Users active | View user segmentation | Segments displayed | | | |
| ESTO-S27-HP-3175 | 27.1 Analytics | Admin | Happy | All | Users active | View user journey | Journey map displayed | | | |
| ESTO-S27-HP-3176 | 27.1 Analytics | Admin | Happy | All | Users active | View user cohorts | Cohort analysis displayed | | | |
| ESTO-S27-HP-3177 | 27.1 Analytics | Admin | Happy | All | Users active | View churn prediction | Churn predictions displayed | | | |
| ESTO-S27-HP-3178 | 27.1 Analytics | Admin | Happy | All | Users active | View user lifetime value | LTV displayed | | | |
| ESTO-S27-HP-3179 | 27.1 Analytics | Admin | Happy | All | Users active | View DAU/MAU | DAU/MAU displayed | | | |
| ESTO-S27-HP-3180 | 27.1 Analytics | Admin | Happy | All | Users active | View session duration | Duration metrics displayed | | | |
| ESTO-S27-HP-3181 | 27.1 Analytics | Admin | Happy | All | Users active | View feature usage | Feature adoption displayed | | | |
| ESTO-S27-HP-3182 | 27.1 Analytics | Admin | Happy | All | Users active | View conversion funnel | Funnel displayed | | | |
| ESTO-S27-HP-3183 | 27.1 Analytics | Admin | Happy | All | Users active | View drop-off points | Drop-off analysis displayed | | | |
| ESTO-S27-HP-3184 | 27.1 Analytics | Admin | Happy | All | Users active | View A/B test results | Results displayed | | | |
| ESTO-S27-HP-3185 | 27.1 Analytics | Admin | Happy | All | Users active | View NPS score | NPS displayed | | | |
| ESTO-S27-HP-3186 | 27.1 Analytics | Admin | Happy | All | Users active | View CSAT scores | CSAT displayed | | | |
| ESTO-S27-HP-3187 | 27.1 Analytics | Admin | Happy | All | Users active | View heatmaps | Heatmaps displayed | | | |
| ESTO-S27-HP-3188 | 27.1 Analytics | Admin | Happy | All | Users active | View user flow | Flow visualization displayed | | | |
| ESTO-S27-HP-3189 | 27.1 Analytics | Admin | Happy | All | Users active | Export analytics report | Report exported | | | |
| ESTO-S27-HP-3190 | 27.1 Analytics | Admin | Happy | All | Reports configured | Schedule analytics report | Report scheduled | | | |
| ESTO-S27-HP-3191 | 27.1 Analytics | Admin | Happy | All | Dashboard exists | View real-time dashboard | Dashboard updates live | | | |
| ESTO-S27-HP-3192 | 27.1 Analytics | Admin | Happy | All | Dashboard exists | Customize dashboard | Customizations saved | | | |
| ESTO-S27-HP-3193 | 27.1 Analytics | Admin | Happy | All | Dashboard exists | Share dashboard | Sharing link generated | | | |
| ESTO-S27-HP-3194 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Create custom report | Custom report created | | | |
| ESTO-S27-HP-3195 | 27.1 Analytics | Admin | Happy | All | Report created | Schedule report delivery | Report delivered on schedule | | | |
| ESTO-S27-HP-3196 | 27.1 Analytics | Admin | Happy | All | Report exists | Embed report | Embed code generated | | | |
| ESTO-S27-HP-3197 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Set up alerts | Alerts configured | | | |
| ESTO-S27-HP-3198 | 27.1 Analytics | Admin | Happy | All | Alert triggered | View alert details | Details displayed | | | |
| ESTO-S27-HP-3199 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Drill down into data | Detailed view displayed | | | |
| ESTO-S27-HP-3200 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Compare time periods | Comparison displayed | | | |
| ESTO-S27-HP-3201 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Filter by user segment | Filtered analytics displayed | | | |
| ESTO-S27-HP-3202 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Filter by date range | Date-filtered analytics | | | |
| ESTO-S27-HP-3203 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Filter by geography | Geo-filtered analytics | | | |
| ESTO-S27-HP-3204 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Filter by device | Device-filtered analytics | | | |
| ESTO-S27-HP-3205 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View user behavior trends | Trends displayed | | | |
| ESTO-S27-HP-3206 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Identify power users | Power users identified | | | |
| ESTO-S27-HP-3207 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View inactive users | Inactive user list displayed | | | |
| ESTO-S27-HP-3208 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Identify at-risk users | At-risk users identified | | | |
| ESTO-S27-HP-3209 | 27.1 Analytics | Admin | Happy | All | Analytics exists | Re-engagement analysis | Re-engagement metrics displayed | | | |
| ESTO-S27-HP-3210 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View referral sources | Sources displayed | | | |
| ESTO-S27-HP-3211 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View campaign performance | Campaign metrics displayed | | | |
| ESTO-S27-HP-3212 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View attribution | Attribution model displayed | | | |
| ESTO-S27-HP-3213 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View feature adoption | Feature metrics displayed | | | |
| ESTO-S27-HP-3214 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View onboarding funnel | Onboarding funnel displayed | | | |
| ESTO-S27-HP-3215 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View retention cohort | Retention cohort displayed | | | |
| ESTO-S27-HP-3216 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View engagement score | Engagement score displayed | | | |
| ESTO-S27-HP-3217 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View personalization metrics | Personalization metrics displayed | | | |
| ESTO-S27-HP-3218 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View notification engagement | Notification metrics displayed | | | |
| ESTO-S27-HP-3219 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View search analytics | Search metrics displayed | | | |
| ESTO-S27-HP-3220 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View error analytics | Error rates displayed | | | |
| ESTO-S27-HP-3221 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View performance analytics | Performance metrics displayed | | | |
| ESTO-S27-HP-3222 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View accessibility analytics | A11y metrics displayed | | | A11y |
| ESTO-S27-HP-3223 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View mobile analytics | Mobile metrics displayed | | | |
| ESTO-S27-HP-3224 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View browser analytics | Browser metrics displayed | | | |
| ESTO-S27-HP-3225 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View OS analytics | OS metrics displayed | | | |
| ESTO-S27-HP-3226 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View geographic distribution | Geo distribution displayed | | | |
| ESTO-S27-HP-3227 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View language distribution | Language distribution displayed | | | |
| ESTO-S27-HP-3228 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View time-of-day usage | Usage patterns displayed | | | |
| ESTO-S27-HP-3229 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View device-type distribution | Device distribution displayed | | | |
| ESTO-S27-HP-3230 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View connection type distribution | Connection type displayed | | | |
| ESTO-S27-HP-3231 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View page-load distribution | Load time distribution | | | |
| ESTO-S27-HP-3232 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View error rate by page | Per-page error rates | | | |
| ESTO-S27-HP-3233 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View conversion by source | Conversion by traffic source | | | |
| ESTO-S27-HP-3234 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View user flow by entry point | Entry point analysis | | | |
| ESTO-S27-HP-3235 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View exit pages | Exit page analysis | | | |
| ESTO-S27-HP-3236 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View scroll depth | Scroll depth analytics | | | |
| ESTO-S27-HP-3237 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View click maps | Click maps displayed | | | |
| ESTO-S27-HP-3238 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View form completion | Form analytics displayed | | | |
| ESTO-S27-HP-3239 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View search term analysis | Search analytics displayed | | | |
| ESTO-S27-HP-3240 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View zero-result searches | Zero-result analysis displayed | | | |
| ESTO-S27-HP-3241 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View filter usage | Filter analytics displayed | | | |
| ESTO-S27-HP-3242 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View sort usage | Sort analytics displayed | | | |
| ESTO-S27-HP-3243 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View property view duration | View duration metrics | | | |
| ESTO-S27-HP-3244 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View inquiry rate | Inquiry conversion rate | | | |
| ESTO-S27-HP-3245 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View booking rate | Booking conversion rate | | | |
| ESTO-S27-HP-3246 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View repeat visit rate | Repeat visit metrics | | | |
| ESTO-S27-HP-3247 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View social sharing rate | Sharing metrics displayed | | | |
| ESTO-S27-HP-3248 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View referral traffic | Referral sources displayed | | | |
| ESTO-S27-HP-3249 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View paid ad performance | Ad metrics displayed | | | |
| ESTO-S27-HP-3250 | 27.1 Analytics | Admin | Happy | All | Analytics exists | View organic search performance | SEO metrics displayed | | | |
| ESTO-S27-EM-3251 | 27.1 Analytics | Admin | Empty | All | -- | View analytics with no data | Empty state displayed | | | |
| ESTO-S27-ER-3252 | 27.1 Analytics | Admin | Error | All | Analytics service down | View dashboard | Error; cached data | | | |
| ESTO-S27-ER-3253 | 27.1 Analytics | Admin | Error | All | -- | Analytics with PII leak risk | Error: PII must be excluded | | | Security |
| ESTO-S27-ER-3254 | 27.1 Analytics | Admin | Error | All | Mock backend | Mock 500 on analytics | Error toast; no crash | | | |
| ESTO-S27-ED-3255 | 27.1 Analytics | Admin | Edge | All | 1M events | Process analytics | All processed; no data loss | | | |
| ESTO-S27-ED-3256 | 27.1 Analytics | Admin | Edge | All | Real-time analytics | 10K events/second | Pipeline handles load | | | |
| ESTO-S27-CR-3257 | 27.1 Analytics | Admin | Cross-Role | All | User data collected | Admin views user analytics | User patterns in analytics | | | |
| ESTO-S27-CR-3258 | 27.1 Analytics | Manager | Cross-Role | All | Property analytics | Manager views property metrics | Property metrics displayed | | | |
| ESTO-S27-CR-3259 | 27.1 Analytics | Admin | Cross-Role | All | -- | Admin creates dashboard; Manager sees | Dashboard shared with manager | | | |
| ESTO-S27-CR-3260 | 27.1 Analytics | Admin | Cross-Role | All | -- | Admin exports analytics; User data protected | Export anonymized | | | Security |

### 27.2 Business Intelligence & Reports (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S27-HP-3261 | 27.2 BI | Admin | Happy | All | Reports configured | Generate revenue report | Revenue report generated | | | |
| ESTO-S27-HP-3262 | 27.2 BI | Admin | Happy | All | Reports exist | Generate property report | Property report generated | | | |
| ESTO-S27-HP-3263 | 27.2 BI | Admin | Happy | All | Reports exist | Generate user report | User report generated | | | |
| ESTO-S27-HP-3264 | 27.2 BI | Admin | Happy | All | Reports exist | Generate booking report | Booking report generated | | | |
| ESTO-S27-HP-3265 | 27.2 BI | Admin | Happy | All | Reports exist | Generate commission report | Commission report generated | | | |
| ESTO-S27-HP-3266 | 27.2 BI | Admin | Happy | All | Reports exist | Generate marketing report | Marketing report generated | | | |
| ESTO-S27-HP-3267 | 27.2 BI | Admin | Happy | All | Reports exist | Generate support report | Support report generated | | | |
| ESTO-S27-HP-3268 | 27.2 BI | Admin | Happy | All | Reports exist | Generate financial report | Financial report generated | | | |
| ESTO-S27-HP-3269 | 27.2 BI | Admin | Happy | All | Reports exist | Generate compliance report | Compliance report generated | | | |
| ESTO-S27-HP-3270 | 27.2 BI | Admin | Happy | All | Reports exist | Generate audit report | Audit report generated | | | |
| ESTO-S27-HP-3271 | 27.2 BI | Admin | Happy | All | Report generated | Export report as PDF | PDF exported | | | |
| ESTO-S27-HP-3272 | 27.2 BI | Admin | Happy | All | Report generated | Export report as Excel | Excel exported | | | |
| ESTO-S27-HP-3273 | 27.2 BI | Admin | Happy | All | Report generated | Export report as CSV | CSV exported | | | |
| ESTO-S27-HP-3274 | 27.2 BI | Admin | Happy | All | Report exists | Schedule report | Report scheduled | | | |
| ESTO-S27-HP-3275 | 27.2 BI | Admin | Happy | All | Report scheduled | Receive report via email | Email with report received | | | |
| ESTO-S27-HP-3276 | 27.2 BI | Admin | Happy | All | Dashboard exists | Customize dashboard | Customization saved | | | |
| ESTO-S27-HP-3277 | 27.2 BI | Admin | Happy | All | Dashboard exists | Share dashboard with team | Team has access | | | |
| ESTO-S27-HP-3278 | 27.2 BI | Admin | Happy | All | Report exists | Drill into report details | Detail view displayed | | | |
| ESTO-S27-HP-3279 | 27.2 BI | Admin | Happy | All | Multiple reports | Compare reports | Comparison displayed | | | |
| ESTO-S27-HP-3280 | 27.2 BI | Admin | Happy | All | Reports exist | View report trends | Trend analysis displayed | | | |
| ESTO-S27-HP-3281 | 27.2 BI | Admin | Happy | All | Data warehouse | Connect BI tool | BI tool connected | | | |
| ESTO-S27-HP-3282 | 27.2 BI | Admin | Happy | All | BI tool connected | Create custom query | Query executed; results displayed | | | |
| ESTO-S27-HP-3283 | 27.2 BI | Admin | Happy | All | Query executed | Save query | Query saved | | | |
| ESTO-S27-HP-3284 | 27.2 BI | Admin | Happy | All | Query saved | Schedule query | Query scheduled | | | |
| ESTO-S27-HP-3285 | 27.2 BI | Admin | Happy | All | Dashboard exists | Embed dashboard | Embed code generated | | | |
| ESTO-S27-HP-3286 | 27.2 BI | Admin | Happy | All | Dashboard embedded | Dashboard loads in iframe | Dashboard loads correctly | | | |
| ESTO-S27-HP-3287 | 27.2 BI | Admin | Happy | All | Data model exists | Update data model | Model updated; reports refresh | | | |
| ESTO-S27-HP-3288 | 27.2 BI | Admin | Happy | All | Data model exists | Refresh data model | Data refreshed | | | |
| ESTO-S27-HP-3289 | 27.2 BI | Admin | Happy | All | Data sources | Add new data source | Source connected | | | |
| ESTO-S27-HP-3290 | 27.2 BI | Admin | Happy | All | Data sources | Remove data source | Source disconnected | | | |
| ESTO-S27-HP-3291 | 27.2 BI | Admin | Happy | All | Report exists | Set report access | Access permissions set | | | Security |
| ESTO-S27-HP-3292 | 27.2 BI | Admin | Happy | All | Report shared | Recipient views report | Report displayed to recipient | | | |
| ESTO-S27-HP-3293 | 27.2 BI | Admin | Happy | All | Report exists | Add annotations to report | Annotations added | | | |
| ESTO-S27-HP-3294 | 27.2 BI | Admin | Happy | All | Report with annotations | Export annotated report | Annotations in export | | | |
| ESTO-S27-HP-3295 | 27.2 BI | Admin | Happy | All | Report exists | Print report | Report prints correctly | | | |
| ESTO-S27-HP-3296 | 27.2 BI | Admin | Happy | All | Report exists | Share report link | Link generated | | | |
| ESTO-S27-HP-3297 | 27.2 BI | Admin | Happy | All | Report link shared | Recipient views report | Report accessible | | | |
| ESTO-S27-HP-3298 | 27.2 BI | Admin | Happy | All | Report link | Set link expiry | Link expires after date | | | Security |
| ESTO-S27-HP-3299 | 27.2 BI | Admin | Happy | All | Report link | Revoke link | Link no longer works | | | Security |
| ESTO-S27-HP-3300 | 27.2 BI | Admin | Happy | All | Report exists | Add watermark to export | Watermark in export | | | Security |
| ESTO-S27-HP-3301 | 27.2 BI | Admin | Happy | All | Report exists | Set refresh schedule | Report auto-refreshes | | | |
| ESTO-S27-HP-3302 | 27.2 BI | Admin | Happy | All | Report with PII | Redact PII | PII redacted in export | | | Security |
| ESTO-S27-HP-3303 | 27.2 BI | Admin | Happy | All | Report exists | Set row-level security | RLS applied | | | Security |
| ESTO-S27-HP-3304 | 27.2 BI | Admin | Happy | All | RLS configured | User sees only own data | User data isolated | | | Security |
| ESTO-S27-HP-3305 | 27.2 BI | Admin | Happy | All | Report exists | Create report from template | Report generated from template | | | |
| ESTO-S27-HP-3306 | 27.2 BI | Admin | Happy | All | Templates exist | Manage templates | Templates managed | | | |
| ESTO-S27-HP-3307 | 27.2 BI | Admin | Happy | All | Report generated | Cache report | Cached for faster access | | | |
| ESTO-S27-HP-3308 | 27.2 BI | Admin | Happy | All | Cached report | View cached report | Report loads from cache | | | |
| ESTO-S27-HP-3309 | 27.2 BI | Admin | Happy | All | Cached report | Force refresh | Report refreshed from source | | | |
| ESTO-S27-HP-3310 | 27.2 BI | Admin | Happy | All | Report schedule | Modify schedule | Schedule updated | | | |
| ESTO-S27-HP-3311 | 27.2 BI | Admin | Happy | All | Report schedule | Pause schedule | Scheduling paused | | | |
| ESTO-S27-HP-3312 | 27.2 BI | Admin | Happy | All | Report paused | Resume schedule | Scheduling resumed | | | |
| ESTO-S27-HP-3313 | 27.2 BI | Admin | Happy | All | Report scheduled | View delivery history | History displayed | | | |
| ESTO-S27-HP-3314 | 27.2 BI | Admin | Happy | All | Report delivered | Download from email | Download works | | | |
| ESTO-S27-HP-3315 | 27.2 BI | Admin | Happy | All | Report scheduled | Delete schedule | Schedule deleted | | | |
| ESTO-S27-HP-3316 | 27.2 BI | Admin | Happy | All | Report exists | Add report to dashboard | Report card added to dashboard | | | |
| ESTO-S27-HP-3317 | 27.2 BI | Admin | Happy | All | Report card exists | Remove from dashboard | Card removed | | | |
| ESTO-S27-HP-3318 | 27.2 BI | Admin | Happy | All | Dashboard exists | Reorder cards | Order updated | | | |
| ESTO-S27-HP-3319 | 27.2 BI | Admin | Happy | All | Dashboard exists | Resize cards | Cards resized | | | |
| ESTO-S27-HP-3320 | 27.2 BI | Admin | Happy | All | Dashboard exists | Set refresh rate | Refresh rate updated | | | |
| ESTO-S27-HP-3321 | 27.2 BI | Admin | Happy | All | Dashboard exists | Export dashboard | Dashboard exported as PDF | | | |
| ESTO-S27-HP-3322 | 27.2 BI | Admin | Happy | All | Dashboard exists | Schedule dashboard delivery | Dashboard emailed | | | |
| ESTO-S27-HP-3323 | 27.2 BI | Admin | Happy | All | Dashboard shared | Team views dashboard | Team can view dashboard | | | |
| ESTO-S27-HP-3324 | 27.2 BI | Admin | Happy | All | Dashboard exists | Set alert threshold | Alert triggers at threshold | | | |
| ESTO-S27-HP-3325 | 27.2 BI | Admin | Happy | All | Alert configured | Receive alert | Alert notification received | | | |
| ESTO-S27-HP-3326 | 27.2 BI | Admin | Happy | All | Multiple alerts | Manage alert rules | Rules managed | | | |
| ESTO-S27-HP-3327 | 27.2 BI | Admin | Happy | All | Alert triggered | Acknowledge alert | Alert acknowledged | | | |
| ESTO-S27-HP-3328 | 27.2 BI | Admin | Happy | All | Alerts history | View alert history | History displayed | | | |
| ESTO-S27-HP-3329 | 27.2 BI | Admin | Happy | All | Reports exist | Create custom visualization | Visualization created | | | |
| ESTO-S27-HP-3330 | 27.2 BI | Admin | Happy | All | Visualization exists | Export chart | Chart exported as PNG | | | |
| ESTO-S27-HP-3331 | 27.2 BI | Admin | Happy | All | Visualization exists | Embed chart | Embed code generated | | | |
| ESTO-S27-HP-3332 | 27.2 BI | Admin | Happy | All | Report exists | View report schedule history | History displayed | | | |
| ESTO-S27-HP-3333 | 27.2 BI | Admin | Happy | All | Report exists | Compare report versions | Version diff displayed | | | |
| ESTO-S27-HP-3334 | 27.2 BI | Admin | Happy | All | Report versioned | Rollback to previous version | Rolled back successfully | | | |
| ESTO-S27-HP-3335 | 27.2 BI | Admin | Happy | All | Report exists | Add comments to report | Comments added | | | |
| ESTO-S27-HP-3336 | 27.2 BI | Admin | Happy | All | Report with comments | Share with comments | Comments visible to recipients | | | |
| ESTO-S27-HP-3337 | 27.2 BI | Admin | Happy | All | Data warehouse | Schedule ETL | ETL runs on schedule | | | |
| ESTO-S27-HP-3338 | 27.2 BI | Admin | Happy | All | ETL run | View ETL status | Status displayed | | | |
| ESTO-S27-HP-3339 | 27.2 BI | Admin | Happy | All | ETL failed | Retry ETL | ETL retried | | | |
| ESTO-S27-HP-3340 | 27.2 BI | Admin | Happy | All | ETL logs | View ETL logs | Logs displayed | | | |
| ESTO-S27-HP-3341 | 27.2 BI | Admin | Happy | All | Data quality rules | Run quality checks | Quality report displayed | | | |
| ESTO-S27-HP-3342 | 27.2 BI | Admin | Happy | All | Quality issues | View quality issues | Issues listed | | | |
| ESTO-S27-HP-3343 | 27.2 BI | Admin | Happy | All | Quality issues | Resolve quality issues | Issues resolved | | | |
| ESTO-S27-HP-3344 | 27.2 BI | Admin | Happy | All | Report exists | Set data refresh interval | Refresh interval set | | | |
| ESTO-S27-HP-3345 | 27.2 BI | Admin | Happy | All | Report with live data | View live data | Real-time data displayed | | | |
| ESTO-S27-HP-3346 | 27.2 BI | Admin | Happy | All | Report with historical data | View historical data | Historical data displayed | | | |
| ESTO-S27-HP-3347 | 27.2 BI | Admin | Happy | All | Report exists | Create drill-down report | Drill-down enabled | | | |
| ESTO-S27-EM-3348 | 27.2 BI | Admin | Empty | All | -- | View report with no data | Empty state displayed | | | |
| ESTO-S27-ER-3349 | 27.2 BI | Admin | Error | All | Data warehouse down | Generate report | Error; retry | | | |
| ESTO-S27-ER-3350 | 27.2 BI | Admin | Error | All | Query times out | Run complex query | Error: Query timeout | | | |
| ESTO-S27-ER-3351 | 27.2 BI | Admin | Error | All | Report fails | View report | Error: Report generation failed | | | |
| ESTO-S27-ER-3352 | 27.2 BI | Admin | Error | All | -- | Report with SQL injection | Injection blocked | | | Security |
| ESTO-S27-ED-3353 | 27.2 BI | Admin | Edge | All | 1TB dataset | Run analytics query | Query completes | | | |
| ESTO-S27-ED-3354 | 27.2 BI | Admin | Edge | All | Concurrent users | 100 users access dashboard | Dashboard handles load | | | |
| ESTO-S27-ED-3355 | 27.2 BI | Admin | Edge | All | Report with 1M rows | Export report | Export completes | | | |
| ESTO-S27-CR-3356 | 27.2 BI | Admin | Cross-Role | All | Report exists | Manager views filtered report | Manager sees own data only | | | Security |
| ESTO-S27-CR-3357 | 27.2 BI | Admin | Cross-Role | All | Report exists | User data in report | PII anonymized | | | Security |
| ESTO-S27-CR-3358 | 27.2 BI | Admin | Cross-Role | All | -- | Admin creates report; Manager accesses | Manager has appropriate access | | | Security |
| ESTO-S27-CR-3359 | 27.2 BI | Admin | Cross-Role | All | -- | Admin schedules report; team notified | Team receives scheduled report | | | |
| ESTO-S27-CR-3360 | 27.2 BI | Admin | Cross-Role | All | -- | Admin embeds dashboard in portal | Dashboard loads in external portal | | | |

## Section 28: AI & Machine Learning (200)

### 28.1 Property Recommendations (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S28-HP-3361 | 28.1 ML | User | Happy | All | User has search history | View property recommendations | Relevant properties suggested | | | |
| ESTO-S28-HP-3362 | 28.1 ML | User | Happy | All | Recommendations shown | Click recommended property | Property detail opens | | | |
| ESTO-S28-HP-3363 | 28.1 ML | User | Happy | All | Property viewed | Get similar properties | Similar properties listed | | | |
| ESTO-S28-HP-3364 | 28.1 ML | User | Happy | All | User preferences set | Recommendations match preferences | Recommendations are relevant | | | |
| ESTO-S28-HP-3365 | 28.1 ML | User | Happy | All | User viewed properties | Price prediction shown | Predicted price displayed | | | |
| ESTO-S28-HP-3366 | 28.1 ML | User | Happy | All | Price prediction shown | View price history | Price trend chart displayed | | | |
| ESTO-S28-HP-3367 | 28.1 ML | User | Happy | All | Recommendations shown | Dismiss property | Property removed from suggestions | | | |
| ESTO-S28-HP-3368 | 28.1 ML | User | Happy | All | Recommendations dismissed | Save preference | Preference saved | | | |
| ESTO-S28-HP-3369 | 28.1 ML | User | Happy | All | User profile complete | Personalized recommendations | Recommendations match profile | | | |
| ESTO-S28-HP-3370 | 28.1 ML | User | Happy | All | Recommendations shown | Share recommendations | Share link generated | | | |
| ESTO-S28-HP-3371 | 28.1 ML | User | Happy | All | Recommendations | View recommendation reasons | Reasons displayed | | | |
| ESTO-S28-HP-3372 | 28.1 ML | User | Happy | All | Recommendation clicked | Track engagement | Click tracked | | | |
| ESTO-S28-HP-3373 | 28.1 ML | Manager | Happy | All | Property listed | View predicted demand | Demand forecast displayed | | | |
| ESTO-S28-HP-3374 | 28.1 ML | Manager | Happy | All | Demand forecast shown | Adjust pricing based on AI | Suggested price displayed | | | |
| ESTO-S28-HP-3375 | 28.1 ML | Manager | Happy | All | AI suggestions | Accept AI price suggestion | Price updated | | | |
| ESTO-S28-HP-3376 | 28.1 ML | Manager | Happy | All | Property listed | View AI-generated description | Description generated | | | |
| ESTO-S28-HP-3377 | 28.1 ML | Manager | Happy | All | AI description generated | Edit AI description | Editable; changes saved | | | |
| ESTO-S28-HP-3378 | 28.1 ML | Manager | Happy | All | Property photos | AI generates virtual tour | Virtual tour generated | | | |
| ESTO-S28-HP-3379 | 28.1 ML | Manager | Happy | All | AI tour generated | View virtual tour | Tour plays correctly | | | |
| ESTO-S28-HP-3380 | 28.1 ML | Manager | Happy | All | Property listed | AI suggests listing improvements | Suggestions displayed | | | |
| ESTO-S28-HP-3381 | 28.1 ML | Manager | Happy | All | Suggestions shown | Apply improvements | Listing updated | | | |
| ESTO-S28-HP-3382 | 28.1 ML | Manager | Happy | All | Property listed | AI predicts optimal listing date | Optimal date suggested | | | |
| ESTO-S28-HP-3383 | 28.1 ML | Manager | Happy | All | Multiple properties | AI prioritizes listings | Properties ranked by potential | | | |
| ESTO-S28-HP-3384 | 28.1 ML | Manager | Happy | All | Property listed | AI predicts occupancy rate | Occupancy forecast displayed | | | |
| ESTO-S28-HP-3385 | 28.1 ML | Manager | Happy | All | Occupancy data | AI suggests rental strategy | Strategy recommendations shown | | | |
| ESTO-S28-HP-3386 | 28.1 ML | Manager | Happy | All | Tenants exist | AI predicts tenant satisfaction | Satisfaction score displayed | | | |
| ESTO-S28-HP-3387 | 28.1 ML | Manager | Happy | All | Support tickets | AI categorizes tickets | Tickets auto-categorized | | | |
| ESTO-S28-HP-3388 | 28.1 ML | Manager | Happy | All | Tickets categorized | AI suggests responses | Suggested responses shown | | | |
| ESTO-S28-HP-3389 | 28.1 ML | Manager | Happy | All | Support tickets | AI predicts ticket volume | Volume forecast displayed | | | |
| ESTO-S28-HP-3390 | 28.1 ML | Manager | Happy | All | Maintenance issues | AI predicts maintenance needs | Needs predicted | | | |
| ESTO-S28-HP-3391 | 28.1 ML | Admin | Happy | All | Platform data | View AI model performance | Performance metrics displayed | | | |
| ESTO-S28-HP-3392 | 28.1 ML | Admin | Happy | All | AI models | Retrain AI model | Model retrained | | | |
| ESTO-S28-HP-3393 | 28.1 ML | Admin | Happy | All | Model retrained | Test model accuracy | Accuracy displayed | | | |
| ESTO-S28-HP-3394 | 28.1 ML | Admin | Happy | All | Model exists | Deploy model | Model deployed | | | |
| ESTO-S28-HP-3395 | 28.1 ML | Admin | Happy | All | Models deployed | View model version history | History displayed | | | |
| ESTO-S28-HP-3396 | 28.1 ML | Admin | Happy | All | Model version | Rollback model | Rolled back | | | |
| ESTO-S28-HP-3397 | 28.1 ML | Admin | Happy | All | Models exist | Configure A/B testing | A/B test configured | | | |
| ESTO-S28-HP-3398 | 28.1 ML | Admin | Happy | All | A/B test running | View A/B test results | Results displayed | | | |
| ESTO-S28-HP-3399 | 28.1 ML | Admin | Happy | All | Model exists | View feature importance | Feature importance displayed | | | |
| ESTO-S28-HP-3400 | 28.1 ML | Admin | Happy | All | Model exists | Explain AI decision | Explanation displayed | | | Explainable AI |
| ESTO-S28-EM-3401 | 28.1 ML | User | Empty | All | -- | View recommendations with no history | Default recommendations shown | | | |
| ESTO-S28-ER-3402 | 28.1 ML | User | Error | All | ML service down | View recommendations | Fallback: trending properties | | | |
| ESTO-S28-ER-3403 | 28.1 ML | User | Error | All | -- | Recommendation with biased data | Bias detected and mitigated | | | Fairness |
| ESTO-S28-ER-3404 | 28.1 ML | User | Error | All | -- | AI recommendation exposes PII | No PII in recommendations | | | Security |
| ESTO-S28-ED-3405 | 28.1 ML | User | Edge | All | Cold start user | Get cold-start recommendations | Generic but relevant suggestions | | | |
| ESTO-S28-ED-3406 | 28.1 ML | User | Edge | All | User has 100+ views | Recommendations update in real-time | Recommendations refresh immediately | | | |
| ESTO-S28-CR-3407 | 28.1 ML | Admin | Cross-Role | All | AI models | Admin audits model fairness | Fairness report displayed | | | Fairness |
| ESTO-S28-CR-3408 | 28.1 ML | Manager | Cross-Role | All | AI pricing | Manager overrides AI price | Override saved; logged | | | |
| ESTO-S28-CR-3409 | 28.1 ML | User | Cross-Role | All | User data | User opts out of AI recommendations | Recommendations disabled for user | | | Privacy |
| ESTO-S28-CR-3410 | 28.1 ML | Admin | Cross-Role | All | AI models | Admin monitors model drift | Drift alerts triggered | | | |

### 28.2 Smart Search & NLP (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S28-HP-3411 | 28.2 NLP | User | Happy | All | Search bar | Natural language search | Results match query intent | | | |
| ESTO-S28-HP-3412 | 28.2 NLP | User | Happy | All | Search bar | Voice search property | Properties found | | | |
| ESTO-S28-HP-3413 | 28.2 NLP | User | Happy | All | Search results | Smart spell correction | Corrected results displayed | | | |
| ESTO-S28-HP-3414 | 28.2 NLP | User | Happy | All | Search bar | Autocomplete suggestions | Suggestions displayed | | | |
| ESTO-S28-HP-3415 | 28.2 NLP | User | Happy | All | Search results | Semantic search | Semantically relevant results | | | |
| ESTO-S28-HP-3416 | 28.2 NLP | User | Happy | All | Search bar | Search by image | Similar properties found | | | |
| ESTO-S28-HP-3417 | 28.2 NLP | User | Happy | All | Search results | Sort by AI relevance | Sorted by AI relevance | | | |
| ESTO-S28-HP-3418 | 28.2 NLP | User | Happy | All | Search performed | Search history displayed | History shown | | | |
| ESTO-S28-HP-3419 | 28.2 NLP | User | Happy | All | Search history | Re-run past search | Same results displayed | | | |
| ESTO-S28-HP-3420 | 28.2 NLP | User | Happy | All | Search bar | Search with filters | Filtered results displayed | | | |
| ESTO-S28-HP-3421 | 28.2 NLP | User | Happy | All | Search results | Save search | Search saved | | | |
| ESTO-S28-HP-3422 | 28.2 NLP | User | Happy | All | Saved searches | Get search alerts | Alerts received | | | |
| ESTO-S28-HP-3423 | 28.2 NLP | User | Happy | All | Search results | Share search results | Results shared via link | | | |
| ESTO-S28-HP-3424 | 28.2 NLP | User | Happy | All | Search performed | Search analytics displayed | Analytics displayed | | | |
| ESTO-S28-HP-3425 | 28.2 NLP | User | Happy | All | Search bar | Multi-language search | Results in user language | | | |
| ESTO-S28-HP-3426 | 28.2 NLP | User | Happy | All | Search results | Expand search area | Wider area results shown | | | |
| ESTO-S28-HP-3427 | 28.2 NLP | User | Happy | All | Search results | Narrow search area | Narrower results shown | | | |
| ESTO-S28-HP-3428 | 28.2 NLP | User | Happy | All | Search results | View search suggestions | Suggestions displayed | | | |
| ESTO-S28-HP-3429 | 28.2 NLP | User | Happy | All | Search performed | AI explains results | Explanation shown | | | Explainable AI |
| ESTO-S28-HP-3430 | 28.2 NLP | User | Happy | All | Search results | Compare search with AI ranking | Comparison shown | | | |
| ESTO-S28-HP-3431 | 28.2 NLP | Manager | Happy | All | Property listed | AI tags property | Tags auto-generated | | | |
| ESTO-S28-HP-3432 | 28.2 NLP | Manager | Happy | All | AI tags generated | Edit AI tags | Tags editable | | | |
| ESTO-S28-HP-3433 | 28.2 NLP | Manager | Happy | All | Property listed | AI categorizes property | Category assigned | | | |
| ESTO-S28-HP-3434 | 28.2 NLP | Admin | Happy | All | Search queries | View search intent analytics | Intent analytics displayed | | | |
| ESTO-S28-EM-3435 | 28.2 NLP | User | Empty | All | -- | Search with no results | No results suggestions shown | | | |
| ESTO-S28-ER-3436 | 28.2 NLP | User | Error | All | NLP service down | Natural language search | Falls back to keyword search | | | |
| ESTO-S28-ER-3437 | 28.2 NLP | User | Error | All | -- | Voice search with no microphone | Error: Microphone not found | | | |
| ESTO-S28-ER-3438 | 28.2 NLP | User | Error | All | -- | Image search with invalid image | Error: Invalid image | | | |
| ESTO-S28-ER-3439 | 28.2 NLP | User | Error | All | NLP service timeout | Smart search | Falls back to basic search | | | |
| ESTO-S28-ED-3440 | 28.2 NLP | User | Edge | All | Complex query | Multi-intent search | All intents handled | | | |
| ESTO-S28-ED-3441 | 28.2 NLP | User | Edge | All | Query with typos | Fuzzy search | Corrected results displayed | | | |
| ESTO-S28-CR-3442 | 28.2 NLP | Admin | Cross-Role | All | NLP models | Admin improves search model | Model improved; results better | | | |
| ESTO-S28-CR-3443 | 28.2 NLP | User | Cross-Role | All | Search data | User privacy in NLP search | PII not used in model | | | Privacy |
| ESTO-S28-CR-3444 | 28.2 NLP | Admin | Cross-Role | All | NLP models | Admin audits NLP fairness | Fairness report displayed | | | Fairness |
| ESTO-S28-CR-3445 | 28.2 NLP | Manager | Cross-Role | All | AI tagging | Manager overrides AI tags | Override saved | | | |
| ESTO-S28-CR-3446 | 28.2 NLP | Admin | Cross-Role | All | Search queries | Admin views cross-user search patterns | Pattern analysis displayed | | | |

### 28.3 Fraud Detection & Risk (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S28-HP-3447 | 28.3 Fraud | Admin | Happy | All | New registration | AI detects suspicious signup | Risk score calculated | | | Security |
| ESTO-S28-HP-3448 | 28.3 Fraud | Admin | Happy | All | Risk score high | Admin reviews risk alert | Alert displayed with details | | | Security |
| ESTO-S28-HP-3449 | 28.3 Fraud | Admin | Happy | All | Risk alert | Approve or reject | Decision recorded | | | Security |
| ESTO-S28-HP-3450 | 28.3 Fraud | Admin | Happy | All | User flagged | User notified of review | Notification sent to user | | | Security |
| ESTO-S28-HP-3451 | 28.3 Fraud | Admin | Happy | All | Review complete | User status updated | Status reflects review outcome | | | Security |
| ESTO-S28-HP-3452 | 28.3 Fraud | Admin | Happy | All | Multiple users | View risk dashboard | Dashboard with risk scores | | | Security |
| ESTO-S28-HP-3453 | 28.3 Fraud | Admin | Happy | All | Risk dashboard | Filter by risk level | Filtered results displayed | | | Security |
| ESTO-S28-HP-3454 | 28.3 Fraud | Admin | Happy | All | Risk events | View risk event history | History displayed | | | Security |
| ESTO-S28-HP-3455 | 28.3 Fraud | Admin | Happy | All | Fraud detected | Block suspicious user | User blocked | | | Security |
| ESTO-S28-HP-3456 | 28.3 Fraud | Admin | Happy | All | User blocked | Unblock legitimate user | User unblocked | | | Security |
| ESTO-S28-HP-3457 | 28.3 Fraud | Admin | Happy | All | Fraud patterns | Update fraud rules | Rules updated | | | Security |
| ESTO-S28-HP-3458 | 28.3 Fraud | Admin | Happy | All | Rules updated | Rules applied to new events | New events evaluated | | | Security |
| ESTO-S28-HP-3459 | 28.3 Fraud | Admin | Happy | All | Fraud detected | Notify relevant parties | Notifications sent | | | Security |
| ESTO-S28-HP-3460 | 28.3 Fraud | Admin | Happy | All | False positive | Flag for model retraining | Model feedback recorded | | | Security |
| ESTO-S28-HP-3461 | 28.3 Fraud | Admin | Happy | All | Risk events | Export risk data | Data exported | | | Security |
| ESTO-S28-HP-3462 | 28.3 Fraud | Admin | Happy | All | Risk dashboard | View risk trends | Trend analysis displayed | | | Security |
| ESTO-S28-HP-3463 | 28.3 Fraud | Admin | Happy | All | Risk models | View model accuracy | Accuracy metrics displayed | | | Security |
| ESTO-S28-HP-3464 | 28.3 Fraud | Admin | Happy | All | Low accuracy | Retrain fraud model | Model retrained | | | Security |
| ESTO-S28-HP-3465 | 28.3 Fraud | Admin | Happy | All | Model retrained | Test new model | Accuracy improved | | | Security |
| ESTO-S28-HP-3466 | 28.3 Fraud | Admin | Happy | All | Multiple regions | View regional risk patterns | Regional patterns displayed | | | Security |
| ESTO-S28-EM-3467 | 28.3 Fraud | Admin | Empty | All | -- | View risk dashboard with no events | Empty state displayed | | | Security |
| ESTO-S28-ER-3468 | 28.3 Fraud | Admin | Error | All | ML fraud service down | Risk score falls back | Fallback: rule-based scoring | | | Security |
| ESTO-S28-ER-3469 | 28.3 Fraud | Admin | Error | All | -- | Fraud with adversarial input | Adversarial attack detected | | | Security |
| ESTO-S28-ER-3470 | 28.3 Fraud | Admin | Error | All | -- | False positive blocks legitimate user | User unbanned; model flagged | | | Security |
| ESTO-S28-ED-3471 | 28.3 Fraud | Admin | Edge | All | Bot attack | Detect bot pattern | All bots flagged | | | Security |
| ESTO-S28-ED-3472 | 28.3 Fraud | Admin | Edge | All | Coordinated attack | Detect coordinated fraud | Attack pattern identified | | | Security |
| ESTO-S28-CR-3473 | 28.3 Fraud | Admin | Cross-Role | All | -- | Admin audits AI fraud decisions | Decision audit trail available | | | Security |
| ESTO-S28-CR-3474 | 28.3 Fraud | User | Cross-Role | All | User flagged | User sees fraud review status | Status visible to user | | | Security |
| ESTO-S28-CR-3475 | 28.3 Fraud | Admin | Cross-Role | All | Fraud detected | Admin notifies affected parties | Notifications sent | | | Security |

## Section 29: Compliance, Legal & Security (200)

### 29.1 Data Privacy & GDPR (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S29-HP-3476 | 29.1 Privacy | User | Happy | All | Account exists | Request data export | Data exported | | | Privacy |
| ESTO-S29-HP-3477 | 29.1 Privacy | User | Happy | All | Data exported | Download data | Download available | | | Privacy |
| ESTO-S29-HP-3478 | 29.1 Privacy | User | Happy | All | Account exists | Request account deletion | Deletion requested | | | Privacy |
| ESTO-S29-HP-3479 | 29.1 Privacy | User | Happy | All | Deletion requested | Confirm deletion | Account deleted | | | Privacy |
| ESTO-S29-HP-3480 | 29.1 Privacy | User | Happy | All | Account exists | View privacy policy | Policy displayed | | | Privacy |
| ESTO-S29-HP-3481 | 29.1 Privacy | User | Happy | All | Privacy policy displayed | Accept privacy policy | Acceptance recorded | | | Privacy |
| ESTO-S29-HP-3482 | 29.1 Privacy | User | Happy | All | Data collected | View data consent settings | Consent settings displayed | | | Privacy |
| ESTO-S29-HP-3483 | 29.1 Privacy | User | Happy | All | Consent settings | Update consent | Consent updated | | | Privacy |
| ESTO-S29-HP-3484 | 29.1 Privacy | User | Happy | All | Cookies used | Manage cookie preferences | Preferences saved | | | Privacy |
| ESTO-S29-HP-3485 | 29.1 Privacy | User | Happy | All | Tracking enabled | Opt out of tracking | Tracking disabled | | | Privacy |
| ESTO-S29-HP-3486 | 29.1 Privacy | User | Happy | All | Account exists | Request data rectification | Rectification requested | | | Privacy |
| ESTO-S29-HP-3487 | 29.1 Privacy | User | Happy | All | Rectification requested | Admin reviews request | Request reviewed | | | Privacy |
| ESTO-S29-HP-3488 | 29.1 Privacy | User | Happy | All | Data export | Export in machine-readable format | JSON/CSV export provided | | | Privacy |
| ESTO-S29-HP-3489 | 29.1 Privacy | User | Happy | All | Consent withdrawn | Services adapted | Service respects withdrawal | | | Privacy |
| ESTO-S29-HP-3490 | 29.1 Privacy | User | Happy | All | Data breach | User notified of breach | Notification sent | | | Privacy |
| ESTO-S29-HP-3491 | 29.1 Privacy | Admin | Happy | All | GDPR compliance | View GDPR compliance status | Status displayed | | | Privacy |
| ESTO-S29-HP-3492 | 29.1 Privacy | Admin | Happy | All | Data requests | Process data access request | Request processed | | | Privacy |
| ESTO-S29-HP-3493 | 29.1 Privacy | Admin | Happy | All | Data requests | Process deletion request | Deletion processed | | | Privacy |
| ESTO-S29-HP-3494 | 29.1 Privacy | Admin | Happy | All | User data | Anonymize user data | Data anonymized | | | Privacy |
| ESTO-S29-HP-3495 | 29.1 Privacy | Admin | Happy | All | User data | Pseudonymize user data | Data pseudonymized | | | Privacy |
| ESTO-S29-HP-3496 | 29.1 Privacy | Admin | Happy | All | Data processing | View processing activities | Activities listed | | | Privacy |
| ESTO-S29-HP-3497 | 29.1 Privacy | Admin | Happy | All | Sub-processors | View sub-processor list | List displayed | | | Privacy |
| ESTO-S29-HP-3498 | 29.1 Privacy | Admin | Happy | All | DPA needed | Generate DPA | DPA generated | | | Privacy |
| ESTO-S29-HP-3499 | 29.1 Privacy | Admin | Happy | All | Privacy policy | Update privacy policy | Policy updated; users notified | | | Privacy |
| ESTO-S29-HP-3500 | 29.1 Privacy | Admin | Happy | All | Consent records | Audit consent records | Records displayed | | | Privacy |
| ESTO-S29-EM-3501 | 29.1 Privacy | User | Empty | All | -- | View privacy settings (none) | Default privacy settings shown | | | Privacy |
| ESTO-S29-ER-3502 | 29.1 Privacy | User | Error | All | Data export service down | Request data export | Error; retry queued | | | Privacy |
| ESTO-S29-ER-3503 | 29.1 Privacy | Admin | Error | All | -- | Access data without authorization | Error: Unauthorized | | | Security |
| ESTO-S29-ER-3504 | 29.1 Privacy | Admin | Error | All | -- | Delete data without proper request | Error: Invalid request | | | Security |
| ESTO-S29-ER-3505 | 29.1 Privacy | User | Error | All | -- | Export with PII exposure risk | PII redacted in export | | | Privacy |
| ESTO-S29-ED-3506 | 29.1 Privacy | User | Edge | All | Very large account | Export 10GB of data | Export completed in chunks | | | Privacy |
| ESTO-S29-CR-3507 | 29.1 Privacy | Admin | Cross-Role | All | User data | Admin views user consent | Consent visible to admin | | | Privacy |
| ESTO-S29-CR-3508 | 29.1 Privacy | User | Cross-Role | All | Admin changes policy | User notified of policy change | Notification sent | | | Privacy |
| ESTO-S29-CR-3509 | 29.1 Privacy | Admin | Cross-Role | All | User deletion | All user data purged | Complete data removal | | | Privacy |

### 29.2 Legal & Terms (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S29-HP-3510 | 29.2 Legal | User | Happy | All | Account creation | View Terms of Service | ToS displayed | | | Legal |
| ESTO-S29-HP-3511 | 29.2 Legal | User | Happy | All | ToS displayed | Accept Terms of Service | Acceptance recorded | | | Legal |
| ESTO-S29-HP-3512 | 29.2 Legal | User | Happy | All | Account creation | View Privacy Policy | Policy displayed | | | Legal |
| ESTO-S29-HP-3513 | 29.2 Legal | User | Happy | All | Contract required | View contract before signing | Contract displayed | | | Legal |
| ESTO-S29-HP-3514 | 29.2 Legal | User | Happy | All | Contract displayed | Sign contract | Signature recorded | | | Legal |
| ESTO-S29-HP-3515 | 29.2 Legal | User | Happy | All | Contract signed | View signed contract | Contract displayed with signature | | | Legal |
| ESTO-S29-HP-3516 | 29.2 Legal | User | Happy | All | Contract exists | Download contract | PDF downloaded | | | Legal |
| ESTO-S29-HP-3517 | 29.2 Legal | User | Happy | All | Contract signed | Cancel contract | Cancellation recorded | | | Legal |
| ESTO-S29-HP-3518 | 29.2 Legal | User | Happy | All | Cancellation requested | View cancellation status | Status displayed | | | Legal |
| ESTO-S29-HP-3519 | 29.2 Legal | User | Happy | All | Dispute filed | View dispute details | Details displayed | | | Legal |
| ESTO-S29-HP-3520 | 29.2 Legal | User | Happy | All | Dispute filed | Add evidence to dispute | Evidence uploaded | | | Legal |
| ESTO-S29-HP-3521 | 29.2 Legal | User | Happy | All | Dispute with evidence | View dispute status | Status displayed | | | Legal |
| ESTO-S29-HP-3522 | 29.2 Legal | User | Happy | All | Arbitration clause | View arbitration terms | Terms displayed | | | Legal |
| ESTO-S29-HP-3523 | 29.2 Legal | User | Happy | All | Dispute unresolved | Initiate arbitration | Arbitration initiated | | | Legal |
| ESTO-S29-HP-3524 | 29.2 Legal | User | Happy | All | Terms updated | View terms history | History displayed | | | Legal |
| ESTO-S29-HP-3525 | 29.2 Legal | User | Happy | All | Terms changed | Accept new terms | Acceptance recorded | | | Legal |
| ESTO-S29-HP-3526 | 29.2 Legal | Admin | Happy | All | Contracts exist | View all contracts | All contracts listed | | | Legal |
| ESTO-S29-HP-3527 | 29.2 Legal | Admin | Happy | All | Contract dispute | Review dispute | Review interface displayed | | | Legal |
| ESTO-S29-HP-3528 | 29.2 Legal | Admin | Happy | All | Dispute reviewed | Resolve dispute | Resolution recorded | | | Legal |
| ESTO-S29-HP-3529 | 29.2 Legal | Admin | Happy | All | Contracts exist | Audit contracts | Audit log displayed | | | Legal |
| ESTO-S29-HP-3530 | 29.2 Legal | Admin | Happy | All | Contract template | Update contract template | Template updated | | | Legal |
| ESTO-S29-HP-3531 | 29.2 Legal | Admin | Happy | All | Legal notices | Publish legal notice | Notice published | | | Legal |
| ESTO-S29-HP-3532 | 29.2 Legal | Admin | Happy | All | Legal notices | View notice analytics | Analytics displayed | | | Legal |
| ESTO-S29-EM-3533 | 29.2 Legal | User | Empty | All | -- | View contracts (none) | No contracts message | | | Legal |
| ESTO-S29-ER-3534 | 29.2 Legal | User | Error | All | -- | View contract with invalid ID | Error: Contract not found | | | Legal |
| ESTO-S29-ER-3535 | 29.2 Legal | User | Error | All | Contract service down | Sign contract | Error: Service unavailable | | | Legal |
| ESTO-S29-ER-3536 | 29.2 Legal | User | Error | All | Tampered contract | View contract | Error: Contract integrity check failed | | | Security |
| ESTO-S29-ED-3537 | 29.2 Legal | User | Edge | All | Contract with many clauses | Review complex contract | All clauses rendered | | | Legal |
| ESTO-S29-CR-3538 | 29.2 Legal | Admin | Cross-Role | All | -- | Admin reviews user contract | Review interface accessible | | | Legal |
| ESTO-S29-CR-3539 | 29.2 Legal | User | Cross-Role | All | -- | User signs; Manager notified | Manager sees signed contract | | | Legal |
| ESTO-S29-CR-3540 | 29.2 Legal | Admin | Cross-Role | All | -- | Admin enforces legal change across all | Change applied to all users | | | Legal |

### 29.3 KYC & Identity Verification (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S29-HP-3541 | 29.3 KYC | User | Happy | All | Registration started | Submit KYC documents | Documents submitted | | | KYC |
| ESTO-S29-HP-3542 | 29.3 KYC | User | Happy | All | Documents submitted | View KYC status | Status displayed | | | KYC |
| ESTO-S29-HP-3543 | 29.3 KYC | User | Happy | All | KYC pending | Receive KYC notification | Notification received | | | KYC |
| ESTO-S29-HP-3544 | 29.3 KYC | User | Happy | All | KYC approved | View verified badge | Badge displayed | | | KYC |
| ESTO-S29-HP-3545 | 29.3 KYC | User | Happy | All | KYC rejected | View rejection reason | Reason displayed | | | KYC |
| ESTO-S29-HP-3546 | 29.3 KYC | User | Happy | All | KYC rejected | Resubmit documents | Resubmission accepted | | | KYC |
| ESTO-S29-HP-3547 | 29.3 KYC | User | Happy | All | Documents uploaded | Delete uploaded documents | Documents deleted | | | KYC |
| ESTO-S29-HP-3548 | 29.3 KYC | User | Happy | All | Identity verified | Verify additional identity | Additional verification completed | | | KYC |
| ESTO-S29-HP-3549 | 29.3 KYC | User | Happy | All | Face verification | Complete face verification | Face verified | | | KYC |
| ESTO-S29-HP-3550 | 29.3 KYC | User | Happy | All | Verification complete | View verification history | History displayed | | | KYC |
| ESTO-S29-HP-3551 | 29.3 KYC | Manager | Happy | All | Manager registered | Submit manager KYC | Documents submitted | | | KYC |
| ESTO-S29-HP-3552 | 29.3 KYC | Manager | Happy | All | Manager KYC submitted | View manager KYC status | Status displayed | | | KYC |
| ESTO-S29-HP-3553 | 29.3 KYC | Manager | Happy | All | Manager KYC approved | Manager verified | Verified status active | | | KYC |
| ESTO-S29-HP-3554 | 29.3 KYC | Manager | Happy | All | Manager KYC rejected | View rejection reason | Reason displayed | | | KYC |
| ESTO-S29-HP-3555 | 29.3 KYC | Manager | Happy | All | KYC expired | Renew KYC | Renewal submitted | | | KYC |
| ESTO-S29-HP-3556 | 29.3 KYC | Manager | Happy | All | KYC renewal | View renewal status | Status displayed | | | KYC |
| ESTO-S29-HP-3557 | 29.3 KYC | Admin | Happy | All | KYC submissions | Review KYC submissions | Review interface displayed | | | KYC |
| ESTO-S29-HP-3558 | 29.3 KYC | Admin | Happy | All | KYC under review | Approve KYC | Approved; user notified | | | KYC |
| ESTO-S29-HP-3559 | 29.3 KYC | Admin | Happy | All | KYC under review | Reject KYC | Rejected; reason recorded | | | KYC |
| ESTO-S29-HP-3560 | 29.3 KYC | Admin | Happy | All | KYC documents | Verify document authenticity | Authenticity check displayed | | | KYC |
| ESTO-S29-HP-3561 | 29.3 KYC | Admin | Happy | All | Fraudulent KYC | Flag as fraudulent | User flagged | | | Security |
| ESTO-S29-HP-3562 | 29.3 KYC | Admin | Happy | All | KYC bulk review | Batch approve KYC | All approved | | | KYC |
| ESTO-S29-HP-3563 | 29.3 KYC | Admin | Happy | All | KYC records | Export KYC audit log | Log exported | | | KYC |
| ESTO-S29-HP-3564 | 29.3 KYC | Admin | Happy | All | KYC settings | Configure KYC requirements | Requirements updated | | | KYC |
| ESTO-S29-HP-3565 | 29.3 KYC | Admin | Happy | All | KYC threshold | Set risk threshold | Threshold configured | | | KYC |
| ESTO-S29-EM-3566 | 29.3 KYC | User | Empty | All | -- | View KYC status (not started) | Prompt to start KYC | | | KYC |
| ESTO-S29-ER-3567 | 29.3 KYC | User | Error | All | KYC service down | Submit documents | Error; retry later | | | KYC |
| ESTO-S29-ER-3568 | 29.3 KYC | User | Error | All | Invalid document | Upload invalid doc type | Error: Invalid document type | | | KYC |
| ESTO-S29-ER-3569 | 29.3 KYC | User | Error | All | Expired document | Upload expired ID | Error: Document expired | | | KYC |
| ESTO-S29-ER-3570 | 29.3 KYC | User | Error | All | -- | Upload document with malware | Error: Malware detected | | | Security |
| ESTO-S29-ED-3571 | 29.3 KYC | User | Edge | All | Large document | Upload 50MB document | Upload succeeds with compression | | | KYC |
| ESTO-S29-ED-3572 | 29.3 KYC | User | Edge | All | Slow connection | Upload KYC documents | Upload with progress indicator | | | KYC |
| ESTO-S29-CR-3573 | 29.3 KYC | Admin | Cross-Role | All | KYC data | Admin views user KYC status | Status visible in admin panel | | | KYC |
| ESTO-S29-CR-3574 | 29.3 KYC | User | Cross-Role | All | Admin reviews | User sees KYC review progress | Progress indicator shown | | | KYC |
| ESTO-S29-CR-3575 | 29.3 KYC | Admin | Cross-Role | All | -- | Admin sets KYC requirements per region | Regional requirements applied | | | KYC |

### 29.4 Security & Audit (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S29-HP-3576 | 29.4 Security | User | Happy | All | Account exists | Enable two-factor auth | 2FA enabled | | | Security |
| ESTO-S29-HP-3577 | 29.4 Security | User | Happy | All | 2FA enabled | Login with 2FA | Login succeeds with code | | | Security |
| ESTO-S29-HP-3578 | 29.4 Security | User | Happy | All | 2FA enabled | Disable 2FA | 2FA disabled | | | Security |
| ESTO-S29-HP-3579 | 29.4 Security | User | Happy | All | 2FA enabled | View backup codes | Backup codes displayed | | | Security |
| ESTO-S29-HP-3580 | 29.4 Security | User | Happy | All | Account exists | View login history | History displayed | | | Security |
| ESTO-S29-HP-3581 | 29.4 Security | User | Happy | All | Login history | Detect suspicious login | Alert displayed | | | Security |
| ESTO-S29-HP-3582 | 29.4 Security | User | Happy | All | Suspicious login | Approve or reject | Decision recorded | | | Security |
| ESTO-S29-HP-3583 | 29.4 Security | User | Happy | All | Password change | View password change log | Change logged | | | Security |
| ESTO-S29-HP-3584 | 29.4 Security | User | Happy | All | Multiple sessions | View active sessions | Sessions listed | | | Security |
| ESTO-S29-HP-3585 | 29.4 Security | User | Happy | All | Active sessions | Revoke session | Session revoked | | | Security |
| ESTO-S29-HP-3586 | 29.4 Security | User | Happy | All | Security settings | View security score | Score displayed | | | Security |
| ESTO-S29-HP-3587 | 29.4 Security | User | Happy | All | Security score low | Security recommendations | Recommendations displayed | | | Security |
| ESTO-S29-HP-3588 | 29.4 Security | User | Happy | All | IP whitelist | Add IP to whitelist | IP added | | | Security |
| ESTO-S29-HP-3589 | 29.4 Security | User | Happy | All | IP whitelisted | Access from whitelisted IP | Access granted | | | Security |
| ESTO-S29-HP-3590 | 29.4 Security | User | Happy | All | IP whitelisted | Access from non-whitelisted IP | Access denied | | | Security |
| ESTO-S29-HP-3591 | 29.4 Security | Admin | Happy | All | Security events | View security dashboard | Dashboard displayed | | | Security |
| ESTO-S29-HP-3592 | 29.4 Security | Admin | Happy | All | Security events | View failed login attempts | Attempts listed | | | Security |
| ESTO-S29-HP-3593 | 29.4 Security | Admin | Happy | All | Failed logins | Block suspicious IP | IP blocked | | | Security |
| ESTO-S29-HP-3594 | 29.4 Security | Admin | Happy | All | Security events | View audit log | Log displayed | | | Security |
| ESTO-S29-HP-3595 | 29.4 Security | Admin | Happy | All | Audit log | Search audit log | Search results displayed | | | Security |
| ESTO-S29-HP-3596 | 29.4 Security | Admin | Happy | All | Audit log | Export audit log | Log exported | | | Security |
| ESTO-S29-HP-3597 | 29.4 Security | Admin | Happy | All | Security incidents | View incident reports | Reports displayed | | | Security |
| ESTO-S29-HP-3598 | 29.4 Security | Admin | Happy | All | Incident reported | Update incident status | Status updated | | | Security |
| ESTO-S29-HP-3599 | 29.4 Security | Admin | Happy | All | Security rules | Update security rules | Rules updated | | | Security |
| ESTO-S29-HP-3600 | 29.4 Security | Admin | Happy | All | Security rules updated | Rules applied | Rules enforced | | | Security |
| ESTO-S29-HP-3601 | 29.4 Security | Admin | Happy | All | CSRF protection | Verify CSRF token | Token validated | | | Security |
| ESTO-S29-HP-3602 | 29.4 Security | Admin | Happy | All | XSS protection | Verify input sanitization | Input sanitized | | | Security |
| ESTO-S29-HP-3603 | 29.4 Security | Admin | Happy | All | SQL injection | Verify parameterized queries | Queries parameterized | | | Security |
| ESTO-S29-HP-3604 | 29.4 Security | Admin | Happy | All | Rate limiting | Verify rate limits enforced | Limits enforced | | | Security |
| ESTO-S29-HP-3605 | 29.4 Security | Admin | Happy | All | CORS config | Verify CORS headers | Headers correct | | | Security |
| ESTO-S29-EM-3606 | 29.4 Security | User | Empty | All | -- | View security settings | Default security settings shown | | | Security |
| ESTO-S29-ER-3607 | 29.4 Security | User | Error | All | Auth service down | Enable 2FA | Error; retry | | | Security |
| ESTO-S29-ER-3608 | 29.4 Security | User | Error | All | TOTP app lost | Recover 2FA | Recovery via backup code | | | Security |
| ESTO-S29-ER-3609 | 29.4 Security | User | Error | All | -- | SQL injection in search | Injection blocked | | | Security |
| ESTO-S29-ER-3610 | 29.4 Security | User | Error | All | -- | XSS in message | Input sanitized | | | Security |
| ESTO-S29-ED-3611 | 29.4 Security | User | Edge | All | Concurrent logins from multiple IPs | All sessions tracked | All sessions listed | | | Security |
| ESTO-S29-ED-3612 | 29.4 Security | User | Edge | All | Brute force attempt | Account locked after N attempts | Account locked | | | Security |
| ESTO-S29-CR-3613 | 29.4 Security | Admin | Cross-Role | All | Security events | Admin views user security status | Status visible | | | Security |
| ESTO-S29-CR-3614 | 29.4 Security | User | Cross-Role | All | Admin changes security rules | User affected by new rules | Rules applied transparently | | | Security |
| ESTO-S29-CR-3615 | 29.4 Security | Admin | Cross-Role | All | -- | Admin triggers security audit | Audit completed | | | Security |

### 29.5 Accessibility & A11y (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S29-HP-3616 | 29.5 A11y | User | Happy | All | Screen reader | Navigate with screen reader | All content announced | | | A11y |
| ESTO-S29-HP-3617 | 29.5 A11y | User | Happy | All | Keyboard only | Navigate entire app | All features accessible | | | A11y |
| ESTO-S29-HP-3618 | 29.5 A11y | User | Happy | All | High contrast | View in high contrast mode | Content legible | | | A11y |
| ESTO-S29-HP-3619 | 29.5 A11y | User | Happy | All | Large font | View with large font | Layout adapts | | | A11y |
| ESTO-S29-HP-3620 | 29.5 A11y | User | Happy | All | Reduced motion | View with reduced motion | Animations reduced | | | A11y |
| ESTO-S29-HP-3621 | 29.5 A11y | User | Happy | All | Color blindness | View with color blindness sim | Content distinguishable | | | A11y |
| ESTO-S29-HP-3622 | 29.5 A11y | User | Happy | All | Form interaction | Fill form with screen reader | All fields announced | | | A11y |
| ESTO-S29-HP-3623 | 29.5 A11y | User | Happy | All | Modal open | Close modal with keyboard | Modal closes | | | A11y |
| ESTO-S29-HP-3624 | 29.5 A11y | User | Happy | All | Dropdown | Navigate dropdown with keyboard | All options reachable | | | A11y |
| ESTO-S29-HP-3625 | 29.5 A11y | User | Happy | All | Date picker | Navigate date picker with keyboard | Date selectable | | | A11y |
| ESTO-S29-HP-3626 | 29.5 A11y | User | Happy | All | Carousel | Navigate carousel with keyboard | All slides reachable | | | A11y |
| ESTO-S29-HP-3627 | 29.5 A11y | User | Happy | All | Table | Navigate table with screen reader | All cells announced | | | A11y |
| ESTO-S29-HP-3628 | 29.5 A11y | User | Happy | All | Error message | Error announced by screen reader | Error announced | | | A11y |
| ESTO-S29-HP-3629 | 29.5 A11y | User | Happy | All | Success message | Success announced by screen reader | Success announced | | | A11y |
| ESTO-S29-HP-3630 | 29.5 A11y | User | Happy | All | Live region | Live update announced | Update announced | | | A11y |
| ESTO-S29-HP-3631 | 29.5 A11y | User | Happy | All | Skip link | Skip to main content | Navigation jumps to content | | | A11y |
| ESTO-S29-HP-3632 | 29.5 A11y | User | Happy | All | Breadcrumb | Breadcrumb announced | Breadcrumb announced | | | A11y |
| ESTO-S29-HP-3633 | 29.5 A11y | User | Happy | All | Tab navigation | Tab order is logical | Logical tab order | | | A11y |
| ESTO-S29-HP-3634 | 29.5 A11y | User | Happy | All | Focus indicator | Focus visible on all elements | Focus visible | | | A11y |
| ESTO-S29-HP-3635 | 29.5 A11y | User | Happy | All | Color contrast | Minimum contrast ratio met | WCAG AA compliant | | | A11y |
| ESTO-S29-HP-3636 | 29.5 A11y | User | Happy | All | Touch target | Minimum 44x44px touch target | All targets meet size | | | A11y |
| ESTO-S29-HP-3637 | 29.5 A11y | User | Happy | All | Image | Decorative image hidden from AT | Hidden from screen reader | | | A11y |
| ESTO-S29-HP-3638 | 29.5 A11y | User | Happy | All | Informative image | Image has alt text | Alt text announced | | | A11y |
| ESTO-S29-HP-3639 | 29.5 A11y | User | Happy | All | Link | Link has descriptive text | Purpose clear from text | | | A11y |
| ESTO-S29-HP-3640 | 29.5 A11y | User | Happy | All | Button | Button has accessible name | Name announced | | | A11y |
| ESTO-S29-HP-3641 | 29.5 A11y | User | Happy | All | Form label | Label associated with input | Label announced with input | | | A11y |
| ESTO-S29-HP-3642 | 29.5 A11y | User | Happy | All | Error state | Error linked to field via aria | Error associated with field | | | A11y |
| ESTO-S29-HP-3643 | 29.5 A11y | User | Happy | All | Required field | Required indicated accessibly | Required announced | | | A11y |
| ESTO-S29-HP-3644 | 29.5 A11y | User | Happy | All | Loading state | Loading announced to screen reader | Loading announced | | | A11y |
| ESTO-S29-HP-3645 | 29.5 A11y | User | Happy | All | Expandable content | Expanded state announced | State announced | | | A11y |
| ESTO-S29-HP-3646 | 29.5 A11y | User | Happy | All | Pagination | Pagination accessible | All buttons labeled | | | A11y |
| ESTO-S29-HP-3647 | 29.5 A11y | User | Happy | All | Sortable column | Sort state announced | Sort direction announced | | | A11y |
| ESTO-S29-HP-3648 | 29.5 A11y | User | Happy | All | Filter | Filter state announced | Applied filters announced | | | A11y |
| ESTO-S29-HP-3649 | 29.5 A11y | User | Happy | All | Notification | Notification announced | Notification announced | | | A11y |
| ESTO-S29-HP-3650 | 29.5 A11y | User | Happy | All | Toast message | Toast announced | Message announced | | | A11y |
| ESTO-S29-HP-3651 | 29.5 A11y | User | Happy | All | Confirmation dialog | Dialog announced | Dialog role and message announced | | | A11y |
| ESTO-S29-HP-3652 | 29.5 A11y | User | Happy | All | Multi-step form | Steps announced | Current step announced | | | A11y |
| ESTO-S29-HP-3653 | 29.5 A11y | User | Happy | All | Progress bar | Progress announced | Progress announced | | | A11y |
| ESTO-S29-HP-3654 | 29.5 A11y | User | Happy | All | Tooltip | Tooltip accessible | Tooltip announced on focus | | | A11y |
| ESTO-S29-HP-3655 | 29.5 A11y | User | Happy | All | Tooltip | Dismiss tooltip with Escape | Tooltip dismissed | | | A11y |
| ESTO-S29-EM-3656 | 29.5 A11y | User | Empty | All | -- | View page with no content | Empty state announced | | | A11y |
| ESTO-S29-ER-3657 | 29.5 A11y | User | Error | All | -- | Content not focusable | Error: Focus trap | | | A11y |
| ESTO-S29-ER-3658 | 29.5 A11y | User | Error | All | -- | Missing alt text on image | Alt text required | | | A11y |
| ESTO-S29-ER-3659 | 29.5 A11y | User | Error | All | -- | Insufficient color contrast | Contrast warning shown | | | A11y |
| ESTO-S29-ED-3660 | 29.5 A11y | User | Edge | All | Complex data table | Accessible table with sorting | All features accessible | | | A11y |
| ESTO-S29-CR-3661 | 29.5 A11y | Admin | Cross-Role | All | -- | Admin runs accessibility audit | Audit results displayed | | | A11y |
| ESTO-S29-CR-3662 | 29.5 A11y | Admin | Cross-Role | All | -- | Admin fixes a11y issues | Issues resolved | | | A11y |
| ESTO-S29-CR-3663 | 29.5 A11y | Admin | Cross-Role | All | -- | Admin configures a11y settings | Settings applied to all | | | A11y |
| ESTO-S29-CR-3664 | 29.5 A11y | User | Cross-Role | All | Accessibility mode | User preferences persist across sessions | Preferences saved | | | A11y |
| ESTO-S29-CR-3665 | 29.5 A11y | Admin | Cross-Role | All | -- | Admin monitors a11y compliance | Compliance dashboard shown | | | A11y |

## Section 30: Performance, Load & Resilience (300)

### 30.1 Frontend Performance (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S30-HP-3666 | 30.1 Perf | User | Happy | All | Cold cache | First page load | Page loads < 3s | | | Perf |
| ESTO-S30-HP-3667 | 30.1 Perf | User | Happy | All | Warm cache | Repeat page load | Page loads < 1s | | | Perf |
| ESTO-S30-HP-3668 | 30.1 Perf | User | Happy | All | Heavy page | Scroll property list | Smooth 60fps scroll | | | Perf |
| ESTO-S30-HP-3669 | 30.1 Perf | User | Happy | All | Multiple images | Load image gallery | Gallery loads progressively | | | Perf |
| ESTO-S30-HP-3670 | 30.1 Perf | User | Happy | All | Image gallery | Lazy load images | Lazy loading active | | | Perf |
| ESTO-S30-HP-3671 | 30.1 Perf | User | Happy | All | Page loaded | View first contentful paint | FCP < 1.5s | | | Perf |
| ESTO-S30-HP-3672 | 30.1 Perf | User | Happy | All | Page loaded | View largest contentful paint | LCP < 2.5s | | | Perf |
| ESTO-S30-HP-3673 | 30.1 Perf | User | Happy | All | Page interaction | First input delay | FID < 100ms | | | Perf |
| ESTO-S30-HP-3674 | 30.1 Perf | User | Happy | All | Page interaction | Cumulative layout shift | CLS < 0.1 | | | Perf |
| ESTO-S30-HP-3675 | 30.1 Perf | User | Happy | All | Page loaded | Time to interactive | TTI < 3.5s | | | Perf |
| ESTO-S30-HP-3676 | 30.1 Perf | User | Happy | All | Page loaded | Total blocking time | TBT < 200ms | | | Perf |
| ESTO-S30-HP-3677 | 30.1 Perf | User | Happy | All | Bundle size | Initial bundle size | Bundle < 250KB | | | Perf |
| ESTO-S30-HP-3678 | 30.1 Perf | User | Happy | All | Bundle analysis | Code split by route | Routes lazy loaded | | | Perf |
| ESTO-S30-HP-3679 | 30.1 Perf | User | Happy | All | Page loaded | Web vitals measured | All vitals meet targets | | | Perf |
| ESTO-S30-HP-3680 | 30.1 Perf | User | Happy | All | Form interaction | Form submits fast | Submission < 500ms | | | Perf |
| ESTO-S30-HP-3681 | 30.1 Perf | User | Happy | All | List scroll | Virtualized list | Smooth scrolling | | | Perf |
| ESTO-S30-HP-3682 | 30.1 Perf | User | Happy | All | Search | Debounced search | Search debounced | | | Perf |
| ESTO-S30-HP-3683 | 30.1 Perf | User | Happy | All | Heavy computation | Web worker for compute | UI stays responsive | | | Perf |
| ESTO-S30-HP-3684 | 30.1 Perf | User | Happy | All | Animation | Smooth animation | 60fps animations | | | Perf |
| ESTO-S30-HP-3685 | 30.1 Perf | User | Happy | All | Page loaded | Service worker active | SW handles caching | | | Perf |
| ESTO-S30-HP-3686 | 30.1 Perf | User | Happy | All | Offline access | View cached page offline | Cached page loads | | | Perf |
| ESTO-S30-HP-3687 | 30.1 Perf | User | Happy | All | Network throttled | Load page on 3G | Page still loads | | | Perf |
| ESTO-S30-HP-3688 | 30.1 Perf | User | Happy | All | Memory usage | App uses reasonable memory | Memory < 200MB | | | Perf |
| ESTO-S30-HP-3689 | 30.1 Perf | User | Happy | All | Long session | App stays responsive | No memory leaks | | | Perf |
| ESTO-S30-HP-3690 | 30.1 Perf | User | Happy | All | Multiple tabs | Open 5+ tabs | All tabs responsive | | | Perf |
| ESTO-S30-HP-3691 | 30.1 Perf | User | Happy | All | Tab switch | Switch tabs quickly | No lag | | | Perf |
| ESTO-S30-HP-3692 | 30.1 Perf | User | Happy | All | Back navigation | Browser back | Back navigation fast | | | Perf |
| ESTO-S30-HP-3693 | 30.1 Perf | User | Happy | All | Forward navigation | Browser forward | Forward navigation fast | | | Perf |
| ESTO-S30-HP-3694 | 30.1 Perf | User | Happy | All | Page reload | Reload page | Fast reload | | | Perf |
| ESTO-S30-HP-3695 | 30.1 Perf | User | Happy | All | Prefetch | Hover over link | Prefetch triggered | | | Perf |
| ESTO-S30-HP-3696 | 30.1 Perf | User | Happy | All | Preload | Preload critical resources | Resources preloaded | | | Perf |
| ESTO-S30-HP-3697 | 30.1 Perf | User | Happy | All | Image format | WebP/AVIF images | Modern formats served | | | Perf |
| ESTO-S30-HP-3698 | 30.1 Perf | User | Happy | All | Image dimensions | Width/height set | No layout shift | | | Perf |
| ESTO-S30-HP-3699 | 30.1 Perf | User | Happy | All | Font loading | FOIT avoided | Fonts load with fallback | | | Perf |
| ESTO-S30-HP-3700 | 30.1 Perf | User | Happy | All | CSS | Critical CSS inlined | Critical CSS inline | | | Perf |
| ESTO-S30-HP-3701 | 30.1 Perf | User | Happy | All | JS | JS minified | Minified JS served | | | Perf |
| ESTO-S30-HP-3702 | 30.1 Perf | User | Happy | All | Compression | Gzip/Brotli enabled | Compression applied | | | Perf |
| ESTO-S30-HP-3703 | 30.1 Perf | User | Happy | All | CDN | Static assets on CDN | CDN serving | | | Perf |
| ESTO-S30-HP-3704 | 30.1 Perf | User | Happy | All | Cache headers | Cache-Control set | Cache headers correct | | | Perf |
| ESTO-S30-HP-3705 | 30.1 Perf | User | Happy | All | ETag | ETag used for validation | ETag working | | | Perf |
| ESTO-S30-HP-3706 | 30.1 Perf | User | Happy | All | HTTP/2 | HTTP/2 used | HTTP/2 active | | | Perf |
| ESTO-S30-HP-3707 | 30.1 Perf | User | Happy | All | HTTP/3 | HTTP/3 used if supported | HTTP/3 active | | | Perf |
| ESTO-S30-HP-3708 | 30.1 Perf | User | Happy | All | DNS | DNS prefetch | DNS prefetch active | | | Perf |
| ESTO-S30-HP-3709 | 30.1 Perf | User | Happy | All | Preconnect | Preconnect to APIs | Preconnect active | | | Perf |
| ESTO-S30-HP-3710 | 30.1 Perf | User | Happy | All | Render blocking | No render-blocking resources | No blocking resources | | | Perf |
| ESTO-S30-HP-3711 | 30.1 Perf | User | Happy | All | Long task | Tasks < 50ms | No long tasks | | | Perf |
| ESTO-S30-HP-3712 | 30.1 Perf | User | Happy | All | Request batching | Batched API calls | Batching applied | | | Perf |
| ESTO-S30-HP-3713 | 30.1 Perf | User | Happy | All | GraphQL | Single query for multiple data | Single query fetches all | | | Perf |
| ESTO-S30-HP-3714 | 30.1 Perf | User | Happy | All | Pagination | Cursor-based pagination | Efficient pagination | | | Perf |
| ESTO-S30-HP-3715 | 30.1 Perf | User | Happy | All | Infinite scroll | Virtual infinite scroll | Infinite scroll smooth | | | Perf |
| ESTO-S30-HP-3716 | 30.1 Perf | User | Happy | All | Component memoization | Re-renders minimized | React.memo applied | | | Perf |
| ESTO-S30-HP-3717 | 30.1 Perf | User | Happy | All | Selector optimization | Zustand selectors fine-grained | Re-renders minimized | | | Perf |
| ESTO-S30-HP-3718 | 30.1 Perf | User | Happy | All | Heavy computation | Memoized expensive ops | useMemo applied | | | Perf |
| ESTO-S30-HP-3719 | 30.1 Perf | User | Happy | All | Callback stability | useCallback applied | Stable callbacks | | | Perf |
| ESTO-S30-HP-3720 | 30.1 Perf | User | Happy | All | State batching | Multiple state updates batched | State batches applied | | | Perf |
| ESTO-S30-HP-3721 | 30.1 Perf | User | Happy | All | Transition | useTransition applied | Non-blocking transitions | | | Perf |
| ESTO-S30-HP-3722 | 30.1 Perf | User | Happy | All | Suspense | Suspense for code splitting | Suspense boundaries work | | | Perf |
| ESTO-S30-HP-3723 | 30.1 Perf | User | Happy | All | Lazy component | Lazy load heavy component | Component lazy loaded | | | Perf |
| ESTO-S30-HP-3724 | 30.1 Perf | User | Happy | All | Bundle analyzer | View bundle composition | Bundle analyzed | | | Perf |
| ESTO-S30-HP-3725 | 30.1 Perf | User | Happy | All | Tree shaking | Unused code removed | Tree shaking applied | | | Perf |
| ESTO-S30-HP-3726 | 30.1 Perf | User | Happy | All | Source maps | Source maps for prod debugging | Source maps served | | | Perf |
| ESTO-S30-HP-3727 | 30.1 Perf | User | Happy | All | Lighthouse | Run Lighthouse audit | Score > 90 | | | Perf |
| ESTO-S30-HP-3728 | 30.1 Perf | User | Happy | All | Performance metrics | View performance dashboard | Dashboard displayed | | | Perf |
| ESTO-S30-EM-3729 | 30.1 Perf | User | Empty | All | -- | Load page with no data | Page renders empty state fast | | | Perf |
| ESTO-S30-ER-3730 | 30.1 Perf | User | Error | All | -- | Infinite loop in component | Error boundary catches | | | Perf |
| ESTO-S30-ER-3731 | 30.1 Perf | User | Error | All | Memory leak | Long session | Memory leak detected | | | Perf |
| ESTO-S30-ER-3732 | 30.1 Perf | User | Error | All | API slow | User waits > 30s | Loading state shown | | | Perf |
| ESTO-S30-ER-3733 | 30.1 Perf | User | Error | All | API timeout | API times out | Timeout handled gracefully | | | Perf |
| ESTO-S30-ED-3734 | 30.1 Perf | User | Edge | All | 10K items | Render 10K items | Virtualization active | | | Perf |
| ESTO-S30-ED-3735 | 30.1 Perf | User | Edge | All | 1M data points | Chart with 1M points | Chart renders efficiently | | | Perf |
| ESTO-S30-ED-3736 | 30.1 Perf | User | Edge | All | Slow device | Load on low-end device | Performance acceptable | | | Perf |
| ESTO-S30-ED-3737 | 30.1 Perf | User | Edge | All | Cold start | Cloud Run cold start | < 3s cold start | | | Perf |
| ESTO-S30-CR-3738 | 30.1 Perf | Admin | Cross-Role | All | -- | Admin views perf dashboard | Performance data visible | | | Perf |
| ESTO-S30-CR-3739 | 30.1 Perf | Admin | Cross-Role | All | -- | Admin sets perf budget | Budget enforced | | | Perf |
| ESTO-S30-CR-3740 | 30.1 Perf | Admin | Cross-Role | All | -- | Admin monitors real user metrics | RUM data displayed | | | Perf |

### 30.2 Backend Performance & Load (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S30-HP-3741 | 30.2 Perf | Admin | Happy | All | Backend running | View response time p50 | p50 < 100ms | | | Perf |
| ESTO-S30-HP-3742 | 30.2 Perf | Admin | Happy | All | Backend running | View response time p95 | p95 < 500ms | | | Perf |
| ESTO-S30-HP-3743 | 30.2 Perf | Admin | Happy | All | Backend running | View response time p99 | p99 < 1s | | | Perf |
| ESTO-S30-HP-3744 | 30.2 Perf | Admin | Happy | All | Backend running | View throughput | Throughput displayed | | | Perf |
| ESTO-S30-HP-3745 | 30.2 Perf | Admin | Happy | All | Database queries | View slow query log | Slow queries listed | | | Perf |
| ESTO-S30-HP-3746 | 30.2 Perf | Admin | Happy | All | Slow queries | Optimize query | Query optimized | | | Perf |
| ESTO-S30-HP-3747 | 30.2 Perf | Admin | Happy | All | Indexes | Verify indexes used | Indexes used | | | Perf |
| ESTO-S30-HP-3748 | 30.2 Perf | Admin | Happy | All | N+1 queries | Detect N+1 | N+1 detected | | | Perf |
| ESTO-S30-HP-3749 | 30.2 Perf | Admin | Happy | All | N+1 detected | Add eager loading | N+1 resolved | | | Perf |
| ESTO-S30-HP-3750 | 30.2 Perf | Admin | Happy | All | Database | Run EXPLAIN on query | Query plan shown | | | Perf |
| ESTO-S30-HP-3751 | 30.2 Perf | Admin | Happy | All | Connection pool | View pool stats | Pool stats displayed | | | Perf |
| ESTO-S30-HP-3752 | 30.2 Perf | Admin | Happy | All | Connection pool | Tune pool size | Pool tuned | | | Perf |
| ESTO-S30-HP-3753 | 30.2 Perf | Admin | Happy | All | Cache | View cache hit rate | Hit rate displayed | | | Perf |
| ESTO-S30-HP-3754 | 30.2 Perf | Admin | Happy | All | Cache | View cache misses | Misses listed | | | Perf |
| ESTO-S30-HP-3755 | 30.2 Perf | Admin | Happy | All | Cache | Invalidate cache | Cache invalidated | | | Perf |
| ESTO-S30-HP-3756 | 30.2 Perf | Admin | Happy | All | Cache | Warm cache | Cache warmed | | | Perf |
| ESTO-S30-HP-3757 | 30.2 Perf | Admin | Happy | All | Cache | Cache stampede prevented | Stampede avoided | | | Perf |
| ESTO-S30-HP-3758 | 30.2 Perf | Admin | Happy | All | Load test | Run load test | Results displayed | | | Perf |
| ESTO-S30-HP-3759 | 30.2 Perf | Admin | Happy | All | Load test | View throughput | Throughput reported | | | Perf |
| ESTO-S30-HP-3760 | 30.2 Perf | Admin | Happy | All | Load test | View error rate | Error rate displayed | | | Perf |
| ESTO-S30-HP-3761 | 30.2 Perf | Admin | Happy | All | Load test | View latency | Latency displayed | | | Perf |
| ESTO-S30-HP-3762 | 30.2 Perf | Admin | Happy | All | Load test | Scale backend | Backend scaled | | | Perf |
| ESTO-S30-HP-3763 | 30.2 Perf | Admin | Happy | All | Stress test | Run stress test | Results displayed | | | Perf |
| ESTO-S30-HP-3764 | 30.2 Perf | Admin | Happy | All | Stress test | Find breaking point | Breaking point found | | | Perf |
| ESTO-S30-HP-3765 | 30.2 Perf | Admin | Happy | All | Soak test | Run 24h soak test | Stability verified | | | Perf |
| ESTO-S30-HP-3766 | 30.2 Perf | Admin | Happy | All | Spike test | Sudden load spike | Auto-scaling handles | | | Perf |
| ESTO-S30-HP-3767 | 30.2 Perf | Admin | Happy | All | Auto-scaling | Trigger scale up | Instances scale up | | | Perf |
| ESTO-S30-HP-3768 | 30.2 Perf | Admin | Happy | All | Auto-scaling | Trigger scale down | Instances scale down | | | Perf |
| ESTO-S30-HP-3769 | 30.2 Perf | Admin | Happy | All | Auto-scaling | Configure min/max | Min/max set | | | Perf |
| ESTO-S30-HP-3770 | 30.2 Perf | Admin | Happy | All | Auto-scaling | View scaling events | Events listed | | | Perf |
| ESTO-S30-HP-3771 | 30.2 Perf | Admin | Happy | All | Multi-region | Replicate to region | Replication configured | | | Perf |
| ESTO-S30-HP-3772 | 30.2 Perf | Admin | Happy | All | Multi-region | Failover to region | Failover tested | | | Perf |
| ESTO-S30-HP-3773 | 30.2 Perf | Admin | Happy | All | Read replica | Route reads to replica | Reads on replica | | | Perf |
| ESTO-S30-HP-3774 | 30.2 Perf | Admin | Happy | All | Read replica | Replica lag | Lag monitored | | | Perf |
| ESTO-S30-HP-3775 | 30.2 Perf | Admin | Happy | All | CDN | Configure CDN | CDN configured | | | Perf |
| ESTO-S30-HP-3776 | 30.2 Perf | Admin | Happy | All | CDN | Purge CDN cache | Cache purged | | | Perf |
| ESTO-S30-HP-3777 | 30.2 Perf | Admin | Happy | All | CDN | CDN analytics | Analytics displayed | | | Perf |
| ESTO-S30-HP-3778 | 30.2 Perf | Admin | Happy | All | Queue | Process message queue | Queue processed | | | Perf |
| ESTO-S30-HP-3779 | 30.2 Perf | Admin | Happy | All | Queue | View queue depth | Depth displayed | | | Perf |
| ESTO-S30-HP-3780 | 30.2 Perf | Admin | Happy | All | Queue | View queue latency | Latency displayed | | | Perf |
| ESTO-S30-HP-3781 | 30.2 Perf | Admin | Happy | All | Queue | Dead letter queue | DLQ monitored | | | Perf |
| ESTO-S30-HP-3782 | 30.2 Perf | Admin | Happy | All | Job queue | Job throughput | Throughput displayed | | | Perf |
| ESTO-S30-HP-3783 | 30.2 Perf | Admin | Happy | All | Job queue | Job retry | Retry works | | | Perf |
| ESTO-S30-HP-3784 | 30.2 Perf | Admin | Happy | All | Job queue | Job failure handling | Failures handled | | | Perf |
| ESTO-S30-HP-3785 | 30.2 Perf | Admin | Happy | All | API | API rate limiting | Rate limits enforced | | | Perf |
| ESTO-S30-HP-3786 | 30.2 Perf | Admin | Happy | All | API | Rate limit headers | Headers present | | | Perf |
| ESTO-S30-HP-3787 | 30.2 Perf | Admin | Happy | All | API | Rate limit exceeded | 429 returned | | | Perf |
| ESTO-S30-HP-3788 | 30.2 Perf | Admin | Happy | All | API | Throttle API user | User throttled | | | Perf |
| ESTO-S30-HP-3789 | 30.2 Perf | Admin | Happy | All | API | View API metrics | Metrics displayed | | | Perf |
| ESTO-S30-HP-3790 | 30.2 Perf | Admin | Happy | All | API | API versioning | Versioned endpoints | | | Perf |
| ESTO-S30-HP-3791 | 30.2 Perf | Admin | Happy | All | API | GraphQL query cost | Cost-based limiting | | | Perf |
| ESTO-S30-HP-3792 | 30.2 Perf | Admin | Happy | All | API | GraphQL N+1 avoided | DataLoader pattern | | | Perf |
| ESTO-S30-HP-3793 | 30.2 Perf | Admin | Happy | All | API | GraphQL persisted queries | Persisted queries used | | | Perf |
| ESTO-S30-HP-3794 | 30.2 Perf | Admin | Happy | All | API | GraphQL batching | Batching applied | | | Perf |
| ESTO-S30-HP-3795 | 30.2 Perf | Admin | Happy | All | API | REST batch endpoints | Batch endpoints work | | | Perf |
| ESTO-S30-HP-3796 | 30.2 Perf | Admin | Happy | All | Database | Vacuum database | DB vacuumed | | | Perf |
| ESTO-S30-HP-3797 | 30.2 Perf | Admin | Happy | All | Database | Analyze tables | Tables analyzed | | | Perf |
| ESTO-S30-HP-3798 | 30.2 Perf | Admin | Happy | All | Database | Partition table | Table partitioned | | | Perf |
| ESTO-S30-HP-3799 | 30.2 Perf | Admin | Happy | All | Database | Archive old data | Data archived | | | Perf |
| ESTO-S30-HP-3800 | 30.2 Perf | Admin | Happy | All | Database | Connection pooling | Pool active | | | Perf |
| ESTO-S30-HP-3801 | 30.2 Perf | Admin | Happy | All | Database | Query timeout | Timeout enforced | | | Perf |
| ESTO-S30-HP-3802 | 30.2 Perf | Admin | Happy | All | Memory | GC tuning | GC tuned | | | Perf |
| ESTO-S30-HP-3803 | 30.2 Perf | Admin | Happy | All | Memory | Heap size | Heap sized correctly | | | Perf |
| ESTO-S30-HP-3804 | 30.2 Perf | Admin | Happy | All | Memory | Memory leak detection | Leak detected | | | Perf |
| ESTO-S30-HP-3805 | 30.2 Perf | Admin | Happy | All | CPU | CPU profiling | Profile generated | | | Perf |
| ESTO-S30-HP-3806 | 30.2 Perf | Admin | Happy | All | Profiling | Profile in prod (sampled) | Production profile | | | Perf |
| ESTO-S30-HP-3807 | 30.2 Perf | Admin | Happy | All | Tracing | Distributed tracing | Trace visible | | | Perf |
| ESTO-S30-HP-3808 | 30.2 Perf | Admin | Happy | All | Tracing | Trace ID propagation | ID propagated | | | Perf |
| ESTO-S30-HP-3809 | 30.2 Perf | Admin | Happy | All | Metrics | View service metrics | Metrics visible | | | Perf |
| ESTO-S30-HP-3810 | 30.2 Perf | Admin | Happy | All | Metrics | Custom metrics | Custom metric emitted | | | Perf |
| ESTO-S30-HP-3811 | 30.2 Perf | Admin | Happy | All | Logging | Structured logging | Logs structured | | | Perf |
| ESTO-S30-HP-3812 | 30.2 Perf | Admin | Happy | All | Logging | Log sampling | Sampling applied | | | Perf |
| ESTO-S30-HP-3813 | 30.2 Perf | Admin | Happy | All | Logging | Log correlation | Correlation ID in logs | | | Perf |
| ESTO-S30-HP-3814 | 30.2 Perf | Admin | Happy | All | Logging | Log retention | Retention configured | | | Perf |
| ESTO-S30-HP-3815 | 30.2 Perf | Admin | Happy | All | Alerts | Set latency alert | Alert configured | | | Perf |
| ESTO-S30-HP-3816 | 30.2 Perf | Admin | Happy | All | Alerts | Set error rate alert | Alert configured | | | Perf |
| ESTO-S30-HP-3817 | 30.2 Perf | Admin | Happy | All | Alerts | Receive alert | Alert received | | | Perf |
| ESTO-S30-HP-3818 | 30.2 Perf | Admin | Happy | All | Alerts | Resolve alert | Alert resolved | | | Perf |
| ESTO-S30-HP-3819 | 30.2 Perf | Admin | Happy | All | Monitoring | Health checks | Health checks passing | | | Perf |
| ESTO-S30-HP-3820 | 30.2 Perf | Admin | Happy | All | Monitoring | Uptime monitoring | Uptime monitored | | | Perf |
| ESTO-S30-EM-3821 | 30.2 Perf | Admin | Empty | All | -- | View metrics with no data | Empty metrics shown | | | Perf |
| ESTO-S30-ER-3822 | 30.2 Perf | Admin | Error | All | Database overloaded | App load test | Graceful degradation | | | Perf |
| ESTO-S30-ER-3823 | 30.2 Perf | Admin | Error | All | Memory exhausted | OOM | Service crashes; restarts | | | Perf |
| ESTO-S30-ER-3824 | 30.2 Perf | Admin | Error | All | Disk full | DB writes | Error: Disk full | | | Perf |
| ESTO-S30-ER-3825 | 30.2 Perf | Admin | Error | All | Network partition | Service partition | Circuit breaker activates | | | Perf |
| ESTO-S30-ED-3826 | 30.2 Perf | Admin | Edge | All | 10x normal traffic | Spike test | Auto-scales; handles spike | | | Perf |
| ESTO-S30-ED-3827 | 30.2 Perf | Admin | Edge | All | Sustained high load | Soak test | Stable over 24h | | | Perf |
| ESTO-S30-ED-3828 | 30.2 Perf | Admin | Edge | All | Large DB query | Run 1M row query | Query completes in reasonable time | | | Perf |
| ESTO-S30-CR-3829 | 30.2 Perf | Admin | Cross-Role | All | -- | Admin monitors across all services | Unified dashboard | | | Perf |
| ESTO-S30-CR-3830 | 30.2 Perf | Admin | Cross-Role | All | -- | Admin correlates frontend/backend perf | Correlation visible | | | Perf |

### 30.3 Resilience & Disaster Recovery (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S30-HP-3831 | 30.3 Resilience | Admin | Happy | All | Service running | Health check | Returns 200 | | | Resilience |
| ESTO-S30-HP-3832 | 30.3 Resilience | Admin | Happy | All | Health check failing | Service auto-restarts | Service restarted | | | Resilience |
| ESTO-S30-HP-3833 | 30.3 Resilience | Admin | Happy | All | Database down | App shows error | Graceful error | | | Resilience |
| ESTO-S30-HP-3834 | 30.3 Resilience | Admin | Happy | All | Database recovers | App recovers | Auto-reconnect | | | Resilience |
| ESTO-S30-HP-3835 | 30.3 Resilience | Admin | Happy | All | External API down | App falls back | Fallback active | | | Resilience |
| ESTO-S30-HP-3836 | 30.3 Resilience | Admin | Happy | All | External API slow | App shows degraded mode | Degraded mode | | | Resilience |
| ESTO-S30-HP-3837 | 30.3 Resilience | Admin | Happy | All | Circuit breaker | Trip circuit breaker | Breaker tripped | | | Resilience |
| ESTO-S30-HP-3838 | 30.3 Resilience | Admin | Happy | All | Circuit breaker tripped | Service recovers | Breaker half-open | | | Resilience |
| ESTO-S30-HP-3839 | 30.3 Resilience | Admin | Happy | All | Circuit breaker | Reset circuit breaker | Breaker reset | | | Resilience |
| ESTO-S30-HP-3840 | 30.3 Resilience | Admin | Happy | All | Retry policy | Retry on transient failure | Retries succeed | | | Resilience |
| ESTO-S30-HP-3841 | 30.3 Resilience | Admin | Happy | All | Retry policy | Exponential backoff | Backoff applied | | | Resilience |
| ESTO-S30-HP-3842 | 30.3 Resilience | Admin | Happy | All | Retry policy | Max retry limit | Stops after max | | | Resilience |
| ESTO-S30-HP-3843 | 30.3 Resilience | Admin | Happy | All | Timeout | Service timeout enforced | Timeout applied | | | Resilience |
| ESTO-S30-HP-3844 | 30.3 Resilience | Admin | Happy | All | Bulkhead | Resource isolation | Isolated resources | | | Resilience |
| ESTO-S30-HP-3845 | 30.3 Resilience | Admin | Happy | All | Bulkhead | Pool isolation | Pool isolated | | | Resilience |
| ESTO-S30-HP-3846 | 30.3 Resilience | Admin | Happy | All | Rate limit | Rate limit per user | Limit enforced | | | Resilience |
| ESTO-S30-HP-3847 | 30.3 Resilience | Admin | Happy | All | Rate limit | Rate limit per IP | Limit enforced | | | Resilience |
| ESTO-S30-HP-3848 | 30.3 Resilience | Admin | Happy | All | Rate limit | Rate limit per API key | Limit enforced | | | Resilience |
| ESTO-S30-HP-3849 | 30.3 Resilience | Admin | Happy | All | Graceful shutdown | Service shuts down gracefully | Active requests completed | | | Resilience |
| ESTO-S30-HP-3850 | 30.3 Resilience | Admin | Happy | All | Graceful shutdown | In-flight requests handled | No data loss | | | Resilience |
| ESTO-S30-HP-3851 | 30.3 Resilience | Admin | Happy | All | Graceful startup | Service starts gracefully | Health check waits | | | Resilience |
| ESTO-S30-HP-3852 | 30.3 Resilience | Admin | Happy | All | Readiness probe | Probe ready when ready | Probe passes | | | Resilience |
| ESTO-S30-HP-3853 | 30.3 Resilience | Admin | Happy | All | Liveness probe | Probe alive when alive | Probe passes | | | Resilience |
| ESTO-S30-HP-3854 | 30.3 Resilience | Admin | Happy | All | Startup probe | Probe for slow startup | Probe configured | | | Resilience |
| ESTO-S30-HP-3855 | 30.3 Resilience | Admin | Happy | All | Backup | Run automated backup | Backup created | | | Resilience |
| ESTO-S30-HP-3856 | 30.3 Resilience | Admin | Happy | All | Backup | Verify backup integrity | Backup verified | | | Resilience |
| ESTO-S30-HP-3857 | 30.3 Resilience | Admin | Happy | All | Backup | Restore from backup | Restore successful | | | Resilience |
| ESTO-S30-HP-3858 | 30.3 Resilience | Admin | Happy | All | Backup | PITR restore | PITR works | | | Resilience |
| ESTO-S30-HP-3859 | 30.3 Resilience | Admin | Happy | All | Backup | Cross-region backup | Backup replicated | | | Resilience |
| ESTO-S30-HP-3860 | 30.3 Resilience | Admin | Happy | All | Backup | Backup retention | Old backups purged | | | Resilience |
| ESTO-S30-HP-3861 | 30.3 Resilience | Admin | Happy | All | DR | DR plan documented | Plan exists | | | Resilience |
| ESTO-S30-HP-3862 | 30.3 Resilience | Admin | Happy | All | DR | DR drill | Drill successful | | | Resilience |
| ESTO-S30-HP-3863 | 30.3 Resilience | Admin | Happy | All | DR | RTO measured | RTO met | | | Resilience |
| ESTO-S30-HP-3864 | 30.3 Resilience | Admin | Happy | All | DR | RPO measured | RPO met | | | Resilience |
| ESTO-S30-HP-3865 | 30.3 Resilience | Admin | Happy | All | DR | Failover to DR site | Failover works | | | Resilience |
| ESTO-S30-HP-3866 | 30.3 Resilience | Admin | Happy | All | DR | Failback to primary | Failback works | | | Resilience |
| ESTO-S30-HP-3867 | 30.3 Resilience | Admin | Happy | All | Chaos | Run chaos experiment | Experiment logged | | | Resilience |
| ESTO-S30-HP-3868 | 30.3 Resilience | Admin | Happy | All | Chaos | Kill random instance | Service survives | | | Resilience |
| ESTO-S30-HP-3869 | 30.3 Resilience | Admin | Happy | All | Chaos | Inject latency | Service degrades gracefully | | | Resilience |
| ESTO-S30-HP-3870 | 30.3 Resilience | Admin | Happy | All | Chaos | Inject error | Error handled | | | Resilience |
| ESTO-S30-HP-3871 | 30.3 Resilience | Admin | Happy | All | Chaos | Network partition | Partition tolerated | | | Resilience |
| ESTO-S30-HP-3872 | 30.3 Resilience | Admin | Happy | All | Chaos | CPU stress | Service throttles | | | Resilience |
| ESTO-S30-HP-3873 | 30.3 Resilience | Admin | Happy | All | Chaos | Memory stress | Service degrades | | | Resilience |
| ESTO-S30-HP-3874 | 30.3 Resilience | Admin | Happy | All | Chaos | Disk fill | Service alerts | | | Resilience |
| ESTO-S30-HP-3875 | 30.3 Resilience | Admin | Happy | All | Canary | Deploy canary | Canary deployed | | | Resilience |
| ESTO-S30-HP-3876 | 30.3 Resilience | Admin | Happy | All | Canary | Canary metrics compared | Metrics compared | | | Resilience |
| ESTO-S30-HP-3877 | 30.3 Resilience | Admin | Happy | All | Canary | Promote canary | Canary promoted | | | Resilience |
| ESTO-S30-HP-3878 | 30.3 Resilience | Admin | Happy | All | Canary | Rollback canary | Canary rolled back | | | Resilience |
| ESTO-S30-HP-3879 | 30.3 Resilience | Admin | Happy | All | Blue-green | Deploy blue-green | BG deployed | | | Resilience |
| ESTO-S30-HP-3880 | 30.3 Resilience | Admin | Happy | All | Blue-green | Switch traffic | Traffic switched | | | Resilience |
| ESTO-S30-HP-3881 | 30.3 Resilience | Admin | Happy | All | Blue-green | Rollback switch | Switch rolled back | | | Resilience |
| ESTO-S30-HP-3882 | 30.3 Resilience | Admin | Happy | All | Feature flag | Toggle feature flag | Feature toggled | | | Resilience |
| ESTO-S30-HP-3883 | 30.3 Resilience | Admin | Happy | All | Feature flag | Gradual rollout | Gradual rollout works | | | Resilience |
| ESTO-S30-HP-3884 | 30.3 Resilience | Admin | Happy | All | Feature flag | Kill switch | Kill switch works | | | Resilience |
| ESTO-S30-HP-3885 | 30.3 Resilience | Admin | Happy | All | Feature flag | Per-user flag | Per-user works | | | Resilience |
| ESTO-S30-HP-3886 | 30.3 Resilience | Admin | Happy | All | Feature flag | Per-segment flag | Per-segment works | | | Resilience |
| ESTO-S30-HP-3887 | 30.3 Resilience | Admin | Happy | All | Rollback | DB rollback | Migration rolled back | | | Resilience |
| ESTO-S30-HP-3888 | 30.3 Resilience | Admin | Happy | All | Rollback | App rollback | App rolled back | | | Resilience |
| ESTO-S30-HP-3889 | 30.3 Resilience | Admin | Happy | All | Rollback | Config rollback | Config rolled back | | | Resilience |
| ESTO-S30-HP-3890 | 30.3 Resilience | Admin | Happy | All | Rollback | Verify rollback | Rollback verified | | | Resilience |
| ESTO-S30-HP-3891 | 30.3 Resilience | Admin | Happy | All | Migration | Run migration | Migration successful | | | Resilience |
| ESTO-S30-HP-3892 | 30.3 Resilience | Admin | Happy | All | Migration | Zero-downtime migration | Migration zero-downtime | | | Resilience |
| ESTO-S30-HP-3893 | 30.3 Resilience | Admin | Happy | All | Migration | Backward-compatible | Compat maintained | | | Resilience |
| ESTO-S30-HP-3894 | 30.3 Resilience | Admin | Happy | All | Migration | Forward-compatible | Forward compat verified | | | Resilience |
| ESTO-S30-HP-3895 | 30.3 Resilience | Admin | Happy | All | Maintenance | Maintenance window | Window respected | | | Resilience |
| ESTO-S30-HP-3896 | 30.3 Resilience | Admin | Happy | All | Maintenance | Read-only mode | Read-only enforced | | | Resilience |
| ESTO-S30-HP-3897 | 30.3 Resilience | Admin | Happy | All | Maintenance | Maintenance page | Page shown | | | Resilience |
| ESTO-S30-HP-3898 | 30.3 Resilience | Admin | Happy | All | Maintenance | Scheduled maintenance | Schedule communicated | | | Resilience |
| ESTO-S30-HP-3899 | 30.3 Resilience | Admin | Happy | All | Incident | Declare incident | Incident declared | | | Resilience |
| ESTO-S30-HP-3900 | 30.3 Resilience | Admin | Happy | All | Incident | Incident timeline | Timeline tracked | | | Resilience |
| ESTO-S30-HP-3901 | 30.3 Resilience | Admin | Happy | All | Incident | Incident response | Response activated | | | Resilience |
| ESTO-S30-HP-3902 | 30.3 Resilience | Admin | Happy | All | Incident | Postmortem | Postmortem written | | | Resilience |
| ESTO-S30-HP-3903 | 30.3 Resilience | Admin | Happy | All | Incident | Action items | Items tracked | | | Resilience |
| ESTO-S30-HP-3904 | 30.3 Resilience | Admin | Happy | All | Incident | Update stakeholders | Stakeholders updated | | | Resilience |
| ESTO-S30-HP-3905 | 30.3 Resilience | Admin | Happy | All | Incident | Status page updated | Status page accurate | | | Resilience |
| ESTO-S30-HP-3906 | 30.3 Resilience | Admin | Happy | All | Status page | Public status page | Page accessible | | | Resilience |
| ESTO-S30-HP-3907 | 30.3 Resilience | Admin | Happy | All | Status page | Subscribe to updates | Subscription works | | | Resilience |
| ESTO-S30-HP-3908 | 30.3 Resilience | Admin | Happy | All | Status page | Incident history | History visible | | | Resilience |
| ESTO-S30-HP-3909 | 30.3 Resilience | Admin | Happy | All | Security | Security incident | Incident handled | | | Resilience |
| ESTO-S30-HP-3910 | 30.3 Resilience | Admin | Happy | All | Security | Data breach | Breach contained | | | Resilience |
| ESTO-S30-HP-3911 | 30.3 Resilience | Admin | Happy | All | Security | User notification | Users notified | | | Resilience |
| ESTO-S30-HP-3912 | 30.3 Resilience | Admin | Happy | All | Security | Regulator notification | Regulators notified | | | Resilience |
| ESTO-S30-HP-3913 | 30.3 Resilience | Admin | Happy | All | Compliance | Audit trail | Trail complete | | | Resilience |
| ESTO-S30-HP-3914 | 30.3 Resilience | Admin | Happy | All | Compliance | Compliance report | Report generated | | | Resilience |
| ESTO-S30-HP-3915 | 30.3 Resilience | Admin | Happy | All | Compliance | SOC 2 controls | Controls in place | | | Resilience |
| ESTO-S30-HP-3916 | 30.3 Resilience | Admin | Happy | All | Compliance | ISO 27001 controls | Controls in place | | | Resilience |
| ESTO-S30-HP-3917 | 30.3 Resilience | Admin | Happy | All | Compliance | GDPR compliance | Compliant | | | Resilience |
| ESTO-S30-HP-3918 | 30.3 Resilience | Admin | Happy | All | Compliance | HIPAA compliance | Compliant | | | Resilience |
| ESTO-S30-EM-3919 | 30.3 Resilience | Admin | Empty | All | -- | View incident history (none) | Empty state shown | | | Resilience |
| ESTO-S30-ER-3920 | 30.3 Resilience | Admin | Error | All | Total outage | Service down | Status page reflects | | | Resilience |
| ESTO-S30-ER-3921 | 30.3 Resilience | Admin | Error | All | Cascading failure | Multiple services down | Failure contained | | | Resilience |
| ESTO-S30-ER-3922 | 30.3 Resilience | Admin | Error | All | Data corruption | Detect corruption | Corruption detected | | | Resilience |
| ESTO-S30-ER-3923 | 30.3 Resilience | Admin | Error | All | Data corruption | Recover from corruption | Recovery successful | | | Resilience |
| ESTO-S30-ER-3924 | 30.3 Resilience | Admin | Error | All | Backup corrupt | Restore fails | Fallback to earlier backup | | | Resilience |
| ESTO-S30-ED-3925 | 30.3 Resilience | Admin | Edge | All | Region down | Multi-region failover | Other region takes over | | | Resilience |
| ESTO-S30-ED-3926 | 30.3 Resilience | Admin | Edge | All | DDoS attack | Mitigation active | Attack mitigated | | | Resilience |
| ESTO-S30-ED-3927 | 30.3 Resilience | Admin | Edge | All | Coordinated attack | Multi-vector attack | Defense in depth | | | Resilience |
| ESTO-S30-CR-3928 | 30.3 Resilience | Admin | Cross-Role | All | Incident | Users notified of incident | Users notified | | | Resilience |
| ESTO-S30-CR-3929 | 30.3 Resilience | User | Cross-Role | All | Incident | User sees status page | Status page accessible | | | Resilience |
| ESTO-S30-CR-3930 | 30.3 Resilience | Admin | Cross-Role | All | Postmortem | Cross-team review | Review completed | | | Resilience |

## Section 31: Advanced Features & Edge Cases

### 31.1 Real-time Features (250)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-3931 | 31.1 Realtime | User | Happy | All | WS connected | Receive real-time notification | Notification appears instantly | | | Realtime |
| ESTO-S31-HP-3932 | 31.1 Realtime | User | Happy | All | WS connected | Live chat message received | Message appears in real-time | | | Realtime |
| ESTO-S31-HP-3933 | 31.1 Realtime | User | Happy | All | Live chat | Send message | Message delivered in real-time | | | Realtime |
| ESTO-S31-HP-3934 | 31.1 Realtime | User | Happy | All | Live chat | Typing indicator shown | Typing indicator displayed | | | Realtime |
| ESTO-S31-HP-3935 | 31.1 Realtime | User | Happy | All | Live chat | Online status updated | Status updated | | | Realtime |
| ESTO-S31-HP-3936 | 31.1 Realtime | User | Happy | All | Live chat | Read receipts | Receipts shown | | | Realtime |
| ESTO-S31-HP-3937 | 31.1 Realtime | User | Happy | All | Live chat | Message reactions | Reactions shown | | | Realtime |
| ESTO-S31-HP-3938 | 31.1 Realtime | User | Happy | All | Live chat | Reply to message | Reply threaded | | | Realtime |
| ESTO-S31-HP-3939 | 31.1 Realtime | User | Happy | All | Live chat | Forward message | Message forwarded | | | Realtime |
| ESTO-S31-HP-3940 | 31.1 Realtime | User | Happy | All | Live chat | Delete message | Message deleted for all | | | Realtime |
| ESTO-S31-HP-3941 | 31.1 Realtime | User | Happy | All | WS connected | Live property status update | Status updates in real-time | | | Realtime |
| ESTO-S31-HP-3942 | 31.1 Realtime | User | Happy | All | Property listed | Live view count | Count updates | | | Realtime |
| ESTO-S31-HP-3943 | 31.1 Realtime | User | Happy | All | Property inquiry | Real-time inquiry notification | Notification appears | | | Realtime |
| ESTO-S31-HP-3944 | 31.1 Realtime | User | Happy | All | Appointment scheduled | Real-time appointment reminder | Reminder appears | | | Realtime |
| ESTO-S31-HP-3945 | 31.1 Realtime | User | Happy | All | Fast Track | Real-time FT status update | Status updates | | | Realtime |
| ESTO-S31-HP-3946 | 31.1 Realtime | User | Happy | All | Payment made | Real-time payment confirmation | Confirmation appears | | | Realtime |
| ESTO-S31-HP-3947 | 31.1 Realtime | User | Happy | All | Booking | Real-time booking confirmation | Confirmation appears | | | Realtime |
| ESTO-S31-HP-3948 | 31.1 Realtime | User | Happy | All | Review submitted | Real-time review notification | Manager notified | | | Realtime |
| ESTO-S31-HP-3949 | 31.1 Realtime | User | Happy | All | Broker request | Real-time request notification | Request appears | | | Realtime |
| ESTO-S31-HP-3950 | 31.1 Realtime | User | Happy | All | Connection active | Live connection indicator | Indicator shows connected | | | Realtime |
| ESTO-S31-HP-3951 | 31.1 Realtime | User | Happy | All | WS reconnecting | Reconnect with backoff | Reconnects after backoff | | | Realtime |
| ESTO-S31-HP-3952 | 31.1 Realtime | User | Happy | All | WS reconnected | Missed messages synced | Missed messages received | | | Realtime |
| ESTO-S31-HP-3953 | 31.1 Realtime | User | Happy | All | WS degraded | Fallback to polling | Polling activated | | | Realtime |
| ESTO-S31-HP-3954 | 31.1 Realtime | User | Happy | All | WS restored | Return to WebSocket | WS reconnected | | | Realtime |
| ESTO-S31-HP-3955 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time property inquiries | Inquiries displayed | | | Realtime |
| ESTO-S31-HP-3956 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time booking alerts | Alerts displayed | | | Realtime |
| ESTO-S31-HP-3957 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time review notifications | Notifications displayed | | | Realtime |
| ESTO-S31-HP-3958 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time agent requests | Requests displayed | | | Realtime |
| ESTO-S31-HP-3959 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time dashboard metrics | Metrics update | | | Realtime |
| ESTO-S31-HP-3960 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time message from user | Message received | | | Realtime |
| ESTO-S31-HP-3961 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time contract update | Update appears | | | Realtime |
| ESTO-S31-HP-3962 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time payment notification | Payment notification appears | | | Realtime |
| ESTO-S31-HP-3963 | 31.1 Realtime | Manager | Happy | All | WS connected | Live support chat | Chat active in real-time | | | Realtime |
| ESTO-S31-HP-3964 | 31.1 Realtime | Manager | Happy | All | WS connected | Real-time availability update | Availability updates | | | Realtime |
| ESTO-S31-HP-3965 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time platform metrics | Metrics update | | | Realtime |
| ESTO-S31-HP-3966 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time security alerts | Alerts appear | | | Realtime |
| ESTO-S31-HP-3967 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time error notifications | Errors appear | | | Realtime |
| ESTO-S31-HP-3968 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time user activity | Activity feed updates | | | Realtime |
| ESTO-S31-HP-3969 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time system health | Health indicators update | | | Realtime |
| ESTO-S31-HP-3970 | 31.1 Realtime | Admin | Happy | All | WS connected | Real-time incident notifications | Incidents appear | | | Realtime |
| ESTO-S31-HP-3971 | 31.1 Realtime | User | Happy | All | WS connected | Real-time search result update | Results update | | | Realtime |
| ESTO-S31-HP-3972 | 31.1 Realtime | User | Happy | All | WS connected | Real-time property availability | Availability updates | | | Realtime |
| ESTO-S31-HP-3973 | 31.1 Realtime | User | Happy | All | WS connected | Real-time price change | Price update appears | | | Realtime |
| ESTO-S31-HP-3974 | 31.1 Realtime | User | Happy | All | WS connected | Real-time new property alert | New property notification | | | Realtime |
| ESTO-S31-HP-3975 | 31.1 Realtime | User | Happy | All | WS connected | Real-time community post | Post appears | | | Realtime |
| ESTO-S31-HP-3976 | 31.1 Realtime | User | Happy | All | WS connected | Real-time comment notification | Notification appears | | | Realtime |
| ESTO-S31-HP-3977 | 31.1 Realtime | User | Happy | All | WS connected | Real-time like notification | Like notification appears | | | Realtime |
| ESTO-S31-HP-3978 | 31.1 Realtime | User | Happy | All | WS connected | Real-time follow notification | Follow notification appears | | | Realtime |
| ESTO-S31-HP-3979 | 31.1 Realtime | User | Happy | All | WS connected | Real-time event reminder | Reminder appears | | | Realtime |
| ESTO-S31-HP-3980 | 31.1 Realtime | User | Happy | All | WS connected | Real-time batch notification | All notifications appear | | | Realtime |
| ESTO-S31-HP-3981 | 31.1 Realtime | User | Happy | All | WS connected | Push notification enabled | Push received | | | Realtime |
| ESTO-S31-HP-3982 | 31.1 Realtime | User | Happy | All | Push enabled | Background notification | Notification received in bg | | | Realtime |
| ESTO-S31-HP-3983 | 31.1 Realtime | User | Happy | All | Push notification | Notification click | Opens relevant page | | | Realtime |
| ESTO-S31-HP-3984 | 31.1 Realtime | User | Happy | All | Push disabled | No push notifications | No notifications received | | | Realtime |
| ESTO-S31-HP-3985 | 31.1 Realtime | User | Happy | All | Push configured | Re-enable push | Push re-enabled | | | Realtime |
| ESTO-S31-HP-3986 | 31.1 Realtime | User | Happy | All | Push notification | Notification badge count | Badge updated | | | Realtime |
| ESTO-S31-HP-3987 | 31.1 Realtime | User | Happy | All | Push notification | Notification sounds | Sound played | | | Realtime |
| ESTO-S31-HP-3988 | 31.1 Realtime | User | Happy | All | Push notification | Notification vibration | Device vibrated | | | Realtime |
| ESTO-S31-HP-3989 | 31.1 Realtime | User | Happy | All | Push notification | Notification actions | Action buttons work | | | Realtime |
| ESTO-S31-HP-3990 | 31.1 Realtime | User | Happy | All | Push notification | Dismiss notification | Notification dismissed | | | Realtime |
| ESTO-S31-HP-3991 | 31.1 Realtime | User | Happy | All | Push notification | Snooze notification | Notification snoozed | | | Realtime |
| ESTO-S31-HP-3992 | 31.1 Realtime | User | Happy | All | Push notification | Rich notification | Rich notification shown | | | Realtime |
| ESTO-S31-HP-3993 | 31.1 Realtime | User | Happy | All | Push notification | Notification grouping | Notifications grouped | | | Realtime |
| ESTO-S31-HP-3994 | 31.1 Realtime | User | Happy | All | Push notification | Notification priority | Priority respected | | | Realtime |
| ESTO-S31-HP-3995 | 31.1 Realtime | User | Happy | All | Push notification | Notification channel | Channel managed | | | Realtime |
| ESTO-S31-HP-3996 | 31.1 Realtime | User | Happy | All | Push notification | Notification opt-in | Consent requested | | | Realtime |
| ESTO-S31-HP-3997 | 31.1 Realtime | User | Happy | All | Push notification | Notification opt-out | Opt-out works | | | Realtime |
| ESTO-S31-HP-3998 | 31.1 Realtime | User | Happy | All | Push notification | Custom notification sounds | Custom sound played | | | Realtime |
| ESTO-S31-HP-3999 | 31.1 Realtime | User | Happy | All | Push notification | Notification deep link | Deep link works | | | Realtime |
| ESTO-S31-HP-4000 | 31.1 Realtime | User | Happy | All | Push notification | Notification with action | Action processed | | | Realtime |
| ESTO-S31-HP-4001 | 31.1 Realtime | User | Happy | All | Push notification | Notification dismissal tracked | Dismissal logged | | | Realtime |
| ESTO-S31-HP-4002 | 31.1 Realtime | User | Happy | All | Push notification | Notification interaction tracked | Interaction logged | | | Realtime |
| ESTO-S31-HP-4003 | 31.1 Realtime | User | Happy | All | Push notification | Scheduled notification | Scheduled notification sent | | | Realtime |
| ESTO-S31-HP-4004 | 31.1 Realtime | User | Happy | All | Push notification | Recurring notification | Recurring notification works | | | Realtime |
| ESTO-S31-HP-4005 | 31.1 Realtime | User | Happy | All | Push notification | Location-based notification | Location notification sent | | | Realtime |
| ESTO-S31-HP-4006 | 31.1 Realtime | User | Happy | All | Push notification | Time-based notification | Time notification sent | | | Realtime |
| ESTO-S31-HP-4007 | 31.1 Realtime | User | Happy | All | Push notification | Notification delivery report | Delivery reported | | | Realtime |
| ESTO-S31-HP-4008 | 31.1 Realtime | User | Happy | All | Push notification | Notification A/B test | A/B test works | | | Realtime |
| ESTO-S31-HP-4009 | 31.1 Realtime | User | Happy | All | Push notification | Notification personalization | Personalized notification | | | Realtime |
| ESTO-S31-HP-4010 | 31.1 Realtime | User | Happy | All | Push notification | Notification throttling | Throttling applied | | | Realtime |
| ESTO-S31-HP-4011 | 31.1 Realtime | User | Happy | All | Push notification | Notification batching | Batching applied | | | Realtime |
| ESTO-S31-HP-4012 | 31.1 Realtime | User | Happy | All | Push notification | Notification priority escalation | Escalation works | | | Realtime |
| ESTO-S31-HP-4013 | 31.1 Realtime | User | Happy | All | Push notification | Quiet hours | Quiet hours respected | | | Realtime |
| ESTO-S31-HP-4014 | 31.1 Realtime | User | Happy | All | Push notification | Notification per channel | Channel-specific settings | | | Realtime |
| ESTO-S31-HP-4015 | 31.1 Realtime | User | Happy | All | Push notification | Notification history | History displayed | | | Realtime |
| ESTO-S31-HP-4016 | 31.1 Realtime | User | Happy | All | Push notification | Notification settings sync | Settings synced across devices | | | Realtime |
| ESTO-S31-HP-4017 | 31.1 Realtime | User | Happy | All | Push notification | In-app notification center | Center displays notifications | | | Realtime |
| ESTO-S31-HP-4018 | 31.1 Realtime | User | Happy | All | Push notification | Notification mark all as read | All marked as read | | | Realtime |
| ESTO-S31-HP-4019 | 31.1 Realtime | User | Happy | All | Push notification | Notification swipe action | Swipe action works | | | Realtime |
| ESTO-S31-HP-4020 | 31.1 Realtime | User | Happy | All | Push notification | Notification badge clear | Badge cleared | | | Realtime |
| ESTO-S31-HP-4021 | 31.1 Realtime | User | Happy | All | Push notification | Notification from different senders | Multiple sender types | | | Realtime |
| ESTO-S31-HP-4022 | 31.1 Realtime | User | Happy | All | Push notification | Notification with image | Image notification shown | | | Realtime |
| ESTO-S31-HP-4023 | 31.1 Realtime | User | Happy | All | Push notification | Notification with action buttons | Buttons displayed | | | Realtime |
| ESTO-S31-HP-4024 | 31.1 Realtime | User | Happy | All | Push notification | Notification with progress | Progress shown | | | Realtime |
| ESTO-S31-HP-4025 | 31.1 Realtime | User | Happy | All | Push notification | Notification with expandable | Expandable notification works | | | Realtime |
| ESTO-S31-HP-4026 | 31.1 Realtime | User | Happy | All | Push notification | Notification with categories | Categories applied | | | Realtime |
| ESTO-S31-HP-4027 | 31.1 Realtime | User | Happy | All | Push notification | Notification with custom sounds | Custom sound played | | | Realtime |
| ESTO-S31-HP-4028 | 31.1 Realtime | User | Happy | All | Push notification | Notification with silent mode | Silent notification delivered | | | Realtime |
| ESTO-S31-HP-4029 | 31.1 Realtime | User | Happy | All | Push notification | Notification with priority | Priority applied | | | Realtime |
| ESTO-S31-HP-4030 | 31.1 Realtime | User | Happy | All | Push notification | Notification with TTL | TTL respected | | | Realtime |
| ESTO-S31-HP-4031 | 31.1 Realtime | User | Happy | All | Push notification | Notification with collapse key | Collapse works | | | Realtime |
| ESTO-S31-HP-4032 | 31.1 Realtime | User | Happy | All | Push notification | Notification with mutable content | Content mutable | | | Realtime |
| ESTO-S31-HP-4033 | 31.1 Realtime | User | Happy | All | Push notification | Notification with badge | Badge updated | | | Realtime |
| ESTO-S31-HP-4034 | 31.1 Realtime | User | Happy | All | Push notification | Notification with sound | Sound played | | | Realtime |
| ESTO-S31-HP-4035 | 31.1 Realtime | User | Happy | All | Push notification | Notification with alert | Alert body displayed | | | Realtime |
| ESTO-S31-HP-4036 | 31.1 Realtime | User | Happy | All | Push notification | Notification with thread-id | Threaded notification | | | Realtime |
| ESTO-S31-HP-4037 | 31.1 Realtime | User | Happy | All | Push notification | Notification with category | Category notification | | | Realtime |
| ESTO-S31-HP-4038 | 31.1 Realtime | User | Happy | All | Push notification | Notification with interruption level | Level respected | | | Realtime |
| ESTO-S31-HP-4039 | 31.1 Realtime | User | Happy | All | Push notification | Notification with relevance score | Score applied | | | Realtime |
| ESTO-S31-HP-4040 | 31.1 Realtime | User | Happy | All | Push notification | Notification summary | Summary displayed | | | Realtime |
| ESTO-S31-EM-4041 | 31.1 Realtime | User | Empty | All | -- | View live chat (no messages) | Empty chat state | | | Realtime |
| ESTO-S31-ER-4042 | 31.1 Realtime | User | Error | All | WS connection drops | Real-time message lost | Message queued; delivered on reconnect | | | Realtime |
| ESTO-S31-ER-4043 | 31.1 Realtime | User | Error | All | WS server down | WS reconnecting | Reconnecting with backoff | | | Realtime |
| ESTO-S31-ER-4044 | 31.1 Realtime | User | Error | All | WS timeout | Connection timeout | Timeout handled; retry | | | Realtime |
| ESTO-S31-ER-4045 | 31.1 Realtime | User | Error | All | -- | WS message with injection | Injection sanitized | | | Security |
| ESTO-S31-ED-4046 | 31.1 Realtime | User | Edge | All | 10K concurrent WS | All connections handled | Server handles load | | | Realtime |
| ESTO-S31-ED-4047 | 31.1 Realtime | User | Edge | All | High message volume | 1000 msgs/second | All messages delivered | | | Realtime |
| ESTO-S31-ED-4048 | 31.1 Realtime | User | Edge | All | Network switching | WiFi to mobile | Connection maintained | | | Realtime |
| ESTO-S31-ED-4049 | 31.1 Realtime | User | Edge | All | Network degraded | Slow connection | Degraded gracefully | | | Realtime |
| ESTO-S31-CR-4050 | 31.1 Realtime | Admin | Cross-Role | All | -- | Admin monitors WS connections | Connection metrics visible | | | Realtime |
| ESTO-S31-CR-4051 | 31.1 Realtime | Admin | Cross-Role | All | -- | Admin broadcasts message | All users receive message | | | Realtime |
| ESTO-S31-CR-4052 | 31.1 Realtime | User | Cross-Role | All | Multi-device | WS syncs across devices | Messages sync | | | Realtime |
| ESTO-S31-CR-4053 | 31.1 Realtime | Admin | Cross-Role | All | -- | Admin throttles WS | Connections throttled | | | Realtime |
| ESTO-S31-CR-4054 | 31.1 Realtime | User | Cross-Role | All | WS auth | User WS connection authorized | Connection authorized | | | Security |
| ESTO-S31-CR-4055 | 31.1 Realtime | Admin | Cross-Role | All | WS config | Admin changes WS config | Config applied | | | Realtime |
| ESTO-S31-CR-4056 | 31.1 Realtime | Manager | Cross-Role | All | Manager broadcast | Manager message to all watchers | Message received by all | | | Realtime |
| ESTO-S31-CR-4057 | 31.1 Realtime | User | Cross-Role | All | User chat | User chat visible to admin | Admin can view | | | Security |
| ESTO-S31-CR-4058 | 31.1 Realtime | Admin | Cross-Role | All | User chat | Admin reads chat history | History displayed | | | Security |
| ESTO-S31-CR-4059 | 31.1 Realtime | User | Cross-Role | All | Chat e2e | User chat encrypted | Messages encrypted | | | Security |
| ESTO-S31-CR-4060 | 31.1 Realtime | Admin | Cross-Role | All | -- | Admin disconnects abusive user | User disconnected | | | Security |

### 31.2 File Upload & Document Management (150)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-4061 | 31.2 Upload | User | Happy | All | Profile page | Upload profile photo | Photo uploaded | | | Upload |
| ESTO-S31-HP-4062 | 31.2 Upload | User | Happy | All | Photo uploaded | Crop profile photo | Photo cropped | | | Upload |
| ESTO-S31-HP-4063 | 31.2 Upload | User | Happy | All | Photo cropped | Save cropped photo | Photo saved | | | Upload |
| ESTO-S31-HP-4064 | 31.2 Upload | User | Happy | All | Photo uploaded | Remove profile photo | Photo removed | | | Upload |
| ESTO-S31-HP-4065 | 31.2 Upload | User | Happy | All | Profile incomplete | Upload ID document | Document uploaded | | | Upload |
| ESTO-S31-HP-4066 | 31.2 Upload | User | Happy | All | Document uploaded | View uploaded documents | Documents listed | | | Upload |
| ESTO-S31-HP-4067 | 31.2 Upload | User | Happy | All | Document exists | Delete document | Document deleted | | | Upload |
| ESTO-S31-HP-4068 | 31.2 Upload | User | Happy | All | File browser | Select file | File selected | | | Upload |
| ESTO-S31-HP-4069 | 31.2 Upload | User | Happy | All | File selected | Drag and drop file | File uploaded via drag | | | Upload |
| ESTO-S31-HP-4070 | 31.2 Upload | User | Happy | All | Upload in progress | Cancel upload | Upload cancelled | | | Upload |
| ESTO-S31-HP-4071 | 31.2 Upload | User | Happy | All | Upload in progress | Pause upload | Upload paused | | | Upload |
| ESTO-S31-HP-4072 | 31.2 Upload | User | Happy | All | Upload paused | Resume upload | Upload resumed | | | Upload |
| ESTO-S31-HP-4073 | 31.2 Upload | User | Happy | All | Upload complete | View uploaded file | File preview displayed | | | Upload |
| ESTO-S31-HP-4074 | 31.2 Upload | User | Happy | All | Upload complete | Rename uploaded file | File renamed | | | Upload |
| ESTO-S31-HP-4075 | 31.2 Upload | User | Happy | All | File uploaded | Share file | Share link generated | | | Upload |
| ESTO-S31-HP-4076 | 31.2 Upload | User | Happy | All | Share link generated | Set share expiry | Expiry set | | | Upload |
| ESTO-S31-HP-4077 | 31.2 Upload | User | Happy | All | Share link | Revoke share | Share revoked | | | Upload |
| ESTO-S31-HP-4078 | 31.2 Upload | User | Happy | All | Multiple files | Upload multiple files | All files uploaded | | | Upload |
| ESTO-S31-HP-4079 | 31.2 Upload | User | Happy | All | Multiple uploads | Upload progress for each | All progress bars shown | | | Upload |
| ESTO-S31-HP-4080 | 31.2 Upload | User | Happy | All | Large file | Upload file > 50MB | Upload succeeds with chunks | | | Upload |
| ESTO-S31-HP-4081 | 31.2 Upload | User | Happy | All | Upload error | Retry failed upload | Upload retried | | | Upload |
| ESTO-S31-HP-4082 | 31.2 Upload | User | Happy | All | Multiple uploads | Retry all failed | All retried | | | Upload |
| ESTO-S31-HP-4083 | 31.2 Upload | Manager | Happy | All | Property listed | Upload property photos | Photos uploaded | | | Upload |
| ESTO-S31-HP-4084 | 31.2 Upload | Manager | Happy | All | Photos uploaded | Reorder photos | Order updated | | | Upload |
| ESTO-S31-HP-4085 | 31.2 Upload | Manager | Happy | All | Photos uploaded | Set cover photo | Cover set | | | Upload |
| ESTO-S31-HP-4086 | 31.2 Upload | Manager | Happy | All | Photos uploaded | Upload 360 view | 360 view uploaded | | | Upload |
| ESTO-S31-HP-4087 | 31.2 Upload | Manager | Happy | All | Photos uploaded | Upload floor plan | Floor plan uploaded | | | Upload |
| ESTO-S31-HP-4088 | 31.2 Upload | Manager | Happy | All | Documents needed | Upload property documents | Documents uploaded | | | Upload |
| ESTO-S31-HP-4089 | 31.2 Upload | Manager | Happy | All | Documents uploaded | View document status | Status displayed | | | Upload |
| ESTO-S31-HP-4090 | 31.2 Upload | Manager | Happy | All | Video needed | Upload property video | Video uploaded | | | Upload |
| ESTO-S31-HP-4091 | 31.2 Upload | Manager | Happy | All | Video uploaded | Video preview | Preview plays | | | Upload |
| ESTO-S31-HP-4092 | 31.2 Upload | Manager | Happy | All | Multiple properties | Bulk upload photos | All photos uploaded | | | Upload |
| ESTO-S31-HP-4093 | 31.2 Upload | Manager | Happy | All | Bulk upload | Track bulk upload progress | Progress displayed | | | Upload |
| ESTO-S31-HP-4094 | 31.2 Upload | Manager | Happy | All | Files uploaded | Delete property photo | Photo deleted | | | Upload |
| ESTO-S31-HP-4095 | 31.2 Upload | Manager | Happy | All | Photo deleted | Undo delete | Photo restored | | | Upload |
| ESTO-S31-HP-4096 | 31.2 Upload | Manager | Happy | All | Property images | Image optimization | Images optimized | | | Upload |
| ESTO-S31-HP-4097 | 31.2 Upload | Manager | Happy | All | Property images | Auto-generate thumbnails | Thumbnails generated | | | Upload |
| ESTO-S31-HP-4098 | 31.2 Upload | Manager | Happy | All | Property images | Auto-generate previews | Previews generated | | | Upload |
| ESTO-S31-HP-4099 | 31.2 Upload | Admin | Happy | All | Files on platform | View all uploads | All uploads listed | | | Upload |
| ESTO-S31-HP-4100 | 31.2 Upload | Admin | Happy | All | Uploads exist | Moderate content | Content moderated | | | Upload |
| ESTO-S31-HP-4101 | 31.2 Upload | Admin | Happy | All | Inappropriate file | Remove file | File removed | | | Security |
| ESTO-S31-HP-4102 | 31.2 Upload | Admin | Happy | All | Uploads exist | View upload analytics | Analytics displayed | | | Upload |
| ESTO-S31-HP-4103 | 31.2 Upload | Admin | Happy | All | Upload analytics | View storage usage | Usage displayed | | | Upload |
| ESTO-S31-HP-4104 | 31.2 Upload | Admin | Happy | All | Storage full | Clean up old files | Old files removed | | | Upload |
| ESTO-S31-HP-4105 | 31.2 Upload | Admin | Happy | All | CDN | Configure CDN for uploads | CDN configured | | | Upload |
| ESTO-S31-HP-4106 | 31.2 Upload | Admin | Happy | All | Upload policy | Set upload limits | Limits enforced | | | Upload |
| ESTO-S31-HP-4107 | 31.2 Upload | Admin | Happy | All | Upload limits | Verify enforcement | Limits enforced | | | Upload |
| ESTO-S31-HP-4108 | 31.2 Upload | Admin | Happy | All | Upload settings | Configure allowed types | Types restricted | | | Upload |
| ESTO-S31-HP-4109 | 31.2 Upload | Admin | Happy | All | Virus scanning | Scan uploaded file | File scanned | | | Security |
| ESTO-S31-HP-4110 | 31.2 Upload | Admin | Happy | All | Malicious file | Block and quarantine | File blocked | | | Security |
| ESTO-S31-HP-4111 | 31.2 Upload | User | Happy | All | Upload allowed types | Upload allowed type | Upload succeeds | | | Upload |
| ESTO-S31-HP-4112 | 31.2 Upload | User | Happy | All | Upload disallowed types | Upload disallowed type | Error: Type not allowed | | | Upload |
| ESTO-S31-HP-4113 | 31.2 Upload | User | Happy | All | File size limit | Upload within limit | Upload succeeds | | | Upload |
| ESTO-S31-HP-4114 | 31.2 Upload | User | Happy | All | File size limit | Upload exceeding limit | Error: File too large | | | Upload |
| ESTO-S31-HP-4115 | 31.2 Upload | User | Happy | All | Upload quota | View remaining quota | Quota displayed | | | Upload |
| ESTO-S31-HP-4116 | 31.2 Upload | User | Happy | All | Upload quota | Exceed quota | Error: Quota exceeded | | | Upload |
| ESTO-S31-HP-4117 | 31.2 Upload | User | Happy | All | Upload complete | Share uploaded file | Share link generated | | | Upload |
| ESTO-S31-HP-4118 | 31.2 Upload | User | Happy | All | Shared file | Download shared file | File downloaded | | | Upload |
| ESTO-S31-HP-4119 | 31.2 Upload | User | Happy | All | Shared file | View shared file | File previewed | | | Upload |
| ESTO-S31-HP-4120 | 31.2 Upload | User | Happy | All | Document needs signature | Upload for e-sign | Document ready for signing | | | Upload |
| ESTO-S31-EM-4121 | 31.2 Upload | User | Empty | All | -- | View uploads (none) | Empty upload state | | | Upload |
| ESTO-S31-ER-4122 | 31.2 Upload | User | Error | All | Storage service down | Upload file | Error: Upload failed; retry | | | Upload |
| ESTO-S31-ER-4123 | 31.2 Upload | User | Error | All | Network lost | Upload file | Upload paused; resumes on reconnect | | | Upload |
| ESTO-S31-ER-4124 | 31.2 Upload | User | Error | All | -- | Upload file with path traversal | Path traversal blocked | | | Security |
| ESTO-S31-ER-4125 | 31.2 Upload | User | Error | All | -- | Upload with embedded script | Script stripped; safe upload | | | Security |
| ESTO-S31-ER-4126 | 31.2 Upload | User | Error | All | -- | Upload with virus | File rejected | | | Security |
| ESTO-S31-ED-4127 | 31.2 Upload | User | Edge | All | Very slow connection | Upload large file | Resumable upload; chunked | | | Upload |
| ESTO-S31-ED-4128 | 31.2 Upload | User | Edge | All | Concurrent uploads | Upload 10 files | All upload concurrently | | | Upload |
| ESTO-S31-CR-4129 | 31.2 Upload | Admin | Cross-Role | All | -- | Admin views user uploads | Uploads visible to admin | | | Security |
| ESTO-S31-CR-4130 | 31.2 Upload | Admin | Cross-Role | All | -- | Admin enforces upload policy | Policy applied globally | | | Upload |
| ESTO-S31-CR-4131 | 31.2 Upload | User | Cross-Role | All | -- | User uploads; Manager sees in dashboard | Manager sees uploaded docs | | | Upload |

### 31.3 Internationalization & Localization (100)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-4132 | 31.3 I18N | User | Happy | All | App open | View default language | Language based on region | | | I18N |
| ESTO-S31-HP-4133 | 31.3 I18N | User | Happy | All | Language setting | Change language | UI translates | | | I18N |
| ESTO-S31-HP-4134 | 31.3 I18N | User | Happy | All | Language changed | Persist language | Language saved | | | I18N |
| ESTO-S31-HP-4135 | 31.3 I18N | User | Happy | All | Language changed | Reload page | Language persists | | | I18N |
| ESTO-S31-HP-4136 | 31.3 I18N | User | Happy | All | Hindi set | View UI in Hindi | UI in Hindi | | | I18N |
| ESTO-S31-HP-4137 | 31.3 I18N | User | Happy | All | English set | View UI in English | UI in English | | | I18N |
| ESTO-S31-HP-4138 | 31.3 I18N | User | Happy | All | Currency INR | View prices in INR | Prices in INR | | | I18N |
| ESTO-S31-HP-4139 | 31.3 I18N | User | Happy | All | Currency GBP | View prices in GBP | Prices in GBP | | | I18N |
| ESTO-S31-HP-4140 | 31.3 I18N | User | Happy | All | Currency changed | Currency persists | Currency saved | | | I18N |
| ESTO-S31-HP-4141 | 31.3 I18N | User | Happy | All | Date format | View dates in local format | Dates in local format | | | I18N |
| ESTO-S31-HP-4142 | 31.3 I18N | User | Happy | All | Time zone | View times in local TZ | Times in local TZ | | | I18N |
| ESTO-S31-HP-4143 | 31.3 I18N | User | Happy | All | Number format | View numbers in local format | Numbers formatted locally | | | I18N |
| ESTO-S31-HP-4144 | 31.3 I18N | User | Happy | All | Phone format | View phone in local format | Phone formatted locally | | | I18N |
| ESTO-S31-HP-4145 | 31.3 I18N | User | Happy | All | Address format | View address in local format | Address formatted locally | | | I18N |
| ESTO-S31-HP-4146 | 31.3 I18N | User | Happy | All | Measurement units | View units in local system | Metric/Imperial based on region | | | I18N |
| ESTO-S31-HP-4147 | 31.3 I18N | User | Happy | All | Currency symbol | Currency symbol correct | INR/GBP shown | | | I18N |
| ESTO-S31-HP-4148 | 31.3 I18N | User | Happy | All | Translation | All text translated | No untranslated strings | | | I18N |
| ESTO-S31-HP-4149 | 31.3 I18N | User | Happy | All | Translation | Plural forms correct | Plurals correct | | | I18N |
| ESTO-S31-HP-4150 | 31.3 I18N | User | Happy | All | Translation | Gender-neutral text | Neutral text used | | | I18N |
| ESTO-S31-HP-4151 | 31.3 I18N | User | Happy | All | RTL language | Arabic/Hebrew layout | RTL layout correct | | | I18N |
| ESTO-S31-HP-4152 | 31.3 I18N | User | Happy | All | Long text | German/Japanese text | No truncation | | | I18N |
| ESTO-S31-HP-4153 | 31.3 I18N | User | Happy | All | Form validation | Error messages translated | Errors in user language | | | I18N |
| ESTO-S31-HP-4154 | 31.3 I18N | User | Happy | All | Date picker | Date picker in local format | Local format used | | | I18N |
| ESTO-S31-HP-4155 | 31.3 I18N | User | Happy | All | Calendar | Calendar in local format | Local calendar shown | | | I18N |
| ESTO-S31-HP-4156 | 31.3 I18N | User | Happy | All | Phone input | Country code for region | Correct country code | | | I18N |
| ESTO-S31-HP-4157 | 31.3 I18N | User | Happy | All | Address form | Address fields by country | Correct fields shown | | | I18N |
| ESTO-S31-HP-4158 | 31.3 I18N | User | Happy | All | VAT/Tax | Tax calculated per region | Correct tax | | | I18N |
| ESTO-S31-HP-4159 | 31.3 I18N | User | Happy | All | Payment | Payment methods per region | Local methods shown | | | I18N |
| ESTO-S31-HP-4160 | 31.3 I18N | User | Happy | All | Legal | Terms per region | Regional terms shown | | | I18N |
| ESTO-S31-HP-4161 | 31.3 I18N | User | Happy | All | Legal | Privacy policy per region | Regional policy shown | | | I18N |
| ESTO-S31-HP-4162 | 31.3 I18N | User | Happy | All | Notification | Email in user language | Email in correct language | | | I18N |
| ESTO-S31-HP-4163 | 31.3 I18N | User | Happy | All | SMS | SMS in user language | SMS in correct language | | | I18N |
| ESTO-S31-HP-4164 | 31.3 I18N | User | Happy | All | Push | Push in user language | Push in correct language | | | I18N |
| ESTO-S31-HP-4165 | 31.3 I18N | User | Happy | All | Region India | View India-specific content | India content shown | | | I18N |
| ESTO-S31-HP-4166 | 31.3 I18N | User | Happy | All | Region UK | View UK-specific content | UK content shown | | | I18N |
| ESTO-S31-HP-4167 | 31.3 I18N | User | Happy | All | Region UAE | View UAE-specific content | UAE content shown | | | I18N |
| ESTO-S31-HP-4168 | 31.3 I18N | User | Happy | All | Region Singapore | View Singapore content | Singapore content shown | | | I18N |
| ESTO-S31-HP-4169 | 31.3 I18N | User | Happy | All | Browser language | Auto-detect language | Language auto-detected | | | I18N |
| ESTO-S31-HP-4170 | 31.3 I18N | User | Happy | All | Language mismatch | Prompt to switch | Prompt displayed | | | I18N |
| ESTO-S31-HP-4171 | 31.3 I18N | User | Happy | All | Fallback | Fallback for missing translation | Fallback language shown | | | I18N |
| ESTO-S31-HP-4172 | 31.3 I18N | User | Happy | All | ICU | Complex plural rules | Plurals correct | | | I18N |
| ESTO-S31-HP-4173 | 31.3 I18N | User | Happy | All | ICU | Date/time formatting | Format correct | | | I18N |
| ESTO-S31-HP-4174 | 31.3 I18N | User | Happy | All | ICU | Number formatting | Numbers correct | | | I18N |
| ESTO-S31-HP-4175 | 31.3 I18N | User | Happy | All | ICU | Currency formatting | Currency correct | | | I18N |
| ESTO-S31-HP-4176 | 31.3 I18N | User | Happy | All | ICU | Relative time | Relative time correct | | | I18N |
| ESTO-S31-HP-4177 | 31.3 I18N | User | Happy | All | Admin | Add new translation | Translation added | | | I18N |
| ESTO-S31-HP-4178 | 31.3 I18N | Admin | Happy | All | Translations | Update translation | Translation updated | | | I18N |
| ESTO-S31-HP-4179 | 31.3 I18N | Admin | Happy | All | Translation keys | View missing translations | Missing keys listed | | | I18N |
| ESTO-S31-HP-4180 | 31.3 I18N | Admin | Happy | All | Translation | Export translations | Translations exported | | | I18N |
| ESTO-S31-HP-4181 | 31.3 I18N | Admin | Happy | All | Translation | Import translations | Translations imported | | | I18N |
| ESTO-S31-HP-4182 | 31.3 I18N | Admin | Happy | All | Translation | View translation usage | Usage stats displayed | | | I18N |
| ESTO-S31-EM-4183 | 31.3 I18N | User | Empty | All | -- | View app in new language | Translations load | | | I18N |
| ESTO-S31-ER-4184 | 31.3 I18N | User | Error | All | Missing translation | View untranslated string | Fallback shown | | | I18N |
| ESTO-S31-ER-4185 | 31.3 I18N | User | Error | All | Broken translation | View broken layout | Layout adapts | | | I18N |
| ESTO-S31-ER-4186 | 31.3 I18N | User | Error | All | Encoding issue | View special characters | Characters display correctly | | | I18N |
| ESTO-S31-ED-4187 | 31.3 I18N | User | Edge | All | Long string | View with long translations | Layout adapts | | | I18N |
| ESTO-S31-ED-4188 | 31.3 I18N | User | Edge | All | RTL language | Full RTL experience | RTL works completely | | | I18N |
| ESTO-S31-CR-4189 | 31.3 I18N | Admin | Cross-Role | All | -- | Admin sets new default language | All users see new default | | | I18N |
| ESTO-S31-CR-4190 | 31.3 I18N | User | Cross-Role | All | Region change | Language changes with region | Language updates | | | I18N |
| ESTO-S31-CR-4191 | 31.3 I18N | Admin | Cross-Role | All | -- | Admin adds new language | New language available | | | I18N |

### 31.4 Notifications & Alerts (170)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-4192 | 31.4 Notif | User | Happy | All | Notification enabled | Receive booking notification | Notification received | | | |
| ESTO-S31-HP-4193 | 31.4 Notif | User | Happy | All | Notification received | Click notification | Navigates to relevant page | | | |
| ESTO-S31-HP-4194 | 31.4 Notif | User | Happy | All | Notification received | Dismiss notification | Notification dismissed | | | |
| ESTO-S31-HP-4195 | 31.4 Notif | User | Happy | All | Notification dismissed | View in notification center | Notification listed | | | |
| ESTO-S31-HP-4196 | 31.4 Notif | User | Happy | All | Notification center | Mark all as read | All marked as read | | | |
| ESTO-S31-HP-4197 | 31.4 Notif | User | Happy | All | Notification settings | Configure preferences | Preferences saved | | | |
| ESTO-S31-HP-4198 | 31.4 Notif | User | Happy | All | Preferences configured | Receive only selected notifications | Only selected types arrive | | | |
| ESTO-S31-HP-4199 | 31.4 Notif | User | Happy | All | Notification types | Mute specific type | Type muted | | | |
| ESTO-S31-HP-4200 | 31.4 Notif | User | Happy | All | Notification muted | Unmute type | Type unmuted | | | |
| ESTO-S31-HP-4201 | 31.4 Notif | User | Happy | All | Notifications | Group notifications | Similar notifications grouped | | | |
| ESTO-S31-HP-4202 | 31.4 Notif | User | Happy | All | Notifications | Sort by time | Sorted correctly | | | |
| ESTO-S31-HP-4203 | 31.4 Notif | User | Happy | All | Notifications | Filter by type | Filtered list displayed | | | |
| ESTO-S31-HP-4204 | 31.4 Notif | User | Happy | All | Notifications | Search notifications | Search results displayed | | | |
| ESTO-S31-HP-4205 | 31.4 Notif | User | Happy | All | Notifications | Delete single notification | Notification deleted | | | |
| ESTO-S31-HP-4206 | 31.4 Notif | User | Happy | All | Notifications | Delete all notifications | All deleted | | | |
| ESTO-S31-HP-4207 | 31.4 Notif | User | Happy | All | Notifications | Bulk delete | Multiple deleted | | | |
| ESTO-S31-HP-4208 | 31.4 Notif | User | Happy | All | Notifications | Notification badge | Badge count correct | | | |
| ESTO-S31-HP-4209 | 31.4 Notif | User | Happy | All | Notification badge | Clear badge | Badge cleared | | | |
| ESTO-S31-HP-4210 | 31.4 Notif | User | Happy | All | Notification | Email notification received | Email received | | | |
| ESTO-S31-HP-4211 | 31.4 Notif | User | Happy | All | Email notification | Email unsubscribed | Unsubscribed | | | |
| ESTO-S31-HP-4212 | 31.4 Notif | User | Happy | All | Unsubscribed | Resubscribe | Resubscribed | | | |
| ESTO-S31-HP-4213 | 31.4 Notif | User | Happy | All | SMS enabled | SMS notification received | SMS received | | | |
| ESTO-S31-HP-4214 | 31.4 Notif | User | Happy | All | SMS received | SMS opt-out | Opt-out works | | | |
| ESTO-S31-HP-4215 | 31.4 Notif | User | Happy | All | In-app notification | Notification banner | Banner displayed | | | |
| ESTO-S31-HP-4216 | 31.4 Notif | User | Happy | All | Notification banner | Close banner | Banner closed | | | |
| ESTO-S31-HP-4217 | 31.4 Notif | User | Happy | All | Toast notification | Toast appears | Toast visible | | | |
| ESTO-S31-HP-4218 | 31.4 Notif | User | Happy | All | Toast notification | Toast auto-dismisses | Auto-dismissed | | | |
| ESTO-S31-HP-4219 | 31.4 Notif | User | Happy | All | Toast with action | Toast action button | Button works | | | |
| ESTO-S31-HP-4220 | 31.4 Notif | User | Happy | All | Alert configuration | Set up alert | Alert configured | | | |
| ESTO-S31-HP-4221 | 31.4 Notif | User | Happy | All | Alert triggered | Receive alert | Alert received | | | |
| ESTO-S31-HP-4222 | 31.4 Notif | User | Happy | All | Alert | Acknowledge alert | Alert acknowledged | | | |
| ESTO-S31-HP-4223 | 31.4 Notif | User | Happy | All | Alert history | View alert history | History displayed | | | |
| ESTO-S31-HP-4224 | 31.4 Notif | User | Happy | All | Notification templates | View templates | Templates listed | | | |
| ESTO-S31-HP-4225 | 31.4 Notif | Manager | Happy | All | Notifications | View team notifications | Team notifications displayed | | | |
| ESTO-S31-HP-4226 | 31.4 Notif | Manager | Happy | All | Team notification | Broadcast to team | All team notified | | | |
| ESTO-S31-HP-4227 | 31.4 Notif | Manager | Happy | All | Broadcast sent | View broadcast status | Status displayed | | | |
| ESTO-S31-HP-4228 | 31.4 Notif | Manager | Happy | All | Notification template | Create custom template | Template created | | | |
| ESTO-S31-HP-4229 | 31.4 Notif | Manager | Happy | All | Custom template | Use template for notification | Notification sent | | | |
| ESTO-S31-HP-4230 | 31.4 Notif | Manager | Happy | All | Notifications | Set notification schedule | Schedule configured | | | |
| ESTO-S31-HP-4231 | 31.4 Notif | Manager | Happy | All | Notification schedule | Scheduled notification sent | Notification delivered | | | |
| ESTO-S31-HP-4232 | 31.4 Notif | Manager | Happy | All | Notifications | View notification analytics | Analytics displayed | | | |
| ESTO-S31-HP-4233 | 31.4 Notif | Admin | Happy | All | Platform notifications | Configure platform notifications | Config saved | | | |
| ESTO-S31-HP-4234 | 31.4 Notif | Admin | Happy | All | System notification | Send system notification | Notification delivered | | | |
| ESTO-S31-HP-4235 | 31.4 Notif | Admin | Happy | All | Emergency notification | Send emergency alert | Alert delivered to all | | | |
| ESTO-S31-HP-4236 | 31.4 Notif | Admin | Happy | All | Emergency alert | User acknowledges | Acknowledgment recorded | | | |
| ESTO-S31-HP-4237 | 31.4 Notif | Admin | Happy | All | Notification channels | Configure channels | Channels configured | | | |
| ESTO-S31-HP-4238 | 31.4 Notif | Admin | Happy | All | Channels configured | Test channel | Test notification sent | | | |
| ESTO-S31-HP-4239 | 31.4 Notif | Admin | Happy | All | Channel test | Test result displayed | Result shown | | | |
| ESTO-S31-HP-4240 | 31.4 Notif | Admin | Happy | All | Notification templates | Manage templates | Templates managed | | | |
| ESTO-S31-HP-4241 | 31.4 Notif | Admin | Happy | All | Templates | Template versioning | Versions tracked | | | |
| ESTO-S31-HP-4242 | 31.4 Notif | Admin | Happy | All | Template versions | Rollback template | Template rolled back | | | |
| ESTO-S31-HP-4243 | 31.4 Notif | Admin | Happy | All | Notifications | View delivery report | Report displayed | | | |
| ESTO-S31-HP-4244 | 31.4 Notif | Admin | Happy | All | Notifications | View bounce report | Bounce report displayed | | | |
| ESTO-S31-HP-4245 | 31.4 Notif | Admin | Happy | All | Bounce report | Clean email list | List cleaned | | | |
| ESTO-S31-HP-4246 | 31.4 Notif | Admin | Happy | All | Notifications | View unsubscribe rate | Rate displayed | | | |
| ESTO-S31-HP-4247 | 31.4 Notif | Admin | Happy | All | Notifications | View open rate | Open rate displayed | | | |
| ESTO-S31-HP-4248 | 31.4 Notif | Admin | Happy | All | Notifications | View click rate | Click rate displayed | | | |
| ESTO-S31-HP-4249 | 31.4 Notif | Admin | Happy | All | Notification | Schedule re-engagement | Re-engagement scheduled | | | |
| ESTO-S31-HP-4250 | 31.4 Notif | Admin | Happy | All | Notification | A/B test notifications | A/B test configured | | | |
| ESTO-S31-HP-4251 | 31.4 Notif | Admin | Happy | All | A/B test | View A/B results | Results displayed | | | |
| ESTO-S31-HP-4252 | 31.4 Notif | Admin | Happy | All | Notifications | Smart send time | Optimal time used | | | |
| ESTO-S31-HP-4253 | 31.4 Notif | Admin | Happy | All | Notifications | Frequency capping | Frequency capped | | | |
| ESTO-S31-HP-4254 | 31.4 Notif | Admin | Happy | All | Notifications | Quiet hours | Quiet hours respected | | | |
| ESTO-S31-HP-4255 | 31.4 Notif | Admin | Happy | All | Notifications | Timezone-aware send | Timezone respected | | | |
| ESTO-S31-HP-4256 | 31.4 Notif | Admin | Happy | All | Notifications | Personalize notifications | Personalization applied | | | |
| ESTO-S31-HP-4257 | 31.4 Notif | Admin | Happy | All | Notifications | Dynamic content | Dynamic content loaded | | | |
| ESTO-S31-HP-4258 | 31.4 Notif | Admin | Happy | All | Notifications | Conditional send logic | Logic applied | | | |
| ESTO-S31-HP-4259 | 31.4 Notif | Admin | Happy | All | Notifications | Suppress list | Suppression working | | | |
| ESTO-S31-HP-4260 | 31.4 Notif | Admin | Happy | All | Notifications | Deduplicate notifications | No duplicates | | | |
| ESTO-S31-HP-4261 | 31.4 Notif | Admin | Happy | All | Notifications | Transactional vs promotional | Separated correctly | | | |
| ESTO-S31-HP-4262 | 31.4 Notif | Admin | Happy | All | Notifications | Consent tracking | Consent tracked | | | Privacy |
| ESTO-S31-HP-4263 | 31.4 Notif | Admin | Happy | All | Notifications | Audit notification history | History displayed | | | |
| ESTO-S31-HP-4264 | 31.4 Notif | Admin | Happy | All | Notifications | Export notification report | Report exported | | | |
| ESTO-S31-HP-4265 | 31.4 Notif | Admin | Happy | All | Notifications | View notification templates | Templates displayed | | | |
| ESTO-S31-HP-4266 | 31.4 Notif | Admin | Happy | All | Notifications | Create notification workflow | Workflow created | | | |
| ESTO-S31-HP-4267 | 31.4 Notif | Admin | Happy | All | Workflow created | Run workflow | Workflow executed | | | |
| ESTO-S31-HP-4268 | 31.4 Notif | Admin | Happy | All | Notifications | View notification logs | Logs displayed | | | |
| ESTO-S31-HP-4269 | 31.4 Notif | Admin | Happy | All | Notifications | Debug notification delivery | Debug info displayed | | | |
| ESTO-S31-HP-4270 | 31.4 Notif | Admin | Happy | All | Notifications | Webhook for notifications | Webhook triggered | | | |
| ESTO-S31-HP-4271 | 31.4 Notif | Admin | Happy | All | Notifications | Inbox delivery tracking | Delivery tracked | | | |
| ESTO-S31-HP-4272 | 31.4 Notif | Admin | Happy | All | Notifications | Spam score monitoring | Score monitored | | | |
| ESTO-S31-HP-4273 | 31.4 Notif | Admin | Happy | All | Notifications | DKIM/DMARC | Email authentication valid | | | |
| ESTO-S31-HP-4274 | 31.4 Notif | Admin | Happy | All | Notifications | Bounce handling | Bounces handled | | | |
| ESTO-S31-HP-4275 | 31.4 Notif | Admin | Happy | All | Notifications | Complaint handling | Complaints handled | | | |
| ESTO-S31-HP-4276 | 31.4 Notif | Admin | Happy | All | Notifications | IP warmup | IP warmup scheduled | | | |
| ESTO-S31-HP-4277 | 31.4 Notif | Admin | Happy | All | Notifications | Sender reputation | Reputation monitored | | | |
| ESTO-S31-HP-4278 | 31.4 Notif | Admin | Happy | All | Notifications | Suppress invalid emails | Invalid emails suppressed | | | |
| ESTO-S31-HP-4279 | 31.4 Notif | Admin | Happy | All | Notifications | List hygiene | List cleaned | | | |
| ESTO-S31-HP-4280 | 31.4 Notif | Admin | Happy | All | Notifications | Engagement segmentation | Segments created | | | |
| ESTO-S31-HP-4281 | 31.4 Notif | Admin | Happy | All | Notifications | Cohort analysis | Cohorts analyzed | | | |
| ESTO-S31-HP-4282 | 31.4 Notif | Admin | Happy | All | Notifications | Win-back campaign | Campaign configured | | | |
| ESTO-S31-HP-4283 | 31.4 Notif | Admin | Happy | All | Notifications | Win-back delivery | Win-back sent | | | |
| ESTO-S31-HP-4284 | 31.4 Notif | Admin | Happy | All | Notifications | Win-back metrics | Metrics displayed | | | |
| ESTO-S31-HP-4285 | 31.4 Notif | Admin | Happy | All | Notifications | Re-engagement funnel | Funnel displayed | | | |
| ESTO-S31-HP-4286 | 31.4 Notif | Admin | Happy | All | Notifications | Churn prediction from engagement | Churn predicted | | | |
| ESTO-S31-HP-4287 | 31.4 Notif | Admin | Happy | All | Notifications | Churn prevention campaign | Campaign sent | | | |
| ESTO-S31-HP-4288 | 31.4 Notif | Admin | Happy | All | Notifications | Campaign ROI | ROI calculated | | | |
| ESTO-S31-HP-4289 | 31.4 Notif | Admin | Happy | All | Notifications | Attribution tracking | Attribution tracked | | | |
| ESTO-S31-HP-4290 | 31.4 Notif | Admin | Happy | All | Notifications | Cross-channel tracking | Cross-channel tracked | | | |
| ESTO-S31-HP-4291 | 31.4 Notif | Admin | Happy | All | Notifications | Omnichannel orchestration | Orchestrated correctly | | | |
| ESTO-S31-HP-4292 | 31.4 Notif | Admin | Happy | All | Notifications | Journey-based notifications | Journey notifications sent | | | |
| ESTO-S31-HP-4293 | 31.4 Notif | Admin | Happy | All | Notifications | Trigger-based notifications | Trigger notifications sent | | | |
| ESTO-S31-HP-4294 | 31.4 Notif | Admin | Happy | All | Notifications | Event-based notifications | Event notifications sent | | | |
| ESTO-S31-HP-4295 | 31.4 Notif | Admin | Happy | All | Notifications | Behavior-based notifications | Behavior notifications sent | | | |
| ESTO-S31-HP-4296 | 31.4 Notif | Admin | Happy | All | Notifications | Preference learning | Preferences learned | | | |
| ESTO-S31-HP-4297 | 31.4 Notif | Admin | Happy | All | Notifications | Send time optimization | Optimal time used | | | |
| ESTO-S31-HP-4298 | 31.4 Notif | Admin | Happy | All | Notifications | Channel optimization | Best channel selected | | | |
| ESTO-S31-HP-4299 | 31.4 Notif | Admin | Happy | All | Notifications | Content optimization | Best content selected | | | |
| ESTO-S31-HP-4300 | 31.4 Notif | Admin | Happy | All | Notifications | Frequency optimization | Optimal frequency | | | |
| ESTO-S31-HP-4301 | 31.4 Notif | Admin | Happy | All | Notifications | Recipient optimization | Best recipients selected | | | |
| ESTO-S31-HP-4302 | 31.4 Notif | Admin | Happy | All | Notifications | Subject optimization | Best subject line | | | |
| ESTO-S31-HP-4303 | 31.4 Notif | Admin | Happy | All | Notifications | Body optimization | Best body content | | | |
| ESTO-S31-HP-4304 | 31.4 Notif | Admin | Happy | All | Notifications | CTA optimization | Best CTA | | | |
| ESTO-S31-HP-4305 | 31.4 Notif | Admin | Happy | All | Notifications | Landing page optimization | Best landing page | | | |
| ESTO-S31-HP-4306 | 31.4 Notif | Admin | Happy | All | Notifications | Conversion tracking | Conversions tracked | | | |
| ESTO-S31-HP-4307 | 31.4 Notif | Admin | Happy | All | Notifications | Revenue attribution | Revenue attributed | | | |
| ESTO-S31-HP-4308 | 31.4 Notif | Admin | Happy | All | Notifications | Lifecycle stage targeting | Stage-specific notifications | | | |
| ESTO-S31-HP-4309 | 31.4 Notif | Admin | Happy | All | Notifications | Behavioral triggers | Triggers fired | | | |
| ESTO-S31-HP-4310 | 31.4 Notif | Admin | Happy | All | Notifications | Predictive send | Predictive time used | | | |
| ESTO-S31-HP-4311 | 31.4 Notif | Admin | Happy | All | Notifications | ML-driven content | ML content selected | | | |
| ESTO-S31-HP-4312 | 31.4 Notif | Admin | Happy | All | Notifications | ML-driven channel | ML channel selected | | | |
| ESTO-S31-HP-4313 | 31.4 Notif | Admin | Happy | All | Notifications | ML-driven timing | ML timing used | | | |
| ESTO-S31-HP-4314 | 31.4 Notif | Admin | Happy | All | Notifications | ML-driven frequency | ML frequency applied | | | |
| ESTO-S31-HP-4315 | 31.4 Notif | Admin | Happy | All | Notifications | A/B test subject lines | A/B test running | | | |
| ESTO-S31-HP-4316 | 31.4 Notif | Admin | Happy | All | Notifications | A/B test winner | Winner applied | | | |
| ESTO-S31-HP-4317 | 31.4 Notif | Admin | Happy | All | Notifications | Multivariate test | MVT running | | | |
| ESTO-S31-HP-4318 | 31.4 Notif | Admin | Happy | All | Notifications | Bandit algorithm | Multi-armed bandit used | | | |
| ESTO-S31-HP-4319 | 31.4 Notif | Admin | Happy | All | Notifications | Personalization engine | Engine active | | | |
| ESTO-S31-HP-4320 | 31.4 Notif | Admin | Happy | All | Notifications | Recommendation engine | Engine active | | | |
| ESTO-S31-EM-4321 | 31.4 Notif | User | Empty | All | -- | View notifications (none) | Empty notification state | | | |
| ESTO-S31-ER-4322 | 31.4 Notif | User | Error | All | Notification service down | Receive notification | Queued; delivered when recovered | | | |
| ESTO-S31-ER-4323 | 31.4 Notif | User | Error | All | Email bounce | Receive email | Delivery failed; retry | | | |
| ESTO-S31-ER-4324 | 31.4 Notif | User | Error | All | -- | Notification with XSS | Content sanitized | | | Security |
| ESTO-S31-ER-4325 | 31.4 Notif | User | Error | All | -- | Notification spoof | Spoof detected | | | Security |
| ESTO-S31-ED-4326 | 31.4 Notif | User | Edge | All | 1M notifications | Send to 1M users | All delivered; throttled | | | |
| ESTO-S31-ED-4327 | 31.4 Notif | User | Edge | All | DND period | Send notification during DND | Queued until after DND | | | |
| ESTO-S31-ED-4328 | 31.4 Notif | User | Edge | All | Low storage | Notification with many items | Pagination applied | | | |
| ESTO-S31-CR-4329 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin views user notification preferences | Preferences visible | | | Privacy |
| ESTO-S31-CR-4330 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin sends notification; user receives | Notification delivered | | | |
| ESTO-S31-CR-4331 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin forces notification to user | User receives notification | | | |
| ESTO-S31-CR-4332 | 31.4 Notif | User | Cross-Role | All | Notification preference | User preference respected | Preference honored | | | Privacy |
| ESTO-S31-CR-4333 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin audits notification delivery | Audit log available | | | Security |
| ESTO-S31-CR-4334 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin configures global notification settings | Settings applied | | | |
| ESTO-S31-CR-4335 | 31.4 Notif | Manager | Cross-Role | All | -- | Manager configures team notifications | Team receives notifications | | | |
| ESTO-S31-CR-4336 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin views notification compliance | Compliance displayed | | | Privacy |
| ESTO-S31-CR-4337 | 31.4 Notif | User | Cross-Role | All | -- | User unsubscribes from promotional | Only transactional received | | | Privacy |
| ESTO-S31-CR-4338 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin sends critical security notification | Critical notification delivered | | | Security |
| ESTO-S31-CR-4339 | 31.4 Notif | User | Cross-Role | All | -- | User receives critical alert during DND | Critical notification delivered | | | |
| ESTO-S31-CR-4340 | 31.4 Notif | Admin | Cross-Role | All | -- | Admin sends; Manager filtered | Manager receives only team-relevant | | | |

### 31.5 Platform Configuration & Integrations (250)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-4341 | 31.5 Platform | Admin | Happy | All | Admin access | View platform settings | Settings displayed | | | |
| ESTO-S31-HP-4342 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update platform name | Name updated | | | |
| ESTO-S31-HP-4343 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update platform logo | Logo updated | | | |
| ESTO-S31-HP-4344 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update platform colors | Colors updated | | | |
| ESTO-S31-HP-4345 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update support email | Email updated | | | |
| ESTO-S31-HP-4346 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update support phone | Phone updated | | | |
| ESTO-S31-HP-4347 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update terms URL | URL updated | | | |
| ESTO-S31-HP-4348 | 31.5 Platform | Admin | Happy | All | Settings displayed | Update privacy URL | URL updated | | | |
| ESTO-S31-HP-4349 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure SMTP | SMTP configured | | | |
| ESTO-S31-HP-4350 | 31.5 Platform | Admin | Happy | All | SMTP configured | Test email delivery | Email delivered | | | |
| ESTO-S31-HP-4351 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure SMS provider | SMS provider configured | | | |
| ESTO-S31-HP-4352 | 31.5 Platform | Admin | Happy | All | SMS configured | Test SMS delivery | SMS delivered | | | |
| ESTO-S31-HP-4353 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure push provider | Push provider configured | | | |
| ESTO-S31-HP-4354 | 31.5 Platform | Admin | Happy | All | Push configured | Test push notification | Push delivered | | | |
| ESTO-S31-HP-4355 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure storage | Storage configured | | | |
| ESTO-S31-HP-4356 | 31.5 Platform | Admin | Happy | All | Storage configured | Test file upload | Upload succeeds | | | |
| ESTO-S31-HP-4357 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure CDN | CDN configured | | | |
| ESTO-S31-HP-4358 | 31.5 Platform | Admin | Happy | All | CDN configured | Purge CDN | Cache purged | | | |
| ESTO-S31-HP-4359 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure maps API | Maps API configured | | | |
| ESTO-S31-HP-4360 | 31.5 Platform | Admin | Happy | All | Maps configured | Test maps display | Maps load | | | |
| ESTO-S31-HP-4361 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure payment gateway | Gateway configured | | | |
| ESTO-S31-HP-4362 | 31.5 Platform | Admin | Happy | All | Payment configured | Test payment | Payment succeeds | | | |
| ESTO-S31-HP-4363 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure analytics | Analytics configured | | | |
| ESTO-S31-HP-4364 | 31.5 Platform | Admin | Happy | All | Analytics configured | Test tracking | Events tracked | | | |
| ESTO-S31-HP-4365 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure search | Search configured | | | |
| ESTO-S31-HP-4366 | 31.5 Platform | Admin | Happy | All | Search configured | Test search | Search works | | | |
| ESTO-S31-HP-4367 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure AI | AI configured | | | |
| ESTO-S31-HP-4368 | 31.5 Platform | Admin | Happy | All | AI configured | Test AI features | Features work | | | |
| ESTO-S31-HP-4369 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure SSO | SSO configured | | | |
| ESTO-S31-HP-4370 | 31.5 Platform | Admin | Happy | All | SSO configured | Test SSO login | SSO login works | | | |
| ESTO-S31-HP-4371 | 31.5 Platform | Admin | Happy | All | SSO configured | Test SSO logout | SSO logout works | | | |
| ESTO-S31-HP-4372 | 31.5 Platform | Admin | Happy | All | SSO configured | Test SSO provisioning | Provisioning works | | | |
| ESTO-S31-HP-4373 | 31.5 Platform | Admin | Happy | All | SSO configured | Test SSO deprovisioning | Deprovisioning works | | | |
| ESTO-S31-HP-4374 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure OAuth | OAuth configured | | | |
| ESTO-S31-HP-4375 | 31.5 Platform | Admin | Happy | All | OAuth configured | Test Google login | Google login works | | | |
| ESTO-S31-HP-4376 | 31.5 Platform | Admin | Happy | All | OAuth configured | Test Apple login | Apple login works | | | |
| ESTO-S31-HP-4377 | 31.5 Platform | Admin | Happy | All | OAuth configured | Test Facebook login | Facebook login works | | | |
| ESTO-S31-HP-4378 | 31.5 Platform | Admin | Happy | All | OAuth configured | Test LinkedIn login | LinkedIn login works | | | |
| ESTO-S31-HP-4379 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure webhooks | Webhooks configured | | | |
| ESTO-S31-HP-4380 | 31.5 Platform | Admin | Happy | All | Webhooks configured | Test webhook | Webhook received | | | |
| ESTO-S31-HP-4381 | 31.5 Platform | Admin | Happy | All | Webhook received | Verify webhook signature | Signature valid | | | Security |
| ESTO-S31-HP-4382 | 31.5 Platform | Admin | Happy | All | Webhook | View webhook logs | Logs displayed | | | |
| ESTO-S31-HP-4383 | 31.5 Platform | Admin | Happy | All | Webhook failing | Retry webhook | Retry works | | | |
| ESTO-S31-HP-4384 | 31.5 Platform | Admin | Happy | All | Webhook | View webhook stats | Stats displayed | | | |
| ESTO-S31-HP-4385 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure rate limits | Limits configured | | | |
| ESTO-S31-HP-4386 | 31.5 Platform | Admin | Happy | All | Rate limits set | Test rate limit | Limit enforced | | | |
| ESTO-S31-HP-4387 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure CORS | CORS configured | | | |
| ESTO-S31-HP-4388 | 31.5 Platform | Admin | Happy | All | CORS configured | Test CORS headers | Headers correct | | | Security |
| ESTO-S31-HP-4389 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure CSP | CSP configured | | | Security |
| ESTO-S31-HP-4390 | 31.5 Platform | Admin | Happy | All | CSP configured | Test CSP | CSP enforced | | | Security |
| ESTO-S31-HP-4391 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure feature flags | Flags configured | | | |
| ESTO-S31-HP-4392 | 31.5 Platform | Admin | Happy | All | Feature flag set | Feature enabled/disabled | Feature toggled | | | |
| ESTO-S31-HP-4393 | 31.5 Platform | Admin | Happy | All | Feature flag | Gradual rollout | Rollout works | | | |
| ESTO-S31-HP-4394 | 31.5 Platform | Admin | Happy | All | Feature flag | Kill switch | Kill switch works | | | |
| ESTO-S31-HP-4395 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure API keys | Keys configured | | | Security |
| ESTO-S31-HP-4396 | 31.5 Platform | Admin | Happy | All | API keys configured | Test API with key | API works | | | |
| ESTO-S31-HP-4397 | 31.5 Platform | Admin | Happy | All | API key | Rotate API key | Key rotated | | | Security |
| ESTO-S31-HP-4398 | 31.5 Platform | Admin | Happy | All | API key rotated | Old key rejected | Old key invalid | | | Security |
| ESTO-S31-HP-4399 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure environment | Environment set | | | |
| ESTO-S31-HP-4400 | 31.5 Platform | Admin | Happy | All | Environment | View environment config | Config displayed | | | |
| ESTO-S31-HP-4401 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure regions | Regions configured | | | |
| ESTO-S31-HP-4402 | 31.5 Platform | Admin | Happy | All | Regions | View region status | Status displayed | | | |
| ESTO-S31-HP-4403 | 31.5 Platform | Admin | Happy | All | Regions | Enable/disable region | Region toggled | | | |
| ESTO-S31-HP-4404 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure maintenance | Maintenance scheduled | | | |
| ESTO-S31-HP-4405 | 31.5 Platform | Admin | Happy | All | Maintenance | Cancel maintenance | Cancelled | | | |
| ESTO-S31-HP-4406 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure integrations | Integrations listed | | | |
| ESTO-S31-HP-4407 | 31.5 Platform | Admin | Happy | All | Integrations | Add integration | Integration added | | | |
| ESTO-S31-HP-4408 | 31.5 Platform | Admin | Happy | All | Integration added | Test integration | Integration works | | | |
| ESTO-S31-HP-4409 | 31.5 Platform | Admin | Happy | All | Integration | Remove integration | Integration removed | | | |
| ESTO-S31-HP-4410 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure data retention | Retention configured | | | |
| ESTO-S31-HP-4411 | 31.5 Platform | Admin | Happy | All | Retention configured | Run retention job | Old data purged | | | |
| ESTO-S31-HP-4412 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure backup | Backup configured | | | |
| ESTO-S31-HP-4413 | 31.5 Platform | Admin | Happy | All | Backup configured | Run backup | Backup created | | | |
| ESTO-S31-HP-4414 | 31.5 Platform | Admin | Happy | All | Backup | Verify backup | Backup verified | | | |
| ESTO-S31-HP-4415 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure logging | Logging configured | | | |
| ESTO-S31-HP-4416 | 31.5 Platform | Admin | Happy | All | Logging configured | View logs | Logs displayed | | | |
| ESTO-S31-HP-4417 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure monitoring | Monitoring configured | | | |
| ESTO-S31-HP-4418 | 31.5 Platform | Admin | Happy | All | Monitoring configured | View dashboards | Dashboards displayed | | | |
| ESTO-S31-HP-4419 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure alerting | Alerting configured | | | |
| ESTO-S31-HP-4420 | 31.5 Platform | Admin | Happy | All | Alerting configured | Trigger alert | Alert received | | | |
| ESTO-S31-HP-4421 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure security | Security configured | | | |
| ESTO-S31-HP-4422 | 31.5 Platform | Admin | Happy | All | Security configured | Run security scan | Scan results displayed | | | |
| ESTO-S31-HP-4423 | 31.5 Platform | Admin | Happy | All | Security scan | Review findings | Findings listed | | | |
| ESTO-S31-HP-4424 | 31.5 Platform | Admin | Happy | All | Security settings | Apply security patch | Patch applied | | | |
| ESTO-S31-HP-4425 | 31.5 Platform | Admin | Happy | All | Settings displayed | View system info | Info displayed | | | |
| ESTO-S31-HP-4426 | 31.5 Platform | Admin | Happy | All | System info | View service versions | Versions displayed | | | |
| ESTO-S31-HP-4427 | 31.5 Platform | Admin | Happy | All | Settings displayed | View license info | License displayed | | | |
| ESTO-S31-HP-4428 | 31.5 Platform | Admin | Happy | All | Settings displayed | Configure tenant | Tenant configured | | | |
| ESTO-S31-HP-4429 | 31.5 Platform | Admin | Happy | All | Tenant configured | View tenant settings | Settings displayed | | | |
| ESTO-S31-HP-4430 | 31.5 Platform | Admin | Happy | All | Tenant | Switch tenant context | Context switched | | | |
| ESTO-S31-HP-4431 | 31.5 Platform | Admin | Happy | All | Multi-tenant | View tenant isolation | Isolation verified | | | Security |
| ESTO-S31-HP-4432 | 31.5 Platform | Admin | Happy | All | Multi-tenant | Cross-tenant access blocked | Access denied | | | Security |
| ESTO-S31-HP-4433 | 31.5 Platform | Admin | Happy | All | Settings displayed | View audit log | Log displayed | | | |
| ESTO-S31-HP-4434 | 31.5 Platform | Admin | Happy | All | Audit log | Export audit log | Log exported | | | |
| ESTO-S31-HP-4435 | 31.5 Platform | Admin | Happy | All | Settings displayed | View health dashboard | Dashboard displayed | | | |
| ESTO-S31-HP-4436 | 31.5 Platform | Admin | Happy | All | Health dashboard | All services healthy | All green | | | |
| ESTO-S31-HP-4437 | 31.5 Platform | Admin | Happy | All | Service down | Health shows degraded | Degraded state shown | | | |
| ESTO-S31-HP-4438 | 31.5 Platform | Admin | Happy | All | Service recovered | Health shows recovered | Recovered state shown | | | |
| ESTO-S31-HP-4439 | 31.5 Platform | Admin | Happy | All | Settings displayed | Export settings | Settings exported | | | |
| ESTO-S31-HP-4440 | 31.5 Platform | Admin | Happy | All | Settings exported | Import settings | Settings imported | | | |
| ESTO-S31-EM-4441 | 31.5 Platform | Admin | Empty | All | -- | View integrations (none) | Empty integrations state | | | |
| ESTO-S31-ER-4442 | 31.5 Platform | Admin | Error | All | Settings service down | View settings | Cached settings shown | | | |
| ESTO-S31-ER-4443 | 31.5 Platform | Admin | Error | All | -- | Config with injection | Injection blocked | | | Security |
| ESTO-S31-ER-4444 | 31.5 Platform | Admin | Error | All | -- | Import malicious config | Config validated | | | Security |
| ESTO-S31-ED-4445 | 31.5 Platform | Admin | Edge | All | Many integrations | 50+ integrations | All load correctly | | | |
| ESTO-S31-CR-4446 | 31.5 Platform | Admin | Cross-Role | All | -- | Admin config; all users affected | All users see changes | | | |
| ESTO-S31-CR-4447 | 31.5 Platform | Admin | Cross-Role | All | -- | Admin changes SMTP; all emails affected | Emails use new SMTP | | | |
| ESTO-S31-CR-4448 | 31.5 Platform | Admin | Cross-Role | All | -- | Admin enables SSO; all users affected | SSO login available | | | |
| ESTO-S31-CR-4449 | 31.5 Platform | Admin | Cross-Role | All | -- | Admin kills feature; users see disabled | Feature disabled | | | |
| ESTO-S31-CR-4450 | 31.5 Platform | Admin | Cross-Role | All | -- | Admin enables maintenance mode | Maintenance page shown | | | |

### 31.6 Miscellaneous Edge Cases & Exploratory (340)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S31-HP-4451 | 31.6 Misc | User | Happy | All | -- | Deep link to property | Property page opens | | | |
| ESTO-S31-HP-4452 | 31.6 Misc | User | Happy | All | Deep link | Deep link with tracking | Tracking params preserved | | | |
| ESTO-S31-HP-4453 | 31.6 Misc | User | Happy | All | Deep link | Deep link invalid | Error page shown | | | |
| ESTO-S31-HP-4454 | 31.6 Misc | User | Happy | All | App installed | PWA install prompt | Prompt shown | | | PWA |
| ESTO-S31-HP-4455 | 31.6 Misc | User | Happy | All | PWA installed | Launch from home screen | App opens as PWA | | | PWA |
| ESTO-S31-HP-4456 | 31.6 Misc | User | Happy | All | PWA installed | App works offline | Offline functionality works | | | PWA |
| ESTO-S31-HP-4457 | 31.6 Misc | User | Happy | All | PWA installed | Update available | Update prompt shown | | | PWA |
| ESTO-S31-HP-4458 | 31.6 Misc | User | Happy | All | PWA updated | Install update | App updated | | | PWA |
| ESTO-S31-HP-4459 | 31.6 Misc | User | Happy | All | PWA | View app manifest | Manifest valid | | | PWA |
| ESTO-S31-HP-4460 | 31.6 Misc | User | Happy | All | PWA | Service worker registered | SW active | | | PWA |
| ESTO-S31-HP-4461 | 31.6 Misc | User | Happy | All | -- | Bookmark property page | Bookmark saved | | | |
| ESTO-S31-HP-4462 | 31.6 Misc | User | Happy | All | Bookmarked | View bookmarks | Bookmarks listed | | | |
| ESTO-S31-HP-4463 | 31.6 Misc | User | Happy | All | Bookmarked | Remove bookmark | Bookmark removed | | | |
| ESTO-S31-HP-4464 | 31.6 Misc | User | Happy | All | -- | Share property via native share | Share sheet opens | | | |
| ESTO-S31-HP-4465 | 31.6 Misc | User | Happy | All | -- | Share via copy link | Link copied | | | |
| ESTO-S31-HP-4466 | 31.6 Misc | User | Happy | All | Link copied | Paste link in browser | Property page opens | | | |
| ESTO-S31-HP-4467 | 31.6 Misc | User | Happy | All | -- | Add to home screen prompt | A2HS prompt shown | | | PWA |
| ESTO-S31-HP-4468 | 31.6 Misc | User | Happy | All | -- | Install prompt dismissed | Prompt can be re-shown | | | PWA |
| ESTO-S31-HP-4469 | 31.6 Misc | User | Happy | All | -- | Browser back on protected route | Redirect to login | | | |
| ESTO-S31-HP-4470 | 31.6 Misc | User | Happy | All | -- | Direct URL to property | Property loads | | | |
| ESTO-S31-HP-4471 | 31.6 Misc | User | Happy | All | -- | Direct URL to booking | Booking loads | | | |
| ESTO-S31-HP-4472 | 31.6 Misc | User | Happy | All | -- | Direct URL to Fast Track | Fast Track loads | | | |
| ESTO-S31-HP-4473 | 31.6 Misc | User | Happy | All | -- | Direct URL to profile | Profile loads | | | |
| ESTO-S31-HP-4474 | 31.6 Misc | User | Happy | All | -- | Direct URL to admin | Admin loads (if admin) | | | |
| ESTO-S31-HP-4475 | 31.6 Misc | User | Happy | All | -- | Direct URL as manager | Manager dashboard loads | | | |
| ESTO-S31-HP-4476 | 31.6 Misc | User | Happy | All | -- | Direct URL with expired token | Redirect to login | | | |
| ESTO-S31-HP-4477 | 31.6 Misc | User | Happy | All | -- | Direct URL with tampered params | Error; redirect | | | Security |
| ESTO-S31-HP-4478 | 31.6 Misc | User | Happy | All | -- | Multiple tabs open | Data syncs across tabs | | | |
| ESTO-S31-HP-4479 | 31.6 Misc | User | Happy | All | -- | Form auto-save | Draft auto-saved | | | |
| ESTO-S31-HP-4480 | 31.6 Misc | User | Happy | All | Draft saved | Resume from draft | Draft restored | | | |
| ESTO-S31-HP-4481 | 31.6 Misc | User | Happy | All | Form incomplete | Browser refresh | Form state preserved | | | |
| ESTO-S31-HP-4482 | 31.6 Misc | User | Happy | All | Form incomplete | Navigate away | Draft saved prompt | | | |
| ESTO-S31-HP-4483 | 31.6 Misc | User | Happy | All | -- | Print property page | Print preview correct | | | |
| ESTO-S31-HP-4484 | 31.6 Misc | User | Happy | All | -- | Print-friendly styles | Print styles applied | | | |
| ESTO-S31-HP-4485 | 31.6 Misc | User | Happy | All | -- | Open in new tab | New tab loads correctly | | | |
| ESTO-S31-HP-4486 | 31.6 Misc | User | Happy | All | -- | Open link in new tab | External link opens | | | |
| ESTO-S31-HP-4487 | 31.6 Misc | User | Happy | All | -- | External link | Opens in new tab | | | |
| ESTO-S31-HP-4488 | 31.6 Misc | User | Happy | All | -- | External link with noopener | noopener set | | | Security |
| ESTO-S31-HP-4489 | 31.6 Misc | User | Happy | All | -- | External link with noreferrer | noreferrer set | | | Security |
| ESTO-S31-HP-4490 | 31.6 Misc | User | Happy | All | -- | Download file | File downloads | | | |
| ESTO-S31-HP-4491 | 31.6 Misc | User | Happy | All | -- | Download with Content-Disposition | File downloaded with name | | | |
| ESTO-S31-HP-4492 | 31.6 Misc | User | Happy | All | -- | View PDF in browser | PDF displayed | | | |
| ESTO-S31-HP-4493 | 31.6 Misc | User | Happy | All | -- | Print from browser | Print dialog opens | | | |
| ESTO-S31-HP-4494 | 31.6 Misc | User | Happy | All | -- | Screen capture property | Screenshot possible | | | |
| ESTO-S31-HP-4495 | 31.6 Misc | User | Happy | All | -- | Right-click context menu | Context menu works | | | |
| ESTO-S31-HP-4496 | 31.6 Misc | User | Happy | All | -- | Ctrl+F search | Search finds content | | | |
| ESTO-S31-HP-4497 | 31.6 Misc | User | Happy | All | -- | Ctrl+P print | Print works | | | |
| ESTO-S31-HP-4498 | 31.6 Misc | User | Happy | All | -- | Ctrl+S save | Save works | | | |
| ESTO-S31-HP-4499 | 31.6 Misc | User | Happy | All | -- | Ctrl+Z undo | Undo works | | | |
| ESTO-S31-HP-4500 | 31.6 Misc | User | Happy | All | -- | Ctrl+Y redo | Redo works | | | |
| ESTO-S31-HP-4501 | 31.6 Misc | User | Happy | All | -- | Ctrl+C copy | Copy works | | | |
| ESTO-S31-HP-4502 | 31.6 Misc | User | Happy | All | -- | Ctrl+V paste | Paste works | | | |
| ESTO-S31-HP-4503 | 31.6 Misc | User | Happy | All | -- | Ctrl+A select all | All content selected | | | |
| ESTO-S31-HP-4504 | 31.6 Misc | User | Happy | All | -- | Tab navigation | Tab works | | | A11y |
| ESTO-S31-HP-4505 | 31.6 Misc | User | Happy | All | -- | Shift+Tab reverse | Reverse tab works | | | A11y |
| ESTO-S31-HP-4506 | 31.6 Misc | User | Happy | All | -- | Enter on button | Button activated | | | A11y |
| ESTO-S31-HP-4507 | 31.6 Misc | User | Happy | All | -- | Space on button | Button activated | | | A11y |
| ESTO-S31-HP-4508 | 31.6 Misc | User | Happy | All | -- | Escape closes modal | Modal closes | | | A11y |
| ESTO-S31-HP-4509 | 31.6 Misc | User | Happy | All | -- | Arrow keys in list | List navigation works | | | A11y |
| ESTO-S31-HP-4510 | 31.6 Misc | User | Happy | All | -- | Home/End in list | First/last item focused | | | A11y |
| ESTO-S31-HP-4511 | 31.6 Misc | User | Happy | All | -- | PageUp/PageDown | Page scrolls | | | A11y |
| ESTO-S31-HP-4512 | 31.6 Misc | User | Happy | All | -- | Focus trap in modal | Focus stays in modal | | | A11y |
| ESTO-S31-HP-4513 | 31.6 Misc | User | Happy | All | -- | Focus trap with escape | Escape exits trap | | | A11y |
| ESTO-S31-HP-4514 | 31.6 Misc | User | Happy | All | -- | Focus visible on all elements | Focus indicator visible | | | A11y |
| ESTO-S31-HP-4515 | 31.6 Misc | User | Happy | All | -- | Skip link navigates | Skip link works | | | A11y |
| ESTO-S31-HP-4516 | 31.6 Misc | User | Happy | All | -- | ARIA landmarks present | Landmarks available | | | A11y |
| ESTO-S31-HP-4517 | 31.6 Misc | User | Happy | All | -- | ARIA roles correct | Roles applied | | | A11y |
| ESTO-S31-HP-4518 | 31.6 Misc | User | Happy | All | -- | ARIA labels present | Labels present | | | A11y |
| ESTO-S31-HP-4519 | 31.6 Misc | User | Happy | All | -- | ARIA live regions | Live regions functional | | | A11y |
| ESTO-S31-HP-4520 | 31.6 Misc | User | Happy | All | -- | ARIA expanded state | State announced | | | A11y |
| ESTO-S31-HP-4521 | 31.6 Misc | User | Happy | All | -- | ARIA selected state | State announced | | | A11y |
| ESTO-S31-HP-4522 | 31.6 Misc | User | Happy | All | -- | ARIA checked state | State announced | | | A11y |
| ESTO-S31-HP-4523 | 31.6 Misc | User | Happy | All | -- | ARIA disabled state | State announced | | | A11y |
| ESTO-S31-HP-4524 | 31.6 Misc | User | Happy | All | -- | ARIA invalid state | State announced | | | A11y |
| ESTO-S31-HP-4525 | 31.6 Misc | User | Happy | All | -- | ARIA required state | State announced | | | A11y |
| ESTO-S31-HP-4526 | 31.6 Misc | User | Happy | All | -- | ARIA describedby | Description announced | | | A11y |
| ESTO-S31-HP-4527 | 31.6 Misc | User | Happy | All | -- | ARIA errormessage | Error announced | | | A11y |
| ESTO-S31-HP-4528 | 31.6 Misc | User | Happy | All | -- | ARIA describedby on error | Error linked to field | | | A11y |
| ESTO-S31-HP-4529 | 31.6 Misc | User | Happy | All | -- | Tabindex management | Tab order correct | | | A11y |
| ESTO-S31-HP-4530 | 31.6 Misc | User | Happy | All | -- | roving tabindex | Roving tabindex works | | | A11y |
| ESTO-S31-HP-4531 | 31.6 Misc | User | Happy | All | -- | Virtual focus ring | Focus ring follows pointer | | | A11y |
| ESTO-S31-HP-4532 | 31.6 Misc | User | Happy | All | -- | High contrast mode | Contrast increased | | | A11y |
| ESTO-S31-HP-4533 | 31.6 Misc | User | Happy | All | -- | Forced colors mode | Forced colors respected | | | A11y |
| ESTO-S31-HP-4534 | 31.6 Misc | User | Happy | All | -- | prefers-reduced-motion | Animations reduced | | | A11y |
| ESTO-S31-HP-4535 | 31.6 Misc | User | Happy | All | -- | prefers-color-scheme | Theme adapts | | | A11y |
| ESTO-S31-HP-4536 | 31.6 Misc | User | Happy | All | -- | prefers-contrast | Contrast adapted | | | A11y |
| ESTO-S31-HP-4537 | 31.6 Misc | User | Happy | All | -- | prefers-reduced-data | Data usage reduced | | | A11y |
| ESTO-S31-HP-4538 | 31.6 Misc | User | Happy | All | -- | prefers-reduced-transparency | Transparency reduced | | | A11y |
| ESTO-S31-HP-4539 | 31.6 Misc | User | Happy | All | -- | Speech recognition | Voice input works | | | A11y |
| ESTO-S31-HP-4540 | 31.6 Misc | User | Happy | All | -- | Switch access | Switch navigation works | | | A11y |
| ESTO-S31-HP-4541 | 31.6 Misc | User | Happy | All | -- | Magnification | Content readable at 200% | | | A11y |
| ESTO-S31-HP-4542 | 31.6 Misc | User | Happy | All | -- | Screen zoom | Content readable | | | A11y |
| ESTO-S31-HP-4543 | 31.6 Misc | User | Happy | All | -- | High contrast on dark mode | Both modes work | | | A11y |
| ESTO-S31-HP-4544 | 31.6 Misc | User | Happy | All | -- | Zoom to 400% | No horizontal scroll | | | A11y |
| ESTO-S31-HP-4545 | 31.6 Misc | User | Happy | All | -- | Orientation change | Layout adapts | | | |
| ESTO-S31-HP-4546 | 31.6 Misc | User | Happy | All | -- | Viewport resize | Content reflows | | | |
| ESTO-S31-HP-4547 | 31.6 Misc | User | Happy | All | -- | Font size change | Layout adapts | | | |
| ESTO-S31-HP-4548 | 31.6 Misc | User | Happy | All | -- | Browser zoom | Content readable | | | |
| ESTO-S31-HP-4549 | 31.6 Misc | User | Happy | All | -- | Minimal UI mode | Minimal UI works | | | |
| ESTO-S31-HP-4550 | 31.6 Misc | User | Happy | All | -- | Full screen mode | Full screen works | | | |
| ESTO-S31-HP-4551 | 31.6 Misc | User | Happy | All | -- | Picture-in-picture | PiP works | | | |
| ESTO-S31-HP-4552 | 31.6 Misc | User | Happy | All | -- | Screen sharing | Screen sharing works | | | |
| ESTO-S31-HP-4553 | 31.6 Misc | User | Happy | All | -- | Clipboard API | Clipboard works | | | |
| ESTO-S31-HP-4554 | 31.6 Misc | User | Happy | All | -- | Geolocation API | Location works | | | |
| ESTO-S31-HP-4555 | 31.6 Misc | User | Happy | All | -- | Notification API | Notifications work | | | |
| ESTO-S31-HP-4556 | 31.6 Misc | User | Happy | All | -- | Vibration API | Vibration works | | | |
| ESTO-S31-HP-4557 | 31.6 Misc | User | Happy | All | -- | Battery API | Battery status shown | | | |
| ESTO-S31-HP-4558 | 31.6 Misc | User | Happy | All | -- | Network API | Network status shown | | | |
| ESTO-S31-HP-4559 | 31.6 Misc | User | Happy | All | -- | Orientation API | Orientation detected | | | |
| ESTO-S31-HP-4560 | 31.6 Misc | User | Happy | All | -- | Device memory API | Memory info available | | | |
| ESTO-S31-HP-4561 | 31.6 Misc | User | Happy | All | -- | Connection API | Connection info shown | | | |
| ESTO-S31-HP-4562 | 31.6 Misc | User | Happy | All | -- | Gamepad API | Gamepad detected (if applicable) | | | |
| ESTO-S31-HP-4563 | 31.6 Misc | User | Happy | All | -- | WebXR | XR supported (if applicable) | | | |
| ESTO-S31-HP-4564 | 31.6 Misc | User | Happy | All | -- | Web Speech API | Speech recognition works | | | |
| ESTO-S31-HP-4565 | 31.6 Misc | User | Happy | All | -- | Web Share API | Share works | | | |
| ESTO-S31-HP-4566 | 31.6 Misc | User | Happy | All | -- | Web Share Target | Share target works | | | |
| ESTO-S31-HP-4567 | 31.6 Misc | User | Happy | All | -- | File System API | File system access works | | | |
| ESTO-S31-HP-4568 | 31.6 Misc | User | Happy | All | -- | Contact Picker API | Contacts access works | | | |
| ESTO-S31-HP-4569 | 31.6 Misc | User | Happy | All | -- | Payment Request API | Payment request works | | | |
| ESTO-S31-HP-4570 | 31.6 Misc | User | Happy | All | -- | Credential Management API | Credentials managed | | | |
| ESTO-S31-HP-4571 | 31.6 Misc | User | Happy | All | -- | Web Authentication API | WebAuthn works | | | |
| ESTO-S31-HP-4572 | 31.6 Misc | User | Happy | All | -- | IndexedDB | Data stored | | | |
| ESTO-S31-HP-4573 | 31.6 Misc | User | Happy | All | -- | LocalStorage | Data stored | | | |
| ESTO-S31-HP-4574 | 31.6 Misc | User | Happy | All | -- | SessionStorage | Data stored | | | |
| ESTO-S31-HP-4575 | 31.6 Misc | User | Happy | All | -- | Cookies | Cookies set correctly | | | |
| ESTO-S31-HP-4576 | 31.6 Misc | User | Happy | All | -- | SameSite cookies | SameSite set correctly | | | Security |
| ESTO-S31-HP-4577 | 31.6 Misc | User | Happy | All | -- | HttpOnly cookies | HttpOnly set correctly | | | Security |
| ESTO-S31-HP-4578 | 31.6 Misc | User | Happy | All | -- | Secure cookies | Secure set correctly | | | Security |
| ESTO-S31-HP-4579 | 31.6 Misc | User | Happy | All | -- | Session cookie expiry | Expiry correct | | | Security |
| ESTO-S31-HP-4580 | 31.6 Misc | User | Happy | All | -- | X-Frame-Options | XFO header set | | | Security |
| ESTO-S31-HP-4581 | 31.6 Misc | User | Happy | All | -- | X-Content-Type-Options | XCTO header set | | | Security |
| ESTO-S31-HP-4582 | 31.6 Misc | User | Happy | All | -- | Referrer-Policy | Referrer policy set | | | Security |
| ESTO-S31-HP-4583 | 31.6 Misc | User | Happy | All | -- | Permissions-Policy | Permissions policy set | | | Security |
| ESTO-S31-HP-4584 | 31.6 Misc | User | Happy | All | -- | Cache-Control | Cache headers set | | | Security |
| ESTO-S31-HP-4585 | 31.6 Misc | User | Happy | All | -- | Strict-Transport-Security | HSTS header set | | | Security |
| ESTO-S31-HP-4586 | 31.6 Misc | User | Happy | All | -- | Mixed content blocked | No mixed content | | | Security |
| ESTO-S31-HP-4587 | 31.6 Misc | User | Happy | All | -- | Clickjacking protection | XFO blocks framing | | | Security |
| ESTO-S31-HP-4588 | 31.6 Misc | User | Happy | All | -- | MIME sniffing blocked | XCTO blocks sniffing | | | Security |
| ESTO-S31-HP-4589 | 31.6 Misc | User | Happy | All | -- | Referrer leakage blocked | Referrer policy limits | | | Security |
| ESTO-S31-HP-4590 | 31.6 Misc | User | Happy | All | -- | Feature policy | Permissions policy set | | | Security |
| ESTO-S31-HP-4591 | 31.6 Misc | User | Happy | All | -- | Trusted Types | Trusted types enforced | | | Security |
| ESTO-S31-HP-4592 | 31.6 Misc | User | Happy | All | -- | Isolation | COOP/COEP set | | | Security |
| ESTO-S31-HP-4593 | 31.6 Misc | User | Happy | All | -- | Subresource Integrity | SRI on CDN scripts | | | Security |
| ESTO-S31-HP-4594 | 31.6 Misc | User | Happy | All | -- | Certificate transparency | CT logs verified | | | Security |
| ESTO-S31-HP-4595 | 31.6 Misc | User | Happy | All | -- | HSTS preload | Preload list eligible | | | Security |
| ESTO-S31-HP-4596 | 31.6 Misc | User | Happy | All | -- | DNSSEC | DNSSEC validated | | | Security |
| ESTO-S31-HP-4597 | 31.6 Misc | User | Happy | All | -- | DLP protection | Data loss prevented | | | Security |
| ESTO-S31-HP-4598 | 31.6 Misc | User | Happy | All | -- | Data masking | PII masked in logs | | | Security |
| ESTO-S31-HP-4599 | 31.6 Misc | User | Happy | All | -- | Token rotation | JWT rotated | | | Security |
| ESTO-S31-HP-4600 | 31.6 Misc | User | Happy | All | -- | Session fixation protection | Session regenerated | | | Security |
| ESTO-S31-HP-4601 | 31.6 Misc | User | Happy | All | -- | Password hashing | Argon2 used | | | Security |
| ESTO-S31-HP-4602 | 31.6 Misc | User | Happy | All | -- | Salt generation | Unique salt per password | | | Security |
| ESTO-S31-HP-4603 | 31.6 Misc | User | Happy | All | -- | PBKDF2 iteration count | Iterations sufficient | | | Security |
| ESTO-S31-HP-4604 | 31.6 Misc | User | Happy | All | -- | Timing attack resistance | Constant-time comparison | | | Security |
| ESTO-S31-HP-4605 | 31.6 Misc | User | Happy | All | -- | Constant-time string comparison | Timing constant | | | Security |
| ESTO-S31-HP-4606 | 31.6 Misc | User | Happy | All | -- | Secure random generation | CSPRNG used | | | Security |
| ESTO-S31-HP-4607 | 31.6 Misc | User | Happy | All | -- | UUID generation | UUID v4 used | | | Security |
| ESTO-S31-HP-4608 | 31.6 Misc | User | Happy | All | -- | Nonce generation | Nonce unique | | | Security |
| ESTO-S31-HP-4609 | 31.6 Misc | User | Happy | All | -- | OTP generation | OTP secure | | | Security |
| ESTO-S31-HP-4610 | 31.6 Misc | User | Happy | All | -- | OTP verification | OTP verified securely | | | Security |
| ESTO-S31-HP-4611 | 31.6 Misc | User | Happy | All | -- | OTP expiry | Expired OTP rejected | | | Security |
| ESTO-S31-HP-4612 | 31.6 Misc | User | Happy | All | -- | OTP rate limit | Rate limited | | | Security |
| ESTO-S31-HP-4613 | 31.6 Misc | User | Happy | All | -- | OTP brute force | Brute force blocked | | | Security |
| ESTO-S31-HP-4614 | 31.6 Misc | User | Happy | All | -- | OTP reuse blocked | Reuse blocked | | | Security |
| ESTO-S31-HP-4615 | 31.6 Misc | User | Happy | All | -- | OTP delivery | OTP delivered via channel | | | Security |
| ESTO-S31-HP-4616 | 31.6 Misc | User | Happy | All | -- | Magic link | Magic link sent | | | Security |
| ESTO-S31-HP-4617 | 31.6 Misc | User | Happy | All | -- | Magic link click | Login via magic link | | | Security |
| ESTO-S31-HP-4618 | 31.6 Misc | User | Happy | All | -- | Magic link expiry | Expired link rejected | | | Security |
| ESTO-S31-HP-4619 | 31.6 Misc | User | Happy | All | -- | Magic link reuse | Reuse blocked | | | Security |
| ESTO-S31-HP-4620 | 31.6 Misc | User | Happy | All | -- | Password reset token | Token sent | | | Security |
| ESTO-S31-HP-4621 | 31.6 Misc | User | Happy | All | -- | Password reset | Password reset works | | | Security |
| ESTO-S31-HP-4622 | 31.6 Misc | User | Happy | All | -- | Reset token expiry | Expired token rejected | | | Security |
| ESTO-S31-HP-4623 | 31.6 Misc | User | Happy | All | -- | Reset token reuse | Reuse blocked | | | Security |
| ESTO-S31-HP-4624 | 31.6 Misc | User | Happy | All | -- | Email verification | Verification email sent | | | Security |
| ESTO-S31-HP-4625 | 31.6 Misc | User | Happy | All | -- | Email verification link | Link works | | | Security |
| ESTO-S31-HP-4626 | 31.6 Misc | User | Happy | All | -- | Email verification expiry | Expiry enforced | | | Security |
| ESTO-S31-HP-4627 | 31.6 Misc | User | Happy | All | -- | Email verification resend | Resend works | | | Security |
| ESTO-S31-HP-4628 | 31.6 Misc | User | Happy | All | -- | Phone verification | Verification SMS sent | | | Security |
| ESTO-S31-HP-4629 | 31.6 Misc | User | Happy | All | -- | Phone verification code | Code verified | | | Security |
| ESTO-S31-HP-4630 | 31.6 Misc | User | Happy | All | -- | Phone verification expiry | Expiry enforced | | | Security |
| ESTO-S31-HP-4631 | 31.6 Misc | User | Happy | All | -- | CAPTCHA | CAPTCHA displayed | | | Security |
| ESTO-S31-HP-4632 | 31.6 Misc | User | Happy | All | -- | CAPTCHA solved | Solved correctly | | | Security |
| ESTO-S31-HP-4633 | 31.6 Misc | User | Happy | All | -- | CAPTCHA after N attempts | CAPTCHA required | | | Security |
| ESTO-S31-HP-4634 | 31.6 Misc | User | Happy | All | -- | Device fingerprinting | Device identified | | | Security |
| ESTO-S31-HP-4635 | 31.6 Misc | User | Happy | All | -- | Device trust | Trusted device | | | Security |
| ESTO-S31-HP-4636 | 31.6 Misc | User | Happy | All | -- | New device detection | New device flagged | | | Security |
| ESTO-S31-HP-4637 | 31.6 Misc | User | Happy | All | -- | Session timeout | Session expired | | | Security |
| ESTO-S31-HP-4638 | 31.6 Misc | User | Happy | All | -- | Session warning | Warning shown before expiry | | | Security |
| ESTO-S31-HP-4639 | 31.6 Misc | User | Happy | All | -- | Session extend | Session extended | | | Security |
| ESTO-S31-HP-4640 | 31.6 Misc | User | Happy | All | -- | Concurrent session limit | Limit enforced | | | Security |
| ESTO-S31-HP-4641 | 31.6 Misc | User | Happy | All | -- | Session invalidation on password change | Sessions invalidated | | | Security |
| ESTO-S31-HP-4642 | 31.6 Misc | User | Happy | All | -- | Session invalidation on 2FA change | Sessions invalidated | | | Security |
| ESTO-S31-HP-4643 | 31.6 Misc | User | Happy | All | -- | Remember me | Persistent session works | | | Security |
| ESTO-S31-HP-4644 | 31.6 Misc | User | Happy | All | -- | Remember me expiry | Expires correctly | | | Security |
| ESTO-S31-HP-4645 | 31.6 Misc | User | Happy | All | -- | Logout all sessions | All sessions terminated | | | Security |
| ESTO-S31-HP-4646 | 31.6 Misc | User | Happy | All | -- | Partial logout | Selective session logout | | | Security |
| ESTO-S31-HP-4647 | 31.6 Misc | User | Happy | All | -- | Token refresh | Token refreshed silently | | | Security |
| ESTO-S31-HP-4648 | 31.6 Misc | User | Happy | All | -- | Token refresh race | Race condition handled | | | Security |
| ESTO-S31-HP-4649 | 31.6 Misc | User | Happy | All | -- | Token refresh failure | Redirect to login | | | Security |
| ESTO-S31-HP-4650 | 31.6 Misc | User | Happy | All | -- | JWT blacklist | Revoked token blocked | | | Security |
| ESTO-S31-HP-4651 | 31.6 Misc | User | Happy | All | -- | JWT expiry | Expired token rejected | | | Security |
| ESTO-S31-HP-4652 | 31.6 Misc | User | Happy | All | -- | JWT signature verification | Invalid signature rejected | | | Security |
| ESTO-S31-HP-4653 | 31.6 Misc | User | Happy | All | -- | JWT algorithm | Algorithm enforced | | | Security |
| ESTO-S31-HP-4654 | 31.6 Misc | User | Happy | All | -- | JWT audience | Audience verified | | | Security |
| ESTO-S31-HP-4655 | 31.6 Misc | User | Happy | All | -- | JWT issuer | Issuer verified | | | Security |
| ESTO-S31-HP-4656 | 31.6 Misc | User | Happy | All | -- | JWT clock skew | Clock skew tolerated | | | Security |
| ESTO-S31-HP-4657 | 31.6 Misc | User | Happy | All | -- | JWT claims validation | Claims validated | | | Security |
| ESTO-S31-HP-4658 | 31.6 Misc | User | Happy | All | -- | JWT custom claims | Custom claims present | | | Security |
| ESTO-S31-HP-4659 | 31.6 Misc | User | Happy | All | -- | JWT scopes | Scopes enforced | | | Security |
| ESTO-S31-HP-4660 | 31.6 Misc | User | Happy | All | -- | JWT roles | Roles extracted from JWT | | | Security |
| ESTO-S31-HP-4661 | 31.6 Misc | User | Happy | All | -- | Refresh token rotation | Rotation applied | | | Security |
| ESTO-S31-HP-4662 | 31.6 Misc | User | Happy | All | -- | Refresh token reuse detection | Reuse detected and blocked | | | Security |
| ESTO-S31-HP-4663 | 31.6 Misc | User | Happy | All | -- | Refresh token family | Family tracked | | | Security |
| ESTO-S31-HP-4664 | 31.6 Misc | User | Happy | All | -- | Token revocation | Token revoked | | | Security |
| ESTO-S31-HP-4665 | 31.6 Misc | User | Happy | All | -- | Token introspection | Introspection works | | | Security |
| ESTO-S31-HP-4666 | 31.6 Misc | User | Happy | All | -- | Token debugging | Debug info shown | | | Security |
| ESTO-S31-HP-4667 | 31.6 Misc | User | Happy | All | -- | Secure defaults | Secure defaults applied | | | Security |
| ESTO-S31-HP-4668 | 31.6 Misc | User | Happy | All | -- | Opt-in features | Opt-in flow works | | | |
| ESTO-S31-HP-4669 | 31.6 Misc | User | Happy | All | -- | Opt-out features | Opt-out flow works | | | |
| ESTO-S31-HP-4670 | 31.6 Misc | User | Happy | All | -- | Feature preview | Preview mode works | | | |
| ESTO-S31-HP-4671 | 31.6 Misc | User | Happy | All | -- | Beta features | Beta features accessible | | | |
| ESTO-S31-HP-4672 | 31.6 Misc | User | Happy | All | -- | Beta opt-in | Opt-in recorded | | | |
| ESTO-S31-HP-4673 | 31.6 Misc | User | Happy | All | -- | Beta opt-out | Opt-out recorded | | | |
| ESTO-S31-HP-4674 | 31.6 Misc | User | Happy | All | -- | Beta feedback | Feedback submitted | | | |
| ESTO-S31-HP-4675 | 31.6 Misc | User | Happy | All | -- | Experiment enrollment | Enrolled in experiment | | | |
| ESTO-S31-HP-4676 | 31.6 Misc | User | Happy | All | -- | A/B test assignment | Variant assigned | | | |
| ESTO-S31-HP-4677 | 31.6 Misc | User | Happy | All | -- | A/B test consistency | Same variant on reload | | | |
| ESTO-S31-HP-4678 | 31.6 Misc | User | Happy | All | -- | A/B test opt-out | Excluded from test | | | |
| ESTO-S31-HP-4679 | 31.6 Misc | User | Happy | All | -- | Canary release | Canary features work | | | |
| ESTO-S31-HP-4680 | 31.6 Misc | User | Happy | All | -- | Gradual rollout | Rollout works | | | |
| ESTO-S31-HP-4681 | 31.6 Misc | User | Happy | All | -- | Feature flag rollback | Rollback works | | | |
| ESTO-S31-HP-4682 | 31.6 Misc | User | Happy | All | -- | Dark mode toggle | Toggle works | | | |
| ESTO-S31-HP-4683 | 31.6 Misc | User | Happy | All | -- | Dark mode persists | Dark mode persists | | | |
| ESTO-S31-HP-4684 | 31.6 Misc | User | Happy | All | -- | System dark mode | System preference used | | | |
| ESTO-S31-HP-4685 | 31.6 Misc | User | Happy | All | -- | OS-level font size | App respects OS font size | | | A11y |
| ESTO-S31-HP-4686 | 31.6 Misc | User | Happy | All | -- | OS-level reduced motion | App respects setting | | | A11y |
| ESTO-S31-HP-4687 | 31.6 Misc | User | Happy | All | -- | OS-level high contrast | App respects setting | | | A11y |
| ESTO-S31-HP-4688 | 31.6 Misc | User | Happy | All | -- | OS-level color filter | App adapts | | | A11y |
| ESTO-S31-HP-4689 | 31.6 Misc | User | Happy | All | -- | Screen reader navigation | Navigation works | | | A11y |
| ESTO-S31-HP-4690 | 31.6 Misc | User | Happy | All | -- | VoiceOver (iOS) | VoiceOver works | | | A11y |
| ESTO-S31-HP-4691 | 31.6 Misc | User | Happy | All | -- | TalkBack (Android) | TalkBack works | | | A11y |
| ESTO-S31-HP-4692 | 31.6 Misc | User | Happy | All | -- | Narrator (Windows) | Narrator works | | | A11y |
| ESTO-S31-HP-4693 | 31.6 Misc | User | Happy | All | -- | NVDA | NVDA works | | | A11y |
| ESTO-S31-HP-4694 | 31.6 Misc | User | Happy | All | -- | JAWS | JAWS works | | | A11y |
| ESTO-S31-HP-4695 | 31.6 Misc | User | Happy | All | -- | Orca (Linux) | Orca works | | | A11y |
| ESTO-S31-HP-4696 | 31.6 Misc | User | Happy | All | -- | ZoomText | ZoomText compatible | | | A11y |
| ESTO-S31-HP-4697 | 31.6 Misc | User | Happy | All | -- | Dragon NaturallySpeaking | Dragon compatible | | | A11y |
| ESTO-S31-HP-4698 | 31.6 Misc | User | Happy | All | -- | Switch device | Switch device compatible | | | A11y |
| ESTO-S31-HP-4699 | 31.6 Misc | User | Happy | All | -- | Eye tracking | Eye tracking compatible | | | A11y |
| ESTO-S31-HP-4700 | 31.6 Misc | User | Happy | All | -- | Head tracking | Head tracking compatible | | | A11y |
| ESTO-S31-HP-4701 | 31.6 Misc | User | Happy | All | -- | Brain-computer interface | BCI compatible | | | A11y |
| ESTO-S31-HP-4702 | 31.6 Misc | User | Happy | All | -- | Alternative input | Alternative input works | | | A11y |
| ESTO-S31-HP-4703 | 31.6 Misc | User | Happy | All | -- | Sticky keys | Sticky keys work | | | A11y |
| ESTO-S31-HP-4704 | 31.6 Misc | User | Happy | All | -- | Filter keys | Filter keys work | | | A11y |
| ESTO-S31-HP-4705 | 31.6 Misc | User | Happy | All | -- | Toggle keys | Toggle keys work | | | A11y |
| ESTO-S31-HP-4706 | 31.6 Misc | User | Happy | All | -- | Mouse keys | Mouse keys work | | | A11y |
| ESTO-S31-HP-4707 | 31.6 Misc | User | Happy | All | -- | Serial keys | Serial keys work | | | A11y |
| ESTO-S31-HP-4708 | 31.6 Misc | User | Happy | All | -- | Bounce keys | Bounce keys work | | | A11y |
| ESTO-S31-HP-4709 | 31.6 Misc | User | Happy | All | -- | Repeat keys | Repeat keys work | | | A11y |
| ESTO-S31-HP-4710 | 31.6 Misc | User | Happy | All | -- | Slow keys | Slow keys work | | | A11y |
| ESTO-S31-EM-4711 | 31.6 Misc | User | Empty | All | -- | View page with no content | Empty state displayed | | | |
| ESTO-S31-ER-4712 | 31.6 Misc | User | Error | All | -- | Browser unsupported | Upgrade browser message | | | |
| ESTO-S31-ER-4713 | 31.6 Misc | User | Error | All | -- | JavaScript disabled | JS required message | | | |
| ESTO-S31-ER-4714 | 31.6 Misc | User | Error | All | -- | Cookies disabled | Cookies required message | | | |
| ESTO-S31-ER-4715 | 31.6 Misc | User | Error | All | -- | LocalStorage blocked | Storage required message | | | |
| ESTO-S31-ER-4716 | 31.6 Misc | User | Error | All | -- | Service worker blocked | SW required message | | | |
| ESTO-S31-ER-4717 | 31.6 Misc | User | Error | All | -- | WebSocket blocked | WS fallback to polling | | | |
| ESTO-S31-ER-4718 | 31.6 Misc | User | Error | All | -- | Geolocation denied | Graceful degradation | | | |
| ESTO-S31-ER-4719 | 31.6 Misc | User | Error | All | -- | Camera denied | Graceful degradation | | | |
| ESTO-S31-ER-4720 | 31.6 Misc | User | Error | All | -- | Microphone denied | Graceful degradation | | | |
| ESTO-S31-ER-4721 | 31.6 Misc | User | Error | All | -- | Notification denied | Graceful degradation | | | |
| ESTO-S31-ER-4722 | 31.6 Misc | User | Error | All | -- | Clipboard denied | Graceful degradation | | | |
| ESTO-S31-ER-4723 | 31.6 Misc | User | Error | All | -- | API deprecated | Fallback works | | | |
| ESTO-S31-ER-4724 | 31.6 Misc | User | Error | All | -- | API removed | Polyfill or fallback | | | |
| ESTO-S31-ER-4725 | 31.6 Misc | User | Error | All | -- | Runtime error | Error boundary catches | | | |
| ESTO-S31-ER-4726 | 31.6 Misc | User | Error | All | -- | Unhandled promise rejection | Caught; error shown | | | |
| ESTO-S31-ER-4727 | 31.6 Misc | User | Error | All | -- | Memory pressure | GC runs; app survives | | | |
| ESTO-S31-ER-4728 | 31.6 Misc | User | Error | All | -- | Low disk space | Warning shown | | | |
| ESTO-S31-ER-4729 | 31.6 Misc | User | Error | All | -- | Battery saver mode | Reduced functionality | | | |
| ESTO-S31-ER-4730 | 31.6 Misc | User | Error | All | -- | Data saver mode | Reduced data usage | | | |
| ESTO-S31-ED-4731 | 31.6 Misc | User | Edge | All | 1000 open tabs | App in background | Background sync works | | | |
| ESTO-S31-ED-4732 | 31.6 Misc | User | Edge | All | Very long URL | URL exceeds limit | URL truncated or error | | | |
| ESTO-S31-ED-4733 | 31.6 Misc | User | Edge | All | Very long search query | Search handles long query | Query processed | | | |
| ESTO-S31-ED-4734 | 31.6 Misc | User | Edge | All | Very long form input | Form handles long input | Input processed | | | |
| ESTO-S31-ED-4735 | 31.6 Misc | User | Edge | All | Very long file name | Upload handles long name | File uploaded | | | |
| ESTO-S31-ED-4736 | 31.6 Misc | User | Edge | All | Special characters in input | Input handled correctly | Special chars preserved | | | |
| ESTO-S31-ED-4737 | 31.6 Misc | User | Edge | All | Emoji in all fields | Emoji handled | Emoji displayed | | | |
| ESTO-S31-ED-4738 | 31.6 Misc | User | Edge | All | RTL text in LTR locale | RTL handled | Text renders correctly | | | |
| ESTO-S31-ED-4739 | 31.6 Misc | User | Edge | All | Mixed LTR/RTL text | Mixed text handled | Text renders correctly | | | |
| ESTO-S31-ED-4740 | 31.6 Misc | User | Edge | All | Zero-width characters | Handled correctly | No visual artifact | | | |
| ESTO-S31-ED-4741 | 31.6 Misc | User | Edge | All | Control characters | Stripped or escaped | Input sanitized | | | |
| ESTO-S31-ED-4742 | 31.6 Misc | User | Edge | All | Unicode emoji | All emoji render | Emoji displayed | | | |
| ESTO-S31-ED-4743 | 31.6 Misc | User | Edge | All | ZWJ sequences | Emoji ZWJ works | Emoji displayed | | | |
| ESTO-S31-ED-4744 | 31.6 Misc | User | Edge | All | Skin tone modifiers | Emoji with skin tone works | Emoji displayed | | | |
| ESTO-S31-ED-4745 | 31.6 Misc | User | Edge | All | Regional indicators | Flag emoji works | Emoji displayed | | | |
| ESTO-S31-ED-4746 | 31.6 Misc | User | Edge | All | Very long emoji sequence | Handled | Sequence displayed | | | |
| ESTO-S31-ED-4747 | 31.6 Misc | User | Edge | All | Surrogate pairs | Handled correctly | Text displayed | | | |
| ESTO-S31-ED-4748 | 31.6 Misc | User | Edge | All | Combining characters | Handled correctly | Text displayed | | | |
| ESTO-S31-ED-4749 | 31.6 Misc | User | Edge | All | Normalization forms | NFC/NFD handled | Text normalized | | | |
| ESTO-S31-ED-4750 | 31.6 Misc | User | Edge | All | Case folding | Case folding works | Text compared correctly | | | |
| ESTO-S31-ED-4751 | 31.6 Misc | User | Edge | All | Locale collation | Collation correct | Sorted correctly | | | |
| ESTO-S31-ED-4752 | 31.6 Misc | User | Edge | All | Text direction | Auto-detected | Direction correct | | | |
| ESTO-S31-ED-4753 | 31.6 Misc | User | Edge | All | Bi-directional text | Bi-di algorithm works | Text renders correctly | | | |
| ESTO-S31-ED-4754 | 31.6 Misc | User | Edge | All | Complex scripts | Devanagari renders | Text renders correctly | | | |
| ESTO-S31-ED-4755 | 31.6 Misc | User | Edge | All | CJK text | Chinese/Japanese/Korean renders | Text renders correctly | | | |
| ESTO-S31-ED-4756 | 31.6 Misc | User | Edge | All | Thai text | Thai renders | Text renders correctly | | | |
| ESTO-S31-ED-4757 | 31.6 Misc | User | Edge | All | Arabic text | Arabic renders with shaping | Text renders correctly | | | |
| ESTO-S31-ED-4758 | 31.6 Misc | User | Edge | All | Hebrew text | Hebrew renders RTL | Text renders correctly | | | |
| ESTO-S31-ED-4759 | 31.6 Misc | User | Edge | All | Complex text layout | CTL works | Text renders correctly | | | |
| ESTO-S31-ED-4760 | 31.6 Misc | User | Edge | All | Font fallback | Fallback font used | Text readable | | | |
| ESTO-S31-ED-4761 | 31.6 Misc | User | Edge | All | Missing font glyph | Fallback glyph used | Glyph displayed | | | |
| ESTO-S31-ED-4762 | 31.6 Misc | User | Edge | All | System font stack | System fonts used | Fonts render correctly | | | |
| ESTO-S31-ED-4763 | 31.6 Misc | User | Edge | All | Custom font | Custom font loaded | Font applied | | | |
| ESTO-S31-ED-4764 | 31.6 Misc | User | Edge | All | Font loading failure | Fallback font | Fallback font used | | | |
| ESTO-S31-ED-4765 | 31.6 Misc | User | Edge | All | Font loading FOUT | FOUT minimized | No flash | | | |
| ESTO-S31-ED-4766 | 31.6 Misc | User | Edge | All | Font loading FOIT | FOIT minimized | Text visible quickly | | | |
| ESTO-S31-ED-4767 | 31.6 Misc | User | Edge | All | Variable fonts | Variable font works | Font renders | | | |
| ESTO-S31-ED-4768 | 31.6 Misc | User | Edge | All | Color fonts | Color font works | Emoji font renders | | | |
| ESTO-S31-ED-4769 | 31.6 Misc | User | Edge | All | OpenType features | OpenType works | Features applied | | | |
| ESTO-S31-ED-4770 | 31.6 Misc | User | Edge | All | Text shaping | Text shaping works | Text renders correctly | | | |
| ESTO-S31-ED-4771 | 31.6 Misc | User | Edge | All | Line breaking | Line breaks correct | Text wraps correctly | | | |
| ESTO-S31-ED-4772 | 31.6 Misc | User | Edge | All | Hyphenation | Hyphenation works | Words hyphenated | | | |
| ESTO-S31-ED-4773 | 31.6 Misc | User | Edge | All | Justification | Text justified | Justified correctly | | | |
| ESTO-S31-ED-4774 | 31.6 Misc | User | Edge | All | Text decoration | Decoration applied | Lines visible | | | |
| ESTO-S31-ED-4775 | 31.6 Misc | User | Edge | All | Text transform | Transform applied | Text transformed | | | |
| ESTO-S31-ED-4776 | 31.6 Misc | User | Edge | All | Text shadow | Shadow applied | Shadow visible | | | |
| ESTO-S31-ED-4777 | 31.6 Misc | User | Edge | All | Text overflow | Overflow handled | Ellipsis or wrap | | | |
| ESTO-S31-ED-4778 | 31.6 Misc | User | Edge | All | White space | White space handled | Text formatted | | | |
| ESTO-S31-ED-4779 | 31.6 Misc | User | Edge | All | Word break | Word break handled | Break at correct point | | | |
| ESTO-S31-ED-4780 | 31.6 Misc | User | Edge | All | Overflow wrap | Wrap applied | Text wraps | | | |
| ESTO-S31-ED-4781 | 31.6 Misc | User | Edge | All | Tab size | Tab size correct | Tabs display correctly | | | |
| ESTO-S31-ED-4782 | 31.6 Misc | User | Edge | All | Line height | Line height correct | Text readable | | | |
| ESTO-S31-ED-4783 | 31.6 Misc | User | Edge | All | Letter spacing | Spacing correct | Text readable | | | |
| ESTO-S31-ED-4784 | 31.6 Misc | User | Edge | All | Word spacing | Spacing correct | Text readable | | | |
| ESTO-S31-ED-4785 | 31.6 Misc | User | Edge | All | Text indent | Indent correct | Text indented | | | |
| ESTO-S31-ED-4786 | 31.6 Misc | User | Edge | All | Vertical align | Alignment correct | Text aligned | | | |
| ESTO-S31-ED-4787 | 31.6 Misc | User | Edge | All | Text align last | Last line aligned | Text aligned | | | |
| ESTO-S31-ED-4788 | 31.6 Misc | User | Edge | All | Text orientation | Orientation correct | Text oriented correctly | | | |
| ESTO-S31-ED-4789 | 31.6 Misc | User | Edge | All | Writing mode | Writing mode correct | Text in correct mode | | | |
| ESTO-S31-ED-4790 | 31.6 Misc | User | Edge | All | Text combine | Combine applied | Combined text rendered | | | |
| ESTO-S31-ED-4791 | 31.6 Misc | User | Edge | All | Text emoji | Emoji rendered | Emoji displayed | | | |
| ESTO-S31-ED-4792 | 31.6 Misc | User | Edge | All | Emoji presentation | Presentation correct | Correct emoji style | | | |
| ESTO-S31-ED-4793 | 31.6 Misc | User | Edge | All | Emoji zwj sequences | ZWJ sequence rendered | Combined emoji shown | | | |
| ESTO-S31-ED-4794 | 31.6 Misc | User | Edge | All | Emoji modifiers | Modifier applied | Modified emoji shown | | | |
| ESTO-S31-ED-4795 | 31.6 Misc | User | Edge | All | Emoji flags | Flag displayed | Flag emoji shown | | | |
| ESTO-S31-ED-4796 | 31.6 Misc | User | Edge | All | Emoji keycaps | Keycap displayed | Keycap emoji shown | | | |
| ESTO-S31-ED-4797 | 31.6 Misc | User | Edge | All | Emoji tags | Tags displayed | Tag emoji shown | | | |
| ESTO-S31-ED-4798 | 31.6 Misc | User | Edge | All | Emoji component | Component displayed | Component emoji shown | | | |
| ESTO-S31-ED-4799 | 31.6 Misc | User | Edge | All | New emoji | New emoji renders | Emoji displayed | | | |
| ESTO-S31-ED-4800 | 31.6 Misc | User | Edge | All | Deprecated emoji | Deprecated emoji shown | Fallback displayed | | | |
| ESTO-S31-ED-4801 | 31.6 Misc | User | Edge | All | Emoji in password | Emoji allowed in password | Password accepted | | | |
| ESTO-S31-ED-4802 | 31.6 Misc | User | Edge | All | Emoji in search | Emoji search works | Results returned | | | |
| ESTO-S31-ED-4803 | 31.6 Misc | User | Edge | All | Emoji in message | Emoji in message works | Emoji displayed | | | |
| ESTO-S31-ED-4804 | 31.6 Misc | User | Edge | All | Emoji in filename | Emoji filename works | File uploaded | | | |
| ESTO-S31-ED-4805 | 31.6 Misc | User | Edge | All | Emoji in URL | Emoji in URL works | URL works | | | |
| ESTO-S31-ED-4806 | 31.6 Misc | User | Edge | All | Emoji in email | Emoji in email works | Email sent | | | |
| ESTO-S31-ED-4807 | 31.6 Misc | User | Edge | All | Emoji in notes | Emoji in notes works | Notes saved | | | |
| ESTO-S31-ED-4808 | 31.6 Misc | User | Edge | All | Emoji in comments | Emoji in comments works | Comments saved | | | |
| ESTO-S31-ED-4809 | 31.6 Misc | User | Edge | All | Emoji in review | Emoji in review works | Review saved | | | |
| ESTO-S31-ED-4810 | 31.6 Misc | User | Edge | All | Emoji in chat | Emoji in chat works | Chat message sent | | | |
| ESTO-S31-ED-4811 | 31.6 Misc | User | Edge | All | Emoji reactions | Emoji reactions work | Reactions displayed | | | |
| ESTO-S31-ED-4812 | 31.6 Misc | User | Edge | All | Emoji picker | Picker works | Emoji selected | | | |
| ESTO-S31-ED-4813 | 31.6 Misc | User | Edge | All | Emoji skin tone picker | Skin tone selected | Tone applied | | | |
| ESTO-S31-ED-4814 | 31.6 Misc | User | Edge | All | Emoji recently used | Recent emoji shown | Recent emoji displayed | | | |
| ESTO-S31-ED-4815 | 31.6 Misc | User | Edge | All | Emoji categories | Categories shown | Categories displayed | | | |
| ESTO-S31-ED-4816 | 31.6 Misc | User | Edge | All | Emoji search | Emoji search works | Search results shown | | | |
| ESTO-S31-ED-4817 | 31.6 Misc | User | Edge | All | Emoji skin tone default | Default skin tone | Correct default | | | |
| ESTO-S31-ED-4818 | 31.6 Misc | User | Edge | All | Emoji platform consistency | Consistent across platforms | Emoji consistent | | | |
| ESTO-S31-ED-4819 | 31.6 Misc | User | Edge | All | Emoji accessibility | Screen reader reads emoji | Description announced | | | A11y |
| ESTO-S31-ED-4820 | 31.6 Misc | User | Edge | All | Emoji in alt text | Alt text with emoji works | Emoji in alt read | | | A11y |
| ESTO-S31-ED-4821 | 31.6 Misc | User | Edge | All | Emoji in button | Emoji button label | Label read correctly | | | A11y |
| ESTO-S31-ED-4822 | 31.6 Misc | User | Edge | All | Emoji sanitization | Emoji in search sanitized | Safe search | | | Security |
| ESTO-S31-ED-4823 | 31.6 Misc | User | Edge | All | Emoji injection | Emoji in URL | URL encoded | | | Security |
| ESTO-S31-ED-4824 | 31.6 Misc | User | Edge | All | Multi-byte emoji | Emoji counted correctly | Count correct | | | |
| ESTO-S31-ED-4825 | 31.6 Misc | User | Edge | All | Emoji in notification | Emoji notification works | Notification with emoji | | | |
| ESTO-S31-ED-4826 | 31.6 Misc | User | Edge | All | Emoji in email subject | Subject with emoji | Subject with emoji sent | | | |
| ESTO-S31-ED-4827 | 31.6 Misc | User | Edge | All | Emoji in SMS | SMS with emoji | SMS with emoji sent | | | |
| ESTO-S31-ED-4828 | 31.6 Misc | User | Edge | All | Emoji in push | Push with emoji | Push with emoji displayed | | | |
| ESTO-S31-ED-4829 | 31.6 Misc | User | Edge | All | Emoji in filename | Emoji filename | Filename with emoji works | | | |
| ESTO-S31-ED-4830 | 31.6 Misc | User | Edge | All | Emoji in URL params | Params with emoji | Params work | | | |
| ESTO-S31-ED-4831 | 31.6 Misc | User | Edge | All | Emoji in JSON | JSON with emoji | JSON parsed correctly | | | |
| ESTO-S31-ED-4832 | 31.6 Misc | User | Edge | All | Emoji in XML | XML with emoji | XML parsed correctly | | | |
| ESTO-S31-ED-4833 | 31.6 Misc | User | Edge | All | Emoji in CSV | CSV with emoji | CSV parsed correctly | | | |
| ESTO-S31-ED-4834 | 31.6 Misc | User | Edge | All | Emoji in markdown | Markdown with emoji | Rendered correctly | | | |
| ESTO-S31-ED-4835 | 31.6 Misc | User | Edge | All | Emoji in HTML | HTML with emoji | Rendered correctly | | | |
| ESTO-S31-ED-4836 | 31.6 Misc | User | Edge | All | Emoji in CSS | CSS with emoji | Rendered correctly | | | |
| ESTO-S31-ED-4837 | 31.6 Misc | User | Edge | All | Emoji in JS string | JS with emoji | Executed correctly | | | |
| ESTO-S31-ED-4838 | 31.6 Misc | User | Edge | All | Emoji in SQL | SQL with emoji | Query works | | | |
| ESTO-S31-ED-4839 | 31.6 Misc | User | Edge | All | Emoji in regex | Regex with emoji | Pattern works | | | |
| ESTO-S31-ED-4840 | 31.6 Misc | User | Edge | All | Emoji in log | Log with emoji | Log written | | | |
| ESTO-S31-ED-4841 | 31.6 Misc | User | Edge | All | Emoji in error message | Error with emoji | Error shown | | | |
| ESTO-S31-ED-4842 | 31.6 Misc | User | Edge | All | Emoji in success message | Success with emoji | Message shown | | | |
| ESTO-S31-ED-4843 | 31.6 Misc | User | Edge | All | Emoji in tooltip | Tooltip with emoji | Tooltip correct | | | |
| ESTO-S31-ED-4844 | 31.6 Misc | User | Edge | All | Emoji in placeholder | Placeholder with emoji | Placeholder correct | | | |
| ESTO-S31-ED-4845 | 31.6 Misc | User | Edge | All | Emoji in title | Title with emoji | Title correct | | | |
| ESTO-S31-ED-4846 | 31.6 Misc | User | Edge | All | Emoji in meta | Meta with emoji | Meta correct | | | |
| ESTO-S31-ED-4847 | 31.6 Misc | User | Edge | All | Emoji in breadcrumb | Breadcrumb with emoji | Breadcrumb correct | | | |
| ESTO-S31-ED-4848 | 31.6 Misc | User | Edge | All | Emoji in tabs | Tab with emoji | Tab correct | | | |
| ESTO-S31-ED-4849 | 31.6 Misc | User | Edge | All | Emoji in accordion | Accordion with emoji | Accordion correct | | | |
| ESTO-S31-ED-4850 | 31.6 Misc | User | Edge | All | Emoji in dropdown | Dropdown with emoji | Dropdown correct | | | |
| ESTO-S31-EM-4851 | 31.6 Misc | User | Empty | All | -- | View all sections with no data | All empty states handled | | | |
| ESTO-S31-ER-4852 | 31.6 Misc | User | Error | All | Browser crash | App recovers | State preserved | | | |
| ESTO-S31-ER-4853 | 31.6 Misc | User | Error | All | Tab killed | App restores | State restored | | | |
| ESTO-S31-ER-4854 | 31.6 Misc | User | Error | All | Service worker error | Fallback to network | Network used | | | |
| ESTO-S31-ER-4855 | 31.6 Misc | User | Error | All | -- | XSS in any field | XSS blocked | | | Security |
| ESTO-S31-ER-4856 | 31.6 Misc | User | Error | All | -- | SQL injection anywhere | Injection blocked | | | Security |
| ESTO-S31-ER-4857 | 31.6 Misc | User | Error | All | -- | CSRF anywhere | CSRF blocked | | | Security |
| ESTO-S31-ER-4858 | 31.6 Misc | User | Error | All | -- | Path traversal anywhere | Traversal blocked | | | Security |
| ESTO-S31-ER-4859 | 31.6 Misc | User | Error | All | -- | SSRF anywhere | SSRF blocked | | | Security |
| ESTO-S31-ER-4860 | 31.6 Misc | User | Error | All | -- | XXE anywhere | XXE blocked | | | Security |
| ESTO-S31-ER-4861 | 31.6 Misc | User | Error | All | -- | Command injection | Injection blocked | | | Security |
| ESTO-S31-ER-4862 | 31.6 Misc | User | Error | All | -- | LDAP injection | Injection blocked | | | Security |
| ESTO-S31-ER-4863 | 31.6 Misc | User | Error | All | -- | Template injection | Injection blocked | | | Security |
| ESTO-S31-ER-4864 | 31.6 Misc | User | Error | All | -- | Code injection | Injection blocked | | | Security |
| ESTO-S31-ER-4865 | 31.6 Misc | User | Error | All | -- | Header injection | Injection blocked | | | Security |
| ESTO-S31-ER-4866 | 31.6 Misc | User | Error | All | -- | Host header injection | Injection blocked | | | Security |
| ESTO-S31-ER-4867 | 31.6 Misc | User | Error | All | -- | Open redirect | Redirect blocked | | | Security |
| ESTO-S31-ER-4868 | 31.6 Misc | User | Error | All | -- | SSRF via URL param | SSRF blocked | | | Security |
| ESTO-S31-ER-4869 | 31.6 Misc | User | Error | All | -- | Deserialization attack | Deserialization blocked | | | Security |
| ESTO-S31-ER-4870 | 31.6 Misc | User | Error | All | -- | Prototype pollution | Pollution blocked | | | Security |
| ESTO-S31-ED-4871 | 31.6 Misc | User | Edge | All | 10000 items | Scroll through list | Smooth performance | | | |
| ESTO-S31-ED-4872 | 31.6 Misc | User | Edge | All | Deep link with many params | Deep link works | Params processed | | | |
| ESTO-S31-ED-4873 | 31.6 Misc | User | Edge | All | Very long session | App stable | No crashes | | | |
| ESTO-S31-ED-4874 | 31.6 Misc | User | Edge | All | Multiple concurrent operations | All complete | All operations succeed | | | |
| ESTO-S31-ED-4875 | 31.6 Misc | User | Edge | All | Network flaps | App recovers | Reconnection successful | | | |
| ESTO-S31-CR-4876 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin views all user sessions | All sessions visible | | | Security |
| ESTO-S31-CR-4877 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin revokes user token | Token revoked | | | Security |
| ESTO-S31-CR-4878 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin forces password reset | User must reset | | | Security |
| ESTO-S31-CR-4879 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin locks user account | Account locked | | | Security |
| ESTO-S31-CR-4880 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin unlocks user account | Account unlocked | | | Security |
| ESTO-S31-CR-4881 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin impersonates user | Admin sees user view | | | Security |
| ESTO-S31-CR-4882 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin stops impersonating | Admin view restored | | | Security |
| ESTO-S31-CR-4883 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin sends test notification | User receives notification | | | |
| ESTO-S31-CR-4884 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin triggers password reset | Reset email sent | | | Security |
| ESTO-S31-CR-4885 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin enables maintenance | Users see maintenance page | | | |
| ESTO-S31-CR-4886 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin disables maintenance | Normal service resumes | | | |
| ESTO-S31-CR-4887 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin exports user data | Data exported | | | Privacy |
| ESTO-S31-CR-4888 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin deletes user data | Data deleted | | | Privacy |
| ESTO-S31-CR-4889 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin anonymizes user | User anonymized | | | Privacy |
| ESTO-S31-CR-4890 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin configures platform; User notices changes | Changes visible to user | | | |
| ESTO-S31-CR-4891 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin configures region; User sees localized content | Localization correct | | | I18N |
| ESTO-S31-CR-4892 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin sets pricing; Manager sees in dashboard | Pricing displayed | | | |
| ESTO-S31-CR-4893 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin changes commission rate; calculations update | Commission updated | | | |
| ESTO-S31-CR-4894 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin configures referral program; users see program | Program visible | | | |
| ESTO-S31-CR-4895 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin launches campaign; users see campaign | Campaign visible | | | |
| ESTO-S31-CR-4896 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin ends campaign; users no longer see | Campaign removed | | | |
| ESTO-S31-CR-4897 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin audits cross-role access | Audit logged | | | Security |
| ESTO-S31-CR-4898 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin enables/disables features per role | Features correct per role | | | |
| ESTO-S31-CR-4899 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin sets global defaults; all users see | Defaults applied | | | |
| ESTO-S31-CR-4900 | 31.6 Misc | Admin | Cross-Role | All | -- | Admin rolls back platform change | Rollback successful | | | |

## Section 32: Platform-Wide Integration & E2E Scenarios (100)

### 32.1 End-to-End User Journeys (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S32-HP-4901 | 32.1 E2E | User | Happy | All | New user | Complete onboarding | Onboarding complete | | | E2E |
| ESTO-S32-HP-4902 | 32.1 E2E | User | Happy | All | Onboarded | Browse properties | Properties browsed | | | E2E |
| ESTO-S32-HP-4903 | 32.1 E2E | User | Happy | All | Property found | Book property | Booking confirmed | | | E2E |
| ESTO-S32-HP-4904 | 32.1 E2E | User | Happy | All | Booking made | Make payment | Payment confirmed | | | E2E |
| ESTO-S32-HP-4905 | 32.1 E2E | User | Happy | All | Payment done | Receive confirmation | Email and notification | | | E2E |
| ESTO-S32-HP-4906 | 32.1 E2E | User | Happy | All | Booking confirmed | Attend appointment | Appointment completed | | | E2E |
| ESTO-S32-HP-4907 | 32.1 E2E | User | Happy | All | Move-in done | Leave review | Review published | | | E2E |
| ESTO-S32-HP-4908 | 32.1 E2E | User | Happy | All | Reviewed | Refer friend | Referral sent | | | E2E |
| ESTO-S32-HP-4909 | 32.1 E2E | User | Happy | All | Friend referred | Friend signs up | Referral credited | | | E2E |
| ESTO-S32-HP-4910 | 32.1 E2E | User | Happy | All | Referral credited | View rewards | Rewards displayed | | | E2E |
| ESTO-S32-HP-4911 | 32.1 E2E | User | Happy | All | Booking done | Submit Fast Track | FT submitted | | | E2E |
| ESTO-S32-HP-4912 | 32.1 E2E | User | Happy | All | FT submitted | Check FT status | Status updated | | | E2E |
| ESTO-S32-HP-4913 | 32.1 E2E | User | Happy | All | FT approved | Sign contract | Contract signed | | | E2E |
| ESTO-S32-HP-4914 | 32.1 E2E | User | Happy | All | Contract signed | Complete move-in | Move-in confirmed | | | E2E |
| ESTO-S32-HP-4915 | 32.1 E2E | User | Happy | All | Move-in done | Contact support | Support ticket created | | | E2E |
| ESTO-S32-HP-4916 | 32.1 E2E | User | Happy | All | Support ticket | Receive support response | Response received | | | E2E |
| ESTO-S32-HP-4917 | 32.1 E2E | User | Happy | All | Issue resolved | Close ticket | Ticket closed | | | E2E |
| ESTO-S32-HP-4918 | 32.1 E2E | User | Happy | All | Agent contacted | Chat with agent | Chat completed | | | E2E |
| ESTO-S32-HP-4919 | 32.1 E2E | User | Happy | All | Agent found | Schedule viewing | Viewing scheduled | | | E2E |
| ESTO-S32-HP-4920 | 32.1 E2E | User | Happy | All | Viewing done | Negotiate price | Price negotiated | | | E2E |
| ESTO-S32-HP-4921 | 32.1 E2E | User | Happy | All | Price negotiated | Finalize deal | Deal finalized | | | E2E |
| ESTO-S32-HP-4922 | 32.1 E2E | Manager | Happy | All | Manager onboarded | List property | Property listed | | | E2E |
| ESTO-S32-HP-4923 | 32.1 E2E | Manager | Happy | All | Property listed | Receive inquiry | Inquiry received | | | E2E |
| ESTO-S32-HP-4924 | 32.1 E2E | Manager | Happy | All | Inquiry received | Respond to inquiry | Response sent | | | E2E |
| ESTO-S32-HP-4925 | 32.1 E2E | Manager | Happy | All | Viewing scheduled | Complete viewing | Viewing done | | | E2E |
| ESTO-S32-HP-4926 | 32.1 E2E | Manager | Happy | All | Deal closed | Receive payment | Payment received | | | E2E |
| ESTO-S32-HP-4927 | 32.1 E2E | Manager | Happy | All | Payment received | Manage property | Property managed | | | E2E |
| ESTO-S32-HP-4928 | 32.1 E2E | Manager | Happy | All | Tenant living | Collect rent | Rent collected | | | E2E |
| ESTO-S32-HP-4929 | 32.1 E2E | Manager | Happy | All | Tenant issue | Resolve issue | Issue resolved | | | E2E |
| ESTO-S32-HP-4930 | 32.1 E2E | Manager | Happy | All | Lease ended | Return deposit | Deposit returned | | | E2E |
| ESTO-S32-HP-4931 | 32.1 E2E | Manager | Happy | All | Broker joined | Approve broker | Broker approved | | | E2E |
| ESTO-S32-HP-4932 | 32.1 E2E | Manager | Happy | All | Broker approved | Broker brings leads | Leads received | | | E2E |
| ESTO-S32-HP-4933 | 32.1 E2E | Manager | Happy | All | Leads received | Convert lead | Lead converted | | | E2E |
| ESTO-S32-HP-4934 | 32.1 E2E | Manager | Happy | All | Lead converted | Commission paid | Commission processed | | | E2E |
| ESTO-S32-HP-4935 | 32.1 E2E | Manager | Happy | All | Admin | Manage platform users | Users managed | | | E2E |
| ESTO-S32-HP-4936 | 32.1 E2E | Admin | Happy | All | Admin | Resolve disputes | Disputes resolved | | | E2E |
| ESTO-S32-HP-4937 | 32.1 E2E | Admin | Happy | All | Admin | Generate reports | Reports generated | | | E2E |
| ESTO-S32-HP-4938 | 32.1 E2E | Admin | Happy | All | Admin | Platform health check | Health verified | | | E2E |
| ESTO-S32-HP-4939 | 32.1 E2E | Admin | Happy | All | Admin | Approve managers | Managers approved | | | E2E |
| ESTO-S32-HP-4940 | 32.1 E2E | Admin | Happy | All | Admin | Review appeals | Appeals reviewed | | | E2E |
| ESTO-S32-EM-4941 | 32.1 E2E | User | Empty | All | -- | Complete journey with no properties | Empty state handled | | | E2E |
| ESTO-S32-ER-4942 | 32.1 E2E | User | Error | All | Service down during booking | Booking fails gracefully | Error; retry option | | | E2E |
| ESTO-S32-ER-4943 | 32.1 E2E | User | Error | All | Payment fails | Retry payment | Retry works | | | E2E |
| ESTO-S32-ER-4944 | 32.1 E2E | User | Error | All | Network lost | App works offline | Offline mode active | | | E2E |
| ESTO-S32-ER-4945 | 32.1 E2E | User | Error | All | -- | Complete journey with injected errors | Errors handled | | | E2E |
| ESTO-S32-ED-4946 | 32.1 E2E | User | Edge | All | Concurrent operations | All complete correctly | Operations succeed | | | E2E |
| ESTO-S32-ED-4947 | 32.1 E2E | User | Edge | All | 1000 properties | Browse all | All browsed | | | E2E |
| ESTO-S32-ED-4948 | 32.1 E2E | User | Edge | All | 100 bookings | Manage all bookings | All managed | | | E2E |
| ESTO-S32-ED-4949 | 32.1 E2E | User | Edge | All | 1000 messages | Chat works | Chat functional | | | E2E |
| ESTO-S32-ED-4950 | 32.1 E2E | User | Edge | All | 100 reviews | Submit reviews | All submitted | | | E2E |

### 32.2 Cross-Service Integration & Data Consistency (50)

| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ESTO-S32-HP-4951 | 32.2 Cross | Admin | Happy | All | All services | End-to-end data flow | Data flows correctly | | | E2E |
| ESTO-S32-HP-4952 | 32.2 Cross | Admin | Happy | All | Booking made | Property count updated | Count correct | | | E2E |
| ESTO-S32-HP-4953 | 32.2 Cross | Admin | Happy | All | Booking cancelled | Property available | Property available | | | E2E |
| ESTO-S32-HP-4954 | 32.2 Cross | Admin | Happy | All | Review submitted | Property rating updated | Rating updated | | | E2E |
| ESTO-S32-HP-4955 | 32.2 Cross | Admin | Happy | All | Payment made | Wallet updated | Wallet reflects payment | | | E2E |
| ESTO-S32-HP-4956 | 32.2 Cross | Admin | Happy | All | User registered | All services notified | Services aware of user | | | E2E |
| ESTO-S32-HP-4957 | 32.2 Cross | Admin | Happy | All | Property listed | Search index updated | Property searchable | | | E2E |
| ESTO-S32-HP-4958 | 32.2 Cross | Admin | Happy | All | Property deleted | Search index updated | Property not searchable | | | E2E |
| ESTO-S32-HP-4959 | 32.2 Cross | Admin | Happy | All | Image uploaded | Media service accessible | Image accessible | | | E2E |
| ESTO-S32-HP-4960 | 32.2 Cross | Admin | Happy | All | Notification sent | Notification received | User notified | | | E2E |
| ESTO-S32-HP-4961 | 32.2 Cross | Admin | Happy | All | Message sent | Message delivered | Message in inbox | | | E2E |
| ESTO-S32-HP-4962 | 32.2 Cross | Admin | Happy | All | Appointment scheduled | Calendar updated | Calendar entry created | | | E2E |
| ESTO-S32-HP-4963 | 32.2 Cross | Admin | Happy | All | Contract signed | Document stored | Document accessible | | | E2E |
| ESTO-S32-HP-4964 | 32.2 Cross | Admin | Happy | All | Review received | Manager notified | Manager notified | | | E2E |
| ESTO-S32-HP-4965 | 32.2 Cross | Admin | Happy | All | Broker request | Admin notified | Admin notified | | | E2E |
| ESTO-S32-HP-4966 | 32.2 Cross | Admin | Happy | All | Fast Track submitted | FT workflow starts | FT initiated | | | E2E |
| ESTO-S32-HP-4967 | 32.2 Cross | Admin | Happy | All | User updated | Profile synced across services | Profile consistent | | | E2E |
| ESTO-S32-HP-4968 | 32.2 Cross | Admin | Happy | All | User deleted | Data purged across services | All data removed | | | E2E |
| ESTO-S32-HP-4969 | 32.2 Cross | Admin | Happy | All | Role changed | Permissions updated everywhere | Permissions consistent | | | E2E |
| ESTO-S32-HP-4970 | 32.2 Cross | Admin | Happy | All | Multi-service event | Eventual consistency | All services converge | | | E2E |
| ESTO-S32-HP-4971 | 32.2 Cross | Admin | Happy | All | Service outage | Graceful degradation | Partial functionality | | | E2E |
| ESTO-S32-HP-4972 | 32.2 Cross | Admin | Happy | All | Service recovery | Data consistency restored | Consistent state | | | E2E |
| ESTO-S32-HP-4973 | 32.2 Cross | Admin | Happy | All | Network partition | Split-brain resolved | Consensus reached | | | E2E |
| ESTO-S32-HP-4974 | 32.2 Cross | Admin | Happy | All | Data conflict | Conflict resolution | Conflict resolved | | | E2E |
| ESTO-S32-HP-4975 | 32.2 Cross | Admin | Happy | All | Migration | Data migration complete | Migration successful | | | E2E |
| ESTO-S32-HP-4976 | 32.2 Cross | Admin | Happy | All | Rollback | Data rolled back | Consistent state | | | E2E |
| ESTO-S32-HP-4977 | 32.2 Cross | Admin | Happy | All | Service mesh | Inter-service communication | Communication works | | | E2E |
| ESTO-S32-HP-4978 | 32.2 Cross | Admin | Happy | All | Service discovery | Services discover each other | Discovery works | | | E2E |
| ESTO-S32-HP-4979 | 32.2 Cross | Admin | Happy | All | Load balancer | Traffic distributed | Load balanced | | | E2E |
| ESTO-S32-HP-4980 | 32.2 Cross | Admin | Happy | All | Circuit breaker | Failure isolated | Circuit breaker works | | | E2E |
| ESTO-S32-HP-4981 | 32.2 Cross | Admin | Happy | All | API gateway | Gateway routes correctly | Routing works | | | E2E |
| ESTO-S32-HP-4982 | 32.2 Cross | Admin | Happy | All | API gateway | Gateway auth works | Auth enforced | | | E2E |
| ESTO-S32-HP-4983 | 32.2 Cross | Admin | Happy | All | Rate limiting | Rate limit across services | Limits enforced | | | E2E |
| ESTO-S32-HP-4984 | 32.2 Cross | Admin | Happy | All | Observability | Full request trace | Trace complete | | | E2E |
| ESTO-S32-HP-4985 | 32.2 Cross | Admin | Happy | All | Tracing | Trace correlation | Correlation ID used | | | E2E |
| ESTO-S32-HP-4986 | 32.2 Cross | Admin | Happy | All | Logging | Structured logs across services | Logs correlated | | | E2E |
| ESTO-S32-HP-4987 | 32.2 Cross | Admin | Happy | All | Metrics | Metrics from all services | All services metriced | | | E2E |
| ESTO-S32-HP-4988 | 32.2 Cross | Admin | Happy | All | Alerting | Cross-service alert | Alert fired | | | E2E |
| ESTO-S32-HP-4989 | 32.2 Cross | Admin | Happy | All | Dashboard | Cross-service dashboard | Dashboard accurate | | | E2E |
| ESTO-S32-HP-4990 | 32.2 Cross | Admin | Happy | All | SLA | SLA tracked | SLA monitored | | | E2E |
| ESTO-S32-HP-4991 | 32.2 Cross | Admin | Happy | All | Error budget | Budget tracked | Budget visible | | | E2E |
| ESTO-S32-HP-4992 | 32.2 Cross | Admin | Happy | All | Deployment | Rolling deploy | Zero-downtime deploy | | | E2E |
| ESTO-S32-HP-4993 | 32.2 Cross | Admin | Happy | All | Deployment | Blue-green deploy | Zero-downtime deploy | | | E2E |
| ESTO-S32-HP-4994 | 32.2 Cross | Admin | Happy | All | Rollback | Service rollback | Rollback successful | | | E2E |
| ESTO-S32-HP-4995 | 32.2 Cross | Admin | Happy | All | Canary deploy | Canary tested | Canary validated | | | E2E |
| ESTO-S32-HP-4996 | 32.2 Cross | Admin | Happy | All | Feature flag | Flag across services | Flag consistent | | | E2E |
| ESTO-S32-HP-4997 | 32.2 Cross | Admin | Happy | All | Config | Config across services | Config consistent | | | E2E |
| ESTO-S32-HP-4998 | 32.2 Cross | Admin | Happy | All | Secret | Secret across services | Secret accessible | | | E2E |
| ESTO-S32-HP-4999 | 32.2 Cross | Admin | Happy | All | Certificate | Certificate across services | Certificate valid | | | E2E |
| ESTO-S32-HP-5000 | 32.2 Cross | Admin | Happy | All | Full system | End-to-end platform test | All features work | | | E2E |







