import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    USER_VERIFICATION_REVIEW_CLOSE_LABEL,
    VERIFICATION_DOCUMENT_ISSUES,
    VERIFICATION_REASON_MIN_LENGTH,
    VERIFICATION_REASON_MIN_WORDS,
    buildVerificationDocumentReviewReason,
    canCompleteUserVerification,
    dedupeVerificationReviewDocuments,
    formatVerificationConversationLastMessage,
    formatVerificationConversationReference,
    formatVerificationConversationSubtitle,
    formatVerificationConversationTitle,
    formatVerificationLeadPropertyAddress,
    formatVerificationLeadPropertyLabel,
    formatVerificationLeadReference,
    formatVerificationLeadStatus,
    getVerificationDocumentReviewReasonError,
    getVerificationApprovalBlocker,
    getVerificationReviewErrorMessage,
} from './UserVerificationReviewModal';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(testDir, 'UserVerificationReviewModal.tsx'), 'utf8');

test('user verification review modal names the close control and restores focus', () => {
    assert.equal(USER_VERIFICATION_REVIEW_CLOSE_LABEL, 'Close verification review panel');
    assert.match(source, /aria-label=\{USER_VERIFICATION_REVIEW_CLOSE_LABEL\}/);
    assert.match(source, /previousFocusRef\.current\?\.focus\(\)/);
});

test('user verification review modal explains missing appointment-linked users clearly', () => {
    const message = getVerificationReviewErrorMessage('user not found', {
        name: 'Local QA Client',
        email: 'qa-client@example.com',
        source: 'appointment',
    });

    assert.match(message, /Verification record not available for Local QA Client\./);
    assert.match(message, /This appointment is not linked to a core user profile yet/);
    assert.match(message, /not linked to a core user profile yet/);
});

