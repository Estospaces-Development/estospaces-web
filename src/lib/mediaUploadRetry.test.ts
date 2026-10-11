import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { uploadPendingFiles } from './mediaUploadRetry';

const file = (name: string) => new File([new Uint8Array(4)], name, { type: 'image/jpeg' });
const ok = (url: string): PromiseSettledResult<string> => ({ status: 'fulfilled', value: url });
const failed = (message: string): PromiseSettledResult<string> => ({ status: 'rejected', reason: new Error(message) });

// An uploader that records each batch and answers per file name.
const fakeUploader = (outcomes: Record<string, PromiseSettledResult<string>>) => {
  const batches: string[][] = [];
  const upload = async (files: File[]) => {
    batches.push(files.map((entry) => entry.name));
    return files.map((entry) => outcomes[entry.name]);
  };
  return { upload, batches };
};

test('uploads new files, keeps saved URLs in place and remembers every success', async () => {
  const cache = new WeakMap<File, string>();
  const [a, b] = [file('a.jpg'), file('b.jpg')];
  const { upload, batches } = fakeUploader({ 'a.jpg': ok('u/a'), 'b.jpg': ok('u/b') });
  const urls = await uploadPendingFiles(['saved/0', a, 'saved/1', b], cache, upload, 'image');
  assert.deepEqual(urls, ['saved/0', 'u/a', 'saved/1', 'u/b']);
  assert.deepEqual(batches, [['a.jpg', 'b.jpg']]);
  assert.equal(cache.get(a), 'u/a');
});

test('after a partial failure the next save re-sends only the failed file (QA MB-0937)', async () => {
  const cache = new WeakMap<File, string>();
  const [a, b, c] = [file('a.jpg'), file('b.jpg'), file('c.jpg')];
  const first = fakeUploader({ 'a.jpg': ok('u/a'), 'b.jpg': failed('storage unavailable'), 'c.jpg': ok('u/c') });

  await assert.rejects(
    uploadPendingFiles([a, b, c], cache, first.upload, 'image'),
    (error: Error) => {
      assert.match(error.message, /b\.jpg could not be uploaded \(storage unavailable\)/);
      assert.match(error.message, /2 other images uploaded already and will not be sent again/);
      assert.match(error.message, /Save again to retry/);
      assert.doesNotMatch(error.message, /a\.jpg|c\.jpg/);
      return true;
    },
  );
  assert.deepEqual(first.batches, [['a.jpg', 'b.jpg', 'c.jpg']]);

  const second = fakeUploader({ 'b.jpg': ok('u/b') });
  const urls = await uploadPendingFiles([a, b, c], cache, second.upload, 'image');
  assert.deepEqual(second.batches, [['b.jpg']]);
  assert.deepEqual(urls, ['u/a', 'u/b', 'u/c']);
});

test('a second failure keeps the earlier successes and still sends nothing twice', async () => {
  const cache = new WeakMap<File, string>();
  const [a, b] = [file('a.jpg'), file('b.jpg')];
  await assert.rejects(uploadPendingFiles([a, b], cache, fakeUploader({ 'a.jpg': ok('u/a'), 'b.jpg': failed('boom') }).upload, 'image'));
  const retry = fakeUploader({ 'b.jpg': failed('still down') });
  await assert.rejects(uploadPendingFiles([a, b], cache, retry.upload, 'image'), /b\.jpg could not be uploaded \(still down\)/);
  assert.deepEqual(retry.batches, [['b.jpg']]);
  assert.equal(cache.get(a), 'u/a');
});

test('several failures are all named, and videos use the video wording', async () => {
  const cache = new WeakMap<File, string>();
  const [a, b, c] = [file('a.mp4'), file('b.mp4'), file('c.mp4')];
  const { upload } = fakeUploader({ 'a.mp4': ok('u/a'), 'b.mp4': failed('x'), 'c.mp4': failed('x') });
  await assert.rejects(uploadPendingFiles([a, b, c], cache, upload, 'video'), (error: Error) => {
    assert.match(error.message, /b\.mp4, c\.mp4 could not be uploaded/);
    assert.match(error.message, /1 other video uploaded already/);
    return true;
  });
});

test('nothing is uploaded when every entry is already a saved URL or an uploaded file', async () => {
  const cache = new WeakMap<File, string>();
  const a = file('a.jpg');
  cache.set(a, 'u/a');
  const { upload, batches } = fakeUploader({});
  assert.deepEqual(await uploadPendingFiles(['saved/0', a], cache, upload, 'image'), ['saved/0', 'u/a']);
  assert.deepEqual(batches, []);
});

test('a missing result for a file counts as a failure instead of a silent gap', async () => {
  const cache = new WeakMap<File, string>();
  const [a, b] = [file('a.jpg'), file('b.jpg')];
  const upload = async () => [ok('u/a')];
  await assert.rejects(uploadPendingFiles([a, b], cache, upload, 'image'), /b\.jpg could not be uploaded/);
  assert.equal(cache.get(a), 'u/a');
});

test('the add-property page and property context use the per-file results', () => {
  const page = fs.readFileSync('src/pages/manager/dashboard/properties/add/page.tsx', 'utf8');
  assert.match(page, /uploadPendingFiles\(files, uploadedImageUrlsRef\.current, \(pending\) => uploadImages\(mediaEntityId, pending\), "image"\)/);
  assert.match(page, /uploadPendingFiles\(files, uploadedVideoUrlsRef\.current, \(pending\) => uploadVideos\(mediaEntityId, pending\), "video"\)/);
  assert.match(page, /const uploadedImageUrlsRef = useRef\(new WeakMap<File, string>\(\)\)/);
  const context = fs.readFileSync('src/contexts/PropertyContext.tsx', 'utf8');
  assert.match(context, /uploadMediaFilesSettled\(files, "property", entityId\)/);
  assert.doesNotMatch(context, /uploadMediaFiles\(files, "property", entityId\)/);
});
