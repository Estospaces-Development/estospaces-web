import {
    buildHostedWorkspaceUrl,
    isLocalhostHost,
    isSingleOriginHostedHost,
    resolveCurrentAppFromHostname,
} from '@/lib/utils/hostUtils';

const AUTH_ROUTE_PATHS = new Set([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
]);

const AUTH_RECOVERY_ROUTE_PATHS = new Set([
    '/forgot-password',
    '/reset-password',
]);

const PROTECTED_ROLE_PREFIXES = [
    { prefix: '/admin', role: 'admin' },
    { prefix: '/manager', role: 'manager' },
    { prefix: '/user', role: 'user' },
] as const;

const PUBLIC_USER_PROPERTY_DETAIL_PREFIX = '/user/properties/';

function resolveLaunchHiddenRouteRedirect(normalizedPath: string): string | null {
    if (normalizedPath === '/manager/billing' || normalizedPath.startsWith('/manager/billing/')) {
        return '/manager/contracts';
    }
    if (normalizedPath === '/user/dashboard/payments' || normalizedPath.startsWith('/user/dashboard/payments/')) {
        return '/user/dashboard/contracts';
    }
    return null;
}

function normalizePathname(pathname: string) {
    const trimmed = pathname.trim();
    if (!trimmed) {
        return '/';
    }

    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

export function isAuthRoutePath(pathname: string): boolean {
    return AUTH_ROUTE_PATHS.has(normalizePathname(pathname));
}

export function isAuthRecoveryRoutePath(pathname: string): boolean {
    return AUTH_RECOVERY_ROUTE_PATHS.has(normalizePathname(pathname));
}

export function isCurrentAuthRoute(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return isAuthRoutePath(window.location.pathname);
}

export function normalizeRole(role?: string): 'admin' | 'manager' | 'user' {
    switch (String(role || '').trim().toLowerCase()) {
        case 'admin':
            return 'admin';
        case 'broker':
        case 'manager':
            return 'manager';
        case 'user':
        default:
            return 'user';
    }
}

export function getRedirectPath(role?: string): string {
    switch (normalizeRole(role)) {
        case 'admin':
            return '/admin/dashboard';
        case 'manager':
            return '/manager/dashboard';
        default:
            return '/user/dashboard';
    }
}

export function getLoginPath(hostname?: string): string {
    return getAuthPath('/login', hostname);
}

export function getAuthPath(pathname: string, hostname?: string): string {
    const normalizedPath = normalizePathname(pathname);
    const resolvedHostname = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');

    if (AUTH_ROUTE_PATHS.has(normalizedPath) && isSingleOriginHostedHost(resolvedHostname)) {
        return `${normalizedPath}/`;
    }

    return normalizedPath;
}

export function requiresHostedLoginRedirect(role?: string, hostname?: string): boolean {
    const resolvedRole = normalizeRole(role);

    if (typeof window === 'undefined' && !hostname) {
        return false;
    }

    const resolvedHostname = hostname || window.location.hostname;
    if (isLocalhostHost(resolvedHostname) || isSingleOriginHostedHost(resolvedHostname)) {
        return false;
    }

    const currentApp = resolveCurrentAppFromHostname(resolvedHostname);
    if (resolvedRole === 'admin') {
        return currentApp !== 'admin';
    }

    return currentApp === 'admin';
}

export function getHostedLoginRedirectUrl(role?: string): string {
    return buildHostedWorkspaceUrl(getLoginPath(), normalizeRole(role));
}

export function isPublicUserPropertyDetailPath(pathname: string): boolean {
    const normalizedPath = normalizePathname(pathname);
    if (!normalizedPath.startsWith(PUBLIC_USER_PROPERTY_DETAIL_PREFIX)) {
        return false;
    }

    const propertyId = normalizedPath.slice(PUBLIC_USER_PROPERTY_DETAIL_PREFIX.length);
    return propertyId.length > 0 && !propertyId.includes('/');
}

export function isProtectedRoutePath(pathname: string): boolean {
    const normalizedPath = normalizePathname(pathname);
    if (isPublicUserPropertyDetailPath(normalizedPath)) {
        return false;
    }

    return PROTECTED_ROLE_PREFIXES.some(({ prefix }) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));
}

export function shouldAwaitSessionResolution(loading: boolean, isAuthenticated: boolean): boolean {
    return loading && !isAuthenticated;
}

export interface AuthRedirectLocationLike {
    pathname?: string | null;
    search?: string | null;
    hash?: string | null;
}

const RETURN_PATH_BASE_ORIGIN = 'https://return-path.invalid';
const PUBLIC_SEARCH_RETURN_PATH = '/search';
export const MAX_RETURN_PATH_LENGTH = 2048;
const PENDING_ACTION_NONCE_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

// A path that begins with "//" or "/\" is protocol-relative once handed to the
// browser, so it must never leave the sanitizer, before or after normalisation.
const isProtocolRelativePath = (value: string) => (
    value.length >= 2 && value[0] === '/' && (value[1] === '/' || value[1] === '\\')
);

const hasForbiddenReturnPathCharacter = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || code === 0x7f || value[index] === '\\') {
            return true;
        }
    }
    return false;
};

/**
 * Accepts only a same-origin, relative application path ("/path?query#hash").
 * Absolute URLs, protocol-relative URLs ("//host"), backslash tricks, control
 * characters and auth routes are rejected so a return target can never become
 * an open redirect or a login loop.
 */