test('user verification review modal explains appointment assignment access failures clearly', () => {
    const message = getVerificationReviewErrorMessage("you don't have any properties assigned", {
        name: 'Local QA Client',
        email: 'qa-client@example.com',
        source: 'appointment',
    });

    assert.match(message, /Document review is not available for Local QA Client from this appointment\./);
    assert.match(message, /core verification service did not expose an assigned property review record/);
    assert.doesNotMatch(message, /you don't have any properties assigned/i);
});

test('user verification approval requires approved identity and address documents', () => {
    const baseDocument = {
        id: 'doc-1',
        user_id: 'user-1',
        document_type: 'government_id',
        file_name: 'document.pdf',
        file_url: 'https://example.com/document.pdf',
        reject_reason: '',
        created_at: '2026-06-16T10:00:00.000Z',
        updated_at: '2026-06-16T10:00:00.000Z',
    };

    assert.equal(canCompleteUserVerification([
        { ...baseDocument, id: 'identity-pending', document_category: 'identity', status: 'pending' },
        { ...baseDocument, id: 'address-approved', document_category: 'address', status: 'approved' },
    ] as any), false);

    assert.equal(canCompleteUserVerification([
        { ...baseDocument, id: 'identity-approved', document_category: 'identity', status: 'approved' },
    ] as any), false);

    assert.equal(canCompleteUserVerification([
        { ...baseDocument, id: 'identity-approved', document_category: 'identity', status: 'approved' },
        { ...baseDocument, id: 'address-approved', document_category: 'address', status: 'approved' },
    ] as any), true);
});

test('disabled verification approval explains missing required document approvals', () => {
    const baseDocument = {
        id: 'doc-1',
        user_id: 'user-1',
        document_type: 'government_id',
        file_name: 'document.pdf',
        file_url: 'https://example.com/document.pdf',
        reject_reason: '',
        created_at: '2026-06-16T10:00:00.000Z',
        updated_at: '2026-06-16T10:00:00.000Z',
    };

    assert.equal(
        getVerificationApprovalBlocker([
            { ...baseDocument, id: 'identity-pending', document_category: 'identity', status: 'pending' },
            { ...baseDocument, id: 'address-approved', document_category: 'address', status: 'approved' },
        ] as any),
        '1 required document approval is still needed before approving: identity proof (Pending).',
    );
    assert.equal(
        getVerificationApprovalBlocker([
            { ...baseDocument, id: 'identity-approved', document_category: 'identity', status: 'approved' },
            { ...baseDocument, id: 'address-approved', document_category: 'address', status: 'approved' },
        ] as any),
        null,
    );
    assert.match(source, /id="verification-approval-blocker"/);
    assert.match(source, /aria-describedby=\{approvalBlocker \? 'verification-approval-blocker' : undefined\}/);
});

test('document review reasons require specific actionable text', () => {
    assert.equal(VERIFICATION_REASON_MIN_LENGTH, 20);
    assert.equal(VERIFICATION_REASON_MIN_WORDS, 4);

    assert.match(
        getVerificationDocumentReviewReasonError('bad') || '',
        /20 characters/,
    );
    assert.match(
        getVerificationDocumentReviewReasonError('sfffffdsdc') || '',
        /20 characters/,
    );
    assert.match(
        getVerificationDocumentReviewReasonError('bad bad bad bad bad bad') || '',
        /4 clear words/,
    );
    assert.equal(
        getVerificationDocumentReviewReasonError('Document image is blurry and the address is cut off.'),
        null,
    );
    assert.ok(VERIFICATION_DOCUMENT_ISSUES.length >= 5);
    assert.equal(
        buildVerificationDocumentReviewReason('expired', 'Upload a current passport showing the expiry date.'),
        'Document is expired: Upload a current passport showing the expiry date.',
    );

    assert.match(source, /minLength=\{VERIFICATION_REASON_MIN_LENGTH\}/);
    assert.match(source, /aria-invalid=\{Boolean\(visibleReviewReasonError\)\}/);
    assert.match(source, /disabled=\{loading \|\| disabled \|\| !reviewIssue \|\| Boolean\(reviewReasonError\)\}/);
});

test('verification review documents collapse same-day duplicate uploads by file type and name', () => {
    const baseDocument = {
        user_id: 'user-1',
        document_type: 'government_id',
        document_category: 'identity',
        file_name: 'codex-smoke-panorama.jpg',
        file_url: 'https://example.com/codex-smoke-panorama.jpg',
        reject_reason: '',
        status: 'pending',
        updated_at: '2026-06-26T10:00:00.000Z',
    };

    const documents = dedupeVerificationReviewDocuments([
        {
            ...baseDocument,
            id: 'older-duplicate',
            created_at: '2026-06-26T09:00:00.000Z',
        },
        {
            ...baseDocument,
            id: 'newer-duplicate',
            created_at: '2026-06-26T10:00:00.000Z',
        },
        {
            ...baseDocument,
            id: 'different-file',
            file_name: 'address-proof.jpg',
            document_type: 'address_proof',
            document_category: 'address',
            created_at: '2026-06-26T10:30:00.000Z',
        },
    ] as any);

    assert.deepEqual(
        documents.map((document) => document.id),
        ['different-file', 'newer-duplicate'],
    );
});

test('recent lead statuses render readable labels instead of backend enums', () => {
    assert.equal(formatVerificationLeadStatus('PENDING_BROKER_RESPONSE'), 'Waiting for broker response');
    assert.equal(formatVerificationLeadStatus('BROKER_RESPONDED'), 'Broker has responded');
    assert.equal(formatVerificationLeadStatus('viewing_scheduled'), 'Viewing scheduled');
    assert.equal(formatVerificationLeadStatus(''), 'Status unavailable');
    assert.match(source, /formatVerificationLeadStatus\(lead\.status\)/);
    assert.doesNotMatch(source, />\{lead\.status\}<\/p>/);
    assert.doesNotMatch(source, />\{status\.replace\(\/_\/g, ' '\)\}<\/option>/);
});

test('admin verification review surfaces direct Contact Agent conversations', () => {
    const conversation = {
        id: '70b54418-9b70-41a6-a5f0-65bb7b0f5a8d',
        property_title: 'Launch Apartment',
        property_address: 'Chennai, 600001',
        counterpart_name: 'Property Manager',
        counterpart_email: 'manager@example.com',
        counterpart_agency: 'Estospaces Launch Manager',
        updated_at: '2026-07-08T07:30:00.000Z',
        last_message: {
            content: 'Inquiry regarding: Launch Apartment',
        },
    };

    assert.equal(formatVerificationConversationTitle(conversation as any), 'Launch Apartment');
    assert.equal(formatVerificationConversationSubtitle(conversation as any), 'Chennai, 600001');
    assert.equal(formatVerificationConversationLastMessage(conversation as any), 'Inquiry regarding: Launch Apartment');
    assert.equal(formatVerificationConversationReference(conversation as any), '70B54418');
    assert.match(source, /getAdminUserDirectConversations\(userId, 5\)/);
    assert.match(source, /Direct agent messages/);
    assert.match(source, /No direct Contact Agent messages for this user\./);
    assert.match(source, /formatVerificationConversationLastMessage\(conversation\)/);
});
test('recent lead rows prefer property context and compact references', () => {
    const lead = {
        id: '5fcd5515-9d55-463b-9a9c-415ed286311d',
        lead_number: 'LD-2026-000123',
        property_id: 'aa6e8134-2206-4362-a96a-170f0968f535',
        property_name: '',
        property: {
            title: 'Launch Rent Apartment',
            address_line_1: '1 Test Street',
            city: 'London',
            postcode: 'SW1A 1AA',
        },
    };

    assert.equal(formatVerificationLeadReference(lead as any), 'LD-2026-000123');
    assert.equal(formatVerificationLeadReference({ id: lead.id } as any), '5FCD5515');
    assert.equal(formatVerificationLeadPropertyLabel(lead as any), 'Launch Rent Apartment');
    assert.equal(formatVerificationLeadPropertyLabel({ property_id: lead.property_id } as any), 'AA6E8134');
    assert.equal(formatVerificationLeadPropertyAddress(lead as any), '1 Test Street, London, SW1A 1AA');
    assert.doesNotMatch(source, /Lead \{lead\.id\}/);
    assert.doesNotMatch(source, /Property \{lead\.property_id\}/);
});

test('approved document rows separate correction actions from pending review actions', () => {
    assert.match(source, /const isApprovedDocument = document\.status === 'approved'/);
    assert.match(source, /Approved document - correction actions/);
    assert.match(source, /border-emerald-200 bg-emerald-50\/70/);
    assert.match(source, /aria-label=\{`Request re-upload for approved \$\{document\.file_name\}`\}/);
    assert.match(source, /aria-label=\{`Reject approved \$\{document\.file_name\}`\}/);
    assert.match(source, /\) : canEdit && \(/);
});

test('user verification review surfaces are cleanly scoped and avoid mojibake', () => {
    for (let index = 0; index < source.length; index += 1) {
        const code = source.codePointAt(index);
        assert.notEqual(code, 0x00c2);
        assert.notEqual(code, 0xfffd);
        assert.notDeepEqual(
            [
                source.codePointAt(index),
                source.codePointAt(index + 1),
                source.codePointAt(index + 2),
            ],
            [0x00e2, 0x20ac, 0x00a2],
        );
    }

    const queueSource = readFileSync(path.resolve(testDir, 'UserVerificationQueue.tsx'), 'utf8');
    assert.match(queueSource, /data-testid="user-verification-queue"/);
    assert.match(source, /data-testid="user-verification-review-modal"/);
    assert.match(source, /document\.document_category\} - /);
});

