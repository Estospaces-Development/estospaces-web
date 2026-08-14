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
}

const {
    buildHealthCheckUrls,
    gotoFastTrackWorkspace,
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

    assert.ok(urls.includes('https://dev.example/login/'));
    assert.ok(!urls.includes('https://dev.example/login'));
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
