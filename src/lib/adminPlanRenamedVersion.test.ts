import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminSubscriptionPlan, type AdminSubscriptionPlan } from '@/services/adminSubscriptionService';
import {
    COPIED_PLAN_FIELDS,
    TERMS_ALREADY_CURRENT_NOTE,
    buildRenamedPlanDraft,
    copiedFieldsMatch,
    getRenamedVersionAction,
    nextPlanVersion,
    otherTierLegacyName,
    renameLegacyPlanTerms,
    renamedTermsVersion,
} from './adminPlanRenamedVersion';

test('legacy plan names are replaced per code, word-boundary safe and exactly once', () => {
    const cases: Array<{ name: string; code: 'pro' | 'growth'; input: string; expected: string; replacements: number }> = [
        { name: 'pro: manager subscription phrase', code: 'pro', input: 'Pro manager subscription: eight published properties.', expected: 'Growth manager subscription: eight published properties.', replacements: 1 },
        { name: 'pro: Estospaces phrase', code: 'pro', input: 'Estospaces Pro India monthly subscription.', expected: 'Estospaces Growth India monthly subscription.', replacements: 1 },
        { name: 'growth: manager subscription phrase', code: 'growth', input: 'Growth manager subscription: twenty published properties.', expected: 'Premium manager subscription: twenty published properties.', replacements: 1 },
        { name: 'growth: Estospaces phrase', code: 'growth', input: 'Estospaces Growth UK monthly subscription.', expected: 'Estospaces Premium UK monthly subscription.', replacements: 1 },
        { name: 'multiple occurrences of both phrases', code: 'pro', input: 'Pro manager subscription. Estospaces Pro renews monthly. Estospaces Pro ends; Pro manager subscription.', expected: 'Growth manager subscription. Estospaces Growth renews monthly. Estospaces Growth ends; Growth manager subscription.', replacements: 4 },
        { name: 'overlapping phrases are replaced once', code: 'pro', input: 'Estospaces Pro manager subscription.', expected: 'Estospaces Growth manager subscription.', replacements: 1 },
        // A pro plan's new "Growth" must never become "Premium".
        { name: 'pro: already renamed, never double-replaced', code: 'pro', input: 'Growth manager subscription. Estospaces Growth.', expected: 'Growth manager subscription. Estospaces Growth.', replacements: 0 },
        { name: 'growth: already renamed', code: 'growth', input: 'Premium manager subscription. Estospaces Premium.', expected: 'Premium manager subscription. Estospaces Premium.', replacements: 0 },
        { name: 'pro: the other code\'s legacy phrase is left alone', code: 'pro', input: 'Growth manager subscription', expected: 'Growth manager subscription', replacements: 0 },
        { name: 'growth: the other code\'s legacy phrase is left alone', code: 'growth', input: 'Estospaces Pro and Pro manager subscription', expected: 'Estospaces Pro and Pro manager subscription', replacements: 0 },
        { name: 'no match', code: 'pro', input: 'Monthly manager plan terms.', expected: 'Monthly manager plan terms.', replacements: 0 },
        { name: 'empty text', code: 'growth', input: '', expected: '', replacements: 0 },
        { name: 'case-sensitive', code: 'pro', input: 'estospaces pro and PRO MANAGER SUBSCRIPTION', expected: 'estospaces pro and PRO MANAGER SUBSCRIPTION', replacements: 0 },
        { name: 'word boundary: longer words are not matched', code: 'pro', input: 'Estospaces Professional; Pro manager subscriptions; XEstospaces Pro', expected: 'Estospaces Professional; Pro manager subscriptions; XEstospaces Pro', replacements: 0 },
        { name: 'word boundary: punctuation and line breaks', code: 'growth', input: '(Estospaces Growth)\nGrowth manager subscription.', expected: '(Estospaces Premium)\nPremium manager subscription.', replacements: 2 },
        { name: 'rest of the text is byte-identical', code: 'pro', input: '  ₹999 · Estospaces Pro — 8 properties\t\n', expected: '  ₹999 · Estospaces Growth — 8 properties\t\n', replacements: 1 },
    ];
    for (const { name, code, input, expected, replacements } of cases) {
        const result = renameLegacyPlanTerms(code, input);
        assert.equal(result.text, expected, name);
        assert.equal(result.replacements, replacements, name);
        // The parts reproduce the old text and the new text exactly.
        assert.equal(result.parts.map((part) => part.text).join(''), input, name);
        assert.equal(result.parts.map((part) => part.replacement ?? part.text).join(''), expected, name);
        // Renaming again is a no-op: the result is already current.
        assert.equal(renameLegacyPlanTerms(code, result.text).replacements, 0, name);
    }
});

