import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

const source = readFileSync(new URL('./ApplicationTimelineWidget.tsx', import.meta.url), 'utf8');

test('hydrates historical timeline properties through the batch context endpoint', () => {
    assert.match(source, /getPropertyContextsByIds\(propertyIdBatch/);
    assert.match(source, /index \+= 100/);
    assert.doesNotMatch(source, /getPropertyById\(propertyId\)/);
});

test('marks omitted historical properties unavailable without issuing per-property requests', () => {
    assert.match(source, /hydratedPropertyIds\.add\(property\.id\)/);
    assert.match(source, /if \(!hydratedPropertyIds\.has\(propertyId\)\)/);
});

test('five loaded homes retain the full journey tab label before and after selection', async () => {
    const require = createRequire(import.meta.url);
    const homes = Array.from({ length: 5 }, (_, index) => ({
        id: `home-${index}`, title: `Named home ${index + 1}`, status: 'published', listing_type: 'rent',
        city: 'London', country: 'GB', currency: 'GBP', price: 1500, images: [],
        created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-02T10:00:00Z',
    }));
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const componentModule = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => {
        if (id === '../../services/applicationsService') return { getApplications: async () => ({ data: [], error: null }) };
        if (id === '../../services/leadsService') return { getUserBrokerRequests: async () => ({ data: [], error: null }) };
        if (id === '../../services/salesService') return { getSaleProgressions: async () => ({ data: [], error: null }) };
        if (id === '../../services/bookingsService') return { getViewings: async () => [], getContracts: async () => [] };
        if (id === '../../services/userPropertiesService') return { getUserProperties: async () => ({ data: homes, error: null }) };
        if (id === '../../services/propertyService') return {
            getPropertyContextsByIds: async () => { throw new Error('Owned home context is already present'); },
        };
        return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
    };
    new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
    const window = new Window();
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    try {
        await act(async () => root.render(<MemoryRouter><componentModule.exports.default /></MemoryRouter>));
        const tab = [...container.querySelectorAll('button')]
            .find((button) => button.getAttribute('role') === 'tab' && button.textContent === 'My homes (5)');
        assert.ok(tab, 'The last pill must identify its group as well as its actual count');
        assert.equal(tab.hidden, false);
        assert.equal(tab.getAttribute('aria-selected'), 'false');
        await act(async () => tab.click());
        assert.equal(tab.textContent, 'My homes (5)');
        assert.equal(tab.getAttribute('aria-selected'), 'true');
        assert.ok(container.textContent.includes('Named home 1'), 'Selecting the tab opens its home records');
        assert.ok(container.textContent.includes('5 listings shown'), 'The group count includes the next page');
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
