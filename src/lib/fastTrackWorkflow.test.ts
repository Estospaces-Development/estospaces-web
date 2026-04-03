import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildFastTrackDocumentItems,
    buildDocumentsFromDetails,
    buildFastTrackVerificationContent,
    buildDocumentsFromVerification,
    buildVerificationSummary,
    canRequestLeadDocuments,
    canCompleteFastTrackVerification,
    deriveLiveFastTrackDocumentPhase,
    deriveLiveFastTrackCurrentStep,
    filterDocumentsForLead,
    formatLeadStage,
    getLatestFastTrackReviewDocuments,
    getFastTrackStartAction,
    isFastTrackCaseOverdue,
    getLeadNeedsReupload,
    needsFastTrackCaseAttention,
    normalizeFastTrackDocumentPhase,
    normalizeWorkspaceDocuments,
    resolveLeadStage,
    shouldBlockFastTrackWorkspaceRefresh,
} from './fastTrackWorkflow';

test('manager fast-track document summaries reflect individually approved documents', () => {
    const existingDocuments = {
        identityProof: 'pending',
        addressProof: 'pending',
    } as const;

    assert.deepEqual(
        buildDocumentsFromVerification(
            {
                has_identity_doc: true,
                has_address_doc: true,
                documents_verified: false,
            },
            existingDocuments,
        ),
        {
            identityProof: 'pending',
            addressProof: 'pending',
        },
    );

    assert.deepEqual(
        buildDocumentsFromVerification(
            {
                has_identity_doc: true,
                has_address_doc: true,
                documents_verified: true,
            },
            existingDocuments,
        ),
        {
            identityProof: 'verified',
            addressProof: 'verified',
        },
    );

    assert.deepEqual(
        buildDocumentsFromVerification(
            {
                has_identity_doc: true,
                has_address_doc: false,
                documents_verified: false,
            },
            existingDocuments,
        ),
        {
            identityProof: 'pending',
            addressProof: 'pending',
        },
    );

    assert.deepEqual(
        buildDocumentsFromVerification(
            null,
            {
                identityProof: 'verified',
                addressProof: 'pending',
            },
        ),
        {
            identityProof: 'verified',
            addressProof: 'pending',
        },
    );
});

test('unknown fast-track steps and phases stay at property-selected defaults', () => {
    assert.equal(normalizeFastTrackDocumentPhase(undefined, undefined), 'not_requested');
    assert.equal(normalizeFastTrackDocumentPhase(undefined, 'documents_requested'), 'waiting_for_upload');
    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'unexpected_stage',
            [],
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'property_selected',
    );
});

test('document phase distinguishes not requested, waiting, uploaded, replacement, and verified states', () => {
    assert.equal(
        deriveLiveFastTrackDocumentPhase([], {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'property_selected',
            backendPhase: 'not_requested',
        }),
        'not_requested',
    );

    assert.equal(
        deriveLiveFastTrackDocumentPhase([], {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'documents_requested',
            backendPhase: 'waiting_for_upload',
        }),
        'waiting_for_upload',
    );

    assert.equal(
        deriveLiveFastTrackDocumentPhase([
            {
                document_category: 'identity',
                status: 'under_review',
            },
        ], {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'documents_requested',
        }),
        'uploaded_under_review',
    );

    assert.equal(
        deriveLiveFastTrackDocumentPhase([
            {
                document_category: 'identity',
                status: 'reupload_required',
            },
        ], {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'documents_requested',
        }),
        'replacement_required',
    );

    assert.equal(
        deriveLiveFastTrackDocumentPhase([
            {
                document_category: 'identity',
                status: 'approved',
            },
            {
                document_category: 'address',
                status: 'approved',
            },
        ], {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'documents_requested',
        }),
        'verified',
    );
});

test('existing active lead without case creates the missing case', () => {
    assert.equal(
        getFastTrackStartAction(
            { status: 'pending_broker_response' },
            null,
        ),
        'create_case_for_existing_lead',
    );

    assert.equal(
        getFastTrackStartAction(
            { status: 'pending_broker_response' },
            { finalStatus: 'in_progress' },
        ),
        'resume_existing_case',
    );
});

