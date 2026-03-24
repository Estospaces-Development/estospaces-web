import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    buildDocumentsFromVerification,
    canCompleteFastTrackVerification,
    formatLeadStage,
    getLatestFastTrackReviewDocuments,
    getFastTrackStartAction,
    isFastTrackCaseOverdue,
    getLeadNeedsReupload,
    needsFastTrackCaseAttention,
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
            identityProof: 'verified',
            addressProof: 'verified',
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
            identityProof: 'verified',
            addressProof: 'pending',
        },
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
        'docs_uploaded',
    );

    assert.equal(formatLeadStage('broker_matched'), 'Broker Matched');
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
