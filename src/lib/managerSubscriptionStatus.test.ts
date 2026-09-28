import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ApiRequestError } from './apiUtils';
import {
    PENDING_PAYMENT_POLL_WINDOW_MS,
    evaluatePendingPaymentPoll,
    formatSubscriptionStatus,
    isVerificationPendingError,
} from './managerSubscriptionStatus';

test('subscription and checkout statuses are shown in plain language', () => {
    assert.equal(formatSubscriptionStatus('authenticated'), 'Payment authorised, first charge pending');
    assert.equal(formatSubscriptionStatus('halted'), 'Payment failed after retries');
    assert.equal(formatSubscriptionStatus('pending'), 'Payment retrying');
    assert.equal(formatSubscriptionStatus('ACTIVE'), 'Active');
    assert.equal(formatSubscriptionStatus('ready'), 'Awaiting payment');
    assert.equal(formatSubscriptionStatus('reconciliation_required'), 'Confirming with Razorpay');
    assert.equal(formatSubscriptionStatus(''), 'Unknown');
});

test('verify answering 409 verification_pending is recognised as a pending charge', () => {
    assert.equal(isVerificationPendingError(new ApiRequestError('pending', 'pending', 409, undefined, undefined, 'verification_pending')), true);
    assert.equal(isVerificationPendingError(new ApiRequestError('conflict', 'conflict', 409, undefined, undefined, 'checkout_conflict')), false);
    assert.equal(isVerificationPendingError(new Error('verification_pending')), false);
});

test('a pending first charge is polled until verified, stopped or the window ends', () => {
    const startedAt = 1_000_000;
    const pending = { new_paid_actions_available: false, checkout: { status: 'ready' }, subscription: { status: 'authenticated' } };
    assert.equal(evaluatePendingPaymentPoll(pending, startedAt, startedAt + 5_000), 'continue');
    assert.equal(evaluatePendingPaymentPoll({ ...pending, new_paid_actions_available: true }, startedAt, startedAt + 5_000), 'paid');
    assert.equal(evaluatePendingPaymentPoll(pending, startedAt, startedAt + PENDING_PAYMENT_POLL_WINDOW_MS), 'timeout');
    for (const status of ['cancelled', 'halted', 'completed', 'expired']) {
        assert.equal(evaluatePendingPaymentPoll({ ...pending, subscription: { status } }, startedAt, startedAt + 5_000), 'stop', status);
    }
    assert.equal(evaluatePendingPaymentPoll({ ...pending, cancellation: { status: 'confirmed' } }, startedAt, startedAt + 5_000), 'stop');
    assert.equal(evaluatePendingPaymentPoll({ ...pending, checkout: null }, startedAt, startedAt + 5_000), 'stop');
    assert.equal(evaluatePendingPaymentPoll(null, startedAt, startedAt), 'stop');
});

test('the subscription page starts the poll on a pending verify and never overlaps polls', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/manager/subscription/page.tsx'), 'utf8');
    assert.ok(page.includes('if (!isVerificationPendingError(err)) throw err;'));
    assert.ok(page.includes('const { account, pending } = await verifyOrPoll(() => openSubscriptionCheckout('));
    assert.ok(page.includes('await verifyOrPoll(async () => {'));
    assert.ok(page.includes('if (inFlight || actionLock.current) return;'));
    assert.ok(page.includes('Status: {formatSubscriptionStatus(summary?.subscription?.status ?? activeCheckout.status)}'));
    const service = readFileSync(resolve(process.cwd(), 'src/services/managerSubscriptionService.ts'), 'utf8');
    assert.match(service, /\/verify`, \{[\s\S]*?suppressErrorToast: true,/);
});
