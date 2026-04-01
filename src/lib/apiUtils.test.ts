import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AUTH_EXPIRED_EVENT,
    getAuthHeaders,
    handleUnauthorizedResponse,
} from './apiUtils';
import { resetAuthExpiryState } from './authExpiry';

type BrowserEnv = {
    dispatchedEvents: Event[];
    restore: () => void;
};

function installBrowserEnv(initialToken: string | null): BrowserEnv {
    const originalWindow = globalThis.window;
    const originalLocalStorage = globalThis.localStorage;
    const storage = new Map<string, string>();
    const dispatchedEvents: Event[] = [];

    if (initialToken) {
        storage.set('esto_token', initialToken);
        storage.set('esto_user', JSON.stringify({ id: 'user-1' }));
    }

    const localStorageMock = {
        getItem(key: string) {
            return storage.has(key) ? storage.get(key)! : null;
        },
        setItem(key: string, value: string) {
            storage.set(key, value);
        },
        removeItem(key: string) {
            storage.delete(key);
        },
        clear() {
            storage.clear();
        },
    };

    Object.defineProperty(globalThis, 'window', {
        value: {
            dispatchEvent(event: Event) {
                dispatchedEvents.push(event);
                return true;
            },
        },
        configurable: true,
    });

    Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true,
    });

    return {
        dispatchedEvents,
        restore() {
            if (originalWindow === undefined) {
                delete (globalThis as { window?: Window }).window;
            } else {
                Object.defineProperty(globalThis, 'window', {
                    value: originalWindow,
                    configurable: true,
                });
            }

            if (originalLocalStorage === undefined) {
                delete (globalThis as { localStorage?: Storage }).localStorage;
            } else {
                Object.defineProperty(globalThis, 'localStorage', {
                    value: originalLocalStorage,
                    configurable: true,
                });
            }
        },
    };
}

test('getAuthHeaders omits the Authorization header when there is no token', () => {
    const env = installBrowserEnv(null);

    try {
        assert.deepEqual(getAuthHeaders(), {
            'Content-Type': 'application/json',
        });
    } finally {
        env.restore();
    }
});

test('handleUnauthorizedResponse ignores stale 401 responses from a previous session', async () => {
    resetAuthExpiryState();
    const env = installBrowserEnv('token-b');
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = async () => {
        fetchCount += 1;
        return new Response(null, { status: 200 });
    };

    try {
        const state = await handleUnauthorizedResponse(
            'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app/api/v1/applications',
            'token-a',
        );

        assert.equal(state, 'ignored');
        assert.equal(fetchCount, 0);
        assert.equal(localStorage.getItem('esto_token'), 'token-b');
        assert.equal(env.dispatchedEvents.length, 0);
    } finally {
        globalThis.fetch = originalFetch;
        env.restore();
    }
});

test('handleUnauthorizedResponse ignores service 401s while the core auth session is still valid', async () => {
    resetAuthExpiryState();
    const env = installBrowserEnv('token-a');
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; auth: string | null }> = [];

    globalThis.fetch = async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({
            url: String(input),
            auth: headers.get('Authorization'),
        });
        return new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    };

    try {
        const state = await handleUnauthorizedResponse(
            'https://estospaces-messaging-service-dev-zaryfkxmeq-nw.a.run.app/api/v1/conversations',
            'token-a',
        );

        assert.equal(state, 'ignored');
        assert.deepEqual(calls, [{
            url: 'http://localhost:8080/api/v1/auth/me',
            auth: 'Bearer token-a',
        }]);
        assert.equal(localStorage.getItem('esto_token'), 'token-a');
        assert.equal(env.dispatchedEvents.length, 0);
    } finally {
        globalThis.fetch = originalFetch;
        env.restore();
    }
});

test('handleUnauthorizedResponse retries core auth validation before expiring the session', async () => {
    resetAuthExpiryState();
    const env = installBrowserEnv('token-a');
    const originalFetch = globalThis.fetch;
    const statuses: number[] = [];

    globalThis.fetch = async () => {
        const status = statuses.length === 0 ? 401 : 200;
        statuses.push(status);
        return new Response('{}', {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    };

    try {
        const state = await handleUnauthorizedResponse(
            'http://localhost:8080/api/v1/auth/me',
            'token-a',
        );

        assert.equal(state, 'ignored');
        assert.deepEqual(statuses, [401, 200]);
        assert.equal(localStorage.getItem('esto_token'), 'token-a');
        assert.equal(env.dispatchedEvents.length, 0);
    } finally {
        globalThis.fetch = originalFetch;
        env.restore();
    }
});

test('handleUnauthorizedResponse expires the session when core auth also rejects the token', async () => {
    resetAuthExpiryState();
    const env = installBrowserEnv('token-a');
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => new Response('{}', {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });

    try {
        const state = await handleUnauthorizedResponse(
            'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app/api/v1/viewings',
            'token-a',
        );

        assert.equal(state, 'session-expired');
        assert.equal(localStorage.getItem('esto_token'), null);
        assert.equal(localStorage.getItem('esto_user'), null);
        assert.deepEqual(env.dispatchedEvents.map((event) => event.type), [AUTH_EXPIRED_EVENT]);
    } finally {
        globalThis.fetch = originalFetch;
        env.restore();
    }
});
