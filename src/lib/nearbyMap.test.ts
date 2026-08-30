import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateMapDistanceKm,
    getDashboardMapHeightClass,
    getNearbyMapEmptyState,
    hasValidMapCoordinates,
    loadCompleteMapCandidates,
    selectDashboardNearbyProperties,
} from './nearbyMap';

test('reserves enough mobile height for the empty-map action', () => {
    assert.equal(
        getDashboardMapHeightClass(false),
        'h-[320px] sm:h-[300px] lg:h-[320px]',
    );
    assert.equal(
        getDashboardMapHeightClass(true),
        'h-[260px] min-[340px]:h-[280px] sm:h-[350px] lg:h-[400px]',
    );
});

test('explains missing verified pins instead of asking for a location already searched', () => {
    assert.deepEqual(
        getNearbyMapEmptyState([{ latitude: null, longitude: null }], false, 'Postcode'),
        {
            title: 'Map pin unavailable for this matching home',
            description: 'This listing does not have verified coordinates yet, so Estospaces will not place it at an approximate or incorrect location.',
            action: 'open-property',
            actionLabel: 'Open matching home',
        },
    );
});

test('keeps location guidance for the compact dashboard map without results', () => {
    assert.deepEqual(getNearbyMapEmptyState([], true, 'PIN code'), {
        title: 'Add a pin code to unlock the map',
        description: 'Use your profile pin code or search a location to see nearby homes without leaving the dashboard.',
        action: 'location-settings',
        actionLabel: 'Open location settings',
    });
});

test('validates only real persisted map coordinates', () => {
    assert.equal(hasValidMapCoordinates({ latitude: 13.0827, longitude: 80.2707 }), true);
    assert.equal(hasValidMapCoordinates({ latitude: 0, longitude: 0 }), false);
    assert.equal(hasValidMapCoordinates({ latitude: Number.NaN, longitude: 80 }), false);
    assert.equal(hasValidMapCoordinates({ latitude: 91, longitude: 80 }), false);
    assert.equal(hasValidMapCoordinates({ latitude: 13, longitude: 181 }), false);
});

test('selects only the closest dashboard properties inside the nearby radius', () => {
    const userLocation = { latitude: 13.0827, longitude: 80.2707 };
    const properties = [
        { id: 'london', latitude: 51.5072, longitude: -0.1276 },
        { id: 'chennai-farther', latitude: 13.0475, longitude: 80.2090 },
        { id: 'sentinel', latitude: 0, longitude: 0 },
        { id: 'chennai-nearest', latitude: 13.0829, longitude: 80.2709 },
    ];

    assert.deepEqual(
        selectDashboardNearbyProperties(properties, userLocation, 100, 20).map(({ id }) => id),
        ['chennai-nearest', 'chennai-farther'],
    );
});

test('does not label global properties as nearby when the user location is unavailable', () => {
    assert.deepEqual(
        selectDashboardNearbyProperties(
            [{ id: 'london', latitude: 51.5072, longitude: -0.1276 }],
            null,
        ),
        [],
    );
});

test('calculates a stable short-distance result for nearby ranking', () => {
    const distance = calculateMapDistanceKm(
        { latitude: 13.0827, longitude: 80.2707 },
        { latitude: 13.0475, longitude: 80.2090 },
    );

    assert.ok(distance > 7 && distance < 9);
});

test('loads every candidate page before ranking nearby dashboard properties', async () => {
    const requestedPages: number[] = [];
    const properties = await loadCompleteMapCandidates(async (page, limit) => {
        requestedPages.push(page);
        return {
            success: true,
            data: page === 1
                ? [{ id: 'global-page-one' }]
                : [{ id: 'nearby-page-two' }, { id: 'global-page-one' }],
            pagination: { total: 3, page, limit },
        };
    }, 2);

    assert.deepEqual(requestedPages, [1, 2]);
    assert.deepEqual(properties.map(({ id }) => id), ['global-page-one', 'nearby-page-two']);
});

test('loads catalogue pages sequentially to avoid flooding the search service', async () => {
    let activeRequests = 0;
    let peakRequests = 0;

    await loadCompleteMapCandidates(async (page, limit) => {
        activeRequests += 1;
        peakRequests = Math.max(peakRequests, activeRequests);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeRequests -= 1;

        return {
            success: true,
            data: [{ id: `property-${page}` }],
            pagination: { total: 4, page, limit },
        };
    }, 1);

    assert.equal(peakRequests, 1);
});

test('fails closed when any candidate page cannot be loaded', async () => {
    await assert.rejects(
        () => loadCompleteMapCandidates(async (page, limit) => ({
            success: page === 1,
            data: [],
            pagination: { total: 2, page, limit },
        }), 1),
        /Unable to load all nearby map candidates/,
    );
});
