import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupportTranscriptMessagePresentation } from '@/lib/supportTranscript';

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
