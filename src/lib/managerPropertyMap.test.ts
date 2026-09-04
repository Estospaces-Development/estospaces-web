import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getManagerPropertyMapCenter,
  resolveManagerPropertyMapLocation,
  toggleManagerMapFilter,
} from './managerPropertyMap';

test('manager can hide and restore property markers without changing their stored locations', () => {
  const properties = [{ id: 'listing-1', type: 'property' }, { id: 'listing-2', type: 'property' }];
  const initial = ['property'];
  const hidden = toggleManagerMapFilter(initial, 'property');
  assert.equal(properties.filter((property) => hidden.includes(property.type)).length, 0);
  assert.deepEqual(hidden, []);
  const restored = toggleManagerMapFilter(hidden, 'property');
  assert.deepEqual(restored, ['property']);
  assert.equal(properties.filter((property) => restored.includes(property.type)).length, 2);
  assert.deepEqual(initial, ['property']);
  assert.equal(properties.length, 2);
});

test('toggling a map filter preserves other active filters', () => {
  assert.deepEqual(toggleManagerMapFilter(['property', 'other'], 'property'), ['other']);
  assert.deepEqual(toggleManagerMapFilter(['other'], 'property'), ['other', 'property']);
});

test('manager property map uses the persisted listing coordinates', () => {
  const location = resolveManagerPropertyMapLocation({
    id: 'property-1',
    title: 'Chennai listing',
    city: 'Edinburgh',
    country: 'IN',
    postcode: '600001',
    address_line_1: 'Attur',
    location: { latitude: '13.0827', longitude: '80.2707' },
  });

  assert.equal(location?.lat, 13.0827);
  assert.equal(location?.lng, 80.2707);
  assert.equal(location?.address, 'Attur, Edinburgh, 600001, IN');
});

test('manager property map accepts the flat coordinate fields returned by core', () => {
  const location = resolveManagerPropertyMapLocation({
    id: 'property-flat',
    title: 'Persisted core property',
    latitude: 19.076,
    longitude: 72.8777,
  });

  assert.equal(location?.lat, 19.076);
  assert.equal(location?.lng, 72.8777);
});

test('manager property map excludes listings without persisted coordinates', () => {
  assert.equal(resolveManagerPropertyMapLocation({
    id: 'property-2',
    title: 'London property',
    country: 'England',
    postcode: 'SW1A 1AA',
  }), null);
  assert.equal(resolveManagerPropertyMapLocation({
    id: 'property-3',
    title: 'Edinburgh property',
    country: 'Scotland',
    city: 'Edinburgh',
  }), null);
});

test('manager property map centers on the visible property markers', () => {
  const chennai = resolveManagerPropertyMapLocation({ id: '1', title: 'A', location: { latitude: 13.0827, longitude: 80.2707 } });
  const guwahati = resolveManagerPropertyMapLocation({ id: '2', title: 'B', location: { latitude: 26.1445, longitude: 91.7362 } });

  assert.ok(chennai);
  assert.ok(guwahati);

  const center = getManagerPropertyMapCenter([chennai, guwahati]);

  assert.equal(Number(center[0].toFixed(4)), 19.6136);
  assert.equal(Number(center[1].toFixed(4)), 86.0035);
});
