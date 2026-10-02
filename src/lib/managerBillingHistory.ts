import { formatLaunchCurrencyForCountry } from './launchLocale';
import { getManagerPlanDisplayName } from './managerPlanNames';
import type { AdminManagerBilling } from '@/services/adminSubscriptionService';
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

const accessLabels: Record<string, string> = {
    free_active: 'Free', paid_active: 'Paid', trial_active: 'Trial', pilot_active: 'Pilot', expired: 'Expired',
};
const marketLabels: Record<string, string> = { IN: 'India (INR)', GB: 'United Kingdom (GBP)' };

const periodBetween = (start: string | undefined, end: string | undefined, currency: string) => {
    const from = start ? formatDay(start, currency) : '';
    const to = end ? formatDay(end, currency) : '';
    return from && to ? `${from} – ${to}` : from || to;
};

// Admin billing lookup: the plan, access, market and current period a manager
// sees on their own subscription page, from the payment-service record.
export const describeAdminManagerBilling = ({ account, terms, invoices }: AdminManagerBilling) => {
    const { entitlement, trial, checkout, subscription, cancellation, paid_period: paid } = account;
    const source = entitlement?.source ?? 'free';
    const market = checkout?.billing_market || (terms?.currency === 'GBP' ? 'GB' : terms?.currency === 'INR' ? 'IN' : '');
    const currency = terms?.currency || invoices[0]?.currency || (market === 'GB' ? 'GBP' : 'INR');
    const planLabel = source === 'paid' ? getManagerPlanDisplayName(terms?.code)
        : source === 'trial' && trial ? `${trial.plan_name || getManagerPlanDisplayName(trial.plan_code)} trial`
            : source === 'pilot' ? 'Pilot' : 'Free';
    const statusParts = [subscription?.status ?? checkout?.status, cancellation ? `cancellation ${cancellation.status.replaceAll('_', ' ')}` : '']
        .filter(Boolean);
    return {
        planLabel,
        accessLabel: accessLabels[entitlement?.state ?? ''] ?? 'Unknown',
        statusLabel: statusParts.length ? statusParts.join(' · ').replaceAll('_', ' ') : 'No subscription',
        marketLabel: marketLabels[market] ?? 'Not set',
        periodLabel: (paid ? periodBetween(paid.billing_start, paid.billing_end, currency)
            : source === 'trial' && trial ? periodBetween(trial.starts_at, trial.ends_at, currency) : '') || 'No current period',
        isTestMode: account.mode === 'test',
        isEmpty: !checkout && !subscription && !trial && invoices.length === 0,
    };
};
