import { getErrorMessage, getErrorStatus } from '@/lib/apiUtils';

export interface ConversationThreadIssue {
    conversationId: string;
    title: string;
    message: string;
}

export const buildConversationPropertyPath = (propertyId?: string | null, role?: string | null) => {
    const normalized = String(propertyId || '').trim();
    if (!normalized) {
        return null;
    }

    const encodedPropertyId = encodeURIComponent(normalized);
    const normalizedRole = String(role || '').trim().toLowerCase();
    if (normalizedRole === 'manager' || normalizedRole === 'broker') {
        return `/manager/dashboard/properties/${encodedPropertyId}`;
    }
    if (normalizedRole === 'admin') {
        return `/admin/properties/${encodedPropertyId}`;
    }
    return `/user/properties/${encodedPropertyId}`;
};

export interface ConversationQueryResolutionInput {
    requestedConversationId: string | null | undefined;
    hasLoadedConversations: boolean;
    availableConversationIds: string[];
    hasAttemptedRefresh?: boolean;
    ignoredConversationId?: string | null;
}

export interface ConversationQueryResolution {
    status: 'ignore' | 'wait' | 'refresh' | 'select' | 'unavailable';
    conversationId: string | null;
}

export const resolveHasLoadedConversations = (wasLoaded: boolean, loadSucceeded: boolean) => (
    wasLoaded || loadSucceeded
);

const UNAVAILABLE_THREAD_TITLE = 'This enquiry thread is unavailable';
const UNAVAILABLE_THREAD_MESSAGE = 'Open another enquiry or try another conversation.';
const REFRESH_FAILED_THREAD_TITLE = 'We could not refresh this enquiry';
const REFRESH_FAILED_THREAD_MESSAGE = 'Check your connection, then retry or return to your conversations.';

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
        status: 'unavailable',
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

export function createConversationRefreshFailedIssue(conversationId: string): ConversationThreadIssue {
    return {
        conversationId,
        title: REFRESH_FAILED_THREAD_TITLE,
        message: REFRESH_FAILED_THREAD_MESSAGE,
    };
}
