import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveManagerPropertySize } from './managerDashboardDisplay';

test('manager property cards use the API property size field', () => {
  assert.equal(resolveManagerPropertySize({ property_size_sqft: 1450 }), 1450);
});

test('manager property cards retain compatibility with mapped area fields', () => {
  assert.equal(resolveManagerPropertySize({ area: 900, sqft: 850 }), 900);
  assert.equal(resolveManagerPropertySize({ sqft: 850 }), 850);
  assert.equal(resolveManagerPropertySize({}), 0);
});
