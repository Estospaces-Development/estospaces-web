import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createManagerPropertyVideoPreview,
  revokeAllManagerPropertyVideoPreviews,
  revokeManagerPropertyVideoPreview,
} from './managerPropertyVideoPreview';

test('property video previews use a browser object URL instead of a large data URL', () => {
  const created: Blob[] = [];
  const revoked: string[] = [];
  const provider = {
    createObjectURL: (file: Blob) => {
      created.push(file);
      return 'blob:property-video-1';
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  };
  const file = new File(['video'], 'tour.mp4', { type: 'video/mp4' });

  const preview = createManagerPropertyVideoPreview(file, provider);

  assert.equal(preview, 'blob:property-video-1');
  assert.deepEqual(created, [file]);
  assert.deepEqual(revoked, []);
});

test('only owned object URLs are revoked on removal and cleanup', () => {
  const revoked: string[] = [];
  const provider = {
    createObjectURL: () => 'blob:unused',
    revokeObjectURL: (url: string) => revoked.push(url),
  };
  const owned = new Set(['blob:first', 'blob:second']);

  assert.equal(revokeManagerPropertyVideoPreview('https://media.example/video.mp4', owned, provider), false);
  assert.equal(revokeManagerPropertyVideoPreview('blob:first', owned, provider), true);
  revokeAllManagerPropertyVideoPreviews(owned, provider);

  assert.deepEqual(revoked, ['blob:first', 'blob:second']);
  assert.equal(owned.size, 0);
});
