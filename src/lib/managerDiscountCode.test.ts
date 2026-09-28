import assert from 'node:assert/strict';
import test from 'node:test';

import type { ManagerDiscountPreview, ManagerPlanOffer } from '../services/managerSubscriptionService';
import {
    DEFAULT_RECURRING_CONSENT_TEXT,
    assertCheckoutPromotionPair,
    classifyDiscountError,
    describeDiscountPrice,
    describeOtherPlanDiscount,
    discountedAmountMinor,
    forgetDiscountCode,
    getRecurringConsentText,
    normalizeDiscountCode,
    planDiscountCheckout,
    previewMatchesOffer,
    readCouponParam,
    readRememberedDiscountCode,
    recoverFromStalePreview,
    rememberDiscountCode,
    resolveDiscountCodePrefill,
    type AppliedDiscount,
} from './managerDiscountCode';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

const offer: Pick<ManagerPlanOffer, 'id' | 'currency' | 'amount_minor' | 'tax_minor' | 'tax_inclusive'> = {
    id: '11111111-1111-4111-8111-111111111111', currency: 'INR', amount_minor: 99900, tax_inclusive: true,
};

const preview = (overrides: Partial<ManagerDiscountPreview> = {}): ManagerDiscountPreview => ({
    code: 'LAUNCH20', plan_version_id: offer.id, percent_off: 20, discount_cycles: 3,
    discounted_amount_minor: 79920, full_amount_minor: 99900, currency: 'INR',
    price_digest: DIGEST_A, valid_until: null, ...overrides,
});

const applied = (overrides: Partial<ManagerDiscountPreview> = {}): AppliedDiscount => ({ offerId: offer.id, code: 'LAUNCH20', preview: preview(overrides) });

class MemoryStorage {
    values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
    removeItem(key: string) { this.values.delete(key); }
}

test('discounted price uses integer minor units for every launch price and allowed percent', () => {
    const expected: Record<number, Record<number, number>> = {
        99900: { 1: 98901, 20: 79920, 50: 49950, 90: 9990 },
        249900: { 1: 247401, 20: 199920, 50: 124950, 90: 24990 },
        4900: { 1: 4851, 20: 3920, 50: 2450, 90: 490 },
        9900: { 1: 9801, 20: 7920, 50: 4950, 90: 990 },
    };
    for (const [base, byPercent] of Object.entries(expected)) {
        for (const [percent, amount] of Object.entries(byPercent)) {
            const result = discountedAmountMinor(Number(base), Number(percent));
            assert.equal(result, amount, `${base} at ${percent}%`);
            assert.ok(Number.isInteger(result));
        }
    }
});

test('discount maths refuses inputs the payment service would refuse', () => {
    for (const [base, percent] of [[99950, 20], [0, 20], [-100, 20], [99900, 0], [99900, 91], [99900, 12.5], [99900.5, 20]]) {
        assert.equal(discountedAmountMinor(base, percent), null, `${base} at ${percent}%`);
    }
});

test('preview copy shows both prices and the month count in rupees and pounds', () => {
    assert.equal(describeDiscountPrice(preview()), '20% off for 3 months: ₹799.20/month, then ₹999/month');
    assert.equal(describeDiscountPrice(preview({ percent_off: 50, discount_cycles: 1, discounted_amount_minor: 124950, full_amount_minor: 249900 })),
        '50% off for 1 month: ₹1,249.50/month, then ₹2,499/month');
    assert.equal(describeDiscountPrice(preview({ currency: 'GBP', percent_off: 20, discount_cycles: 6, discounted_amount_minor: 3920, full_amount_minor: 4900 })),
        '20% off for 6 months: £39.20/month, then £49/month');
    assert.equal(describeDiscountPrice(preview({ currency: 'GBP', percent_off: 90, discount_cycles: 24, discounted_amount_minor: 990, full_amount_minor: 9900 })),
        '90% off for 24 months: £9.90/month, then £99/month');
});

