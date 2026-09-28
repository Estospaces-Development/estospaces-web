import { formatLaunchCurrencyForCountry } from './launchLocale';
import type { ManagerPaidPeriod } from '@/services/managerSubscriptionService';

const formatDay = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatMinor = (amountMinor: number, currency: string) =>
    formatLaunchCurrencyForCountry(amountMinor / 100, { currencyCode: currency });

export const describeManagerPaidPeriod = (period: ManagerPaidPeriod) => {
    const start = formatDay(period.billing_start);
    const end = formatDay(period.billing_end);
    const refunded = Math.max(0, period.refunded_minor || 0);
    return {
        periodLabel: start && end ? `${start} – ${end}` : start || end || 'Billing period',
        amountLabel: formatMinor(period.amount_minor, period.currency),
        refundLabel: refunded > 0
            ? `${refunded >= period.amount_minor ? 'Refunded' : 'Partly refunded'}: ${formatMinor(refunded, period.currency)}`
            : '',
        statusLabel: period.status ? period.status.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()) : 'Paid',
        reference: period.payment_id,
        isTestMode: period.mode === 'test',
    };
};
