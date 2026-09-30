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

test('the legacy "manager subscription" phrasing is also labelled for each code', () => {
    const cases: Array<[code: string, terms: string | null, expected: string | null]> = [
        ['pro', 'Pro manager subscription: eight published properties.', 'Growth plan (internal plan name in these terms: Pro manager subscription)'],
        ['growth', 'Growth manager subscription: twenty published properties.', 'Premium plan (internal plan name in these terms: Growth manager subscription)'],
        // Renamed text is current for its own code.
        ['pro', 'Growth manager subscription: eight published properties.', null],
        ['growth', 'Premium manager subscription: twenty published properties.', null],
        // Whole phrases, case-sensitive as stored.
        ['pro', 'pro manager subscription', null],
        ['pro', 'Estospaces Professional services', null],
        ['pro', 'Pro manager subscriptions', null],
        ['pro', '', null],
        ['growth', null, null],
    ];
    for (const [code, terms, expected] of cases) {
        assert.equal(describeStoredTermsPlanName(code, terms), expected, `${code}: ${terms}`);
    }
});
