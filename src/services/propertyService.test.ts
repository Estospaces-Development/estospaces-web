import assert from 'node:assert/strict';
import test from 'node:test';

import { clearAuthToken, setAuthToken } from '@/lib/authToken';

import {
  getPropertyContextsByIds,
  getPropertyById,
  getProperties,
  invalidatePropertyDetailCache,
  invalidatePropertyListCache,
  recordPropertyView,
} from './propertyService';

test('property context reads batch referenced ids through the authenticated catalog', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  setAuthToken('signed-in-token');
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      success: true,
      data: [{ id: 'property-1', title: 'Existing property' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await getPropertyContextsByIds(['property-1', 'missing-property', 'property-1']);
    assert.equal(result.error, null);
    assert.equal(result.data?.length, 1);
    assert.match(requestedUrl, /\/api\/v1\/properties\/catalog\/context\?ids=property-1%2Cmissing-property$/);
  } finally {
    clearAuthToken();
    globalThis.fetch = originalFetch;
  }
});

test('property context reads fall back to authenticated detail routes during core version skew', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  setAuthToken('signed-in-token');
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes('/catalog/context?')) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot GET route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const propertyId = url.split('/').pop();
    if (propertyId === 'missing-property') {
      return new Response(JSON.stringify({ success: false, error: 'Property not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: { id: propertyId, title: 'Existing property' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await getPropertyContextsByIds(['property-1', 'missing-property']);
    assert.equal(result.error, null);
    assert.deepEqual(result.data?.map((property) => property.id), ['property-1']);
    assert.equal(requestedUrls.length, 3);
    assert.match(requestedUrls[0], /\/api\/v1\/properties\/catalog\/context\?/);
    assert.match(requestedUrls[1], /\/api\/v1\/properties\/catalog\/property-1$/);
    assert.match(requestedUrls[2], /\/api\/v1\/properties\/catalog\/missing-property$/);
  } finally {
    clearAuthToken();
    globalThis.fetch = originalFetch;
  }
});

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
    clearAuthToken();
    invalidatePropertyListCache();
    globalThis.fetch = originalFetch;
  }
});

test('signed-in property reads use authenticated catalog routes', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    const isList = String(input).includes('/catalog?');
    return new Response(JSON.stringify({
      success: true,
      data: isList
        ? { data: [], pagination: null }
        : { id: 'property-123', title: 'Test property' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  clearAuthToken();
  setAuthToken('signed-in-token');
  invalidatePropertyListCache();
  invalidatePropertyDetailCache('property-123');
  try {
    await getProperties({ page: 1 });
    await getPropertyById('property-123');

    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0], /\/api\/v1\/properties\/catalog\?page=1$/);
    assert.match(requestedUrls[1], /\/api\/v1\/properties\/catalog\/property-123$/);
  } finally {
    clearAuthToken();
    invalidatePropertyListCache();
    invalidatePropertyDetailCache('property-123');
    globalThis.fetch = originalFetch;
  }
});

test('recordPropertyView uses an explicit authenticated view event', async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; method: string } | undefined;

  globalThis.fetch = async (input, init) => {
    request = { url: String(input), method: String(init?.method || 'GET') };
    return new Response(JSON.stringify({
      success: true,
      data: { property_id: 'property-123', recorded: true },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  clearAuthToken();
  setAuthToken('signed-in-token');
  try {
    const result = await recordPropertyView('property-123');
    assert.deepEqual(result, { recorded: true, error: null });
    assert.equal(request?.method, 'POST');
    assert.ok(request?.url.includes('/api/v1/properties/property-123/view'));
  } finally {
    clearAuthToken();
    globalThis.fetch = originalFetch;
  }
});

test('anonymous property reads keep using public catalog routes', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    const isList = new URL(String(input)).pathname.endsWith('/properties');
    return new Response(JSON.stringify({
      success: true,
      data: isList
        ? { data: [], pagination: null }
        : { id: 'property-456', title: 'Public property' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  clearAuthToken();
  invalidatePropertyListCache();
  invalidatePropertyDetailCache('property-456');
  try {
    await getProperties();
    await getPropertyById('property-456');

    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0], /\/api\/v1\/properties$/);
    assert.match(requestedUrls[1], /\/api\/v1\/properties\/property-456$/);
  } finally {
    clearAuthToken();
    invalidatePropertyListCache();
    invalidatePropertyDetailCache('property-456');
    globalThis.fetch = originalFetch;
  }
});
