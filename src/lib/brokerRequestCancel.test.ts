import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getBrokerRequestClosure,
    getBrokerRequestListStatus,
    getBrokerRequestTrackingSummary,
} from '@/lib/applicationTracking';
import { getDispatchWorkspaceSummary } from '@/lib/brokerDispatchPresentation';
import { cancelBrokerRequest, type BrokerRequestRecord } from '@/services/leadsService';

// MB-0313: cancelled and replaced requests read as what the user did, not as an unanswered expiry.
const request = (status: string, dispatchStatus: string): BrokerRequestRecord => ({
    id: 'request-1',
    request_type: 'rent',
    location: 'Westminster',
    status,
    dispatch_status: dispatchStatus,
});

test('closure says why a request stopped searching', () => {
    assert.equal(getBrokerRequestClosure(request('cancelled', 'cancelled')), 'cancelled');
    assert.equal(getBrokerRequestClosure(request('expired', 'superseded')), 'replaced');
    assert.equal(getBrokerRequestClosure(request('expired', 'expired')), 'expired');
    assert.equal(getBrokerRequestClosure(request('submitted', 'matching_wave_1')), null);
    assert.equal(getBrokerRequestClosure(request('matched', 'broker_matched')), null);
    assert.equal(getBrokerRequestClosure(null), null);
});

test('cancelled and replaced requests are closed, not expired', () => {
    assert.equal(getBrokerRequestListStatus(request('cancelled', 'cancelled')), 'closed');
    assert.equal(getBrokerRequestListStatus(request('expired', 'superseded')), 'closed');

    const cancelled = getBrokerRequestTrackingSummary(request('cancelled', 'cancelled'));
    assert.equal(cancelled.currentStage, 'Request cancelled');
    assert.match(cancelled.nextAction, /You cancelled/);

    const replaced = getBrokerRequestTrackingSummary(request('expired', 'superseded'));
    assert.equal(replaced.currentStage, 'Request replaced');
    assert.doesNotMatch(replaced.nextAction, /in time/);
});

test('the request card titles a cancelled or replaced request by what the user did', () => {
    assert.equal(getDispatchWorkspaceSummary(request('cancelled', 'cancelled')).title, 'Request cancelled');
    assert.equal(getDispatchWorkspaceSummary(request('expired', 'superseded')).title, 'Request replaced');
    assert.equal(getDispatchWorkspaceSummary(request('expired', 'expired')).title, 'Request expired');
});

const withFetch = async (status: number, body: Record<string, unknown>, run: () => Promise<void>) => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: String(init?.method || 'GET') });
        return {
            ok: status >= 200 && status < 300,
            status,
            headers: new Headers(),
            text: async () => JSON.stringify(body),
        } as Response;
    }) as typeof fetch;
    try {
        await run();
    } finally {
        globalThis.fetch = originalFetch;
    }
    return calls;
};

test('cancelBrokerRequest posts to the owner cancel route and returns the cancelled request', async () => {
    let result: Awaited<ReturnType<typeof cancelBrokerRequest>> | undefined;
    const calls = await withFetch(200, { success: true, data: request('cancelled', 'cancelled') }, async () => {
        result = await cancelBrokerRequest('request-1');
    });
    assert.deepEqual(calls, [{ url: 'http://localhost:8080/api/v1/leads/broker-request/request-1/cancel', method: 'POST' }]);
    assert.equal(result?.data?.status, 'cancelled');
    assert.equal(result?.unsupported, false);
});

test('cancelBrokerRequest reports an older core without the route as unsupported', async () => {
    let result: Awaited<ReturnType<typeof cancelBrokerRequest>> | undefined;
    await withFetch(403, { success: false, error: 'Access forbidden: insufficient permissions' }, async () => {
        result = await cancelBrokerRequest('request-1');
    });
    assert.equal(result?.data, null);
    assert.equal(result?.unsupported, true);
});

test('cancelBrokerRequest keeps the control when the request is not found', async () => {
    let result: Awaited<ReturnType<typeof cancelBrokerRequest>> | undefined;
    await withFetch(404, { success: false, error: 'broker request not found' }, async () => {
        result = await cancelBrokerRequest('request-1');
    });
    assert.equal(result?.unsupported, false);
    assert.match(result?.error || '', /not found/);
});

test('cancelBrokerRequest keeps the control when the request can no longer be cancelled', async () => {
    let result: Awaited<ReturnType<typeof cancelBrokerRequest>> | undefined;
    await withFetch(409, { success: false, error: 'only a live request that no manager has accepted can be cancelled' }, async () => {
        result = await cancelBrokerRequest('request-1');
    });
    assert.equal(result?.unsupported, false);
    assert.match(result?.error || '', /can be cancelled/);
});
