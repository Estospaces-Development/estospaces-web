import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('a supplemental Core billing lookup does not block Payment summary rendering', () => {
    assert.match(source, /Promise\.allSettled\(\[\s*getManagerSubscriptionOffers\(\), getManagerSubscriptionPlanPreviews\(\), getManagerSubscriptionSummary\(\),\s*\]\)/);
    assert.match(source, /if \(isBillingMarketUnavailable\(offerResult\.reason\)\) \{\s*void Promise\.allSettled\(\[getMyManagerBillingProfile\(\)\]\)/);
});

test('plan benefits remain visible without checkout offers while payment consent stays hidden', () => {
    assert.match(source, /offers\.length > 0 \? offers : planPreviews/);
    assert.match(source, /offers\.length > 0 \? <label/);
    assert.match(source, /onStart=\{\(offer\) => void start\(offer\)\}/);
    const card = readFileSync(new URL('./ManagerSubscriptionPlanCard.tsx', import.meta.url), 'utf8');
    assert.match(card, /const offer = 'id' in plan \? plan : null/);
    assert.match(card, /Local price and checkout unavailable for this account/);
    assert.match(card, /\{offer \? <>[\s\S]*Continue to secure payment[\s\S]*: <p/);
});

test('unverified billing notice and refresh control retain readable dark-mode text', () => {
    assert.match(source, /onClick=\{\(\) => void load\(\)\} className="[^"]*dark:text-gray-100/);
    assert.match(source, /offersError \? <p role="status" className="[^"]*dark:bg-gray-900 dark:text-gray-200/);
});

test('unverified managers can compare plans but cannot start or resume checkout (QA-MB-20260922-01-001)', () => {
    assert.match(source, /const checkoutBlockedByVerification = verificationGate\.kind !== 'allow';/);
    assert.match(source, /if \(checkoutBlockedByVerification\) \{\s*toast\.error\(SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON\);\s*return;\s*\}/);
    assert.match(source, /if \(!activeCheckout \|\| checkoutBlockedByVerification\) return;\s*await loadRazorpayScript\(\);/);
    assert.match(source, /checkoutDisabled=\{busy \|\| [^}]*\|\| !recurringConsent \|\| checkoutBlockedByVerification\}/);
    assert.match(source, /!pendingProof && !checkoutBlockedByVerification \? <button[^\n]*?>Resume secure checkout<\/button>/);
    assert.match(source, /verificationGate\.kind === 'gate' \? <ManagerVerificationBanner/);
    // Servicing an existing subscription stays available: status, verification retry and cancellation.
    assert.doesNotMatch(source, /const checkStatus = \(\) => runAction\('status', async \(\) => \{\s*if \(!activeCheckout \|\| checkoutBlockedByVerification\)/);
    assert.doesNotMatch(source, /const cancel = \(\) => runAction\('cancel', async \(\) => \{\s*if \(!activeCheckout \|\| checkoutBlockedByVerification\)/);
    assert.doesNotMatch(source, /const retryVerification = \(\) => runAction\('verify', async \(\) => \{\s*if \(!pendingProof \|\| checkoutBlockedByVerification\)/);
});

test('checkout waits for a code preview and only opens Razorpay for the exact accepted price', () => {
    const page = source;
    assert.ok(page.includes('checkoutDisabled={busy || discountChecking !== null ||'));
    assert.ok(page.includes("if (discount.kind === 'discounted' && checkout.price?.price_digest !== discount.fields.price_digest) {"));
});
