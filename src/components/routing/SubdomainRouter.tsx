import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useHost } from '@/lib/utils/hostUtils';

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

    // Redirect admin.estospaces.com to /admin if not already there
    if (currentApp === 'admin' && !pathname.startsWith('/admin')) {
        return <Navigate to="/admin" replace />;
    }

    // Redirect app.estospaces.com to /user or /manager if at root
    if (currentApp === 'app' && pathname === '/') {
        // We'll default to /user/dashboard, AuthGuard will handle role specific redirect
        return <Navigate to="/user/dashboard" replace />;
    }

    // Prevent admin access from app.estospaces.com
    if (currentApp === 'app' && pathname.startsWith('/admin')) {
        return <Navigate to="/user/dashboard" replace />;
    }

    // Prevent user access from admin.estospaces.com
    if (currentApp === 'admin' && (pathname.startsWith('/user') || pathname.startsWith('/manager'))) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};

export default SubdomainRouter;
