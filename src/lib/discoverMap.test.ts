import assert from 'node:assert/strict';
import test from 'node:test';

import { toDiscoverNearbyMapProperties } from './discoverMap';
import type { SearchResult } from '@/services/searchService';

const property = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    id: 'property-1',
    title: 'London home',
    description: '',
    price: 425000,
    currency: 'GBP',
    property_type: 'flat',
    listing_type: 'sale',
    location: 'London',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    countryCode: 'GB',
    bedrooms: 2,
    bathrooms: 1,
    square_feet: 800,
    images: [],
    is_verified: true,
    is_fast_track: false,
    broker_name: 'QA Manager',
    broker_rating: 5,
    response_time_badge: '',
    view_count: 0,
    created_at: '2026-08-16T00:00:00Z',
    latitude: 51.501,
    longitude: -0.141,
    ...overrides,
});

test('discover map preserves the listing currency and country context', () => {
    const [mapped] = toDiscoverNearbyMapProperties([property()]);

    assert.equal(mapped.currency, 'GBP');
    assert.equal(mapped.country, 'United Kingdom');
    assert.equal(mapped.countryCode, 'GB');
});

test('discover map converts persisted string coordinates into real marker coordinates', () => {
    const [mapped] = toDiscoverNearbyMapProperties([property({
        latitude: '13.0827' as unknown as number,
        longitude: '80.2707' as unknown as number,
    })]);

    assert.equal(mapped.latitude, 13.0827);
    assert.equal(mapped.longitude, 80.2707);
});
