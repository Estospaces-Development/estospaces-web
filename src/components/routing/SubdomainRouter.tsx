import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
    buildHostedWorkspaceUrl,
    resolveHostedWorkspaceRedirect,
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
    const { currentApp, isLocalhost } = useHost();
    const { pathname } = useLocation();

    // Skip redirection on localhost to allow easy development of all sections
    if (isLocalhost) {
        return <>{children}</>;
    }

    const redirect = resolveHostedWorkspaceRedirect(currentApp, pathname);
    if (redirect) {
        const targetUrl = buildHostedWorkspaceUrl(redirect.path, redirect.role);
        const resolved = new URL(targetUrl, window.location.origin);

        if (resolved.origin === window.location.origin) {
            return <Navigate to={`${resolved.pathname}${resolved.search}${resolved.hash}`} replace />;
        }

        window.location.replace(resolved.toString());
        return null;
    }

    return <>{children}</>;
};

export default SubdomainRouter;
