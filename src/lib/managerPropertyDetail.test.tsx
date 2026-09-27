import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { PropertyProvider, useProperties } from '@/contexts/PropertyContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';
import { clearAuthToken, setAuthToken } from '@/lib/authToken';
import {
    loadManagerPropertyDetail,
    MANAGER_PROPERTY_LOAD_ERROR_MESSAGE,
    resolveManagerPropertyDetail,
} from '@/lib/managerPropertyDetail';
import { invalidatePropertyDetailCache } from '@/services/propertyService';

const MANAGER = { id: 'manager-1', role: 'manager' };
const OTHER_MANAGER_ID = 'manager-2';

type ContextValue = ReturnType<typeof useProperties>;

// Captures the real manager PropertyProvider with no inventory page loaded,
// which is exactly the state of a direct load, a reload, or a listing that
// lives on inventory page 2+.
const captureManagerContext = (): ContextValue => {
    let captured: ContextValue | null = null;
    const Capture = () => {
        captured = useProperties();
        return null;
    };
    renderToStaticMarkup(
        <MemoryRouter initialEntries={['/manager/dashboard/properties/page-two-property']}>
            <WorkspaceSyncProvider>
                <PropertyProvider scope="manager" enabled={false}>
                    <Capture />
                </PropertyProvider>
            </WorkspaceSyncProvider>
        </MemoryRouter>,
    );
    assert.ok(captured);
    return captured;
};

interface StubResponse {
    status: number;
    body: unknown;
}

const withCoreStub = async (
    respond: (url: string) => StubResponse,
    run: (requests: string[]) => Promise<void>,
) => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    setAuthToken('manager-session-token');
    globalThis.fetch = async (input) => {
        const url = String(input);
        requests.push(url);
        const { status, body } = respond(url);
        return new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    };
    try {
        await run(requests);
    } finally {
        globalThis.fetch = originalFetch;
        clearAuthToken();
    }
};

const ownedProperty = (id: string, managerId = MANAGER.id) => ({
    id,
    manager_id: managerId,
    title: `Listing ${id}`,
    status: 'published',
    listing_type: 'rent',
    price: 27500,
    currency: 'GBP',
    country: 'United Kingdom',
});

test('a listing that is not on the loaded inventory page is read by ID from core', async () => {
    // 15 owned listings; the inventory context would only hold the first 12.
    const inventory = Array.from({ length: 15 }, (_, index) => ownedProperty(`listing-${index + 1}`));
    const target = 'listing-14';
    invalidatePropertyDetailCache(target);

    await withCoreStub((url) => {
        const id = decodeURIComponent(url.split('/').pop() || '');
        const match = inventory.find((property) => property.id === id);
        return match
            ? { status: 200, body: { success: true, data: match } }
            : { status: 404, body: { success: false, error: 'Property not found' } };
    }, async (requests) => {
        const context = captureManagerContext();
        assert.equal(context.getProperty(target), undefined, 'the list page must not be the source of truth');

        const result = await loadManagerPropertyDetail(target, MANAGER, context.fetchPropertyById);
        assert.equal(result.kind, 'found');
        assert.equal(result.kind === 'found' && result.property.id, target);
        assert.equal(result.kind === 'found' && result.property.title, 'Listing listing-14');
        assert.equal(requests.length, 1);
        assert.match(requests[0], /\/api\/v1\/properties\/catalog\/listing-14$/);
        assert.doesNotMatch(requests[0], /\/mine/);
    });
});

test('direct load and browser reload both resolve the same owned listing', async () => {
    const target = 'ce811096-218f-43a4-a591-51ce79cc304b';
    await withCoreStub(
        () => ({ status: 200, body: { success: true, data: ownedProperty(target) } }),
        async (requests) => {
            for (const attempt of ['direct load', 'reload']) {
                // A reload starts with a fresh module state and an empty inventory.
                invalidatePropertyDetailCache(target);
                const context = captureManagerContext();
                const result = await loadManagerPropertyDetail(target, MANAGER, context.fetchPropertyById);
                assert.equal(result.kind, 'found', attempt);
                assert.equal(result.kind === 'found' && result.property.status, 'published', attempt);
            }
            assert.equal(requests.length, 2);
        },
    );
});

test('a 404 from core is reported as not found', async () => {
    invalidatePropertyDetailCache('deleted-listing');
    await withCoreStub(
        () => ({ status: 404, body: { success: false, error: 'Property not found' } }),
        async () => {
            const context = captureManagerContext();
            const result = await loadManagerPropertyDetail('deleted-listing', MANAGER, context.fetchPropertyById);
            assert.deepEqual(result, { kind: 'not_found' });
        },
    );
});

test('a 403 from core is reported as forbidden, not as not found', async () => {
    invalidatePropertyDetailCache('forbidden-listing');
    await withCoreStub(
        () => ({ status: 403, body: { success: false, error: 'Forbidden' } }),
        async () => {
            const context = captureManagerContext();
            const result = await loadManagerPropertyDetail('forbidden-listing', MANAGER, context.fetchPropertyById);
            assert.deepEqual(result, { kind: 'forbidden' });
        },
    );
});

