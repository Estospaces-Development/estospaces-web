import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MANAGER_LIVE_LISTINGS_STATUS_FILTERS,
    MANAGER_LIVE_LISTINGS_VIEW,
    buildManagerActiveListingsPath,
    buildManagerLivePresetFilters,
    buildManagerPropertySearchParams,
    formatManagerAnalyticsPercentage,
    filterManagerLivePropertyPerformance,
    getManagerLiveListingCount,
    getManagerPropertyStatusFilters,
    isManagerLivePropertyStatus,
    managerPropertyStatusFiltersEqual,
    normalizeManagerAnalyticsPercentage,
    normalizeManagerPropertyStatusFilters,
} from './managerPropertyDashboard';

test('live listing status detection only includes approved public statuses', () => {
    assert.equal(isManagerLivePropertyStatus('available'), true);
    assert.equal(isManagerLivePropertyStatus('published'), true);
    assert.equal(isManagerLivePropertyStatus('online'), true);
    assert.equal(isManagerLivePropertyStatus('active'), true);
    assert.equal(isManagerLivePropertyStatus('pending_approval'), false);
    assert.equal(isManagerLivePropertyStatus('draft'), false);
});

test('normalizeManagerAnalyticsPercentage clamps impossible conversion values', () => {
    assert.equal(normalizeManagerAnalyticsPercentage(377.78), 100);
    assert.equal(normalizeManagerAnalyticsPercentage(-12), 0);
    assert.equal(normalizeManagerAnalyticsPercentage(null), 0);
});

test('formatManagerAnalyticsPercentage keeps bounded readable percentages', () => {
    assert.equal(formatManagerAnalyticsPercentage(377.78), '100%');
    assert.equal(formatManagerAnalyticsPercentage(12.345), '12.35%');
    assert.equal(formatManagerAnalyticsPercentage(12.3), '12.3%');
});

test('normalizeManagerPropertyStatusFilters trims, lowercases, and de-duplicates values', () => {
    assert.deepEqual(
        normalizeManagerPropertyStatusFilters([' Available ', 'published', 'PUBLISHED', '', null]),
        ['available', 'published'],
    );
});

test('getManagerPropertyStatusFilters reads comma-separated statuses from search params', () => {
    const params = new URLSearchParams('status=available,published,,available');

    assert.deepEqual(getManagerPropertyStatusFilters(params), ['available', 'published']);
});

test('buildManagerPropertySearchParams replaces status filters and clears view presets', () => {
    const next = buildManagerPropertySearchParams(
        new URLSearchParams(`view=${MANAGER_LIVE_LISTINGS_VIEW}&status=available&search=office`),
        ['published', 'online'],
    );

    assert.equal(next.get('view'), null);
    assert.equal(next.get('status'), 'published,online');
    assert.equal(next.get('search'), 'office');
});

test('buildManagerLivePresetFilters preserves search while clearing incompatible advanced filters', () => {
    assert.deepEqual(
        buildManagerLivePresetFilters(
            {
                search: 'office',
                priceMin: 100000,
                priceMax: 200000,
                bedroomsMin: 2,
                propertyType: ['house'],
                status: ['draft'],
            },
            ['available', 'published'],
        ),
        {
            search: 'office',
            priceMin: undefined,
            priceMax: undefined,
            bedroomsMin: undefined,
            propertyType: undefined,
            status: ['available', 'published'],
        },
    );
});

test('managerPropertyStatusFiltersEqual compares normalized status filters', () => {
    assert.equal(
        managerPropertyStatusFiltersEqual(['available', 'PUBLISHED'], ['available', 'published']),
        true,
    );
    assert.equal(
        managerPropertyStatusFiltersEqual(['available'], ['published']),
        false,
    );
});

test('buildManagerActiveListingsPath points to the live listings preset', () => {
    const params = new URLSearchParams();
    params.set('view', MANAGER_LIVE_LISTINGS_VIEW);
    params.set('status', MANAGER_LIVE_LISTINGS_STATUS_FILTERS.join(','));

    assert.equal(
        buildManagerActiveListingsPath(),
        `/manager/dashboard/properties?${params.toString()}`,
    );
});

test('filterManagerLivePropertyPerformance keeps only live listings', () => {
    const propertyPerformance = [
        { property: 'Approved listing', property_id: '1', status: 'published', views: 12, applications: 2, conversionRate: 10 },
        { property: 'Pending listing', property_id: '2', status: 'pending_approval', views: 100, applications: 7, conversionRate: 11 },
        { property: 'Draft listing', property_id: '3', status: 'draft', views: 4, applications: 0, conversionRate: 0 },
        { property: 'Live listing', property_id: '4', status: 'online', views: 42, applications: 8, conversionRate: 19 },
    ];

    assert.deepEqual(
        filterManagerLivePropertyPerformance(propertyPerformance).map((property) => property.property_id),
        ['1', '4'],
    );
});

test('manager live listing count uses the analytics total before top performer rows', () => {
    assert.equal(
        getManagerLiveListingCount({
            total_properties: 8,
            propertyPerformance: [],
        }),
        8,
    );
    assert.equal(
        getManagerLiveListingCount({
            active_listings: 3,
            total_properties: 8,
            propertyPerformance: [],
        }),
        3,
    );
    assert.equal(
        getManagerLiveListingCount({
            propertyPerformance: [
                { property: 'Published listing', property_id: '1', status: 'published', views: 12, applications: 2, conversionRate: 10 },
                { property: 'Draft listing', property_id: '2', status: 'draft', views: 4, applications: 0, conversionRate: 0 },
            ],
        }),
        1,
    );
    assert.equal(
        getManagerLiveListingCount(null, [
            { status: 'available' },
            { status: 'pending_approval' },
            { status: 'online' },
        ]),
        2,
    );
});
