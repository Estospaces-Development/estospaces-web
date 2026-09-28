import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { describeManagerPaidPeriod } from './managerBillingHistory';

const period = {
    mode: 'live' as const,
    invoice_id: 'inv_1',
    payment_id: 'pay_ABC123',
    checkout_id: 'checkout-1',
    amount_minor: 99900,
    currency: 'INR',
    refunded_minor: 0,
    billing_start: '2026-09-01T00:00:00Z',
    billing_end: '2026-10-01T00:00:00Z',
    status: 'paid',
    verified_at: '2026-09-01T00:05:00Z',
};

test('paid periods show the period, amount in major units and reference', () => {
    const view = describeManagerPaidPeriod(period);
    // ICU versions differ on 'Sep' vs 'Sept'.
    assert.match(view.periodLabel, /^1 Sept? 2026 – 1 Oct 2026$/);
    assert.equal(view.amountLabel, '₹999');
    assert.equal(view.statusLabel, 'Paid');
    assert.equal(view.refundLabel, '');
    assert.equal(view.reference, 'pay_ABC123');
    assert.equal(view.isTestMode, false);
});

test('GBP periods, refunds and test mode are labelled', () => {
    assert.equal(describeManagerPaidPeriod({ ...period, currency: 'GBP', amount_minor: 4900 }).amountLabel, '£49');
    const full = describeManagerPaidPeriod({ ...period, refunded_minor: 99900, status: 'refunded' });
    assert.equal(full.statusLabel, 'Refunded');
    assert.equal(full.refundLabel, '');
    assert.equal(describeManagerPaidPeriod({ ...period, refunded_minor: 50000 }).refundLabel, 'Partly refunded: ₹500');
    assert.equal(describeManagerPaidPeriod({ ...period, mode: 'test' }).isTestMode, true);
    assert.equal(describeManagerPaidPeriod({ ...period, refunded_minor: 50000 }).statusLabel, 'Paid');
});

test('the manager subscription page shows billing history from the paid-periods endpoint', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/manager/subscription/page.tsx'), 'utf8');
    assert.ok(page.includes('<ManagerBillingHistory />'));
    const service = readFileSync(resolve(process.cwd(), 'src/services/managerSubscriptionService.ts'), 'utf8');
    assert.ok(service.includes('/api/v1/manager/subscriptions/invoices?limit=${limit}&offset=${offset}'));
});

test('billing periods use the billing market time zone', () => {
    // 00:00 IST on 1 Oct is 18:30 UTC on 30 Sep.
    const india = describeManagerPaidPeriod({ ...period, billing_start: '2026-09-30T18:30:00Z', billing_end: '2026-10-31T18:30:00Z' });
    assert.match(india.periodLabel, /^1 Oct 2026 – 1 Nov 2026$/);
    const uk = describeManagerPaidPeriod({ ...period, currency: 'GBP', billing_start: '2026-09-30T23:30:00Z', billing_end: '2026-10-31T23:30:00Z' });
    assert.match(uk.periodLabel, /^1 Oct 2026 – 31 Oct 2026$/);
});

test('cached server data is dropped when the signed-in account changes', async () => {
    const { shouldClearQueryCache } = await import('../components/providers/QueryCacheAccountBoundary');
    assert.equal(shouldClearQueryCache('manager-a', ''), true);
    assert.equal(shouldClearQueryCache('manager-a', 'manager-b'), true);
    assert.equal(shouldClearQueryCache('', 'manager-a'), false);
    assert.equal(shouldClearQueryCache('manager-a', 'manager-a'), false);
    const providers = readFileSync(resolve(process.cwd(), 'src/components/providers/AppProviders.tsx'), 'utf8');
    assert.match(providers, /<QueryClientProvider client=\{queryClient\}>\s*<QueryCacheAccountBoundary>/);
    const history = readFileSync(resolve(process.cwd(), 'src/components/manager/ManagerBillingHistory.tsx'), 'utf8');
    assert.ok(history.includes("queryKey: ['manager-subscription-paid-periods', user?.id || '']"));
});
