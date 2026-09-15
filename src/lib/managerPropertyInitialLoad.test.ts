import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldShowManagerPropertyInitialLoader } from './managerPropertyInitialLoad';

test('shows a loader while the manager inventory has not returned its first result', () => {
  assert.equal(shouldShowManagerPropertyInitialLoader(true, 0, 0), true);
});

test('does not hide an existing inventory during a background refresh', () => {
  assert.equal(shouldShowManagerPropertyInitialLoader(true, 10, 10), false);
});

test('shows the empty state only after an empty inventory request settles', () => {
  assert.equal(shouldShowManagerPropertyInitialLoader(false, 0, 0), false);
});
