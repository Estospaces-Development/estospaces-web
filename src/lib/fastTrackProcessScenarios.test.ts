import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDocumentsFromDetails,
    buildVerificationSummary,
    canRequestLeadDocuments,
    deriveLiveFastTrackCurrentStep,
    deriveLiveFastTrackDocumentPhase,
} from './fastTrackWorkflow';
import {
    buildUserFastTrackDocumentItems,
    getOutstandingDocumentNames,
    resolveUserFastTrackSelection,
} from './userFastTrack';

const pendingDocuments = {
    identityProof: 'pending',
    addressProof: 'pending',
} as const;

const verifiedDocuments = {
    identityProof: 'verified',
    addressProof: 'verified',
} as const;

test('fast-track document flow covers selection, request, upload, and approval for a user case', () => {
    assert.equal(
        resolveUserFastTrackSelection(
            [
                { caseId: 'case-1', leadId: 'lead-1' },
                { caseId: 'case-2', leadId: 'lead-2' },
            ],
            null,
            'lead-1',
            null,
        ),
        'case-1',
    );

    const liveLead = {
        user_id: 'user-1',
        status: 'broker_responded',
        dispatch_status: 'broker_matched',
        documents_requested: false,
        documents_uploaded: false,
        documents_verified: false,
    };

    assert.equal(canRequestLeadDocuments(liveLead), true);

    const requestedItems = buildUserFastTrackDocumentItems(pendingDocuments, [], {
        requestActive: true,
    });

    assert.deepEqual(
        getOutstandingDocumentNames(requestedItems),
        ['Identity proof', 'Address proof'],
    );

    const uploadedDocuments = [
        {
            lead_id: 'lead-1',
            document_category: 'identity',
            status: 'under_review',
            file_name: 'passport.pdf',
            created_at: '2026-04-03T09:00:00Z',
            updated_at: '2026-04-03T09:00:00Z',
        },
        {
            lead_id: 'lead-1',
            document_category: 'address',
            status: 'under_review',
            file_name: 'utility-bill.pdf',
            created_at: '2026-04-03T09:05:00Z',
            updated_at: '2026-04-03T09:05:00Z',
        },
    ];

    assert.equal(
        deriveLiveFastTrackDocumentPhase(uploadedDocuments, pendingDocuments, {
            currentStep: 'documents_requested',
        }),
        'uploaded_under_review',
    );

    assert.equal(
        buildVerificationSummary(
            null,
            {
                ...liveLead,
                documents_requested: true,
                documents_uploaded: true,
            },
            buildDocumentsFromDetails(uploadedDocuments, pendingDocuments),
        ),
        'Files uploaded and awaiting review',
    );

    const approvedDocuments = uploadedDocuments.map((document) => ({
        ...document,
        status: 'approved',
        updated_at: '2026-04-03T10:00:00Z',
    }));

    assert.deepEqual(
        buildDocumentsFromDetails(approvedDocuments, pendingDocuments),
        verifiedDocuments,
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'documents_requested',
            approvedDocuments,
            pendingDocuments,
        ),
        'documents_verified',
    );
});

test('rent fast-track progression advances from verified documents through billing completion', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep('documents_verified', [], verifiedDocuments, {
            journeyType: 'rent',
            linkedJourney: {
                viewing: { status: 'confirmed' },
            },
        }),
        'viewing_scheduled',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('viewing_scheduled', [], verifiedDocuments, {
            journeyType: 'rent',
            linkedJourney: {
                viewing: { status: 'completed' },
            },
        }),
        'viewing_completed',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('viewing_completed', [], verifiedDocuments, {
            journeyType: 'rent',
            linkedJourney: {
                application: { status: 'referencing' },
            },
        }),
        'application_in_review',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('application_in_review', [], verifiedDocuments, {
            journeyType: 'rent',
            linkedJourney: {
                contract: { status: 'pending_user_signature' },
            },
        }),
        'ready_for_contract',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('ready_for_contract', [], verifiedDocuments, {
            journeyType: 'rent',
            linkedJourney: {
                contract: { status: 'active' },
                payments: [{ status: 'completed', payment_type: 'security_deposit' }],
                invoices: [{ status: 'paid', payment_type: 'first_rent' }],
            },
        }),
        'completed',
    );
});

test('buy fast-track progression stays coherent from viewings to sale completion', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep('documents_verified', [], verifiedDocuments, {
            journeyType: 'buy',
            linkedJourney: {
                viewing: { status: 'confirmed' },
            },
        }),
        'viewing_scheduled',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('viewing_scheduled', [], verifiedDocuments, {
            journeyType: 'buy',
            linkedJourney: {
                viewing: { status: 'completed' },
            },
        }),
        'viewing_completed',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('viewing_completed', [], verifiedDocuments, {
            journeyType: 'buy',
            linkedJourney: {
                liveStage: 'buyer_qualification',
                application: { liveStage: 'buyer_qualification' },
            },
        }),
        'application_in_review',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('application_in_review', [], verifiedDocuments, {
            journeyType: 'buy',
            linkedJourney: {
                saleProgression: { current_stage: 'conveyancing', status: 'active' },
            },
        }),
        'application_in_review',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep('application_in_review', [], verifiedDocuments, {
            journeyType: 'buy',
            linkedJourney: {
                saleProgression: { current_stage: 'completion', status: 'completed' },
            },
        }),
        'completed',
    );
});
