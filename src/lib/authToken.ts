const LEGACY_TOKEN_KEYS = ['esto_token', 'auth_token'] as const;
const SESSION_TOKEN_KEY = 'esto_session_token';

let authToken: string | null = readSessionToken();
let authTokenVersion = 0;

function readSessionToken() {
    try {
        return globalThis.sessionStorage?.getItem(SESSION_TOKEN_KEY)?.trim() || null;
    } catch {
        return null;
    }
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

export function getAuthToken() {
    return authToken;
}

export function getAuthTokenVersion() {
    return authTokenVersion;
}

export function setAuthToken(token: string | null | undefined) {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    authToken = normalizedToken || null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(authToken);
}

export function clearAuthToken() {
    authToken = null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(null);
}
