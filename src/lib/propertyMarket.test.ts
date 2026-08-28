import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterPropertiesForMarket,
  getPropertyMarket,
  isPropertyInMarket,
} from '@/lib/propertyMarket';

test('resolves explicit and legacy property markets without defaulting unknown listings', () => {
  assert.equal(getPropertyMarket({ country: 'India', postcode: '600040' }), 'IN');
  assert.equal(getPropertyMarket({ country: 'IN', postcode: '600040' }), 'IN');
  assert.equal(getPropertyMarket({ country: 'GB', postcode: 'M1 1AE' }), 'GB');
  assert.equal(getPropertyMarket({ countryCode: 'GB', postcode: 'M1 1AE' }), 'GB');
  assert.equal(getPropertyMarket({ location: 'Manchester, PR1 5QH' }), 'GB');
  assert.equal(getPropertyMarket({ city: 'Chennai' }), null);
  assert.equal(getPropertyMarket({ country: 'US', postcode: '600040' }), null);
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

test('market filtering reads structured saved-property location metadata', () => {
  const properties = [
    {
      id: 'india-nested',
      city: 'Chennai',
      location: { countryCode: 'IN', postalCode: '600001' },
    },
    {
      id: 'uk-nested',
      city: 'Manchester',
      location: { countryCode: 'GB', postalCode: 'PR15QH' },
    },
  ];

  assert.deepEqual(filterPropertiesForMarket(properties, 'IN').map(({ id }) => id), ['india-nested']);
});

test('top-level country metadata stays authoritative over stale nested location data', () => {
  assert.equal(getPropertyMarket({
    countryCode: 'IN',
    location: { country: 'United Kingdom', postalCode: 'PR15QH' },
  }), 'IN');
  assert.equal(getPropertyMarket({
    country: 'India',
    location: { countryCode: 'GB', postalCode: 'PR15QH' },
  }), 'IN');
  assert.equal(getPropertyMarket({
    countryCode: 'GB',
    location: { country: 'India', postalCode: '600001' },
  }), 'GB');
});
