import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildHostedWorkspaceUrl,
    isSameHostedWorkspaceUrl,
    isSingleOriginHostedHost,
    resolveCurrentAppFromHostname,
    resolveHostedWorkspaceRedirect,
} from '@/lib/utils/hostUtils';

test('landing host redirects protected app routes to the app domain', () => {
    assert.equal(resolveCurrentAppFromHostname('estospaces.com'), 'landing');
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('landing', '/manager/dashboard'),
        { path: '/manager/dashboard', role: 'user' },
    );
});

test('landing host redirects admin routes to the admin domain', () => {
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('landing', '/admin/users'),
        { path: '/admin/users', role: 'admin' },
    );
});

test('app host still blocks admin routes locally', () => {
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('app', '/admin/verifications'),
        { path: '/user/dashboard', role: 'user' },
    );
});

test('cloud run dev hosts stay on the same origin for admin links', () => {
    assert.equal(isSingleOriginHostedHost('estospaces-web-dev-zaryfkxmeq-nw.a.run.app'), true);

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: {
                hostname: 'estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
                origin: 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
                port: '',
            },
        },
        configurable: true,
    });

    try {
        assert.equal(
            buildHostedWorkspaceUrl('/admin/dashboard', 'admin'),
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
        );
    } finally {
        if (originalWindow === undefined) {
            delete (globalThis as { window?: Window }).window;
        } else {
            Object.defineProperty(globalThis, 'window', {
                value: originalWindow,
                configurable: true,
            });
        }
    }
});

test('same-origin hosted admin redirect does not navigate to the current URL again', () => {
    assert.equal(
        isSameHostedWorkspaceUrl(
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
        ),
        true,
    );

    assert.equal(
        isSameHostedWorkspaceUrl(
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/login',
        ),
        false,
    );
});
