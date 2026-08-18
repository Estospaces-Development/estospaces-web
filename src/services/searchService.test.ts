import test from 'node:test';
import assert from 'node:assert/strict';

import { clearAuthToken, setAuthToken } from '@/lib/authToken';

import {
    buildFallbackPropertySections,
    getExactLocationSuggestion,
    getLocationScopedSearchQuery,
    isLocationAutocompleteSuggestion,
    restorePersistedInferredLocation,
    getPropertySectionsRequestOptions,
    mapCorePropertySectionToSearchSection,
    mapSearchFiltersToCoreQuery,
    PRIMARY_SEARCH_SERVICE_TIMEOUT_MS,
    searchService,
} from '@/services/searchService';

test('exact city autocomplete identifies explicit location intent', () => {
    const city = { text: 'Chennai', type: 'city' as const };

    assert.deepEqual(getExactLocationSuggestion('  CHENNAI ', [city]), city);
});

test('exact postcode autocomplete ignores whitespace differences', () => {
    const postcode = { text: 'SW1A 1AA', type: 'postcode' as const };

    assert.deepEqual(getExactLocationSuggestion('sw1a1aa', [postcode]), postcode);
});

test('property-title suggestions do not reinterpret keyword searches as locations', () => {
    const property = { id: 'property-1', text: 'Chennai', type: 'property' as const };
    const city = { text: 'Chennai', type: 'city' as const };

    assert.equal(getExactLocationSuggestion('Chennai', [property]), null);
    assert.equal(getExactLocationSuggestion('Chennai', [city, property]), null);
    assert.equal(getExactLocationSuggestion('Chennai House', [city]), null);
    assert.equal(isLocationAutocompleteSuggestion(property), false);
    assert.equal(isLocationAutocompleteSuggestion({ text: 'Popular homes', type: 'popular' }), false);
    assert.equal(isLocationAutocompleteSuggestion(city), true);
});

test('property-title ambiguity is checked beyond the visible autocomplete limit', () => {
    const city = { text: 'Oxford', type: 'city' as const };
    const unrelated = Array.from({ length: 10 }, (_, index) => ({
        text: `Oxford area ${index + 1}`,
        type: 'location' as const,
    }));
    const property = { id: 'property-oxford', text: 'Oxford', type: 'property' as const };

    assert.equal(getExactLocationSuggestion('Oxford', [city, ...unrelated, property]), null);
});

test('inferred postcode location is not duplicated in the core search keyword', () => {
    const query = getLocationScopedSearchQuery('PR15QH', 'PR1 5QH', 'PR1 5QH');
    const params = mapSearchFiltersToCoreQuery(query, { location: 'PR1 5QH' });

    assert.equal(query, '');
    assert.equal(params.get('search'), 'PR1 5QH');
});

test('only persisted inferred locations deduplicate equivalent query text after reload', () => {
    assert.equal(getLocationScopedSearchQuery('PR15QH', 'PR1 5QH', 'PR1 5QH'), '');
    assert.equal(getLocationScopedSearchQuery('Chennai', 'Chennai', 'Chennai'), '');
    assert.equal(getLocationScopedSearchQuery('Chennai', 'Chennai', ''), 'Chennai');
    assert.equal(restorePersistedInferredLocation('PR15QH', 'PR1 5QH', '1'), 'PR1 5QH');
    assert.equal(restorePersistedInferredLocation('Chennai', 'Chennai', null), '');
});

test('explicit location filters retain independent property-name keywords', () => {
    assert.equal(getLocationScopedSearchQuery('Chennai House', 'Chennai', ''), 'Chennai House');
});

test('empty property sections can fall back to real public property records', () => {
    const property = {
        id: 'property-1',
        title: 'Chennai Home',
        description: '',
        price: 100000,
        property_type: 'apartment',
        listing_type: 'sale',
        location: 'Chennai',
        city: 'Chennai',
        postcode: '600001',
        bedrooms: 2,
        bathrooms: 2,
        square_feet: 900,
        images: [],
        is_verified: true,
        is_fast_track: false,
        broker_name: 'Agent',
        broker_rating: 0,
        response_time_badge: '',
        view_count: 0,
        created_at: '2026-08-16T00:00:00Z',
    };

    assert.deepEqual(buildFallbackPropertySections([property]), [{
        title: 'Available properties',
        type: 'all',
        properties: [property],
    }]);
    assert.deepEqual(buildFallbackPropertySections([]), []);
});

