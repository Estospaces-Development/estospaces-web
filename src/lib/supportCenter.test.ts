import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildPrefilledSupportComposer,
    finalizeCreatedSupportTicket,
    getAutoSelectedSupportTicketId,
    getLaunchSafeSupportCategoryLabel,
    hasPrefilledSupportComposerContext,
    normalizeSupportTicketCategory,
    resolveSupportComposerCategory,
    shouldLoadSupportTicketDetail,
} from '@/lib/supportCenter';
import type { SupportTicketSummary } from '@/services/messagesService';

const tickets: SupportTicketSummary[] = [
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

test('admin queue preserves guidance anchors instead of auto-selecting a ticket', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: '',
        tickets,
        isAdmin: true,
        hasPrefilledComposerContext: false,
        hasLocationHash: true,
    }), '');
});

test('admin queue resolves a selected conversation to its support ticket', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: '',
        selectedConversationId: 'conversation-1',
        tickets,
        isAdmin: true,
        hasPrefilledComposerContext: false,
    }), 'ticket-1');
});

test('admin queue recovers from a stale ticket query when the conversation still matches', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: 'stale-ticket',
        selectedConversationId: 'conversation-1',
        tickets,
        isAdmin: true,
        hasPrefilledComposerContext: false,
    }), 'ticket-1');
});

test('admin queue waits to load ticket detail until ticket and conversation links are resolved', () => {
    assert.equal(shouldLoadSupportTicketDetail({
        selectedTicketId: 'stale-ticket',
        selectedConversationId: 'conversation-1',
        isAdmin: true,
        queueLoading: true,
        tickets,
    }), false);
});

test('admin queue does not load a stale ticket after the queue resolves the conversation to another ticket', () => {
    assert.equal(shouldLoadSupportTicketDetail({
        selectedTicketId: 'stale-ticket',
        selectedConversationId: 'conversation-1',
        isAdmin: true,
        queueLoading: false,
        tickets,
    }), false);
});

test('admin queue still loads an explicit ticket after the queue resolves', () => {
    assert.equal(shouldLoadSupportTicketDetail({
        selectedTicketId: 'ticket-1',
        selectedConversationId: 'conversation-1',
        isAdmin: true,
        queueLoading: false,
        tickets,
    }), true);
});

test('admin queue still loads an explicit ticket when filters hide it from the queue', () => {
    assert.equal(shouldLoadSupportTicketDetail({
        selectedTicketId: 'ticket-hidden-by-filter',
        selectedConversationId: 'conversation-hidden-by-filter',
        isAdmin: true,
        queueLoading: false,
        tickets,
    }), true);
});

test('admin queue stops loading stale ticket detail when active filters remove the selected ticket', () => {
    assert.equal(shouldLoadSupportTicketDetail({
        selectedTicketId: 'ticket-hidden-by-filter',
        selectedConversationId: 'conversation-hidden-by-filter',
        isAdmin: true,
        queueLoading: false,
        tickets,
        hasActiveFilters: true,
    }), false);
});

test('admin queue does not fall back to the first ticket for an unknown selected conversation', () => {
    assert.equal(getAutoSelectedSupportTicketId({
        selectedTicketId: '',
        selectedConversationId: 'missing-conversation',
        tickets,
        isAdmin: true,
        hasPrefilledComposerContext: false,
    }), '');
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

test('support category normalization maps UI-only labels to backend-safe values', () => {
    assert.equal(normalizeSupportTicketCategory('Buying Help'), 'general inquiry');
    assert.equal(normalizeSupportTicketCategory('Billing'), 'contracts');
    assert.equal(normalizeSupportTicketCategory('Payments'), 'contracts');
    assert.equal(normalizeSupportTicketCategory('Technical Issue'), 'technical issue');
});

test('support composer resolves backend category values to the nearest visible label', () => {
    assert.equal(
        resolveSupportComposerCategory(
            'general inquiry',
            ['General Inquiry', 'Buying Help', 'Fast Track'],
            'General Inquiry',
        ),
        'General Inquiry',
    );
});

test('support composer resolves finance URL aliases to the visible contracts label', () => {
    assert.equal(
        resolveSupportComposerCategory(
            'billing',
            ['General Inquiry', 'Payments', 'Contracts', 'Technical Issue'],
            'General Inquiry',
        ),
        'Contracts',
    );

    assert.equal(
        resolveSupportComposerCategory(
            'payments',
            ['General Inquiry', 'Payments', 'Contracts', 'Technical Issue'],
            'General Inquiry',
        ),
        'Contracts',
    );
});

test('support category labels hide inactive payment and invoice workspace copy', () => {
    assert.equal(getLaunchSafeSupportCategoryLabel('Payments'), 'Contracts');
    assert.equal(getLaunchSafeSupportCategoryLabel('billing'), 'Contracts');
    assert.equal(getLaunchSafeSupportCategoryLabel('Invoices'), 'Contracts');
    assert.equal(getLaunchSafeSupportCategoryLabel('Technical Issue'), 'Technical Issue');
});

test('support composer prefill builds the visible draft from query params', () => {
    const composer = buildPrefilledSupportComposer({
        searchParams: new URLSearchParams({
            category: 'technical issue',
            subject: 'Need help cancelling a viewing',
            message: 'How do I cancel my viewing?',
            priority: 'urgent',
        }),
        availableCategories: ['General Inquiry', 'Technical Issue', 'Fast Track'],
        fallbackCategory: 'General Inquiry',
        priority: 'medium',
    });

    assert.deepEqual(composer, {
        category: 'Technical Issue',
        subject: 'Need help cancelling a viewing',
        message: 'How do I cancel my viewing?',
        priority: 'urgent',
    });
});

test('support composer prefill ignores unsupported priority query values', () => {
    const composer = buildPrefilledSupportComposer({
        searchParams: new URLSearchParams({
            priority: 'critical',
        }),
        availableCategories: ['General Inquiry', 'Technical Issue', 'Fast Track'],
        fallbackCategory: 'General Inquiry',
        priority: 'high',
    });

    assert.equal(composer.priority, 'high');
});
