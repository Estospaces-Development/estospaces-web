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
    assert.match(source, /offers\.length > 0 \? <ManagerRecurringConsent/);
    assert.match(source, /onStart=\{\(offer\) => void start\(offer\)\}/);
    const card = readFileSync(new URL('./ManagerSubscriptionPlanCard.tsx', import.meta.url), 'utf8');
    assert.match(card, /const offer = 'id' in plan \? plan : null/);
    assert.match(card, /Local price and checkout unavailable for this account/);
    assert.match(card, /\{offer \? <>[\s\S]*Continue to secure payment[\s\S]*: <p/);
});

test('unverified billing notice and refresh control retain readable dark-mode text', () => {
    assert.match(source, /onClick=\{\(\) => void load\(\)\} className="[^"]*dark:text-gray-100/);
    // The notice markup itself is covered by ManagerBillingCountryNotice.test.tsx (web-app#651).
    assert.match(source, /offersError \? <ManagerBillingCountryNotice message=\{offersError\} reviewNeeded=\{needsBillingCountryReview\(billingMarketBlocked, billingProfile\)\}/);
    assert.match(source, /const billingLookup = classifyBillingProfileLookup\(result\);\s*setBillingMarketBlocked\(true\);\s*setBillingProfile\(billingLookup\);/);
    assert.match(source, /setBillingProfile\(\{ kind: 'unavailable' \}\);\s*setBillingMarketBlocked\(false\);/);
});

test('check payment status shows immediate progress and cannot be sent twice (web-app#649)', () => {
    assert.match(source, /const checkingStatus = busyPlan === 'status';/);
    assert.match(source, /<button disabled=\{busy\} aria-busy=\{checkingStatus\} type="button" onClick=\{\(\) => void checkStatus\(\)\}/);
    assert.match(source, /\{checkingStatus \? <><ActionSpinner size="sm" aria-hidden \/> Checking with Razorpay…<\/> : 'Check payment status'\}/);
    assert.match(source, /\{checkingStatus \? <p role="status"[^>]*>Checking your payment with Razorpay\./);
    // One action at a time: the lock is taken before any request, and busy disables every action button.
    assert.match(source, /const runAction = async \(name: string, action: \(\) => Promise<void>\) => \{\s*if \(actionLock\.current\) return;\s*actionLock\.current = true;\s*setBusyPlan\(name\);/);
    assert.match(source, /const busy = busyPlan !== null \|\| loading \|\| trialCodeSubmitting;/);
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
