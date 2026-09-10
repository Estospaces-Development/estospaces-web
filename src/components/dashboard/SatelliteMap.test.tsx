import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import ts from 'typescript';

import type { getUserProperties } from '@/services/userPropertiesService';

type Page = Awaited<ReturnType<typeof getUserProperties>>;
const page = (data: any[], current: number, total: number, pages = 1): Page => ({
    data, error: null,
    pagination: { page: current, limit: 100, total, totalCount: total, totalPages: pages,
        hasNextPage: current < pages, hasPreviousPage: current > 1 },
});
const located = { id: 'chennai', country: 'IN', latitude: 13.0827, longitude: 80.2707 };

const renderMap = async (pages: Page[]) => {
    const browser = new Window({ url: 'https://estospaces.test/manager/dashboard' });
    const globals = { window: browser, document: browser.document, navigator: browser.navigator,
        HTMLElement: browser.HTMLElement, Element: browser.Element, Node: browser.Node,
        IS_REACT_ACT_ENVIRONMENT: true };
    const original = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const require = createRequire(import.meta.url);
    const file = resolve(process.cwd(), 'src/components/dashboard/SatelliteMap.tsx');
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const requests: number[] = [];
    const map = { closePopup() {}, fitBounds() {}, setView() {} };
    const boundaries: Record<string, unknown> = {
        '@/services/userPropertiesService': { getUserProperties: async (filters: { page?: number }) => {
            const requested = filters.page ?? 1;
            requests.push(requested);
            assert.ok(pages[requested - 1], `unexpected page ${requested}`);
            return pages[requested - 1];
        } },
        '@/lib/leafletReact': {
            useMap: () => map,
            MapContainer: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
            TileLayer: () => null,
            Marker: ({ position }: { position: number[] }) => <i data-pin={position.join(',')} />,
            Popup: () => null,
        },
        'leaflet/dist/leaflet.css': {},
    };
    const loaded = { exports: {} as { default: React.ComponentType } };
    const load = (id: string) => id in boundaries ? boundaries[id] : require(
        id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2))
            : id.startsWith('./') ? resolve(file, '..', id) : id,
    );
    new Function('require', 'module', 'exports', compiled)(load, loaded, loaded.exports);
    const host = browser.document.createElement('div');
    browser.document.body.append(host);
    const root = createRoot(host as unknown as HTMLElement);
    await act(async () => root.render(React.createElement(loaded.exports.default)));
    return { host, requests, cleanup: () => {
        act(() => root.unmount());
        for (const [key, descriptor] of original) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
        browser.close();
    } };
};

test('map summary includes properties without valid pins in the inventory total', async () => {
    const view = await renderMap([page([located, { id: 'missing' }, { id: 'invalid', latitude: 0, longitude: 0 }], 1, 3)]);
    try {
        assert.match(view.host.querySelector('[data-manager-map-location-summary]')!.textContent, /Showing 1 of 3/);
        assert.match(view.host.textContent, /2 properties need a valid map location/);
        assert.equal(view.host.querySelectorAll('[data-pin]').length, 1);
    } finally { view.cleanup(); }
});

test('map loads valid pins beyond the first inventory page', async () => {
    const missing = Array.from({ length: 100 }, (_, i) => ({ id: `missing-${i}` }));
    const view = await renderMap([page(missing, 1, 101, 2), page([located], 2, 101, 2)]);
    try {
        assert.equal(view.host.querySelectorAll('[data-pin]').length, 1);
        assert.match(view.host.querySelector('[data-manager-map-location-summary]')!.textContent, /Showing 1 of 101/);
        assert.deepEqual(view.requests, [1, 2]);
    } finally { view.cleanup(); }
});

test('failed later map page shows an error instead of a successful partial inventory', async () => {
    const view = await renderMap([page([located], 1, 101, 2), { data: null, pagination: null, error: { message: 'Location request failed' } }]);
    try {
        const state = view.host.querySelector('[data-manager-map-state]');
        assert.ok(state, 'failed inventory load must show an error state');
        assert.match(state.textContent, /Location request failed/);
        assert.doesNotMatch(view.host.querySelector('[data-manager-map-location-summary]')!.textContent, /Showing/);
    } finally { view.cleanup(); }
});

test('inventory with no valid coordinates keeps the real total and renders no invented pin', async () => {
    const view = await renderMap([page([{ id: 'missing' }], 1, 1)]);
    try {
        assert.match(view.host.querySelector('[data-manager-map-location-summary]')!.textContent, /Showing 0 of 1/);
        assert.match(view.host.textContent, /1 property needs a valid map location/);
        assert.equal(view.host.querySelectorAll('[data-pin]').length, 0);
    } finally { view.cleanup(); }
});

test('hiding pins does not change inventory totals or mark valid coordinates as missing', async () => {
    const view = await renderMap([page([located], 1, 1)]);
    try {
        const filter = view.host.querySelector('[data-manager-map-filter="property"]') as unknown as HTMLButtonElement;
        act(() => filter.click());
        assert.match(view.host.querySelector('[data-manager-map-location-summary]')!.textContent, /Showing 0 of 1/);
        assert.match(view.host.querySelector('[data-manager-map-state]')!.textContent, /markers are hidden/);
        assert.doesNotMatch(view.host.textContent, /needs a valid map location/);
        act(() => filter.click());
        assert.equal(view.host.querySelectorAll('[data-pin]').length, 1);
        assert.deepEqual(view.requests, [1]);
    } finally { view.cleanup(); }
});

test('map makes an empty pin state explicit and keeps its visual style switch available', async () => {
    const view = await renderMap([page([{ id: 'missing' }], 1, 1)]);
    try {
        assert.match(
            view.host.querySelector('[data-manager-map-filter-count="property"]')!.textContent,
            /1 listed · no verified pins/,
        );
        assert.equal(view.host.querySelector('[data-manager-dashboard-map]')!.getAttribute('data-manager-map-style'), 'standard');
        const satellite = view.host.querySelector('[data-manager-map-style="satellite"]') as unknown as HTMLButtonElement;
        act(() => satellite.click());
        assert.equal(view.host.querySelector('[data-manager-dashboard-map]')!.getAttribute('data-manager-map-style'), 'satellite');
    } finally { view.cleanup(); }
});
