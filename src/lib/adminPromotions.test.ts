import assert from 'node:assert/strict';
import test from 'node:test';

import {
    OFFER_CHECKLIST_EXPLANATION,
    buildPromotionDraft,
    buildPromotionPatch,
    canRevokeTrialGrant,
    checkRevokeReason,
    createIdempotencyKeys,
    describeBackfillResult,
    emptyPromotionForm,
    findLaunchCampaign,
    formatPromotionBenefit,
    formatPromotionMarkets,
    formatPromotionUsage,
    getAdminTrialGrantState,
    getOfferChecklist,
    getPromotionActions,
    getPromotionActivationReason,
    getPromotionErrorMessage,
    isOfferChecklistComplete,
    promotionEditValues,
    shouldReuseIdempotencyKey,
    type PromotionFormValues,
} from './adminPromotions';
import { ApiRequestError } from './apiUtils';
import type { AdminPromotion, AdminPromotionDraft } from '../services/adminSubscriptionService';

/**
 * A line-for-line TypeScript copy of payment internal/subscriptions/promotion.go
 * (promotionFromInput + validateShape) at payment fe67755. Every draft the form
 * builds must pass it, so the web cannot send a body payment rejects.
 */
function paymentAcceptsDraft(draft: AdminPromotionDraft): boolean {
    const body = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
    const allowed = new Set(['kind', 'code', 'name', 'description', 'plan_code', 'plan_version_id', 'trial_days', 'percent_off', 'discount_cycles',
        'provider_offer_id_inr', 'provider_offer_id_gbp', 'auto_apply_on_signup', 'valid_from', 'valid_until', 'max_redemptions', 'eligible_markets']);
    if (Object.keys(body).some((key) => !allowed.has(key))) return false; // DisallowUnknownFields
    const code = typeof body.code === 'string' && body.code.trim() ? body.code.trim().toUpperCase() : null;
    if (code !== null && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) return false;
    const rawMarkets = (body.eligible_markets as string[] | undefined) ?? [];
    if (rawMarkets.some((market) => !['IN', 'GB'].includes(market.trim().toUpperCase()))) return false;
    const markets = [...new Set(rawMarkets.map((market) => market.trim().toUpperCase()))].sort();
    const name = String(body.name ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!name || name.length > 128 || description.length > 1000 || !['pro', 'growth'].includes(String(body.plan_code))) return false;
    const from = body.valid_from ? new Date(String(body.valid_from)) : null;
    const until = body.valid_until ? new Date(String(body.valid_until)) : null;
    if (from && until && !(until.getTime() > from.getTime())) return false;
    const cap = body.max_redemptions as number | undefined;
    if (cap !== undefined && (cap < 1 || cap > 1_000_000)) return false;
    const inr = String(body.provider_offer_id_inr ?? '').trim();
    const gbp = String(body.provider_offer_id_gbp ?? '').trim();
    for (const offer of [inr, gbp]) {
        if (offer && !/^offer_[A-Za-z0-9]+$/.test(offer)) return false;
    }
    const int = (value: unknown) => (typeof value === 'number' ? value : undefined);
    if (body.kind === 'trial_grant') {
        const days = int(body.trial_days);
        return days !== undefined && days >= 1 && days <= 365 && body.percent_off === undefined && body.discount_cycles === undefined
            && !inr && !gbp && markets.length === 0;
    }
    if (body.kind === 'percent_discount') {
        const percent = int(body.percent_off);
        const cycles = int(body.discount_cycles);
        if (percent === undefined || percent < 1 || percent > 90 || cycles === undefined || cycles < 1 || cycles > 24
            || body.trial_days !== undefined || body.auto_apply_on_signup === true || code === null || markets.length === 0) return false;
        return !((inr && !markets.includes('IN')) || (gbp && !markets.includes('GB')));
    }
    return false;
}

const trialForm = (overrides: Partial<PromotionFormValues> = {}): PromotionFormValues => ({
    ...emptyPromotionForm('trial_grant'), name: 'Launch', valid_from: '2026-10-01T09:00', auto_apply_on_signup: true, ...overrides,
});
const discountForm = (overrides: Partial<PromotionFormValues> = {}): PromotionFormValues => ({
    ...emptyPromotionForm('percent_discount'), name: 'Twenty off', code: 'launch20', percent_off: '20', discount_cycles: '3',
    market_in: true, provider_offer_id_inr: 'offer_Abc123', valid_from: '2026-10-01T09:00', ...overrides,
});

