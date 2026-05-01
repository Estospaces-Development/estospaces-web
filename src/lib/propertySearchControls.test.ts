import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCountryAwarePropertyGroups,
  getPropertySearchSortOptions,
  getSearchFilterValidationMessage,
  getPriceBoundAdjustmentMessage,
  getSearchQueryValidationMessage,
  normalizePriceBoundInput,
  normalizePropertySearchSort,
  normalizeRoomBoundInput,
  normalizeSearchQueryInput,
  readSearchUrlFilters,
} from './propertySearchControls';

test('property search sort helpers expose stable visible options', () => {
  assert.deepEqual(getPropertySearchSortOptions(), [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
  ]);
  assert.equal(normalizePropertySearchSort('price_desc'), 'price_desc');
  assert.equal(normalizePropertySearchSort('unknown'), 'relevance');
});

test('price bound normalization rejects negative and invalid values', () => {
  assert.equal(normalizePriceBoundInput('-1'), '0');
  assert.equal(normalizePriceBoundInput('2500'), '2500');
  assert.equal(normalizePriceBoundInput('999999999'), '100000000');
  assert.equal(normalizePriceBoundInput(''), '');
  assert.equal(normalizePriceBoundInput('not-a-number'), '');
});

test('price bound adjustment messages explain typed corrections', () => {
  assert.equal(getPriceBoundAdjustmentMessage('-1'), 'Price values must be zero or greater.');
  assert.equal(getPriceBoundAdjustmentMessage('999999999'), 'Price values must be 100000000 or less.');
  assert.equal(getPriceBoundAdjustmentMessage('abc'), 'Price values must be numbers.');
  assert.equal(getPriceBoundAdjustmentMessage('2500'), '');
});

test('search query normalization trims, lowercases, collapses spacing, and caps long values', () => {
  const longQuery = Array.from({ length: 80 }, () => 'ATTUR').join(' ');

  assert.equal(normalizeSearchQueryInput('  ATTUR   ATTUR  '), 'attur attur');
  assert.equal(normalizeSearchQueryInput(longQuery).length <= 120, true);
  assert.match(normalizeSearchQueryInput(longQuery), /^attur attur/);
});

test('search query validation rejects explicit blank invalid and over-limit queries', () => {
  assert.equal(getSearchQueryValidationMessage('', true), 'Enter a search term.');
  assert.match(getSearchQueryValidationMessage('<script>'), /letters/);
  assert.match(getSearchQueryValidationMessage('a'.repeat(121)), /120 characters/);
  assert.equal(getSearchQueryValidationMessage('Attur PR1 5QH'), '');
});

test('room bound normalization rejects invalid and over-limit values', () => {
  assert.equal(normalizeRoomBoundInput('1'), '1');
  assert.equal(normalizeRoomBoundInput(' 4 '), '4');
  assert.equal(normalizeRoomBoundInput('abc'), '');
  assert.equal(normalizeRoomBoundInput('999'), '');
  assert.equal(normalizeRoomBoundInput('-1'), '');
});

test('search URL filters normalize direct-link query and numeric filter values', () => {
  const filters = readSearchUrlFilters(new URLSearchParams('q=%20%20ATTUR%20%20&type=sale&minPrice=-1&maxPrice=999999999&beds=1&baths=1&sort=price_desc'));

  assert.deepEqual(filters, {
    query: 'attur',
    location: '',
    propertyType: '',
    minPrice: '0',
    maxPrice: '100000000',
    bedrooms: '1',
    baths: '1',
    listingType: 'sale',
    sortBy: 'price_desc',
    page: 1,
  });
});

test('search URL validation reports invalid price and room filters', () => {
  assert.equal(
    getSearchFilterValidationMessage(new URLSearchParams('minPrice=abc&beds=999&baths=xyz')),
    'Some search filters were adjusted: price values must be numbers; bedroom and bathroom values must be between 0 and 20.',
  );
});

test('search URL validation reports explicit blank query', () => {
  assert.equal(
    getSearchFilterValidationMessage(new URLSearchParams('q=%20%20')),
    'Some search filters were adjusted: Enter a search term.',
  );
});

test('country-aware groups provide a stable fallback group for UK discover results', () => {
  assert.deepEqual(
    getCountryAwarePropertyGroups([
      { id: 'p1', city: 'London', location: 'London', title: 'One' },
      { id: 'p2', city: 'Manchester', location: 'Manchester', title: 'Two' },
    ]),
    [{ key: 'GB', label: 'United Kingdom properties', count: 2 }],
  );
  assert.deepEqual(getCountryAwarePropertyGroups([]), []);
});
