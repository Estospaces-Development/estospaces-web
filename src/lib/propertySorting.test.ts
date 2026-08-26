import test from 'node:test';
import assert from 'node:assert/strict';

import { sortProperties } from './propertySorting';

test('property price sorting compares numeric amounts even when currencies are mixed', () => {
  const properties = [
    { id: 'inr', price: { amount: 100000, currency: 'INR' }, priceString: '₹1,00,000' },
    { id: 'gbp', price: { amount: 1850, currency: 'GBP' }, priceString: '£1,850' },
  ];

  assert.deepEqual(
    sortProperties(properties, 'price', 'asc').map((property) => property.id),
    ['inr', 'gbp'],
  );
  assert.deepEqual(
    sortProperties(properties, 'price', 'desc').map((property) => property.id),
    ['gbp', 'inr'],
  );
});
