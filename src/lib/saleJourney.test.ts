import test from 'node:test';
import assert from 'node:assert/strict';

import {
    canWithdrawApplicationRecord,
    getNextSaleJourneyActions,
    getSaleJourneySummary,
    saleProgressionStageForStatus,
} from './saleJourney';

test('sale progression status mapping targets the backend stage names', () => {
    assert.equal(saleProgressionStageForStatus('offer_under_review'), 'offer_under_review');
    assert.equal(saleProgressionStageForStatus('sale_agreed'), 'sale_agreed');
    assert.equal(saleProgressionStageForStatus('completed'), 'completion');
    assert.equal(saleProgressionStageForStatus('withdrawn'), null);
});

test('sale journey actions expose the next manager-facing progression step', () => {
    assert.deepEqual(getNextSaleJourneyActions('offer_submitted'), [
        {
            status: 'offer_under_review',
            label: 'Start Offer Review',
            description: 'Move this purchase into active offer review.',
        },
    ]);
    assert.deepEqual(getNextSaleJourneyActions('exchange'), [
        {
            status: 'completed',
            label: 'Complete Sale',
            description: 'Close the journey once the purchase handover is complete.',
        },
    ]);
    assert.deepEqual(getNextSaleJourneyActions('completed'), []);
});

test('sale journey helpers block withdraw actions for live purchase progressions', () => {
    assert.equal(canWithdrawApplicationRecord({ source: 'sale_progression', status: 'conveyancing' }), false);
    assert.equal(canWithdrawApplicationRecord({ source: 'application', status: 'under_review' }), true);
    assert.equal(canWithdrawApplicationRecord({ source: 'application', status: 'approved' }), false);
});

test('sale journey summary prefers explicit copy and falls back to transparent defaults', () => {
    assert.equal(
        getSaleJourneySummary('conveyancing'),
        'Legal work, searches, and supporting documents are actively in progress.',
    );
    assert.equal(
        getSaleJourneySummary('sale_agreed', 'Broker confirmed the deal and is preparing the memo.'),
        'Broker confirmed the deal and is preparing the memo.',
    );
});
