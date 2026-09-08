import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ADMIN_FEATURE_LABELS, matchesAdminPageQuery } from './adminFeatureLabels';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('old and canonical search terms select the same admin destinations', () => {
    const pages = [
        { label: ADMIN_FEATURE_LABELS.users, path: '/admin/users' },
        { label: ADMIN_FEATURE_LABELS.listings, path: '/admin/properties' },
        { label: 'Fast Track', path: '/admin/fast-track' },
    ];
    for (const query of ['users', 'user management', 'User Registry', '  USER   MANAGEMENT  ']) {
        assert.deepEqual(pages.filter(page => matchesAdminPageQuery(page, query)).map(page => page.path), ['/admin/users']);
    }
    for (const query of ['listings', 'properties', 'Property Hub', 'Registry Control']) {
        assert.deepEqual(pages.filter(page => matchesAdminPageQuery(page, query)).map(page => page.path), ['/admin/properties']);
    }
    assert.deepEqual(pages.filter(page => matchesAdminPageQuery(page, 'Fast Track')).map(page => page.path), ['/admin/fast-track']);
    assert.equal(pages.some(page => matchesAdminPageQuery(page, 'not a destination')), false);
    assert.match(source('components/layout/AdminHeader.tsx'), /ADMIN_PAGES.filter\(p => matchesAdminPageQuery\(p, normalizedSearchQuery\)\)/);
});

for (const path of ['components/layout/AdminHeader.tsx', 'components/layout/AdminSidebar.tsx', 'components/layout/Sidebar.tsx']) {
    test(`${path} uses consistent admin destination labels`, () => {
        const content = source(path);
        assert.match(content, /label: ADMIN_FEATURE_LABELS.users, path: ['"]\/admin\/users['"]/);
        assert.match(content, /label: ADMIN_FEATURE_LABELS.listings, path: ['"]\/admin\/properties['"]/);
        assert.doesNotMatch(content, /User Management|User Registry|Property Hub/);
    });
}

test('admin mobile navigation matches desktop labels without changing manager navigation', () => {
    const content = source('components/layout/RoleMobileNavigation.tsx');
    assert.match(content, /label: ADMIN_FEATURE_LABELS.users, mobileLabel: ADMIN_FEATURE_LABELS.users, path: '\/admin\/users'/);
    assert.match(content, /label: ADMIN_FEATURE_LABELS.listings, mobileLabel: ADMIN_FEATURE_LABELS.listings, path: '\/admin\/properties'/);
    assert.match(content, /label: 'Properties', mobileLabel: 'Listings', path: '\/manager\/dashboard\/properties'/);
});

test('admin dashboard quick links and destination headings share the navigation copy', () => {
    const dashboard = source('pages/admin/dashboard/page.tsx');
    assert.match(dashboard, />\{ADMIN_FEATURE_LABELS.users\}<\/h3>/);
    assert.match(dashboard, />\{ADMIN_FEATURE_LABELS.listings\}<\/h3>/);
    assert.doesNotMatch(dashboard, /User Registry|Property Hub/);
    assert.match(source('pages/admin/users/page.tsx'), /return ADMIN_FEATURE_LABELS.users;/);
    assert.match(source('pages/admin/properties/page.tsx'), /<h1[^>]*>\s*\{ADMIN_FEATURE_LABELS.listings\}/);
    assert.match(source('lib/seo.ts'), /adminUsers: generateMetadata\(\{ title: ADMIN_FEATURE_LABELS.users/);
});
