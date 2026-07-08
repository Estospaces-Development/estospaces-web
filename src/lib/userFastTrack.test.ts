import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildUserFastTrackDocumentItems,
    getOutstandingDocumentNames,
    resolveUserFastTrackSelection,
} from './userFastTrack';

test('resolveUserFastTrackSelection can match a case from the requested lead id', () => {
    assert.equal(
        resolveUserFastTrackSelection(
            [
                { caseId: 'case-1', leadId: 'lead-1' },
                { caseId: 'case-2', leadId: 'lead-2' },
            ],
            null,
            'lead-2',
            null,
        ),
        'case-2',
    );
});

test('buildUserFastTrackDocumentItems exposes requested document names and statuses', () => {
    const items = buildUserFastTrackDocumentItems(
        {
            identityProof: 'pending',
            addressProof: 'pending',
        },
        [
            {
                document_category: 'identity',
                status: 'approved',
                file_name: 'passport.pdf',
            } as any,
            {
                document_category: 'address',
                status: 'reupload_required',
                file_name: 'utility-bill.pdf',
            } as any,
        ],
    );

    assert.deepEqual(
        items,
        [
            {
                id: 'identity',
                title: 'Identity proof',
                status: 'verified',
                statusLabel: 'Verified',
                fileName: 'passport.pdf',
                reason: null,
                reviewedAt: null,
                hint: 'Aadhaar, PAN/Form 60, passport, voter ID, or driving licence',
                uploadType: 'identity',
                actionLabel: 'Replace file',
            },
            {
                id: 'address',
                title: 'Address proof',
                status: 'reupload_required',
                statusLabel: 'Re-upload required',
                fileName: 'utility-bill.pdf',
                reason: null,
                reviewedAt: null,
                hint: 'Utility bill, bank statement, rent agreement, property tax receipt, or government address proof',
                uploadType: 'address',
                actionLabel: 'Upload replacement',
            },
        ],
    );

    assert.deepEqual(getOutstandingDocumentNames(items), ['Address proof']);
});

test('buildUserFastTrackDocumentItems keeps missing files inactive until documents are requested', () => {
    const items = buildUserFastTrackDocumentItems(
        {
            identityProof: 'pending',
            addressProof: 'pending',
        },
        [],
        {
            requestActive: false,
        },
    );

    assert.deepEqual(
        items,
        [
            {
                id: 'identity',
                title: 'Identity proof',
                status: 'not_requested',
                statusLabel: 'Not requested',
                fileName: null,
                reason: null,
                reviewedAt: null,
                hint: 'Aadhaar, PAN/Form 60, passport, voter ID, or driving licence',
                uploadType: 'identity',
                actionLabel: 'Waiting for request',
            },
            {
                id: 'address',
                title: 'Address proof',
                status: 'not_requested',
                statusLabel: 'Not requested',
                fileName: null,
                reason: null,
                reviewedAt: null,
                hint: 'Utility bill, bank statement, rent agreement, property tax receipt, or government address proof',
                uploadType: 'address',
                actionLabel: 'Waiting for request',
            },
        ],
    );

    assert.deepEqual(getOutstandingDocumentNames(items), []);
});


test('buildUserFastTrackDocumentItems uses UK document guidance when requested', () => {
    const items = buildUserFastTrackDocumentItems(
        {
            identityProof: 'pending',
            addressProof: 'pending',
        },
        [],
        {
            market: 'GB',
        },
    );

    assert.equal(items[0].hint, 'British or Irish passport, driving licence, BRP/BRC, or right-to-rent share code');
    assert.equal(items[1].hint, 'Council tax bill, utility bill, bank statement, tenancy agreement, or HMRC/NHS/government letter');
});
