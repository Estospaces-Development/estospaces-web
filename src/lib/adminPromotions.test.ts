import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildPromotionDraft,
    canRevokeTrialRedemption,
    createIdempotencyKeys,
    emptyPromotionForm,
    findLaunchCampaign,
    formatPromotionBenefit,
    formatPromotionUsage,
    getPromotionActions,
    shouldReuseIdempotencyKey,
    type PromotionFormValues,
} from './adminPromotions';
import { ApiRequestError } from './apiUtils';
import type { AdminPromotion, AdminPromotionRedemption } from '../services/adminSubscriptionService';

const trialForm = (overrides: Partial<PromotionFormValues> = {}): PromotionFormValues => ({
    ...emptyPromotionForm('trial_grant'), name: 'Launch', valid_from: '2026-10-01T09:00', auto_apply_on_signup: true, ...overrides,
});
const discountForm = (overrides: Partial<PromotionFormValues> = {}): PromotionFormValues => ({
    ...emptyPromotionForm('percent_discount'), name: 'Twenty off', code: 'launch20', percent_off: '20', discount_cycles: '3',
    provider_offer_id_inr: 'offer_Abc123', valid_from: '2026-10-01T09:00', ...overrides,
});

test('a valid trial form builds the exact trial_grant body', () => {
    const result = buildPromotionDraft(trialForm({ max_redemptions: '500', market_gb: true }));
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.draft, {
        kind: 'trial_grant', name: 'Launch', description: undefined, code: undefined, plan_code: 'pro',
        valid_from: new Date('2026-10-01T09:00').toISOString(), valid_until: undefined, max_redemptions: 500,
        eligible_markets: ['IN', 'GB'], trial_days: 60, auto_apply_on_signup: true,
    });
    // Discount-only fields never reach a trial body (payment rejects unknown fields).
    assert.equal('percent_off' in result.draft, false);
});

test('trial days must be a whole number from 1 to 365', () => {
    for (const value of ['0', '366', '1.5', 'abc', '']) {
        const result = buildPromotionDraft(trialForm({ trial_days: value }));
        assert.equal(result.success, false, value);
        if (!result.success) assert.ok(result.errors.trial_days, value);
    }
    assert.equal(buildPromotionDraft(trialForm({ trial_days: '365' })).success, true);
});

test('a valid discount form builds the percent_discount body with an upper-case code', () => {
    const result = buildPromotionDraft(discountForm());
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.draft.kind, 'percent_discount');
    if (result.draft.kind !== 'percent_discount') return;
    assert.equal(result.draft.code, 'LAUNCH20');
    assert.equal(result.draft.percent_off, 20);
    assert.equal(result.draft.discount_cycles, 3);
    assert.equal(result.draft.provider_offer_id_inr, 'offer_Abc123');
    assert.equal(result.draft.provider_offer_id_gbp, undefined);
    assert.equal(result.draft.max_redemptions, undefined);
});

test('percent is 1 to 90 and discounted months 1 to 24', () => {
    for (const [field, value] of [['percent_off', '0'], ['percent_off', '91'], ['percent_off', '12.5'], ['discount_cycles', '0'], ['discount_cycles', '25']] as const) {
        const result = buildPromotionDraft(discountForm({ [field]: value }));
        assert.equal(result.success, false, `${field}=${value}`);
        if (!result.success) assert.ok(result.errors[field], `${field}=${value}`);
    }
    assert.equal(buildPromotionDraft(discountForm({ percent_off: '90', discount_cycles: '24' })).success, true);
    assert.equal(buildPromotionDraft(discountForm({ percent_off: '1', discount_cycles: '1' })).success, true);
});

test('offer IDs must match offer_ plus alphanumerics and exist for each selected market', () => {
    for (const value of ['offer-123', 'offer_', 'plan_Abc', 'offer_ab c']) {
        const result = buildPromotionDraft(discountForm({ provider_offer_id_inr: value }));
        assert.equal(result.success, false, value);
        if (!result.success) assert.ok(result.errors.provider_offer_id_inr, value);
    }
    const missingGBP = buildPromotionDraft(discountForm({ market_gb: true }));
    assert.equal(missingGBP.success, false);
    if (!missingGBP.success) assert.match(missingGBP.errors.provider_offer_id_gbp || '', /GBP/);
    const both = buildPromotionDraft(discountForm({ market_gb: true, provider_offer_id_gbp: 'offer_Gbp9' }));
    assert.equal(both.success, true);
    // An offer typed for an unselected market is not sent.
    const ukOnly = buildPromotionDraft(discountForm({ market_in: false, market_gb: true, provider_offer_id_gbp: 'offer_Gbp9' }));
    assert.equal(ukOnly.success && ukOnly.draft.kind === 'percent_discount' ? ukOnly.draft.provider_offer_id_inr : 'unexpected', undefined);
});

