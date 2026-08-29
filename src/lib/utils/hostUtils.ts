/**
 * Host & Subdomain Utilities
 */

export type HostedApp = 'landing' | 'app' | 'admin';

const APP_DOMAIN = 'app.estospaces.com';
const ADMIN_DOMAIN = 'admin.estospaces.com';
const LANDING_DOMAIN = 'estospaces.com';

const ADMIN_AUTH_ROUTE_PATHS = new Set([
    '/sessions/create',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
]);

export const isLocalhostHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';
export const isSingleOriginHostedHost = (hostname: string) => hostname.endsWith('.run.app');

export const resolveCurrentAppFromHostname = (hostname: string): HostedApp => {
    if (hostname.startsWith('admin.')) {
        return 'admin';
    }
    if (hostname.startsWith('app.') || hostname.startsWith('user.') || hostname.startsWith('manager.')) {
        return 'app';
    }
    if (hostname.startsWith('estospaces-web-') && isSingleOriginHostedHost(hostname)) {
        return 'app';
    }
    return 'landing';
};

export const resolveHostedWorkspaceRedirect = (
    currentApp: HostedApp,
    pathname: string,
): { path: string; role: 'user' | 'admin' } | null => {
    if (currentApp === 'admin' && ADMIN_AUTH_ROUTE_PATHS.has(pathname)) {
        return null;
    }

    if (currentApp === 'admin' && !pathname.startsWith('/admin')) {
        return { path: '/admin', role: 'admin' };
    }

    if (currentApp === 'app' && pathname === '/') {
        return { path: '/user/dashboard', role: 'user' };
    }

    if (currentApp === 'app' && pathname.startsWith('/admin')) {
        return { path: '/user/dashboard', role: 'user' };
    }

    if (currentApp === 'admin' && (pathname.startsWith('/user') || pathname.startsWith('/manager'))) {
        return { path: '/admin/dashboard', role: 'admin' };
    }

    if (currentApp === 'landing' && pathname.startsWith('/admin')) {
        return { path: pathname, role: 'admin' };
    }

    if (currentApp === 'landing' && (pathname.startsWith('/user') || pathname.startsWith('/manager'))) {
        return { path: pathname, role: 'user' };
    }

    return null;
};

export const shouldBypassHostedWorkspaceRedirect = (hostname: string, pathname: string) => {
    if (!isSingleOriginHostedHost(hostname)) {
        return false;
    }

    return pathname.startsWith('/admin') || pathname.startsWith('/manager') || pathname.startsWith('/user');
};

export const getHostConfig = () => {
    const hostname = window.location.hostname;
    const isLocalhost = isLocalhostHost(hostname);
    const isSingleOriginHosted = isSingleOriginHostedHost(hostname);
    const origin = isLocalhost ? `http://localhost:${window.location.port}` : window.location.origin;

    const currentApp = isLocalhost ? 'app' : resolveCurrentAppFromHostname(hostname);

    return {
        hostname,
        isLocalhost,
        isSingleOriginHosted,
        origin,
        currentApp,
        appUrl: isLocalhost || isSingleOriginHosted ? origin : `https://${APP_DOMAIN}`,
        adminUrl: isLocalhost || isSingleOriginHosted ? origin : `https://${ADMIN_DOMAIN}`,
        landingUrl: isLocalhost || isSingleOriginHosted ? origin : `https://${LANDING_DOMAIN}`,
    };
};

export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

export const getPublicHomeHref = () => `https://${LANDING_DOMAIN}/`;

export const useHost = () => {
    return getHostConfig();
};

export const buildHostedWorkspaceUrl = (path: string, role?: string) => {
    const config = getHostConfig();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const targetApp = normalizedPath.startsWith('/admin') || role === 'admin' ? 'admin' : 'app';
    const base = targetApp === 'admin' ? config.adminUrl : config.appUrl;
    return `${base}${normalizedPath}`;
};

export const buildHostedRedirectLocation = (
    targetPath: string,
    currentPath: string,
    currentSearch = '',
    currentHash = '',
) => {
    const shouldPreserveParams = targetPath === currentPath;
    return `${targetPath}${shouldPreserveParams ? currentSearch : ''}${shouldPreserveParams ? currentHash : ''}`;
};

export const isSameHostedWorkspaceUrl = (targetUrl: string, currentUrl: string) => {
    const resolvedTarget = new URL(targetUrl, currentUrl);
    const resolvedCurrent = new URL(currentUrl);

    return (
        resolvedTarget.origin === resolvedCurrent.origin &&
        resolvedTarget.pathname === resolvedCurrent.pathname &&
        resolvedTarget.search === resolvedCurrent.search &&
        resolvedTarget.hash === resolvedCurrent.hash
    );
};
