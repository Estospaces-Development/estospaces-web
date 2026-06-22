import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { AnalyticsData } from '@/services/analyticsService';
import {
    buildAdminAnalyticsCsvSnapshot,
    buildAdminAnalyticsExportRows,
    buildAdminAnalyticsMetricCards,
    buildAdminDashboardSnapshot,
    createAdminAnalyticsExportDeduper,
    formatAdminCurrency,
} from './adminPlatformAnalytics';

const analytics = {
    total_users: 79,
    total_properties: 93,
    total_leads: 17,
    active_leads: 11,
    total_brokers: 3,
    sla_success_rate: 53,
    avg_response_time: 35,
    pending_verifications: 2,
    total_documents: 44,
    total_views: 111,
    conversion_rate: 84.68,
    total_revenue: 125000,
    revenue_growth: '+12.5%',
    property_growth: '+4.1%',
    views_growth: '+8%',
    conversion_growth: '+2%',
    active_listings: 8,
    total_bookings: 6,
} as AnalyticsData;

test('admin analytics metric cards expose revenue and growth data', () => {
    const cards = buildAdminAnalyticsMetricCards(analytics);

    assert.equal(cards.find((card) => card.label === 'Total Revenue')?.value, '£125,000');
    assert.equal(cards.find((card) => card.label === 'Revenue Growth')?.value, '+12.5%');
    assert.equal(cards.find((card) => card.label === 'Property Growth')?.value, '+4.1%');
});

test('admin analytics export keeps boundary rows safe', () => {
    const csv = buildAdminAnalyticsCsvSnapshot({
        propertyPerformance: [
            { property: '=cmd|danger', views: 0, applications: 0, conversionRate: 0 },
            { property: 'High volume', views: Number.MAX_SAFE_INTEGER, applications: 999999999, conversionRate: 100 },
        ],
    } as AnalyticsData);

    assert.match(csv, /"'=cmd\|danger","0","0","0"/);
    assert.match(csv, /"High volume","9007199254740991","999999999","100"/);
});

test('admin analytics export filters and sorts rows before snapshotting', () => {
    const rows = buildAdminAnalyticsExportRows(
        {
            propertyPerformance: [
                { property: 'Draft path', status: 'draft', views: 100, applications: 2, conversionRate: 2 },
                { property: 'Published slower', status: 'published', views: 20, applications: 4, conversionRate: 20 },
                { property: 'Published faster', status: 'published', views: 10, applications: 5, conversionRate: 50 },
            ],
        } as AnalyticsData,
        { status: 'published', sortBy: 'conversionRate', direction: 'desc' },
    );

    assert.deepEqual(rows.map((row) => row.property), ['Published faster', 'Published slower']);
});

test('admin analytics visible table uses the same filtered sorted rows as export', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/analytics/page.tsx'), 'utf8');

    assert.match(source, /const analyticsTableOptions = \{[\s\S]*status: exportStatusFilter[\s\S]*sortBy: exportSortBy[\s\S]*direction: exportDirection[\s\S]*\};/);
    assert.match(source, /const analyticsRows = buildAdminAnalyticsExportRows\(data, analyticsTableOptions\);/);
    assert.match(source, /\) : analyticsRows\.map\(\(page, i\) =>/);
    assert.match(source, /analyticsRows\.length === 0/);
    assert.match(source, /No analytics rows match the current filters\./);
    assert.doesNotMatch(source, /\(data\?\.propertyPerformance \|\| \[\]\)\.map/);
});

test('admin analytics export deduper blocks duplicate clicks during an export window', () => {
    const deduper = createAdminAnalyticsExportDeduper(1000);

    assert.equal(deduper.canStart(1000), true);
    deduper.markStarted(1000);
    assert.equal(deduper.canStart(1200), false);
    assert.equal(deduper.canStart(2101), true);
});

test('admin dashboard snapshot includes booking revenue and active listing counts', () => {
    const snapshot = buildAdminDashboardSnapshot(analytics);

    assert.equal(snapshot.find((item) => item.label === 'Total Bookings')?.value, '6');
    assert.equal(snapshot.find((item) => item.label === 'Revenue')?.value, '£125,000');
    assert.equal(snapshot.find((item) => item.label === 'Active Listings')?.value, '8');
});

test('admin currency formatting remains readable for missing revenue', () => {
    assert.equal(formatAdminCurrency(undefined), '£0');
});
