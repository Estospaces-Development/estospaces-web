import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterPropertiesForMarket,
  getPropertyMarket,
  isPropertyInMarket,
} from '@/lib/propertyMarket';

test('resolves explicit and legacy property markets without defaulting unknown listings', () => {
  assert.equal(getPropertyMarket({ country: 'India', postcode: '600040' }), 'IN');
  assert.equal(getPropertyMarket({ countryCode: 'GB', postcode: 'M1 1AE' }), 'GB');
  assert.equal(getPropertyMarket({ location: 'Manchester, PR1 5QH' }), 'GB');
  assert.equal(getPropertyMarket({ city: 'Chennai' }), null);
});

test('market filtering excludes another market and listings with unknown market metadata', () => {
  const properties = [
    { id: 'india', country: 'India', postcode: '600040' },
    { id: 'uk', country: 'United Kingdom', postcode: 'M1 1AE' },
    { id: 'unknown', city: 'Unknown city' },
  ];

  assert.deepEqual(filterPropertiesForMarket(properties, 'IN').map(({ id }) => id), ['india']);
  assert.equal(isPropertyInMarket(properties[1], 'IN'), false);
});
