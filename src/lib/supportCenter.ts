import type { SupportTicketSummary } from '@/services/messagesService';

export const hasPrefilledSupportComposerContext = (searchParams: URLSearchParams): boolean => (
    ['category', 'subject', 'message'].some((key) => Boolean(searchParams.get(key)?.trim()))
);

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
