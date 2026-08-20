import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import { Button } from './Button';

test('loading button uses the global branded overlay instead of a logo inside the control', () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/register' });
    const globals = globalThis as typeof globalThis & Record<string, unknown>;
    const globalKeys = ['window', 'document', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const previousDescriptors = new Map(
        globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
    );
    const browserGlobals: Record<string, unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        HTMLElement: browserWindow.HTMLElement,
        Node: browserWindow.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
    };

    Object.entries(browserGlobals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);

    try {
        act(() => {
            root.render(
                <Button isLoading loadingLabel="Creating your account...">
                    Sign Up
                </Button>,
            );
        });

        const button = host.querySelector('button');
        const globalLoader = browserWindow.document.querySelector('[data-loading-layer="global"]');
        assert.equal(button, null);
        assert.ok(globalLoader);
        assert.equal(globalLoader.parentElement, browserWindow.document.body);
        assert.match(globalLoader.textContent || '', /Creating your account/);
    } finally {
        act(() => {
            root.unmount();
        });
        browserWindow.close();
        previousDescriptors.forEach((descriptor, key) => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globals[key];
        });
    }
});
