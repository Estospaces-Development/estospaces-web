import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSearchHistoryLabel,
  buildSearchHistoryMeta,
  buildSearchHistoryUrlParams,
  parseSearchHistoryFilters,
} from '@/lib/searchHistory';

test('search history parses serialized filter JSON', () => {
  assert.deepEqual(parseSearchHistoryFilters('{"location":"Attur","listing_type":"rent"}'), {
    location: 'Attur',
    listing_type: 'rent',
  });
  assert.deepEqual(parseSearchHistoryFilters('not json'), {});
});

test('search history builds accessible labels and result status', () => {
  assert.equal(buildSearchHistoryLabel({ query: '  ATTUR  ' }), 'attur');
  assert.equal(buildSearchHistoryLabel({ filters: '{"location":"North London"}' }), 'North London');
  assert.equal(buildSearchHistoryMeta({ result_count: 1 }), '1 result');
  assert.equal(buildSearchHistoryMeta({ result_count: 4 }), '4 results');
});

test('search history builds refresh-safe URL params', () => {
  const params = buildSearchHistoryUrlParams({
    query: ' Attur ',
    location: 'Bengaluru',
    filters: '{"property_type":"apartment","listing_type":"rent","min_price":0,"max_price":2500,"bedrooms":2,"bathrooms":1}',
  });

  assert.equal(params.get('q'), 'attur');
  assert.equal(params.get('location'), 'Bengaluru');
  assert.equal(params.get('propertyType'), 'apartment');
  assert.equal(params.get('type'), 'rent');
  assert.equal(params.get('minPrice'), '0');
  assert.equal(params.get('maxPrice'), '2500');
  assert.equal(params.get('beds'), '2');
  assert.equal(params.get('baths'), '1');
  assert.equal(params.get('page'), '1');
});
