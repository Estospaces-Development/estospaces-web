import { formatLaunchCurrencyForCountry } from './launchLocale';
import type { ManagerPaidPeriod } from '@/services/managerSubscriptionService';

// Billing periods are shown in the billing market's time zone, so a period that
// starts at midnight in India is not shown as the previous day elsewhere.
const billingTimeZone = (currency: string) => (currency.toUpperCase() === 'GBP' ? 'Europe/London' : 'Asia/Kolkata');

const formatDay = (value: string, currency: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: billingTimeZone(currency) });
};

const formatMinor = (amountMinor: number, currency: string) =>
    formatLaunchCurrencyForCountry(amountMinor / 100, { currencyCode: currency });

export const describeManagerPaidPeriod = (period: ManagerPaidPeriod) => {
    const start = formatDay(period.billing_start, period.currency);
    const end = formatDay(period.billing_end, period.currency);
    const refunded = Math.max(0, period.refunded_minor || 0);
    // payment-service writes "paid" and flips to "refunded" only on a full refund.
    const fullyRefunded = refunded > 0 && refunded >= period.amount_minor;
    return {
        periodLabel: start && end ? `${start} – ${end}` : start || end || 'Billing period',
        amountLabel: formatMinor(period.amount_minor, period.currency),
        refundLabel: refunded > 0 && !fullyRefunded ? `Partly refunded: ${formatMinor(refunded, period.currency)}` : '',
        statusLabel: fullyRefunded || period.status === 'refunded' ? 'Refunded' : 'Paid',
        reference: period.payment_id,
        isTestMode: period.mode === 'test',
    };
};
