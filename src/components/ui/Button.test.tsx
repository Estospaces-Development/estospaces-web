import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Button } from './Button';

test('loading button keeps its control in place and uses a neutral action spinner', () => {
    const markup = renderToStaticMarkup(
        <Button isLoading loadingLabel="Creating your account...">
            Sign Up
        </Button>,
    );

    assert.match(markup, /^<button/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /Creating your account/);
    assert.match(markup, /animate-spin/);
    assert.doesNotMatch(markup, /logo-icon|data-loading-layer|brand-loader/);
});
