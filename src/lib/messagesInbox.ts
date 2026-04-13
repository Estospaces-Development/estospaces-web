import { getErrorMessage, getErrorStatus } from '@/lib/apiUtils';

export interface ConversationThreadIssue {
    conversationId: string;
    title: string;
    message: string;
}

export interface ConversationQueryResolutionInput {
    requestedConversationId: string | null | undefined;
    hasLoadedConversations: boolean;
    availableConversationIds: string[];
}

export interface ConversationQueryResolution {
    status: 'ignore' | 'wait' | 'select' | 'clear';
    conversationId: string | null;
}

const UNAVAILABLE_THREAD_TITLE = 'This enquiry thread is unavailable';
const UNAVAILABLE_THREAD_MESSAGE = 'Open another enquiry or try another conversation.';

function normalizeConversationId(value: string | null | undefined) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
}

export function resolveConversationQuerySelection({
    requestedConversationId,
    hasLoadedConversations,
    availableConversationIds,
}: ConversationQueryResolutionInput): ConversationQueryResolution {
    const conversationId = normalizeConversationId(requestedConversationId);
    if (!conversationId) {
        return {
            status: 'ignore',
            conversationId: null,
        };
    }

    if (!hasLoadedConversations) {
        return {
            status: 'wait',
            conversationId,
        };
    }

    if (availableConversationIds.includes(conversationId)) {
        return {
            status: 'select',
            conversationId,
        };
    }

    return {
        status: 'clear',
        conversationId,
    };
}

export function isUnavailableConversationThreadError(error: unknown) {
    const status = getErrorStatus(error);
    if (status === 403 || status === 404) {
        return true;
    }

    const message = getErrorMessage(error, '').trim().toLowerCase();
    return message.includes('conversation not found');
}

export function createUnavailableConversationThreadIssue(conversationId: string): ConversationThreadIssue {
    return {
        conversationId,
        title: UNAVAILABLE_THREAD_TITLE,
        message: UNAVAILABLE_THREAD_MESSAGE,
    };
}
