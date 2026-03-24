import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getBrokerRequestTrackingSummary,
    isLiveBrokerRequest,
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
            totalStages: 3,
            progress: 34,
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
            totalStages: 3,
            progress: 67,
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
            totalStages: 3,
            progress: 100,
            nextAction: 'Open broker workspace',
        },
    );
});
