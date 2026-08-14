import assert from 'node:assert/strict';
import test from 'node:test';

import { clearAuthToken, getAuthToken, getAuthTokenVersion, setAuthToken } from './authToken';

test('auth token persists for the current browser session and clears on sign out', () => {
    const originalSessionStorage = globalThis.sessionStorage;
    const storage = new Map<string, string>();

    Object.defineProperty(globalThis, 'sessionStorage', {
        value: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
        configurable: true,
    });

    try {
        const initialVersion = getAuthTokenVersion();
        setAuthToken(' qa-session-token ');

        assert.equal(getAuthToken(), 'qa-session-token');
        assert.equal(storage.get('esto_session_token'), 'qa-session-token');
        assert.equal(getAuthTokenVersion(), initialVersion + 1);

        clearAuthToken();

        assert.equal(getAuthToken(), null);
        assert.equal(storage.has('esto_session_token'), false);
        assert.equal(getAuthTokenVersion(), initialVersion + 2);
    } finally {
        clearAuthToken();
        Object.defineProperty(globalThis, 'sessionStorage', {
            value: originalSessionStorage,
            configurable: true,
        });
    }
});
