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
    getAdminActiveListings,
} from './adminPlatformAnalytics';

test('admin active listings prefer the authoritative aggregate over top-five rows', () => {
    assert.equal(getAdminActiveListings({
        active_listings: 12,
        propertyPerformance: analytics.propertyPerformance?.slice(0, 5),
    } as AnalyticsData), 12);
});

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
    propertyPerformance: [
        { property: 'Unit 1', status: 'available', views: 10, applications: 2, conversionRate: 20 },
        { property: 'Unit 2', status: 'available', views: 15, applications: 3, conversionRate: 20 },
        { property: 'Unit 3', status: 'active', views: 20, applications: 4, conversionRate: 20 },
        { property: 'Unit 4', status: 'published', views: 25, applications: 5, conversionRate: 20 },
        { property: 'Unit 5', status: 'available', views: 30, applications: 6, conversionRate: 20 },
        { property: 'Unit 6', status: 'active', views: 35, applications: 7, conversionRate: 20 },
        { property: 'Unit 7', status: 'online', views: 40, applications: 8, conversionRate: 20 },
        { property: 'Unit 8', status: 'available', views: 45, applications: 9, conversionRate: 20 },
    ],
} as AnalyticsData;

test('admin analytics metric cards expose revenue and growth data', () => {
    const cards = buildAdminAnalyticsMetricCards(analytics);

    assert.equal(cards.find((card) => card.label === 'Total Revenue')?.value, '\u20b91,25,000');
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
    assert.equal(snapshot.find((item) => item.label === 'Revenue')?.value, '\u20b91,25,000');
    assert.equal(snapshot.find((item) => item.label === 'Active Listings')?.value, '8');
});

test('admin currency formatting remains readable for missing revenue', () => {
    assert.equal(formatAdminCurrency(undefined), '\u20b90');
});
