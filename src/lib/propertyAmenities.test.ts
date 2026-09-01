import test from 'node:test';
import assert from 'node:assert/strict';

import { flattenPropertyAmenities } from './propertyAmenities';

test('property details include security and utility amenities', () => {
  const amenities = flattenPropertyAmenities({
    interior: ['ac'],
    exterior: ['balcony'],
    community: ['gym'],
    security: ['cctv'],
    utilities: ['wifi'],
  });

  assert.deepEqual(amenities, ['ac', 'balcony', 'gym', 'cctv', 'wifi']);
});

test('property details remove duplicate amenities without changing their order', () => {
  const amenities = flattenPropertyAmenities({
    interior: ['ac'],
    exterior: ['balcony'],
    community: ['gym'],
    security: ['cctv'],
    utilities: ['wifi', 'cctv'],
  });

  assert.deepEqual(amenities, ['ac', 'balcony', 'gym', 'cctv', 'wifi']);
});
