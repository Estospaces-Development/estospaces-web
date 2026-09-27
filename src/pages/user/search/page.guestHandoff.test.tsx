import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

import { PENDING_GUEST_ACTION_STORAGE_KEY } from '@/lib/pendingGuestAction';

type SeenLocation = { pathname: string; search: string; state: unknown };

const pagePath = fileURLToPath(new URL('./page.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(pagePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

const result = {
    id: 'page-two-home', title: 'QA Page Two Rental', property_type: 'apartment', listing_type: 'rent',
    status: 'published', price: 45000, currency: 'INR', bedrooms: 2, bathrooms: 1,
    city: 'Chennai', postcode: '600001', country: 'IN',
};

const HANDOFF_NONCE = '01234567-89ab-4cde-8f01-23456789abcd';
const pendingSearchSave = (overrides: Record<string, unknown> = {}) => ({
    type: 'save', origin: 'search', propertyId: 'page-two-home', nonce: HANDOFF_NONCE,
    returnPath: '/search?sort=price_asc&page=2', createdAt: Date.now(), ...overrides,
});

const mountSearch = async ({
    user,
    initialSearch = '?sort=price_asc&page=2',
    initialState,
    pendingAction,
}: {
    user: { id: string; role: string } | null;
    initialSearch?: string;
    initialState?: unknown;
    pendingAction?: Record<string, unknown>;
}) => {
    const window = new Window({ url: `https://estospaces.test/search${initialSearch}` });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node,
        sessionStorage: window.sessionStorage, localStorage: window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    if (pendingAction) {
        window.sessionStorage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify(pendingAction));
    }
    const saveCalls: string[] = [];
    const seen: SeenLocation[] = [];
    const noop = () => undefined;
    const require = createRequire(import.meta.url);
    const realSearchService = require(resolve(process.cwd(), 'src/services/searchService'));
    const boundaries: Record<string, unknown> = {
        '../../../services/searchService': {
            ...realSearchService,
            searchService: {
                search: async () => ({ success: true, data: [result], pagination: { total: 13 } }),
                getFilters: async () => null,
                getSearchHistory: async () => [],
                autocomplete: async () => [],
                saveSearch: async () => ({ success: true }),
            },
        },
        '@/contexts/AuthContext': { useAuth: () => ({ user, isAuthenticated: Boolean(user) }) },
        '@/contexts/ToastContext': { useToast: () => ({ error: noop, success: noop }) },
        '@/contexts/SavedPropertiesContext': {
            useSavedProperties: () => ({
                saveProperty: async (id: string) => {
                    saveCalls.push(id);
                    if (!user) return { success: false, error: 'Saved properties are only available to user accounts' };
                    return { success: true };
                },
                removeProperty: async () => ({ success: true }),
                isPropertySaved: () => false,
            }),
        },
        '@/lib/useGeoMarket': { useUserGeoMarket: () => 'IN' },
        '@/lib/usePreferredSearchDefaults': { usePreferredSearchDefaults: () => ({ ready: true, failed: false }) },
    };
    const module = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => boundaries[id] ?? require(id.startsWith('@/')
        ? resolve(process.cwd(), 'src', id.slice(2)) : id.startsWith('.') ? resolve(dirname(pagePath), id) : id);
    new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
    const LocationProbe = () => {
        const location = useLocation();
        seen.push({ pathname: location.pathname, search: location.search, state: location.state });
        return <p>Landed on {location.pathname}</p>;
    };
    const tree = () => <MemoryRouter initialEntries={[{ pathname: '/search', search: initialSearch, state: initialState }]}>
        <Routes>
            <Route path="/search" element={<module.exports.default />} />
            <Route path="/login/" element={<LocationProbe />} />
            <Route path="/login" element={<LocationProbe />} />
            <Route path="/user/properties/:id" element={<LocationProbe />} />
        </Routes>
    </MemoryRouter>;
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
    // The search page debounces result fetches by 300ms.
    const settle = async () => { await act(async () => { await new Promise((done) => setTimeout(done, 400)); }); };
    try {
        await act(async () => root.render(tree()));
        await settle();
        await settle();
    } catch (error) { await cleanup(); throw error; }
    const findButton = (pattern: RegExp) => {
        const button = Array.from(container.querySelectorAll('button'))
            .find((candidate) => pattern.test(candidate.getAttribute('aria-label') || candidate.textContent || ''));
        assert.ok(button, `button matching ${pattern} is rendered`);
        return button as unknown as HTMLButtonElement;
    };
    return {
        window, saveCalls, seen, container, cleanup, settle,
        click: async (pattern: RegExp) => { await act(async () => { findButton(pattern).click(); }); },
    };
};

test('guest Save on a search card goes to login with the search return path instead of failing', async () => {
    const page = await mountSearch({ user: null });
    try {
        await page.click(/^Sign in to save QA Page Two Rental$/);
        assert.deepEqual(page.saveCalls, [], 'no role-error save attempt is made for guests');
        assert.doesNotMatch(page.container.textContent || '', /Could not update/);
        const landed = page.seen.at(-1);
        assert.match(landed?.pathname || '', /^\/login\/?$/);
        assert.deepEqual((landed?.state as { from: unknown }).from, {
            pathname: '/search',
            search: '?sort=price_asc&page=2',
            hash: '',
            state: { pendingActionNonce: JSON.parse(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY) || '{}').nonce },
        });
        const stored = JSON.parse(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY) || '{}');
        assert.equal(stored.type, 'save');
        assert.equal(stored.origin, 'search');
        assert.equal(stored.propertyId, 'page-two-home');
        assert.equal(stored.returnPath, '/search?sort=price_asc&page=2');
        assert.match(stored.nonce, /^[A-Za-z0-9-]{16,64}$/);
    } finally { await page.cleanup(); }
});

