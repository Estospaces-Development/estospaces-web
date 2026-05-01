import { useAuth } from '@/contexts/AuthContext';
import {
    getRedirectPath,
    isAuthRecoveryRoutePath,
    isProtectedRoutePath,
    resolveAuthRecoveryRedirect,
    resolveProtectedRedirect,
    shouldAwaitSessionResolution,
} from '@/lib/authUtils';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function WrongRoleAccessState({ requestedPath, redirectPath }: { requestedPath: string; redirectPath: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-950">
            <div className="max-w-lg rounded-3xl border border-orange-100 bg-white p-8 shadow-sm dark:border-orange-900/30 dark:bg-gray-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Access denied</p>
                <h1 className="mt-3 text-2xl font-bold text-gray-950 dark:text-white">This workspace belongs to another role.</h1>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    You tried to open {requestedPath}. Use your correct dashboard so the URL and visible workspace stay in sync.
                </p>
                <NavigateButton to={redirectPath} />
            </div>
        </div>
    );
}

function NavigateButton({ to }: { to: string }) {
    return (
        <a
            href={to}
            className="mt-6 inline-flex rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
            Open my dashboard
        </a>
    );
}

export default function RouteAccessBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { isAuthenticated, loading, user } = useAuth();
    const isGuardedPath = isProtectedRoutePath(location.pathname) || isAuthRecoveryRoutePath(location.pathname);

    if (shouldAwaitSessionResolution(loading, isAuthenticated) && isGuardedPath) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    const authRecoveryRedirectPath = resolveAuthRecoveryRedirect(location.pathname, isAuthenticated, user?.role);
    if (authRecoveryRedirectPath && authRecoveryRedirectPath !== location.pathname) {
        return <Navigate to={authRecoveryRedirectPath} replace />;
    }

    const redirectPath = resolveProtectedRedirect(location.pathname, isAuthenticated, user?.role);
    if (redirectPath && redirectPath !== location.pathname) {
        if (isAuthenticated && redirectPath === getRedirectPath(user?.role)) {
            return <WrongRoleAccessState requestedPath={location.pathname} redirectPath={redirectPath} />;
        }
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}