test('a trial body carries no markets, offers or discount fields, even if they were filled in', () => {
    // Market checkboxes and offers left over from the discount tab must not leak into a trial.
    const result = buildPromotionDraft(trialForm({ max_redemptions: '500', market_in: true, market_gb: true, provider_offer_id_inr: 'offer_Abc123', percent_off: '20' }));
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(JSON.parse(JSON.stringify(result.draft)), {
        kind: 'trial_grant', name: 'Launch', plan_code: 'pro', valid_from: new Date('2026-10-01T09:00').toISOString(),
        max_redemptions: 500, trial_days: 60, auto_apply_on_signup: true,
    });
    assert.equal('eligible_markets' in result.draft, false);
    assert.equal(paymentAcceptsDraft(result.draft), true);
});

test('trial drafts pass the payment validator across the options the form offers', () => {
    for (const overrides of [{}, { code: 'trial60' }, { plan_code: 'growth' as const }, { trial_days: '1' }, { trial_days: '365' }, { auto_apply_on_signup: false }, { valid_until: '2026-12-31T23:59', max_redemptions: '1000000' }]) {
        const result = buildPromotionDraft(trialForm(overrides));
        assert.equal(result.success, true, JSON.stringify(overrides));
        if (result.success) assert.equal(paymentAcceptsDraft(result.draft), true, JSON.stringify(overrides));
    }
});

test('the validator copy rejects the bodies payment rejects', () => {
    assert.equal(paymentAcceptsDraft({ kind: 'trial_grant', name: 'x', plan_code: 'pro', trial_days: 60, auto_apply_on_signup: true, eligible_markets: ['IN'] } as unknown as AdminPromotionDraft), false);
    assert.equal(paymentAcceptsDraft({ kind: 'percent_discount', name: 'x', plan_code: 'pro', code: 'ABC', percent_off: 10, discount_cycles: 2, eligible_markets: [] }), false);
    assert.equal(paymentAcceptsDraft({ kind: 'percent_discount', name: 'x', plan_code: 'pro', code: 'ABC', percent_off: 10, discount_cycles: 2, eligible_markets: ['IN'], provider_offer_id_gbp: 'offer_A' }), false);
});

test('trial days must be a whole number from 1 to 365', () => {
    for (const value of ['0', '366', '1.5', 'abc', '']) {
        const result = buildPromotionDraft(trialForm({ trial_days: value }));
        assert.equal(result.success, false, value);
        if (!result.success) assert.ok(result.errors.trial_days, value);
    }
});

test('a discount needs a code and a market; offer IDs are optional in a draft', () => {
    const result = buildPromotionDraft(discountForm());
    assert.equal(result.success, true);
    if (!result.success || result.draft.kind !== 'percent_discount') return;
    assert.equal(result.draft.code, 'LAUNCH20');
    assert.deepEqual(result.draft.eligible_markets, ['IN']);
    assert.equal(result.draft.provider_offer_id_inr, 'offer_Abc123');
    assert.equal(paymentAcceptsDraft(result.draft), true);

    const noOffers = buildPromotionDraft(discountForm({ provider_offer_id_inr: '', market_gb: true }));
    assert.equal(noOffers.success, true);
    if (noOffers.success) {
        assert.deepEqual(JSON.parse(JSON.stringify(noOffers.draft)).eligible_markets, ['IN', 'GB']);
        assert.equal('provider_offer_id_inr' in JSON.parse(JSON.stringify(noOffers.draft)), false);
        assert.equal(paymentAcceptsDraft(noOffers.draft), true);
    }
    const noMarket = buildPromotionDraft(discountForm({ market_in: false, market_gb: false }));
    assert.equal(!noMarket.success && Boolean(noMarket.errors.markets), true);
    const noCode = buildPromotionDraft(discountForm({ code: '' }));
    assert.equal(!noCode.success && Boolean(noCode.errors.code), true);
});

test('an offer for an unselected market is never sent', () => {
    const ukOnly = buildPromotionDraft(discountForm({ market_in: false, market_gb: true, provider_offer_id_gbp: 'offer_Gbp9' }));
    assert.equal(ukOnly.success, true);
    if (!ukOnly.success || ukOnly.draft.kind !== 'percent_discount') return;
    assert.equal(ukOnly.draft.provider_offer_id_inr, undefined);
    assert.equal(ukOnly.draft.provider_offer_id_gbp, 'offer_Gbp9');
    assert.equal(paymentAcceptsDraft(ukOnly.draft), true);
});

