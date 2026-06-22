const LEGACY_TOKEN_KEYS = ['esto_token', 'auth_token'] as const;

let authToken: string | null = null;

function clearBrowserTokenStorage() {
    for (const key of LEGACY_TOKEN_KEYS) {
        globalThis.localStorage?.removeItem(key);
        globalThis.sessionStorage?.removeItem(key);
    }
}

export function getAuthToken() {
    return authToken;
}

export function setAuthToken(token: string | null | undefined) {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    authToken = normalizedToken || null;
    clearBrowserTokenStorage();
}

export function clearAuthToken() {
    authToken = null;
    clearBrowserTokenStorage();
}
