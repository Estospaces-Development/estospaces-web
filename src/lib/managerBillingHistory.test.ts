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
    assert.equal(describeManagerPaidPeriod({ ...period, refunded_minor: 99900 }).refundLabel, 'Refunded: ₹999');
    assert.equal(describeManagerPaidPeriod({ ...period, refunded_minor: 50000 }).refundLabel, 'Partly refunded: ₹500');
    assert.equal(describeManagerPaidPeriod({ ...period, mode: 'test' }).isTestMode, true);
    assert.equal(describeManagerPaidPeriod({ ...period, status: 'partially_refunded' }).statusLabel, 'Partially refunded');
});

test('the manager subscription page shows billing history from the paid-periods endpoint', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/manager/subscription/page.tsx'), 'utf8');
    assert.ok(page.includes('<ManagerBillingHistory />'));
    const service = readFileSync(resolve(process.cwd(), 'src/services/managerSubscriptionService.ts'), 'utf8');
    assert.ok(service.includes('/api/v1/manager/subscriptions/invoices?limit=${limit}&offset=${offset}'));
});
