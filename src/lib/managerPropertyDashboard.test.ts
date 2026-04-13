import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MANAGER_LIVE_LISTINGS_STATUS_FILTER,
    MANAGER_LIVE_LISTINGS_VIEW,
    buildManagerActiveListingsPath,
    buildManagerPropertySearchParams,
    getManagerPropertyStatusFilters,
    isManagerLivePropertyStatus,
    managerPropertyStatusFiltersEqual,
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
    assert.equal(
        buildManagerActiveListingsPath(),
        `/manager/dashboard/properties?view=${MANAGER_LIVE_LISTINGS_VIEW}&status=${MANAGER_LIVE_LISTINGS_STATUS_FILTER}`,
    );
});
