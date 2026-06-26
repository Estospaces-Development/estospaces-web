import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AUTH_EXPIRED_EVENT,
    ApiRequestError,
    apiFetch,
    buildApiUrl,
    getAuthHeaders,
    handleUnauthorizedResponse,
    resolveManagerWorkflowErrorPresentation,
} from './apiUtils';
import { clearAuthToken, setAuthToken } from './authToken';
import { registerErrorToastHandler } from './apiToastBus';
import { resetAuthExpiryState } from './authExpiry';

test('buildApiUrl keeps absolute service URLs intact', () => {
    const url = buildApiUrl('https://api.estospaces.dev', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'https://api.estospaces.dev/api/v1/leads/broker');
});

test('buildApiUrl resolves local proxy paths against the current origin fallback', () => {
    const url = buildApiUrl('/__dev_proxy/core', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'http://localhost/__dev_proxy/core/api/v1/leads/broker');
});

test('auth headers use the in-memory bearer token without reading browser token storage', () => {
    const originalLocalStorage = globalThis.localStorage;
    const removedKeys: string[] = [];

    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: () => {
                throw new Error('token storage must not be read');
            },
            setItem: () => {
                throw new Error('token storage must not be written');
            },
            removeItem: (key: string) => {
                removedKeys.push(key);
            },
        },
        configurable: true,
    });

    try {
        setAuthToken('qa-memory-token');

        assert.deepEqual(getAuthHeaders(), {
            Authorization: 'Bearer qa-memory-token',
            'Content-Type': 'application/json',
        });
        assert.ok(removedKeys.includes('esto_token'));
    } finally {
        clearAuthToken();
        Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
        });
    }
});

test('manager workflow errors classify purchase workflow outages from api errors', () => {
    const error = new ApiRequestError(
        'Live purchase workflow unavailable. Please retry the manager action.',
        'Temporary service issue',
        503,
    );

    assert.deepEqual(resolveManagerWorkflowErrorPresentation(error), {
        scope: 'purchase',
        title: 'Live purchase workflow unavailable',
        message: 'Live purchase workflow unavailable. Please retry the manager action.',
    });
});

test('manager workflow errors classify property readiness outages from plain messages', () => {
    assert.deepEqual(
        resolveManagerWorkflowErrorPresentation(
            'Property readiness temporarily unavailable. Please retry the manager action.',
        ),
        {
            scope: 'property_readiness',
            title: 'Property readiness temporarily unavailable',
            message: 'Property readiness temporarily unavailable. Please retry the manager action.',
        },
    );
});

test('manager workflow errors do not classify ordinary validation failures', () => {
    const error = new ApiRequestError(
        'Seller instruction record is required.',
        'Please review your input',
        400,
    );

    assert.equal(resolveManagerWorkflowErrorPresentation(error), null);
});

test('read request outages reject without emitting the global service toast', async () => {
    const originalFetch = globalThis.fetch;
    const emittedToasts: Array<{ message: string; title?: string }> = [];
    const unregisterToastHandler = registerErrorToastHandler((message, options) => {
        emittedToasts.push({
            message,
            title: options?.title,
        });
    });

    Object.defineProperty(globalThis, 'fetch', {
        value: async () => new Response(JSON.stringify({
            success: false,
            error: 'upstream unavailable',
        }), { status: 503 }),
        configurable: true,
    });

    try {
        await assert.rejects(() => apiFetch('https://example.test/api/v1/background-read'));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        Object.defineProperty(globalThis, 'fetch', {
            value: originalFetch,
            configurable: true,
        });
    }
});

