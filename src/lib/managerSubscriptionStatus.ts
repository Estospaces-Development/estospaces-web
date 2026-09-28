// Plain-language labels for Razorpay subscription and checkout statuses.
const STATUS_LABELS: Record<string, string> = {
    created: 'Awaiting payment',
    authenticated: 'Payment authorised, first charge pending',
    active: 'Active',
    pending: 'Payment retrying',
    halted: 'Payment failed, update your payment method',
    paused: 'Paused',
    cancelled: 'Cancelled',
    completed: 'Completed',
    expired: 'Expired',
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

// UPI Autopay and eMandate first charges confirm by webhook after checkout closes.
export const shouldKeepPollingPendingPayment = (
    account: { new_paid_actions_available?: boolean } | null | undefined,
    startedAt: number,
    now: number,
) => Boolean(account) && !account?.new_paid_actions_available && now - startedAt < PENDING_PAYMENT_POLL_WINDOW_MS;
