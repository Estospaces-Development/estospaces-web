import assert from 'node:assert/strict';
import test from 'node:test';

import { orderManagerPlans } from './managerPlanOrder';

test('shows Pro before Growth without changing the source plan list', () => {
    const plans = [{ code: 'growth' as const }, { code: 'pro' as const }];

    assert.deepEqual(orderManagerPlans(plans).map((plan) => plan.code), ['pro', 'growth']);
    assert.deepEqual(plans.map((plan) => plan.code), ['growth', 'pro']);
});
