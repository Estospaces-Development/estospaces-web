import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { filterAdminResearchNavItems, isAdminResearchPath } from './adminResearchAvailability';
import { ADMIN_RESEARCH_ENABLED } from './launchFlags';

const source = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const requireScript = createRequire(import.meta.url);
const { isAdminResearchEnabled } = requireScript('../../scripts/admin-research-availability.cjs') as {
    isAdminResearchEnabled: (source?: string) => boolean;
};

const navItems = [
    { label: 'Reviews', path: '/admin/reviews' },
    { label: 'Observational Research', path: '/admin/research' },
    { label: 'Analytics', path: '/admin/analytics' },
];

test('admin research stays disabled until core serves /api/v1/admin/research', () => {
    assert.equal(ADMIN_RESEARCH_ENABLED, false);
});

test('research nav entries are removed only while the workspace is disabled', () => {
    assert.deepEqual(filterAdminResearchNavItems(navItems, false).map((item) => item.path), ['/admin/reviews', '/admin/analytics']);
    assert.deepEqual(filterAdminResearchNavItems(navItems, true), navItems);
    assert.equal(isAdminResearchPath('/admin/research'), true);
    assert.equal(isAdminResearchPath('/admin/research/sessions'), true);
    assert.equal(isAdminResearchPath('/admin/researcher'), false);
});

test('admin sidebar, command search and dashboard hide the Research entry behind the flag', () => {
    assert.match(source('components/layout/AdminSidebar.tsx'), /const menuItems = filterAdminResearchNavItems\(\[/);
    assert.match(source('components/layout/AdminHeader.tsx'), /const ADMIN_PAGES = filterAdminResearchNavItems\(\[/);
    assert.match(
        source('pages/admin/dashboard/page.tsx'),
        /\{ADMIN_RESEARCH_ENABLED && \(\s*<button\s+onClick=\{\(\) => navigate\('\/admin\/research'\)\}/,
    );
});

test('/admin/research renders the unavailable state instead of the broken workspace', () => {
    const app = source('App.tsx');
    assert.match(app, /<Route path="research" element=\{ADMIN_RESEARCH_ENABLED \? <AdminResearch \/> : <AdminResearchUnavailable \/>\} \/>/);
    assert.match(app, /const AdminResearch = lazyPage\(\(\) => import\('\.\/pages\/admin\/research\/page'\)\);/);

    const unavailable = source('pages/admin/research/unavailable.tsx');
    assert.match(unavailable, /Research tools are not available yet/);
    assert.match(unavailable, /to="\/admin\/dashboard"/);
    assert.doesNotMatch(unavailable, /adminResearchService/);
});

test('proof scripts read the same flag literal and reject a non-literal value', () => {
    assert.equal(isAdminResearchEnabled(), ADMIN_RESEARCH_ENABLED);
    assert.equal(isAdminResearchEnabled('export const ADMIN_RESEARCH_ENABLED = true;'), true);
    assert.equal(isAdminResearchEnabled('export const ADMIN_RESEARCH_ENABLED = false;'), false);
    assert.throws(() => isAdminResearchEnabled('export const ADMIN_RESEARCH_ENABLED = flag();'), /literal true or false/);
    for (const script of ['admin-research-proof.cjs', 'admin-research-disposable-proof.cjs']) {
        const text = readFileSync(resolve(process.cwd(), 'scripts', script), 'utf8');
        assert.match(text, /^require\('\.\/admin-research-availability\.cjs'\)\.skipUnlessAdminResearchEnabled\(/, script);
    }
});
