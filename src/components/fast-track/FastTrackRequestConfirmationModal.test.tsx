import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import FastTrackRequestConfirmationModal from './FastTrackRequestConfirmationModal';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/discover' });
    const keys = [
        'window',
        'document',
        'navigator',
        'HTMLElement',
        'Element',
        'Node',
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

test('explains manager approval before a Fast Track request is submitted', () => {
    const dom = installDOM();
    try {
        act(() => {
            dom.root.render(
                <FastTrackRequestConfirmationModal
                    open
                    propertyTitle="Anna Nagar Home"
                    propertyLocation="Chennai, 600040"
                    onClose={() => undefined}
                    onConfirm={() => undefined}
                />,
            );
        });

        const dialog = dom.browserWindow.document.querySelector('[role="dialog"]');
        assert.ok(dialog);
        assert.match(dialog.textContent || '', /Request 24-Hour Fast Track/);
        assert.match(dialog.textContent || '', /Anna Nagar Home/);
        assert.match(dialog.textContent || '', /Manager approval required/);
        assert.match(dialog.textContent || '', /10-minute response window begins/);
        assert.match(dialog.textContent || '', /24-hour journey starts only after the manager approves/);
        assert.match(dialog.textContent || '', /does not reserve the property/);
        assert.match(dialog.textContent || '', /profile verification remains with the admin team/);
    } finally {
        dom.restore();
    }
});

test('requires an explicit confirmation and blocks repeated submission while sending', () => {
    const dom = installDOM();
    let closeCalls = 0;
    let confirmCalls = 0;
    try {
        act(() => {
            dom.root.render(
                <FastTrackRequestConfirmationModal
                    open
                    propertyTitle="Anna Nagar Home"
                    isSubmitting
                    onClose={() => {
                        closeCalls += 1;
                    }}
                    onConfirm={() => {
                        confirmCalls += 1;
                    }}
                />,
            );
        });

        const buttons = Array.from(dom.browserWindow.document.querySelectorAll('button'));
        const cancel = buttons.find((button) => button.textContent?.includes('Not now'));
        const confirm = buttons.find((button) => button.textContent?.includes('Sending request'));
        assert.ok(cancel);
        assert.ok(confirm);
        assert.equal(cancel.disabled, true);
        assert.equal(confirm.disabled, true);

        act(() => {
            cancel.click();
            confirm.click();
        });
        assert.equal(closeCalls, 0);
        assert.equal(confirmCalls, 0);
    } finally {
        dom.restore();
    }
});

test('supports cancelling or sending from the confirmation state', () => {
    const dom = installDOM();
    let closeCalls = 0;
    let confirmCalls = 0;
    try {
        act(() => {
            dom.root.render(
                <FastTrackRequestConfirmationModal
                    open
                    propertyTitle="Anna Nagar Home"
                    onClose={() => {
                        closeCalls += 1;
                    }}
                    onConfirm={() => {
                        confirmCalls += 1;
                    }}
                />,
            );
        });

        const buttons = Array.from(dom.browserWindow.document.querySelectorAll('button'));
        const cancel = buttons.find((button) => button.textContent?.includes('Not now'));
        const confirm = buttons.find((button) => button.textContent?.includes('Send Fast Track request'));
        assert.ok(cancel);
        assert.ok(confirm);

        act(() => cancel.click());
        act(() => confirm.click());
        assert.equal(closeCalls, 1);
        assert.equal(confirmCalls, 1);
    } finally {
        dom.restore();
    }
});
