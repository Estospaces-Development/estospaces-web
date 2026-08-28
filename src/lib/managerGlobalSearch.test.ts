import assert from 'node:assert/strict';
import test from 'node:test';

import { getManagerSearchDestinations } from './managerGlobalSearch';

test('manager global search offers query-scoped destinations instead of forcing leads', () => {
  const destinations = getManagerSearchDestinations('  Anna   Nagar ');
  assert.deepEqual(destinations.map((item) => item.key), ['properties', 'leads', 'fast-track']);
  assert.equal(destinations[0].path, '/manager/dashboard/properties?search=Anna%20Nagar');
  assert.match(destinations[0].label, /Anna Nagar/);
});
