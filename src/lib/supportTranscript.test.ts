import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSupportTimestamp, resolveSupportTranscriptMessagePresentation } from '@/lib/supportTranscript';

test('admin support transcript labels requester and staff replies separately', () => {
    assert.deepEqual(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'requester-1',
            currentUserId: 'admin-1',
            requesterUserId: 'requester-1',
            perspective: 'staff',
        }),
        {
            participant: 'requester',
            alignsEnd: false,
            emphasized: false,
            showParticipantLabel: true,
        },
    );

    assert.deepEqual(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'admin-2',
            currentUserId: 'admin-1',
            requesterUserId: 'requester-1',
            perspective: 'staff',
        }),
        {
            participant: 'staff',
            alignsEnd: true,
            emphasized: true,
            showParticipantLabel: true,
        },
    );
});

test('requester support transcript keeps support replies distinct from my messages', () => {
    assert.deepEqual(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'support-1',
            currentUserId: 'requester-1',
            requesterUserId: 'requester-1',
            perspective: 'requester',
        }),
        {
            participant: 'staff',
            alignsEnd: false,
            emphasized: false,
            showParticipantLabel: true,
        },
    );

    assert.deepEqual(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'requester-1',
            currentUserId: 'requester-1',
            requesterUserId: 'requester-1',
            perspective: 'requester',
        }),
        {
            participant: 'requester',
            alignsEnd: true,
            emphasized: true,
            showParticipantLabel: false,
        },
    );
});
test('admin support transcript recognizes staff replies by known staff ids and roles', () => {
    assert.equal(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'admin-2',
            currentUserId: 'admin-1',
            perspective: 'staff',
            staffUserIds: ['admin-2'],
        }).participant,
        'staff',
    );

    assert.equal(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'message-sender-1',
            currentUserId: 'admin-1',
            perspective: 'staff',
            senderRole: 'admin',
        }).participant,
        'staff',
    );

    assert.equal(
        resolveSupportTranscriptMessagePresentation({
            senderId: 'manager-1',
            currentUserId: 'admin-1',
            perspective: 'staff',
            senderRole: 'manager',
        }).participant,
        'requester',
    );
});

test('support timestamps hide backend zero-date placeholders', () => {
    assert.equal(formatSupportTimestamp('0001-01-01T05:53:28Z'), 'Time unavailable');
    assert.match(formatSupportTimestamp('0001-01-01T05:53:28Z', '2026-07-08T05:53:28Z'), /2026|7\/8\/2026|8\/7\/2026/);
});
