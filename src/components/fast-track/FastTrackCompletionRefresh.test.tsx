import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import FastTrackCompletionRefresh from './FastTrackCompletionRefresh';

test('completion refresh keeps inline failure retryable after a reload and announces success', async () => {
    const window = new Window();
    const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
    const host = window.document.createElement('div');
    let root = createRoot(host as unknown as HTMLDivElement);
    let resolveRequest!: (error: string | null) => void;
    let requests = 0;
    const refresh = () => { requests++; return new Promise<string | null>(resolve => { resolveRequest = resolve; }); };
    try {
        await act(async () => root.render(<FastTrackCompletionRefresh onRefresh={refresh} />));
        assert.match(host.textContent, /Your handover stays completed/);
        assert.doesNotMatch(host.textContent, /failed|successfully/i);
        await act(async () => host.querySelector('button')!.click());
        assert.equal(requests, 1);
        assert.equal(host.querySelector('button')!.disabled, true);
        assert.equal(host.querySelector('button')!.getAttribute('aria-busy'), 'true');
        await act(async () => resolveRequest('Correct the property address before retrying.'));
        assert.match(host.querySelector('[role="alert"]')!.textContent, /Correct the property address/);
        assert.equal(host.querySelector('button')!.disabled, false);
        await act(async () => root.unmount());
        root = createRoot(host as unknown as HTMLDivElement);
        await act(async () => root.render(<FastTrackCompletionRefresh onRefresh={refresh} />));
        assert.match(host.querySelector('button')!.textContent, /Refresh completion/);
        await act(async () => host.querySelector('button')!.click());
        await act(async () => resolveRequest(null));
        assert.equal(requests, 2);
        assert.match(host.querySelector('[role="status"]')!.textContent, /Completion refreshed/);
        assert.equal(host.querySelector('[role="alert"]'), null);
    } finally {
        await act(async () => root.unmount());
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
        window.close();
    }
});
