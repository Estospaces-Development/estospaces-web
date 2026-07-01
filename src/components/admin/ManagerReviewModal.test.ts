import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MANAGER_REVIEW_CLOSE_LABEL } from './ManagerReviewModal';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(testDir, 'ManagerReviewModal.tsx'), 'utf8');

test('manager review modal names the close control and restores focus', () => {
    assert.equal(MANAGER_REVIEW_CLOSE_LABEL, 'Close manager verification review panel');
    assert.match(source, /aria-label=\{MANAGER_REVIEW_CLOSE_LABEL\}/);
    assert.match(source, /previousFocusRef\.current\?\.focus\(\)/);
});

test('manager review modal blocks approval when manager evidence is incomplete', () => {
    assert.match(source, /getManagerApprovalBlocker/);
    assert.match(source, /Approval blocked/);
    assert.match(source, /disabled=\{approvalBlocker !== null\}/);
});

test('manager review modal treats rejected profiles as closed review states', () => {
    assert.match(source, /getEffectiveManagerDocumentStatus/);
    assert.match(source, /profileStatus === 'rejected'/);
    assert.match(source, /const isRejected = profile\.verification_status === 'rejected'/);
    assert.match(source, /disabled=\{isClosed\}/);
    assert.match(source, /Manager Rejected/);
    assert.match(source, /The manager must upload corrected documents before admin review can continue/);
});

test('manager review modal treats approved profile documents as approved for stale records', () => {
    assert.match(source, /profileStatus === 'approved'/);
    assert.match(source, /return 'approved'/);
    assert.match(source, /const effectiveDocuments = documents\.map/);
    assert.match(source, /getManagerApprovalBlocker\(profile, effectiveDocuments\)/);
    assert.match(source, /effectiveDocuments\.map/);
});

test('manager review modal requires meaningful rejection reupload and revocation reasons', () => {
    assert.match(source, /MANAGER_REVIEW_REASON_MIN_LENGTH = 20/);
    assert.match(source, /MANAGER_REVIEW_REASON_MIN_WORDS = 4/);
    assert.match(source, /getManagerReviewReasonError\(revokeReason, 'reason for revocation'\)/);
    assert.match(source, /getManagerReviewReasonError\(rejectReason, 'rejection reason'\)/);
    assert.match(source, /getManagerReviewReasonError\(reuploadReason, 'reason for re-upload'\)/);
    assert.match(source, /disabled=\{Boolean\(revokeReasonError\) \|\| actionLoading === 'revoke'\}/);
    assert.match(source, /disabled=\{Boolean\(rejectReasonError\) \|\| actionLoading === 'reject'\}/);
    assert.match(source, /disabled=\{Boolean\(reuploadReasonError\) \|\| actionLoading\}/);
});
