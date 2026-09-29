import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import ManagerBillingMarketReview from './ManagerBillingMarketReview';

const makeResponse = (status: number, data?: unknown) => new Response(JSON.stringify(status === 200
    ? { success: true, data }
    : { success: false, error: 'Billing profile unavailable' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

function installDOM(fetchHandler: typeof fetch) {
    const browserWindow = new Window({ url: 'https://estospaces.test/admin' });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        Event: browserWindow.Event,
        fetch: fetchHandler,
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
            keys.forEach((key) => {
                const descriptor = descriptors.get(key);
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            });
            browserWindow.close();
        },
    };
}

test('admin cannot verify an absent billing profile until country and document attestation are selected', async () => {
    const calls: Array<{ method: string; body?: string }> = [];
    let saved = false;
    const dom = installDOM(async (_input, init) => {
        const method = init?.method ?? 'GET';
        calls.push({ method, body: init?.body?.toString() });
        if (method === 'PUT') {
            saved = true;
            return makeResponse(200, { market: 'IN', verification_status: 'verified', profile_version: 1 });
        }
        return saved ? makeResponse(200, { market: 'IN', verification_status: 'verified', profile_version: 1 }) : makeResponse(404);
    });
    try {
        await act(async () => { dom.root.render(<ManagerBillingMarketReview managerID="manager-1" />); });
        const select = dom.host.querySelector('select') as HTMLSelectElement;
        const checkbox = dom.host.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const button = [...dom.host.querySelectorAll('button')].find((item) => item.textContent?.includes('Verify billing country'))!;
        assert.ok(button.disabled);
        assert.match(dom.host.textContent ?? '', /No billing country review is recorded/);

        await act(async () => {
            select.value = 'IN';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.ok(button.disabled);
        await act(async () => { checkbox.click(); });
        assert.equal(button.disabled, false);

        await act(async () => { button.click(); });
        assert.deepEqual(calls.map(({ method }) => method), ['GET', 'PUT', 'GET']);
        assert.deepEqual(JSON.parse(calls[1].body ?? '{}'), {
            market: 'IN', verification_status: 'verified', verification_source: 'admin_document_review', expected_profile_version: 0,
        });
        assert.match(dom.host.textContent ?? '', /Billing country verified and confirmed from the saved profile/);
    } finally {
        dom.restore();
    }
});

test('version conflicts do not claim success and offer a fresh-read retry', async () => {
    const dom = installDOM(async (_input, init) => init?.method === 'PUT'
        ? makeResponse(409)
        : makeResponse(200, { market: 'GB', verification_status: 'pending', profile_version: 2 }));
    try {
        await act(async () => { dom.root.render(<ManagerBillingMarketReview managerID="manager-1" />); });
        const checkbox = dom.host.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const button = [...dom.host.querySelectorAll('button')].find((item) => item.textContent?.includes('Verify billing country'))!;
        await act(async () => { checkbox.click(); });
        await act(async () => { button.click(); });
        assert.match(dom.host.textContent ?? '', /changed during review/);
        assert.doesNotMatch(dom.host.textContent ?? '', /verified and confirmed from the saved profile/);
        assert.match(dom.host.textContent ?? '', /Retry billing profile/);
    } finally {
        dom.restore();
    }
});
