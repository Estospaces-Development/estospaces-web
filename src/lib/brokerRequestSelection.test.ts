import test from 'node:test';
import assert from 'node:assert/strict';

import type { BrokerRequestRecord } from '@/services/leadsService';
import { selectPrimaryBrokerRequest } from '@/lib/brokerRequestSelection';

const makeRequest = (overrides: Partial<BrokerRequestRecord>): BrokerRequestRecord => ({
    id: overrides.id || 'request-id',
    request_type: overrides.request_type || 'buy',
    location: overrides.location || 'Downtown',
    status: overrides.status || 'open',
    dispatch_status: overrides.dispatch_status || 'wave_1',
    created_at: overrides.created_at || '2026-03-25T09:00:00.000Z',
    updated_at: overrides.updated_at || '2026-03-25T09:00:00.000Z',
    ...overrides,
});

test('selectPrimaryBrokerRequest prefers the most recent active workspace over older matched ones', () => {
    const selected = selectPrimaryBrokerRequest([
        makeRequest({
            id: 'matched-older',
            status: 'matched',
            dispatch_status: 'broker_matched',
            created_at: '2026-03-25T09:05:00.000Z',
            updated_at: '2026-03-25T09:05:00.000Z',
        }),
        makeRequest({
            id: 'active-newer',
            status: 'open',
            dispatch_status: 'wave_2',
            created_at: '2026-03-25T09:10:00.000Z',
            updated_at: '2026-03-25T09:10:00.000Z',
        }),
    ]);

    assert.equal(selected?.id, 'active-newer');
});

test('selectPrimaryBrokerRequest keeps the newest matched request when it is the latest relevant workspace', () => {
    const selected = selectPrimaryBrokerRequest([
        makeRequest({
            id: 'older-active',
            status: 'open',
            dispatch_status: 'wave_1',
            created_at: '2026-03-25T09:00:00.000Z',
            updated_at: '2026-03-25T09:00:00.000Z',
        }),
        makeRequest({
            id: 'matched-newer',
            status: 'matched',
            dispatch_status: 'broker_matched',
            created_at: '2026-03-25T09:12:00.000Z',
            updated_at: '2026-03-25T09:12:00.000Z',
        }),
    ]);

    assert.equal(selected?.id, 'matched-newer');
});

test('selectPrimaryBrokerRequest does not let an older shared portfolio overtake the newest matched request', () => {
    const selected = selectPrimaryBrokerRequest([
        makeRequest({
            id: 'portfolio-older',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' } as any],
            created_at: '2026-03-24T09:00:00.000Z',
            updated_at: '2026-03-25T09:36:36.326451Z',
        }),
        makeRequest({
            id: 'matched-newest',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'awaiting_portfolio',
            created_at: '2026-03-25T09:34:23.229227Z',
            updated_at: '2026-03-25T09:36:36.318018Z',
        }),
    ]);

    assert.equal(selected?.id, 'matched-newest');
});

test('selectPrimaryBrokerRequest falls back to expired requests only when nothing else remains', () => {
    const selected = selectPrimaryBrokerRequest([
        makeRequest({
            id: 'cancelled',
            status: 'cancelled',
            updated_at: '2026-03-25T09:12:00.000Z',
        }),
        makeRequest({
            id: 'expired',
            status: 'expired',
            dispatch_status: 'expired',
            updated_at: '2026-03-25T09:11:00.000Z',
        }),
    ]);

    assert.equal(selected?.id, 'expired');
});

test('selectPrimaryBrokerRequest honors an explicitly selected request id when one is provided', () => {
    const selected = selectPrimaryBrokerRequest(
        [
            makeRequest({
                id: 'newer-active',
                status: 'open',
                dispatch_status: 'wave_2',
                updated_at: '2026-03-25T09:20:00.000Z',
            }),
            makeRequest({
                id: 'explicit-workspace',
                status: 'matched',
                dispatch_status: 'broker_matched',
                updated_at: '2026-03-25T09:10:00.000Z',
            }),
        ],
        'explicit-workspace',
    );

    assert.equal(selected?.id, 'explicit-workspace');
});
