import assert from 'node:assert/strict';
import test from 'node:test';
import { hasHorizontalOverflow } from './useHorizontalOverflow';

test('hint condition: only overflow wider than the box (beyond 1px rounding) counts', () => {
    assert.equal(hasHorizontalOverflow(760, 354), true);
    assert.equal(hasHorizontalOverflow(1000, 1000), false);
    assert.equal(hasHorizontalOverflow(1001, 1000), false);
    assert.equal(hasHorizontalOverflow(1002, 1000), true);
});
