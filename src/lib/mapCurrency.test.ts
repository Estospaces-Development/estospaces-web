import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMapPriceInRupees, formatMapPropertyPrice } from './mapCurrency';

test('map prices always use Indian rupees', () => {
  assert.equal(formatMapPriceInRupees(2450), '₹2,450');
  assert.equal(formatMapPriceInRupees(100000), '₹1,00,000');
});

test('map prices use the supplied fallback for unavailable amounts', () => {
  assert.equal(formatMapPriceInRupees(undefined), 'Price unavailable');
  assert.equal(formatMapPriceInRupees(0, 'View'), 'View');
});

test('property map markers use each property currency', () => {
  assert.equal(formatMapPropertyPrice({ price: 2400, currency: 'GBP' }), '£2,400');
  assert.equal(formatMapPropertyPrice({ price: 125000, currency: 'INR' }), '₹1,25,000');
});
