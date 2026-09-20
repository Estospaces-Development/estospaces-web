import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { Window as HappyWindow } from 'happy-dom';
import { canResumeSubscription, formatSubscriptionPrice, loadRazorpayScript, openSubscriptionCheckout, type SubscriptionCheckoutOptions } from './managerSubscriptionCheckout';
import type { ManagerSubscriptionSummary, StartCheckoutResponse } from '../services/managerSubscriptionService';

const checkout: StartCheckoutResponse = {
    checkout: { id: 'attempt-1', plan_version_id: 'retired-pro', terms_digest: 'digest', consent_version: 'accepted-v1', provider_subscription_id: 'sub_test', status: 'ready' },
    key_id: 'rzp_test_public',
    terms: { id: 'retired-pro', code: 'pro', amount_minor: 99900, currency: 'INR', billing_period: 'monthly', billing_interval: 1, total_cycles: 120, tax_inclusive: true, terms_version: 'accepted-v1', terms_text: 'Accepted original terms' },
};
const account: ManagerSubscriptionSummary = { mode: 'test', checkout: checkout.checkout, new_paid_actions_available: false };
const response = { razorpay_payment_id: 'pay_test', razorpay_signature: 'test-signature', razorpay_subscription_id: 'sub_test' };
let browser: HappyWindow;
let options: SubscriptionCheckoutOptions;
const descriptors = new Map(['window', 'document'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
beforeEach(() => {
    browser = new HappyWindow({ settings: { enableJavaScriptEvaluation: false } });
    Object.defineProperty(globalThis, 'window', { value: browser, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: browser.document, configurable: true });
    const append = document.head.appendChild.bind(document.head);
    mock.method(document.head, 'appendChild', (node: HTMLScriptElement) => {
        node.type = 'application/json'; // Tests dispatch SDK load/error; never fetch third-party code.
        return append(node);
    });
});
afterEach(async () => {
    mock.restoreAll();
    for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
    }
    await browser.happyDOM.close();
});
const sdk = () => {
    window.Razorpay = class {
        constructor(value: SubscriptionCheckoutOptions) { options = value; }
        open() { /* User completes or dismisses checkout in the test. */ }
    };
};

test('accepted historical tax-exclusive prices preserve the exact provider charge', () => {
    assert.equal(formatSubscriptionPrice({ amount_minor: 4900, tax_minor: 980, currency: 'GBP' }), '£58.80');
    assert.equal(formatSubscriptionPrice({ amount_minor: 99900, tax_minor: 15239, tax_inclusive: true, currency: 'INR' }), '₹999.00');
});

test('only an unpaid created checkout can resume; uncertain or cancelled subscriptions cannot', () => {
    assert.equal(canResumeSubscription(account), true);
    for (const status of ['active', 'authenticated', 'pending', 'halted', 'cancelled', 'completed', 'expired']) {
        assert.equal(canResumeSubscription({ ...account, subscription: { status } }), false, status);
    }
    for (const status of ['creating', 'verified', 'failed', 'reconciliation_required']) {
        assert.equal(canResumeSubscription({ ...account, checkout: { ...checkout.checkout, status } }), false, status);
    }
    assert.equal(canResumeSubscription({ ...account, new_paid_actions_available: true }), false);
    assert.equal(canResumeSubscription({ ...account, cancellation: { status: 'reconciliation_required' } }), false);
});

test('dismissing checkout settles without verification or a second provider subscription', async () => {
    sdk();
    let calls = 0;
    const result = openSubscriptionCheckout(checkout, async () => { calls++; return account; });
    assert.equal(options.subscription_id, 'sub_test');
    options.modal.ondismiss();
    assert.equal(await result, null);
    options.handler(response);
    assert.equal(calls, 0);
});

test('async verification failure is caught by the caller, not an unhandled callback rejection', async () => {
    sdk();
    const result = openSubscriptionCheckout(checkout, async () => { throw new Error('verification pending'); });
    const rejected = assert.rejects(result, /verification pending/);
    options.handler(response);
    await rejected;
});

test('duplicate callback and dismissal cannot race or bypass verification', async () => {
    sdk();
    let complete!: (value: ManagerSubscriptionSummary) => void;
    let count = 0;
    const result = openSubscriptionCheckout(checkout, () => { count++; return new Promise((resolve) => { complete = resolve; }); });
    options.handler(response);
    options.handler(response);
    options.modal.ondismiss();
    assert.equal(count, 1);
    complete({ ...account, new_paid_actions_available: true });
    assert.equal((await result)?.new_paid_actions_available, true);
});

test('authorization-only response does not manufacture paid access', async () => {
    sdk();
    const result = openSubscriptionCheckout(checkout, async () => account);
    options.handler(response);
    assert.equal((await result)?.new_paid_actions_available, false);
});

test('mismatched callback never verifies a different subscription', async () => {
    sdk();
    let calls = 0;
    const result = openSubscriptionCheckout(checkout, async () => { calls++; return account; });
    const rejected = assert.rejects(result, /did not match/);
    options.handler({ ...response, razorpay_subscription_id: 'sub_other' });
    await rejected;
    assert.equal(calls, 0);
});

test('SDK network failure removes the broken script and allows retry', async () => {
    const first = loadRazorpayScript();
    assert.equal(loadRazorpayScript(), first);
    const rejected = assert.rejects(first, /could not load/);
    document.querySelector('script')!.dispatchEvent(new browser.Event('error') as unknown as Event);
    await rejected;
    assert.equal(document.querySelector('script'), null);
    const second = loadRazorpayScript();
    sdk();
    document.querySelector('script')!.dispatchEvent(new browser.Event('load') as unknown as Event);
    await second;
});

test('a stale loaded script without the SDK times out instead of hanging forever', async () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(script);
    await assert.rejects(loadRazorpayScript(10), /could not load/);
    assert.equal(document.querySelector('script'), null);
});