test("another manager's public listing is forbidden in the manager workspace", async () => {
    invalidatePropertyDetailCache('someone-elses-listing');
    await withCoreStub(
        () => ({ status: 200, body: { success: true, data: ownedProperty('someone-elses-listing', OTHER_MANAGER_ID) } }),
        async () => {
            const context = captureManagerContext();
            const result = await loadManagerPropertyDetail('someone-elses-listing', MANAGER, context.fetchPropertyById);
            assert.deepEqual(result, { kind: 'forbidden' });
        },
    );
});

test('a server failure is an error with retry, and a retry reaches core again', async () => {
    const target = 'flaky-listing';
    invalidatePropertyDetailCache(target);
    let failNext = true;
    await withCoreStub(() => {
        if (failNext) {
            failNext = false;
            return { status: 500, body: { success: false, error: 'internal detail must not leak' } };
        }
        return { status: 200, body: { success: true, data: ownedProperty(target) } };
    }, async (requests) => {
        const context = captureManagerContext();
        const first = await loadManagerPropertyDetail(target, MANAGER, context.fetchPropertyById);
        assert.deepEqual(first, { kind: 'error', message: MANAGER_PROPERTY_LOAD_ERROR_MESSAGE });

        const retry = await loadManagerPropertyDetail(target, MANAGER, context.fetchPropertyById);
        assert.equal(retry.kind, 'found');
        assert.equal(requests.length, 2, 'errors must not be cached as a missing property');
    });
});

test('ownership resolution fails closed and lets admins through', () => {
    const data = { id: 'p' };
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: 'manager-1', error: null }, MANAGER).kind, 'found');
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: ' MANAGER-1 ', error: null }, MANAGER).kind, 'found');
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: null, error: null }, MANAGER).kind, 'forbidden');
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: 'manager-1', error: null }, null).kind, 'forbidden');
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: 'manager-1', error: null }, { id: 'broker-9', role: 'broker' }).kind, 'forbidden');
    assert.equal(resolveManagerPropertyDetail({ data, ownerId: 'manager-2', error: null }, { id: 'admin-1', role: 'admin' }).kind, 'found');
    assert.equal(resolveManagerPropertyDetail({ data: null, error: null }, MANAGER).kind, 'not_found');
    assert.equal(resolveManagerPropertyDetail({ data: null, error: 'Unauthorized', status: 401 }, MANAGER).kind, 'forbidden');
});

test('a missing or blank route ID is not found without calling core', async () => {
    let calls = 0;
    const fetchById = async () => {
        calls += 1;
        return { data: null, error: null };
    };
    assert.deepEqual(await loadManagerPropertyDetail(undefined, MANAGER, fetchById), { kind: 'not_found' });
    assert.deepEqual(await loadManagerPropertyDetail('  ', MANAGER, fetchById), { kind: 'not_found' });
    assert.equal(calls, 0);
});

test('a thrown lookup becomes a retryable error instead of a false not found', async () => {
    const result = await loadManagerPropertyDetail('p', MANAGER, async () => {
        throw new Error('network down');
    });
    assert.deepEqual(result, { kind: 'error', message: MANAGER_PROPERTY_LOAD_ERROR_MESSAGE });
});

test('duplicate works for a listing that is not on the loaded inventory page', async () => {
    let createdBody: Record<string, unknown> | null = null;
    await withCoreStub((url) => {
        assert.match(url, /\/api\/v1\/properties$/);
        return { status: 201, body: { success: true, data: { ...ownedProperty('copy-1'), status: 'draft', title: 'Listing page-two (Copy)' } } };
    }, async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input, init) => {
            createdBody = JSON.parse(String(init?.body || '{}'));
            return originalFetch(input, init);
        };
        try {
            const context = captureManagerContext();
            const source = { id: 'page-two', title: 'Listing page-two', status: 'published' } as Parameters<ContextValue['duplicateProperty']>[1];
            const copy = await context.duplicateProperty('page-two', source);
            assert.equal(copy?.id, 'copy-1');
            assert.equal(createdBody?.title, 'Listing page-two (Copy)');
            assert.equal(createdBody?.status, 'draft');

            assert.equal(await context.duplicateProperty('page-two'), null, 'no source and not listed: nothing to copy');
            assert.equal(await context.duplicateProperty('page-two', { ...source!, id: 'different' }), null);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

test('manager detail and edit routes no longer resolve the property only from the list page', () => {
    const detail = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'), 'utf8');
    assert.match(detail, /loadManagerPropertyDetail\(id, user, fetchPropertyById\)/);
    assert.match(detail, /duplicateProperty\(id, property\)/);
    assert.doesNotMatch(detail, /const property = id \? getProperty\(id\) : undefined/);

    const edit = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/add/page.tsx'), 'utf8');
    assert.match(edit, /getPropertyById\(idValue, \{ suppressErrorToast: true \}\)/);
    assert.match(edit, /resolveManagerPropertyDetail\(/);
    assert.match(edit, /<ManagerPropertyLoadState[\s\S]*?purpose="edit"/);
});