test('verification approved status pills use contrast-safe text colors', () => {
    const adminVerificationPage = readFileSync(path.resolve(testDir, '../../pages/admin/verifications/page.tsx'), 'utf8');
    const userVerificationService = readFileSync(path.resolve(testDir, '../../services/userVerificationService.ts'), 'utf8');

    assert.doesNotMatch(source, /bg-emerald-100', text: 'text-emerald-700'/);
    assert.match(source, /bg-emerald-100', text: 'text-emerald-800'/);
    assert.doesNotMatch(userVerificationService, /text-(blue|emerald|amber)-700/);
    assert.match(userVerificationService, /bg-blue-100', text: 'text-blue-800'/);
    assert.match(userVerificationService, /bg-emerald-100', text: 'text-emerald-800'/);
    assert.match(userVerificationService, /bg-amber-100', text: 'text-amber-800'/);
    assert.doesNotMatch(source, /<p className="mt-1 text-xs text-gray-400">\{new Date\(lead\.created_at\)/);
    assert.match(source, /<p className="mt-1 text-xs text-gray-600 dark:text-gray-400">\{new Date\(lead\.created_at\)/);
    assert.doesNotMatch(adminVerificationPage, /bg-green-100 text-green-600/);
    assert.match(adminVerificationPage, /bg-green-100 text-green-800/);
});
