import assert from 'node:assert/strict';
import test from 'node:test';

import { clearAuthToken, setAuthToken } from '@/lib/authToken';

import {
    BOOKING_ACTIVITY_UNAVAILABLE_CODE,
    PROPERTY_ACTIVE_BOOKING_WORK_CODE,
    getPropertyById,
    updateManagerPropertyStatus,
} from './propertyService';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const withFetch = async (handler: (url: string, init?: RequestInit) => Promise<Response>, run: () => Promise<void>) => {
    const originalFetch = globalThis.fetch;
    setAuthToken('signed-in-token');
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
    try {
        await run();
    } finally {
        clearAuthToken();
        globalThis.fetch = originalFetch;
    }
};

test('each manager action is one PUT to core with only the action in the body', async () => {
    const requests: Array<{ url: string; method?: string; body?: unknown }> = [];
    await withFetch(async (url, init) => {
        requests.push({ url, method: init?.method, body: JSON.parse(String(init?.body)) });
        return json({ success: true, data: { id: 'property-1', status: 'draft', published_at: '2026-03-01T12:00:00Z' } });
    }, async () => {
        for (const action of ['unpublish', 'republish', 'mark_sold'] as const) {
            const result = await updateManagerPropertyStatus('property-1', action);
            assert.equal(result.error, null, action);
            assert.equal(result.data?.id, 'property-1');
        }
    });

    assert.deepEqual(requests.map((request) => request.method), ['PUT', 'PUT', 'PUT']);
    assert.deepEqual(requests.map((request) => request.body), [{ action: 'unpublish' }, { action: 'republish' }, { action: 'mark_sold' }]);
    for (const request of requests) {
        assert.match(request.url, /\/api\/v1\/properties\/property-1\/manager-status$/);
    }
});

test("a refusal for open bookings hands back core's code, message and counts", async () => {
    await withFetch(async () => json({
        success: false,
        code: PROPERTY_ACTIVE_BOOKING_WORK_CODE,
        error: 'This property cannot be unpublished while it has active bookings (1 active Fast Track case, 2 upcoming viewings). Finish or cancel them first.',
        data: { fast_track_cases: 1, upcoming_viewings: 2, open_applications: 0, ignored: 'text' },
    }, 409), async () => {
        const result = await updateManagerPropertyStatus('property-1', 'unpublish');
        assert.equal(result.data, null);
        assert.equal(result.status, 409);
        assert.equal(result.code, PROPERTY_ACTIVE_BOOKING_WORK_CODE);
        assert.match(result.error ?? '', /1 active Fast Track case, 2 upcoming viewings/);
        assert.deepEqual(result.activeWork, { fast_track_cases: 1, upcoming_viewings: 2 });
    });
});

test('a 503 and a dropped connection are told apart', async () => {
    await withFetch(async () => json({ success: false, code: BOOKING_ACTIVITY_UNAVAILABLE_CODE, error: 'We could not confirm this property has no active bookings. Please try again shortly.' }, 503), async () => {
        const result = await updateManagerPropertyStatus('property-1', 'mark_sold');
        assert.equal(result.status, 503);
        assert.equal(result.code, BOOKING_ACTIVITY_UNAVAILABLE_CODE);
        assert.equal(result.activeWork, undefined);
    });

    await withFetch(async () => { throw new TypeError('Failed to fetch'); }, async () => {
        const result = await updateManagerPropertyStatus('property-1', 'mark_sold');
        assert.equal(result.data, null);
        assert.equal(result.status, undefined, 'no answer: the caller must not claim nothing changed');
    });
});

test('an accepted change drops the cached detail so the next read is fresh', async () => {
    let reads = 0;
    await withFetch(async (_url, init) => {
        if (init?.method === 'PUT') {
            return json({ success: true, data: { id: 'property-9', status: 'draft' } });
        }
        reads += 1;
        return json({ success: true, data: { id: 'property-9', status: reads === 1 ? 'published' : 'draft' } });
    }, async () => {
        assert.equal((await getPropertyById('property-9')).data?.status, 'published');
        assert.equal((await getPropertyById('property-9')).data?.status, 'published', 'cached');
        assert.equal((await updateManagerPropertyStatus('property-9', 'unpublish')).error, null);
        assert.equal((await getPropertyById('property-9')).data?.status, 'draft', 'a fresh server read after the change');
    });
});
