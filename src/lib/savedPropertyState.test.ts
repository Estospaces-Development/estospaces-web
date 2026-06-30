import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterAndSortSavedProperties,
  getSavedPropertyLocationLabel,
  isSameSavedPropertyId,
  normalizeSavedPropertyId,
} from '@/lib/savedPropertyState';

test('saved property ids normalize casing and whitespace', () => {
  assert.equal(normalizeSavedPropertyId(' CFBBCE8A-D25A-4699-A0BF-90DC04224CA1 '), 'cfbbce8a-d25a-4699-a0bf-90dc04224ca1');
  assert.equal(isSameSavedPropertyId('CFBBCE8A-D25A-4699-A0BF-90DC04224CA1', 'cfbbce8a-d25a-4699-a0bf-90dc04224ca1'), true);
});

test('saved property location label falls back through city and postcode', () => {
  assert.equal(
    getSavedPropertyLocationLabel({
      title: 'Property x',
      city: 'Attur',
      postcode: 'SW1A1AA',
    }),
    'Attur, SW1A1AA',
  );
  assert.equal(
    getSavedPropertyLocationLabel({
      location: { city: 'Edinburgh', postcode: 'EH1 1AA' },
    }),
    'Edinburgh, EH1 1AA',
  );
});

test('saved property filters match title type and location fallback', () => {
  const properties = [
    { title: 'River Loft', property_type: 'apartment', city: 'Attur', postcode: 'SW1A1AA', price: 2500 },
    { title: 'Garden House', property_type: 'house', location: { city: 'Edinburgh', postcode: 'EH1 1AA' }, price: 1800 },
  ];

  assert.deepEqual(
    filterAndSortSavedProperties(properties, 'eh1', 'newest').map((property) => property.title),
    ['Garden House'],
  );
  assert.deepEqual(
    filterAndSortSavedProperties(properties, 'apartment', 'newest').map((property) => property.title),
    ['River Loft'],
  );
});

test('saved property sorting supports price and title controls', () => {
  const properties = [
    { title: 'Zed Flat', price: 3200, created_at: '2026-04-28T00:00:00Z' },
    { title: 'Alpha House', price: 1800, created_at: '2026-04-29T00:00:00Z' },
  ];

  assert.deepEqual(
    filterAndSortSavedProperties(properties, '', 'price_asc').map((property) => property.title),
    ['Alpha House', 'Zed Flat'],
  );
  assert.deepEqual(
    filterAndSortSavedProperties(properties, '', 'price_desc').map((property) => property.title),
    ['Zed Flat', 'Alpha House'],
  );
  assert.deepEqual(
    filterAndSortSavedProperties(properties, '', 'title_asc').map((property) => property.title),
    ['Alpha House', 'Zed Flat'],
  );
});
