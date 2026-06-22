import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
    buildHostedRedirectLocation,
    buildHostedWorkspaceUrl,
    isSameHostedWorkspaceUrl,
    resolveHostedWorkspaceRedirect,
    shouldBypassHostedWorkspaceRedirect,
    useHost,
} from '@/lib/utils/hostUtils';

interface SubdomainRouterProps {
    children: React.ReactNode;
}

/**
 * SubdomainRouter handles domain-based redirection.
 * admin.estospaces.com -> /admin/*
 * app.estospaces.com -> /user/* or /manager/*
 * estospaces.com -> / (Landing)
 */
const SubdomainRouter: React.FC<SubdomainRouterProps> = ({ children }) => {
    const { currentApp, hostname, isLocalhost } = useHost();
    const { pathname, search, hash } = useLocation();

    // Skip redirection on localhost to allow easy development of all sections
    if (isLocalhost) {
        return <>{children}</>;
    }

    if (shouldBypassHostedWorkspaceRedirect(hostname, pathname)) {
        return <>{children}</>;
    }

    const redirect = resolveHostedWorkspaceRedirect(currentApp, pathname);
    if (redirect) {
        const targetLocation = buildHostedRedirectLocation(redirect.path, pathname, search, hash);
        const targetUrl = buildHostedWorkspaceUrl(targetLocation, redirect.role);
        const resolved = new URL(targetUrl, window.location.origin);
        const currentUrl = window.location.href;

        if (isSameHostedWorkspaceUrl(resolved.toString(), currentUrl)) {
            return <>{children}</>;
        }

        if (resolved.origin === window.location.origin) {
            return <Navigate to={`${resolved.pathname}${resolved.search}${resolved.hash}`} replace />;
        }

        window.location.replace(resolved.toString());
        return null;
    }

    return <>{children}</>;
};

export default SubdomainRouter;
