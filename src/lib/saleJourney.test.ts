import test from 'node:test';
import assert from 'node:assert/strict';

import {
    canWithdrawApplicationRecord,
    getNextSaleJourneyActions,
    getSaleJourneyProgress,
    getSaleJourneySummary,
    getSaleJourneyStageLabel,
    resolveSaleJourneyDisplayStage,
    saleProgressionStageForStatus,
    shouldUseSaleProgressionStatusUpdate,
} from './saleJourney';

test('sale progression status mapping targets the backend stage names', () => {
    assert.equal(saleProgressionStageForStatus('offer_under_review'), 'offer_under_review');
    assert.equal(saleProgressionStageForStatus('sale_agreed'), 'sale_agreed');
    assert.equal(saleProgressionStageForStatus('completed'), 'completion');
    assert.equal(saleProgressionStageForStatus('withdrawn'), null);
});

test('sale progression status updates stay on purchase journeys and skip rent applications', () => {
    assert.equal(
        shouldUseSaleProgressionStatusUpdate({ source: 'sale_progression', listingType: 'sale' }, 'completed'),
        true,
    );
    assert.equal(
        shouldUseSaleProgressionStatusUpdate({ listingType: 'sale' }, 'completed'),
        true,
    );
    assert.equal(
        shouldUseSaleProgressionStatusUpdate({ listingType: 'rent' }, 'completed'),
        false,
    );
    assert.equal(
        shouldUseSaleProgressionStatusUpdate({ listingType: 'rent' }, 'approved'),
        false,
    );
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

test('sale display helpers surface buyer qualification and offer-ready stages before a sale progression exists', () => {
    const buyerQualificationRecord = {
        source: 'application',
        status: 'under_review',
        liveStage: 'buyer_qualification',
    };
    const offerReadyRecord = {
        source: 'application',
        status: 'under_review',
        liveStage: 'offer',
    };

    assert.equal(resolveSaleJourneyDisplayStage(buyerQualificationRecord), 'buyer_qualification');
    assert.equal(getSaleJourneyStageLabel(buyerQualificationRecord), 'Buyer qualification');
    assert.equal(getSaleJourneySummary('buyer_qualification'), 'Verify proof of funds or MIP, then clear AML before the offer lane opens.');
    assert.equal(getSaleJourneyProgress(buyerQualificationRecord), 40);

    assert.equal(resolveSaleJourneyDisplayStage(offerReadyRecord), 'offer');
    assert.equal(getSaleJourneyStageLabel(offerReadyRecord), 'Offer ready');
    assert.equal(getSaleJourneySummary('offer'), 'Buyer qualification and AML are complete, so the offer can now be recorded and reviewed.');
    assert.equal(getSaleJourneyProgress(offerReadyRecord), 52);
});

test('sale display helpers treat offer_ready as the offer stage even without liveStage', () => {
    const offerReadyStatusRecord = {
        source: 'application',
        status: 'offer_ready',
    };

    assert.equal(resolveSaleJourneyDisplayStage(offerReadyStatusRecord), 'offer');
    assert.equal(getSaleJourneyStageLabel(offerReadyStatusRecord), 'Offer ready');
    assert.equal(getSaleJourneyProgress(offerReadyStatusRecord), 52);
});