test('property sections use the signed-in core contract', () => {
    assert.deepEqual(getPropertySectionsRequestOptions(), { suppressErrorToast: true });
    assert.equal('auth' in getPropertySectionsRequestOptions(), false);
});

test('core property search maps spaced postcode location to search', () => {
    const params = mapSearchFiltersToCoreQuery('', {
        location: 'PR1 5QH',
        listingType: 'sale',
    });

    assert.equal(params.get('search'), 'PR1 5QH');
    assert.equal(params.get('city'), null);
    assert.equal(params.get('listing_type'), 'sale');
});

test('core property search maps compact postcode location to search', () => {
    const params = mapSearchFiltersToCoreQuery('', {
        location: 'PR15QH',
        listingType: 'sale',
    });

    assert.equal(params.get('search'), 'PR15QH');
    assert.equal(params.get('city'), null);
});

test('core property search maps Indian PIN location to search', () => {
    const params = mapSearchFiltersToCoreQuery('', {
        location: '600001',
        listingType: 'sale',
    });

    assert.equal(params.get('search'), '600001');
    assert.equal(params.get('city'), null);
    assert.equal(params.get('listing_type'), 'sale');
});
test('core property search keeps non-type keyword and city as separate filters', () => {
    const params = mapSearchFiltersToCoreQuery('Garden', {
        location: 'Chennai',
        propertyType: 'apartment',
        listingType: 'rent',
        limit: 12,
    });

    assert.equal(params.get('search'), 'garden');
    assert.equal(params.get('city'), 'Chennai');
    assert.equal(params.get('type'), 'apartment');
    assert.equal(params.get('listing_type'), 'rent');
    assert.equal(params.get('limit'), '12');
});

test('core property search does not send a keyword already covered by selected property type', () => {
    const params = mapSearchFiltersToCoreQuery('Apartment', {
        location: 'Chennai',
        propertyType: 'apartment',
        listingType: 'rent',
        limit: 12,
    });

    assert.equal(params.get('search'), null);
    assert.equal(params.get('city'), 'Chennai');
    assert.equal(params.get('type'), 'apartment');
    assert.equal(params.get('listing_type'), 'rent');
    assert.equal(params.get('limit'), '12');
});

test('core property search keeps city type and price filters without duplicating type keyword', () => {
    const params = mapSearchFiltersToCoreQuery('apartment', {
        location: 'Guwahati',
        propertyType: 'apartment',
        minPrice: 300000,
        maxPrice: 400000,
        limit: 12,
    });

    assert.equal(params.get('search'), null);
    assert.equal(params.get('city'), 'Guwahati');
    assert.equal(params.get('type'), 'apartment');
    assert.equal(params.get('min_price'), '300000');
    assert.equal(params.get('max_price'), '400000');
});

test('core property search preserves market country filters', () => {
    const gbParams = mapSearchFiltersToCoreQuery('duplex', {
        country: 'England',
        location: 'London',
        propertyType: 'duplex',
        limit: 12,
    });

    assert.equal(gbParams.get('country'), 'GB');
    assert.equal(gbParams.get('city'), 'London');
    assert.equal(gbParams.get('type'), 'duplex');

    const inParams = mapSearchFiltersToCoreQuery('apartment', {
        market: 'india',
        location: 'Guwahati',
        propertyType: 'apartment',
        limit: 12,
    });

    assert.equal(inParams.get('country'), 'IN');
    assert.equal(inParams.get('city'), 'Guwahati');
});

test('core property search normalizes route-loaded query text', () => {
    const params = mapSearchFiltersToCoreQuery('  ATTUR   ATTUR  ', {
        listingType: 'sale',
    });

    assert.equal(params.get('search'), 'attur attur');
});

test('core property search preserves zero-valued numeric boundaries', () => {
    const params = mapSearchFiltersToCoreQuery('attur', {
        listingType: 'sale',
        minPrice: 0,
        maxPrice: 10000,
        minBedrooms: 0,
        minBathrooms: 0,
    });

    assert.equal(params.get('min_price'), '0');
    assert.equal(params.get('max_price'), '10000');
    assert.equal(params.get('min_bedrooms'), '0');
    assert.equal(params.get('min_bathrooms'), '0');
});

