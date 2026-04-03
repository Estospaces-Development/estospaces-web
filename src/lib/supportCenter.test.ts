import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeCreatedSupportTicket, getAutoSelectedSupportTicketId, hasPrefilledSupportComposerContext } from '@/lib/supportCenter';

const tickets = [
    {
        id: 'ticket-1',
        user_id: 'user-1',
        requester_role: 'user',
        conversation_id: 'conversation-1',
        subject: 'First ticket',
        category: 'Technical Issue',
        priority: 'medium',
        status: 'open',
        created_at: '2026-03-31T00:00:00Z',
        updated_at: '2026-03-31T00:00:00Z',
        last_message_at: '2026-03-31T00:00:00Z',
        unread_count: 0,
    },
];

test('requester pages keep the new-ticket composer when prefilled context is present', () => {
    const params = new URLSearchParams({
        category: 'Technical Issue',
        subject: 'Need help',
    });

    assert.equal(hasPrefilledSupportComposerContext(params), true);
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: '',
        tickets,
        isAdmin: false,
        hasPrefilledComposerContext: true,
    }), '');
});

test('requester pages still honor an explicit ticket selection', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: 'ticket-1',
        tickets,
        isAdmin: false,
        hasPrefilledComposerContext: true,
    }), 'ticket-1');
});

test('admin queue still auto-selects the first visible ticket', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: '',
        tickets,
        isAdmin: true,
        hasPrefilledComposerContext: false,
    }), 'ticket-1');
});

test('ticket creation keeps the created ticket even when attachment finalization fails', async () => {
    const warning = await finalizeCreatedSupportTicket({
        ticketId: 'ticket-1',
        draftId: 'draft-1',
        finalizeDraftAttachments: async () => {
            throw new Error('Attachments could not be finalized');
        },
    });

    assert.equal(warning, 'Attachments could not be finalized');
});

test('ticket creation returns no warning when there is no draft to finalize', async () => {
    let finalizeCalled = false;

    const warning = await finalizeCreatedSupportTicket({
        ticketId: 'ticket-1',
        draftId: '',
        finalizeDraftAttachments: async () => {
            finalizeCalled = true;
        },
    });

    assert.equal(warning, '');
    assert.equal(finalizeCalled, false);
});
