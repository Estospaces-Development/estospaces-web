import { AUTH_EXPIRED_MESSAGE } from '@/lib/authExpiry';

export const AUTH_ROUTE_GENERIC_ERROR_TITLE = 'Please review your input';
export const AUTH_ROUTE_GENERIC_ERROR_MESSAGE = 'Invalid data provided. Please check your inputs.';

export function shouldSuppressAuthRouteToast(title?: string, message?: string) {
    return (
        (title === 'Session expired' && message === AUTH_EXPIRED_MESSAGE)
        || (title === AUTH_ROUTE_GENERIC_ERROR_TITLE && message === AUTH_ROUTE_GENERIC_ERROR_MESSAGE)
    );
}
