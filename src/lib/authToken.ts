const LEGACY_TOKEN_KEYS = ['esto_token', 'auth_token'] as const;
const SESSION_TOKEN_KEY = 'esto_session_token';
/**
 * The browser's most recent sign-in, kept so a new tab, a closed and reopened browser or a restart stays signed in
 * until sign-out or the token's own expiry (owner decision, 12 Oct 2026). Each tab still works from its own
 * sessionStorage copy, so an admin tab and a user tab stay separate; a tab only adopts this one when it has none.
 */
const REMEMBERED_TOKEN_KEY = 'esto_remembered_token';
/** Set while this tab switches account, so it shows the sign-in form instead of adopting the remembered sign-in. */
const SWITCHING_ACCOUNT_KEY = 'esto_switching_account';

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
        // A sign-in made before the browser remembered sign-ins: remember it now, unless another tab's sign-in
        // already is, so it too survives a restart.
        if (!readStorageValue(globalThis.localStorage, REMEMBERED_TOKEN_KEY)) {
            rememberToken(ownToken);
        }
        return ownToken;
    }
    if (readStorageValue(globalThis.sessionStorage, SWITCHING_ACCOUNT_KEY)) {
        return null;
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
        setSwitchingAccount(false);
    } else {
        forgetRememberedToken(previousToken);
    }
}

function setSwitchingAccount(switching: boolean) {
    try {
        if (switching) {
            globalThis.sessionStorage?.setItem(SWITCHING_ACCOUNT_KEY, '1');
        } else {
            globalThis.sessionStorage?.removeItem(SWITCHING_ACCOUNT_KEY);
        }
    } catch {
        // Without it a reload of the sign-in page adopts the remembered sign-in again.
    }
}

/**
 * Switch account: this tab lets go of its sign-in without revoking it, so every other tab that uses the same
 * sign-in stays signed in (sign-out revokes the token for all of them). The tab then shows the sign-in form, even
 * after a reload, until it signs in.
 */
export function releaseTabAuthToken() {
    authToken = null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(null);
    setSwitchingAccount(true);
}

/** keepRemembered: drop only this tab's copy (the server could not be reached), so the next load retries the
 * browser's remembered sign-in instead of signing the user out for good. */
export function clearAuthToken({ keepRemembered = false }: { keepRemembered?: boolean } = {}) {
    const previousToken = authToken;
    authToken = null;
    authTokenVersion += 1;
    clearBrowserTokenStorage();
    persistSessionToken(null);
    if (!keepRemembered) {
        forgetRememberedToken(previousToken);
    }
}
