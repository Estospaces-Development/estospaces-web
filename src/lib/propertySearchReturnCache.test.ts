import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROPERTY_SEARCH_RETURN_CACHE_TTL_MS,
  clearPropertySearchReturnState,
  readPropertySearchReturnState,
  savePropertySearchReturnState,
} from './propertySearchReturnCache';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('property search return cache preserves filters, page, and scroll position', () => {
  const storage = new MemoryStorage();
  const savedAt = 10_000;

  assert.equal(savePropertySearchReturnState(storage, {
    pathname: '/user/dashboard',
    search: 'q=chennai&type=buy&filter=recently_added&page=2',
    scrollY: 987.4,
  }, savedAt), true);

  assert.deepEqual(readPropertySearchReturnState(storage, '/user/dashboard', savedAt + 1_000), {
    pathname: '/user/dashboard',
    search: '?q=chennai&type=buy&filter=recently_added&page=2',
    scrollY: 987,
    savedAt,
  });
});

test('property search return cache expires and clears malformed state', () => {
  const storage = new MemoryStorage();
  const savedAt = 20_000;

  savePropertySearchReturnState(storage, {
    pathname: '/user/dashboard',
    search: '?q=chennai',
    scrollY: 400,
  }, savedAt);

  assert.equal(
    readPropertySearchReturnState(
      storage,
      '/user/dashboard',
      savedAt + PROPERTY_SEARCH_RETURN_CACHE_TTL_MS + 1,
    ),
    null,
  );
  assert.equal(readPropertySearchReturnState(storage, '/user/dashboard', savedAt + 2_000), null);
});

test('property search return cache is path-scoped and can be explicitly cleared', () => {
  const storage = new MemoryStorage();

  savePropertySearchReturnState(storage, {
    pathname: '/user/dashboard',
    search: '?location=Chennai',
    scrollY: 100,
  }, 30_000);

  assert.equal(readPropertySearchReturnState(storage, '/user/search', 30_100), null);
  assert.ok(readPropertySearchReturnState(storage, '/user/dashboard', 30_100));
  clearPropertySearchReturnState(storage, '/user/dashboard');
  assert.equal(readPropertySearchReturnState(storage, '/user/dashboard', 30_100), null);
});

