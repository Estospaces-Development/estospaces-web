/**
 * Utilities for navigating back to the previously viewed property page.
 */

const LAST_PROPERTY_KEY = 'estospaces:last_viewed_property_id';
const LAST_PROPERTY_PATH_KEY = 'estospaces:last_viewed_property_path';

export function recordPropertyNavigation(propertyId: string, basePath = '/user/properties'): void {
    try {
        sessionStorage.setItem(LAST_PROPERTY_KEY, propertyId);
        sessionStorage.setItem(LAST_PROPERTY_PATH_KEY, `${basePath}/${propertyId}`);
    } catch {
        // sessionStorage unavailable (SSR, private mode); silently ignore
    }
}

export function getLastViewedProperty(): { id: string | null; path: string | null } {
    try {
        return {
            id: sessionStorage.getItem(LAST_PROPERTY_KEY),
            path: sessionStorage.getItem(LAST_PROPERTY_PATH_KEY),
        };
    } catch {
        return { id: null, path: null };
    }
}

export function clearLastViewedProperty(): void {
    try {
        sessionStorage.removeItem(LAST_PROPERTY_KEY);
        sessionStorage.removeItem(LAST_PROPERTY_PATH_KEY);
    } catch {
        // silently ignore
    }
}

export function navigateBackToProperty(navigate: (to: string, opts?: { state?: Record<string, unknown> }) => void): void {
    const { path } = getLastViewedProperty();
    if (path) {
        navigate(path, { state: { backTo: '/user/dashboard', backLabel: 'Back to Dashboard' } });
    } else {
        navigate('/user/dashboard');
    }
}
