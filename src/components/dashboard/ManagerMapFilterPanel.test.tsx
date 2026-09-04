import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import ManagerMapFilterPanel from './ManagerMapFilterPanel';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/manager/dashboard' });
    const keys = [
        'window',
        'document',
        'navigator',
        'HTMLElement',
        'Element',
        'Node',
        'KeyboardEvent',
        'IS_REACT_ACT_ENVIRONMENT',
    ] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        KeyboardEvent: browserWindow.KeyboardEvent,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const browserHost = browserWindow.document.createElement('div');
    browserWindow.document.body.append(browserHost);
    const host = browserHost as unknown as HTMLDivElement;
    const root = createRoot(host);

    return {
        browserWindow,
        root,
        restore: () => {
            act(() => root.unmount());
            for (const key of keys) {
                const descriptor = descriptors.get(key);
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
            browserWindow.close();
        },
    };
};

test('dismisses open map filters when the user taps outside the panel', () => {
    const dom = installDOM();
    let closeCalls = 0;
    try {
        act(() => {
            dom.root.render(
                <ManagerMapFilterPanel open onClose={() => { closeCalls += 1; }}>
                    <p>Property filters</p>
                </ManagerMapFilterPanel>,
            );
        });

        const backdrop = dom.browserWindow.document.querySelector(
            'button[aria-label="Dismiss map filters"]',
        ) as unknown as HTMLButtonElement | null;
        assert.ok(backdrop);

        act(() => backdrop.click());
        assert.equal(closeCalls, 1);
    } finally {
        dom.restore();
    }
});

test('dismisses open map filters with Escape and keeps a visible dialog', () => {
    const dom = installDOM();
    let closeCalls = 0;
    try {
        act(() => {
            dom.root.render(
                <ManagerMapFilterPanel open onClose={() => { closeCalls += 1; }}>
                    <p>Property filters</p>
                </ManagerMapFilterPanel>,
            );
        });

        const dialog = dom.browserWindow.document.querySelector('[role="dialog"]');
        assert.ok(dialog);
        assert.equal(dialog.getAttribute('aria-label'), 'Map filters');

        act(() => {
            dom.browserWindow.dispatchEvent(new dom.browserWindow.KeyboardEvent('keydown', { key: 'Escape' }));
        });
        assert.equal(closeCalls, 1);
    } finally {
        dom.restore();
    }
});
