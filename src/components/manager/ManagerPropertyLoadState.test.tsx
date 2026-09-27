import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';

import ManagerPropertyLoadState from './ManagerPropertyLoadState';

const render = (element: React.ReactElement) => {
    const window = new Window();
    window.document.body.innerHTML = renderToStaticMarkup(element);
    return window;
};

const noop = () => undefined;

test('loading never claims the property is missing', () => {
    const window = render(<ManagerPropertyLoadState kind="loading" onBack={noop} />);
    try {
        const text = window.document.body.textContent || '';
        assert.match(text, /Loading property/);
        assert.doesNotMatch(text, /not found|removed|access/i);
        assert.ok(window.document.querySelector('[role="status"][aria-busy="true"]'));
    } finally {
        window.close();
    }
});

test('not found, forbidden and error states are distinct', () => {
    const cases = [
        { kind: 'not_found' as const, title: 'Property not found', absent: /access|Try again/ },
        { kind: 'forbidden' as const, title: "You don't have access to this property", absent: /not found|Try again/i },
        { kind: 'error' as const, title: "Couldn't load this property", absent: /not found|access/i },
    ];
    for (const { kind, title, absent } of cases) {
        const window = render(
            <ManagerPropertyLoadState kind={kind} errorMessage="Connection failed." onBack={noop} onRetry={noop} />,
        );
        try {
            const root = window.document.querySelector(`[data-manager-property-state="${kind}"]`);
            assert.ok(root, kind);
            assert.equal(root.querySelector('h2')?.textContent, title);
            assert.doesNotMatch(root.textContent || '', absent, kind);
            const buttons = Array.from(root.querySelectorAll('button')).map((button) => button.textContent?.trim());
            assert.ok(buttons.includes('Back to Properties'), kind);
            assert.equal(buttons.includes('Try again'), kind === 'error', kind);
        } finally {
            window.close();
        }
    }
});

test('the error state announces itself and shows the safe message', () => {
    const window = render(
        <ManagerPropertyLoadState kind="error" errorMessage="Check your connection." onBack={noop} onRetry={noop} retrying />,
    );
    try {
        const root = window.document.querySelector('[role="alert"]');
        assert.ok(root);
        assert.match(root.textContent || '', /Check your connection\./);
        const retry = Array.from(root.querySelectorAll('button')).find((button) => /Retrying/.test(button.textContent || ''));
        assert.ok(retry?.hasAttribute('disabled'));
    } finally {
        window.close();
    }
});

test('edit copy is used on the edit route', () => {
    const window = render(<ManagerPropertyLoadState kind="forbidden" purpose="edit" onBack={noop} />);
    try {
        assert.match(window.document.body.textContent || '', /cannot be edited from this account/);
    } finally {
        window.close();
    }
});
