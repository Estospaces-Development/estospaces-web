const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { mkdir } = require('node:fs/promises');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

const origin = 'http://127.0.0.1:4319';
let server;
let browser;
before(async () => {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4319', '--strictPort'], { stdio: 'pipe' });
    let startup = '';
    server.stdout.on('data', (data) => { startup += data; });
    server.stderr.on('data', (data) => { startup += data; });
    let ready = false;
    for (let i = 0; i < 120; i++) {
        assert.equal(server.exitCode, null, startup);
        try { ready = (await fetch(`${origin}/scripts/fixtures/manager-subscription-review.html`)).ok; } catch { /* Await local server. */ }
        if (ready) break;
        await delay(250);
    }
    assert.ok(ready, startup);
    browser = await chromium.launch({ headless: true });
    await mkdir('output/subscription-review', { recursive: true });
});
after(async () => {
    await browser?.close();
    if (server && server.exitCode === null) {
        const exited = new Promise((resolve) => server.once('exit', resolve));
        server.kill();
        await Promise.race([exited, delay(5000)]);
    }
});

const offer = { id: 'new-plan', code: 'pro', version: 2, amount_minor: 99900, currency: 'INR', billing_period: 'monthly', billing_interval: 1, total_cycles: 120, published_property_limit: 8, active_case_limit: 10, image_upload_limit_bytes: 52000000, support_level: 'standard', featured: false, lead_delivery_policy: 'standard', tax_inclusive: true, terms_version: 'inclusive-v2', terms_text: 'Current plan terms.', terms_digest: 'digest-new' };
const attempt = { id: 'checkout-1', plan_version_id: 'retired-plan', terms_digest: 'digest-old', consent_version: 'accepted-v1', provider_subscription_id: 'sub_test_review', status: 'ready' };
const accepted = { checkout: attempt, terms: { ...offer, id: 'retired-plan', terms_version: 'accepted-v1', terms_text: 'Original accepted terms remain valid.', amount_minor: 89900 }, key_id: 'rzp_test_fixture' };

async function fixture(initial = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = { account: { mode: 'test', checkout: structuredClone(attempt), subscription: { status: 'created' }, cancellation: null, paid_period: null, new_paid_actions_available: false }, accepted: structuredClone(accepted), verifyPending: false, offerUnavailable: false, createCount: 0, verifyCount: 0, cancelled: false, reconcileCount: 0, ...initial };
    await page.addInitScript(() => {
        window.__checkoutOpened = 0;
        window.Razorpay = class {
            constructor(options) { window.__checkoutOptions = options; }
            open() { window.__checkoutOpened++; }
        };
    });
    await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status < 400 ? { success: true, data } : { success: false, error: data, code: 'verification_pending' }) });
        if (path.includes('/api/v1/manager/subscriptions')) {
            if (path.endsWith('/offers')) return state.offerUnavailable ? json('Offers unavailable', 503) : json([offer]);
            if (path.endsWith('/subscriptions/')) return json({ account: state.account, key_id: 'rzp_test_fixture' });
            if (path.endsWith('/checkouts') && route.request().method() === 'POST') {
                state.createCount++;
                const input = route.request().postDataJSON();
                assert.equal(input.consent_version, offer.terms_version);
                assert.equal(input.recurring_consent, true);
                assert.match(input.idempotency_key, /^web-[\da-f-]+$/i);
                state.account.checkout = structuredClone(attempt);
                return json(accepted);
            }
            if (path.endsWith('/verify')) {
                state.verifyCount++;
                if (state.verifyPending) return json('Payment confirmation pending. Please retry verification.', 409);
                state.account.new_paid_actions_available = true;
                state.account.subscription = { status: 'active' };
                state.account.checkout.status = 'verified';
                return json({ payment: {}, account: state.account });
            }
            if (path.endsWith('/cancel')) {
                state.cancelled = true;
                state.account.cancellation = { status: 'confirmed' };
                state.account.subscription = { status: 'cancelled' };
                return json(state.account.cancellation);
            }
            if (path.endsWith('/reconcile')) {
                state.reconcileCount++;
                if (state.cancelled && !state.account.new_paid_actions_available) state.account.checkout = null;
                return json(state.account.subscription ?? { status: 'created' });
            }
            if (path.endsWith('/recover')) {
                state.account.checkout = structuredClone(attempt);
                return json(accepted);
            }
            if (path.endsWith('/checkouts/checkout-1')) return json({ ...state.accepted, checkout: state.account.checkout });
            throw new Error(`Unexpected subscription request: ${path}`);
        }
        if (url.origin === origin) return route.continue();
        // No real backend, payment provider or external asset can be reached.
        return route.abort();
    });
    await page.goto(`${origin}/scripts/fixtures/manager-subscription-review.html`);
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    return { page, state, errors, close: () => context.close() };
}

