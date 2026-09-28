import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
    countFastTrackReplacementRequests,
    getCaseFileDocumentReviewState,
    getFastTrackApprovedDocumentRecordIds,
    isFastTrackCaseClosed,
} from './caseFileDocumentReview';

const completedCase = {
    workspaceFinalStatus: 'completed',
    finalStatus: 'completed',
    documents: { items: [
        { id: 'identity', status: 'approved', documentRecordId: 'doc-identity' },
        { id: 'address', status: 'approved', document_record_id: 'doc-address' },
        { id: 'income', status: 'uploaded', documentRecordId: 'doc-income' },
    ] },
};

test('a Fast Track approval is reflected on the shared case file for the same record', () => {
    const ids = getFastTrackApprovedDocumentRecordIds(completedCase);
    assert.deepEqual([...ids].sort(), ['doc-address', 'doc-identity']);
    const state = getCaseFileDocumentReviewState({ linkStatus: 'uploaded', documentId: 'doc-identity', fastTrackApprovedIds: ids, caseClosed: false });
    assert.equal(state.effectiveStatus, 'approved');
    assert.equal(state.approvedInFastTrack, true);
    assert.equal(state.canApprove, false);
});

test('an approved link never offers Approve again', () => {
    const state = getCaseFileDocumentReviewState({ linkStatus: 'approved', documentId: 'doc-x', fastTrackApprovedIds: new Set(), caseClosed: false });
    assert.equal(state.canApprove, false);
    assert.equal(state.approvedInFastTrack, false);
    assert.equal(state.canChangeReview, true);
});

test('an uploaded link on an active case can still be reviewed', () => {
    const state = getCaseFileDocumentReviewState({ linkStatus: 'uploaded', documentId: 'doc-income', fastTrackApprovedIds: new Set(['doc-identity']), caseClosed: false });
    assert.equal(state.effectiveStatus, 'uploaded');
    assert.equal(state.canApprove, true);
});

test('a closed Fast Track case is read-only in the case file', () => {
    assert.equal(isFastTrackCaseClosed(completedCase), true);
    assert.equal(isFastTrackCaseClosed({ workspaceFinalStatus: 'cancelled' }), true);
    assert.equal(isFastTrackCaseClosed({ workspaceFinalStatus: 'active', finalStatus: 'in_progress' }), false);
    assert.equal(isFastTrackCaseClosed(null), false);
    const state = getCaseFileDocumentReviewState({ linkStatus: 'uploaded', documentId: 'doc-income', fastTrackApprovedIds: new Set(), caseClosed: true });
    assert.equal(state.canApprove, false);
    assert.equal(state.canChangeReview, false);
});

test('case-file document rows use the reconciled review state', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/case-file/CaseFileWorkspace.tsx'), 'utf8');
    assert.ok(source.includes('getCaseFileDocumentReviewState({'));
    assert.ok(source.includes('{reviewState.canApprove ? ('));
    assert.ok(source.includes('{role === "manager" && reviewState.canChangeReview ? ('));
    assert.ok(source.includes('statusTone(reviewState.effectiveStatus)'));
});

test('Fast Track replacement requests count as open document requests while the case is active', () => {
    const activeCase = {
        workspaceFinalStatus: 'active',
        documents: { items: [{ status: 'reupload_needed' }, { status: 'approved' }, { status: 'reupload_required' }] },
    };
    assert.equal(countFastTrackReplacementRequests(activeCase), 2);
    assert.equal(countFastTrackReplacementRequests({ ...activeCase, workspaceFinalStatus: 'completed' }), 0);
    assert.equal(countFastTrackReplacementRequests(null), 0);
    const source = readFileSync(resolve(process.cwd(), 'src/components/case-file/CaseFileWorkspace.tsx'), 'utf8');
    assert.equal(source.split('{summary.openRequestCount + fastTrackReplacementCount}').length - 1, 2);
});
