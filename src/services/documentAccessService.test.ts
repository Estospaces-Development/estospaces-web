import test from 'node:test';
import assert from 'node:assert/strict';

import { openDocumentAccessUrl } from '@/services/documentAccessService';

type FakeWindow = {
    closed: boolean;
    opener: unknown;
    location: { href: string };
    document: {
        write: (html: string) => void;
        close: () => void;
    };
    close: () => void;
};

function createDeferredFetch() {
    let resolveFetch!: (response: Response) => void;
    const promise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
    });

    return { promise, resolveFetch };
}

function installWindowAndFetch(fakeWindow: FakeWindow | null, fetchImpl: typeof fetch) {
    const originalWindow = (globalThis as any).window;
    const originalFetch = globalThis.fetch;
    const openCalls: string[] = [];

    (globalThis as any).window = {
        open: (url: string) => {
            openCalls.push(url);
            return fakeWindow;
        },
    };
    globalThis.fetch = fetchImpl;

    return () => {
        (globalThis as any).window = originalWindow;
        globalThis.fetch = originalFetch;
        return openCalls;
    };
}

test('document view reserves browser tab before signed URL request resolves', async () => {
    const events: string[] = [];
    const deferredFetch = createDeferredFetch();
    const fakeWindow: FakeWindow = {
        closed: false,
        opener: {},
        location: { href: 'about:blank' },
        document: {
            write: () => events.push('write-loading-state'),
            close: () => events.push('close-document'),
        },
        close: () => {
            fakeWindow.closed = true;
            events.push('close-window');
        },
    };
    const restore = installWindowAndFetch(fakeWindow, (() => {
        events.push('fetch-access-url');
        return deferredFetch.promise;
    }) as typeof fetch);

    const resultPromise = openDocumentAccessUrl('document-1');

    const openCalls = restore();
    assert.deepEqual(openCalls, ['about:blank']);
    assert.deepEqual(events, ['write-loading-state', 'close-document', 'fetch-access-url']);
    assert.equal(fakeWindow.location.href, 'about:blank');
    assert.equal(fakeWindow.opener, null);

    deferredFetch.resolveFetch(new Response(JSON.stringify({
        success: true,
        data: {
            access_url: 'https://media.estospaces.test/access/document-1',
            expires_at: '2026-07-06T12:00:00Z',
        },
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    const result = await resultPromise;
    assert.equal(result.error, null);
    assert.equal(fakeWindow.location.href, 'https://media.estospaces.test/access/document-1');
});

test('document view closes the reserved tab when signed URL request fails', async () => {
    const fakeWindow: FakeWindow = {
        closed: false,
        opener: {},
        location: { href: 'about:blank' },
        document: {
            write: () => undefined,
            close: () => undefined,
        },
        close: () => {
            fakeWindow.closed = true;
        },
    };
    const restore = installWindowAndFetch(fakeWindow, (async () => new Response(JSON.stringify({
        success: false,
        error: 'Document media not found',
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch);

    const result = await openDocumentAccessUrl('missing-document');
    const openCalls = restore();

    assert.deepEqual(openCalls, ['about:blank']);
    assert.equal(fakeWindow.closed, true);
    assert.match(result.error || '', /Document media not found|Document access URL|Invalid data/);
});
