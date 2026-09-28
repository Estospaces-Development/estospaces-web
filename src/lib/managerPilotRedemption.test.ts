import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiRequestError } from './apiUtils';
import {
    formatPilotDate,
    getPilotCodeInputError,
    getPilotRedeemErrorMessage,
    getPilotRedemptionAvailability,
    isWellFormedPilotCode,
    normalizePilotCode,
} from './managerPilotRedemption';
import type { ManagerSubscriptionEntitlement, ManagerSubscriptionSummary } from '@/services/managerSubscriptionService';

const VALID_CODE = 'ESTO-PILOT-0123456789ABCDEF0123456789ABCDEF';
const NOW = Date.parse('2026-09-28T10:00:00.000Z');

const entitlement = (state: ManagerSubscriptionEntitlement['state'], endsAt?: string): ManagerSubscriptionEntitlement => ({
    state,
    source: state === 'pilot_active' ? 'pilot' : state === 'paid_active' ? 'paid' : 'free',
    ends_at: endsAt,
    reason: state,
    published_property_limit: state === 'pilot_active' ? { kind: 'unlimited' } : { kind: 'finite', value: 2 },
    active_case_limit: state === 'pilot_active' ? { kind: 'unlimited' } : { kind: 'finite', value: 2 },
    support_level: 'basic',
});

const summary = (overrides: Partial<ManagerSubscriptionSummary> = {}): ManagerSubscriptionSummary => ({
    mode: 'test',
    entitlement: entitlement('free_active'),
    checkout: null,
    new_paid_actions_available: false,
    ...overrides,
});

const apiError = (status: number, code?: string) => new ApiRequestError('server message', 'toast message', status, undefined, undefined, code);

test('pasted pilot codes are normalised to the exact server format', () => {
    assert.equal(normalizePilotCode(' esto-pilot-0123 4567 89ab cdef\n0123456789abcdef '), VALID_CODE);
    assert.equal(isWellFormedPilotCode(VALID_CODE), true);
    assert.equal(isWellFormedPilotCode(VALID_CODE.slice(0, -1)), false);
    assert.equal(isWellFormedPilotCode(`${VALID_CODE}0`), false);
    assert.equal(isWellFormedPilotCode(VALID_CODE.replace('ESTO-PILOT-', 'ESTO-PROMO-')), false);
    assert.equal(isWellFormedPilotCode(VALID_CODE.replace(/F$/, 'G')), false);
});

test('empty and malformed codes are rejected before any request is sent', () => {
    assert.match(getPilotCodeInputError('   ') ?? '', /Enter the pilot code/);
    assert.match(getPilotCodeInputError('ESTO-PILOT-123') ?? '', /start with ESTO-PILOT- followed by 32/);
    assert.equal(getPilotCodeInputError(VALID_CODE.toLowerCase()), null);
});

