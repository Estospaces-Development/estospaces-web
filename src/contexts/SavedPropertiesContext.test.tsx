import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { mock } from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import ts from 'typescript';

type SavedContextValue = {
    savedProperties: Array<{ id: string }>;
    isPropertySaved: (id: string) => boolean;
    saveProperty: (id: string) => Promise<{ success: boolean }>;
    savedCount: number;
    loading: boolean;
};

const contextPath = fileURLToPath(new URL('./SavedPropertiesContext.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(contextPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

// A user whose browser/profile market is India saves a UK home (and vice versa).
const indiaHome = { id: 'india-home', title: 'Chennai flat', city: 'Chennai', country: 'IN' };
const ukHome = { id: 'uk-home', title: 'London flat', city: 'London', postcode: 'SW1A 1AA', country: 'GB' };
const unknownMarketHome = { id: 'unknown-home', title: 'No country metadata' };

const mountProvider = async (initialSaved: object[], savedPageOpenFromStart = false) => {
    const window = new Window({ url: 'https://estospaces.test/user/dashboard/saved' });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    let serverSaved = [...initialSaved];
    let fetchCount = 0;
    const require = createRequire(import.meta.url);
    const user = { id: 'qa-user', role: 'user', country: 'IN' };
    const boundaries: Record<string, unknown> = {
        './AuthContext': { useAuth: () => ({ user }) },
        '@/lib/apiUtils': {
            getServiceUrl: () => 'https://core.test',
            apiFetch: async (url: string, init?: { method?: string }) => {
                if (init?.method === 'POST') {
                    serverSaved = [ukHome, ...serverSaved];
                    return { id: 'saved-row' };
                }
                assert.equal(url, 'https://core.test/api/v1/properties/saved');
                fetchCount += 1;
                return serverSaved;
            },
        },
        '@/services/propertyService': { invalidatePropertyDetailCache: () => undefined },
        '@/lib/useGeoMarket': { useUserGeoMarket: () => 'IN' },
    };
    const module = { exports: {} as { SavedPropertiesProvider: React.ComponentType<{ children: React.ReactNode }>; useSavedProperties: () => SavedContextValue; useRefreshSavedOnOpen: () => void } };
    const load = (id: string): unknown => boundaries[id] ?? require(id.startsWith('@/')
        ? resolve(process.cwd(), 'src', id.slice(2)) : id.startsWith('.') ? resolve(dirname(contextPath), id) : id);
    new Function('require', 'module', 'exports', compiled)(load, module, module.exports);

    let latest: SavedContextValue | null = null;
    const Probe = () => { latest = module.exports.useSavedProperties(); return null; };
    // Stands in for the Saved page, which calls useRefreshSavedOnOpen() on mount.
    const SavedPage = () => { module.exports.useRefreshSavedOnOpen(); return null; };
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    const cleanup = async () => {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    };
    const { SavedPropertiesProvider } = module.exports;
    await act(async () => root.render(<SavedPropertiesProvider><Probe />{savedPageOpenFromStart ? <SavedPage /> : null}</SavedPropertiesProvider>));
    await act(async () => { await new Promise((done) => setTimeout(done, 0)); });
    const openSavedPage = async () => {
        await act(async () => root.render(<SavedPropertiesProvider><Probe /><SavedPage /></SavedPropertiesProvider>));
        await act(async () => { await new Promise((done) => setTimeout(done, 0)); });
    };
    return {
        current: () => latest as unknown as SavedContextValue, cleanup, openSavedPage,
        setServerSaved: (next: object[]) => { serverSaved = next; }, fetches: () => fetchCount,
        window,
    };
};

test('the saved list shows every saved home returned by the server, regardless of market', async () => {
    const provider = await mountProvider([indiaHome, ukHome, unknownMarketHome]);
    try {
        assert.deepEqual(provider.current().savedProperties.map(({ id }) => id), ['india-home', 'uk-home', 'unknown-home']);
        assert.equal(provider.current().savedCount, 3);
        assert.equal(provider.current().isPropertySaved('uk-home'), true);
        assert.equal(provider.current().isPropertySaved('unknown-home'), true);
    } finally { await provider.cleanup(); }
});

test('a successful save of an out-of-market home appears in Saved and stays saved', async () => {
    const provider = await mountProvider([indiaHome]);
    try {
        assert.equal(provider.current().isPropertySaved('uk-home'), false);
        let result: { success: boolean } | undefined;
        await act(async () => { result = await provider.current().saveProperty('uk-home'); });
        assert.equal(result?.success, true);
        assert.deepEqual(provider.current().savedProperties.map(({ id }) => id), ['uk-home', 'india-home']);
        assert.equal(provider.current().isPropertySaved('uk-home'), true);
    } finally { await provider.cleanup(); }
});

const homeAt = (price: number) => ({ id: 'india-home', title: 'Chennai flat', price });
const priceOf = (provider: Awaited<ReturnType<typeof mountProvider>>) =>
    (provider.current().savedProperties[0] as unknown as { price: number }).price;
const realNow = Date.now.bind(Date);

test('opening the Saved page refetches and shows the live price without blanking the list', async () => {
    const provider = await mountProvider([homeAt(25000)]);
    const clock = mock.method(Date, 'now', () => realNow() + 60_000);
    try {
        assert.equal(priceOf(provider), 25000);
        provider.setServerSaved([homeAt(26500)]);
        await provider.openSavedPage();
        assert.equal(provider.fetches(), 2);
        assert.equal(priceOf(provider), 26500);
        assert.equal(provider.current().loading, false);
    } finally { clock.mock.restore(); await provider.cleanup(); }
});

test('opening the Saved page right after the initial load does not fetch twice', async () => {
    const provider = await mountProvider([homeAt(25000)]);
    try {
        await provider.openSavedPage();
        assert.equal(provider.fetches(), 1);
    } finally { await provider.cleanup(); }
});

test('returning to the tab while on the Saved page refetches stale data', async () => {
    const provider = await mountProvider([homeAt(25000)]);
    await provider.openSavedPage();
    const clock = mock.method(Date, 'now', () => realNow() + 60_000);
    try {
        provider.setServerSaved([homeAt(26500)]);
        await act(async () => {
            provider.window.document.dispatchEvent(new provider.window.Event('visibilitychange'));
            await new Promise((done) => setTimeout(done, 0));
        });
        assert.equal(priceOf(provider), 26500);
    } finally { clock.mock.restore(); await provider.cleanup(); }
});

test('landing directly on the Saved page loads the list once', async () => {
    const provider = await mountProvider([homeAt(25000)], true);
    try {
        assert.equal(provider.fetches(), 1);
        assert.equal(priceOf(provider), 25000);
    } finally { await provider.cleanup(); }
});
