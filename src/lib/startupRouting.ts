import { getRedirectPath } from './authUtils';

export const resolveStartupPath = (isAuthenticated: boolean, role?: string) => {
    if (!isAuthenticated) {
        return '/';
    }

    return getRedirectPath(role || 'user');
};
