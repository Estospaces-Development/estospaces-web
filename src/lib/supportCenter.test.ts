import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    buildPrefilledSupportComposer,
    getAutoSelectedSupportTicketId,
    getLaunchSafeSupportCategoryLabel,
    hasPrefilledSupportComposerContext,
    normalizeSupportTicketCategory,
    resolveSupportComposerCategory,
    shouldLoadSupportTicketDetail,
} from '@/lib/supportCenter';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
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

test('support attachments are sent without a media reassign, which media rejects for support files', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');
    const serviceSource = readFileSync(resolve(process.cwd(), 'src/services/supportService.ts'), 'utf8');
    // Messaging binds support attachments to the sender and a support* entity type, so draft uploads stay readable.
    assert.doesNotMatch(serviceSource, /reassignMediaEntity/);
    assert.doesNotMatch(source, /finalizeDraftAttachments/);
    const handleReply = source.slice(source.indexOf('const handleReply'), source.indexOf('const handleReply') + 900);
    assert.ok(handleReply.includes('await supportService.sendReply(selectedTicket.conversation_id, reply.trim(), replyAttachments)'));
});

test('requesters are offered Close only on active tickets and Reopen on resolved ones', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');
    assert.ok(source.includes("(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && <button onClick={() => void patchTicket({ status: 'closed' })}"));
    assert.ok(source.includes("selectedTicket.status === 'resolved' && <button onClick={() => void patchTicket({ status: 'open' })}"));
    assert.ok(!source.includes("selectedTicket.status !== 'closed' && <button onClick={() => void patchTicket({ status: 'closed' })}"));
});

test('ticket creation refresh is silent so success is not followed by a contradictory load error', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');
    assert.match(source, /await fetchTickets\(true\);[\s\S]*?toast\.success\('Support ticket created'\)/);
    assert.match(source, /catch \(error: any\) \{\s*if \(!silent && supportCenterMountedRef\.current && fetchingRef\.current === request\) \{\s*toast\.error\(error\.message \|\| 'Failed to load support tickets'\)/);
});

test('support actions expose a visible pending state and avoid button-submit side effects', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');
    const ticketListSource = readFileSync(resolve(process.cwd(), 'src/components/support/SupportTicketList.tsx'), 'utf8');

    assert.match(source, /const resumeLiveSupport = useCallback/);
    assert.match(source, /Opening support…/);
    assert.match(source, /disabled=\{loading\}/);
    assert.match(source, /loading \? <ActionSpinner size="sm" label="Refreshing support tickets" \/> : <RefreshCw className="h-4 w-4" \/>/);
    assert.match(source, /New ticket/);
    assert.match(ticketListSource, /type="button"/);
    assert.match(ticketListSource, /aria-current=\{active \? 'page' : undefined\}/);
});

test('resuming support always clears its pending state after the detail request settles or is already in flight', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');

    assert.match(source, /if \(loadingTicketDetailsRef\.current\.has\(ticketId\)\) \{\s*setResumingTicketId\(\(current\) => current === ticketId \? null : current\);\s*return;/);
    assert.match(source, /loadingTicketDetailsRef\.current\.delete\(ticketId\);\s*if \(!silent && supportCenterMountedRef\.current\) \{\s*setDetailLoading\(false\);\s*setResumingTicketId\(\(current\) => current === ticketId \? null : current\);/);
});

test('selecting a support ticket scrolls directly to its loaded transcript', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');

    assert.match(source, /const ticketTranscriptRef = useRef<HTMLDivElement>\(null\)/);
    assert.match(source, /if \(!selectedTicketId \|\| selectedTicket\?\.id !== selectedTicketId\) \{\s*return;\s*\}[\s\S]{0,600}?window\.setTimeout\(\(\) => \{\s*ticketTranscriptRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\);\s*\}, 0\);\s*return \(\) => window\.clearTimeout\(timer\);/);
    assert.match(source, /<div ref=\{ticketTranscriptRef\} className="min-w-0 space-y-5">/);
});

test('background support polling never surfaces repeated detail-load errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');

    assert.match(source, /const loadingTicketDetailsRef = useRef\(new Set<string>\(\)\)/);
    assert.match(source, /if \(loadingTicketDetailsRef\.current\.has\(ticketId\)\) \{\s*setResumingTicketId\(\(current\) => current === ticketId \? null : current\);\s*return;/);
    assert.match(source, /catch \(error: any\) \{\s*if \(!silent && supportCenterMountedRef\.current\) \{[\s\S]*?toast\.error\(error\.message \|\| 'Failed to load support thread'\);/);
    assert.doesNotMatch(source, /catch \(error: any\) \{\s*if \(!silent && supportCenterMountedRef\.current\) \{[\s\S]*?\}\s*toast\.error\(error\.message \|\| 'Failed to load support thread'\);/);
});

test('support requests cannot restore a stale support deep link after route unmount', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'), 'utf8');

    assert.match(source, /const supportCenterMountedRef = useRef\(false\)/);
    assert.match(source, /return \(\) => \{\s*supportCenterMountedRef\.current = false;\s*detailRequestVersionRef\.current \+= 1;/);
    assert.match(source, /await supportService\.getAllTickets[\s\S]*?if \(!supportCenterMountedRef\.current \|\| fetchingRef\.current !== request\) return;[\s\S]*?setSearchParams/);
    assert.match(source, /await supportService\.getTicket\(ticketId\);\s*if \(!supportCenterMountedRef\.current \|\| requestVersion !== detailRequestVersionRef\.current\) return;/);
});

test('support category normalization maps UI-only labels to backend-safe values', () => {
    assert.equal(normalizeSupportTicketCategory('Buying Help'), 'general inquiry');
    assert.equal(normalizeSupportTicketCategory('Billing'), PAYMENTS_ENABLED ? 'payments' : 'contracts');
    assert.equal(normalizeSupportTicketCategory('Payments'), PAYMENTS_ENABLED ? 'payments' : 'contracts');
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

test('support composer resolves finance URL aliases to the visible payment label when enabled', () => {
    assert.equal(
        resolveSupportComposerCategory(
            'billing',
            ['General Inquiry', 'Payments', 'Contracts', 'Technical Issue'],
            'General Inquiry',
        ),
        PAYMENTS_ENABLED ? 'Payments' : 'Contracts',
    );

    assert.equal(
        resolveSupportComposerCategory(
            'payments',
            ['General Inquiry', 'Payments', 'Contracts', 'Technical Issue'],
            'General Inquiry',
        ),
        PAYMENTS_ENABLED ? 'Payments' : 'Contracts',
    );
});

test('support category labels follow payment workspace availability', () => {
    const expected = PAYMENTS_ENABLED ? 'Payments' : 'Contracts';
    assert.equal(getLaunchSafeSupportCategoryLabel('Payments'), expected);
    assert.equal(getLaunchSafeSupportCategoryLabel('billing'), expected);
    assert.equal(getLaunchSafeSupportCategoryLabel('Invoices'), expected);
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
