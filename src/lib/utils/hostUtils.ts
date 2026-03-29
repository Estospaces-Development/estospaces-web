/**
 * Host & Subdomain Utilities
 */

export type HostedApp = 'landing' | 'app' | 'admin';

export const isLocalhostHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';
export const isSingleOriginHostedHost = (hostname: string) => hostname.endsWith('.run.app');

export const resolveCurrentAppFromHostname = (hostname: string): HostedApp => {
    if (hostname.startsWith('admin.')) {
        return 'admin';
    }
    if (hostname.startsWith('app.') || hostname.startsWith('user.') || hostname.startsWith('manager.')) {
        return 'app';
    }
    return 'landing';
};

export const resolveHostedWorkspaceRedirect = (
    currentApp: HostedApp,
    pathname: string,
): { path: string; role: 'user' | 'admin' } | null => {
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

export const getHostConfig = () => {
    const hostname = window.location.hostname;
    const isLocalhost = isLocalhostHost(hostname);
    const isSingleOriginHosted = isSingleOriginHostedHost(hostname);
    const origin = isLocalhost ? `http://localhost:${window.location.port}` : window.location.origin;
    
    // Default domains
    const APP_DOMAIN = 'app.estospaces.com';
    const ADMIN_DOMAIN = 'admin.estospaces.com';
    const LANDING_DOMAIN = 'estospaces.com';

    const currentApp = isLocalhost ? 'landing' : resolveCurrentAppFromHostname(hostname);

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
