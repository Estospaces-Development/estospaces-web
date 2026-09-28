import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describeCheckoutForProvider, formatMinorCurrency } from '@/lib/managerSubscriptionCheckout';
import type { ManagerPlanOffer, StartCheckoutResponse } from '@/services/managerSubscriptionService';
import ManagerDiscountCodeField from './ManagerDiscountCodeField';
import ManagerSubscriptionPlanCard from './ManagerSubscriptionPlanCard';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const noop = () => {};
const field = (overrides: Partial<Parameters<typeof ManagerDiscountCodeField>[0]> = {}) => renderToStaticMarkup(createElement(ManagerDiscountCodeField, {
    planName: 'Growth', initialCode: '', applied: null, error: null, checking: false, disabled: false, onApply: noop, onRemove: noop, ...overrides,
}));

test('the code field is labelled, pre-filled and reports the uniform refusal accessibly', () => {
    const markup = field({ initialCode: 'LAUNCH20', error: "This code can't be used on this plan." });
    assert.match(markup, /<label for="([^"]+)"[^>]*>Have a discount code\?<\/label>/);
    assert.match(markup, /value="LAUNCH20"/);
    assert.match(markup, /aria-invalid="true" aria-describedby="[^"]+-error"/);
    assert.match(markup, /role="alert"[^>]*>This code can(&#x27;|')t be used on this plan\.<\/p>/);
    assert.match(markup, /<button type="submit"[^>]*>[^<]*Apply<\/button>/);
    assert.doesNotMatch(field(), /role="alert"/);
    assert.match(field(), /<button type="submit" disabled=""/);
});

test('an applied code shows both prices, the months and a remove action', () => {
    const markup = field({
        applied: {
            offerId: 'plan-1', code: 'LAUNCH20', preview: {
                code: 'LAUNCH20', plan_version_id: 'plan-1', percent_off: 20, discount_cycles: 3, discounted_amount_minor: 79920,
                full_amount_minor: 99900, currency: 'INR', price_digest: 'a'.repeat(64), valid_until: null,
            },
        },
    });
    assert.match(markup, /role="status"/);
    assert.match(markup, /Code LAUNCH20 applied to Growth/);
    assert.match(markup, /20% off for 3 months: ₹799\.20\/month, then ₹999\/month/);
    assert.match(markup, />Remove code<\/button>/);
    assert.doesNotMatch(markup, /price_digest|a{64}/);
});

test('the plan card places the discount field above the payment button for priced offers only', () => {
    const offer: ManagerPlanOffer = {
        code: 'pro', published_property_limit: 8, active_case_limit: 10, image_upload_limit_bytes: 52_000_000, support_level: 'standard',
        featured: false, lead_delivery_policy: 'best_effort', id: 'plan-1', version: 1, amount_minor: 99900, currency: 'INR',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 12, tax_inclusive: true, terms_version: 'v1', terms_text: 'Terms.', terms_digest: 'digest',
    };
    const markup = renderToStaticMarkup(createElement(ManagerSubscriptionPlanCard, {
        plan: offer, checkoutDisabled: false, busy: false, onStart: noop, discountField: createElement('p', null, 'DISCOUNT-SLOT'),
    }));
    assert.ok(markup.indexOf('DISCOUNT-SLOT') > markup.indexOf('Terms.'));
    assert.ok(markup.indexOf('DISCOUNT-SLOT') < markup.indexOf('Continue to secure payment'));
    const { id: _id, ...preview } = offer;
    void _id;
    const previewMarkup = renderToStaticMarkup(createElement(ManagerSubscriptionPlanCard, {
        plan: preview as never, checkoutDisabled: false, busy: false, onStart: noop, discountField: createElement('p', null, 'DISCOUNT-SLOT'),
    }));
    assert.doesNotMatch(previewMarkup, /DISCOUNT-SLOT/);
});

test('minor-unit formatting trims whole units only when asked and supports GBP', () => {
    assert.equal(formatMinorCurrency(99900, 'INR'), '₹999.00');
    assert.equal(formatMinorCurrency(99900, 'INR', { trimWholeUnits: true }), '₹999');
    assert.equal(formatMinorCurrency(249900, 'INR', { trimWholeUnits: true }), '₹2,499');
    assert.equal(formatMinorCurrency(79920, 'INR', { trimWholeUnits: true }), '₹799.20');
    assert.equal(formatMinorCurrency(4900, 'GBP', { trimWholeUnits: true }), '£49');
    assert.equal(formatMinorCurrency(3920, 'GBP', { trimWholeUnits: true }), '£39.20');
});

test('the Razorpay description names the accepted discount on open and on resume', () => {
    const terms = { code: 'pro' } as StartCheckoutResponse['terms'];
    assert.equal(describeCheckoutForProvider({ terms, price: null }), 'Growth manager subscription');
    assert.equal(describeCheckoutForProvider({ terms }), 'Growth manager subscription');
    assert.equal(describeCheckoutForProvider({
        terms, price: { promotion_code: 'LAUNCH20', percent_off: 20, discount_cycles: 1, discounted_amount_minor: 79920, full_amount_minor: 99900, currency: 'INR', price_digest: 'a'.repeat(64) },
    }), 'Growth manager subscription · 20% off for 1 month');
});

test('the page sends the digest with the code, re-previews once on a stale price and never retries checkout itself', () => {
    assert.match(page, /const discount = planDiscountCheckout\(activeDiscount, offer\.id\);/);
    assert.match(page, /recurring_consent: true,\s*\.\.\.discount\.fields,/);
    assert.match(page, /kind === 'stale' \? await recoverFromStalePreview\(discount, offer, previewManagerSubscriptionDiscount\)/);
    // The stale handler returns to the manager: it contains no second checkout call.
    const handler = page.slice(page.indexOf('const handleDiscountCheckoutRefusal'), page.indexOf('const resume = '));
    assert.ok(handler.length > 0);
    assert.doesNotMatch(handler, /startManagerSubscriptionCheckout|openCheckout/);
    assert.match(handler, /setConsentedText\(null\);/);
    assert.match(handler, /setDiscountNotice\(DISCOUNT_PRICE_CHANGED_MESSAGE\)/);
});

test('consent is bound to the exact text shown, which names the discount when applied', () => {
    assert.match(page, /const recurringConsent = consentedText === consentText;/);
    assert.match(page, /onChange=\{\(event\) => setConsentedText\(event\.target\.checked \? consentText : null\)\}/);
    assert.match(page, /<span>\{consentText\}<\/span>/);
});

test('the active checkout shows the accepted discounted price and the trial note on resume', () => {
    assert.match(page, /acceptedCheckout\.price \? describeDiscountPrice\(acceptedCheckout\.price\) : `\$\{formatPlanPrice\(acceptedCheckout\.terms\)\} \/ month`/);
    assert.match(page, /trialCheckoutNote && summary && canResumeSubscription\(summary\) \? <p role="note"/);
});

test('a failed provider checkout says try again, and every start uses a new idempotency key', () => {
    const start = page.slice(page.indexOf('const start = async'), page.indexOf('const handleDiscountCheckoutRefusal'));
    assert.match(start, /idempotency_key: `web-\$\{crypto\.randomUUID\(\)\}`/);
    assert.match(start, /if \(isFailedCheckoutError\(err\)\) \{[\s\S]*?toast\.error\(CHECKOUT_FAILED_TRY_AGAIN_MESSAGE\);\s*return;/);
    // The failed response is never stored or reopened.
    const failedBranch = start.slice(start.indexOf('isFailedCheckoutError(err)'), start.indexOf('if (discount.kind !== \'discounted\''));
    assert.doesNotMatch(failedBranch, /setAcceptedCheckout|openCheckout|err\.data|checkout\.id/);
});