export function sanitizeInternalReturnPath(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const candidate = value.trim();
    if (
        candidate.length > MAX_RETURN_PATH_LENGTH
        || !candidate.startsWith('/')
        || isProtocolRelativePath(candidate)
        || hasForbiddenReturnPathCharacter(candidate)
    ) {
        return null;
    }

    let parsed: URL;
    try {
        parsed = new URL(candidate, RETURN_PATH_BASE_ORIGIN);
    } catch {
        return null;
    }

    // Dot segments ("/.//x", "/%2e%2e//x", "/search/..//x") collapse during
    // parsing, so the protocol-relative check is repeated on the normalised form.
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (
        parsed.origin !== RETURN_PATH_BASE_ORIGIN
        || isProtocolRelativePath(parsed.pathname)
        || isProtocolRelativePath(normalized)
        || normalized.length > MAX_RETURN_PATH_LENGTH
        || isAuthRoutePath(parsed.pathname)
    ) {
        return null;
    }

    return normalized;
}

function toSanitizedReturnLocation(value: unknown): AuthRedirectLocationLike | null {
    let rawPath: unknown = value;
    if (value && typeof value === 'object') {
        const location = value as AuthRedirectLocationLike;
        rawPath = `${location.pathname || ''}${location.search || ''}${location.hash || ''}`;
    }

    const sanitized = sanitizeInternalReturnPath(rawPath);
    if (!sanitized) {
        return null;
    }

    const parsed = new URL(sanitized, RETURN_PATH_BASE_ORIGIN);
    return { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash };
}

/**
 * Public pages a signed-in seeker may resume after a guest action handoff.
 */
export function isPublicSeekerReturnPath(pathname: string): boolean {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === PUBLIC_SEARCH_RETURN_PATH || isPublicUserPropertyDetailPath(normalizedPath);
}

/**
 * Resolves the requested return location from the login route's router state
 * (`state.from`) or, failing that, its `?redirect=` query parameter.
 */
export function resolveLoginReturnLocation(
    routerState: unknown,
    search?: string | null,
): AuthRedirectLocationLike | null {
    const stateFrom = routerState && typeof routerState === 'object'
        ? (routerState as { from?: unknown }).from
        : undefined;
    const fromState = toSanitizedReturnLocation(stateFrom);
    if (fromState) {
        return fromState;
    }

    const redirectParam = new URLSearchParams(search || '').get('redirect');
    return toSanitizedReturnLocation(redirectParam);
}

export interface ReturnNavigationState {
    backTo?: string;
    backLabel?: string;
    pendingActionNonce?: string;
}

export function sanitizePendingActionNonce(value: unknown): string | undefined {
    return typeof value === 'string' && PENDING_ACTION_NONCE_PATTERN.test(value) ? value : undefined;
}

/**
 * Carries a validated "Back" target (for example the originating search query)
 * and the guest pending-action nonce through the login handoff. Anything that
 * is not an internal path or a well-formed nonce is dropped.
 */
export function sanitizeReturnNavigationState(value: unknown): ReturnNavigationState | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as { backTo?: unknown; backLabel?: unknown; pendingActionNonce?: unknown };
    const result: ReturnNavigationState = {};
    const backTo = sanitizeInternalReturnPath(candidate.backTo);
    if (backTo) {
        result.backTo = backTo;
        const backLabel = typeof candidate.backLabel === 'string' ? candidate.backLabel.trim().slice(0, 60) : '';
        if (backLabel) {
            result.backLabel = backLabel;
        }
    }
    const pendingActionNonce = sanitizePendingActionNonce(candidate.pendingActionNonce);
    if (pendingActionNonce) {
        result.pendingActionNonce = pendingActionNonce;
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

export function resolveLoginReturnNavigationState(routerState: unknown): ReturnNavigationState | undefined {
    const stateFrom = routerState && typeof routerState === 'object'
        ? (routerState as { from?: { state?: unknown } }).from
        : undefined;
    return sanitizeReturnNavigationState(stateFrom && typeof stateFrom === 'object' ? stateFrom.state : undefined);
}

export function getPostLoginRedirectPath(
    role?: string,
    requestedLocation?: AuthRedirectLocationLike | null,
): string {
    const safeLocation = toSanitizedReturnLocation(requestedLocation);
    const requestedPathname = normalizePathname(safeLocation?.pathname || '');

    if (
        safeLocation
        && isProtectedRoutePath(requestedPathname)
        && resolveProtectedRedirect(requestedPathname, true, role) === null
    ) {
        return `${requestedPathname}${safeLocation.search || ''}${safeLocation.hash || ''}`;
    }

    if (
        safeLocation
        && normalizeRole(role) === 'user'
        && isPublicSeekerReturnPath(requestedPathname)
    ) {
        return `${requestedPathname}${safeLocation.search || ''}${safeLocation.hash || ''}`;
    }

    return getRedirectPath(role);
}

export function resolveProtectedRedirect(
    pathname: string,
    isAuthenticated: boolean,
    role?: string,
): string | null {
    const normalizedPath = normalizePathname(pathname);
    if (isPublicUserPropertyDetailPath(normalizedPath)) {
        return null;
    }

    const protectedRoute = PROTECTED_ROLE_PREFIXES.find(({ prefix }) => (
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    ));

    if (!protectedRoute) {
        return null;
    }

    if (!isAuthenticated) {
        return getLoginPath();
    }

    const normalizedRole = normalizeRole(role);
    if (normalizedRole !== protectedRoute.role) {
        return getRedirectPath(normalizedRole);
    }

    return resolveLaunchHiddenRouteRedirect(normalizedPath);
}

export function resolveAuthRecoveryRedirect(
    pathname: string,
    isAuthenticated: boolean,
    role?: string,
): string | null {
    if (!isAuthenticated || !isAuthRecoveryRoutePath(pathname)) {
        return null;
    }

    return getRedirectPath(role);
}
