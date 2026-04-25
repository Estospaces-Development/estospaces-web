import test from 'node:test';
import assert from 'node:assert/strict';

import { mapSearchFiltersToCoreQuery } from '@/services/searchService';

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
