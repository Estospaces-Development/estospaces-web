import assert from 'node:assert/strict';
import test from 'node:test';

import { registerErrorToastHandler } from '@/lib/apiToastBus';
import {
    createTicket,
    getMessages,
    getTicket,
    markAsRead,
    sendMessage,
    updateTicket,
    upsertDirectConversation,
} from '@/services/messagesService';

const buildErrorResponse = (status: number, error: string) => ({
    ok: false,
    status,
    text: async () => JSON.stringify({
        success: false,
        error,
    }),
}) as Response;

test('handled messaging read failures suppress generic api toasts', async () => {
    const originalFetch = globalThis.fetch;
    const emittedToasts: Array<{ message: string; title?: string }> = [];
    const unregisterToastHandler = registerErrorToastHandler((message, options) => {
        emittedToasts.push({
            message,
            title: options?.title,
        });
    });

    globalThis.fetch = (async () => buildErrorResponse(403, 'conversation not found')) as typeof fetch;

    try {
        await assert.rejects(() => getMessages('conversation-404'));
        await assert.rejects(() => markAsRead('conversation-404'));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        globalThis.fetch = originalFetch;
    }
});

test('messaging write actions suppress the generic toast so callers can own the error UI', async () => {
    const originalFetch = globalThis.fetch;
    const emittedToasts: Array<{ message: string; title?: string }> = [];
    const unregisterToastHandler = registerErrorToastHandler((message, options) => {
        emittedToasts.push({
            message,
            title: options?.title,
        });
    });

    globalThis.fetch = (async () => buildErrorResponse(400, 'recipient_id is required')) as typeof fetch;

    try {
        await assert.rejects(() => upsertDirectConversation(''));
        await assert.rejects(() => sendMessage({
            conversationId: 'conversation-1',
            content: 'Hello',
        }));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        globalThis.fetch = originalFetch;
    }
});

test('support ticket endpoints suppress generic api toasts so the support center can render scoped errors', async () => {
    const originalFetch = globalThis.fetch;
    const emittedToasts: Array<{ message: string; title?: string }> = [];
    const unregisterToastHandler = registerErrorToastHandler((message, options) => {
        emittedToasts.push({
            message,
            title: options?.title,
        });
    });

    globalThis.fetch = (async () => buildErrorResponse(400, 'invalid ticket category')) as typeof fetch;

    try {
        await assert.rejects(() => createTicket({
            subject: 'Need help',
            message: 'Support request',
            category: 'Buying Help',
        }));
        await assert.rejects(() => getTicket('ticket-404'));
        await assert.rejects(() => updateTicket('ticket-404', { status: 'open' }));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        globalThis.fetch = originalFetch;
    }
});
