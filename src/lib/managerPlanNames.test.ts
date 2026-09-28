import assert from 'node:assert/strict';
import test from 'node:test';

import { FALLBACK_PAID_PLAN_NAME, getManagerPlanDisplayName } from './managerPlanNames';

test('internal plan codes map to the customer-facing names', () => {
    assert.equal(getManagerPlanDisplayName('free'), 'Free');
    assert.equal(getManagerPlanDisplayName('pro'), 'Growth');
    assert.equal(getManagerPlanDisplayName('growth'), 'Premium');
    assert.equal(getManagerPlanDisplayName(' PRO '), 'Growth');
});

test('unknown or missing plan codes never show a raw code', () => {
    for (const code of ['', null, undefined, 'enterprise']) {
        assert.equal(getManagerPlanDisplayName(code), FALLBACK_PAID_PLAN_NAME);
    }
});
