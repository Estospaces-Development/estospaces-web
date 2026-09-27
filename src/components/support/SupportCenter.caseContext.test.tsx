import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Window } from 'happy-dom';

import { SupportCenter } from './SupportCenter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { buildUserHelpPath } from '@/lib/supportCenter';
import type { CreateTicketParams, SupportTicketDetail } from '@/services/messagesService';
import { supportService } from '@/services/supportService';

const CASE_ID = '95979976-d8b3-4b38-aed1-69a06a729c96';
const CASE_PAGE = `/user/dashboard/fast-track?case=${CASE_ID}`;

const ticketFor = (page: string): SupportTicketDetail => ({
    id: 'ticket-case', conversation_id: 'conversation-case', subject: 'Fast Track case 95979976', user_id: 'qa-user',
    category: 'fast track', requester_role: 'user', priority: 'medium', status: 'open',
    created_at: '2026-09-25T00:00:00Z', updated_at: '2026-09-25T00:00:00Z', last_message_at: '2026-09-25T00:00:00Z', unread_count: 0,
    requester_context: { role: 'user', page, module: 'Fast Track' },
    conversation: { id: 'conversation-case', type: 'support', updated_at: '2026-09-25T00:00:00Z', unread_count: 0 },
} as SupportTicketDetail);

const renderSupportCenter = async (
    role: 'user' | 'manager' | 'admin',
    initialEntry: string,
    run: (host: HTMLElement, window: Window) => Promise<void>,
) => {
    const browserWindow = new Window({ url: `https://estospaces.test${initialEntry}` });
    const globals = {
        window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement, Element: browserWindow.Element, Node: browserWindow.Node,
        localStorage: browserWindow.localStorage, sessionStorage: browserWindow.sessionStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    const router = createMemoryRouter([{ path: '*', element: <AuthProvider><ToastProvider><SupportCenter role={role} /></ToastProvider></AuthProvider> }], {
        initialEntries: [initialEntry],
    });
    try {
        await act(async () => { root.render(<RouterProvider router={router} />); });
        await run(host as unknown as HTMLElement, browserWindow);
    } finally {
        await act(async () => root.unmount());
        router.dispose();
        browserWindow.close();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
};

const withSupportService = async (overrides: Partial<typeof supportService>, run: () => Promise<void>) => {
    const originals = { ...supportService };
    Object.assign(supportService, {
        getTickets: async () => [], getAllTickets: async () => [], getSupportAgents: async () => [],
        getTranscript: async () => [],
        ...overrides,
    });
    try {
        await run();
    } finally {
        Object.assign(supportService, originals);
    }
};

test('user Help from a Fast Track case links the new ticket to that case', { timeout: 300000 }, async () => {
    const created: CreateTicketParams[] = [];
    await withSupportService({
        createTicket: async (params: CreateTicketParams) => { created.push(params); return ticketFor(String(params.requester_context?.page)); },
        getTicket: async () => ticketFor(CASE_PAGE),
    }, () => renderSupportCenter('user', buildUserHelpPath('/user/dashboard/fast-track', `?case=${CASE_ID}`), async (host) => {
        const notice = host.querySelector('[data-testid="support-case-context"]');
        assert.ok(notice, 'the composer states which case the ticket is about');
        assert.match(notice.textContent || '', /Fast Track case 95979976/);
        assert.equal(notice.querySelector('a')?.getAttribute('href'), CASE_PAGE, 'the composer links back to the case');
        const subject = host.querySelector('input[aria-label="Support ticket subject"]') as unknown as HTMLInputElement;
        assert.equal(subject.value, 'Fast Track case 95979976');

        const submit = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Create ticket');
        assert.ok(submit, 'the create ticket action is available');
        await act(async () => { (submit as unknown as HTMLButtonElement).click(); });

        assert.equal(created.length, 1);
        assert.equal(created[0].category, 'fast track');
        assert.equal(created[0].requester_context?.page, CASE_PAGE, 'the ticket stores the originating case');
        assert.ok(created[0].message.includes(CASE_ID));
    }));
});

test('ticket detail links back to the originating case for the user and for admins', { timeout: 300000 }, async () => {
    await withSupportService({ getTicket: async () => ticketFor(CASE_PAGE) }, async () => {
        await renderSupportCenter('user', '/user/dashboard/help?ticket=ticket-case&conversation=conversation-case', async (host) => {
            const link = host.querySelector('[data-testid="support-ticket-case-link"]');
            assert.equal(link?.getAttribute('href'), CASE_PAGE);
        });
        await renderSupportCenter('admin', '/admin/support?ticket=ticket-case&conversation=conversation-case', async (host) => {
            const link = host.querySelector('[data-testid="support-ticket-case-link"]');
            assert.equal(link?.getAttribute('href'), `/admin/fast-track?case=${CASE_ID}`);
        });
    });
});

test('Help without a case, or a non-user role, never attaches case context', { timeout: 300000 }, async () => {
    const created: CreateTicketParams[] = [];
    await withSupportService({
        createTicket: async (params: CreateTicketParams) => { created.push(params); return ticketFor('/user/dashboard/help'); },
        getTicket: async () => ticketFor('/user/dashboard/help'),
    }, async () => {
        await renderSupportCenter('user', '/user/dashboard/help', async (host) => {
            assert.equal(host.querySelector('[data-testid="support-case-context"]'), null);
        });
        await renderSupportCenter('manager', `/manager/help?case=${CASE_ID}`, async (host) => {
            assert.equal(host.querySelector('[data-testid="support-case-context"]'), null);
        });
        await renderSupportCenter('user', '/user/dashboard/help?ticket=ticket-case&conversation=conversation-case', async (host) => {
            assert.equal(host.querySelector('[data-testid="support-ticket-case-link"]'), null);
        });
    });
});