test('the next version is the highest version for the code across both currencies, plus one', () => {
    const plans = [
        { code: 'pro' as const, version: 1 }, // INR
        { code: 'pro' as const, version: 2 }, // GBP
        { code: 'growth' as const, version: 1 },
        { code: 'growth' as const, version: 4 },
        { code: 'growth' as const, version: 2 },
    ];
    assert.equal(nextPlanVersion(plans, 'pro'), 3);
    assert.equal(nextPlanVersion(plans, 'growth'), 5);
    assert.equal(nextPlanVersion([], 'pro'), 1);
    assert.equal(nextPlanVersion(plans.filter((plan) => plan.code === 'growth'), 'pro'), 1);
});

test('terms versions follow the <year-month>-<market>-<code>-v<N> convention', () => {
    const now = new Date('2026-10-02T09:00:00Z');
    assert.equal(renamedTermsVersion({ code: 'pro', currency: 'INR' }, 3, now), '2026-10-india-pro-v3');
    assert.equal(renamedTermsVersion({ code: 'growth', currency: 'GBP' }, 4, now), '2026-10-uk-growth-v4');
});

const approvedAt = '2026-09-01T10:00:00Z';

const approvedPlans: AdminSubscriptionPlan[] = [
    {
        id: 'pro-inr-v1', code: 'pro', version: 1, amount_minor: 99900, tax_minor: 0, currency: 'INR',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 12, published_property_limit: 8,
        active_case_limit: 10, image_upload_limit_bytes: 52_000_000, support_level: 'standard', featured: false,
        lead_delivery_policy: 'best_effort', tax_inclusive: true, terms_schema_version: 2,
        terms_version: '2026-09-india-pro-v1', terms_text: 'Pro manager subscription: eight published properties. Estospaces Pro renews monthly.',
        terms_digest: 'a'.repeat(64), provider_plan_id: 'plan_ProInr1', approved_at: approvedAt,
    },
    {
        id: 'pro-gbp-v2', code: 'pro', version: 2, amount_minor: 4900, tax_minor: 817, currency: 'GBP',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 24, published_property_limit: 8,
        active_case_limit: 10, image_upload_limit_bytes: 52_000_000, support_level: 'standard', featured: false,
        lead_delivery_policy: 'best_effort', tax_inclusive: true, terms_schema_version: 2,
        terms_version: '2026-09-uk-pro-v2', terms_text: 'Pro manager subscription: £49 a month including VAT.',
        terms_digest: 'b'.repeat(64), provider_plan_id: 'plan_ProGbp2', approved_at: approvedAt,
    },
    {
        id: 'growth-gbp-v1', code: 'growth', version: 1, amount_minor: 9900, tax_minor: 1650, currency: 'GBP',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 12, published_property_limit: 20,
        active_case_limit: 50, image_upload_limit_bytes: 52_000_000, support_level: 'dedicated', featured: true,
        lead_delivery_policy: 'best_effort', tax_inclusive: true, terms_schema_version: 2,
        terms_version: '2026-09-uk-growth-v1', terms_text: 'Growth manager subscription. Estospaces Growth includes dedicated support.',
        terms_digest: 'c'.repeat(64), provider_plan_id: 'plan_GrowthGbp1', approved_at: approvedAt,
    },
    {
        id: 'growth-inr-v2', code: 'growth', version: 2, amount_minor: 249900, tax_minor: 0, currency: 'INR',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 12, published_property_limit: 20,
        active_case_limit: 50, image_upload_limit_bytes: 52_000_000, support_level: 'dedicated', featured: true,
        lead_delivery_policy: 'best_effort', tax_inclusive: true, terms_schema_version: 2,
        terms_version: '2026-09-india-growth-v2', terms_text: 'Estospaces Growth India monthly subscription.',
        terms_digest: 'd'.repeat(64), provider_plan_id: 'plan_GrowthInr2', approved_at: approvedAt,
    },
];

