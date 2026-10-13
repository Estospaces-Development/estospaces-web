import assert from 'node:assert/strict';
import test from 'node:test';

import { clearAuthToken, getAuthToken, getAuthTokenVersion, readStoredAuthToken, releaseTabAuthToken, setAuthToken } from './authToken';

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

const mockStorage = (name: 'sessionStorage' | 'localStorage') => {
    const original = (globalThis as Record<string, unknown>)[name];
    const map = new Map<string, string>();
    Object.defineProperty(globalThis, name, {
        value: {
            getItem: (key: string) => map.get(key) ?? null,
            setItem: (key: string, value: string) => map.set(key, value),
            removeItem: (key: string) => map.delete(key),
        },
        configurable: true,
    });
    return { map, restore: () => Object.defineProperty(globalThis, name, { value: original, configurable: true }) };
};

// Owner decision (12 Oct 2026): nobody is signed out by a new tab, a closed browser or a restart. The browser
// remembers its latest sign-in, and a tab without its own token adopts it.
test('a new tab or a restarted browser stays signed in with the remembered sign-in', () => {
    const session = mockStorage('sessionStorage');
    const local = mockStorage('localStorage');
    try {
        setAuthToken('manager-token');
        assert.equal(local.map.get('esto_remembered_token'), 'manager-token');

        session.map.clear(); // a new tab, or the browser after a restart
        assert.equal(readStoredAuthToken(), 'manager-token');
        assert.equal(session.map.get('esto_session_token'), 'manager-token');
    } finally {
        clearAuthToken();
        session.restore();
        local.restore();
    }
});

// Each tab keeps its own token, so an admin tab and a user tab stay separate, and signing out of one forgets the
// remembered sign-in only when it is that tab's.
test('a tab keeps its own token and sign-out forgets only its own remembered sign-in', () => {
    const session = mockStorage('sessionStorage');
    const local = mockStorage('localStorage');
    try {
        session.map.set('esto_session_token', 'user-token');
        local.map.set('esto_remembered_token', 'admin-token');
        assert.equal(readStoredAuthToken(), 'user-token');

        setAuthToken('user-token');
        local.map.set('esto_remembered_token', 'admin-token'); // an admin signed in from another tab since
        clearAuthToken();
        assert.equal(local.map.get('esto_remembered_token'), 'admin-token');

        setAuthToken('admin-token');
        clearAuthToken();
        assert.equal(local.map.has('esto_remembered_token'), false);
        session.map.clear();
        assert.equal(readStoredAuthToken(), null);
    } finally {
        clearAuthToken();
        session.restore();
        local.restore();
    }
});

// Signing out by clearing the token (setAuthToken(null)) forgets the remembered sign-in, while a tab that only lost
// contact with the server keeps it, so the next load signs back in.
test('setAuthToken(null) forgets the remembered sign-in; an unconfirmed tab keeps it', () => {
    const session = mockStorage('sessionStorage');
    const local = mockStorage('localStorage');
    try {
        setAuthToken('user-token');
        setAuthToken(null);
        assert.equal(local.map.has('esto_remembered_token'), false);

        setAuthToken('user-token');
        clearAuthToken({ keepRemembered: true });
        assert.equal(getAuthToken(), null);
        assert.equal(session.map.has('esto_session_token'), false);
        assert.equal(local.map.get('esto_remembered_token'), 'user-token');
        assert.equal(readStoredAuthToken(), 'user-token');
    } finally {
        clearAuthToken();
        session.restore();
        local.restore();
    }
});

// Sessions signed in before this release are remembered on their next load, without overwriting another tab's
// remembered sign-in.
test('an existing tab sign-in becomes the remembered one only when none is remembered', () => {
    const session = mockStorage('sessionStorage');
    const local = mockStorage('localStorage');
    try {
        session.map.set('esto_session_token', 'old-session');
        assert.equal(readStoredAuthToken(), 'old-session');
        assert.equal(local.map.get('esto_remembered_token'), 'old-session');

        local.map.set('esto_remembered_token', 'admin-token');
        assert.equal(readStoredAuthToken(), 'old-session');
        assert.equal(local.map.get('esto_remembered_token'), 'admin-token');
    } finally {
        clearAuthToken();
        session.restore();
        local.restore();
    }
});

// Owner, 13 Oct 2026: switching account in one tab must not sign the other tabs out.
test('switch account releases only this tab and keeps the shared sign-in for other tabs', () => {
    const session = mockStorage('sessionStorage');
    const local = mockStorage('localStorage');
    try {
        setAuthToken('admin-token');
        assert.equal(local.map.get('esto_remembered_token'), 'admin-token');

        releaseTabAuthToken();
        assert.equal(getAuthToken(), null);
        assert.equal(session.map.has('esto_session_token'), false);
        assert.equal(local.map.get('esto_remembered_token'), 'admin-token', 'other tabs keep the sign-in');
        assert.equal(readStoredAuthToken(), null, 'a reload while switching shows the sign-in form');

        setAuthToken('user-token');
        assert.equal(session.map.has('esto_switching_account'), false);
        assert.equal(local.map.get('esto_remembered_token'), 'user-token');
        session.map.clear();
        assert.equal(readStoredAuthToken(), 'user-token', 'a new tab adopts the latest sign-in again');
    } finally {
        clearAuthToken();
        session.restore();
        local.restore();
    }
});
