import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('ticket 489 keeps global toasts below the mobile safe area and inside the viewport', () => {
    const toastContext = source('contexts/ToastContext.tsx');

    assert.match(toastContext, /env\(safe-area-inset-top\)/);
    assert.match(toastContext, /left-3/);
    assert.match(toastContext, /sm:left-auto/);
});

test('ticket 492 gives manual lead refresh an explicit pending state', () => {
    const leadsPage = source('pages/manager/leads/page.tsx');

    assert.match(leadsPage, /const \[isRefreshing, setIsRefreshing\] = useState\(false\)/);
    assert.match(leadsPage, /const handleManualRefresh = async \(\) =>/);
    assert.match(leadsPage, /disabled=\{isRefreshing\}/);
    assert.match(leadsPage, /Refreshing leads/);
});

test('ticket 494 exposes the theme switcher on phone headers', () => {
    const header = source('components/layout/Header.tsx');

    assert.match(header, /sm:hidden[^>]*><ThemeSwitcher/);
    assert.match(header, /hidden sm:block[^>]*><ThemeSwitcher/);
});

test('ticket 500 keeps admin quick actions readable at the minimum phone width', () => {
    const dashboard = source('pages/admin/dashboard/page.tsx');

    assert.match(dashboard, /rounded-2xl[^\n]*p-4[^\n]*sm:p-8/);
    assert.match(dashboard, /min-w-0 flex-1/);
    assert.match(dashboard, /hidden[^\n]*sm:flex/);
});

test('tickets 503 504 508 and 513 keep the manager verification queue responsive and correctly filtered', () => {
    const verifications = source('pages/admin/verifications/page.tsx');

    assert.match(verifications, /const isArchivedManager =/);
    assert.match(verifications, /if \(showArchived !== isArchivedManager\(manager\)\) return false/);
    assert.doesNotMatch(verifications, /if \(showArchived\) return true/);
    assert.match(verifications, /setShowArchived\(false\)/);
    assert.match(verifications, /<Toggle/);
    assert.match(verifications, /ariaLabel="Automatically refresh manager verifications"/);
    assert.match(verifications, /relative w-full[^\n]*sm:w-64/);
});

test('ticket 510 gives research refresh a visible state and success confirmation', () => {
    const research = source('pages/admin/research/page.tsx');

    assert.match(research, /const \[isRefreshing, setIsRefreshing\] = useState\(false\)/);
    assert.match(research, /const handleRefresh = async \(\) =>/);
    assert.match(research, /Research workspace refreshed/);
    assert.match(research, /disabled=\{isRefreshing\}/);
    assert.match(research, /Refreshing research/);
});

test('ticket 511 keeps the review refresh action compact on phones', () => {
    const reviews = source('pages/admin/reviews/page.tsx');

    assert.match(reviews, /self-start[^\n]*sm:self-auto/);
    assert.match(reviews, /disabled=\{isRefreshing\}/);
});

test('ticket 509 distinguishes registry filter group labels from filter values', () => {
    const registry = source('pages/admin/properties/page.tsx');

    assert.match(
        registry,
        /aria-label="Registry filter group Type"[\s\S]*?className="[^"]*bg-gray-100[^"]*text-\[9px\][^"]*font-bold/,
    );
    assert.match(
        registry,
        /aria-label="Registry filter group Status"[\s\S]*?className="[^"]*dark:bg-gray-900/,
    );
});

test('ticket 514 stacks the manager review identity and status safely on narrow phones', () => {
    const modal = source('components/admin/ManagerReviewModal.tsx');

    assert.match(modal, /flex-col gap-4 sm:flex-row sm:items-start sm:justify-between/);
    assert.match(modal, /min-w-0/);
    assert.match(modal, /break-all/);
    assert.match(modal, /self-start[^\n]*sm:self-auto/);
    assert.match(modal, /max-w-2xl[^\n]*min-w-0[^\n]*overflow-x-hidden/);
    assert.match(modal, /overflow-x-hidden overflow-y-auto/);
    assert.match(modal, /flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between/);
});

test('ticket 491 labels current metrics separately from the trend period selector', () => {
    const analytics = source('pages/manager/analytics/page.tsx');

    assert.match(analytics, />Current overview</);
    assert.match(analytics, />Trend period</);
    assert.match(analytics, /Monthly revenue trends for the selected period/);
});

test('ticket 490 confirms that Duplicate creates a new draft before opening edit', () => {
    const propertyDetail = source('pages/manager/dashboard/properties/[id]/page.tsx');

    assert.match(propertyDetail, /Draft copy created/);
    assert.match(propertyDetail, /navigate\(`\/manager\/dashboard\/properties\/edit\/\$\{duplicate\.id\}`\)/);
});
