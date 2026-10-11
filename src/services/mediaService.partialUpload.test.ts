import test from 'node:test';
import assert from 'node:assert/strict';

import { uploadMediaFiles, uploadMediaFilesSettled } from '@/services/mediaService';

const jsonResponse = (status: number, payload: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(),
  text: async () => JSON.stringify(payload),
}) as Response;

const makeFiles = (...names: string[]) => names.map((name) => new File([new Uint8Array(4)], name, { type: 'image/jpeg' }));

// The media service answers 500 for "b.jpg" and succeeds for everything else.
const withFlakyMedia = async (run: (uploadedNames: string[]) => Promise<void>) => {
  const originalFetch = globalThis.fetch;
  const uploadedNames: string[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const name = ((init?.body as FormData).get('file') as File).name;
    if (name === 'b.jpg') {
      return jsonResponse(500, { success: false, error: 'storage unavailable' });
    }
    uploadedNames.push(name);
    return jsonResponse(201, { success: true, data: { id: name, file_url: `https://example.test/${name}` } });
  }) as typeof fetch;
  try {
    await run(uploadedNames);
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('one failed upload does not discard the URLs of the files that uploaded (QA MB-0937)', async () => {
  await withFlakyMedia(async (uploadedNames) => {
    const results = await uploadMediaFilesSettled(makeFiles('a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'), 'property', 'p-1');
    assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
    const urls = results.map((result) => (result.status === 'fulfilled' ? result.value.file_url : null));
    assert.deepEqual(urls, ['https://example.test/a.jpg', null, 'https://example.test/c.jpg', 'https://example.test/d.jpg']);
    assert.deepEqual([...uploadedNames].sort(), ['a.jpg', 'c.jpg', 'd.jpg']);
  });
});

test('the failure reason of a rejected file is kept for the caller', async () => {
  await withFlakyMedia(async () => {
    const [result] = await uploadMediaFilesSettled(makeFiles('b.jpg'), 'property', 'p-1');
    assert.equal(result.status, 'rejected');
    assert.match(String((result as PromiseRejectedResult).reason?.message), /storage unavailable/);
  });
});

test('uploadMediaFiles still rejects when any file fails, but only after every upload has settled', async () => {
  await withFlakyMedia(async (uploadedNames) => {
    await assert.rejects(
      uploadMediaFiles(makeFiles('a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'), 'property', 'p-1'),
      /storage unavailable/,
    );
    assert.deepEqual([...uploadedNames].sort(), ['a.jpg', 'c.jpg', 'd.jpg']);
  });
});
