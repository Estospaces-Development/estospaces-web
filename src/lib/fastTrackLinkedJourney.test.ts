import test from 'node:test';
import assert from 'node:assert/strict';

import type { FastTrackCase } from '../services/fastTrackService';
import {
    resolveFastTrackLinkedJourney,
    resolveFastTrackPrimaryLaneLabel,
} from './fastTrackLinkedJourney';

const rentCase: FastTrackCase = {
    caseId: 'case-rent-1',
    id: 'case-rent-1',
    propertyId: 'property-1',
    propertyTitle: 'River Walk',
    propertyType: 'rent',
    clientName: 'Test User',
    clientId: 'user-1',
    managerId: 'manager-1',
    submittedAt: '2026-03-25T08:00:00Z',
    hoursRemaining: 21,
    currentStep: 'application_in_review',
    documents: {
        identityProof: 'verified',
        addressProof: 'verified',
    },
    finalStatus: 'in_progress',
    journeyType: 'rent',
    journeySource: 'broker_request_selection',
    journeyStage: 'application_review',
    nextAction: 'Review application',
    nextActionTarget: 'application',
    statusReason: 'The tenancy application is now under review.',
    blockingRequirements: [],
    pendingRequirements: [],
    completedRequirements: ['Identity proof', 'Address proof'],
};

const buyCase: FastTrackCase = {
    ...rentCase,
    caseId: 'case-buy-1',
    id: 'case-buy-1',
    propertyId: 'property-2',
    propertyTitle: 'Market Lane',
    propertyType: 'buy',
    journeyType: 'buy',
    journeyStage: 'offer_review',
};

test('resolveFastTrackLinkedJourney links rent workflow records through fast-track, application, and contract references', () => {
    const linked = resolveFastTrackLinkedJourney(rentCase, {
        applications: [
            {
                id: 'app-1',
                property_id: 'property-1',
                user_id: 'user-1',
                broker_request_id: 'request-1',
                lead_id: 'lead-1',
                fast_track_case_id: 'case-rent-1',
                status: 'approved',
                move_in_date: '2026-04-01',
                created_at: '2026-03-25T08:30:00Z',
                updated_at: '2026-03-25T10:00:00Z',
            },
        ],
        viewings: [
            {
                id: 'viewing-1',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-1',
                application_id: 'app-1',
                scheduled_at: '2026-03-26T09:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-25T09:00:00Z',
            },
        ],
        contracts: [
            {
                id: 'contract-1',
                application_id: 'app-1',
                fast_track_case_id: 'case-rent-1',
                property_id: 'property-1',
                manager_id: 'manager-1',
                user_id: 'user-1',
                status: 'pending_user_signature',
                created_at: '2026-03-25T11:00:00Z',
                updated_at: '2026-03-25T11:30:00Z',
            },
        ],
        payments: [
            {
                id: 'payment-1',
                user_id: 'user-1',
                application_id: 'app-1',
                amount: 1200,
                currency: 'GBP',
                status: 'pending',
                payment_method: 'card',
                payment_type: 'holding_deposit',
                created_at: '2026-03-25T12:00:00Z',
                description: 'Holding deposit',
            },
        ],
        invoices: [
            {
                id: 'invoice-1',
                user_id: 'user-1',
                application_id: 'app-1',
                amount: 1200,
                currency: 'GBP',
                status: 'open',
                due_date: '2026-03-30',
                payment_type: 'holding_deposit',
                created_at: '2026-03-25T12:05:00Z',
            },
        ],
    });

    assert.equal(linked.application?.id, 'app-1');
    assert.equal(linked.viewing?.id, 'viewing-1');
    assert.equal(linked.contract?.id, 'contract-1');
    assert.equal(linked.payments.length, 1);
    assert.equal(linked.invoices.length, 1);
    assert.match(linked.primaryHeadline, /Deposit and first-rent tasks/i);
    assert.match(linked.nextStep, /billing workspace/i);
});

test('resolveFastTrackLinkedJourney prefers backend journey-state copy, blockers, and deadlines when available', () => {
    const linked = resolveFastTrackLinkedJourney({
        ...rentCase,
        liveStage: 'right_to_rent_or_national_compliance',
        journeyStatusReason: 'Right to Rent still needs to be cleared before approval.',
        blockers: [
            {
                code: 'right_to_rent',
                title: 'Right to Rent still required',
                description: 'Complete the England Right to Rent check before approval.',
            },
        ],
        deadlines: [
            {
                code: 'rtr_follow_up',
                label: 'Right to Rent follow-up',
                due_at: '2026-03-29T09:00:00Z',
                status: 'scheduled',
            },
        ],
        nextActions: [
            {
                code: 'review_application',
                label: 'Open applications',
                description: 'Finish the Right to Rent review in the applications workspace.',
            },
        ],
    }, {
        applications: [
            {
                id: 'app-rtr-1',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-1',
                status: 'under_review',
                move_in_date: '2026-04-01',
                created_at: '2026-03-25T08:30:00Z',
                updated_at: '2026-03-25T10:00:00Z',
                liveStage: 'right_to_rent_or_national_compliance',
                journeyStatusReason: 'Right to Rent still needs to be cleared before approval.',
                blockers: [
                    {
                        code: 'right_to_rent',
                        title: 'Right to Rent still required',
                    },
                ],
                deadlines: [
                    {
                        code: 'rtr_follow_up',
                        label: 'Right to Rent follow-up',
                        due_at: '2026-03-29T09:00:00Z',
                        status: 'scheduled',
                    },
                ],
                nextActions: [
                    {
                        code: 'review_application',
                        label: 'Open applications',
                        description: 'Finish the Right to Rent review in the applications workspace.',
                    },
                ],
            } as any,
        ],
    });

    assert.equal(linked.liveStage, 'right_to_rent_or_national_compliance');
    assert.match(linked.primaryHeadline, /Right to Rent/i);
    assert.match(linked.primarySummary, /Right to Rent/i);
    assert.match(linked.nextStep, /applications workspace/i);
    assert.equal(linked.blockers.length, 1);
    assert.equal(linked.deadlines.length, 1);
});

