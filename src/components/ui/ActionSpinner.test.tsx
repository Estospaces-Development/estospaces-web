import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ActionSpinner from './ActionSpinner';
import { Button } from './Button';

test('action spinner is compact and never renders the Estospaces logo', () => {
    const markup = renderToStaticMarkup(
        <ActionSpinner size="sm" label="Saving changes" />,
    );

    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-label="Saving changes"/);
    assert.match(markup, /animate-spin/);
    assert.match(markup, /width:16px;height:16px/);
    assert.doesNotMatch(markup, /logo-icon|<img/);
});

test('loading button remains a disabled button with stable progress copy', () => {
    const markup = renderToStaticMarkup(
        <Button isLoading loadingLabel="Saving changes">Save changes</Button>,
    );

    assert.match(markup, /^<button/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, />Saving changes</);
    assert.doesNotMatch(markup, /logo-icon|brand-loading-screen/);
});
