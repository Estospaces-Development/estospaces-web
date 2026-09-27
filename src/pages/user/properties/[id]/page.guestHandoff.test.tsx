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

import type { Property } from '@/services/propertyService';
import { PENDING_GUEST_ACTION_STORAGE_KEY } from '@/lib/pendingGuestAction';

type Result = { data: Property | null; error: string | null };
type SeenLocation = { pathname: string; search: string; state: unknown };

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

const HANDOFF_NONCE = '01234567-89ab-4cde-8f01-23456789abcd';
const pendingDetailSave = (overrides: Record<string, unknown> = {}) => ({
    type: 'save', origin: 'property', propertyId: 'first', nonce: HANDOFF_NONCE,
    returnPath: '/user/properties/first', createdAt: Date.now(), ...overrides,
});
const handoffEntry = (nonce: string = HANDOFF_NONCE, pathname = '/user/properties/first') => ({
    pathname, search: '', state: { backTo: '/search?page=2', backLabel: 'Back to Search', pendingActionNonce: nonce },
});

const mountPage = async ({
    user,
    initialEntry = { pathname: '/user/properties/first', search: '', state: undefined as unknown },
    pendingAction,
}: {
    user: { id: string; role: string; name: string } | null;
    initialEntry?: { pathname: string; search: string; state?: unknown };
    pendingAction?: Record<string, unknown>;
}) => {
    const window = new Window({ url: `https://estospaces.test${initialEntry.pathname}${initialEntry.search}` });
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
    const requests: Array<{ id: string; resolve: (value: Result) => void }> = [];
    const saveCalls: string[] = [];
    const seen: SeenLocation[] = [];
    const noop = () => undefined;
    const require = createRequire(import.meta.url);
    const routerDom = require('react-router-dom');
    const boundaries: Record<string, unknown> = {
        'react-router-dom': {
            ...routerDom,
            useSearchParams: () => [new URLSearchParams(initialEntry.search.replace(/^\?/, ''))],
        },
        '../../../../services/propertyService': {
            getPropertyById: (id: string) => new Promise<Result>((resolveResult) => requests.push({ id, resolve: resolveResult })),
            recordPropertyView: async () => ({ recorded: true }),
        },
        '@/services/leadsService': {
            createLead: async () => ({ data: null, error: null }),
            getUserDocuments: async () => ({ data: [], error: null }),
            getUserLeads: async () => ({ data: [], error: null }),
            uploadDocument: async () => ({ data: null, error: null }),
        },
        '@/contexts/AuthContext': { useAuth: () => ({ user }) },
        '@/contexts/ToastContext': { useToast: () => ({ error: noop, success: noop }) },
        '@/contexts/SavedPropertiesContext': {
            useSavedProperties: () => ({
                saveProperty: async (id: string) => { saveCalls.push(id); return { success: true }; },
                removeProperty: async () => ({ success: true }),
                isPropertySaved: () => false,
            }),
        },
        '@/contexts/WorkspaceSyncContext': { usePublishWorkspaceSync: () => noop },
        '@/lib/useGeoMarket': { useUserGeoMarket: () => 'GB' },
        '@/services/reviewsService': { reviewsService: { getPropertyReviews: async () => ({ success: true, data: { reviews: [], average_rating: 0, total_reviews: 0 } }) } },
        '@/services/fastTrackService': { getFastTrackCases: async () => ({ data: [], error: null }) },
        '@/services/bookingsService': { bookingsService: { getViewingAvailability: async (id: string) => ({ property_id: id, slots: [] }) } },
        '@/components/dashboard/PropertyFastTrackModal': { __esModule: true, default: () => null },
        '@/components/fast-track/FastTrackRequestConfirmationModal': { __esModule: true, default: () => null },
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
    const tree = () => <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
            <Route path="/user/properties/:id" element={<module.exports.default />} />
            <Route path="/login/" element={<LocationProbe />} />
            <Route path="/login" element={<LocationProbe />} />
            <Route path="/search" element={<LocationProbe />} />
            <Route path="/user/search" element={<LocationProbe />} />
            <Route path="/user/dashboard/discover" element={<LocationProbe />} />
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
    try { await act(async () => root.render(tree())); } catch (error) { await cleanup(); throw error; }
    const findButton = (pattern: RegExp) => {
        const button = Array.from(container.querySelectorAll('button'))
            .find((candidate) => pattern.test(candidate.getAttribute('aria-label') || candidate.textContent || ''));
        assert.ok(button, `button matching ${pattern} is rendered`);
        return button as unknown as HTMLButtonElement;
    };
    return {
        window, requests, saveCalls, seen, container, cleanup,
        complete: async (index: number, result: Result) => { await act(async () => requests[index].resolve(result)); },
        click: async (pattern: RegExp) => { await act(async () => { findButton(pattern).click(); }); },
        settle: async () => { await act(async () => { await new Promise((done) => setTimeout(done, 0)); }); },
    };
};

test('guest Save on property detail goes to login with the property return path and a pending save', async () => {
    const page = await mountPage({
        user: null,
        initialEntry: {
            pathname: '/user/properties/first',
            search: '',
            state: { backTo: '/search?page=2&sort=price_asc', backLabel: 'Back to Search' },
        },
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.click(/^Save Home first$/);
        const landed = page.seen.at(-1);
        assert.ok(landed);
        assert.match(landed.pathname, /^\/login\/?$/);
        const stored = JSON.parse(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY) || '{}');
        assert.equal(stored.type, 'save');
        assert.equal(stored.origin, 'property');
        assert.equal(stored.propertyId, 'first');
        assert.equal(stored.returnPath, '/user/properties/first');
        assert.deepEqual((landed.state as { from: unknown }).from, {
            pathname: '/user/properties/first',
            search: '',
            hash: '',
            state: { backTo: '/search?page=2&sort=price_asc', backLabel: 'Back to Search', pendingActionNonce: stored.nonce },
        });
        assert.deepEqual(page.saveCalls, []);
    } finally { await page.cleanup(); }
});

test('a signed-in seeker returning to the property runs the pending save exactly once', async () => {
    const page = await mountPage({
        user: { id: 'qa-user', role: 'user', name: 'QA User' },
        initialEntry: handoffEntry(),
        pendingAction: pendingDetailSave(),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.settle();
        await page.settle();
        assert.deepEqual(page.saveCalls, ['first']);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        assert.match(page.container.textContent || '', /Property saved successfully/);
    } finally { await page.cleanup(); }
});

test('a pending save for a different property is discarded, not run', async () => {
    const page = await mountPage({
        user: { id: 'qa-user', role: 'user', name: 'QA User' },
        initialEntry: handoffEntry(),
        pendingAction: pendingDetailSave({ propertyId: 'other' }),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.settle();
        assert.deepEqual(page.saveCalls, []);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
    } finally { await page.cleanup(); }
});

test('a pending guest save is not run for a manager account', async () => {
    const page = await mountPage({
        user: { id: 'qa-manager', role: 'manager', name: 'QA Manager' },
        initialEntry: handoffEntry(),
        pendingAction: pendingDetailSave(),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.settle();
        assert.deepEqual(page.saveCalls, []);
    } finally { await page.cleanup(); }
});

test('guest Back to Search on a missing property returns to the originating public search', async () => {
    const page = await mountPage({
        user: null,
        initialEntry: {
            pathname: '/user/properties/missing',
            search: '',
            state: { backTo: '/search?page=2&sort=price_asc', backLabel: 'Back to Search' },
        },
    });
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.click(/^Back to Search$/);
        const landed = page.seen.at(-1);
        assert.equal(landed?.pathname, '/search');
        assert.equal(landed?.search, '?page=2&sort=price_asc');
    } finally { await page.cleanup(); }
});

test('guest Back to Search without search context uses public /search, never protected /user/search', async () => {
    const page = await mountPage({ user: null, initialEntry: { pathname: '/user/properties/missing', search: '' } });
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.click(/^Back to Search$/);
        assert.equal(page.seen.at(-1)?.pathname, '/search');
        assert.equal(page.seen.at(-1)?.search, '');
    } finally { await page.cleanup(); }
});

test('guest Back to Search ignores an external or protected back target', async () => {
    const page = await mountPage({
        user: null,
        initialEntry: { pathname: '/user/properties/missing', search: '', state: { backTo: '//evil.example/search' } },
    });
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.click(/^Back to Search$/);
        assert.equal(page.seen.at(-1)?.pathname, '/search');
    } finally { await page.cleanup(); }
});

test('signed-in Back to Search on a missing property opens user Discover', async () => {
    const page = await mountPage({
        user: { id: 'qa-user', role: 'user', name: 'QA User' },
        initialEntry: { pathname: '/user/properties/missing', search: '' },
    });
    try {
        await page.complete(0, { data: null, error: 'Property not found' });
        await page.click(/^Back to Search$/);
        assert.equal(page.seen.at(-1)?.pathname, '/user/dashboard/discover');
    } finally { await page.cleanup(); }
});

test('guest in-app Back from a property opened on search page two restores that search', async () => {
    const page = await mountPage({
        user: null,
        initialEntry: {
            pathname: '/user/properties/first',
            search: '',
            state: { backTo: '/search?page=2&sort=price_asc', backLabel: 'Back to Search' },
        },
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.click(/^Back to Search$/);
        assert.equal(page.seen.at(-1)?.pathname, '/search');
        assert.equal(page.seen.at(-1)?.search, '?page=2&sort=price_asc');
    } finally { await page.cleanup(); }
});

test('a different seeker opening the property without the handoff nonce does not get the guest save', async () => {
    const page = await mountPage({
        user: { id: 'qa-user-b', role: 'user', name: 'QA User B' },
        pendingAction: pendingDetailSave(),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.settle();
        assert.deepEqual(page.saveCalls, []);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
    } finally { await page.cleanup(); }
});

test('a mismatched nonce does not run the pending save', async () => {
    const page = await mountPage({
        user: { id: 'qa-user', role: 'user', name: 'QA User' },
        initialEntry: handoffEntry('ffffffff-ffff-4fff-8fff-ffffffffffff'),
        pendingAction: pendingDetailSave(),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        await page.settle();
        assert.deepEqual(page.saveCalls, []);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
    } finally { await page.cleanup(); }
});

test('a guest protected action without a pending type clears any stored action', async () => {
    const page = await mountPage({
        user: null,
        pendingAction: pendingDetailSave(),
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        const rentalForm = Array.from(page.container.querySelectorAll('form'))
            .find((form) => !String(form.getAttribute('class') || '').includes('scroll-mt-24'));
        assert.ok(rentalForm, 'rental application form is rendered for a rental listing');
        await act(async () => {
            rentalForm.dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
        });
        assert.match(page.seen.at(-1)?.pathname || '', /^\/login\/?$/);
        assert.equal(page.window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        const from = (page.seen.at(-1)?.state as { from: { state?: { pendingActionNonce?: string } } }).from;
        assert.equal(from.state?.pendingActionNonce, undefined);
    } finally { await page.cleanup(); }
});

test('a guest Back target that dot-normalises to another origin is ignored', async () => {
    const page = await mountPage({
        user: null,
        initialEntry: { pathname: '/user/properties/first', search: '', state: { backTo: '/search/..//evil.example', backLabel: 'Back to Search' } },
    });
    try {
        await page.complete(0, { data: property('first'), error: null });
        assert.doesNotMatch(page.container.textContent || '', /Back to Search/);
        await page.click(/^Back$/);
        assert.equal(page.seen.at(-1)?.pathname, '/search');
        assert.equal(page.seen.at(-1)?.search, '');
    } finally { await page.cleanup(); }
});
