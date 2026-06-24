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
