import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ManagerCountryField from './ManagerCountryField';

const noop = () => {};
const optionValues = (markup: string) => [...markup.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);

test('before verification is approved the manager can change country between India and United Kingdom', () => {
    const markup = renderToStaticMarkup(
        <ManagerCountryField value="India" locked={false} disabled={false} onChange={noop} />,
    );
    assert.match(markup, /<label[^>]*for="manager-country"[^>]*>Country<\/label>/);
    assert.match(markup, /<select[^>]*id="manager-country"/);
    assert.doesNotMatch(markup, /<select[^>]*disabled/);
    assert.deepEqual(optionValues(markup), ['India', 'United Kingdom']);
    assert.doesNotMatch(markup, /Contact support to change your country/);
});

test('an approved manager sees the country read-only with the contact-support hint', () => {
    const markup = renderToStaticMarkup(
        <ManagerCountryField value="United Kingdom" locked disabled={false} onChange={noop} />,
    );
    assert.match(markup, /<select[^>]*disabled/);
    assert.match(markup, /<option value="United Kingdom" selected="">United Kingdom<\/option>/);
    assert.match(markup, /Contact support to change your country/);
    assert.match(markup, /aria-describedby="manager-country-hint"/);
    assert.match(markup, /id="manager-country-hint"/);
});

test('a manager with no country saved yet gets a Select country prompt', () => {
    const markup = renderToStaticMarkup(
        <ManagerCountryField value="" locked={false} disabled={false} onChange={noop} />,
    );
    assert.deepEqual(optionValues(markup), ['', 'India', 'United Kingdom']);
    assert.match(markup, /Select country/);
});

test('the field stays disabled without the locked hint while the verification status is still loading', () => {
    const markup = renderToStaticMarkup(
        <ManagerCountryField value="India" locked={false} disabled onChange={noop} />,
    );
    assert.match(markup, /<select[^>]*disabled/);
    assert.doesNotMatch(markup, /Contact support to change your country/);
});
