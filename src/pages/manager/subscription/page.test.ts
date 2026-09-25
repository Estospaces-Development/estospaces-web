import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('a supplemental Core billing lookup does not block Payment summary rendering', () => {
    assert.match(source, /Promise\.allSettled\(\[\s*getManagerSubscriptionOffers\(\), getManagerSubscriptionPlanPreviews\(\), getManagerSubscriptionSummary\(\),\s*\]\)/);
    assert.match(source, /if \(isBillingMarketUnavailable\(offerResult\.reason\)\) \{\s*void Promise\.allSettled\(\[getMyManagerBillingProfile\(\)\]\)/);
});

test('plan benefits remain visible without checkout offers while payment consent stays hidden', () => {
    assert.match(source, /offers\.length > 0 \? offers : planPreviews/);
    assert.match(source, /offers\.length > 0 \? <label/);
    assert.match(source, /onStart=\{\(offer\) => void start\(offer\)\}/);
    const card = readFileSync(new URL('./ManagerSubscriptionPlanCard.tsx', import.meta.url), 'utf8');
    assert.match(card, /const offer = 'id' in plan \? plan : null/);
    assert.match(card, /Local price and checkout unavailable for this account/);
    assert.match(card, /\{offer \? <>[\s\S]*Continue to secure payment[\s\S]*: <p/);
});
