import assert from 'node:assert/strict';
import test from 'node:test';

import { FALLBACK_PAID_PLAN_NAME, describeStoredTermsPlanName, getManagerPlanDisplayName } from './managerPlanNames';

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

test('stored consent text with the old plan name is labelled, never rewritten', () => {
    assert.equal(describeStoredTermsPlanName('pro', 'Estospaces Pro India monthly subscription.'), 'Growth plan (internal plan name in these terms: Estospaces Pro)');
    assert.equal(describeStoredTermsPlanName('growth', 'Estospaces Growth India monthly subscription.'), 'Premium plan (internal plan name in these terms: Estospaces Growth)');
    // New terms that already use the customer-facing names need no note.
    assert.equal(describeStoredTermsPlanName('pro', 'Estospaces Growth India monthly subscription.'), null);
    assert.equal(describeStoredTermsPlanName('growth', 'Estospaces Premium India monthly subscription.'), null);
    assert.equal(describeStoredTermsPlanName('free', 'Estospaces Pro'), null);
});
