import assert from 'node:assert/strict';
import test from 'node:test';

import {
  areCoordinatesInsideLaunchMarket,
  getVerifiedPropertyMapCoordinates,
  isValidGeographicCoordinates,
  normalizeMapCoordinate,
} from './mapCoordinates';

test('normalizes persisted numeric map coordinates without inventing values', () => {
  assert.equal(normalizeMapCoordinate('13.0827'), 13.0827);
  assert.equal(normalizeMapCoordinate(80.2707), 80.2707);
  assert.equal(normalizeMapCoordinate(''), null);
  assert.equal(normalizeMapCoordinate('unknown'), null);
});

test('accepts verified India and UK property coordinates', () => {
  assert.deepEqual(getVerifiedPropertyMapCoordinates({
    country: 'India',
    postcode: '600001',
    latitude: 13.0827,
    longitude: 80.2707,
  }), { latitude: 13.0827, longitude: 80.2707 });
  assert.deepEqual(getVerifiedPropertyMapCoordinates({
    countryCode: 'GB',
    postcode: 'SW1A 1AA',
    latitude: '51.5072',
    longitude: '-0.1276',
  }), { latitude: 51.5072, longitude: -0.1276 });
});

test('accepts legacy launch coordinates when country metadata is absent', () => {
  assert.deepEqual(getVerifiedPropertyMapCoordinates({
    latitude: 19.076,
    longitude: 72.8777,
  }), { latitude: 19.076, longitude: 72.8777 });
});

test('rejects sentinel, invalid, unsupported, and country-inconsistent property coordinates', () => {
  assert.equal(getVerifiedPropertyMapCoordinates({ latitude: 0, longitude: 0 }), null);
  assert.equal(getVerifiedPropertyMapCoordinates({ latitude: 86, longitude: 80 }), null);
  assert.equal(getVerifiedPropertyMapCoordinates({
    country: 'India',
    postcode: '600001',
    latitude: 51.5072,
    longitude: -0.1276,
  }), null);
  assert.equal(getVerifiedPropertyMapCoordinates({
    country: 'United States',
    latitude: 37.3318,
    longitude: -122.0312,
  }), null);
});

test('validates creation coordinates against the selected launch market', () => {
  assert.equal(areCoordinatesInsideLaunchMarket(13.0827, 80.2707, 'IN'), true);
  assert.equal(areCoordinatesInsideLaunchMarket(13.0827, 80.2707, 'GB'), false);
  assert.equal(areCoordinatesInsideLaunchMarket(51.5072, -0.1276, 'GB'), true);
  assert.equal(isValidGeographicCoordinates(0, 0), false);
});
