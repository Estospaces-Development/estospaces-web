import assert from 'node:assert/strict';
import test from 'node:test';

import { formatApplicationRelativeTime } from './applicationRelativeTime';

test('application relative time advances as the supplied clock advances', () => {
  const createdAt = '2026-08-16T10:00:00.000Z';
  assert.equal(formatApplicationRelativeTime(createdAt, Date.parse('2026-08-16T10:00:20.000Z')), 'Just now');
  assert.equal(formatApplicationRelativeTime(createdAt, Date.parse('2026-08-16T10:02:00.000Z')), '2m ago');
  assert.equal(formatApplicationRelativeTime(createdAt, Date.parse('2026-08-16T12:00:00.000Z')), '2h ago');
});
