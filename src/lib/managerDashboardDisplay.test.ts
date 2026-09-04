import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getManagerLiveResponseBadge,
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