test('resolveFastTrackLinkedJourney prefers the sale progression for buy journeys', () => {
    const linked = resolveFastTrackLinkedJourney(buyCase, {
        applications: [
            {
                id: 'app-buy-1',
                property_id: 'property-2',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-buy-1',
                status: 'viewing_completed',
                move_in_date: '2026-05-01',
                created_at: '2026-03-25T09:00:00Z',
                updated_at: '2026-03-25T09:30:00Z',
            },
        ],
        saleProgressions: [
            {
                id: 'sale-1',
                property_id: 'property-2',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-buy-1',
                current_stage: 'memorandum_issued',
                status: 'active',
                notes: 'The memorandum is issued and solicitors are now aligned.',
                created_at: '2026-03-25T10:00:00Z',
                updated_at: '2026-03-25T10:30:00Z',
            },
        ],
    });

    assert.equal(linked.saleProgression?.id, 'sale-1');
    assert.equal(linked.contract, null);
    assert.match(linked.primaryHeadline, /Memorandum issued/i);
    assert.match(linked.primarySummary, /memorandum/i);
    assert.equal(resolveFastTrackPrimaryLaneLabel(buyCase.journeyType, linked), 'Memorandum Issued');
});

test('resolveFastTrackLinkedJourney keeps buy cases in the viewing lane until a viewing exists', () => {
    const linked = resolveFastTrackLinkedJourney(buyCase, {
        applications: [
            {
                id: 'app-buy-pending',
                property_id: 'property-2',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-buy-1',
                status: 'submitted',
                move_in_date: '2026-05-01',
                created_at: '2026-03-25T09:00:00Z',
                updated_at: '2026-03-25T09:30:00Z',
            },
        ],
    });

    assert.match(linked.primaryHeadline, /Viewing not scheduled/i);
    assert.match(linked.primarySummary, /viewing still needs to be booked/i);
    assert.match(linked.nextStep, /viewings workspace/i);
});

test('resolveFastTrackLinkedJourney falls back to property and user matching when direct ids are missing', () => {
    const linked = resolveFastTrackLinkedJourney(rentCase, {
        applications: [
            {
                id: 'app-stale',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                status: 'submitted',
                move_in_date: '2026-03-31',
                created_at: '2026-03-25T07:00:00Z',
                updated_at: '2026-03-25T07:30:00Z',
            },
            {
                id: 'app-current',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                status: 'under_review',
                move_in_date: '2026-04-05',
                created_at: '2026-03-25T08:00:00Z',
                updated_at: '2026-03-25T09:00:00Z',
            },
        ],
    });

    assert.equal(linked.application?.id, 'app-current');
    assert.match(linked.primaryHeadline, /Referencing|Application/i);
});

test('resolveFastTrackLinkedJourney lets the real viewing outcome override stale application viewing copy', () => {
    const linked = resolveFastTrackLinkedJourney({
        ...rentCase,
        currentStep: 'viewing_scheduled',
    }, {
        applications: [
            {
                id: 'app-viewing-stale',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-1',
                status: 'viewing_scheduled',
                liveStage: 'viewing_scheduled',
                journeyStatusReason: 'A live viewing is booked and still needs an outcome before the regulated tenancy lane can continue.',
                created_at: '2026-03-25T09:00:00Z',
                updated_at: '2026-03-25T10:00:00Z',
            } as any,
        ],
        viewings: [
            {
                id: 'viewing-completed',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-1',
                application_id: 'app-viewing-stale',
                scheduled_at: '2026-03-26T09:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'completed',
                created_at: '2026-03-25T09:30:00Z',
            },
        ],
    });

    assert.equal(linked.liveStage, 'viewing_completed');
    assert.equal(resolveFastTrackPrimaryLaneLabel(rentCase.journeyType, linked), 'Viewing completed');
    assert.match(linked.primaryHeadline, /Referencing and Right to Rent/i);
    assert.match(linked.primarySummary, /viewing is complete/i);
    assert.match(linked.nextStep, /applications workspace/i);
});

test('resolveFastTrackLinkedJourney prefers exact fast-track matches over newer loose property matches', () => {
    const linked = resolveFastTrackLinkedJourney(rentCase, {
        applications: [
            {
                id: 'app-exact',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-1',
                status: 'documents_requested',
                move_in_date: '2026-04-05',
                created_at: '2026-03-25T08:00:00Z',
                updated_at: '2026-03-25T09:00:00Z',
                liveStage: 'documents_requested',
            } as any,
            {
                id: 'app-loose-newer',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                fast_track_case_id: 'case-rent-2',
                status: 'submitted',
                move_in_date: '2026-04-06',
                created_at: '2026-03-25T08:30:00Z',
                updated_at: '2026-03-25T10:00:00Z',
                liveStage: 'property_selected',
            } as any,
        ],
    });

    assert.equal(linked.application?.id, 'app-exact');
    assert.equal(resolveFastTrackPrimaryLaneLabel(rentCase.journeyType, linked), 'Documents requested');
});