test('percent is 1 to 90, months 1 to 24, and offer IDs match offer_ plus alphanumerics', () => {
    for (const [field, value] of [['percent_off', '0'], ['percent_off', '91'], ['percent_off', '12.5'], ['discount_cycles', '0'], ['discount_cycles', '25'],
        ['provider_offer_id_inr', 'offer-123'], ['provider_offer_id_inr', 'offer_'], ['provider_offer_id_inr', 'plan_Abc'], ['provider_offer_id_inr', 'offer_ab c']] as const) {
        const result = buildPromotionDraft(discountForm({ [field]: value }));
        assert.equal(result.success, false, `${field}=${value}`);
        if (!result.success) assert.ok(result.errors[field], `${field}=${value}`);
    }
    for (const overrides of [{ percent_off: '90', discount_cycles: '24' }, { percent_off: '1', discount_cycles: '1' }]) {
        const result = buildPromotionDraft(discountForm(overrides));
        assert.equal(result.success && paymentAcceptsDraft(result.draft), true);
    }
});

test('codes, windows, caps and names are validated like payment', () => {
    const badCode = buildPromotionDraft(trialForm({ code: 'a!' }));
    assert.equal(!badCode.success && Boolean(badCode.errors.code), true);
    const backwards = buildPromotionDraft(trialForm({ valid_until: '2026-09-30T09:00' }));
    assert.equal(!backwards.success && Boolean(backwards.errors.valid_until), true);
    const noStart = buildPromotionDraft(trialForm({ valid_from: '' }));
    assert.equal(!noStart.success && Boolean(noStart.errors.valid_from), true);
    for (const cap of ['0', '1000001', '2.5']) {
        const result = buildPromotionDraft(trialForm({ max_redemptions: cap }));
        assert.equal(!result.success && Boolean(result.errors.max_redemptions), true, cap);
    }
    const longName = buildPromotionDraft(trialForm({ name: 'x'.repeat(129) }));
    assert.equal(!longName.success && Boolean(longName.errors.name), true);
    assert.equal(buildPromotionDraft(trialForm({ name: 'x'.repeat(128), description: 'd'.repeat(1000) })).success, true);
    const noName = buildPromotionDraft(trialForm({ name: '   ' }));
    assert.equal(!noName.success && Boolean(noName.errors.name), true);
});

const promotion = (overrides: Partial<AdminPromotion> = {}): AdminPromotion => ({
    id: 'p1', mode: 'test', kind: 'trial_grant', status: 'active', name: 'Launch', plan_code: 'pro', trial_days: 60,
    auto_apply_on_signup: true, valid_from: '2026-10-01T00:00:00Z', redemption_count: 3, eligible_markets: [], version: 4, ...overrides,
});

test('list presentation: benefit, usage, markets, actions and launch campaign', () => {
    assert.equal(formatPromotionBenefit(promotion()), '60 days');
    assert.equal(formatPromotionBenefit({ kind: 'percent_discount', percent_off: 20, discount_cycles: 3 }), '20% × 3 months');
    assert.equal(formatPromotionBenefit({ kind: 'percent_discount', percent_off: 50, discount_cycles: 1 }), '50% × 1 month');
    assert.equal(formatPromotionUsage(promotion()), '3/unlimited');
    assert.equal(formatPromotionUsage(promotion({ max_redemptions: 100 })), '3/100');
    assert.equal(formatPromotionMarkets(promotion()), 'All markets');
    assert.equal(formatPromotionMarkets(promotion({ kind: 'percent_discount', eligible_markets: ['GB', 'IN'] })), 'GB, IN');
    assert.deepEqual(getPromotionActions('draft'), ['activate', 'archive']);
    assert.deepEqual(getPromotionActions('active'), ['pause', 'archive']);
    assert.deepEqual(getPromotionActions('paused'), ['activate', 'archive']);
    assert.deepEqual(getPromotionActions('archived'), []);
    assert.equal(findLaunchCampaign([promotion({ id: 'd', kind: 'percent_discount', auto_apply_on_signup: false }), promotion({ id: 'x', status: 'paused' }), promotion({ id: 'live' })])?.id, 'live');
    assert.equal(findLaunchCampaign([promotion({ status: 'paused' })]), null);
});

