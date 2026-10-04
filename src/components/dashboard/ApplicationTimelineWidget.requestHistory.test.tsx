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

// QA-MB-20260925-01-004: an expired Buy request and its active retry must both stay reachable.
const brokerRequests = [
    {
        id: '9b5d7fc4-59cf-427f-845e-83bf63f64bff', user_id: 'user-1', request_type: 'buy', status: 'expired', dispatch_status: 'expired',
        location: 'Chennai', location_postcode: '600001', budget: '5000000', details: 'QA original brief',
        created_at: '2026-09-24T21:07:00Z', updated_at: '2026-09-24T21:17:00Z',
    },
    {
        id: '6ab09306-fea4-467e-9e52-f77266a3ca63', user_id: 'user-1', request_type: 'buy', status: 'submitted', dispatch_status: 'matching_wave_1',
        location: 'Chennai', location_postcode: '600001', budget: '5000000', details: 'QA retry brief',
        created_at: '2026-09-24T21:18:00Z', updated_at: '2026-09-24T21:18:00Z',
    },
    {
        id: '0b8f5f7e-3c1a-4a55-9f5e-1d2c3b4a5f60', user_id: 'user-1', request_type: 'rent', status: 'cancelled', dispatch_status: 'cancelled',
        location: 'London', location_postcode: 'SW1A 1AA', budget: '1500', details: 'Cancelled rental brief',
        created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T11:00:00Z',
    },
];

test('agent requests history lists expired, active and closed requests with a status filter', async () => {
    const require = createRequire(import.meta.url);
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const componentModule = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => {
        if (id === '../../services/applicationsService') return { getApplications: async () => ({ data: [], error: null }) };
        if (id === '../../services/leadsService') return { getUserBrokerRequests: async () => ({ data: brokerRequests, error: null }), getUserLeads: async () => ({ data: [], error: null }) };
        if (id === '../../services/salesService') return { getSaleProgressions: async () => ({ data: [], error: null }) };
        if (id === '../../services/bookingsService') return { getViewings: async () => [], getContracts: async () => [] };
        if (id === '../../services/userPropertiesService') return { getUserProperties: async () => ({ data: [], error: null }) };
        if (id === '../../services/propertyService') return { getPropertyContextsByIds: async () => ({ data: [], error: null }), getSavedProperties: async () => ({ data: [], error: null }) };
        if (id === '@/services/fastTrackService') return { getFastTrackCases: async () => ({ data: [], error: null }) };
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
    const requestCards = () => [...container.querySelectorAll('div.cursor-pointer')]
        .filter((element) => (element.textContent || '').includes('Property agent request'));
    try {
        await act(async () => root.render(<MemoryRouter><componentModule.exports.default /></MemoryRouter>));
        const requestsTab = [...container.querySelectorAll('button')]
            .find((button) => button.getAttribute('role') === 'tab' && (button.textContent || '').startsWith('Agent requests'));
        assert.ok(requestsTab, 'The agent requests tab is rendered');
        assert.equal(requestsTab.textContent, 'Agent requests (3)', 'expired and closed requests count towards history');
        await act(async () => requestsTab.click());

        assert.equal(requestCards().length, 3);
        const text = container.textContent || '';
        assert.ok(text.includes('Request expired'), 'the expired original is listed truthfully');
        assert.ok(text.includes('Request closed'), 'the cancelled request is listed truthfully');
        assert.ok(text.includes('Request Sent'), 'the active retry is listed');

        const statusFilter = container.querySelector('#agent-request-status-filter') as unknown as HTMLSelectElement | null;
        assert.ok(statusFilter, 'the requests tab offers a status filter');
        const setFilter = async (value: string) => {
            await act(async () => {
                statusFilter.value = value;
                statusFilter.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event);
            });
        };

        await setFilter('expired');
        assert.equal(requestCards().length, 1);
        assert.ok((requestCards()[0].textContent || '').includes('Request expired'));

        await setFilter('active');
        assert.equal(requestCards().length, 1);
        assert.ok((requestCards()[0].textContent || '').includes('Request Sent'));

        await setFilter('closed');
        assert.equal(requestCards().length, 1);
        assert.ok((requestCards()[0].textContent || '').includes('Request closed'));

        await setFilter('all');
        assert.equal(requestCards().length, 3);

        const applicationsTab = [...container.querySelectorAll('button')]
            .find((button) => button.getAttribute('role') === 'tab' && (button.textContent || '').startsWith('Applications'));
        assert.ok(applicationsTab);
        await act(async () => applicationsTab.click());
        assert.equal(container.querySelector('#agent-request-status-filter'), null, 'the status filter only applies to agent requests');
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
