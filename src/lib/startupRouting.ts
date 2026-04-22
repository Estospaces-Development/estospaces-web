import { getRedirectPath } from './authUtils';

export const resolveStartupPath = (isAuthenticated: boolean, role?: string) => {
    if (!isAuthenticated) {
        return '/login';
    }

    return getRedirectPath(role || 'user');
};
