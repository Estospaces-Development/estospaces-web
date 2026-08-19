import { useAuth } from '@/contexts/AuthContext';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import {
    isAuthRecoveryRoutePath,
    isProtectedRoutePath,
    resolveAuthRecoveryRedirect,
    resolveProtectedRedirect,
    shouldAwaitSessionResolution,
} from '@/lib/authUtils';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RouteAccessBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { isAuthenticated, loading, user } = useAuth();
    const isGuardedPath = isProtectedRoutePath(location.pathname) || isAuthRecoveryRoutePath(location.pathname);

    if (shouldAwaitSessionResolution(loading, isAuthenticated) && isGuardedPath) {
        return <BrandLoadingScreen label="Checking your session..." />;
    }

    const authRecoveryRedirectPath = resolveAuthRecoveryRedirect(location.pathname, isAuthenticated, user?.role);
    if (authRecoveryRedirectPath && authRecoveryRedirectPath !== location.pathname) {
        return <Navigate to={authRecoveryRedirectPath} replace />;
    }

    const redirectPath = resolveProtectedRedirect(location.pathname, isAuthenticated, user?.role);
    if (redirectPath && redirectPath !== location.pathname) {
        const redirectState = !isAuthenticated ? { from: location } : undefined;
        return <Navigate to={redirectPath} replace state={redirectState} />;
    }

    return <>{children}</>;
}