test('retired-plan checkout resumes after dismissal and refresh without creating another subscription', async () => {
    const f = await fixture();
    try {
        await expect(f.page.getByText('Original accepted terms remain valid.')).toBeVisible();
        await expect(f.page.getByText(/₹899/)).toBeVisible();
        for (let i = 0; i < 2; i++) {
            await f.page.getByRole('button', { name: 'Resume secure checkout' }).click();
            await expect.poll(() => f.page.evaluate(() => window.__checkoutOpened)).toBe(1);
            await expect(f.page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
            await f.page.evaluate(() => window.__checkoutOptions.modal.ondismiss());
            await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toBeEnabled();
            await f.page.reload();
        }
        assert.equal(f.state.createCount, 0);
        assert.deepEqual(f.errors, []);
        await f.page.screenshot({ path: 'output/subscription-review/resumable-checkout.png', fullPage: true });
    } finally { await f.close(); }
});

test('existing legacy checkout remains resumable when offers fail and shows the exact tax-inclusive total', async () => {
    const legacyTerms = { id: 'retired-plan', code: 'pro', amount_minor: 4900, tax_minor: 980, currency: 'GBP', billing_period: 'monthly', billing_interval: 1, total_cycles: 120, terms_version: 'legacy-v1', terms_text: 'Historical terms with separately recorded tax.' };
    const f = await fixture({ offerUnavailable: true, accepted: { ...accepted, terms: legacyTerms } });
    try {
        await expect(f.page.getByText(/£58.80/)).toBeVisible();
        await f.page.getByRole('button', { name: 'Resume secure checkout' }).click();
        await expect.poll(() => f.page.evaluate(() => window.__checkoutOpened)).toBe(1);
        assert.equal(f.state.createCount, 0);
        await f.page.evaluate(() => window.__checkoutOptions.modal.ondismiss());
        await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toBeEnabled();
        assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
});

test('pause-new-checkout flag disables new purchases without hiding existing servicing', async () => {
    const f = await fixture({ account: { mode: 'test', checkout: null, subscription: null, new_paid_actions_available: false, new_checkouts_paused: true } });
    try {
        await f.page.getByRole('checkbox').check();
        await expect(f.page.getByRole('button', { name: 'Continue to secure payment' })).toBeDisabled();
        await expect(f.page.getByText(/New subscriptions are temporarily paused/)).toBeVisible();
        f.state.account.checkout = structuredClone(attempt);
        await f.page.reload();
        await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toBeEnabled();
        await expect(f.page.getByRole('button', { name: 'Cancel subscription \/ renewal', exact: true })).toBeEnabled();
        assert.equal(f.state.createCount, 0);
        assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
});

test('pending verification can retry without re-opening checkout or reporting false success', async () => {
    const f = await fixture({ verifyPending: true });
    try {
        await f.page.getByRole('button', { name: 'Resume secure checkout' }).click();
        await expect.poll(() => f.page.evaluate(() => window.__checkoutOpened)).toBe(1);
        await f.page.evaluate(() => window.__checkoutOptions.handler({ razorpay_payment_id: 'pay_fixture', razorpay_signature: 'fixture-signature', razorpay_subscription_id: 'sub_test_review' }));
        await expect(f.page.getByRole('button', { name: 'Retry payment verification' })).toBeEnabled();
        await expect(f.page.getByText('Your subscription payment is verified.', { exact: true })).toHaveCount(0);
        await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toHaveCount(0);
        f.state.verifyPending = false;
        await f.page.getByRole('button', { name: 'Retry payment verification' }).click();
        await expect(f.page.getByText('Your subscription payment is verified.', { exact: true })).toBeVisible();
        assert.equal(f.state.verifyCount, 2);
        assert.equal(f.state.createCount, 0);
        assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
});

test('cancellation works even if the offer catalogue fails and preserves verified paid-through access', async () => {
    const f = await fixture({ offerUnavailable: true, account: { mode: 'test', checkout: { ...attempt, status: 'verified' }, subscription: { status: 'active' }, cancellation: null, new_paid_actions_available: true, paid_period: { billing_end: '2026-10-19T00:00:00Z' } } });
    try {
        await f.page.setViewportSize({ width: 390, height: 844 });
        await f.page.getByRole('button', { name: 'Cancel subscription / renewal', exact: true }).click();
        assert.equal(f.state.cancelled, false);
        await f.page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
        await expect(f.page.getByText('Cancellation: confirmed. Renewal has stopped.')).toBeVisible();
        assert.equal(f.state.account.new_paid_actions_available, true);
        await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toHaveCount(0);
        await expect(f.page.getByRole('button', { name: 'Cancel subscription / renewal', exact: true })).toHaveCount(0);
        assert.deepEqual(f.errors, []);
        assert.ok(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await f.page.screenshot({ path: 'output/subscription-review/cancelled-mobile.png', fullPage: true });
    } finally { await f.close(); }
});

test('fresh purchase requires consent and holds the action lock until modal dismissal', async () => {
    const f = await fixture({ account: { mode: 'test', checkout: null, subscription: null, new_paid_actions_available: false } });
    try {
        const button = f.page.getByRole('button', { name: 'Continue to secure payment' });
        await expect(button).toBeDisabled();
        await f.page.getByRole('checkbox').check();
        await button.click();
        await expect.poll(() => f.page.evaluate(() => window.__checkoutOpened)).toBe(1);
        await expect(button).toBeDisabled();
        assert.equal(f.state.createCount, 1);
        await f.page.evaluate(() => window.__checkoutOptions.modal.ondismiss());
        await expect(f.page.getByRole('button', { name: 'Resume secure checkout' })).toBeEnabled();
        assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
});
