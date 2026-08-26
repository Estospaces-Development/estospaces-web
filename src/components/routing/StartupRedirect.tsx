import { useAuth } from '@/contexts/AuthContext';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { shouldAwaitSessionResolution } from '@/lib/authUtils';
import { resolveStartupPath } from '@/lib/startupRouting';
import { Navigate } from 'react-router-dom';

export default function StartupRedirect() {
    const { isAuthenticated, loading, user } = useAuth();

    if (shouldAwaitSessionResolution(loading, isAuthenticated)) {
        return <BrandLoadingScreen label="Opening your workspace..." />;
    }

    return <Navigate to={resolveStartupPath(isAuthenticated, user?.role)} replace />;
}
