import { ApiRequestError } from './apiUtils';

// Plain-language labels for Razorpay subscription statuses and, when no
// subscription exists yet, payment-service checkout statuses.
const STATUS_LABELS: Record<string, string> = {
    created: 'Awaiting payment',
    authenticated: 'Payment authorised, first charge pending',
    active: 'Active',
    pending: 'Payment retrying',
    halted: 'Payment failed after retries',
    paused: 'Paused',
    cancelled: 'Cancelled',
    completed: 'Completed',
    expired: 'Expired',
    creating: 'Starting checkout',
    ready: 'Awaiting payment',
    reconciliation_required: 'Confirming with Razorpay',
    failed: 'Payment failed',
    verified: 'Payment verified',
};

export const formatSubscriptionStatus = (status: string | null | undefined): string => {
    const key = String(status || '').trim().toLowerCase();
    if (!key) {
        return 'Unknown';
    }
    return STATUS_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
};

export const PENDING_PAYMENT_POLL_INTERVAL_MS = 5_000;
export const PENDING_PAYMENT_POLL_WINDOW_MS = 120_000;

// payment-service answers verify with 409 verification_pending while the bank
// has not confirmed the first charge (UPI Autopay, eMandate).
export const isVerificationPendingError = (error: unknown): boolean =>
    error instanceof ApiRequestError && error.status === 409 && error.code === 'verification_pending';

const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'expired', 'halted', 'failed']);

type PollAccount = {
    new_paid_actions_available?: boolean;
    checkout?: { status?: string } | null;
    subscription?: { status?: string } | null;
    cancellation?: { status?: string } | null;
} | null | undefined;

export type PendingPaymentPollOutcome = 'paid' | 'stop' | 'timeout' | 'continue';

// UPI Autopay and eMandate first charges confirm by webhook after checkout closes.
export const evaluatePendingPaymentPoll = (account: PollAccount, startedAt: number, now: number): PendingPaymentPollOutcome => {
    if (!account) {
        return 'stop';
    }
    if (account.new_paid_actions_available) {
        return 'paid';
    }
    const status = String(account.subscription?.status || account.checkout?.status || '').trim().toLowerCase();
    if (!account.checkout || TERMINAL_STATUSES.has(status) || account.cancellation?.status === 'confirmed') {
        return 'stop';
    }
    return now - startedAt < PENDING_PAYMENT_POLL_WINDOW_MS ? 'continue' : 'timeout';
};

/** "12 Nov 2026": day first, as India and the UK read dates (a locale default printed 11/12/2026). */
export const formatPaidThroughDate = (value: string): string => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Why the plan buttons are off while a subscription exists: plan changes are not supported yet (payment service
 * answers plan_change_not_available), so say so instead of showing a disabled button with no reason. */
export const SUBSCRIPTION_PLAN_CHANGE_UNAVAILABLE_REASON = 'You already have a subscription. Changing plans is not available yet; your current plan stays active until its paid period ends.';

/** The "no second checkout" note only makes sense while the subscription is still open. */
export const describeSubscriptionStatusLine = (statusLabel: string, terminal: boolean): string =>
    terminal ? `Status: ${statusLabel}.` : `Status: ${statusLabel}. No second checkout will be created while this subscription is unresolved.`;