test('core property sections map to discovery search results', () => {
    const section = mapCorePropertySectionToSearchSection({
        title: 'Featured Properties',
        type: 'featured',
        properties: [{
            id: 'property-1',
            title: 'Section House',
            description: 'A section-backed property',
            price: 2400,
            currency: 'GBP',
            property_type: 'house',
            listing_type: 'rent',
            status: 'published',
            city: 'Attur',
            postcode: 'SW1A 1AA',
            country: 'GB',
            bedrooms: 3,
            bathrooms: 2,
            views: 9,
            image_urls: ['https://example.com/house.jpg'],
            latitude: 51.5,
            longitude: -0.12,
        }],
    });

    assert.equal(section.title, 'Featured Properties');
    assert.equal(section.type, 'featured');
    assert.equal(section.properties[0].title, 'Section House');
    assert.equal(section.properties[0].location, 'Attur, SW1A 1AA');
    assert.equal(section.properties[0].currency, 'GBP');
    assert.equal(section.properties[0].country, 'GB');
    assert.equal(section.properties[0].countryCode, 'GB');
    assert.equal(section.properties[0].status, 'published');
    assert.deepEqual(section.properties[0].images, ['https://example.com/house.jpg']);
});

test('core property sections normalize stored country names to market codes', () => {
    const section = mapCorePropertySectionToSearchSection({
        properties: [
            { id: 'india-property', country: 'India', postcode: '600001' },
            { id: 'uk-property', country: 'United Kingdom', postcode: 'SW1A 1AA' },
        ],
    });

    assert.deepEqual(section.properties.map((property) => property.country), ['India', 'United Kingdom']);
    assert.deepEqual(section.properties.map((property) => property.countryCode), ['IN', 'GB']);
});

test('explicit unsupported countries are not inferred from launch-format postcodes', () => {
    const section = mapCorePropertySectionToSearchSection({
        properties: [{ id: 'singapore-property', country: 'Singapore', postcode: '600001' }],
    });

    assert.equal(section.properties[0].country, 'Singapore');
    assert.equal(section.properties[0].countryCode, undefined);
});

test('signed-in empty sections load every authenticated catalog page', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.includes('/properties/sections?')) {
            return new Response(JSON.stringify({ success: true, data: { sections: [] } }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }

        const page = Number(new URL(url).searchParams.get('page') || '1');
        return new Response(JSON.stringify({
            success: true,
            data: {
                data: [{
                    id: `property-${page}`,
                    title: `Property ${page}`,
                    country: 'India',
                    postcode: '600001',
                }],
                pagination: { total: 120, page, limit: 50, total_pages: 3 },
            },
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    setAuthToken('signed-in-token');
    try {
        const result = await searchService.getPropertySections('IN');

        assert.equal(result.success, true);
        assert.deepEqual(result.data[0].properties.map((property) => property.id), [
            'property-1',
            'property-2',
            'property-3',
        ]);
        assert.equal(requestedUrls.filter((url) => url.includes('/properties/catalog?')).length, 3);
        assert.equal(requestedUrls.every((url) => !url.includes('/api/v1/properties?')), true);
    } finally {
        clearAuthToken();
        globalThis.fetch = originalFetch;
    }
});

test('section errors recover legacy catalog rows without country metadata', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.includes('/properties/sections?')) {
            return new Response(JSON.stringify({ error: 'sections unavailable' }), {
                status: 503,
                headers: { 'content-type': 'application/json' },
            });
        }

        const hasCountry = new URL(url).searchParams.has('country');
        return new Response(JSON.stringify({
            success: true,
            data: {
                data: hasCountry
                    ? []
                    : [{ id: 'legacy-property', title: 'Legacy Home', postcode: '600001' }],
                pagination: { total: hasCountry ? 0 : 1, page: 1, limit: 100, total_pages: 1 },
            },
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    setAuthToken('signed-in-token');
    try {
        const result = await searchService.getPropertySections('IN');

        assert.equal(result.success, true);
        assert.equal(result.data[0].properties[0].id, 'legacy-property');
        assert.equal(requestedUrls.some((url) => (
            url.includes('/properties/catalog?') && !new URL(url).searchParams.has('country')
        )), true);
    } finally {
        clearAuthToken();
        globalThis.fetch = originalFetch;
    }
});

test('primary public search uses a short fallback timeout for launch readiness', () => {
    assert.equal(PRIMARY_SEARCH_SERVICE_TIMEOUT_MS <= 5000, true);
});
