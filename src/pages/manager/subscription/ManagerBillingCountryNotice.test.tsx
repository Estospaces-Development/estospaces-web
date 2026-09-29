import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import type { BillingProfileLookup } from '@/lib/managerSubscriptionReadiness';
import ManagerBillingCountryNotice from './ManagerBillingCountryNotice';

const MESSAGE = 'Your billing country has not been verified for paid plans.';
const documents = [
    { name: 'Company Registration', status: 'approved' },
    { name: 'Tax Certificate', status: 'not_uploaded' },
];

const render = (overrides: Partial<Parameters<typeof ManagerBillingCountryNotice>[0]> = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(ManagerBillingCountryNotice, {
        message: MESSAGE, reviewNeeded: true, billingProfile: { kind: 'missing' } as BillingProfileLookup, documents, managerVerified: true, ...overrides,
    })));

const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replaceAll('&amp;', '&'));

test('an unverified billing country offers a prefilled support request, never a self-verify control (web-app#650)', () => {
    const markup = render();
    assert.match(markup, /Billing country not verified/);
    assert.match(markup, /Request billing country verification/);
    const [supportHref] = hrefs(markup);
    const url = new URL(supportHref, 'https://app.test');
    assert.equal(url.pathname, '/manager/help');
    assert.equal(url.searchParams.get('category'), 'Verification');
    assert.equal(url.searchParams.get('subject'), 'Billing country verification request');
    assert.match(url.searchParams.get('message') || '', /Current billing country: not recorded\./);
    assert.match(url.searchParams.get('message') || '', /- Tax Certificate: not uploaded/);
    // Admin-verified by design: no country picker, form or verify button for the manager.
    assert.doesNotMatch(markup, /<select|<form|<button|Verify billing country/);
});

test('the notice lists the documents the admin reviews with their status', () => {
    const markup = render();
    assert.match(markup, /What the admin reviews/);
    assert.match(markup, /Company Registration <span[^>]*>\(approved\)<\/span>/);
    assert.match(markup, /Tax Certificate <span[^>]*>\(not uploaded\)<\/span>/);
});

test('managers who are not verified yet are linked to manager verification', () => {
    const unverified = render({ managerVerified: false });
    assert.ok(hrefs(unverified).includes('/manager/verification'));
    assert.match(unverified, /Go to manager verification/);
    assert.match(unverified, /manager verification is not approved yet/);
    const verified = render();
    assert.ok(!hrefs(verified).includes('/manager/verification'));
});

test('both notice variants set explicit dark-mode text and surface colours (web-app#651)', () => {
    const review = render();
    assert.match(review, /<section[^>]*class="[^"]*text-amber-950[^"]*dark:bg-gray-900[^"]*dark:text-gray-100/);
    assert.match(review, /<h2[^>]*class="[^"]*dark:text-amber-200/);
    const plain = render({ reviewNeeded: false });
    assert.match(plain, /<p role="status" class="[^"]*bg-white[^"]*text-gray-800[^"]*dark:bg-gray-900 dark:text-gray-100">Your billing country/);
    assert.doesNotMatch(plain, /Request billing country verification/);
});

test('action links keep a 44px touch target and a visible focus ring', () => {
    for (const link of render({ managerVerified: false }).match(/<a [^>]*>/g) || []) {
        assert.match(link, /min-h-11/);
        assert.match(link, /focus-visible:outline-2/);
    }
});