test('activation refusals keep their reason and get a specific message', () => {
    const refusal = (reason: string) => new ApiRequestError('This promotion cannot be activated yet.', 'x', 422, undefined, undefined, 'promotion_activation_invalid', { reason });
    const messages = new Set<string>();
    for (const reason of ['offer_id_missing', 'plan_unavailable', 'price_not_divisible', 'window_ended', 'redemption_cap_reached', 'invalid_terms']) {
        assert.equal(getPromotionActivationReason(refusal(reason)), reason);
        const message = getPromotionErrorMessage(refusal(reason));
        assert.doesNotMatch(message, /cannot be activated yet/);
        messages.add(message);
    }
    assert.equal(messages.size, 6);
    assert.match(getPromotionErrorMessage(refusal('offer_id_missing')), /offer ID/);
    assert.match(getPromotionErrorMessage(refusal('something_new')), /cannot be activated yet/);
    assert.equal(getPromotionActivationReason(new ApiRequestError('x', 'x', 422)), null);
    assert.match(getPromotionErrorMessage(new ApiRequestError('conflict', 'x', 409)), /Refresh/);
});

test('trial grant state mirrors payment precedence and superseded trials cannot be revoked', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    const grant = { ends_at: '2026-11-27T00:00:00Z', revoked_at: null, superseded_at: null };
    assert.equal(getAdminTrialGrantState(grant, now), 'active');
    assert.equal(canRevokeTrialGrant(grant, now), true);
    assert.equal(getAdminTrialGrantState({ ...grant, ends_at: '2026-10-01T00:00:00Z' }, now), 'expired');
    assert.equal(canRevokeTrialGrant({ ...grant, ends_at: '2026-10-01T00:00:00Z' }, now), true);
    assert.equal(getAdminTrialGrantState({ ...grant, superseded_at: '2026-10-05T00:00:00Z' }, now), 'superseded');
    assert.equal(canRevokeTrialGrant({ ...grant, superseded_at: '2026-10-05T00:00:00Z' }, now), false);
    assert.equal(getAdminTrialGrantState({ ...grant, superseded_at: '2026-10-05T00:00:00Z', revoked_at: '2026-10-06T00:00:00Z' }, now), 'revoked');
    assert.equal(canRevokeTrialGrant({ ...grant, revoked_at: '2026-10-06T00:00:00Z' }, now), false);
});

test('revoke reasons are required and capped at 500 characters', () => {
    assert.deepEqual(checkRevokeReason('  Duplicate account  '), { ok: true, reason: 'Duplicate account' });
    assert.equal(checkRevokeReason('   ').ok, false);
    assert.equal(checkRevokeReason('x'.repeat(500)).ok, true);
    assert.equal(checkRevokeReason('x'.repeat(501)).ok, false);
});

test('backfill results explain why a manager was not eligible', () => {
    const format = (value: string) => value.slice(0, 10);
    assert.match(describeBackfillResult({ status: 'granted', grant: { ends_at: '2026-11-27T00:00:00Z' } as never }, format), /until 2026-11-27/);
    assert.match(describeBackfillResult({ status: 'already_granted' }, format), /already has/);
    assert.match(describeBackfillResult({ status: 'not_eligible', reason: 'existing_access' }, format), /paid access or an earlier trial/);
    assert.match(describeBackfillResult({ status: 'not_eligible', reason: 'promotion' }, format), /no launch campaign/);
    assert.match(describeBackfillResult({ status: 'not_eligible' }, format), /not eligible/);
});

test('edits send only changed operational fields with the current version', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    const current = promotion({ max_redemptions: 100, valid_until: '2026-12-31T12:00:00Z', description: 'old' });
    const values = promotionEditValues(current);
    const unchanged = buildPromotionPatch(current, values, now);
    assert.equal(!unchanged.success && unchanged.errors.form, 'Nothing has changed.');

    const renamed = buildPromotionPatch(current, { ...values, name: ' Launch 2 ', max_redemptions: '200' }, now);
    assert.deepEqual(renamed.success && renamed.patch, { version: 4, name: 'Launch 2', max_redemptions: 200 });

    const later = buildPromotionPatch(current, { ...values, valid_until: '2027-01-31T12:00' }, now);
    assert.deepEqual(later.success && later.patch, { version: 4, valid_until: new Date('2027-01-31T12:00').toISOString() });

    const belowUses = buildPromotionPatch(current, { ...values, max_redemptions: '2' }, now);
    assert.equal(!belowUses.success && Boolean(belowUses.errors.max_redemptions), true);
    const cleared = buildPromotionPatch(current, { ...values, max_redemptions: '', valid_until: '' }, now);
    assert.equal(!cleared.success && Boolean(cleared.errors.max_redemptions) && Boolean(cleared.errors.valid_until), true);
    const pastForActive = buildPromotionPatch(current, { ...values, valid_until: '2026-10-05T12:00' }, now);
    assert.equal(!pastForActive.success && Boolean(pastForActive.errors.valid_until), true);
});

