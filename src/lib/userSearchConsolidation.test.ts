import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('authenticated property search has one canonical Discover route', () => {
    const app = readSource('src/App.tsx');
    const route = readSource('src/lib/userSearchRoute.ts');
    const dashboard = readSource('src/pages/user/dashboard/DashboardClient.tsx');

    assert.match(route, /USER_SEARCH_PATH = '\/user\/dashboard\/discover'/);
    assert.match(app, /path="dashboard\/search" element=\{<LegacyUserSearchRedirect \/>\}/);
    assert.match(app, /path="search" element=\{<LegacyUserSearchRedirect \/>\}/);
    assert.doesNotMatch(app, /const UserSearch = lazyPage/);
    assert.match(dashboard, /navigate\(`\/user\/dashboard\/discover\$\{queryString/);
});

test('Discover shows one primary search and progressively discloses advanced filters', () => {
    const discover = readSource('src/pages/user/dashboard/discover/page.tsx');

    assert.match(discover, /id="discover-property-search"/);
    assert.match(discover, /aria-controls="discover-advanced-filters"/);
    assert.match(discover, /aria-expanded=\{showAdvancedFilters\}/);
    assert.match(discover, /\{showAdvancedFilters && \(/);
    assert.match(discover, /id="discover-advanced-filters"/);
    assert.match(discover, /Filters\{activeAdvancedFilterCount > 0/);
});

test('low-value notification and review text searches are removed in favor of focused filters', () => {
    const notifications = readSource('src/pages/user/dashboard/notifications/page.tsx');
    const reviews = readSource('src/pages/user/dashboard/reviews/page.tsx');

    assert.doesNotMatch(notifications, /Search notifications/);
    assert.match(notifications, /Notification category/);
    assert.match(notifications, /Notification read filter/);
    assert.doesNotMatch(reviews, /Search reviews/);
    assert.match(reviews, /Filter reviews by status/);
    assert.match(reviews, /Sort reviews/);
});
