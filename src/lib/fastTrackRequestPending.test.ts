import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearFastTrackRequestPending,
  FAST_TRACK_REQUEST_PENDING_TTL_MS,
  getFastTrackDeepLinkOpenKey,
  getFastTrackRequestPendingDelay,
  getFastTrackRequestPendingKey,
  readFastTrackRequestPending,
  resolveFastTrackRequestControlState,
  resolveFastTrackDeepLinkAction,
  shouldClearFastTrackRequestPending,
  writeFastTrackRequestPending,
} from './fastTrackRequestPending';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

test('Fast Track request marker is scoped to the user and property', () => {
  assert.equal(
    getFastTrackRequestPendingKey('user-1', 'property-1'),
    'estospaces:fast-track-request:user-1:property-1',
  );
});

test('pending request clears when a manager-created case is newer than the request', () => {
  const storage = createStorage();
  const key = getFastTrackRequestPendingKey('user-1', 'property-1');
  writeFastTrackRequestPending(storage, key, '2026-08-17T10:00:00.000Z');
  const marker = readFastTrackRequestPending(storage, key);

  assert.equal(shouldClearFastTrackRequestPending(marker, {
    propertyId: 'property-1',
    submittedAt: '2026-08-17T10:01:00.000Z',
  }, 'property-1'), true);
  assert.equal(shouldClearFastTrackRequestPending(marker, {
    propertyId: 'property-1',
    submittedAt: '2026-08-17T09:59:00.000Z',
  }, 'property-1'), false);
  assert.equal(shouldClearFastTrackRequestPending(marker, {
    propertyId: 'property-2',
    submittedAt: '2026-08-17T10:01:00.000Z',
  }, 'property-1'), false);
});

test('legacy pending markers are removed so old deployments cannot block a retry forever', () => {
  const storage = createStorage();
  const key = getFastTrackRequestPendingKey('user-1', 'property-1');
  storage.setItem(key, 'pending');

  assert.equal(readFastTrackRequestPending(storage, key), null);
  assert.equal(storage.getItem(key), null);
});

test('an unanswered Fast Track request expires after 24 hours and can be retried', () => {
  const storage = createStorage();
  const key = getFastTrackRequestPendingKey('user-1', 'property-1');
  const requestedAt = '2026-08-17T10:00:00.000Z';
  writeFastTrackRequestPending(storage, key, requestedAt);

  assert.notEqual(
    readFastTrackRequestPending(storage, key, Date.parse(requestedAt) + 23 * 60 * 60 * 1000),
    null,
  );
  assert.equal(
    readFastTrackRequestPending(storage, key, Date.parse(requestedAt) + 24 * 60 * 60 * 1000),
    null,
  );
  assert.equal(storage.getItem(key), null);
});

test('mounted property page schedules pending-state refresh at the exact expiry', () => {
  const marker = { requestedAt: Date.parse('2026-08-17T10:00:00.000Z') };
  assert.equal(
    getFastTrackRequestPendingDelay(marker, marker.requestedAt + 60_000),
    FAST_TRACK_REQUEST_PENDING_TTL_MS - 60_000,
  );
  assert.equal(
    getFastTrackRequestPendingDelay(marker, marker.requestedAt + FAST_TRACK_REQUEST_PENDING_TTL_MS),
    0,
  );
});

test('dashboard deep link opens only an active case and otherwise waits for an explicit request', () => {
  assert.equal(resolveFastTrackDeepLinkAction({
    fastTrackQuery: '1',
    hasActiveCase: false,
  }), 'show_request_control');
  assert.equal(resolveFastTrackDeepLinkAction({
    fastTrackQuery: '1',
    hasActiveCase: true,
  }), 'open_active_case');
  assert.equal(resolveFastTrackDeepLinkAction({
    fastTrackQuery: null,
    hasActiveCase: false,
  }), 'show_request_control');
});

test('Fast Track deep-link handling uses a stable property-scoped key', () => {
  const firstKey = getFastTrackDeepLinkOpenKey({
    fastTrackQuery: '1',
    hasActiveCase: true,
    propertyID: 'property-1',
  });
  assert.equal(firstKey, 'property-1:fast-track=1');
  assert.equal(getFastTrackDeepLinkOpenKey({
    fastTrackQuery: '1',
    hasActiveCase: false,
    propertyID: 'property-1',
  }), null);
  assert.notEqual(getFastTrackDeepLinkOpenKey({
    fastTrackQuery: '1',
    hasActiveCase: true,
    propertyID: 'property-2',
  }), firstKey);
});

test('accepted request remains pending when browser storage is blocked', () => {
  const storage = {
    getItem: (_key: string): string | null => { throw new Error('blocked'); },
    setItem: (_key: string, _value: string) => { throw new Error('blocked'); },
    removeItem: (_key: string) => { throw new Error('blocked'); },
  };
  const key = getFastTrackRequestPendingKey('user-storage', 'property-storage');
  const marker = writeFastTrackRequestPending(storage, key, '2026-08-17T10:00:00.000Z');

  assert.deepEqual(readFastTrackRequestPending(storage, key), marker);
  clearFastTrackRequestPending(storage, key);
  assert.equal(readFastTrackRequestPending(storage, key), null);
});

test('in-memory fallback expires when browser storage remains blocked', () => {
  const storage = {
    getItem: (_key: string): string | null => { throw new Error('blocked'); },
    setItem: (_key: string, _value: string) => { throw new Error('blocked'); },
    removeItem: (_key: string) => { throw new Error('blocked'); },
  };
  const key = getFastTrackRequestPendingKey('user-memory-expiry', 'property-memory-expiry');
  const requestedAt = '2026-08-17T10:00:00.000Z';
  writeFastTrackRequestPending(storage, key, requestedAt);

  assert.equal(
    readFastTrackRequestPending(storage, key, Date.parse(requestedAt) + FAST_TRACK_REQUEST_PENDING_TTL_MS),
    null,
  );
});

test('manager approval wait disables another request without showing a loading state', () => {
  assert.deepEqual(resolveFastTrackRequestControlState({
    isStarting: false,
    isLookupPending: false,
    isApprovalPending: true,
  }), {
    isBusy: false,
    isDisabled: true,
  });
  assert.deepEqual(resolveFastTrackRequestControlState({
    isStarting: true,
    isLookupPending: false,
    isApprovalPending: false,
  }), {
    isBusy: true,
    isDisabled: true,
  });
});
