import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMapPriceInRupees } from './mapCurrency';

test('map prices always use Indian rupees', () => {
  assert.equal(formatMapPriceInRupees(2450), '₹2,450');
  assert.equal(formatMapPriceInRupees(100000), '₹1,00,000');
});

test('map prices use the supplied fallback for unavailable amounts', () => {
  assert.equal(formatMapPriceInRupees(undefined), 'Price unavailable');
  assert.equal(formatMapPriceInRupees(0, 'View'), 'View');
});
