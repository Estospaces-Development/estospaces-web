import { useAuth } from '@/contexts/AuthContext';
import { shouldAwaitSessionResolution } from '@/lib/authUtils';
import { resolveStartupPath } from '@/lib/startupRouting';
import { Navigate } from 'react-router-dom';

export default function StartupRedirect() {
    const { isAuthenticated, loading, user } = useAuth();

    if (shouldAwaitSessionResolution(loading, isAuthenticated)) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return <Navigate to={resolveStartupPath(isAuthenticated, user?.role)} replace />;
}