test('read request network failures retry before succeeding', async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    Object.defineProperty(globalThis, 'fetch', {
        value: async () => {
            attempts += 1;
            if (attempts < 3) {
                throw new TypeError('Failed to fetch');
            }
            return new Response(JSON.stringify({
                success: true,
                data: { ok: true },
            }), { status: 200 });
        },
        configurable: true,
    });

    try {
        const result = await apiFetch<{ ok: boolean }>('https://example.test/api/v1/background-read');

        assert.deepEqual(result, { ok: true });
        assert.equal(attempts, 3);
    } finally {
        Object.defineProperty(globalThis, 'fetch', {
            value: originalFetch,
            configurable: true,
        });
    }
});

test('write request network failures do not retry', async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    Object.defineProperty(globalThis, 'fetch', {
        value: async () => {
            attempts += 1;
            throw new TypeError('Failed to fetch');
        },
        configurable: true,
    });

    try {
        await assert.rejects(() => apiFetch('https://example.test/api/v1/create', {
            method: 'POST',
            body: JSON.stringify({ name: 'QA write' }),
        }));
        assert.equal(attempts, 1);
    } finally {
        Object.defineProperty(globalThis, 'fetch', {
            value: originalFetch,
            configurable: true,
        });
    }
});

test('read request success false envelopes reject without emitting the global service toast', async () => {
    const originalFetch = globalThis.fetch;
    const emittedToasts: Array<{ message: string; title?: string }> = [];
    const unregisterToastHandler = registerErrorToastHandler((message, options) => {
        emittedToasts.push({
            message,
            title: options?.title,
        });
    });

    Object.defineProperty(globalThis, 'fetch', {
        value: async () => new Response(JSON.stringify({
            success: false,
            error: 'background refresh unavailable',
        }), { status: 200 }),
        configurable: true,
    });

    try {
        await assert.rejects(() => apiFetch('https://example.test/api/v1/background-read'));
        assert.equal(emittedToasts.length, 0);
    } finally {
        unregisterToastHandler();
        Object.defineProperty(globalThis, 'fetch', {
            value: originalFetch,
            configurable: true,
        });
    }
});

test('auth/me 401 clears the stale session without redundant revalidation', async () => {
    const originalWindow = globalThis.window;
    const originalLocalStorage = globalThis.localStorage;
    const originalFetch = globalThis.fetch;
    const originalEvent = globalThis.Event;
    const storage = new Map<string, string>([
        ['esto_token', 'qa-stale-token'],
        ['esto_user', JSON.stringify({ isAuthenticated: true, role: 'user' })],
    ]);
    let expiredEvents = 0;
    let validationFetches = 0;

    const localStorageStub = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    };

    Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageStub,
        configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: { pathname: '/user/dashboard', hostname: 'localhost', origin: 'http://localhost' },
            dispatchEvent: (event: Event) => {
                if (event.type === AUTH_EXPIRED_EVENT) {
                    expiredEvents += 1;
                }
                return true;
            },
        },
        configurable: true,
    });
    Object.defineProperty(globalThis, 'Event', {
        value: class {
            type: string;
            constructor(type: string) {
                this.type = type;
            }
        },
        configurable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
        value: async () => {
            validationFetches += 1;
            return new Response('', { status: 401 });
        },
        configurable: true,
    });

    resetAuthExpiryState();
    setAuthToken('qa-stale-token');

    try {
        const state = await handleUnauthorizedResponse(
            'http://localhost:3001/__dev_proxy/core/api/v1/auth/me',
            'qa-stale-token',
        );

        assert.equal(state, 'session-expired');
        assert.equal(validationFetches, 0);
        assert.equal(storage.has('esto_token'), false);
        assert.equal(storage.has('esto_user'), false);
        assert.equal(expiredEvents, 1);
    } finally {
        resetAuthExpiryState();
        clearAuthToken();
        Object.defineProperty(globalThis, 'window', {
            value: originalWindow,
            configurable: true,
        });
        Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
        });
        Object.defineProperty(globalThis, 'fetch', {
            value: originalFetch,
            configurable: true,
        });
        Object.defineProperty(globalThis, 'Event', {
            value: originalEvent,
            configurable: true,
        });
    }
});
