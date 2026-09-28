import assert from 'node:assert/strict';
import test from 'node:test';

import { backfillAdminTrialGrant, changeAdminPromotionStatus, createAdminPromotion, createAdminSubscriptionPlan, revokeAdminTrialGrant } from './adminSubscriptionService';

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

test('promotion mutations send an Idempotency-Key and hit the spec admin routes', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string; key: string | null; body?: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', key: new Headers(init?.headers).get('Idempotency-Key'), body: init?.body ? String(init.body) : undefined });
        return new Response(JSON.stringify({ success: true, data: { id: 'x', status: 'granted' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    try {
        await createAdminPromotion({ kind: 'trial_grant', name: 'Launch', plan_code: 'pro', trial_days: 60, auto_apply_on_signup: true, valid_from: '2026-10-01T00:00:00.000Z', eligible_markets: ['IN'] }, 'key-create');
        await changeAdminPromotionStatus('promo 1', 'activate', 'key-activate');
        await revokeAdminTrialGrant('grant-1', 'Duplicate account', 'key-revoke');
        await backfillAdminTrialGrant('manager-1', 'key-backfill');
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.deepEqual(calls.map((call) => [call.method, call.key]), [['POST', 'key-create'], ['POST', 'key-activate'], ['POST', 'key-revoke'], ['POST', 'key-backfill']]);
    assert.match(calls[0].url, /\/api\/v1\/admin\/subscriptions\/promotions$/);
    assert.match(calls[1].url, /\/api\/v1\/admin\/subscriptions\/promotions\/promo%201\/activate$/);
    assert.match(calls[2].url, /\/api\/v1\/admin\/subscriptions\/trial-grants\/grant-1\/revoke$/);
    assert.deepEqual(JSON.parse(calls[2].body || '{}'), { reason: 'Duplicate account' });
    assert.match(calls[3].url, /\/api\/v1\/admin\/subscriptions\/trial-grants\/backfill$/);
    assert.deepEqual(JSON.parse(calls[3].body || '{}'), { manager_id: 'manager-1' });
});
