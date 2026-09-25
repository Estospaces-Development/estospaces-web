import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ManagerPlanOffer, ManagerPlanPreview } from '@/services/managerSubscriptionService';
import ManagerSubscriptionPlanCard from './ManagerSubscriptionPlanCard';

const pro: ManagerPlanPreview = {
    code: 'pro', published_property_limit: 8, active_case_limit: 10,
    image_upload_limit_bytes: 52_000_000, support_level: 'standard',
    lead_delivery_policy: 'best_effort', featured: false,
};

const growth: ManagerPlanPreview = {
    ...pro, code: 'growth', published_property_limit: 20, active_case_limit: 50,
    support_level: 'dedicated', featured: true,
};

test('unpriced plan previews explain both approved benefit tiers without payment actions', () => {
    for (const [plan, title, properties, cases, support] of [
        [pro, 'Pro', '8', '10', 'standard'],
        [growth, 'Growth', '20', '50', 'dedicated'],
    ] as const) {
        const markup = renderToStaticMarkup(createElement(ManagerSubscriptionPlanCard, {
            plan, checkoutDisabled: false, busy: false, onStart: () => assert.fail('preview must not start checkout'),
        }));
        assert.match(markup, new RegExp(`<h2[^>]*>${title}</h2>`));
        assert.match(markup, new RegExp(`>${properties}</dd>`));
        assert.match(markup, new RegExp(`>${cases}</dd>`));
        assert.match(markup, new RegExp(`>${support}</dd>`));
        assert.match(markup, /Lead delivery is best-effort and is not guaranteed/);
        assert.match(markup, /Local price and checkout unavailable for this account/);
        assert.doesNotMatch(markup, /Continue to secure payment|₹|£|terms_digest|recurring subscription/);
        assert.doesNotMatch(markup, /<button/);
    }
});

test('only a real priced offer renders its price, accepted terms and checkout action', () => {
    const offer: ManagerPlanOffer = {
        ...pro, id: 'approved-plan', version: 1, amount_minor: 99900, currency: 'INR',
        billing_period: 'monthly', billing_interval: 1, total_cycles: 12,
        tax_inclusive: true, terms_version: 'approved-v1', terms_text: 'Approved monthly terms.',
        terms_digest: 'approved-digest',
    };
    const markup = renderToStaticMarkup(createElement(ManagerSubscriptionPlanCard, {
        plan: offer, checkoutDisabled: false, busy: false, onStart: () => {},
    }));
    assert.match(markup, /₹999\.00/);
    assert.match(markup, /Approved monthly terms/);
    assert.match(markup, /Continue to secure payment/);
    assert.doesNotMatch(markup, /Local price and checkout unavailable/);
});
