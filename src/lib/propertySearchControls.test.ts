import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBroaderPropertySearchAttempts,
  getCountryAwarePropertyGroups,
  getPropertySearchSortOptions,
  getSearchFilterValidationMessage,
  getPriceBoundAdjustmentMessage,
  inferSearchMarketFromText,
  getSearchQueryValidationMessage,
  normalizePriceBoundInput,
  normalizePropertySearchSort,
  normalizeRoomBoundInput,
  normalizeSearchQueryInput,
  normalizeSearchMarketParam,
  readSearchUrlFilters,
  serializeSearchMarketParam,
} from './propertySearchControls';

test('search market inference lets a submitted city override stale account geography', () => {
  assert.equal(inferSearchMarketFromText('Chennai'), 'IN');
  assert.equal(inferSearchMarketFromText('Madurai'), 'IN');
  assert.equal(inferSearchMarketFromText('Mysuru'), 'IN');
  assert.equal(inferSearchMarketFromText('Mangaluru'), 'IN');
  assert.equal(inferSearchMarketFromText('Warangal'), 'IN');
  assert.equal(inferSearchMarketFromText('Nagpur'), 'IN');
  assert.equal(inferSearchMarketFromText('Dwarka'), 'IN');
  assert.equal(inferSearchMarketFromText('Thiruvananthapuram'), 'IN');
  assert.equal(inferSearchMarketFromText('600001'), 'IN');
  assert.equal(inferSearchMarketFromText('Belfast'), 'GB');
  assert.equal(inferSearchMarketFromText('SW1A 1AA'), 'GB');
  assert.equal(inferSearchMarketFromText('Chennai, Tamil Nadu'), 'IN');
  assert.equal(inferSearchMarketFromText('Oxford Heights'), null);
  assert.equal(inferSearchMarketFromText('Cambridge Apartments'), null);
  assert.equal(inferSearchMarketFromText('luxury apartment'), null);
});

test('broader search never removes an explicitly selected location', () => {
  const attempts = buildBroaderPropertySearchAttempts({
    market: 'IN',
    location: 'Chennai',
    propertyType: '',
    listingType: '',
    minPrice: '1000000',
    maxPrice: '2000000',
    bedrooms: '',
    baths: '',
    sortBy: 'relevance',
  });

  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.filters.location, 'Chennai');
  assert.equal(attempts.some((attempt) => !attempt.filters.location), false);
  assert.deepEqual(buildBroaderPropertySearchAttempts({
    market: 'IN',
    location: 'Chennai',
    propertyType: '',
    listingType: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    baths: '',
    sortBy: 'relevance',
  }), []);
});

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

test('search query normalization preserves casing while trimming, collapsing spacing, and capping long values', () => {
  const longQuery = Array.from({ length: 80 }, () => 'ATTUR').join(' ');

  assert.equal(normalizeSearchQueryInput('  ATTUR   ATTUR  '), 'ATTUR ATTUR');
  assert.equal(normalizeSearchQueryInput(longQuery).length <= 120, true);
  assert.match(normalizeSearchQueryInput(longQuery), /^ATTUR ATTUR/);
});

test('search query validation rejects explicit blank invalid and over-limit queries', () => {
  assert.equal(getSearchQueryValidationMessage('', true), 'Enter a search term.');
  assert.match(getSearchQueryValidationMessage('<script>'), /letters/);
  assert.match(getSearchQueryValidationMessage('@@@###'), /letters/);
  assert.match(getSearchQueryValidationMessage('a'.repeat(121)), /120 characters/);
  assert.equal(getSearchQueryValidationMessage('Attur PR1 5QH'), '');
  assert.equal(getSearchQueryValidationMessage('Flat #12'), '');
  assert.equal(getSearchQueryValidationMessage('Smith & Sons'), '');
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
    query: 'ATTUR',
    market: '',
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

test('search URL filters preserve India and England market context', () => {
  assert.equal(normalizeSearchMarketParam('england'), 'GB');
  assert.equal(normalizeSearchMarketParam('country=bad'), '');
  assert.equal(serializeSearchMarketParam('GB'), 'england');
  assert.equal(serializeSearchMarketParam('IN'), 'india');

  assert.deepEqual(readSearchUrlFilters(new URLSearchParams('market=england&location=London')), {
    query: '',
    market: 'GB',
    location: 'London',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    baths: '',
    listingType: '',
    sortBy: 'relevance',
    page: 1,
  });

  assert.equal(
    getSearchFilterValidationMessage(new URLSearchParams('market=Atlantis')),
    'Some search filters were adjusted: market must be India or England.',
  );
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

test('country-aware groups provide a stable fallback group for India launch discover results', () => {
  assert.deepEqual(
    getCountryAwarePropertyGroups([
      { id: 'p1', city: 'Chennai', location: 'Chennai', title: 'One' },
      { id: 'p2', city: 'Bengaluru', location: 'Bengaluru', title: 'Two' },
    ]),
    [{ key: 'IN', label: 'India properties', count: 2 }],
  );
  assert.deepEqual(getCountryAwarePropertyGroups([]), []);
});

test('country-aware groups infer legacy UK listings from their postcode instead of labelling them as India', () => {
  assert.deepEqual(
    getCountryAwarePropertyGroups([
      { id: 'in-1', city: 'Chennai', location: 'Chennai, 600040' },
      { id: 'uk-1', city: 'Manchester', location: 'Manchester, PR15QH' },
    ]),
    [
      { key: 'IN', label: 'India properties', count: 1 },
      { key: 'GB', label: 'United Kingdom properties', count: 1 },
    ],
  );
});