test('idempotency keys are reused for retries and replaced after a definite answer', () => {
    let counter = 0;
    const keys = createIdempotencyKeys(() => `key-${++counter}`);
    assert.equal(keys.keyFor('create:a'), 'key-1');
    assert.equal(keys.keyFor('create:a'), 'key-1');
    assert.equal(keys.keyFor('create:b'), 'key-2');
    keys.clear('create:a');
    assert.equal(keys.keyFor('create:a'), 'key-3');
    assert.equal(shouldReuseIdempotencyKey(new Error('network')), true);
    assert.equal(shouldReuseIdempotencyKey(new ApiRequestError('down', 'down', 503)), true);
    assert.equal(shouldReuseIdempotencyKey(new ApiRequestError('bad', 'bad', 422)), false);
    // The default key satisfies payment validCheckoutKey (16–128 of [A-Za-z0-9_-]).
    assert.match(createIdempotencyKeys().keyFor('x'), /^[A-Za-z0-9_-]{16,128}$/);
});

test('limits are counted in UTF-8 bytes and manager IDs are normalised like payment-service', async () => {
    const { utf8ByteLength, normalizeManagerID, checkRevokeReason } = await import('./adminPromotions');
    assert.equal(utf8ByteLength('₹'), 3);
    assert.equal(utf8ByteLength('abc'), 3);
    assert.equal(checkRevokeReason('₹'.repeat(200)).ok, false); // 600 bytes > 500
    assert.equal(checkRevokeReason('a'.repeat(500)).ok, true);
    assert.equal(normalizeManagerID('  0F8FAD5B-D9CB-469F-A165-70867728950E '), '0f8fad5b-d9cb-469f-a165-70867728950e');
});

test('activating a percent discount needs every Razorpay offer setting ticked, one offer per currency', () => {
    const discount = {
        kind: 'percent_discount' as const, percent_off: 20, discount_cycles: 3, eligible_markets: ['IN', 'GB'] as ('IN' | 'GB')[],
        provider_offer_id_inr: 'offer_INR123', provider_offer_id_gbp: null,
    };
    const items = getOfferChecklist(discount, 'now → no end date');
    assert.deepEqual(items.map((item) => item.id), ['offer_type', 'cycles', 'payment_methods', 'failure', 'validity', 'offer_INR', 'offer_GBP']);
    const labels = items.map((item) => item.label).join('\n');
    assert.match(labels, /Percentage, at exactly 20% off/);
    assert.match(labels, /Limited number of cycles”, set to 3/);
    assert.match(labels, /all cards and UPI/);
    assert.match(labels, /do not allow the payment without the offer/);
    assert.match(labels, /cover this promotion’s window \(now → no end date\)/);
    assert.match(labels, /INR offer on the INR plan, with ID offer_INR123/);
    assert.match(labels, /GBP offer on the GBP plan, with ID \(not set yet\)/);
    assert.match(OFFER_CHECKLIST_EXPLANATION, /charged a different amount and payment verification rejects the payment/);

    assert.equal(isOfferChecklistComplete(items, []), false);
    assert.equal(isOfferChecklistComplete(items, items.slice(1).map((item) => item.id)), false);
    assert.equal(isOfferChecklistComplete(items, items.map((item) => item.id)), true);
    assert.equal(isOfferChecklistComplete(items, new Set(items.map((item) => item.id))), true);

    const indiaOnly = getOfferChecklist({ ...discount, eligible_markets: ['IN'] }, 'window');
    assert.equal(indiaOnly.some((item) => item.id === 'offer_GBP'), false);
    // Trials never touch Razorpay, so they have no checklist and it is never "complete".
    const trial = getOfferChecklist({ ...discount, kind: 'trial_grant' }, 'window');
    assert.deepEqual(trial, []);
    assert.equal(isOfferChecklistComplete(trial, []), false);
});
