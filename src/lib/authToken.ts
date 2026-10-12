const LEGACY_TOKEN_KEYS = ['esto_token', 'auth_token'] as const;
const SESSION_TOKEN_KEY = 'esto_session_token';
/**
 * The browser's most recent sign-in, kept so a new tab, a closed and reopened browser or a restart stays signed in
 * until sign-out or the token's own expiry (owner decision, 12 Oct 2026). Each tab still works from its own
 * sessionStorage copy, so an admin tab and a user tab stay separate; a tab only adopts this one when it has none.
 */
const REMEMBERED_TOKEN_KEY = 'esto_remembered_token';

let authToken: string | null = readStoredAuthToken();
let authTokenVersion = 0;

function readStorageValue(storage: Storage | undefined, key: string) {
    try {
        return storage?.getItem(key)?.trim() || null;
    } catch {
        return null;
    }
}

/** This tab's token, or else the browser's remembered sign-in, which the tab then keeps as its own. */
export function readStoredAuthToken() {
    const ownToken = readStorageValue(globalThis.sessionStorage, SESSION_TOKEN_KEY);
    if (ownToken) {
        return ownToken;
    }
    const remembered = readStorageValue(globalThis.localStorage, REMEMBERED_TOKEN_KEY);
    if (remembered) {
        persistSessionToken(remembered);
    }
    return remembered;
}

function clearBrowserTokenStorage() {
    for (const key of LEGACY_TOKEN_KEYS) {
        globalThis.localStorage?.removeItem(key);
        globalThis.sessionStorage?.removeItem(key);
    }
}

function persistSessionToken(token: string | null) {
    try {
        if (token) {
            globalThis.sessionStorage?.setItem(SESSION_TOKEN_KEY, token);
        } else {
            globalThis.sessionStorage?.removeItem(SESSION_TOKEN_KEY);
        }
    } catch {
        // Session persistence is a convenience; in-memory auth still works when storage is unavailable.
    }
}

function rememberToken(token: string) {
    try {
        globalThis.localStorage?.setItem(REMEMBERED_TOKEN_KEY, token);
    } catch {
        // Without it a new tab simply signs in again.
    }
}

/** Forgets the remembered sign-in only when it is this tab's token, so signing out of one role's tab leaves the
 * sign-in another tab made in the meantime. */
function forgetRememberedToken(token: string | null) {
    if (!token) {
        return;
    }
    try {
        if (globalThis.localStorage?.getItem(REMEMBERED_TOKEN_KEY)?.trim() === token) {
            globalThis.localStorage.removeItem(REMEMBERED_TOKEN_KEY);
        }
    } catch {
        // Nothing to forget when localStorage is unavailable.
    }
}

export function getAuthToken() {
    return authToken;
}

export function getAuthTokenVersion() {
    return authTokenVersion;
}

export function setAuthToken(token: string | null | undefined) {
    const previousToken = authToken;
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    authToken = normalizedToken || null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(authToken);
    if (authToken) {
        rememberToken(authToken);
    } else {
        forgetRememberedToken(previousToken);
    }
}

export function clearAuthToken() {
    const previousToken = authToken;
    authToken = null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(null);
    forgetRememberedToken(previousToken);
}
