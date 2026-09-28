import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiRequestError } from '@/lib/apiUtils';
import {
    backfillAdminTrialGrant,
    changeAdminPromotionStatus,
    createAdminPromotion,
    createAdminSubscriptionPlan,
    getAdminPromotionRedemptions,
    getAdminTrialGrants,
    patchAdminPromotion,
    revokeAdminTrialGrant,
} from './adminSubscriptionService';

test('admin plan draft client posts exact approved India terms to the catalog route', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', body: init?.body ? String(init.body) : undefined });
        return new Response(JSON.stringify({ success: true, data: { id: 'draft-1' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    try {
        await createAdminSubscriptionPlan({
            code: 'pro', version: 1, provider_plan_id: 'plan_Test123', amount_minor: 99900, tax_minor: 0, currency: 'INR',
            billing_period: 'monthly', billing_interval: 1, total_cycles: 12, published_property_limit: 8,
            property_upload_bytes: 0, supplied_leads: 0, leads_per_property: false, fast_track_discount_bps: 0,
            support_level: 'standard', featured: false, terms_schema_version: 2, image_upload_limit_bytes: 52000000,
            active_case_limit: 10, lead_delivery_policy: 'best_effort', tax_inclusive: true,
            terms_version: '2026-09-india-pro-v1', terms_text: 'Test terms.',
        });
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/api\/v1\/admin\/subscriptions\/plans$/);
    assert.equal(calls[0].method, 'POST');
    assert.equal(JSON.parse(calls[0].body || '{}').provider_plan_id, 'plan_Test123');
});

type Call = { url: string; method: string; key: string | null; body?: string };

const okResponse = (data: unknown) => () => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

async function capture(run: () => Promise<unknown>, response: () => Response = okResponse({ id: 'x', status: 'granted' })) {
    const originalFetch = globalThis.fetch;
    const calls: Call[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', key: new Headers(init?.headers).get('Idempotency-Key'), body: init?.body ? String(init.body) : undefined });
        return response();
    }) as typeof fetch;
    try {
        await run();
    } finally {
        globalThis.fetch = originalFetch;
    }
    return calls;
}

test('promotion mutations send an Idempotency-Key and hit the payment admin routes', async () => {
    const calls = await capture(async () => {
        await createAdminPromotion({ kind: 'trial_grant', name: 'Launch', plan_code: 'pro', trial_days: 60, auto_apply_on_signup: true, valid_from: '2026-10-01T00:00:00.000Z' }, 'key-create');
        await changeAdminPromotionStatus('promo 1', 'activate', 'key-activate');
        await patchAdminPromotion('promo-1', { version: 3, max_redemptions: 200 }, 'key-patch');
        await revokeAdminTrialGrant('grant-1', 'Duplicate account', 'key-revoke');
        await backfillAdminTrialGrant('manager-1', 'key-backfill');
    });

    assert.deepEqual(calls.map((call) => [call.method, call.key]), [['POST', 'key-create'], ['POST', 'key-activate'], ['PATCH', 'key-patch'], ['POST', 'key-revoke'], ['POST', 'key-backfill']]);
    assert.match(calls[0].url, /\/api\/v1\/admin\/subscriptions\/promotions$/);
    assert.equal('eligible_markets' in JSON.parse(calls[0].body || '{}'), false);
    assert.match(calls[1].url, /\/api\/v1\/admin\/subscriptions\/promotions\/promo%201\/activate$/);
    assert.match(calls[2].url, /\/api\/v1\/admin\/subscriptions\/promotions\/promo-1$/);
    assert.deepEqual(JSON.parse(calls[2].body || '{}'), { version: 3, max_redemptions: 200 });
    assert.match(calls[3].url, /\/api\/v1\/admin\/subscriptions\/trial-grants\/grant-1\/revoke$/);
    assert.deepEqual(JSON.parse(calls[3].body || '{}'), { reason: 'Duplicate account' });
    assert.match(calls[4].url, /\/api\/v1\/admin\/subscriptions\/trial-grants\/backfill$/);
    assert.deepEqual(JSON.parse(calls[4].body || '{}'), { manager_id: 'manager-1' });
});

test('trial lookup and redemptions are paged reads', async () => {
    const calls = await capture(async () => {
        await getAdminTrialGrants('manager 1');
        await getAdminPromotionRedemptions('promo-1', 50, 100);
    }, okResponse([]));
    assert.match(calls[0].url, /\/api\/v1\/admin\/subscriptions\/trial-grants\?manager_id=manager%201&limit=20&offset=0$/);
    assert.match(calls[1].url, /\/api\/v1\/admin\/subscriptions\/promotions\/promo-1\/redemptions\?limit=50&offset=100$/);
    assert.equal(calls.every((call) => call.method === 'GET'), true);
});

test('an activation refusal keeps its code and data.reason', async () => {
    let caught: unknown;
    await capture(async () => {
        try {
            await changeAdminPromotionStatus('promo-1', 'activate', 'key-activate-2');
        } catch (error) {
            caught = error;
        }
    }, () => new Response(JSON.stringify({ success: false, error: 'This promotion cannot be activated yet.', code: 'promotion_activation_invalid', data: { reason: 'offer_id_missing' } }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
    assert.ok(caught instanceof ApiRequestError);
    assert.equal(caught.status, 422);
    assert.equal(caught.code, 'promotion_activation_invalid');
    assert.deepEqual(caught.data, { reason: 'offer_id_missing' });
});
