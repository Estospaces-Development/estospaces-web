import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { getAdminPageTitles } from '@/components/layout/AdminHeader';
import PaginationBar from '@/components/ui/PaginationBar';
import Table, { type Column } from '@/components/ui/Table';

const source = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('admin mobile header uses compact titles without losing the full page name', () => {
    assert.deepEqual(getAdminPageTitles('/admin/research'), {
        full: 'Observational Research',
        compact: 'Research',
    });
    assert.deepEqual(getAdminPageTitles('/admin/users'), {
        full: 'User Management',
        compact: 'Users',
    });
    assert.deepEqual(getAdminPageTitles('/admin/fast-track'), {
        full: 'Fast Track',
        compact: 'Fast Track',
    });
});

test('shared data table renders readable mobile cards and the desktop table', () => {
    type PersonRow = Record<string, unknown> & { id: string; name: string; status: string };
    const columns: Column<PersonRow>[] = [
        { key: 'name', header: 'Name' },
        { key: 'status', header: 'Status' },
    ];

    const markup = renderToStaticMarkup(
        <Table<PersonRow>
            columns={columns}
            data={[{ id: 'user-1', name: 'Test User', status: 'Approved' }]}
            keyField="id"
            onRowClick={() => undefined}
        />,
    );

    assert.match(markup, /data-mobile-table="cards"/);
    assert.match(markup, /<dt[^>]*>Name<\/dt>/);
    assert.match(markup, /<dd[^>]*>Test User<\/dd>/);
    assert.match(markup, /<button[^>]*>View details<\/button>/);
    assert.match(markup, /hidden overflow-x-auto md:block/);
    assert.match(markup, /<table/);
});

