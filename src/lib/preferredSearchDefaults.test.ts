import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePreferredSearchDefaults } from './preferredSearchDefaults';

test('country-level search preference selects a market without treating the country as a city', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('India'), { market: 'IN', location: '' });
  assert.deepEqual(resolvePreferredSearchDefaults('United Kingdom'), { market: 'GB', location: '' });
});

test('recognized preferred cities select their market and retain a usable city filter', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('Chennai'), { market: 'IN', location: 'Chennai' });
  assert.deepEqual(resolvePreferredSearchDefaults('Chennai, Tamil Nadu'), { market: 'IN', location: 'Chennai' });
});

test('unrecognized preference does not silently switch the account market', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('Oxford Heights'), { market: null, location: '' });
  assert.deepEqual(resolvePreferredSearchDefaults(''), { market: null, location: '' });
});