test('an active pilot grant hides the form and exposes its server end date', () => {
    const availability = getPilotRedemptionAvailability({
        pilotStatus: { grant: { campaign: 'launch-pilot', starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-10-31T00:00:00Z' }, promotions: [] },
        pilotStatusFailed: false,
        summary: summary({ entitlement: entitlement('pilot_active', '2026-10-31T00:00:00Z') }),
        now: NOW,
    });
    assert.deepEqual(availability, { kind: 'active', campaign: 'launch-pilot', startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-31T00:00:00Z' });
});

test('the account entitlement still reports an active pilot when the pilot status read fails', () => {
    assert.deepEqual(getPilotRedemptionAvailability({
        pilotStatus: null,
        pilotStatusFailed: true,
        summary: summary({ entitlement: entitlement('pilot_active', '2026-10-31T00:00:00Z') }),
        now: NOW,
    }), { kind: 'active', endsAt: '2026-10-31T00:00:00Z' });
});

test('an ended grant is not presented as active', () => {
    const availability = getPilotRedemptionAvailability({
        pilotStatus: { grant: { campaign: 'old', starts_at: '2026-07-01T00:00:00Z', ends_at: '2026-08-30T00:00:00Z' }, promotions: [] },
        pilotStatusFailed: false,
        summary: summary(),
        now: NOW,
    });
    assert.deepEqual(availability, { kind: 'available' });
});

test('paid access or any current checkout blocks redemption, matching the server pilot conflict rule', () => {
    const checkout = { id: 'checkout-1', plan_version_id: 'plan-1', terms_digest: 'digest', consent_version: 'v1', status: 'ready' };
    for (const account of [
        summary({ checkout }),
        summary({ entitlement: entitlement('paid_active', '2026-10-28T00:00:00Z') }),
        summary({ entitlement: entitlement('expired'), checkout: { ...checkout, status: 'verified' } }),
    ]) {
        const availability = getPilotRedemptionAvailability({ pilotStatus: { promotions: [] }, pilotStatusFailed: false, summary: account, now: NOW });
        assert.equal(availability.kind, 'blocked');
        assert.match(availability.kind === 'blocked' ? availability.reason : '', /paid subscription or an unresolved subscription checkout/);
    }
});

test('redemption is disabled until both the pilot status and account summary are known', () => {
    assert.equal(getPilotRedemptionAvailability({ pilotStatus: null, pilotStatusFailed: true, summary: summary(), now: NOW }).kind, 'unknown');
    assert.equal(getPilotRedemptionAvailability({ pilotStatus: { promotions: [] }, pilotStatusFailed: false, summary: null, now: NOW }).kind, 'unknown');
    assert.deepEqual(getPilotRedemptionAvailability({ pilotStatus: { promotions: [] }, pilotStatusFailed: false, summary: summary(), now: NOW }), { kind: 'available' });
});

test('every payment-service pilot error code has a specific, safe message', () => {
    const cases: [ApiRequestError, RegExp][] = [
        [apiError(409, 'pilot_coupon_unavailable'), /cannot be used\. It may be mistyped, expired, revoked, already used, or issued to a different account/],
        [apiError(409, 'pilot_access_conflict'), /already has an active pilot, a paid subscription or an unresolved subscription checkout/],
        [apiError(409, 'billing_market_unavailable'), /verified billing country is required/],
        [apiError(400, 'invalid_pilot_request'), /full pilot code exactly/],
        [apiError(400, 'invalid_request'), /full pilot code exactly/],
        [apiError(403, 'access_denied'), /Only manager accounts/],
        [apiError(503, 'provider_unavailable'), /temporarily unavailable.*will not create a second pilot/],
        [apiError(401, 'authentication_required'), /session has expired/],
        [apiError(429), /Too many attempts/],
        [apiError(500, 'subscription_unavailable'), /Refresh to check whether it is active.*will not create a second pilot/],
    ];
    for (const [error, expected] of cases) {
        const message = getPilotRedeemErrorMessage(error);
        assert.match(message, expected, `${error.status} ${error.code}`);
        assert.doesNotMatch(message, /server message|toast message/);
    }
    assert.match(getPilotRedeemErrorMessage(new TypeError('Failed to fetch')), /Refresh to check whether it is active/);
});

test('pilot dates are formatted from the server value and invalid values are not invented', () => {
    assert.equal(formatPilotDate('2026-11-27T09:30:00Z', 'UTC'), '27 Nov 2026, 09:30');
    assert.equal(formatPilotDate('not-a-date', 'UTC'), null);
    assert.equal(formatPilotDate(undefined, 'UTC'), null);
});

test('pilot service calls use the payment-service manager routes and exact redeem body', async () => {
    const { getManagerPilotStatus, redeemManagerPilotCoupon } = await import('../services/managerSubscriptionService');
    const previousFetch = globalThis.fetch;
    const calls: { url: string; method: string; body: unknown; contentType: string | null }[] = [];
    const grant = { id: 'grant-1', campaign: 'launch-pilot', starts_at: '2026-09-28T10:00:00Z', ends_at: '2026-11-27T10:00:00Z' };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        calls.push({
            url: String(input),
            method,
            body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
            contentType: new Headers(init?.headers).get('Content-Type'),
        });
        const data = method === 'POST' ? grant : { grant: { campaign: grant.campaign, starts_at: grant.starts_at, ends_at: grant.ends_at }, promotions: [] };
        return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    try {
        const status = await getManagerPilotStatus();
        assert.equal(status.grant?.ends_at, grant.ends_at);
        const redeemed = await redeemManagerPilotCoupon(VALID_CODE);
        assert.equal(redeemed.ends_at, grant.ends_at);
    } finally {
        globalThis.fetch = previousFetch;
    }
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/api\/v1\/manager\/subscriptions\/pilot$/);
    assert.equal(calls[0].method, 'GET');
    assert.match(calls[1].url, /\/api\/v1\/manager\/subscriptions\/pilot\/redeem$/);
    assert.equal(calls[1].method, 'POST');
    // payment-service rejects unknown JSON fields, so the body must be exactly { code }.
    assert.deepEqual(calls[1].body, { code: VALID_CODE });
    assert.equal(calls[1].contentType, 'application/json');
});

test('a redeem rejection keeps the server error code for message mapping', async () => {
    const { redeemManagerPilotCoupon } = await import('../services/managerSubscriptionService');
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({
        success: false, code: 'pilot_access_conflict', error: 'Resolve the current subscription state before starting a pilot.', data: null,
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
    try {
        await assert.rejects(redeemManagerPilotCoupon(VALID_CODE), (error: unknown) => {
            assert.ok(error instanceof ApiRequestError);
            assert.equal(error.status, 409);
            assert.equal(error.code, 'pilot_access_conflict');
            assert.match(getPilotRedeemErrorMessage(error), /already has an active pilot/);
            return true;
        });
    } finally {
        globalThis.fetch = previousFetch;
    }
});
