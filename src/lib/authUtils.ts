const AUTH_ROUTE_PATHS = new Set([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
]);

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

export function getRedirectPath(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'manager':
            return '/manager/dashboard';
        case 'user':
        default:
            return '/user/dashboard';
    }
}
