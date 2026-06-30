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
    hasAttemptedRefresh?: boolean;
    ignoredConversationId?: string | null;
}

export interface ConversationQueryResolution {
    status: 'ignore' | 'wait' | 'refresh' | 'select';
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
    hasAttemptedRefresh = false,
    ignoredConversationId,
}: ConversationQueryResolutionInput): ConversationQueryResolution {
    const conversationId = normalizeConversationId(requestedConversationId);
    if (!conversationId) {
        return {
            status: 'ignore',
            conversationId: null,
        };
    }

    if (conversationId === normalizeConversationId(ignoredConversationId)) {
        return {
            status: 'ignore',
            conversationId,
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

    if (!hasAttemptedRefresh) {
        return {
            status: 'refresh',
            conversationId,
        };
    }

    return {
        status: 'select',
        conversationId,
    };
}

export function buildConversationListUrl(pathname: string, search: string) {
    const params = new URLSearchParams(search);
    params.delete('conversation');

    const nextSearch = params.toString();
    return nextSearch ? `${pathname}?${nextSearch}` : pathname;
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
