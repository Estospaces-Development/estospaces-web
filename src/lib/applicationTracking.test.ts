import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getStableActivityTimestamp,
    getBrokerRequestTrackingSummary,
    hasStableActivityTimestamp,
    isLiveBrokerRequest,
    parseActivityTimestamp,
} from './applicationTracking';

test('live broker requests stay visible until they expire', () => {
    assert.equal(
        isLiveBrokerRequest({
            status: 'submitted',
            dispatch_status: 'matching',
        }),
        true,
    );

    assert.equal(
        isLiveBrokerRequest({
            status: 'expired',
            dispatch_status: 'expired',
        }),
        false,
    );
});

test('closed broker requests are not shown as live dashboard requests', () => {
    assert.equal(
        isLiveBrokerRequest({
            status: 'closed',
            dispatch_status: 'broker_matched',
        }),
        false,
    );

    assert.equal(
        isLiveBrokerRequest({
            status: 'matched',
            dispatch_status: 'closed',
        }),
        false,
    );
});

test('broker request tracking summary reflects matching progress', () => {
    assert.deepEqual(
        getBrokerRequestTrackingSummary({
            status: 'submitted',
            dispatch_status: 'matching',
            dispatch_wave: 1,
        }),
        {
            currentStage: 'Request Sent',
            currentStageNumber: 1,
            totalStages: 5,
            progress: 20,
            nextAction: 'Wait for broker responses',
        },
    );

    assert.deepEqual(
        getBrokerRequestTrackingSummary({
            status: 'submitted',
            dispatch_status: 'matching',
            dispatch_wave: 2,
        }),
        {
            currentStage: 'Nearby Brokers Pinged',
            currentStageNumber: 2,
            totalStages: 5,
            progress: 40,
            nextAction: 'Track broker responses',
        },
    );

    assert.deepEqual(
        getBrokerRequestTrackingSummary({
            status: 'matched',
            dispatch_status: 'broker_matched',
            dispatch_wave: 2,
            matched_broker: { id: 'broker-1', name: 'Broker Jane' },
        }),
        {
            currentStage: 'Broker Matched',
            currentStageNumber: 3,
            totalStages: 5,
            progress: 60,
            nextAction: 'Wait for property options',
        },
    );

    assert.deepEqual(
        getBrokerRequestTrackingSummary({
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' }],
        } as any),
        {
            currentStage: 'Properties Shared',
            currentStageNumber: 4,
            totalStages: 5,
            progress: 80,
            nextAction: 'Choose a property',
        },
    );

    assert.deepEqual(
        getBrokerRequestTrackingSummary({
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
            selected_fast_track_case_id: 'case-1',
        }),
        {
            currentStage: 'Property Selected',
            currentStageNumber: 5,
            totalStages: 5,
            progress: 100,
            nextAction: 'Open live fast-track',
        },
    );
});

test('activity timestamps use record timestamps instead of the current clock', () => {
    const first = getStableActivityTimestamp('2026-03-25T09:05:00.000Z');
    const second = getStableActivityTimestamp('2026-03-25T09:10:00.000Z');

    assert.equal(first.toISOString(), '2026-03-25T09:05:00.000Z');
    assert.equal(second.toISOString(), '2026-03-25T09:10:00.000Z');
    assert.notEqual(first.getTime(), second.getTime());
});

test('activity timestamps stay unavailable when backend dates are missing', () => {
    const timestamp = getStableActivityTimestamp(undefined, null, '');

    assert.equal(timestamp.getTime(), 0);
    assert.equal(hasStableActivityTimestamp(timestamp), false);
});

test('activity timestamp parser ignores invalid values before using fallback record dates', () => {
    const timestamp = parseActivityTimestamp('not-a-date', '2026-03-25T09:15:00.000Z');

    assert.equal(timestamp?.toISOString(), '2026-03-25T09:15:00.000Z');
});
