import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

import type { Property } from '@/services/propertyService';
import type { GeoMarketCode } from '@/lib/geoMarket';

type Result = { data: Property | null; error: string | null };
const property = (id: string): Property => ({
    id, title: `Home ${id}`, property_type: 'apartment', listing_type: 'rent', status: 'published',
    price: 1250, currency: 'GBP', bedrooms: 2, bathrooms: 1,
    address_line_1: '1 Test Road', city: 'London', postcode: 'SW1A 1AA', country: 'GB',
});
const pagePath = fileURLToPath(new URL('./page.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(pagePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

const mountPage = async (initialMarket: GeoMarketCode = 'GB') => {
    const window = new Window({ url: 'https://estospaces.test/user/properties/first' });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node,
        sessionStorage: window.sessionStorage, localStorage: window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    let market = initialMarket;
    const requests: Array<{ id: string; resolve: (value: Result) => void; reject: (error: Error) => void }> = [];
    const recordedViews: string[] = [];
    const user = { id: 'qa-user-fixture', role: 'user', name: 'QA User' };
    const noop = () => undefined;
    const require = createRequire(import.meta.url);
    const boundaries: Record<string, unknown> = {
        '../../../../services/propertyService': {
            getPropertyById: (id: string) => new Promise<Result>((resolveResult, reject) => requests.push({ id, resolve: resolveResult, reject })),
            recordPropertyView: async (id: string) => { recordedViews.push(id); return { recorded: true }; },
        },
        '@/contexts/AuthContext': { useAuth: () => ({ user }) },
        '@/contexts/ToastContext': { useToast: () => ({ error: noop, success: noop }) },
        '@/contexts/SavedPropertiesContext': { useSavedProperties: () => ({ saveProperty: noop, removeProperty: noop, isPropertySaved: () => false }) },
        '@/contexts/WorkspaceSyncContext': { usePublishWorkspaceSync: () => noop },
        '@/lib/useGeoMarket': { useUserGeoMarket: () => market },
        '@/services/reviewsService': { reviewsService: { getPropertyReviews: async () => ({ success: true, data: { reviews: [], average_rating: 0, total_reviews: 0 } }) } },
        '@/services/leadsService': { getUserLeads: async () => ({ data: [], error: null }), getUserDocuments: async () => ({ data: [], error: null }) },
        '@/services/fastTrackService': { getFastTrackCases: async () => ({ data: [], error: null }) },
        '@/services/bookingsService': { bookingsService: { getViewingAvailability: async (id: string) => ({ property_id: id, slots: [] }) } },
        '@/components/dashboard/PropertyFastTrackModal': { __esModule: true, default: () => null },
        '@/components/fast-track/FastTrackRequestConfirmationModal': { __esModule: true, default: () => null },
    };
    const module = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => boundaries[id] ?? require(id.startsWith('@/')
        ? resolve(process.cwd(), 'src', id.slice(2)) : id.startsWith('.') ? resolve(dirname(pagePath), id) : id);
    new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
    let navigate: ReturnType<typeof useNavigate> = () => { throw new Error('Not mounted'); };
    const Probe = () => { navigate = useNavigate(); return <module.exports.default />; };
    const tree = () => <MemoryRouter initialEntries={['/user/properties/first']}>
        <Routes><Route path="/user/properties/:id" element={<Probe />} /></Routes>
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
    try { await act(async () => root.render(tree())); } catch (error) { await cleanup(); throw error; }
    return {
        requests, recordedViews, container, cleanup,
        setMarket: async (next: GeoMarketCode) => { market = next; await act(async () => root.render(tree())); },
        navigate: async (id: string) => { await act(async () => navigate(`/user/properties/${id}`)); },
        complete: async (index: number, result: Result) => { await act(async () => requests[index].resolve(result)); },
        fail: async (index: number) => { await act(async () => requests[index].reject(new Error('Network failure'))); },
    };
};

test('property page replaces an earlier not-found error after navigating to a valid property', async () => {
    const page = await mountPage();
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        assert.match(page.container.textContent, /Property not found/);
        await page.navigate('second');
        assert.deepEqual(page.requests.map(({ id }) => id), ['first', 'second']);
        await page.complete(1, { data: property('second'), error: null });
        assert.match(page.container.textContent, /Home second/);
        assert.doesNotMatch(page.container.textContent, /Property not found/);
    } finally { await page.cleanup(); }
});

test('resolved user market can recover the same property without disabling country filtering', async () => {
    const page = await mountPage('IN');
    try {
        await page.complete(0, { data: property('first'), error: null });
        assert.match(page.container.textContent, /not available in your market/);
        assert.doesNotMatch(page.container.textContent, /Home first/);
        await page.setMarket('GB');
        await page.complete(1, { data: property('first'), error: null });
        assert.match(page.container.textContent, /Home first/);
        assert.doesNotMatch(page.container.textContent, /not available in your market/);
    } finally { await page.cleanup(); }
});

test('a late previous-route response cannot replace the current property', async () => {
    const page = await mountPage();
    try {
        await page.navigate('second');
        await page.complete(1, { data: property('second'), error: null });
        assert.match(page.container.textContent, /Home second/);
        await page.complete(0, { data: property('first'), error: null });
        assert.match(page.container.textContent, /Home second/);
        assert.doesNotMatch(page.container.textContent, /Home first/);
    } finally { await page.cleanup(); }
});

test('stale resolution cannot dismiss the current loading state or display the old home', async () => {
    const page = await mountPage();
    try {
        await page.navigate('second');
        await page.complete(0, { data: property('first'), error: null });
        assert.match(page.container.textContent, /Loading property details/);
        assert.doesNotMatch(page.container.textContent, /Home first/);
        assert.deepEqual(page.recordedViews, []);
        await page.complete(1, { data: property('second'), error: null });
        assert.match(page.container.textContent, /Home second/);
    } finally { await page.cleanup(); }
});

test('a rejected old request cannot erase a successful current property', async () => {
    const page = await mountPage();
    try {
        await page.navigate('second');
        await page.complete(1, { data: property('second'), error: null });
        await page.fail(0);
        assert.match(page.container.textContent, /Home second/);
        assert.doesNotMatch(page.container.textContent, /Failed to load/);
    } finally { await page.cleanup(); }
});

test('new-route loading never records a view using a previous property snapshot', async () => {
    const page = await mountPage();
    try {
        await page.complete(0, { data: property('first'), error: null });
        assert.deepEqual(page.recordedViews, ['first']);
        await page.navigate('second');
        assert.deepEqual(page.recordedViews, ['first']);
        await page.complete(1, { data: null, error: 'Access denied' });
        assert.match(page.container.textContent, /Access denied/);
        assert.doesNotMatch(page.container.textContent, /Home first/);
        assert.deepEqual(page.recordedViews, ['first']);
    } finally { await page.cleanup(); }
});

test('view recording accepts a canonical property ID for an uppercase UUID route', async () => {
    const page = await mountPage();
    const routeId = 'A6AA57F0-23E9-433D-805E-AEE6E5EA97EC';
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.navigate(routeId);
        await page.complete(1, { data: property(routeId.toLowerCase()), error: null });
        assert.match(page.container.textContent, /Home a6aa57f0/);
        assert.deepEqual(page.recordedViews, [routeId.toLowerCase()]);
    } finally { await page.cleanup(); }
});

test('case variants of one property route record only one view per session', async () => {
    const page = await mountPage();
    const canonicalId = 'a6aa57f0-23e9-433d-805e-aee6e5ea97ec';
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.navigate(canonicalId);
        await page.complete(1, { data: property(canonicalId), error: null });
        await page.navigate(canonicalId.toUpperCase());
        await page.complete(2, { data: property(canonicalId), error: null });
        assert.deepEqual(page.recordedViews, [canonicalId]);
    } finally { await page.cleanup(); }
});