test('search cards open property detail with the originating search as the back target', async () => {
    const page = await mountSearch({ user: null });
    try {
        await page.click(/^View details$/);
        const landed = page.seen.at(-1);
        assert.equal(landed?.pathname, '/user/properties/page-two-home');
        assert.deepEqual(landed?.state, { backTo: '/search?sort=price_asc&page=2', backLabel: 'Back to Search' });
    } finally { await page.cleanup(); }
});

test('a signed-in seeker returning to search completes the pending card save once', async () => {
    const page = await mountSearch({
        user: { id: 'qa-user', role: 'user' },
        initialState: { pendingActionNonce: HANDOFF_NONCE },
        pendingAction: pendingSearchSave(),
    });
    try {
        await page.settle();
        assert.deepEqual(page.saveCalls, ['page-two-home']);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        assert.match(page.container.textContent || '', /now in your saved properties/);
    } finally { await page.cleanup(); }
});

test('a different seeker opening search without the handoff nonce does not get the guest save', async () => {
    const page = await mountSearch({
        user: { id: 'qa-user-b', role: 'user' },
        pendingAction: pendingSearchSave(),
    });
    try {
        await page.settle();
        assert.deepEqual(page.saveCalls, []);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        assert.doesNotMatch(page.container.textContent || '', /now in your saved properties/);
    } finally { await page.cleanup(); }
});

test('a mismatched nonce or a different search path does not run the guest save', async () => {
    for (const scenario of [
        { initialState: { pendingActionNonce: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }, initialSearch: '?sort=price_asc&page=2' },
        { initialState: { pendingActionNonce: HANDOFF_NONCE }, initialSearch: '?sort=price_asc&page=3' },
    ]) {
        const page = await mountSearch({ user: { id: 'qa-user', role: 'user' }, pendingAction: pendingSearchSave(), ...scenario });
        try {
            await page.settle();
            assert.deepEqual(page.saveCalls, [], JSON.stringify(scenario));
            assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        } finally { await page.cleanup(); }
    }
});
