import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    getManagerProfessionalDetails,
    getManagerReviewAuditLog,
    MANAGER_REVIEW_CLOSE_LABEL,
} from './ManagerReviewModal';

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

test('manager review modal exposes every manager professional field to admins', () => {
    const details = getManagerProfessionalDetails({
        id: 'manager-1',
        profile_type: 'broker',
        verification_status: 'pending',
        company_name: 'Estospaces Test Co',
        branch_name: 'Chennai Pilot Branch',
        business_phone: '+91 20 7946 0958',
        website: 'https://estospaces.in',
        tax_id: 'TAX-123',
        company_address: 'Chennai, Tamil Nadu',
        registered_office_address: 'Mumbai, Maharashtra',
        complaints_contact: 'complaints@example.com',
        redress_scheme_name: 'Property Redress Scheme',
        redress_membership_number: 'PRS-123',
        company_description: 'Commercial property specialists',
        service_areas: [' Chennai ', '', 'Mumbai'],
        dispatch_pincodes: ['600001', ' 400001 '],
        cmp_provider: 'CMP Provider',
        cmp_certificate_url: 'https://example.com/cmp/certificate.pdf',
        has_client_money: true,
    } as any);

    assert.deepEqual(
        details.map(({ label, value, href }) => ({ label, value, href })),
        [
            { label: 'Company Name', value: 'Estospaces Test Co', href: undefined },
            { label: 'Branch Name', value: 'Chennai Pilot Branch', href: undefined },
            { label: 'Business Phone', value: '+91 20 7946 0958', href: undefined },
            { label: 'Website', value: 'Visit website', href: 'https://estospaces.in/' },
            { label: 'Tax ID', value: 'TAX-123', href: undefined },
            { label: 'Company Address', value: 'Chennai, Tamil Nadu', href: undefined },
            { label: 'Registered Office Address', value: 'Mumbai, Maharashtra', href: undefined },
            { label: 'Complaints Contact', value: 'complaints@example.com', href: undefined },
            { label: 'Redress Scheme', value: 'Property Redress Scheme', href: undefined },
            { label: 'Redress Membership Number', value: 'PRS-123', href: undefined },
            { label: 'Company Description', value: 'Commercial property specialists', href: undefined },
            { label: 'Service Areas', value: 'Chennai, Mumbai', href: undefined },
            { label: 'Dispatch PIN Codes', value: '600001, 400001', href: undefined },
            { label: 'Handles Client Money', value: 'Yes', href: undefined },
            { label: 'Client Money Protection Provider', value: 'CMP Provider', href: undefined },
            {
                label: 'Client Money Protection Certificate',
                value: 'View certificate',
                href: 'https://example.com/cmp/certificate.pdf',
            },
        ],
    );
    assert.match(source, /Professional Details/);
    assert.match(source, /getManagerProfessionalDetails\(profile\)\.map/);
    assert.match(source, /rel="noopener noreferrer"/);
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

test('manager review modal backfills an activity entry for legacy approved managers', () => {
    const auditLog = getManagerReviewAuditLog({
        id: 'manager-1',
        profile_type: 'broker',
        verification_status: 'approved',
        submitted_at: '2026-07-07T10:00:00Z',
    } as any, []);

    assert.equal(auditLog.length, 1);
    assert.equal(auditLog[0].action_type, 'manager_approved');
    assert.equal(auditLog[0].actor_role, 'system');
    assert.equal(auditLog[0].created_at, '2026-07-07T10:00:00Z');
    assert.match(source, /const effectiveAuditLog = getManagerReviewAuditLog\(profile, auditLog\)/);
    assert.match(source, /\{effectiveAuditLog\.length\}/);
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
