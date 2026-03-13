/**
 * Host & Subdomain Utilities
 */

export const getHostConfig = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Default domains
    const APP_DOMAIN = 'app.estospaces.com';
    const ADMIN_DOMAIN = 'admin.estospaces.com';
    const LANDING_DOMAIN = 'estospaces.com';

    let currentApp: 'landing' | 'app' | 'admin' = 'landing';

    if (hostname.startsWith('admin.')) {
        currentApp = 'admin';
    } else if (hostname.startsWith('app.') || hostname.startsWith('user.')) {
        currentApp = 'app';
    } else if (isLocalhost) {
        // On localhost, we rely on paths or can use port logic if separated
        // For now, assume localhost defaults to landing unless path specified
        currentApp = 'landing';
    }

    return {
        hostname,
        isLocalhost,
        currentApp,
        appUrl: isLocalhost ? `http://localhost:${window.location.port}` : `https://${APP_DOMAIN}`,
        adminUrl: isLocalhost ? `http://localhost:${window.location.port}/admin` : `https://${ADMIN_DOMAIN}`,
        landingUrl: isLocalhost ? `http://localhost:${window.location.port}` : `https://${LANDING_DOMAIN}`,
    };
};

export const useHost = () => {
    return getHostConfig();
};
