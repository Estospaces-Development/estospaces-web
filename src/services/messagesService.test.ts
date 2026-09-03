import assert from 'node:assert/strict';
import test from 'node:test';

import { registerErrorToastHandler } from '@/lib/apiToastBus';
import {
    createTicket,
    getAdminUserDirectConversations,
    getMessages,
    getTicket,
    markAsRead,
    openSupportAttachment,
    sendMessage,
    subscribeToDirectConversationUpserts,
    updateTicket,
    upsertDirectConversation,
} from '@/services/messagesService';

type FakePopup = {
    closed: boolean;
    opener: unknown;
    location: { href: string };
    document: { write: (html: string) => void; close: () => void };
    close: () => void;
};

const installAttachmentBrowser = (popup: FakePopup | null, fetchImpl: typeof fetch) => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalFetch = globalThis.fetch;
    const openCalls: string[] = [];

    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            open: (url: string) => {
                openCalls.push(url);
                return popup;
            },
        },
    });
    globalThis.fetch = fetchImpl;

    return {
        openCalls,
        restore: () => {
            if (originalWindowDescriptor) {
                Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'window');
            }
            globalThis.fetch = originalFetch;
        },
    };
};

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
        await assert.rejects(() => getAdminUserDirectConversations('user-404'));
        await assert.rejects(() => getMessages('conversation-404'));
        await assert.rejects(() => markAsRead('conversation-404'));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        globalThis.fetch = originalFetch;
    }
});

test('successful direct-conversation upserts notify the active messaging context', async () => {
    const originalFetch = globalThis.fetch;
    const conversation = {
        id: 'conversation-new',
        type: 'direct' as const,
        metadata: {},
        created_at: '2026-08-30T10:00:00Z',
        updated_at: '2026-08-30T10:00:00Z',
    };
    const observedConversationIds: string[] = [];
    const observedAuthTokenVersions: number[] = [];
    const unsubscribe = subscribeToDirectConversationUpserts(({ conversation: upsertedConversation, authTokenVersion }) => {
        observedConversationIds.push(upsertedConversation.id);
        observedAuthTokenVersions.push(authTokenVersion);
    });
    globalThis.fetch = (async () => new Response(JSON.stringify({
        success: true,
        data: conversation,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
        const result = await upsertDirectConversation('manager-1');
        assert.equal(result.id, conversation.id);
        assert.deepEqual(observedConversationIds, [conversation.id]);
        assert.equal(Number.isInteger(observedAuthTokenVersions[0]), true);
        unsubscribe();
        await upsertDirectConversation('manager-1');
        assert.deepEqual(observedConversationIds, [conversation.id]);
    } finally {
        unsubscribe();
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

test('support attachment reserves a tab before the signed image URL resolves', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
    });
    const popup: FakePopup = {
        closed: false,
        opener: {},
        location: { href: 'about:blank' },
        document: { write: () => undefined, close: () => undefined },
        close: () => { popup.closed = true; },
    };
    const browser = installAttachmentBrowser(popup, (() => fetchPromise) as typeof fetch);

    try {
        const resultPromise = openSupportAttachment('attachment-1');
        assert.deepEqual(browser.openCalls, ['about:blank']);
        assert.equal(popup.opener, null);
        assert.equal(popup.location.href, 'about:blank');

        resolveFetch(new Response(JSON.stringify({
            success: true,
            data: {
                access_url: 'https://media.estospaces.test/access/attachment-1',
                expires_at: '2026-08-19T12:00:00Z',
            },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

        await resultPromise;
        assert.equal(popup.location.href, 'https://media.estospaces.test/access/attachment-1');
        assert.equal(popup.closed, false);
    } finally {
        browser.restore();
    }
});

test('support attachment closes its reserved tab when signed access fails', async () => {
    const popup: FakePopup = {
        closed: false,
        opener: {},
        location: { href: 'about:blank' },
        document: { write: () => undefined, close: () => undefined },
        close: () => { popup.closed = true; },
    };
    const browser = installAttachmentBrowser(popup, (async () => buildErrorResponse(404, 'attachment media not found')) as typeof fetch);

    try {
        await assert.rejects(() => openSupportAttachment('missing-attachment'), /attachment media not found/i);
        assert.deepEqual(browser.openCalls, ['about:blank']);
        assert.equal(popup.closed, true);
    } finally {
        browser.restore();
    }
});