// Every key payment's strict decoder accepts for POST /plans (PlanVersion JSON
// tags that are not "-", plus provider_plan_id), excluding id and mode, which
// the server always overwrites.
const PAYMENT_DRAFT_KEYS = [
    'active_case_limit', 'amount_minor', 'billing_interval', 'billing_period', 'code', 'currency', 'fast_track_discount_bps',
    'featured', 'image_upload_limit_bytes', 'lead_delivery_policy', 'leads_per_property', 'property_upload_bytes',
    'provider_plan_id', 'published_property_limit', 'supplied_leads', 'support_level', 'tax_inclusive', 'tax_minor',
    'terms_schema_version', 'terms_text', 'terms_version', 'total_cycles', 'version',
];

test('a renamed draft copies the approved commercial fields exactly, for INR and GBP', () => {
    const now = new Date('2026-10-02T09:00:00Z');
    const expected: Record<string, { version: number; terms_version: string; terms_text: string }> = {
        'pro-inr-v1': { version: 3, terms_version: '2026-10-india-pro-v3', terms_text: 'Growth manager subscription: eight published properties. Estospaces Growth renews monthly.' },
        'pro-gbp-v2': { version: 3, terms_version: '2026-10-uk-pro-v3', terms_text: 'Growth manager subscription: £49 a month including VAT.' },
        'growth-gbp-v1': { version: 3, terms_version: '2026-10-uk-growth-v3', terms_text: 'Premium manager subscription. Estospaces Premium includes dedicated support.' },
        'growth-inr-v2': { version: 3, terms_version: '2026-10-india-growth-v3', terms_text: 'Estospaces Premium India monthly subscription.' },
    };
    for (const source of approvedPlans) {
        const draft = buildRenamedPlanDraft(source, approvedPlans, now);
        assert.deepEqual(draft, {
            code: source.code,
            currency: source.currency,
            amount_minor: source.amount_minor,
            tax_minor: source.tax_minor,
            tax_inclusive: source.tax_inclusive,
            billing_period: source.billing_period,
            billing_interval: source.billing_interval,
            total_cycles: source.total_cycles,
            published_property_limit: source.published_property_limit,
            active_case_limit: source.active_case_limit,
            image_upload_limit_bytes: source.image_upload_limit_bytes,
            support_level: source.support_level,
            featured: source.featured,
            lead_delivery_policy: source.lead_delivery_policy,
            terms_schema_version: source.terms_schema_version,
            provider_plan_id: source.provider_plan_id,
            property_upload_bytes: 0,
            supplied_leads: 0,
            leads_per_property: false,
            fast_track_discount_bps: 0,
            ...expected[source.id],
        }, source.id);
        assert.deepEqual(Object.keys(draft).sort(), PAYMENT_DRAFT_KEYS, source.id);
        assert.equal(copiedFieldsMatch(source, draft), true, source.id);
        for (const field of COPIED_PLAN_FIELDS) assert.equal(draft[field], source[field], `${source.id}.${field}`);
    }
});

