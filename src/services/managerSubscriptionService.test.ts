import assert from 'node:assert/strict';
import test from 'node:test';

import {
    TRIAL_CODE_FAILED_MESSAGE,
    TRIAL_CODE_RATE_LIMITED_MESSAGE,
    TRIAL_CODE_SIGN_IN_MESSAGE,
    TRIAL_CODE_UNAVAILABLE_MESSAGE,
    TRIAL_CODE_UNCONFIRMED_MESSAGE,
    redeemManagerTrialCode,
    type TrialCodeRedeemErrorKind,
} from './managerSubscriptionService';

type Call = { url: string; method: string; body?: string };

const envelope = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const refusal = (status: number, code: string, error: string) => envelope(status, { success: false, error, code, data: null });

async function redeem(rawCode: string, respond: () => Response) {
    const originalFetch = globalThis.fetch;
    const calls: Call[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', body: init?.body ? String(init.body) : undefined });
        return respond();
    }) as typeof fetch;
    try {
        return { result: await redeemManagerTrialCode(rawCode), calls };
    } finally {
        globalThis.fetch = originalFetch;
    }
}

const grant = { plan_code: 'pro', plan_name: 'Growth', starts_at: '2026-09-30T10:00:00Z', ends_at: '2026-11-29T10:00:00Z' };
const trial = { ...grant, days_remaining: 60, state: 'active' };

const failures: Array<{ name: string; respond: () => Response; kind: TrialCodeRedeemErrorKind; message: string; serverText?: string }> = [
    { name: '409 promotion_unavailable', respond: refusal(409, 'promotion_unavailable', 'This code cannot be used.'), kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE, serverText: 'This code cannot be used.' },
    { name: '409 trial_conflict (already has a trial or paid access)', respond: refusal(409, 'trial_conflict', 'This manager already has a trial or current paid or pilot access.'), kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE, serverText: 'already has a trial' },
    { name: '400 invalid_request', respond: refusal(400, 'invalid_request', 'Please check the submitted subscription details.'), kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE },
    { name: '403 access_denied', respond: refusal(403, 'access_denied', 'This account cannot perform that subscription action.'), kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE },
    { name: '429 rate_limited', respond: refusal(429, 'rate_limited', 'Too many code attempts. Please try again later.'), kind: 'rate_limited', message: TRIAL_CODE_RATE_LIMITED_MESSAGE, serverText: 'Too many code attempts' },
    { name: '401 authentication_required', respond: refusal(401, 'authentication_required', 'Sign in to continue.'), kind: 'sign_in', message: TRIAL_CODE_SIGN_IN_MESSAGE },
    { name: '500 subscription_unavailable', respond: refusal(500, 'subscription_unavailable', 'Subscription details could not be saved. Please try again.'), kind: 'failed', message: TRIAL_CODE_FAILED_MESSAGE, serverText: 'could not be saved' },
    { name: '503 provider_unavailable', respond: refusal(503, 'provider_unavailable', 'Payment service is temporarily unavailable.'), kind: 'failed', message: TRIAL_CODE_FAILED_MESSAGE },
    { name: 'network error', respond: () => { throw new TypeError('Failed to fetch'); }, kind: 'failed', message: TRIAL_CODE_FAILED_MESSAGE, serverText: 'Failed to fetch' },
    { name: '200 replay of a trial that has already ended', respond: envelope(200, { success: true, data: { status: 'already_granted', grant, trial: { ...trial, days_remaining: 0, state: 'expired' } } }), kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE },
    { name: '200 without a usable grant', respond: envelope(200, { success: true, data: { status: 'not_eligible' } }), kind: 'unconfirmed', message: TRIAL_CODE_UNCONFIRMED_MESSAGE },
    { name: '201 with a malformed end date', respond: envelope(201, { success: true, data: { status: 'granted', grant: { ...grant, ends_at: 'soon' } } }), kind: 'unconfirmed', message: TRIAL_CODE_UNCONFIRMED_MESSAGE },
];

test('redeem posts the trimmed, upper-cased code to the payment trial route', async () => {
    const { result, calls } = await redeem('  trial60 ', envelope(201, { success: true, data: { status: 'granted', grant, trial } }));
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/api\/v1\/manager\/subscriptions\/promotions\/redeem$/);
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].body || '{}'), { code: 'TRIAL60' });
    assert.equal(result.error, null);
    assert.deepEqual(result.data, { status: 'granted', grant, trial });
});

test('an exact replay (200 already_granted) is a success with the same grant', async () => {
    const { result } = await redeem('TRIAL60', envelope(200, { success: true, data: { status: 'already_granted', grant, trial: null } }));
    assert.equal(result.error, null);
    assert.equal(result.data?.status, 'already_granted');
    assert.equal(result.data?.trial, null);
});

for (const scenario of failures) {
    test(`redeem maps ${scenario.name} to a fixed ${scenario.kind} message`, async () => {
        const { result, calls } = await redeem('TRIAL60', scenario.respond);
        assert.equal(calls.length, 1, 'a POST is never retried');
        assert.equal(result.data, null);
        assert.deepEqual(result.error, { kind: scenario.kind, message: scenario.message });
        if (scenario.serverText) assert.ok(!result.error?.message.includes(scenario.serverText), 'server text is never shown');
    });
}

test('codes that can never be valid are refused without spending a rate-limited attempt', async () => {
    for (const raw of ['', '   ', 'AB', 'TRIAL 60', 'TRIAL60!', '-TRIAL', 'A'.repeat(33)]) {
        const { result, calls } = await redeem(raw, envelope(201, { success: true, data: { status: 'granted', grant, trial } }));
        assert.equal(calls.length, 0, `no request for ${JSON.stringify(raw)}`);
        assert.deepEqual(result.error, { kind: 'unavailable', message: TRIAL_CODE_UNAVAILABLE_MESSAGE });
    }
});
