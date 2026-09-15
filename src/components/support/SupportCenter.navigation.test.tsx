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

for (const role of ['user', 'manager', 'admin'] as const) test(`${role}: a late ticket list response cannot undo a newer ticket selection`, { timeout: 10000 }, async () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/help' });
    const globals = {
        window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement, Element: browserWindow.Element, Node: browserWindow.Node,
        localStorage: browserWindow.localStorage, sessionStorage: browserWindow.sessionStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    const originals = { getTickets: supportService.getTickets, getAllTickets: supportService.getAllTickets, getSupportAgents: supportService.getSupportAgents, getTicket: supportService.getTicket, getTranscript: supportService.getTranscript };
    const tickets = ['a', 'b'].map(id => ({
        id, conversation_id: `conversation-${id}`, subject: `Ticket ${id}`, user_id: 'qa-user',
        category: 'general inquiry', requester_role: 'user', priority: 'medium', status: 'open',
        created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z', unread_count: 0,
    })) as SupportTicketSummary[];
    let completeOldRequest!: (value: SupportTicketSummary[]) => void;
    const oldRequest = new Promise<SupportTicketSummary[]>(resolve => { completeOldRequest = resolve; });
    let calls = 0;
    supportService.getTickets = async () => ++calls === 1 ? oldRequest : tickets;
    supportService.getAllTickets = supportService.getTickets;
    supportService.getSupportAgents = async () => [];
    supportService.getTicket = async id => ({
        ...tickets.find(ticket => ticket.id === id)!,
        conversation: { id: `conversation-${id}`, type: 'support', updated_at: '2026-09-15T00:00:00Z', unread_count: 0 },
    });
    supportService.getTranscript = async () => [];
    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    const router = createMemoryRouter([{ path: '*', element: <AuthProvider><ToastProvider><SupportCenter role={role} /></ToastProvider></AuthProvider> }], {
        initialEntries: ['/user/dashboard/help?ticket=a&conversation=conversation-a'],
    });
    try {
        await act(async () => { root.render(<RouterProvider router={router} />); });
        await act(async () => { void router.navigate('/user/dashboard/help?ticket=b&conversation=conversation-b'); });
        await act(async () => { completeOldRequest(tickets); await oldRequest; });
        assert.equal(new URLSearchParams(router.state.location.search).get('ticket'), 'b');
        assert.equal(new URLSearchParams(router.state.location.search).get('conversation'), 'conversation-b');
        assert.ok(Array.from(host.querySelectorAll('h2')).some(heading => heading.textContent === 'Ticket b'));
        assert.ok(!Array.from(host.querySelectorAll('h2')).some(heading => heading.textContent === 'Ticket a'));
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
