import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Window } from 'happy-dom';

import { SupportCenter } from './SupportCenter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import type { SupportTicketSummary } from '@/services/messagesService';
import { supportService } from '@/services/supportService';

// web-app#458: the 5s background poll was often still in flight, and the guard
// silently dropped the manual Refresh click.
test('manual Refresh runs while a background ticket poll is still in flight', { timeout: 15000 }, async () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/help' });
    const globals = {
        window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement, Element: browserWindow.Element, Node: browserWindow.Node,
        localStorage: browserWindow.localStorage, sessionStorage: browserWindow.sessionStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    const originals = { getTickets: supportService.getTickets, getAllTickets: supportService.getAllTickets, getSupportAgents: supportService.getSupportAgents };
    const tickets = [{
        id: 'a', conversation_id: 'conversation-a', subject: 'Ticket a', user_id: 'qa-user',
        category: 'general inquiry', requester_role: 'user', priority: 'medium', status: 'open',
        created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z', unread_count: 0,
    }] as SupportTicketSummary[];
    let calls = 0;
    // Call 1 (initial load) resolves; call 2 (the background poll) never does.
    supportService.getTickets = async () => (++calls === 1 ? tickets : new Promise<SupportTicketSummary[]>(() => {}));
    supportService.getAllTickets = supportService.getTickets;
    supportService.getSupportAgents = async () => [];
    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    const router = createMemoryRouter([{ path: '*', element: <AuthProvider><ToastProvider><SupportCenter role="user" /></ToastProvider></AuthProvider> }], {
        initialEntries: ['/user/dashboard/help'],
    });
    try {
        await act(async () => { root.render(<RouterProvider router={router} />); });
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 5300)); });
        assert.equal(calls, 2, 'background poll should be in flight');
        const refresh = host.querySelector('button[aria-label="Refresh support tickets"]') as unknown as HTMLButtonElement;
        assert.ok(refresh, 'refresh button rendered');
        await act(async () => { refresh.click(); });
        assert.equal(calls, 3, 'manual refresh must start a new request');
    } finally {
        await act(async () => root.unmount());
        router.dispose();
        Object.assign(supportService, originals);
        browserWindow.close();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
