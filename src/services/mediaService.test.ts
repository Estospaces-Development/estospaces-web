import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_CHUNKED_UPLOAD_THRESHOLD_BYTES,
  planMediaUploadChunks,
  uploadMediaFile,
  uploadMediaFiles,
  usesChunkedMediaUpload,
} from '@/services/mediaService';

const jsonResponse = (status: number, payload: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(headers),
  text: async () => JSON.stringify(payload),
}) as Response;

test('a 52 MB file is planned as four consecutive chunks of at most 16 MB', () => {
  assert.deepEqual(planMediaUploadChunks(52_000_000, 16_000_000), [
    { index: 0, start: 0, end: 16_000_000 },
    { index: 1, start: 16_000_000, end: 32_000_000 },
    { index: 2, start: 32_000_000, end: 48_000_000 },
    { index: 3, start: 48_000_000, end: 52_000_000 },
  ]);
  assert.deepEqual(planMediaUploadChunks(32_000_000, 16_000_000).map((chunk) => chunk.end), [16_000_000, 32_000_000]);
  assert.deepEqual(planMediaUploadChunks(0, 16_000_000), []);
});

test('files up to 24 MB keep the single POST; larger files use chunks', () => {
  assert.equal(MEDIA_CHUNKED_UPLOAD_THRESHOLD_BYTES, 24_000_000);
  assert.equal(usesChunkedMediaUpload(24_000_000), false);
  assert.equal(usesChunkedMediaUpload(24_000_001), true);
  assert.equal(usesChunkedMediaUpload(52_000_000), true);
});

const captureRequests = async (file: File, failFirstAttemptOf?: string) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body: BodyInit | null | undefined }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || 'GET');
    requests.push({ url, method, body: init?.body });
    if (failFirstAttemptOf && url.endsWith(failFirstAttemptOf) && requests.filter((r) => r.url === url).length === 1) {
      throw new TypeError('Failed to fetch');
    }
    if (url.endsWith('/api/v1/media/uploads')) {
      return jsonResponse(201, { success: true, data: { upload_id: 'up-1', chunk_size: 16_000_000, total_chunks: 4 } });
    }
    if (method === 'PUT') {
      return jsonResponse(200, { success: true, data: {} });
    }
    return jsonResponse(201, { success: true, data: { id: 'media-1', file_url: 'https://example.test/a.jpg' } });
  }) as typeof fetch;
  try {
    const media = await uploadMediaFile(file, 'property', 'property-1', 'Front');
    return { media, requests };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('a 52 MB image is uploaded as init, four chunk PUTs and complete, retrying a failed chunk once', async () => {
  const file = new File([new Uint8Array(52_000_000)], 'big.jpg', { type: 'image/jpeg' });
  const { media, requests } = await captureRequests(file, '/uploads/up-1/chunks/1');

  assert.equal(media.id, 'media-1');
  const init = requests[0];
  assert.equal(init.method, 'POST');
  assert.match(init.url, /\/api\/v1\/media\/uploads$/);
  assert.deepEqual(JSON.parse(String(init.body)), {
    file_name: 'big.jpg',
    mime_type: 'image/jpeg',
    file_size: 52_000_000,
    entity_type: 'property',
    entity_id: 'property-1',
    alt_text: 'Front',
    is_public: true,
  });

  const puts = requests.filter((request) => request.method === 'PUT');
  assert.deepEqual(
    puts.map((request) => [request.url.replace(/^.*\/uploads\//, ''), (request.body as Blob).size]),
    [
      ['up-1/chunks/0', 16_000_000],
      ['up-1/chunks/1', 16_000_000],
      ['up-1/chunks/1', 16_000_000],
      ['up-1/chunks/2', 16_000_000],
      ['up-1/chunks/3', 4_000_000],
    ],
  );
  const last = requests[requests.length - 1];
  assert.equal(last.method, 'POST');
  assert.match(last.url, /\/api\/v1\/media\/uploads\/up-1\/complete$/);
});

test('a file at the 24 MB threshold is sent as one multipart POST', async () => {
  const file = new File([new Uint8Array(24_000_000)], 'photo.jpg', { type: 'image/jpeg' });
  const { requests } = await captureRequests(file);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.match(requests[0].url, /\/api\/v1\/media$/);
  assert.ok(requests[0].body instanceof FormData);
});

test('rate-limited init, chunk and complete requests wait for Retry-After and try again', async () => {
  const originalFetch = globalThis.fetch;
  const seen = new Map<string, number>();
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = `${init?.method} ${url.replace(/^.*\/api\/v1\/media/, '')}`;
    requests.push(key);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    // Every request is refused twice before it succeeds.
    if ((seen.get(key) ?? 0) <= 2) {
      return jsonResponse(429, { success: false, error: 'Too many requests. Please slow down.' }, { 'Retry-After': '0' });
    }
    if (key === 'POST /uploads') {
      return jsonResponse(201, { success: true, data: { upload_id: 'up-1', chunk_size: 16_000_000, total_chunks: 2 } });
    }
    if (init?.method === 'PUT') return jsonResponse(200, { success: true, data: {} });
    return jsonResponse(201, { success: true, data: { id: 'media-1' } });
  }) as typeof fetch;
  try {
    const media = await uploadMediaFile(new File([new Uint8Array(30_000_000)], 'big.jpg', { type: 'image/jpeg' }), 'property', 'p-1');
    assert.equal(media.id, 'media-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual([...seen.entries()], [
    ['POST /uploads', 3],
    ['PUT /uploads/up-1/chunks/0', 3],
    ['PUT /uploads/up-1/chunks/1', 3],
    ['POST /uploads/up-1/complete', 3],
  ]);
});

test('a request still rate limited after four attempts fails with the 429', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return jsonResponse(429, { success: false, error: 'Too many requests. Please slow down.' }, { 'Retry-After': '0' });
  }) as typeof fetch;
  try {
    await assert.rejects(
      uploadMediaFile(new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }), 'property', 'p-1'),
      (error: { status?: number }) => error.status === 429,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(calls, 4);
});

test('property media batches upload at most two files at a time and keep their order', async () => {
  const originalFetch = globalThis.fetch;
  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const name = ((init?.body as FormData).get('file') as File).name;
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return jsonResponse(201, { success: true, data: { id: name, file_url: `https://example.test/${name}` } });
  }) as typeof fetch;
  const files = ['a', 'b', 'c', 'd', 'e'].map((name) => new File([new Uint8Array(4)], name, { type: 'image/jpeg' }));
  try {
    const uploaded = await uploadMediaFiles(files, 'property', 'p-1');
    assert.deepEqual(uploaded.map((media) => media.id), ['a', 'b', 'c', 'd', 'e']);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(maxInFlight, 2);
});
