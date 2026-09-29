import assert from 'node:assert/strict';
import test from 'node:test';

import {
    filterBrokerRequestsByListStatus,
    getBrokerRequestListStatus,
    getBrokerRequestTrackingSummary,
} from '@/lib/applicationTracking';
import { buildConversationBrokerRequestPath } from '@/lib/messagesInbox';

test('agent request history groups requests as active, expired or closed', () => {
    assert.equal(getBrokerRequestListStatus({ status: 'submitted', dispatch_status: 'matching_wave_1' }), 'active');
    assert.equal(getBrokerRequestListStatus({ status: 'matched', dispatch_status: 'broker_matched' }), 'active');
    assert.equal(getBrokerRequestListStatus({ status: 'expired', dispatch_status: 'expired' }), 'expired');
    assert.equal(getBrokerRequestListStatus({ status: 'submitted', dispatch_status: 'expired' }), 'expired');
    assert.equal(getBrokerRequestListStatus({ status: 'cancelled', dispatch_status: '' }), 'closed');
});

test('an expired request never reads as live or still searching', () => {
    const summary = getBrokerRequestTrackingSummary({ status: 'expired', dispatch_status: 'expired', dispatch_wave: 2, dispatched_broker_count: 3 });
    assert.equal(summary.currentStage, 'Request expired');
    assert.equal(summary.progress, 0);
    assert.doesNotMatch(summary.nextAction, /wait|track/i);
});

test('a request whose home was selected keeps its selected stage after closing', () => {
    const summary = getBrokerRequestTrackingSummary({ status: 'completed', dispatch_status: 'broker_matched', selected_property_id: 'home-1' });
    assert.equal(summary.currentStage, 'Property Selected');
});

test('the status filter shows all requests by default and narrows on request', () => {
    const items = [
        { id: 'expired-original', requestStatus: 'expired' as const },
        { id: 'active-retry', requestStatus: 'active' as const },
        { id: 'cancelled', requestStatus: 'closed' as const },
    ];
    assert.deepEqual(filterBrokerRequestsByListStatus(items, 'all').map((item) => item.id), ['expired-original', 'active-retry', 'cancelled']);
    assert.deepEqual(filterBrokerRequestsByListStatus(items, 'active').map((item) => item.id), ['active-retry']);
    assert.deepEqual(filterBrokerRequestsByListStatus(items, 'expired').map((item) => item.id), ['expired-original']);
    assert.deepEqual(filterBrokerRequestsByListStatus(items, 'closed').map((item) => item.id), ['cancelled']);
});

test('a request-scoped conversation links back to the request only for the requesting user', () => {
    const requestId = '6ab09306-fea4-467e-9e52-f77266a3ca63';
    assert.equal(
        buildConversationBrokerRequestPath(requestId, 'user'),
        `/user/dashboard?workspace=broker-request&request=${requestId}#broker-request-workspace`,
    );
    assert.equal(buildConversationBrokerRequestPath(requestId, 'manager'), null);
    assert.equal(buildConversationBrokerRequestPath(requestId, 'admin'), null);
    assert.equal(buildConversationBrokerRequestPath(requestId, undefined), null);
    assert.equal(buildConversationBrokerRequestPath('', 'user'), null);
});
