import test from 'node:test';
import assert from 'node:assert/strict';

import { canEditCommunityPost } from './communityService';

test('canEditCommunityPost only allows the post author', () => {
  const post = { authorId: 'author-1' };

  assert.equal(canEditCommunityPost(post, 'author-1'), true);
  assert.equal(canEditCommunityPost(post, 'someone-else'), false);
  assert.equal(canEditCommunityPost(post, undefined), false);
  assert.equal(canEditCommunityPost(post, null), false);
  assert.equal(canEditCommunityPost(post, ''), false);
  assert.equal(canEditCommunityPost({ authorId: '' }, ''), false);
});
