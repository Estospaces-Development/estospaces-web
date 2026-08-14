import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProperties,
  invalidatePropertyListCache,
} from './propertyService';

test('property list reads share one request and ignore legacy route cache keys', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  let releaseResponse: (() => void) | undefined;
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    await responseReady;
    return new Response(JSON.stringify({
      success: true,
      data: {
        data: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          total_pages: 1,
        },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  invalidatePropertyListCache();
  try {
    const first = getProperties({
      page: 1,
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
      _cache_key: 1,
    });
    const second = getProperties({
      sort_order: 'desc',
      _cache_key: 2,
      limit: 12,
      sort_by: 'created_at',
      page: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(requestedUrls.length, 1);
    assert.ok(!requestedUrls[0].includes('_cache_key'));

    releaseResponse?.();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult.error, null);
    assert.equal(secondResult.error, null);

    await getProperties({
      page: 1,
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    assert.equal(requestedUrls.length, 1);

    invalidatePropertyListCache();
    await getProperties({
      page: 1,
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    assert.equal(requestedUrls.length, 2);
  } finally {
    invalidatePropertyListCache();
    globalThis.fetch = originalFetch;
  }
});
