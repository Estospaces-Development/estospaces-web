import type { SupportTicketSummary } from '@/services/messagesService';

export const hasPrefilledSupportComposerContext = (searchParams: URLSearchParams): boolean => (
    ['category', 'subject', 'message'].some((key) => Boolean(searchParams.get(key)?.trim()))
);

const SUPPORT_CATEGORY_LABEL_TO_VALUE: Record<string, string> = {
    'general inquiry': 'general inquiry',
    'buying help': 'general inquiry',
    'renting help': 'general inquiry',
    'technical issue': 'technical issue',
    'fast track': 'fast track',
    'contracts': 'contracts',
    'payments': 'payments',
    'billing': 'payments',
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
    payments: 'Payments',
    verification: 'Verification',
    viewings: 'Viewings',
};

const normalizeCategoryKey = (value: string) => value.trim().toLowerCase();

export const normalizeSupportTicketCategory = (value: string, fallback = 'General Inquiry'): string => (
    SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizeCategoryKey(value)]
    || SUPPORT_CATEGORY_LABEL_TO_VALUE[normalizeCategoryKey(fallback)]
    || 'general inquiry'
);

export const resolveSupportComposerCategory = (
    value: string,
    availableCategories: string[],
    fallbackCategory: string,
): string => {
    const normalizedValue = normalizeCategoryKey(value);
    if (!normalizedValue) {
        return fallbackCategory;
    }

    const directMatch = availableCategories.find((category) => normalizeCategoryKey(category) === normalizedValue);
    if (directMatch) {
        return directMatch;
    }

    const mappedLabel = SUPPORT_CATEGORY_VALUE_TO_LABEL[normalizedValue];
    if (mappedLabel) {
        const compatibleLabel = availableCategories.find((category) => normalizeCategoryKey(category) === normalizeCategoryKey(mappedLabel));
        if (compatibleLabel) {
            return compatibleLabel;
        }
    }

    return fallbackCategory;
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
    priority,
});

export const getAutoSelectedSupportTicketId = ({
    selectedTicketId,
    tickets,
    isAdmin,
    hasPrefilledComposerContext,
}: {
    selectedTicketId: string;
    tickets: SupportTicketSummary[];
    isAdmin: boolean;
    hasPrefilledComposerContext: boolean;
}): string => {
    if (selectedTicketId) {
        return selectedTicketId;
    }

    if (!isAdmin && hasPrefilledComposerContext) {
        return '';
    }

    return isAdmin ? (tickets[0]?.id || '') : '';
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
