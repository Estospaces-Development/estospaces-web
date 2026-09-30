import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ApiRequestError, apiFetch } from './apiUtils';
import { buildBillingCountryVerificationSupportPath, classifyBillingProfileLookup, getSubscriptionAccessPresentation, getSubscriptionOffersErrorMessage, needsBillingCountryReview } from './managerSubscriptionReadiness';

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
            assert.match(getSubscriptionOffersErrorMessage(error, { kind: 'missing' }), /has not been verified for paid plans/);
            assert.match(getSubscriptionOffersErrorMessage(error, { kind: 'missing' }), /existing subscription/);
            assert.doesNotMatch(getSubscriptionOffersErrorMessage(error, { kind: 'missing' }), /private upstream/);
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
        const message = getSubscriptionOffersErrorMessage(error, { kind: 'unavailable' });
        assert.match(message, /refresh to retry/);
        assert.doesNotMatch(message, /billing country|private/);
    }
});

test('billing profile lookup distinguishes an absent profile from a failed read', () => {
    assert.deepEqual(classifyBillingProfileLookup({ status: 'rejected', reason: new ApiRequestError('missing', 'missing', 404) }), { kind: 'missing' });
    assert.deepEqual(classifyBillingProfileLookup({ status: 'rejected', reason: new ApiRequestError('private', 'private', 503) }), { kind: 'unavailable' });
});

test('billing-market failures do not blame country when Core confirms India', () => {
    const error = new ApiRequestError('private', 'private', 409, undefined, undefined, 'billing_market_unavailable');
    const message = getSubscriptionOffersErrorMessage(error, { kind: 'loaded', profile: {
        market: 'IN', verification_status: 'verified', verification_source: 'admin_document_review',
        verified_at: '2026-09-25T00:00:00Z', effective_at: '2026-09-25T00:00:00Z', profile_version: 1,
    } });
    assert.match(message, /verified as India/);
    assert.match(message, /payment availability/);
    assert.doesNotMatch(message, /could not confirm.*billing country|private/i);
});

test('offer failures keep checkout blocked and existing subscriptions manageable', () => {
    const page = readFileSync(new URL('../pages/manager/subscription/page.tsx', import.meta.url), 'utf8');
    assert.match(page, /getSubscriptionOffersErrorMessage\(offerResult.reason, billingLookup\)/);
    assert.match(page, /getMyManagerBillingProfile\(\)/);
    assert.match(page, /getSubscriptionAccessPresentation\(summary\?\.entitlement, summary\?\.trial\)/);
    assert.match(page, /aria-label="Your current access"/);
    assert.match(page, /setOffers\(\[\]\)/);
    assert.match(page, /Boolean\(offersError\)/);
    assert.match(page, /getManagerSubscriptionSummary\(\)/);
    assert.match(page, /Cancel subscription \/ renewal/);
    assert.match(page, /checkoutDisabled=\{busy \|\| discountChecking !== null \|\| Boolean\(error\) \|\| Boolean\(offersError\)/);
    assert.match(page, /plansToShow\.length === 0 && !previewError/);
    assert.match(page, /No approved plans are currently available to compare/);
});

test('trial access is named with the customer-facing plan and keeps its snapshot limits', () => {
    const access = getSubscriptionAccessPresentation({
        state: 'trial_active', source: 'trial', reason: 'trial', ends_at: '2026-11-27T10:00:00Z',
        published_property_limit: { kind: 'finite', value: 8 }, active_case_limit: { kind: 'finite', value: 10 }, support_level: 'standard',
    }, { plan_code: 'pro', plan_name: 'Pro', starts_at: '2026-09-28T10:00:00Z', ends_at: '2026-11-27T10:00:00Z', days_remaining: 60, state: 'active' });
    assert.equal(access?.title, 'Growth plan trial');
    assert.match(access?.detail || '', /nothing is charged automatically/);
    assert.equal(access?.publishedProperties, '8');
    assert.equal(access?.activeFastTrackCases, '10');
});

test('billing country review is requested only when paid plans are blocked by an unverified country (web-app#650)', () => {
    const profile = (verification_status: 'verified' | 'pending' | 'rejected' | 'revoked') => ({ kind: 'loaded' as const, profile: {
        market: 'IN' as const, verification_status, verification_source: 'admin_document_review', effective_at: '2026-09-25T00:00:00Z', profile_version: 1,
    } });
    assert.equal(needsBillingCountryReview(true, { kind: 'missing' }), true);
    assert.equal(needsBillingCountryReview(true, profile('pending')), true);
    assert.equal(needsBillingCountryReview(true, profile('rejected')), true);
    assert.equal(needsBillingCountryReview(true, profile('verified')), false);
    assert.equal(needsBillingCountryReview(true, { kind: 'unavailable' }), false);
    assert.equal(needsBillingCountryReview(false, { kind: 'missing' }), false);
});

test('the billing verification support link carries the category and billing context, not personal data', () => {
    const path = buildBillingCountryVerificationSupportPath({ kind: 'loaded', profile: {
        market: 'GB', verification_status: 'pending', verification_source: 'admin_document_review', effective_at: '2026-09-25T00:00:00Z', profile_version: 2,
    } }, [{ name: 'Government ID', status: 'reupload_required' }]);
    const url = new URL(path, 'https://app.test');
    assert.equal(url.pathname, '/manager/help');
    assert.equal(url.searchParams.get('category'), 'Verification');
    const message = url.searchParams.get('message') || '';
    assert.match(message, /verify my billing country/);
    assert.match(message, /Current billing country: recorded as United Kingdom \(pending\)\./);
    assert.match(message, /- Government ID: needs a new upload/);
    assert.doesNotMatch(path, /@|email|name=/i);
    const empty = new URL(buildBillingCountryVerificationSupportPath({ kind: 'missing' }, []), 'https://app.test');
    assert.match(empty.searchParams.get('message') || '', /No manager verification documents are on file yet/);
});

test('the billing notice no longer sends managers to support with no path', () => {
    const error = new ApiRequestError('private', 'private', 409, undefined, undefined, 'billing_market_unavailable');
    for (const lookup of [{ kind: 'missing' as const }, { kind: 'loaded' as const, profile: {
        market: 'IN' as const, verification_status: 'pending' as const, verification_source: 'x', effective_at: '2026-09-25T00:00:00Z', profile_version: 1,
    } }]) {
        const message = getSubscriptionOffersErrorMessage(error, lookup);
        assert.match(message, /An Estospaces admin verifies it after reviewing your business documents/);
        assert.doesNotMatch(message, /Ask support/);
    }
});
