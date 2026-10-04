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
        if (id === '../../services/leadsService') return { getUserBrokerRequests: async () => ({ data: [], error: null }), getUserLeads: async () => ({ data: [], error: null }) };
        if (id === '../../services/salesService') return { getSaleProgressions: async () => ({ data: [], error: null }) };
        if (id === '../../services/bookingsService') return { getViewings: async () => [], getContracts: async () => [] };
        if (id === '../../services/userPropertiesService') return { getUserProperties: async () => ({ data: homes, error: null }) };
        if (id === '@/services/fastTrackService') return { getFastTrackCases: async () => ({ data: [], error: null }) };
        if (id === '../../services/propertyService') return {
            getPropertyContextsByIds: async () => { throw new Error('Owned home context is already present'); },
            getSavedProperties: async () => ({ data: [], error: null }),
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
            .find((button) => button.getAttribute('role') === 'tab' && button.textContent === 'My Homes (5)');
        assert.ok(tab, 'The last pill must identify its group as well as its actual count');
        assert.equal(tab.hidden, false);
        assert.equal(tab.getAttribute('aria-selected'), 'false');
        await act(async () => tab.click());
        assert.equal(tab.textContent, 'My Homes (5)');
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

const renderTimelineWithLinkedCase = async (fastTrackCase: Record<string, unknown>) => {
    const require = createRequire(import.meta.url);
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const brokerRequest = {
        id: 'request-september', request_type: 'rent', status: 'matched', dispatch_status: 'broker_matched',
        handoff_status: 'property_selected', location: 'London', location_postcode: 'SW1A 1AA',
        selected_property_id: 'property-selected', selected_fast_track_case_id: 'case-95979976',
        selected_property: { id: 'property-selected', title: 'Selected Rental Home', city: 'London', country: 'GB', image_urls: [] },
        matched_broker: { id: 'manager-1', name: 'Agent One' },
        created_at: '2026-09-24T20:00:00Z', updated_at: '2026-09-24T20:30:00Z', matched_at: '2026-09-24T20:10:00Z',
    };
    const componentModule = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => {
        if (id === '../../services/applicationsService') return { getApplications: async () => ({ data: [], error: null }) };
        if (id === '../../services/leadsService') return { getUserBrokerRequests: async () => ({ data: [brokerRequest], error: null }), getUserLeads: async () => ({ data: [], error: null }) };
        if (id === '../../services/salesService') return { getSaleProgressions: async () => ({ data: [], error: null }) };
        if (id === '../../services/bookingsService') return { getViewings: async () => [], getContracts: async () => [] };
        if (id === '../../services/userPropertiesService') return { getUserProperties: async () => ({ data: [], error: null }) };
        if (id === '../../services/propertyService') return { getPropertyContextsByIds: async () => ({ data: [], error: null }), getSavedProperties: async () => ({ data: [], error: null }) };
        if (id === '@/services/fastTrackService') return { getFastTrackCases: async () => ({ data: [fastTrackCase], error: null }) };
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
        const requestsTab = [...container.querySelectorAll('button')]
            .find((button) => button.getAttribute('role') === 'tab' && (button.textContent || '').startsWith('Agent requests'));
        assert.ok(requestsTab, 'The agent requests tab is rendered');
        await act(async () => requestsTab.click());
        const requestCard = [...container.querySelectorAll('div.cursor-pointer')]
            .find((element) => (element.textContent || '').includes('Selected Rental Home'));
        assert.ok(requestCard, 'The agent request card is rendered');
        await act(async () => (requestCard as unknown as HTMLElement).click());
        const summary = container.querySelector('[data-testid="existing-fast-track-journey-summary"]');
        const buttons = [...container.querySelectorAll('button')].map((button) => button.textContent || '');
        return { summary: summary?.textContent || null, buttons };
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
};

const linkedJulyCase = (overrides: Record<string, unknown> = {}) => ({
    id: 'case-95979976', caseId: 'case-95979976', propertyId: 'property-selected', stage: 'viewing', journeyMode: 'rent',
    submittedAt: '2026-07-02T12:00:00Z', expiresAt: '2026-07-03T12:00:00Z', hoursRemaining: 0, overdue: true,
    workspaceFinalStatus: 'active', finalStatus: 'in_progress', brokerRequestId: 'request-september',
    ...overrides,
});

test('timeline renders the linked reused case as the existing overdue journey', async () => {
    const { summary, buttons } = await renderTimelineWithLinkedCase(linkedJulyCase());
    assert.ok(summary, 'The linked request shows the existing-journey summary');
    assert.match(summary, /Started 2 Jul 2026 · Viewing stage · Deadline passed · Linked to this agent request/);
    assert.match(summary, /no new 24-hour clock has started/);
    assert.ok(buttons.some((text) => text.includes('Continue existing 24-hour journey')));
});

test('timeline renders a completed linked case as finished, not live', async () => {
    const { summary, buttons } = await renderTimelineWithLinkedCase(linkedJulyCase({
        workspaceFinalStatus: 'completed', finalStatus: 'completed', stage: 'handover', overdue: false,
    }));
    assert.ok(summary);
    assert.match(summary, /Started 2 Jul 2026 · Completed · Linked to this agent request/);
    assert.doesNotMatch(summary, /no new 24-hour clock|In progress|Deadline passed/);
    assert.ok(buttons.some((text) => text.includes('View completed 24-hour journey')));
    assert.ok(!buttons.some((text) => text.includes('Continue existing 24-hour journey')));
});

test('timeline renders a cancelled linked case as closed, not live', async () => {
    const { summary, buttons } = await renderTimelineWithLinkedCase(linkedJulyCase({
        workspaceFinalStatus: 'cancelled', finalStatus: 'rejected', overdue: false,
    }));
    assert.ok(summary);
    assert.match(summary, /Started 2 Jul 2026 · Closed · Linked to this agent request/);
    assert.match(summary, /was closed and is no longer active/);
    assert.doesNotMatch(summary, /no new 24-hour clock|In progress|Deadline passed/);
    assert.ok(buttons.some((text) => text.includes('View closed 24-hour journey')));
    assert.ok(!buttons.some((text) => text.includes('Continue existing 24-hour journey')));
});

test('My Homes counts saved, applied-for and enquired homes, but not closed ones (#468)', async () => {
    const require = createRequire(import.meta.url);
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const home = (id: string, title: string) => ({ id, title, city: 'London', country: 'GB', currency: 'GBP', price: 1500, listing_type: 'rent', images: [] });
    const componentModule = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => {
        if (id === '../../services/applicationsService') return { getApplications: async () => ({ data: [
            { id: 'app-live', property_id: 'p-applied', property_title: 'Applied Home', listing_type: 'rent', status: 'submitted', created_at: '2026-09-01T10:00:00Z' },
            { id: 'app-closed', property_id: 'p-rejected', property_title: 'Rejected Home', listing_type: 'rent', status: 'rejected', created_at: '2026-09-01T10:00:00Z' },
        ], error: null }) };
        if (id === '../../services/leadsService') return {
            getUserBrokerRequests: async () => ({ data: [], error: null }),
            getUserLeads: async () => ({ data: [
                { id: 'lead-1', property_id: 'p-lead', status: 'new', stage: 'broker_matched', property: { id: 'p-lead', title: 'Enquired Home', city: 'London', price: 1200, image_urls: '' } },
                { id: 'lead-2', property_id: 'p-lead-closed', status: 'closed', stage: 'withdrawn', property: { id: 'p-lead-closed', title: 'Withdrawn Home', city: 'London', price: 1200, image_urls: '' } },
                { id: 'lead-3', property_id: 'p-saved', status: 'new', property: { id: 'p-saved', title: 'Saved Home', city: 'London', price: 900, image_urls: '' } },
            ], error: null }),
        };
        if (id === '../../services/salesService') return { getSaleProgressions: async () => ({ data: [], error: null }) };
        if (id === '../../services/bookingsService') return { getViewings: async () => [], getContracts: async () => [] };
        if (id === '../../services/userPropertiesService') return { getUserProperties: async () => ({ data: [], error: null }) };
        if (id === '@/services/fastTrackService') return { getFastTrackCases: async () => ({ data: [], error: null }) };
        if (id === '../../services/propertyService') return {
            getPropertyContextsByIds: async () => ({ data: [], error: null }),
            getSavedProperties: async () => ({ data: [home('p-saved', 'Saved Home'), home('p-saved-2', 'Second Saved Home')], error: null }),
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
        // Applied + enquired + two saved (one also enquired, counted once); rejected and withdrawn are left out.
        const tab = [...container.querySelectorAll('button')]
            .find((button) => button.getAttribute('role') === 'tab' && button.textContent === 'My Homes (4)');
        assert.ok(tab, `My Homes should count 4 homes; tabs were: ${[...container.querySelectorAll('[role="tab"]')].map((b) => b.textContent).join(' | ')}`);
        await act(async () => tab.click());
        for (const title of ['Applied Home', 'Enquired Home', 'Saved Home', 'Second Saved Home']) {
            assert.ok(container.textContent.includes(title), `${title} is listed in My Homes`);
        }
        assert.ok(!container.textContent.includes('Withdrawn Home'));
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
