import { useAuth } from '@/contexts/AuthContext';
import { isProtectedRoutePath, resolveProtectedRedirect, shouldAwaitSessionResolution } from '@/lib/authUtils';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RouteAccessBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { isAuthenticated, loading, user } = useAuth();

    if (shouldAwaitSessionResolution(loading, isAuthenticated) && isProtectedRoutePath(location.pathname)) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    const redirectPath = resolveProtectedRedirect(location.pathname, isAuthenticated, user?.role);
    if (redirectPath && redirectPath !== location.pathname) {
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}
