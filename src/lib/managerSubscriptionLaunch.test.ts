import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('manager subscription checkout is authenticated, consented, and verified', () => {
    const service = read('src/services/managerSubscriptionService.ts');
    const page = read('src/pages/manager/subscription/page.tsx');
    const checkout = read('src/lib/managerSubscriptionCheckout.ts');
    const app = read('src/App.tsx');

    assert.match(service, /\/api\/v1\/manager\/subscriptions\/offers/);
    assert.match(service, /\/api\/v1\/manager\/subscriptions\/checkouts/);
    assert.match(service, /recurring_consent: boolean/);
    assert.match(page, /recurring_consent: true/);
    assert.match(page, /consent_version: offer\.terms_version/);
    assert.match(page, /crypto\.randomUUID/);
    assert.match(page, /verifyManagerSubscriptionCheckout/);
    assert.match(checkout, /subscription_id: checkout\.checkout\.provider_subscription_id/);
    assert.match(app, /path="subscription" element=\{<VerifiedManagerRoute><ManagerSubscription \/><\/VerifiedManagerRoute>\}/);
});
