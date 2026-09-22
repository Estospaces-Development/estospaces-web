import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ApiRequestError, apiFetch } from './apiUtils';
import { getSubscriptionAccessPresentation, getSubscriptionOffersErrorMessage } from './managerSubscriptionReadiness';

test('account entitlement is shown as the authoritative Free-plan access', () => {
    assert.deepEqual(getSubscriptionAccessPresentation({
        state: 'free_active',
        source: 'free',
        reason: 'free_default',
        published_property_limit: { kind: 'finite', value: 2 },
        active_case_limit: { kind: 'finite', value: 2 },
        support_level: 'basic',
    }), {
        title: 'Free access',
        detail: 'No payment is required. Upgrade only when you need higher limits.',
        publishedProperties: '2',
        activeFastTrackCases: '2',
        support: 'basic',
    });
});

test('paid and pilot access preserve server limits and do not invent missing limits', () => {
    const pilot = getSubscriptionAccessPresentation({
        state: 'pilot_active',
        source: 'pilot',
        reason: 'active_pilot',
        published_property_limit: { kind: 'unlimited' },
        active_case_limit: { kind: 'unlimited' },
        support_level: 'standard',
    });
    const malformed = getSubscriptionAccessPresentation({
        state: 'paid_active',
        source: 'paid',
        reason: 'verified_paid_period',
        published_property_limit: { kind: 'finite' },
        active_case_limit: { kind: 'finite', value: -1 },
        support_level: 'dedicated',
    });

    assert.equal(pilot?.title, 'Pilot access');
    assert.equal(pilot?.publishedProperties, 'Unlimited');
    assert.equal(pilot?.activeFastTrackCases, 'Unlimited');
    assert.equal(malformed?.title, 'Current paid access');
    assert.equal(malformed?.publishedProperties, 'Unavailable');
    assert.equal(malformed?.activeFastTrackCases, 'Unavailable');
});

test('billing-market API errors retain their code and give a safe next step', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({
        code: 'billing_market_unavailable', error: 'private upstream diagnostics',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    try {
        await assert.rejects(apiFetch('https://example.test/offers'), (error: unknown) => {
            assert.ok(error instanceof ApiRequestError);
            assert.equal(error.code, 'billing_market_unavailable');
            assert.match(getSubscriptionOffersErrorMessage(error), /Contact support to check your billing country/);
            assert.match(getSubscriptionOffersErrorMessage(error), /existing subscription/);
            assert.doesNotMatch(getSubscriptionOffersErrorMessage(error), /private upstream/);
            return true;
        });
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('other failures do not incorrectly diagnose billing country or expose raw errors', () => {
    for (const error of [
        new Error('private upstream diagnostics'),
        new ApiRequestError('private', 'private', 503, undefined, undefined, 'billing_market_unavailable'),
        new ApiRequestError('private', 'private', 409, undefined, undefined, 'unknown_code'),
        null,
    ]) {
        const message = getSubscriptionOffersErrorMessage(error);
        assert.match(message, /refresh to retry/);
        assert.doesNotMatch(message, /billing country|private/);
    }
});

test('offer failures keep checkout blocked and existing subscriptions manageable', () => {
    const page = readFileSync(new URL('../pages/manager/subscription/page.tsx', import.meta.url), 'utf8');
    assert.match(page, /getSubscriptionOffersErrorMessage\(offerResult.reason\)/);
    assert.match(page, /getSubscriptionAccessPresentation\(summary\?\.entitlement\)/);
    assert.match(page, /aria-label="Your current access"/);
    assert.match(page, /setOffers\(\[\]\)/);
    assert.match(page, /Boolean\(offersError\)/);
    assert.match(page, /getManagerSubscriptionSummary\(\)/);
    assert.match(page, /Cancel subscription \/ renewal/);
    assert.match(page, /!loading && !error && !offersError && offers.length === 0/);
    assert.match(page, /No paid plans are currently available for your billing country/);
});