test('recurring consent names the discounted amount, the full amount and the months only when a code is applied', () => {
    assert.equal(getRecurringConsentText(null), DEFAULT_RECURRING_CONSENT_TEXT);
    const text = getRecurringConsentText({ planName: 'Growth', terms: preview() });
    assert.match(text, /monthly recurring Growth subscription/);
    assert.match(text, /₹799\.20 a month for the first 3 months, then ₹999 a month/);
    assert.match(text, /cancellation terms before payment/);
    assert.match(getRecurringConsentText({ planName: 'Premium', terms: preview({ discount_cycles: 1 }) }), /for the first month, then/);
});

test('codes are trimmed, upper-cased and checked against the server pattern', () => {
    assert.equal(normalizeDiscountCode('  launch20 '), 'LAUNCH20');
    assert.equal(normalizeDiscountCode('spring_sale-2026'), 'SPRING_SALE-2026');
    for (const bad of ['', 'ab', '-ABC', 'A B C', 'ÄBC', 'X'.repeat(33), null, undefined]) {
        assert.equal(normalizeDiscountCode(bad), null, String(bad));
    }
});

test('a preview is shown only when it matches the chosen offer and its own numbers', () => {
    assert.equal(previewMatchesOffer(preview(), offer, 'LAUNCH20'), true);
    assert.equal(previewMatchesOffer(preview({ plan_version_id: '22222222-2222-4222-8222-222222222222' }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview({ currency: 'GBP' }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview({ full_amount_minor: 249900 }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview({ discounted_amount_minor: 79900 }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview({ discount_cycles: 0 }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview({ price_digest: 'not-a-digest' }), offer, 'LAUNCH20'), false);
    assert.equal(previewMatchesOffer(preview(), offer, 'OTHER'), false);
    // Tax-exclusive offers compare against the gross amount the provider charges.
    assert.equal(previewMatchesOffer(preview({ full_amount_minor: 99900 }), { ...offer, amount_minor: 84700, tax_minor: 15200, tax_inclusive: false }, 'LAUNCH20'), true);
});

test('promotion_code and price_digest are sent both or neither', () => {
    assert.equal(assertCheckoutPromotionPair({}), false);
    assert.equal(assertCheckoutPromotionPair({ promotion_code: '', price_digest: '' }), false);
    assert.equal(assertCheckoutPromotionPair({ promotion_code: 'LAUNCH20', price_digest: DIGEST_A }), true);
    assert.throws(() => assertCheckoutPromotionPair({ promotion_code: 'LAUNCH20' }), /price digest/);
    assert.throws(() => assertCheckoutPromotionPair({ price_digest: DIGEST_A }), /price digest/);
    assert.throws(() => assertCheckoutPromotionPair({ promotion_code: 'LAUNCH20', price_digest: '' }), /price digest/);
});

test('checkout sends the digest only for the plan the code was applied to', () => {
    assert.deepEqual(planDiscountCheckout(null, offer.id), { kind: 'full_price', fields: {} });
    assert.deepEqual(planDiscountCheckout(applied(), offer.id), { kind: 'discounted', fields: { promotion_code: 'LAUNCH20', price_digest: DIGEST_A } });
    const other = planDiscountCheckout(applied(), 'another-offer');
    assert.deepEqual(other, { kind: 'other_plan', code: 'LAUNCH20', offerId: offer.id });
    assert.equal(describeOtherPlanDiscount('LAUNCH20', 'Growth', 'Premium'), 'Code LAUNCH20 is applied to Growth. Apply it to Premium or remove it before continuing.');
    for (const plan of [planDiscountCheckout(null, offer.id), planDiscountCheckout(applied(), offer.id)]) {
        if (plan.kind !== 'other_plan') assert.doesNotThrow(() => assertCheckoutPromotionPair(plan.fields));
    }
});

test('discount errors are classified by status and code', () => {
    assert.equal(classifyDiscountError({ status: 409, code: 'promotion_preview_stale' }), 'stale');
    assert.equal(classifyDiscountError({ status: 409, code: 'promotion_unavailable' }), 'unavailable');
    assert.equal(classifyDiscountError({ status: 429, code: 'rate_limited' }), 'rate_limited');
    assert.equal(classifyDiscountError({ status: 409, code: 'subscription_conflict' }), 'other');
    assert.equal(classifyDiscountError({ status: 503, code: 'provider_unavailable' }), 'other');
    assert.equal(classifyDiscountError(new Error('offline')), 'other');
    assert.equal(classifyDiscountError(null), 'other');
});

test('a stale preview is re-previewed exactly once and the new price goes back to the manager', async () => {
    const calls: [string, string][] = [];
    const outcome = await recoverFromStalePreview(applied(), offer, async (code, planId) => {
        calls.push([code, planId]);
        return preview({ percent_off: 10, discounted_amount_minor: 89910, price_digest: DIGEST_B });
    });
    assert.deepEqual(calls, [['LAUNCH20', offer.id]]);
    assert.equal(outcome.kind, 'confirm_new_price');
    if (outcome.kind === 'confirm_new_price') {
        assert.equal(outcome.applied.preview.price_digest, DIGEST_B);
        assert.equal(describeDiscountPrice(outcome.applied.preview), '10% off for 3 months: ₹899.10/month, then ₹999/month');
    }
});

test('a stale preview whose code is no longer usable, rate limited or failing never retries checkout', async () => {
    let calls = 0;
    const failing = (error: unknown) => async () => { calls++; throw error; };
    assert.deepEqual(await recoverFromStalePreview(applied(), offer, failing({ status: 409, code: 'promotion_unavailable' })), { kind: 'unavailable' });
    assert.deepEqual(await recoverFromStalePreview(applied(), offer, failing({ status: 429, code: 'rate_limited' })), { kind: 'rate_limited' });
    const offline = new Error('offline');
    assert.deepEqual(await recoverFromStalePreview(applied(), offer, failing(offline)), { kind: 'failed', error: offline });
    assert.equal(calls, 3);
    // A fresh preview that no longer describes this offer is refused, not shown.
    assert.deepEqual(await recoverFromStalePreview(applied(), offer, async () => preview({ full_amount_minor: 249900 })), { kind: 'unavailable' });
});

test('?coupon= pre-fills an upper-cased code and keeps it per account', () => {
    const storage = new MemoryStorage();
    assert.equal(readCouponParam('?coupon=launch20'), 'LAUNCH20');
    assert.equal(readCouponParam(new URLSearchParams('coupon=%20spring-sale%20')), 'SPRING-SALE');
    assert.equal(readCouponParam('?coupon=<script>'), null);
    assert.equal(readCouponParam(''), null);

    assert.equal(resolveDiscountCodePrefill('?coupon=launch20', storage, 'manager-a'), 'LAUNCH20');
    // The link parameter can be dropped from the URL; the code stays for this account.
    assert.equal(resolveDiscountCodePrefill('', storage, 'manager-a'), 'LAUNCH20');
    assert.equal(resolveDiscountCodePrefill('', storage, 'manager-b'), null);
    // A malformed link does not overwrite a remembered code.
    assert.equal(resolveDiscountCodePrefill('?coupon=!!', storage, 'manager-a'), 'LAUNCH20');
    // Without an account, nothing is stored.
    assert.equal(resolveDiscountCodePrefill('?coupon=solo50', storage, null), 'SOLO50');
    assert.equal(storage.values.size, 1);

    forgetDiscountCode(storage, 'manager-a');
    assert.equal(readRememberedDiscountCode(storage, 'manager-a'), null);
    rememberDiscountCode(storage, 'manager-a', 'bad code');
    assert.equal(readRememberedDiscountCode(storage, 'manager-a'), null);
    storage.setItem('esto.manager.discount-code.v1:manager-a', 'tampered value');
    assert.equal(readRememberedDiscountCode(storage, 'manager-a'), null);
});

test('storage failures never break the code field', () => {
    const broken = {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
    };
    assert.equal(resolveDiscountCodePrefill('?coupon=launch20', broken, 'manager-a'), 'LAUNCH20');
    assert.equal(readRememberedDiscountCode(broken, 'manager-a'), null);
    assert.doesNotThrow(() => forgetDiscountCode(broken, 'manager-a'));
    assert.equal(readRememberedDiscountCode(null, 'manager-a'), null);
});
