import assert from 'node:assert/strict';
import test from 'node:test';

import { findMissingListingIds } from './listingAvailability';

test('listings missing from the lookup are reported', () => {
    assert.deepEqual([...findMissingListingIds(['p1', 'p2', 'p3'], [{ id: 'p1' }, { id: 'p3' }])], ['p2']);
    assert.deepEqual([...findMissingListingIds(['p1'], [])], ['p1']);
});

test('a failed lookup keeps every listing available', () => {
    assert.equal(findMissingListingIds(['p1', 'p2'], null).size, 0);
});