test('overdue fast-track cases stay active but count as needing attention', () => {
    assert.equal(
        isFastTrackCaseOverdue({
            finalStatus: 'in_progress',
            hoursRemaining: 0,
        }),
        true,
    );

    assert.equal(
        needsFastTrackCaseAttention({
            finalStatus: 'in_progress',
            hoursRemaining: 0,
        }),
        true,
    );

    assert.equal(
        needsFastTrackCaseAttention({
            finalStatus: 'in_progress',
            hoursRemaining: 3,
        }),
        false,
    );
});

test('document preload failures degrade to an empty workspace list', () => {
    assert.deepEqual(
        normalizeWorkspaceDocuments(
            [
                { document_category: 'identity', status: 'approved' },
            ],
            'documents unavailable',
        ),
        [],
    );

    assert.deepEqual(
        normalizeWorkspaceDocuments(
            [
                { document_category: 'identity', status: 'approved' },
            ],
            null,
        ),
        [
            { document_category: 'identity', status: 'approved' },
        ],
    );
});

test('lead stage resolves live workflow states from documents and response state', () => {
    assert.equal(
        resolveLeadStage(
            {
                documents_requested: true,
            },
            [],
        ),
        'docs_requested',
    );

    assert.equal(
        resolveLeadStage(
            {
                dispatch_status: 'broker_matched',
            },
            [],
        ),
        'broker_matched',
    );

    assert.equal(
        resolveLeadStage(
            {
                documents_uploaded: true,
            },
            [
                { document_category: 'identity', status: 'pending' },
            ],
        ),
        'under_review',
    );

    assert.equal(
        resolveLeadStage(
            {
                documents_uploaded: true,
            },
            [
                { document_category: 'identity', status: 'approved' },
                { document_category: 'address', status: 'approved' },
            ],
        ),
        'approved',
    );

    assert.equal(formatLeadStage('broker_matched'), 'Broker Matched');
});

test('document requests are only allowed while the lead is still in the live response stage', () => {
    assert.equal(
        canRequestLeadDocuments({
            user_id: 'user-1',
            dispatch_status: 'broker_matched',
            documents_requested: false,
            documents_uploaded: false,
            documents_verified: false,
            status: 'broker_responded',
        } as any),
        true,
    );

    assert.equal(
        canRequestLeadDocuments({
            user_id: 'user-1',
            documents_requested: true,
            documents_uploaded: false,
            documents_verified: false,
            status: 'broker_responded',
        } as any),
        false,
    );

    assert.equal(
        canRequestLeadDocuments(
            {
                user_id: 'user-1',
                documents_requested: false,
                documents_uploaded: false,
                documents_verified: false,
                status: 'broker_responded',
            } as any,
            [
                {
                    document_category: 'identity',
                    status: 'under_review',
                },
            ],
        ),
        false,
    );
});

