import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGeoMarket } from '@/lib/geoMarket';
import { getFastTrackGeoMarketSignals } from '@/lib/fastTrackGeoMarket';

test('Fast Track compliance follows the property country instead of the user profile location', () => {
  const signals = getFastTrackGeoMarketSignals('India', {
    countryCode: 'GB',
    country: 'United Kingdom',
    postcode: 'SW1A 1AA',
  });

  assert.deepEqual(signals, { countryName: 'India' });
  assert.equal(resolveGeoMarket(signals), 'IN');
});

test('Fast Track falls back to the user market when an older case has no property country', () => {
  const signals = getFastTrackGeoMarketSignals('', {
    countryCode: 'GB',
    country: 'United Kingdom',
    postcode: 'SW1A 1AA',
  });

  assert.equal(resolveGeoMarket(signals), 'GB');
});
