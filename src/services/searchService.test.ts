import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mapCorePropertySectionToSearchSection,
    mapSearchFiltersToCoreQuery,
} from '@/services/searchService';

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

test('core property search keeps city location as city filter', () => {
    const params = mapSearchFiltersToCoreQuery('', {
        location: 'Preston',
        listingType: 'sale',
    });

    assert.equal(params.get('search'), null);
    assert.equal(params.get('city'), 'Preston');
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
            property_type: 'house',
            listing_type: 'rent',
            status: 'published',
            city: 'Attur',
            postcode: 'SW1A 1AA',
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
    assert.equal(section.properties[0].status, 'published');
    assert.deepEqual(section.properties[0].images, ['https://example.com/house.jpg']);
});
