import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getUserGeolocation, getUserLocation } from './locationService';

const syntheticCoordinates = { latitude: 51.5, longitude: -0.1 };

const installBrowser = (allowed: boolean, denied = false) => {
    const originals = new Map(['window', 'navigator', 'document', 'fetch'].map(
        (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ));
    let gpsCalls = 0;
    let networkCalls = 0;
    Object.defineProperties(globalThis, {
        window: { configurable: true, value: {} },
        document: { configurable: true, value: {
            permissionsPolicy: { allowsFeature: (feature: string) => feature === 'geolocation' && allowed },
        } },
        navigator: { configurable: true, value: { geolocation: {
            getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback) => {
                gpsCalls++;
                if (denied) failure({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
                else success({ coords: syntheticCoordinates } as GeolocationPosition);
            },
        } } },
        fetch: { configurable: true, value: async () => {
            networkCalls++;
            return new Response(JSON.stringify({ result: null }), { status: 200 });
        } },
    });
    return {
        gpsCalls: () => gpsCalls,
        networkCalls: () => networkCalls,
        restore: () => {
            for (const [key, descriptor] of originals) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
        },
    };
};

test('passive location resolution does not acquire or transmit device coordinates', async () => {
    const browser = installBrowser(true);
    try {
        assert.equal(await getUserLocation({}), null);
        assert.equal(browser.gpsCalls(), 0);
        assert.equal(browser.networkCalls(), 0);
    } finally { browser.restore(); }
});

test('dashboard and discover provider never opt passive visits into GPS', () => {
    const source = readFileSync(new URL('../contexts/LocationContext.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /useGeolocation:\s*true/);
});

test('explicit location request delegates to browser permission without reverse-geocoding', async () => {
    const browser = installBrowser(true);
    try {
        assert.deepEqual(await getUserGeolocation(), syntheticCoordinates);
        assert.equal(browser.gpsCalls(), 1);
        assert.equal(browser.networkCalls(), 0);
    } finally { browser.restore(); }
});

test('permissions policy denial prevents calling device GPS', async () => {
    const browser = installBrowser(false);
    try {
        await assert.rejects(getUserGeolocation(), /permissions policy/);
        assert.equal(browser.gpsCalls(), 0);
        assert.equal(browser.networkCalls(), 0);
    } finally { browser.restore(); }
});

test('browser permission denial remains an error and sends no coordinates', async () => {
    const browser = installBrowser(true, true);
    try {
        await assert.rejects(getUserGeolocation(), { code: 1 });
        assert.equal(browser.gpsCalls(), 1);
        assert.equal(browser.networkCalls(), 0);
    } finally { browser.restore(); }
});
