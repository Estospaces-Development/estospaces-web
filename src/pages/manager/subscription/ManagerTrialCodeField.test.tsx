import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ManagerTrialCodeField from './ManagerTrialCodeField';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const noop = () => {};
const field = (overrides: Partial<Parameters<typeof ManagerTrialCodeField>[0]> = {}) => renderToStaticMarkup(createElement(ManagerTrialCodeField, {
    submitting: false, disabled: false, result: null, onRedeem: noop, ...overrides,
}));

test('the trial-code field is a labelled, length-limited form with a keyboard-submittable Redeem button', () => {
    const markup = field();
    const [, inputId] = markup.match(/<label for="([^"]+)"[^>]*>.*Have a trial code\?<\/label>/) ?? [];
    assert.ok(inputId, 'label is bound to the input');
    assert.match(markup, new RegExp(`<input id="${inputId}"[^>]*maxLength="32"`));
    assert.match(markup, new RegExp(`aria-describedby="${inputId}-result"`));
    assert.match(markup, /^<section aria-label="Trial code"[^>]*><form/);
    assert.match(markup, /<button type="submit" disabled=""[^>]*>[^<]*Redeem<\/button>/, 'empty field cannot submit');
    // The live region exists before any result, so the outcome is announced.
    assert.match(markup, new RegExp(`<p id="${inputId}-result" role="status" aria-live="polite" class="sr-only"></p>`));
});

test('a refusal is announced in the live region and marks the input invalid', () => {
    const markup = field({ result: { kind: 'error', message: "This code can't be used on your account." } });
    assert.match(markup, /aria-invalid="true"/);
    assert.match(markup, /role="status" aria-live="polite"[^>]*>This code can(&#x27;|')t be used on your account\.<\/p>/);
    assert.match(markup, /<form/, 'the manager can try another code');
});

test('while submitting the input is read-only and the button stays disabled', () => {
    const markup = field({ submitting: true });
    assert.match(markup, /readOnly=""/);
    assert.match(markup, /<button type="submit" disabled="" aria-busy="true"/);
});

test('success replaces the form with the confirmation in the same live region', () => {
    const markup = field({ result: { kind: 'success', message: 'Growth plan active until 29 November 2026. No card needed.' } });
    assert.doesNotMatch(markup, /<form|<input/);
    assert.match(markup, /role="status" aria-live="polite"[^>]*>.*Growth plan active until 29 November 2026\. No card needed\.<\/p>/);
});

test('the page gates the trial field on no trial and no paid access, and keeps it mounted to announce success', () => {
    assert.match(page, /\{trialCodeResult\?\.kind === 'success' \|\| canRedeemTrialCode\(summary\) \? <ManagerTrialCodeField/);
    assert.match(page, /onRedeem=\{\(code\) => void redeemTrialCode\(code\)\}/);
});

test('redeeming locks against double submits and refreshes the summary from the server on success', () => {
    const handler = page.slice(page.indexOf('const redeemTrialCode = async'), page.indexOf('const reportVerification'));
    assert.ok(handler.length > 0);
    assert.match(handler, /if \(trialCodeLock\.current\) return;\s*trialCodeLock\.current = true;/);
    assert.match(handler, /getTrialCodeRedeemedMessage\(result\.data\.grant\)/);
    assert.match(handler, /message: result\.error\.message/);
    assert.match(handler, /invalidateAccountQueries\(\);\s*await load\(\);/);
    assert.match(handler, /finally \{\s*trialCodeLock\.current = false;/);
    // Checkout and the other account actions wait while a code is being redeemed.
    assert.match(page, /const busy = busyPlan !== null \|\| loading \|\| trialCodeSubmitting;/);
    // A trial code never starts or opens a payment.
    assert.doesNotMatch(handler, /startManagerSubscriptionCheckout|openCheckout|previewManagerSubscriptionDiscount|Razorpay/);
});

test('the percent-discount field at checkout is unchanged and separate from the trial field', () => {
    assert.match(page, /discountField=\{'id' in plan && !activeCheckout && !summary\?\.new_checkouts_paused \? <ManagerDiscountCodeField/);
    assert.match(page, /onApply=\{\(code\) => void applyDiscount\(plan, code\)\}/);
    assert.match(page, /const preview = await previewManagerSubscriptionDiscount\(code, offer\.id\);/);
    const discountField = readFileSync(new URL('./ManagerDiscountCodeField.tsx', import.meta.url), 'utf8');
    assert.match(discountField, />Have a discount code\?<\/label>/);
    assert.doesNotMatch(discountField, /trial/i);
});
