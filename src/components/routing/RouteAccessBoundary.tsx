import { useAuth } from '@/contexts/AuthContext';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import WrongRoleNotice from '@/components/routing/WrongRoleNotice';
import {
    getLoginPath,
    isAuthRecoveryRoutePath,
    resolveAuthRecoveryRedirect,
    shouldAwaitSessionResolution,
} from '@/lib/authUtils';
import { resolveWorkspaceAccess } from '@/lib/workspaceAccess';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RouteAccessBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { isAuthenticated, loading, user } = useAuth();

    if (shouldAwaitSessionResolution(loading) && isAuthRecoveryRoutePath(location.pathname)) {
        return <BrandLoadingScreen label="Checking your session..." />;
    }

    const authRecoveryRedirectPath = resolveAuthRecoveryRedirect(location.pathname, isAuthenticated, user?.role);
    if (authRecoveryRedirectPath && authRecoveryRedirectPath !== location.pathname) {
        return <Navigate to={authRecoveryRedirectPath} replace />;
    }

    const access = resolveWorkspaceAccess({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        loading,
        isAuthenticated,
        role: user?.role,
    });

    switch (access.kind) {
        case 'await-session':
            return <BrandLoadingScreen label="Checking your session..." />;
        case 'login':
            return <Navigate to={getLoginPath()} replace state={{ from: location }} />;
        case 'redirect':
            return <Navigate to={access.to} replace />;
        case 'wrong-role':
            return <WrongRoleNotice requiredRole={access.requiredRole} currentRole={access.currentRole} />;
        default:
            return <>{children}</>;
    }
}