test('verification summary distinguishes not-requested and requested-without-uploads states', () => {
    assert.equal(
        buildVerificationSummary(
            null,
            {
                documents_requested: false,
                documents_uploaded: false,
                documents_verified: false,
            },
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'Documents not requested yet',
    );

    assert.equal(
        buildVerificationSummary(
            {
                has_identity_doc: true,
                has_address_doc: true,
                documents_verified: true,
            },
            {
                documents_requested: false,
                documents_uploaded: false,
                documents_verified: false,
            },
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'Documents not requested yet',
    );

    assert.equal(
        buildVerificationSummary(
            null,
            {
                documents_requested: true,
                documents_uploaded: false,
                documents_verified: false,
            },
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'Documents requested. Waiting for user uploads.',
    );
});

test('lead-scoped document helpers ignore files from older fast-track cases', () => {
    const allDocuments = [
        {
            document_category: 'identity',
            status: 'approved',
            lead_id: 'older-lead',
            file_name: 'old-id.png',
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: '2026-04-01T10:00:00.000Z',
        },
        {
            document_category: 'address',
            status: 'approved',
            lead_id: 'older-lead',
            file_name: 'old-address.png',
            created_at: '2026-04-01T10:05:00.000Z',
            updated_at: '2026-04-01T10:05:00.000Z',
        },
        {
            document_category: 'identity',
            status: 'under_review',
            lead_id: 'current-lead',
            file_name: 'current-id.png',
            created_at: '2026-04-02T10:00:00.000Z',
            updated_at: '2026-04-02T10:00:00.000Z',
        },
    ];

    const currentLeadDocuments = filterDocumentsForLead(allDocuments, 'current-lead');
    assert.equal(currentLeadDocuments.length, 1);
    assert.equal(currentLeadDocuments[0]?.file_name, 'current-id.png');

    assert.deepEqual(
        buildDocumentsFromDetails(currentLeadDocuments, {
            identityProof: 'pending',
            addressProof: 'pending',
        }),
        {
            identityProof: 'uploaded',
            addressProof: 'pending',
        },
    );

    assert.equal(
        deriveLiveFastTrackDocumentPhase(currentLeadDocuments, {
            identityProof: 'pending',
            addressProof: 'pending',
        }, {
            currentStep: 'property_selected',
            backendPhase: 'not_requested',
        }),
        'uploaded_under_review',
    );
});

test('reupload detection surfaces replacement requests', () => {
    assert.equal(
        getLeadNeedsReupload([
            { document_category: 'identity', status: 'approved' },
            { document_category: 'address', status: 'reupload_required' },
        ]),
        true,
    );

    assert.equal(
        getLeadNeedsReupload([
            { document_category: 'identity', status: 'approved' },
            { document_category: 'address', status: 'approved' },
        ]),
        false,
    );
});

test('fast-track verification content exposes transparent per-document reasons', () => {
    const items = buildFastTrackDocumentItems([
        {
            document_category: 'identity',
            status: 'approved',
            file_name: 'passport.pdf',
        },
        {
            document_category: 'address',
            status: 'reupload_required',
            file_name: 'utility-bill.pdf',
            reject_reason: 'Please upload a newer utility bill',
        },
    ]);

    assert.deepEqual(
        items.map((item) => ({
            id: item.id,
            status: item.status,
            reason: item.reason,
        })),
        [
            {
                id: 'identity',
                status: 'verified',
                reason: null,
            },
            {
                id: 'address',
                status: 'reupload_required',
                reason: 'Please upload a newer utility bill',
            },
        ],
    );

    assert.deepEqual(
        buildFastTrackVerificationContent(items),
        {
            verificationLabel: 'Action needed',
            documentsLabel: 'Address proof needs replacement',
            summary: 'Address proof needs a re-upload: Please upload a newer utility bill',
            reasonLines: [
                'Identity proof: verified',
                'Address proof: Please upload a newer utility bill',
            ],
        },
    );
});

test('fast-track helpers prefer the newest upload and only complete verification when the latest files are approved', () => {
    const olderRejectedAddress = {
        document_category: 'address',
        status: 'reupload_required',
        file_name: 'utility-old.pdf',
        reject_reason: 'Please upload a newer utility bill',
        created_at: '2026-03-24T09:00:00.000Z',
        updated_at: '2026-03-24T09:00:00.000Z',
    };
    const newerReplacementAddress = {
        document_category: 'address',
        status: 'under_review',
        file_name: 'utility-new.pdf',
        created_at: '2026-03-24T10:00:00.000Z',
        updated_at: '2026-03-24T10:00:00.000Z',
    };
    const approvedIdentity = {
        document_category: 'identity',
        status: 'approved',
        file_name: 'passport.pdf',
        created_at: '2026-03-24T08:00:00.000Z',
        updated_at: '2026-03-24T08:00:00.000Z',
    };

    const latestReviewDocuments = getLatestFastTrackReviewDocuments([
        olderRejectedAddress,
        approvedIdentity,
        newerReplacementAddress,
    ]);

    assert.deepEqual(
        latestReviewDocuments.map((document) => document.file_name),
        ['passport.pdf', 'utility-new.pdf'],
    );

    assert.deepEqual(
        buildFastTrackDocumentItems([
            olderRejectedAddress,
            approvedIdentity,
            newerReplacementAddress,
        ]),
        [
            {
                id: 'identity',
                title: 'Identity proof',
                status: 'verified',
                statusLabel: 'Verified',
                fileName: 'passport.pdf',
                reason: null,
                reviewedAt: null,
            },
            {
                id: 'address',
                title: 'Address proof',
                status: 'uploaded',
                statusLabel: 'Uploaded',
                fileName: 'utility-new.pdf',
                reason: null,
                reviewedAt: null,
            },
        ],
    );

    assert.equal(
        canCompleteFastTrackVerification([
            olderRejectedAddress,
            approvedIdentity,
            newerReplacementAddress,
        ]),
        false,
    );

    assert.equal(
        canCompleteFastTrackVerification([
            olderRejectedAddress,
            approvedIdentity,
            newerReplacementAddress,
            {
                document_category: 'address',
                status: 'approved',
                file_name: 'utility-approved.pdf',
                created_at: '2026-03-24T11:00:00.000Z',
                updated_at: '2026-03-24T11:00:00.000Z',
            },
        ]),
        true,
    );
});

test('workspace refresh only blocks before the first fast-track payload arrives', () => {
    assert.equal(
        shouldBlockFastTrackWorkspaceRefresh(null, null, []),
        true,
    );

    assert.equal(
        shouldBlockFastTrackWorkspaceRefresh({ status: 'pending_broker_response' }, null, []),
        false,
    );

    assert.equal(
        shouldBlockFastTrackWorkspaceRefresh(null, { finalStatus: 'in_progress' }, []),
        false,
    );

    assert.equal(
        shouldBlockFastTrackWorkspaceRefresh(null, null, [
            {
                document_category: 'identity',
                status: 'under_review',
            },
        ]),
        false,
    );
});

test('live fast-track step promotes approved documents ahead of stale saved case state', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'property_selected',
            [
                { document_category: 'identity', status: 'approved' },
                { document_category: 'address', status: 'approved' },
            ],
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'documents_verified',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'viewing_scheduled',
            [
                { document_category: 'identity', status: 'approved' },
                { document_category: 'address', status: 'approved' },
            ],
            {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        'viewing_scheduled',
    );
});

test('live fast-track step follows linked viewing, rent contract, and payment records', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'documents_verified',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'rent',
                linkedJourney: {
                    viewing: { status: 'confirmed' },
                },
            },
        ),
        'viewing_scheduled',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'viewing_completed',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'rent',
                linkedJourney: {
                    application: { status: 'right_to_rent_pending' },
                },
            },
        ),
        'application_in_review',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'ready_for_contract',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'rent',
                linkedJourney: {
                    contract: { status: 'active' },
                    payments: [{ status: 'pending', payment_type: 'security_deposit' }],
                },
            },
        ),
        'ready_for_contract',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'ready_for_contract',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'rent',
                linkedJourney: {
                    contract: { status: 'active' },
                    payments: [{ status: 'completed', payment_type: 'security_deposit' }],
                    invoices: [{ status: 'paid', payment_type: 'first_rent' }],
                },
            },
        ),
        'completed',
    );
});

test('live fast-track step follows active sale progression for buy journeys', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'property_selected',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'buy',
                linkedJourney: {
                    application: { status: 'submitted' },
                },
            },
        ),
        'documents_verified',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'viewing_completed',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'buy',
                linkedJourney: {
                    saleProgression: { current_stage: 'memorandum_issued', status: 'active' },
                },
            },
        ),
        'application_in_review',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'application_in_review',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'buy',
                linkedJourney: {
                    saleProgression: { current_stage: 'completion', status: 'completed' },
                },
            },
        ),
        'completed',
    );
});

test('live fast-track step prefers backend live stages when the server has newer regulated state', () => {
    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'viewing_completed',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'rent',
                liveStage: 'signatures_pending',
            },
        ),
        'ready_for_contract',
    );

    assert.equal(
        deriveLiveFastTrackCurrentStep(
            'documents_verified',
            [],
            {
                identityProof: 'verified',
                addressProof: 'verified',
            },
            {
                journeyType: 'buy',
                linkedJourney: {
                    liveStage: 'buyer_qualification',
                    saleProgression: { liveStage: 'buyer_qualification', status: 'active' },
                },
            },
        ),
        'application_in_review',
    );
});
