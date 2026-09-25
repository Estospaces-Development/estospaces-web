import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('a supplemental Core billing lookup does not block Payment summary rendering', () => {
    assert.match(source, /Promise\.allSettled\(\[\s*getManagerSubscriptionOffers\(\), getManagerSubscriptionSummary\(\),\s*\]\)/);
    assert.match(source, /if \(isBillingMarketUnavailable\(offerResult\.reason\)\) \{\s*void Promise\.allSettled\(\[getMyManagerBillingProfile\(\)\]\)/);
});
