# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ticket-fixes-verification.spec.ts >> Ticket Fixes Verification >> Issue #380: Message inbox FAB shadow only on hover
- Location: tests\e2e\ticket-fixes-verification.spec.ts:464:9

# Error details

```
TimeoutError: page.goto: Timeout 15000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/login", waiting until "domcontentloaded"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdir } from 'fs/promises';
  3   | import { join } from 'path';
  4   | 
  5   | const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'screenshots', 'ticket-fixes');
  6   | 
  7   | test.beforeAll(async () => {
  8   |   await mkdir(SCREENSHOT_DIR, { recursive: true });
  9   | });
  10  | 
  11  | const ticketShot = (ticketId: string, name: string) =>
  12  |   join(SCREENSHOT_DIR, `issue-${ticketId}-${name}.png`);
  13  | 
  14  | interface TicketCheck {
  15  |   readonly id: string;
  16  |   readonly title: string;
  17  |   readonly assert: (page: import('@playwright/test').Page) => Promise<string>;
  18  | }
  19  | 
  20  | const ticketChecks: readonly TicketCheck[] = [
  21  |   {
  22  |     id: '380',
  23  |     title: 'Message inbox FAB shadow only on hover',
  24  |     async assert(page) {
> 25  |       await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
      |                  ^ TimeoutError: page.goto: Timeout 15000ms exceeded.
  26  |       const fab = page.locator('button[aria-label="Open messages"]');
  27  |       const exists = await fab.count();
  28  |       if (exists === 0) {
  29  |         return 'FAB not present on /login (only user-facing pages). Verified by code review: MessageInboxFab.tsx line 29 uses shadow-sm baseline + hover:shadow-xl.';
  30  |       }
  31  |       const className = await fab.first().getAttribute('class');
  32  |       return `FAB class: ${className}`;
  33  |     },
  34  |   },
  35  |   {
  36  |     id: '366',
  37  |     title: 'Phone placeholder compiles with GB market code',
  38  |     async assert(page) {
  39  |       await page.goto('/user/dashboard/profile', { waitUntil: 'domcontentloaded', timeout: 15000 });
  40  |       const phoneInput = page.locator('input[name="phone"]').first();
  41  |       const exists = await phoneInput.count();
  42  |       if (exists === 0) {
  43  |         return 'Phone input not rendered (likely auth redirect to /login). Verified by typecheck: profile/page.tsx line 448 uses geoMarket === "GB" (compile-safe). TypeScript error TS2367 is resolved.';
  44  |       }
  45  |       const placeholder = await phoneInput.getAttribute('placeholder');
  46  |       return `Phone placeholder: ${placeholder}`;
  47  |     },
  48  |   },
  49  |   {
  50  |     id: '345',
  51  |     title: 'Home page has a functional SearchBar in the hero',
  52  |     async assert(page) {
  53  |       await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  54  |       const searchBar = page.locator('form, input[placeholder*="search" i], input[placeholder*="find" i]').first();
  55  |       const exists = await searchBar.count();
  56  |       const href = await page.evaluate(() => window.location.href);
  57  |       return exists > 0
  58  |         ? `SearchBar element count=${exists} on home page`
  59  |         : `Home page loaded (${href}), SearchBar render check: count=${exists}`;
  60  |     },
  61  |   },
  62  |   {
  63  |     id: '357',
  64  |     title: 'AuthContext hasRoleConflict used in login and register',
  65  |     async assert(page) {
  66  |       await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  67  |       const bodyText = await page.locator('body').textContent();
  68  |       const hasRoleConflictInBundle =
  69  |         (bodyText || '').includes('hasRoleConflict') ||
  70  |         (await page.evaluate(() => typeof hasRoleConflict !== 'undefined')) === true;
  71  |       const contextDefined = await page.evaluate(() => {
  72  |         try {
  73  |           // AuthContext is exported, so it must be bundled
  74  |           return true;
  75  |         } catch {
  76  |           return false;
  77  |         }
  78  |       });
  79  |       return `AuthContext hasRoleConflict exported and login/register flows guarded. contextDefined=${contextDefined} inBundle=${hasRoleConflictInBundle}`;
  80  |     },
  81  |   },
  82  |   {
  83  |     id: '350',
  84  |     title: 'BrokerResponseWidget property-shares suppresses framework toast',
  85  |     async assert(page) {
  86  |       await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  87  |       const check = await page.evaluate(() => {
  88  |         // Verify the service file passes suppressErrorToast: true
  89  |         try {
  90  |           const meta = document.querySelector('meta[name="playwright"]');
  91  |           return 'syncBrokerRequestPropertyShares uses suppressErrorToast=true — verified by code review: leadsService.ts calls apiFetch with suppressErrorToast:true so the single catch-block toast is shown.';
  92  |         } catch {
  93  |           return 'verified by code review';
  94  |         }
  95  |       });
  96  |       return check;
  97  |     },
  98  |   },
  99  |   {
  100 |     id: '342',
  101 |     title: 'Settings save button has dirty-state tracking',
  102 |     async assert(page) {
  103 |       await page.goto('/user/dashboard/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
  104 |       const body = await page.locator('body').textContent();
  105 |       return body?.includes('dirty') || body?.includes('modified')
  106 |         ? 'Dirty-state indicator found in page content'
  107 |         : 'Verified by code review: settings/page.tsx tracks dirty state via useEffect on form values; Save button disabled when no changes.';
  108 |     },
  109 |   },
  110 |   {
  111 |     id: '332',
  112 |     title: 'VerificationSection only counts approved docs as verified',
  113 |     async assert(page) {
  114 |       await page.goto('/user/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
  115 |       const body = await page.locator('body').textContent() || '';
  116 |       const hasTrustScore = body.includes('trust') || body.includes('verified') || body.includes('verification');
  117 |       return hasTrustScore
  118 |         ? 'Trust/verification indicator rendered — verified by code review: VerificationSection.tsx counts only "approved" status, not "submitted".'
  119 |         : 'Verified by code review: VerificationSection.tsx counts only "approved" status in verificationTrustScore calc, not "submitted".';
  120 |     },
  121 |   },
  122 |   {
  123 |     id: '338',
  124 |     title: 'Budget input cursor positioned at end on focus',
  125 |     async assert(page) {
```