import test from 'node:test';
import assert from 'node:assert/strict';

import type { BrokerRequestRecord } from '@/services/leadsService';
import {
    dedupeBrokerRequestsBySubmissionSignature,
    selectAutoResumeBrokerRequest,
    selectPrimaryBrokerRequest,
    selectPrimaryBrokerRequestBy,
    shouldAutoResumeBrokerRequest,
    sortBrokerRequestsByPriority,
} from '@/lib/brokerRequestSelection';

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

test('selectPrimaryBrokerRequestBy keeps the newest selected workspace instead of the first array match', () => {
    const selected = selectPrimaryBrokerRequestBy(
        [
            makeRequest({
                id: 'selected-older',
                status: 'matched',
                dispatch_status: 'broker_matched',
                handoff_status: 'property_selected',
                selected_property_id: 'property-1',
                created_at: '2026-03-25T09:10:00.000Z',
                updated_at: '2026-03-25T09:10:00.000Z',
            }),
            makeRequest({
                id: 'selected-newer',
                status: 'matched',
                dispatch_status: 'broker_matched',
                handoff_status: 'property_selected',
                selected_property_id: 'property-2',
                created_at: '2026-03-25T09:20:00.000Z',
                updated_at: '2026-03-25T09:20:00.000Z',
            }),
        ],
        (request) => request.handoff_status === 'property_selected' || Boolean(request.selected_property_id),
    );

    assert.equal(selected?.id, 'selected-newer');
});

test('shouldAutoResumeBrokerRequest excludes property-selected requests from plain dashboard restore', () => {
    const selectedRequest = makeRequest({
        id: 'selected-request',
        status: 'matched',
        dispatch_status: 'broker_matched',
        handoff_status: 'property_selected',
        selected_property_id: 'property-1',
        selected_fast_track_case_id: 'case-1',
    });

    assert.equal(shouldAutoResumeBrokerRequest(selectedRequest), false);
});

test('selectAutoResumeBrokerRequest skips selected-property handoff requests and keeps the active dashboard workspace', () => {
    const selected = selectAutoResumeBrokerRequest([
        makeRequest({
            id: 'selected-property',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
            updated_at: '2026-03-25T09:30:00.000Z',
        }),
        makeRequest({
            id: 'portfolio-shared',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' } as any],
            updated_at: '2026-03-25T09:20:00.000Z',
        }),
    ]);

    assert.equal(selected?.id, 'portfolio-shared');
});

test('selectAutoResumeBrokerRequest returns null when only archived or handed-off requests remain', () => {
    const selected = selectAutoResumeBrokerRequest([
        makeRequest({
            id: 'selected-property',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
        }),
        makeRequest({
            id: 'expired-request',
            status: 'expired',
            dispatch_status: 'expired',
        }),
        makeRequest({
            id: 'archived-request',
            status: 'matched',
            handoff_status: 'archived',
        }),
    ]);

    assert.equal(selected, null);
});

test('selectAutoResumeBrokerRequest skips closed broker requests', () => {
    const selected = selectAutoResumeBrokerRequest([
        makeRequest({
            id: 'closed-request',
            status: 'closed',
            dispatch_status: 'broker_matched',
            updated_at: '2026-03-25T09:30:00.000Z',
        }),
        makeRequest({
            id: 'dispatch-closed-request',
            status: 'matched',
            dispatch_status: 'closed',
            updated_at: '2026-03-25T09:20:00.000Z',
        }),
    ]);

    assert.equal(selected, null);
});

test('dedupeBrokerRequestsBySubmissionSignature collapses duplicate matched workspaces for the same submitted request', () => {
    const deduped = dedupeBrokerRequestsBySubmissionSignature([
        makeRequest({
            id: 'workspace-f859c836',
            user_id: 'user-duplicate',
            request_type: 'rent',
            location: 'Chennai',
            location_postcode: '600001',
            budget: '650000',
            details: 'Need a Chennai rental quickly',
            status: 'matched',
            dispatch_status: 'broker_matched',
            matched_broker_id: 'manager-1',
            created_at: '2026-07-08T02:46:12.000Z',
            updated_at: '2026-07-08T02:46:20.000Z',
        }),
        makeRequest({
            id: 'workspace-e1a73164',
            user_id: 'user-duplicate',
            request_type: ' rent ',
            location: ' chennai ',
            location_postcode: '600 001',
            budget: ' 650000 ',
            details: ' Need a Chennai rental quickly ',
            status: 'matched',
            dispatch_status: 'broker_matched',
            matched_broker_id: 'manager-1',
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' } as any],
            created_at: '2026-07-08T02:46:42.000Z',
            updated_at: '2026-07-08T02:47:00.000Z',
        }),
    ]);

    assert.deepEqual(deduped.map((request) => request.id), ['workspace-e1a73164']);
});

test('dedupeBrokerRequestsBySubmissionSignature keeps separate users with the same request area visible', () => {
    const deduped = dedupeBrokerRequestsBySubmissionSignature([
        makeRequest({
            id: 'first-client-workspace',
            user_id: 'first-user',
            request_type: 'rent',
            location: 'Chennai',
            location_postcode: '600001',
            budget: '650000',
            details: 'Need a Chennai rental quickly',
            created_at: '2026-07-08T02:46:12.000Z',
        }),
        makeRequest({
            id: 'second-client-workspace',
            user_id: 'second-user',
            request_type: 'rent',
            location: 'Chennai',
            location_postcode: '600001',
            budget: '650000',
            details: 'Need a Chennai rental quickly',
            created_at: '2026-07-08T02:46:25.000Z',
        }),
    ]);

    assert.deepEqual(deduped.map((request) => request.id), ['second-client-workspace', 'first-client-workspace']);
});

test('dedupeBrokerRequestsBySubmissionSignature collapses parallel workspaces for the same client and selected property', () => {
    const deduped = dedupeBrokerRequestsBySubmissionSignature([
        makeRequest({
            id: 'selected-four-minutes-earlier',
            user_id: 'user-parallel',
            matched_broker_id: 'manager-1',
            selected_property_id: 'property-1',
            details: 'First search details',
            created_at: '2026-08-21T17:56:13.000Z',
        }),
        makeRequest({
            id: 'selected-four-minutes-later',
            user_id: 'user-parallel',
            matched_broker_id: 'manager-1',
            selected_property_id: 'property-1',
            details: 'Different request details',
            created_at: '2026-08-21T18:00:21.000Z',
        }),
    ]);

    assert.deepEqual(deduped.map((request) => request.id), ['selected-four-minutes-later']);
});
test('sortBrokerRequestsByPriority keeps the newest matched workspace ahead of older ones', () => {
    const sorted = sortBrokerRequestsByPriority([
        makeRequest({
            id: 'matched-older',
            status: 'matched',
            dispatch_status: 'broker_matched',
            created_at: '2026-03-25T09:10:00.000Z',
            updated_at: '2026-03-25T09:10:00.000Z',
        }),
        makeRequest({
            id: 'matched-newer',
            status: 'matched',
            dispatch_status: 'broker_matched',
            created_at: '2026-03-25T09:30:00.000Z',
            updated_at: '2026-03-25T09:30:00.000Z',
        }),
    ]);

    assert.deepEqual(sorted.map((request) => request.id), ['matched-newer', 'matched-older']);
});
