const AUTH_ROUTE_PATHS = new Set([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
]);

const PROTECTED_ROLE_PREFIXES = [
    { prefix: '/admin', role: 'admin' },
    { prefix: '/manager', role: 'manager' },
    { prefix: '/user', role: 'user' },
] as const;

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

export function isProtectedRoutePath(pathname: string): boolean {
    const normalizedPath = normalizePathname(pathname);
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
    const protectedRoute = PROTECTED_ROLE_PREFIXES.find(({ prefix }) => (
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    ));

    if (!protectedRoute) {
        return null;
    }

    if (!isAuthenticated) {
        return '/login';
    }

    const normalizedRole = normalizeRole(role);
    if (normalizedRole !== protectedRoute.role) {
        return getRedirectPath(normalizedRole);
    }

    return null;
}
