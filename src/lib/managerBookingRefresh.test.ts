import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCurrentBookingRequest,
  markBookingConfirmed,
  nextBookingRequestGeneration,
} from './managerBookingRefresh';

test('a stale booking refresh cannot overwrite a confirmed reservation', () => {
  const firstRequest = nextBookingRequestGeneration(0);
  const confirmationGeneration = nextBookingRequestGeneration(firstRequest);
  const confirmed = markBookingConfirmed([
    { id: 'booking-1', status: 'pending' },
    { id: 'booking-2', status: 'pending' },
  ], 'booking-1');

  assert.equal(isCurrentBookingRequest(firstRequest, confirmationGeneration), false);
  assert.deepEqual(confirmed, [
    { id: 'booking-1', status: 'confirmed' },
    { id: 'booking-2', status: 'pending' },
  ]);
});

test('the latest booking refresh remains eligible to update state', () => {
  const firstRequest = nextBookingRequestGeneration(0);
  const latestRequest = nextBookingRequestGeneration(firstRequest);

  assert.equal(isCurrentBookingRequest(firstRequest, latestRequest), false);
  assert.equal(isCurrentBookingRequest(latestRequest, latestRequest), true);
});
