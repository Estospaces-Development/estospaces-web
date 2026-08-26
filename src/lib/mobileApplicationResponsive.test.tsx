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
        assert.match(contents, /overflow-x-hidden/);
    }

    const css = source('globals.css');
    assert.match(css, /text-size-adjust:\s*100%/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /max-height:\s*calc\(100dvh - 1rem\)/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
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
