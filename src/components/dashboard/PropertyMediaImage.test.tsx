import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import PropertyMediaImage from '@/components/dashboard/PropertyMediaImage';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/saved' });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLImageElement', 'Element', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        HTMLImageElement: browserWindow.HTMLImageElement,
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
        host,
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

test('property media renders the requested image while it is available', () => {
    const dom = installDOM();
    try {
        act(() => {
            dom.root.render(<PropertyMediaImage src="https://media.estospaces.test/property.jpg" alt="Prabha Villa" />);
        });

        const image = dom.host.querySelector('img');
        assert.ok(image);
        assert.equal(image.getAttribute('src'), 'https://media.estospaces.test/property.jpg');
        assert.equal(image.getAttribute('alt'), 'Prabha Villa');
    } finally {
        dom.restore();
    }
});

test('property media replaces a failed image with an accessible unavailable state', () => {
    const dom = installDOM();
    try {
        act(() => {
            dom.root.render(<PropertyMediaImage src="https://media.estospaces.test/missing.jpg" alt="Prabha Villa" />);
        });
        const image = dom.host.querySelector('img');
        assert.ok(image);

        act(() => image.dispatchEvent(new dom.browserWindow.Event('error') as unknown as Event));

        assert.equal(dom.host.querySelector('img'), null);
        const fallback = dom.host.querySelector('[role="img"]');
        assert.ok(fallback);
        assert.equal(fallback.getAttribute('aria-label'), 'Prabha Villa media unavailable');
        assert.match(fallback.textContent || '', /Property media unavailable/);
    } finally {
        dom.restore();
    }
});
