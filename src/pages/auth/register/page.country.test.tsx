import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RegisterCountryField } from './page';

const noop = () => {};

test('seeker sees an optional Country select with only India and United Kingdom plus a blank default', () => {
    const markup = renderToStaticMarkup(
        <RegisterCountryField role="user" value="" error="" onChange={noop} onBlur={noop} />,
    );
    assert.match(markup, /id="register-country"/);
    assert.match(markup, /Country \(optional\)/);
    assert.match(markup, /<option value="" selected="">Prefer not to say<\/option>/);
    assert.deepEqual(
        [...markup.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]),
        ['India', 'United Kingdom'],
    );
});

test('manager still gets a required-feeling Country select with the Select country prompt', () => {
    const markup = renderToStaticMarkup(
        <RegisterCountryField role="manager" value="India" error="" onChange={noop} onBlur={noop} />,
    );
    assert.match(markup, /Select country/);
    assert.doesNotMatch(markup, /Prefer not to say/);
    assert.doesNotMatch(markup, /\(optional\)/);
    assert.match(markup, /<option value="India" selected="">India<\/option>/);
});

test('register submit sends the chosen country for every role and only validates it for managers', () => {
    const source = fs.readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    assert.match(source, /country: country \|\| undefined,/);
    assert.doesNotMatch(source, /country: role === 'manager' \? country : undefined/);
    assert.match(source, /role === 'manager' && !country \? 'Please select your country' : ''/);
});
