import type { SupportTicketSummary } from '@/services/messagesService';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';

export const hasPrefilledSupportComposerContext = (searchParams: URLSearchParams): boolean => (
    ['category', 'subject', 'message', 'priority'].some((key) => Boolean(searchParams.get(key)?.trim()))
);

const SUPPORT_CATEGORY_LABEL_TO_VALUE: Record<string, string> = {
    'general inquiry': 'general inquiry',
    'buying help': 'general inquiry',
    'renting help': 'general inquiry',
    'technical issue': 'technical issue',
    'fast track': 'fast track',
    'contracts': 'contracts',
    'payments': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'payment': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'payment issue': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'billing': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'billing issue': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'invoices': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'invoice': PAYMENTS_ENABLED ? 'payments' : 'contracts',
    'verification': 'verification',
    'viewings': 'viewings',
    'listings': 'general inquiry',
    'leads': 'general inquiry',
    'applications': 'general inquiry',
    'support': 'general inquiry',
};

const SUPPORT_CATEGORY_VALUE_TO_LABEL: Record<string, string> = {
    'general inquiry': 'General Inquiry',
    'technical issue': 'Technical Issue',
    'fast track': 'Fast Track',
    contracts: 'Contracts',
    payments: PAYMENTS_ENABLED ? 'Payments' : 'Contracts',
    verification: 'Verification',
    viewings: 'Viewings',
};

const normalizeCategoryKey = (value: string) => value.trim().toLowerCase();
const inactiveFinanceCategoryPattern = /\b(payment|payments|invoice|invoices|billing)\b/i;
const SUPPORT_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export const normalizeSupportTicketCategory = (value: string, fallback = 'General Inquiry'): string => (
    SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizeCategoryKey(value)]
    || SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizeCategoryKey(fallback)]
    || 'general inquiry'
);

export const getLaunchSafeSupportCategoryLabel = (value?: string | null, fallback = 'Support'): string => {
    const category = String(value || '').trim();
    if (!category) {
        return fallback;
    }

    const normalizedCategory = normalizeCategoryKey(category);
    if (!PAYMENTS_ENABLED && inactiveFinanceCategoryPattern.test(normalizedCategory)) {
        return 'Contracts';
    }

    const backendValue = SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizedCategory] || normalizedCategory;
    return SUPPORT_CATEGORY_VALUE_TO_LABEL[backendValue] || category;
};

export const resolveSupportComposerCategory = (
    value: string,
    availableCategories: string[],
    fallbackCategory: string,
): string => {
    const normalizedValue = normalizeCategoryKey(value);
    if (!normalizedValue) {
        return fallbackCategory;
    }

    if (!PAYMENTS_ENABLED && inactiveFinanceCategoryPattern.test(normalizedValue)) {
        const compatibleLabel = availableCategories.find((category) => normalizeCategoryKey(category) === 'contracts');
        return compatibleLabel || fallbackCategory;
    }

    const directMatch = availableCategories.find((category) => normalizeCategoryKey(category) === normalizedValue);
    if (directMatch) {
        return directMatch;
    }

    const backendValue = SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizedValue] || normalizedValue;
    const mappedLabel = SUPPORT_CATEGORY_VALUE_TO_LABEL[backendValue];
    if (mappedLabel) {
        const compatibleLabel = availableCategories.find((category) => normalizeCategoryKey(category) === normalizeCategoryKey(mappedLabel));
        if (compatibleLabel) {
            return compatibleLabel;
        }
    }

    return fallbackCategory;
};

export const resolveSupportComposerPriority = (
    value: string,
    fallbackPriority: SupportTicketSummary['priority'],
): SupportTicketSummary['priority'] => {
    const normalizedPriority = value.trim().toLowerCase();
    return SUPPORT_PRIORITIES.has(normalizedPriority)
        ? normalizedPriority as SupportTicketSummary['priority']
        : fallbackPriority;
};

export const buildPrefilledSupportComposer = ({
    searchParams,
    availableCategories,
    fallbackCategory,
    priority,
}: {
    searchParams: URLSearchParams;
    availableCategories: string[];
    fallbackCategory: string;
    priority: SupportTicketSummary['priority'];
}): {
    category: string;
    subject: string;
    message: string;
    priority: SupportTicketSummary['priority'];
} => ({
    category: resolveSupportComposerCategory(
        searchParams.get('category') || '',
        availableCategories,
        fallbackCategory,
    ),
    subject: searchParams.get('subject') || '',
    message: searchParams.get('message') || '',
    priority: resolveSupportComposerPriority(searchParams.get('priority') || '', priority),
});

export const getAutoSelectedSupportTicketId = ({
    selectedTicketId,
    selectedConversationId = '',
    tickets,
    isAdmin,
    hasPrefilledComposerContext,
    hasLocationHash = false,
}: {
    selectedTicketId: string;
    selectedConversationId?: string;
    tickets: SupportTicketSummary[];
    isAdmin: boolean;
    hasPrefilledComposerContext: boolean;
    hasLocationHash?: boolean;
}): string => {
    if (selectedTicketId) {
        if (selectedConversationId && !tickets.some((ticket) => ticket.id === selectedTicketId)) {
            return tickets.find((ticket) => ticket.conversation_id === selectedConversationId)?.id || selectedTicketId;
        }

        return selectedTicketId;
    }

    if (selectedConversationId) {
        return tickets.find((ticket) => ticket.conversation_id === selectedConversationId)?.id || '';
    }

    if (isAdmin && hasLocationHash) {
        return '';
    }

    if (!isAdmin && hasPrefilledComposerContext) {
        return '';
    }

    return isAdmin ? (tickets[0]?.id || '') : '';
};

type SupportFilterLike = {
    search?: string;
    status?: string;
    priority?: string;
    requesterRole?: string;
    assignee?: string;
};

export const hasActiveSupportFilters = (filters: SupportFilterLike): boolean => (
    Object.values(filters).some((value) => Boolean(String(value || '').trim()))
);

export const shouldLoadSupportTicketDetail = ({
    selectedTicketId,
    selectedConversationId = '',
    isAdmin,
    queueLoading,
    tickets = [],
    hasActiveFilters = false,
}: {
    selectedTicketId: string;
    selectedConversationId?: string;
    isAdmin: boolean;
    queueLoading: boolean;
    tickets?: SupportTicketSummary[];
    hasActiveFilters?: boolean;
}): boolean => {
    if (!selectedTicketId) {
        return false;
    }

    if (!isAdmin || !selectedConversationId) {
        return true;
    }

    if (queueLoading) {
        return false;
    }

    if (hasActiveFilters && !tickets.some((ticket) => ticket.id === selectedTicketId)) {
        return false;
    }

    const conversationTicket = tickets.find((ticket) => ticket.conversation_id === selectedConversationId);
    return !conversationTicket || conversationTicket.id === selectedTicketId;
};

export const finalizeCreatedSupportTicket = async ({
    ticketId,
    draftId,
    finalizeDraftAttachments,
}: {
    ticketId: string;
    draftId: string;
    finalizeDraftAttachments: (draftId: string, ticketId: string) => Promise<void>;
}): Promise<string> => {
    if (!draftId.trim()) {
        return '';
    }

    try {
        await finalizeDraftAttachments(draftId, ticketId);
        return '';
    } catch (error: any) {
        return error?.message || 'Support ticket created, but the attachments could not be finalized. You can reopen the ticket and retry the upload.';
    }
};