test('the renamed draft is posted unchanged to the payment catalog route', async () => {
    const draft = buildRenamedPlanDraft(approvedPlans[1], approvedPlans, new Date('2026-10-02T09:00:00Z'));
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string; body: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', body: String(init?.body) });
        return new Response(JSON.stringify({ success: true, data: { id: 'draft-3' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    try {
        await createAdminSubscriptionPlan(draft);
    } finally {
        globalThis.fetch = originalFetch;
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].url, /\/api\/v1\/admin\/subscriptions\/plans$/);
    assert.deepEqual(JSON.parse(calls[0].body), draft);
});

test('only approved, unretired versions with legacy names offer the action', () => {
    const [proInr] = approvedPlans;
    assert.equal(getRenamedVersionAction(proInr, approvedPlans).state, 'enabled');
    assert.deepEqual(getRenamedVersionAction({ ...proInr, approved_at: undefined }, approvedPlans), { state: 'hidden' });
    assert.deepEqual(getRenamedVersionAction({ ...proInr, retired_at: '2026-09-20T10:00:00Z' }, approvedPlans), { state: 'hidden' });
    assert.deepEqual(getRenamedVersionAction({ ...proInr, terms_text: 'Growth manager subscription. Estospaces Growth.' }, approvedPlans), { state: 'disabled', reason: TERMS_ALREADY_CURRENT_NOTE });
    assert.deepEqual(getRenamedVersionAction({ ...proInr, provider_plan_id: undefined }, approvedPlans), { state: 'disabled', reason: 'The provider plan ID was not returned' });
    assert.deepEqual(getRenamedVersionAction({ ...proInr, terms_schema_version: 0 }, approvedPlans), { state: 'disabled', reason: 'Only terms schema v2 versions can be copied' });
    // Payment rejects terms over 16,384 UTF-8 bytes; each pro replacement adds 3 bytes.
    const nearLimit = `Pro manager subscription ${'₹'.repeat((16384 - 25) / 3)}`;
    assert.equal(new TextEncoder().encode(nearLimit).length, 16384);
    assert.deepEqual(getRenamedVersionAction({ ...proInr, terms_text: nearLimit }, approvedPlans), { state: 'disabled', reason: 'The renamed terms would exceed 16 KB' });
    // A live renamed draft or approved successor for the same code and currency blocks another copy.
    const renamedText = renameLegacyPlanTerms('pro', proInr.terms_text).text;
    const pendingDraft = { ...proInr, id: 'pro-inr-v3', version: 3, terms_text: renamedText, approved_at: undefined };
    assert.deepEqual(getRenamedVersionAction(proInr, [...approvedPlans, pendingDraft]), { state: 'disabled', reason: 'Renamed version v3 already exists (draft)' });
    assert.deepEqual(getRenamedVersionAction(proInr, [...approvedPlans, { ...pendingDraft, approved_at: approvedAt }]), { state: 'disabled', reason: 'Renamed version v3 already exists (approved)' });
    // A retired copy, or a copy in the other currency, does not.
    assert.equal(getRenamedVersionAction(proInr, [...approvedPlans, { ...pendingDraft, retired_at: approvedAt }]).state, 'enabled');
    assert.equal(getRenamedVersionAction(proInr, [...approvedPlans, { ...pendingDraft, currency: 'GBP' }]).state, 'enabled');
    assert.throws(() => buildRenamedPlanDraft(proInr, [...approvedPlans, pendingDraft], new Date()), /already exists/);
    assert.throws(() => buildRenamedPlanDraft({ ...proInr, approved_at: undefined }, approvedPlans, new Date()));
    assert.throws(() => buildRenamedPlanDraft({ ...proInr, terms_text: 'Estospaces Growth.' }, approvedPlans, new Date()), new RegExp(TERMS_ALREADY_CURRENT_NOTE));
});

test('the other tier\'s legacy name is reported, not replaced', () => {
    assert.equal(otherTierLegacyName('pro', 'Estospaces Pro. Upgrade to Estospaces Growth for more.'), 'Estospaces Growth');
    assert.equal(renameLegacyPlanTerms('pro', 'Estospaces Pro. Upgrade to Estospaces Growth for more.').text, 'Estospaces Growth. Upgrade to Estospaces Growth for more.');
    assert.equal(otherTierLegacyName('growth', 'Growth manager subscription, formerly above Pro manager subscription.'), 'Pro manager subscription');
    assert.equal(otherTierLegacyName('pro', 'Pro manager subscription: eight published properties.'), null);
    assert.equal(otherTierLegacyName('growth', 'Estospaces Growth India monthly subscription.'), null);
});
