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

test('reconciliation works on the real Fast Track workspace payload from booking', async () => {
    const { getFastTrackCaseById } = await import('../services/fastTrackService');
    const originalFetch = globalThis.fetch;
    // Shape of booking GET /api/v1/fast-track/:id (buildFastTrackWorkspaceCase).
    const workspace = (finalStatus: string, identityStatus: string) => ({
        id: 'case-1',
        case_id: 'case-1',
        header: { property_id: 'property-1', client_id: 'user-1', submitted_at: '2026-05-07T08:00:00.000Z', hours_remaining: 20 },
        stage: 'documents',
        final_status: finalStatus,
        documents: { items: [
            { id: 'identity', label: 'Identity proof', status: identityStatus, document_record_id: 'doc-identity', file_name: 'passport.pdf' },
            { id: 'address', label: 'Address proof', status: 'reupload_needed', document_record_id: 'doc-address', file_name: 'bill.pdf' },
        ] },
        viewing: {}, decision: {}, agreement: {}, handover: {}, activity: [],
    });
    const respond = (payload: unknown) => (async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: payload }) })) as unknown as typeof fetch;

    try {
        globalThis.fetch = respond(workspace('active', 'approved'));
        const active = (await getFastTrackCaseById('case-1')).data;
        assert.deepEqual([...getFastTrackApprovedDocumentRecordIds(active)], ['doc-identity']);
        assert.equal(countFastTrackReplacementRequests(active), 1);
        assert.equal(isFastTrackCaseClosed(active), false);

        globalThis.fetch = respond(workspace('completed', 'approved'));
        const completed = (await getFastTrackCaseById('case-1')).data;
        assert.equal(isFastTrackCaseClosed(completed), true);
        assert.equal(countFastTrackReplacementRequests(completed), 0);

        globalThis.fetch = respond(workspace('expired', 'uploaded'));
        assert.equal(isFastTrackCaseClosed((await getFastTrackCaseById('case-1')).data), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('the case file reads per-document review state from the Fast Track workspace endpoint', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/case-file/CaseFileWorkspace.tsx'), 'utf8');
    assert.ok(source.includes('getFastTrackCaseById(String(caseFile?.case_id || ""), { suppressErrorToast: true })'));
    assert.ok(source.includes('getFastTrackApprovedDocumentRecordIds(fastTrackWorkspaceCase)'));
    assert.ok(source.includes('countFastTrackReplacementRequests(fastTrackWorkspaceCase)'));
});

test('a later case-file decision wins over an earlier Fast Track approval', () => {
    const approved = new Set(['doc-identity']);
    for (const linkStatus of ['reupload_required', 'rejected', 'under_review']) {
        const state = getCaseFileDocumentReviewState({ linkStatus, documentId: 'doc-identity', fastTrackApprovedIds: approved, caseClosed: false });
        assert.equal(state.effectiveStatus, linkStatus, linkStatus);
        assert.equal(state.approvedInFastTrack, false, linkStatus);
        assert.equal(state.canApprove, true, linkStatus);
    }
    const linked = getCaseFileDocumentReviewState({ linkStatus: 'linked', documentId: 'doc-identity', fastTrackApprovedIds: approved, caseClosed: false });
    assert.equal(linked.effectiveStatus, 'approved');
});

test('every case-file reload also refreshes the Fast Track review state', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/case-file/CaseFileWorkspace.tsx'), 'utf8');
    assert.ok(source.includes('void queryClient.invalidateQueries({ queryKey: ["case-file-fast-track-workspace", result.data?.case_id] });'));
});