test('pagination keeps primary phone controls visible and moves page tokens first', () => {
    const markup = renderToStaticMarkup(
        <PaginationBar currentPage={3} totalPages={12} onPageChange={() => undefined} />,
    );

    assert.match(markup, /grid-cols-2/);
    assert.match(markup, /order-1 col-span-2/);
    assert.match(markup, /order-2[^\"]*.*Previous/s);
    assert.match(markup, /order-3[^\"]*.*Next/s);
});

test('all role workspace shells contain content and overlays inside the mobile viewport', () => {
    for (const file of [
        'components/layout/UserLayoutClient.tsx',
        'components/layout/ManagerLayoutClient.tsx',
        'components/layout/AdminLayoutClient.tsx',
    ]) {
        const contents = source(file);
        assert.match(contents, /role-workspace-content/);
        assert.match(contents, /data-mobile-scroll-root/);
        assert.match(contents, /overflow-x-hidden/);
        assert.doesNotMatch(contents, /role-workspace-content[^\n]*overflow-y-auto/);
    }

    const css = source('globals.css');
    const browserAudit = source('../scripts/mobile-responsive-audit.cjs');
    assert.match(css, /text-size-adjust:\s*100%/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /max-height:\s*calc\(100dvh - 1rem\)/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
    assert.match(css, /role-workspace-content[\s\S]*overflow-y:\s*visible/);
    assert.match(css, /role-workspace-content[\s\S]*overscroll-behavior-y:\s*auto/);
    assert.match(browserAudit, /page\.mouse\.wheel/);
    assert.match(browserAudit, /scrollGesturePassed/);
    assert.match(browserAudit, /nestedScrollGestureDelta/);
    assert.match(browserAudit, /data-mobile-audit-scroll-probe/);
    assert.match(browserAudit, /scrollRetryPoints/);
    assert.match(browserAudit, /vertical scroll gesture did not move/);
});

test('phone workspaces use an intentional compact type and spacing scale', () => {
    const css = source('globals.css');
    const dashboard = source('pages/user/dashboard/DashboardClient.tsx');
    const discover = source('pages/user/dashboard/discover/page.tsx');
    const userHeader = source('components/layout/UserHeader.tsx');
    const userNavigation = source('components/layout/HorizontalNavigation.tsx');
    const roleNavigation = source('components/layout/RoleMobileNavigation.tsx');
    const browserAudit = source('../scripts/mobile-responsive-audit.cjs');

    assert.match(css, /--mobile-panel-padding:\s*1rem/);
    assert.match(css, /role-workspace-content h1 \{[\s\S]*clamp\(1\.5rem, 7vw, 1\.875rem\) !important/);
    assert.match(css, /role-workspace-content h2 \{[\s\S]*clamp\(1\.25rem, 5\.8vw, 1\.5rem\) !important/);
    assert.match(css, /role-workspace-content h3 \{[\s\S]*font-weight:\s*600/);
    assert.match(css, /\[class~='p-8'\][\s\S]*padding:\s*var\(--mobile-panel-padding\)/);
    assert.match(dashboard, /text-\[1\.75rem\]/);
    assert.match(dashboard, /mobile-filter-rail mt-6 hidden/);
    assert.match(discover, /grid min-h-11 grid-cols-3/);
    assert.match(discover, /City, \$\{locationCodeLabel\.toLowerCase\(\)\}, or property/);
    assert.match(userHeader, /min-\[360px\]:inline/);
    assert.match(roleNavigation, /min-h-14/);
    assert.match(roleNavigation, /mobileLabel: '24h'/);
    assert.match(userNavigation, /mobileLabel: "Chat"/);
    assert.match(browserAudit, /oversizedHeadings/);
    assert.match(browserAudit, /viewportWidth < 640/);
    assert.match(browserAudit, /\{ h1: 32, h2: 26 \}/);
    assert.match(browserAudit, /\{ h1: 48, h2: 36 \}/);
    assert.match(browserAudit, /mobile navigation is taller than/);
});

test('overseas hero preserves the tablet type scale and reserves the largest heading for desktop', () => {
    const overseasPage = source('pages/user/dashboard/overseas/page.tsx');

    assert.match(overseasPage, /sm:text-4xl lg:text-5xl/);
    assert.doesNotMatch(overseasPage, /sm:text-4xl md:text-5xl/);
});

test('tablet workspaces preserve touch targets and delay dense registry layout until desktop', () => {
    const css = source('globals.css');
    const backButton = source('components/ui/BackButton.tsx');
    const adminProperties = source('pages/admin/properties/page.tsx');
    const userNavigation = source('components/layout/HorizontalNavigation.tsx');
    const themeSwitcher = source('components/dashboard/ThemeSwitcher.tsx');
    const adminHeader = source('components/layout/AdminHeader.tsx');

    assert.match(css, /@media \(min-width: 640px\) and \(max-width: 1023px\)[\s\S]*min-height: 44px;[\s\S]*min-width: 44px;/);
    assert.match(backButton, /min-h-12 min-w-12/);
    assert.match(adminProperties, /xl:flex-row xl:items-center xl:justify-between/);
    assert.doesNotMatch(adminProperties, /md:flex-row md:items-center md:justify-between/);
    assert.match(userNavigation, /relative inline-flex min-h-11 items-center/);
    assert.match(themeSwitcher, /inline-flex h-11 w-11 items-center justify-center/);
    assert.match(adminHeader, /hidden h-11 min-w-11 shrink-0/);
    assert.match(adminHeader, /hidden min-h-11 items-center/);
});

test('public phone navigation exposes full-size touch targets inside the viewport', () => {
    const header = source('components/layout/PublicHeader.tsx');

    assert.match(header, /h-11 w-11/);
    assert.match(header, /aria-label="Toggle navigation"/);
    assert.match(header, /min-h-11 items-center/);
    assert.match(header, /max-h-\[calc\(100vh-4rem\)\] overflow-y-auto/);
});

test('desktop-only floating assistant is constrained to phone viewport dimensions', () => {
    const assistant = source('components/dashboard/LakshmiAssistant.tsx');
    assert.doesNotMatch(assistant, /fixed bottom-6 right-6 w-96 h-\[600px\]/);
    assert.match(assistant, /max-h-\[calc\(100dvh-1rem\)\]/);
    assert.match(assistant, /inset-x-2/);
});

test('custom manager overlays stay usable on phone viewports', () => {
    const contracts = source('pages/manager/contracts/page.tsx');
    const propertyDetail = source('pages/manager/dashboard/properties/[id]/page.tsx');

    assert.match(contracts, /items-end justify-center/);
    assert.match(contracts, /max-h-\[calc\(100dvh-/);
    assert.match(contracts, /min-h-11 items-center justify-center/);
    assert.match(propertyDetail, /fixed inset-x-4 top-4/);
    assert.match(propertyDetail, /sm:max-w-sm/);
});
