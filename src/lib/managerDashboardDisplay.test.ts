import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getManagerLiveResponseBadge,
  getManagerPropertyLocation,
  resolveManagerPropertySize,
} from './managerDashboardDisplay';

test('manager property cards use the API property size field', () => {
  assert.equal(resolveManagerPropertySize({ property_size_sqft: 1450 }), 1450);
});

test('manager property cards retain compatibility with mapped area fields', () => {
  assert.equal(resolveManagerPropertySize({ area: 900, sqft: 850 }), 900);
  assert.equal(resolveManagerPropertySize({ sqft: 850 }), 850);
  assert.equal(resolveManagerPropertySize({}), 0);
});

test('offline manager response badge does not imply a monitored queue', () => {
  assert.equal(
    getManagerLiveResponseBadge({
      availableForFastResponse: false,
      availabilityBlockedReason: null,
      pendingCount: 0,
    }),
    'Not tracking',
  );
});

test('live manager response badge reports the active waiting count', () => {
  assert.equal(
    getManagerLiveResponseBadge({
      availableForFastResponse: true,
      availabilityBlockedReason: null,
      pendingCount: 2,
    }),
    '2 waiting',
  );
});

test('manager property cards compose raw API address fields', () => {
  assert.equal(
    getManagerPropertyLocation({
      address_line_1: 'Jantar Mantar Road',
      city: 'New Delhi',
      postcode: '600005',
      country: 'India',
    }),
    'Jantar Mantar Road, New Delhi, 600005, India',
  );
});
