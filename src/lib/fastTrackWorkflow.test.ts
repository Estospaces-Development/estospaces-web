import assert from 'node:assert/strict';
import test from 'node:test';

const {
    buildDocumentsFromVerification,
    getFastTrackStartAction,
    normalizeWorkspaceDocuments,
} = await import(new URL('./fastTrackWorkflow.ts', import.meta.url).href);

test('uploaded documents stay pending until verification is approved', () => {
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
        existingDocuments,
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
