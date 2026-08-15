import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

interface HealthTarget {
    baseUrl: string;
    appBaseUrl: string;
    adminBaseUrl: string;
    services: Record<string, string>;
}

interface ProofHelpers {
    buildHealthCheckUrls: (target: HealthTarget) => string[];
    gotoFastTrackWorkspace: (
        page: unknown,
        baseUrl: string,
        role: 'user' | 'manager' | 'admin',
        caseId: string,
        section?: string,
    ) => Promise<boolean>;
    gotoWithRetry: (
        page: unknown,
        url: string,
        options?: Record<string, unknown>,
        maxAttempts?: number,
    ) => Promise<unknown>;
    isExpectedUnavailablePropertyConsoleError: (message: string, locationUrl: string) => boolean;
    isExpectedUnavailablePropertyResponse: (status: number, url: string) => boolean;
}

const {
    buildHealthCheckUrls,
    gotoFastTrackWorkspace,
    gotoWithRetry,
    isExpectedUnavailablePropertyConsoleError,
    isExpectedUnavailablePropertyResponse,
} = require('../../scripts/platform-proof-browser-helpers.cjs') as ProofHelpers;

const target: HealthTarget = {
    baseUrl: 'https://dev.example',
    appBaseUrl: 'https://dev.example',
    adminBaseUrl: 'https://dev.example',
    services: {
        core: 'https://core.example',
        booking: 'https://booking.example',
        payment: 'https://payment.example',
        notification: 'https://notification.example',
        search: 'https://search.example',
        media: 'https://media.example',
        messaging: 'https://messaging.example',
    },
};

test('platform health proof uses the canonical trailing-slash login route', () => {
    const urls = buildHealthCheckUrls(target);
    const loginUrls = urls.filter((url) => new URL(url).pathname.startsWith('/login'));

    assert.deepEqual(loginUrls, ['https://dev.example/login/']);
});

test('Fast Track navigation reports a ready workspace after all required panels load', async () => {
    const visited: string[] = [];
    const waitedFor: string[] = [];
    const locator = (selector: string) => ({
        waitFor: async () => {
            waitedFor.push(selector);
        },
        first: () => ({
            isVisible: async () => true,
            click: async () => undefined,
        }),
    });
    const page = {
        goto: async (url: string) => {
            visited.push(url);
        },
        locator,
        waitForTimeout: async () => undefined,
    };

    const ready = await gotoFastTrackWorkspace(
        page,
        'https://dev.example',
        'user',
        'case-1',
        'viewing',
    );

    assert.equal(ready, true);
    assert.deepEqual(visited, [
        'https://dev.example/user/dashboard/fast-track?case=case-1&section=viewing',
    ]);
    assert.deepEqual(waitedFor, [
        '[data-fast-track-header]',
        '[data-fast-track-masthead]',
        '[data-fast-track-stepper]',
        '[data-fast-track-utility-dock]',
    ]);
});

test('Fast Track navigation reports an unavailable stale case after a header timeout', async () => {
    const page = {
        goto: async () => undefined,
        locator: () => ({
            waitFor: async () => {
                throw new Error('Timeout 30000ms exceeded');
            },
        }),
        waitForTimeout: async () => undefined,
    };

    const ready = await gotoFastTrackWorkspace(
        page,
        'https://dev.example',
        'manager',
        'stale-case',
    );

    assert.equal(ready, false);
});

test('user Fast Track navigation verifies the details-modal utility dock', async () => {
    let dockVisible = false;
    const clickedButtons: string[] = [];
    const utilityDock = {
        isVisible: async () => dockVisible,
        waitFor: async () => undefined,
    };
    const page = {
        goto: async () => undefined,
        locator: (selector: string) => ({
            waitFor: async () => undefined,
            first: () => selector === '[data-fast-track-utility-dock]'
                ? utilityDock
                : { isVisible: async () => true },
        }),
        getByRole: (_role: string, options: { name: RegExp }) => ({
            click: async () => {
                const name = String(options.name);
                clickedButtons.push(name);
                dockVisible = name.includes('See details');
            },
        }),
        waitForTimeout: async () => undefined,
    };

    const ready = await gotoFastTrackWorkspace(
        page,
        'https://dev.example',
        'user',
        'case-1',
    );

    assert.equal(ready, true);
    assert.deepEqual(clickedButtons, ['/^See details$/', '/^Close details$/']);
    assert.equal(dockVisible, false);
});

test('proof diagnostics classify only missing authenticated property details as expected', () => {
    assert.equal(isExpectedUnavailablePropertyResponse(
        404,
        'https://core.example/api/v1/properties/catalog/property-1',
    ), true);
    assert.equal(isExpectedUnavailablePropertyResponse(
        404,
        'http://localhost:3000/__dev_proxy/core/api/v1/properties/catalog/property-1',
    ), true);
    assert.equal(isExpectedUnavailablePropertyResponse(
        404,
        'https://app.estospaces.com/__api/core/api/v1/properties/catalog/property-1',
    ), true);
    assert.equal(isExpectedUnavailablePropertyResponse(
        404,
        'https://core.example/api/v1/properties/property-1',
    ), false);
    assert.equal(isExpectedUnavailablePropertyResponse(
        500,
        'https://core.example/api/v1/properties/catalog/property-1',
    ), false);
});

test('proof diagnostics suppress only catalog 404 console errors with matching resource URLs', () => {
    const message = 'Failed to load resource: the server responded with a status of 404 (Not Found)';

    assert.equal(isExpectedUnavailablePropertyConsoleError(
        message,
        'https://app.estospaces.com/__api/core/api/v1/properties/catalog/property-1',
    ), true);
    assert.equal(isExpectedUnavailablePropertyConsoleError(
        message,
        'https://app.estospaces.com/assets/missing.js',
    ), false);
    assert.equal(isExpectedUnavailablePropertyConsoleError(
        'Unrelated console failure',
        'https://app.estospaces.com/__api/core/api/v1/properties/catalog/property-1',
    ), false);
});

test('proof navigation retries a transient transport timeout', async () => {
    let attempts = 0;
    const page = {
        goto: async () => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error('Timeout 30000ms exceeded: net::ERR_QUIC_PROTOCOL_ERROR');
            }
            return 'loaded';
        },
        waitForTimeout: async () => undefined,
    };

    const result = await gotoWithRetry(page, 'https://dev.example/user/dashboard');

    assert.equal(result, 'loaded');
    assert.equal(attempts, 2);
});

test('proof navigation does not retry non-transport failures', async () => {
    let attempts = 0;
    const page = {
        goto: async () => {
            attempts += 1;
            throw new Error('Certificate validation failed');
        },
        waitForTimeout: async () => undefined,
    };

    await assert.rejects(
        gotoWithRetry(page, 'https://dev.example/user/dashboard'),
        /Certificate validation failed/,
    );
    assert.equal(attempts, 1);
});
