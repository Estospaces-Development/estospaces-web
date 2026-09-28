import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
    PENDING_PAYMENT_POLL_WINDOW_MS,
    formatSubscriptionStatus,
    shouldKeepPollingPendingPayment,
} from './managerSubscriptionStatus';

test('Razorpay statuses are shown in plain language', () => {
    assert.equal(formatSubscriptionStatus('authenticated'), 'Payment authorised, first charge pending');
    assert.equal(formatSubscriptionStatus('halted'), 'Payment failed, update your payment method');
    assert.equal(formatSubscriptionStatus('pending'), 'Payment retrying');
    assert.equal(formatSubscriptionStatus('ACTIVE'), 'Active');
    assert.equal(formatSubscriptionStatus('awaiting_provider'), 'Awaiting provider');
    assert.equal(formatSubscriptionStatus(''), 'Unknown');
});

test('a pending first charge is polled until verified or the window ends', () => {
    const startedAt = 1_000_000;
    assert.equal(shouldKeepPollingPendingPayment({ new_paid_actions_available: false }, startedAt, startedAt + 5_000), true);
    assert.equal(shouldKeepPollingPendingPayment({ new_paid_actions_available: true }, startedAt, startedAt + 5_000), false);
    assert.equal(shouldKeepPollingPendingPayment({ new_paid_actions_available: false }, startedAt, startedAt + PENDING_PAYMENT_POLL_WINDOW_MS), false);
    assert.equal(shouldKeepPollingPendingPayment(null, startedAt, startedAt), false);
});

test('the subscription page polls a pending payment and shows friendly statuses', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/manager/subscription/page.tsx'), 'utf8');
    assert.ok(page.includes('Status: {formatSubscriptionStatus(summary?.subscription?.status ?? activeCheckout.status)}'));
    assert.ok(page.includes('window.setInterval(() => {'));
    assert.ok(page.includes('}, PENDING_PAYMENT_POLL_INTERVAL_MS);'));
    assert.ok(page.includes('setPendingPaymentSince(Date.now());'));
});
