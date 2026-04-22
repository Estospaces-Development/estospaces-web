import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_EXPIRED_MESSAGE } from '@/lib/authExpiry';
import {
    AUTH_ROUTE_GENERIC_ERROR_MESSAGE,
    AUTH_ROUTE_GENERIC_ERROR_TITLE,
    shouldSuppressAuthRouteToast,
} from '@/lib/authToastRules';

test('shouldSuppressAuthRouteToast matches the auth cleanup toasts only', () => {
    assert.equal(shouldSuppressAuthRouteToast('Session expired', AUTH_EXPIRED_MESSAGE), true);
    assert.equal(
        shouldSuppressAuthRouteToast(AUTH_ROUTE_GENERIC_ERROR_TITLE, AUTH_ROUTE_GENERIC_ERROR_MESSAGE),
        true,
    );
    assert.equal(shouldSuppressAuthRouteToast('Temporary service issue', 'The service is temporarily unreachable. We are working on a fix.'), false);
    assert.equal(shouldSuppressAuthRouteToast('Please review your input', 'Custom validation error'), false);
});
