import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getManagerPropertyMapCenter,
  resolveManagerPropertyMapLocation,
} from './managerPropertyMap';

test('manager property map resolves Indian PIN codes before UK-looking city names', () => {
  const location = resolveManagerPropertyMapLocation({
    id: 'property-1',
    title: 'Chennai PIN property',
    city: 'Edinburgh',
    country: 'IN',
    postcode: '600001',
    address_line_1: 'Attur',
  });

  assert.equal(location?.lat, 13.0827);
  assert.equal(location?.lng, 80.2707);
  assert.equal(location?.address, 'Attur, Edinburgh, 600001, IN');
});

test('manager property map resolves UK postcodes and cities for UK listings', () => {
  const postcodeLocation = resolveManagerPropertyMapLocation({
    id: 'property-2',
    title: 'London property',
    country: 'England',
    postcode: 'SW1A 1AA',
  });
  const cityLocation = resolveManagerPropertyMapLocation({
    id: 'property-3',
    title: 'Edinburgh property',
    country: 'Scotland',
    city: 'Edinburgh',
  });

  assert.equal(postcodeLocation?.lat, 51.501);
  assert.equal(postcodeLocation?.lng, -0.1416);
  assert.equal(cityLocation?.lat, 55.9533);
  assert.equal(cityLocation?.lng, -3.1883);
});

test('manager property map centers on the visible property markers', () => {
  const chennai = resolveManagerPropertyMapLocation({ id: '1', title: 'A', country: 'India', postcode: '600001' });
  const guwahati = resolveManagerPropertyMapLocation({ id: '2', title: 'B', country: 'India', postcode: '781001' });

  assert.ok(chennai);
  assert.ok(guwahati);

  const center = getManagerPropertyMapCenter([chennai, guwahati]);

  assert.equal(Number(center[0].toFixed(4)), 19.6136);
  assert.equal(Number(center[1].toFixed(4)), 86.0035);
});