test('discounts need a code; codes, windows, caps and markets are validated', () => {
    const noCode = buildPromotionDraft(discountForm({ code: '' }));
    assert.equal(!noCode.success && Boolean(noCode.errors.code), true);
    const badCode = buildPromotionDraft(trialForm({ code: 'a!' }));
    assert.equal(!badCode.success && Boolean(badCode.errors.code), true);
    const backwards = buildPromotionDraft(trialForm({ valid_until: '2026-09-30T09:00' }));
    assert.equal(!backwards.success && Boolean(backwards.errors.valid_until), true);
    const noStart = buildPromotionDraft(trialForm({ valid_from: '' }));
    assert.equal(!noStart.success && Boolean(noStart.errors.valid_from), true);
    const zeroCap = buildPromotionDraft(trialForm({ max_redemptions: '0' }));
    assert.equal(!zeroCap.success && Boolean(zeroCap.errors.max_redemptions), true);
    const noMarket = buildPromotionDraft(trialForm({ market_in: false, market_gb: false }));
    assert.equal(!noMarket.success && Boolean(noMarket.errors.markets), true);
    const noName = buildPromotionDraft(trialForm({ name: '   ' }));
    assert.equal(!noName.success && Boolean(noName.errors.name), true);
});

const promotion = (overrides: Partial<AdminPromotion> = {}): AdminPromotion => ({
    id: 'p1', mode: 'test', kind: 'trial_grant', status: 'active', name: 'Launch', plan_code: 'pro', trial_days: 60,
    auto_apply_on_signup: true, valid_from: '2026-10-01T00:00:00Z', redemption_count: 3, eligible_markets: ['IN'], version: 1, ...overrides,
});

test('list presentation: benefit, usage, actions and launch campaign', () => {
    assert.equal(formatPromotionBenefit(promotion()), '60 days');
    assert.equal(formatPromotionBenefit({ kind: 'percent_discount', percent_off: 20, discount_cycles: 3 }), '20% × 3 months');
    assert.equal(formatPromotionBenefit({ kind: 'percent_discount', percent_off: 50, discount_cycles: 1 }), '50% × 1 month');
    assert.equal(formatPromotionUsage(promotion()), '3/unlimited');
    assert.equal(formatPromotionUsage(promotion({ max_redemptions: 100 })), '3/100');
    assert.deepEqual(getPromotionActions('draft'), ['activate', 'archive']);
    assert.deepEqual(getPromotionActions('active'), ['pause', 'archive']);
    assert.deepEqual(getPromotionActions('paused'), ['activate', 'archive']);
    assert.deepEqual(getPromotionActions('archived'), []);
    assert.equal(findLaunchCampaign([promotion({ id: 'd', kind: 'percent_discount', auto_apply_on_signup: false }), promotion({ id: 'x', status: 'paused' }), promotion({ id: 'live' })])?.id, 'live');
    assert.equal(findLaunchCampaign([promotion({ status: 'paused' })]), null);
});

test('only applied trial redemptions with a grant can be revoked', () => {
    const redemption: AdminPromotionRedemption = {
        id: 'r1', mode: 'test', promotion_id: 'p1', manager_id: 'm1', kind: 'trial_grant', source: 'signup_auto', status: 'applied', trial_grant_id: 'g1', created_at: '2026-10-01T00:00:00Z',
    };
    assert.equal(canRevokeTrialRedemption(redemption), true);
    assert.equal(canRevokeTrialRedemption({ ...redemption, status: 'revoked' }), false);
    assert.equal(canRevokeTrialRedemption({ ...redemption, trial_grant_id: null }), false);
    assert.equal(canRevokeTrialRedemption({ ...redemption, kind: 'percent_discount' }), false);
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
});
