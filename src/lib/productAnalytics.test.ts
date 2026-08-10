import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';

import {
    buildSalesIqAction,
    classifyApiActivity,
    classifyProductRoute,
    startAxiosProductAnalytics,
} from './productAnalytics';

test('SalesIQ actions keep only safe metadata and stay within the API limit', () => {
    const action = buildSalesIqAction('api_operation_succeeded', {
        email: 'private@example.com',
        message: 'do not send',
        resource: 'property',
        action: 'read',
        service: 'core',
        status: '2xx',
        outcome: 'success',
    });

    assert.ok(action);
    assert.ok(action.length <= 250);
    assert.match(action, /resource=property/);
    assert.doesNotMatch(action, /private@example/);
    assert.doesNotMatch(action, /do not send/);
    assert.equal(buildSalesIqAction('unknown_event', {}), null);
});

test('completed registration creates a CRM-safe qualification action', () => {
    assert.equal(
        buildSalesIqAction('registration_completed', {
            email: 'private@example.com',
            outcome: 'success',
            role: 'user',
        }),
        'estospaces:registration_completed|outcome=success|role=user',
    );
});

test('API activity classification removes record ids, queries, and payload data', () => {
    assert.deepEqual(
        classifyApiActivity('/__api/booking/api/v1/fast-track/2a40c71e-0c99-4446-8dda-264190733731/schedule', 'POST'),
        { action: 'schedule', method: 'POST', resource: 'fast_track', service: 'booking' },
    );
    assert.deepEqual(
        classifyApiActivity('https://estospaces-search-service-prod.example/api/v1/search?query=private-address', 'GET'),
        { action: 'search', method: 'GET', resource: 'property_search', service: 'search' },
    );
    assert.deepEqual(
        classifyApiActivity('https://core.example/api/v1/auth/forgot-password', 'POST'),
        { action: 'recover', method: 'POST', resource: 'auth', service: 'unknown' },
    );
});

test('product routes collapse dynamic screens into CRM-safe funnel areas', () => {
    assert.equal(classifyProductRoute('/user/properties/secret-property-id'), 'user.property');
    assert.equal(classifyProductRoute('/manager/fast-track/case-id'), 'manager.fast_track');
    assert.equal(classifyProductRoute('/admin/users/123'), 'admin.workspace');
    assert.equal(classifyProductRoute('/unmapped/private-value'), 'product.other');
});

test('startAxiosProductAnalytics is a no-op when SalesIQ widget is absent', async () => {
    const testGlobal = globalThis as unknown as Record<string, unknown>;
    testGlobal.window = {};

    startAxiosProductAnalytics();

    await axios.post('/api/v1/auth/forgot-password', { email: 'private@example.com' }, {
        adapter: async (config) => ({
            config,
            data: {},
            headers: {},
            status: 200,
            statusText: 'OK',
        }),
    });

    assert.ok(true, 'interceptor did not add when SalesIQ is absent');
    delete testGlobal.window;
});
