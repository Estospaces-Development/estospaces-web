import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiRequestError } from '@/lib/apiUtils';
import {
    buildConversationListUrl,
    buildConversationPropertyPath,
    createConversationRefreshFailedIssue,
    isUnavailableConversationThreadError,
    resolveConversationQuerySelection,
    resolveHasLoadedConversations,
} from '@/lib/messagesInbox';

test('a successful silent retry recovers conversation loaded state after a foreground failure', () => {
    const afterForegroundFailure = resolveHasLoadedConversations(false, false);
    assert.equal(afterForegroundFailure, false);
    assert.equal(resolveHasLoadedConversations(afterForegroundFailure, true), true);
});

test('failed authoritative refresh keeps the thread retryable instead of calling it unavailable', () => {
    assert.deepEqual(createConversationRefreshFailedIssue('conversation-1'), {
        conversationId: 'conversation-1',
        title: 'We could not refresh this enquiry',
        message: 'Check your connection, then retry or return to your conversations.',
    });
});

test('conversation property action targets the exact linked property', () => {
    assert.equal(buildConversationPropertyPath('property/one'), '/user/properties/property%2Fone');
    assert.equal(
        buildConversationPropertyPath('property/one', 'manager'),
        '/manager/dashboard/properties/property%2Fone',
    );
    assert.equal(
        buildConversationPropertyPath('property/one', 'broker'),
        '/manager/dashboard/properties/property%2Fone',
    );
    assert.equal(buildConversationPropertyPath('property/one', 'admin'), '/admin/properties/property%2Fone');
    assert.equal(buildConversationPropertyPath(''), null);
});

test('conversation query selection waits for the initial inbox load before selecting a deep link', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-1',
            hasLoadedConversations: false,
            availableConversationIds: ['conversation-1'],
        }),
        {
            status: 'wait',
            conversationId: 'conversation-1',
        },
    );
});

test('conversation query selection accepts an accessible deep-linked conversation', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-1',
            hasLoadedConversations: true,
            availableConversationIds: ['conversation-1', 'conversation-2'],
        }),
        {
            status: 'select',
            conversationId: 'conversation-1',
        },
    );
});

test('conversation list URL removes only the selected conversation query', () => {
    assert.equal(
        buildConversationListUrl('/manager/messages', '?conversation=thread-1&tab=open'),
        '/manager/messages?tab=open',
    );
    assert.equal(
        buildConversationListUrl('/manager/messages', '?conversation=thread-1'),
        '/manager/messages',
    );
});

test('conversation query selection ignores a conversation currently being dismissed', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-1',
            hasLoadedConversations: true,
            availableConversationIds: ['conversation-1'],
            ignoredConversationId: 'conversation-1',
        }),
        {
            status: 'ignore',
            conversationId: 'conversation-1',
        },
    );
});

test('conversation query selection retries the inbox refresh before clearing a new deep link', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-404',
            hasLoadedConversations: true,
            availableConversationIds: ['conversation-1', 'conversation-2'],
            hasAttemptedRefresh: false,
        }),
        {
            status: 'refresh',
            conversationId: 'conversation-404',
        },
    );
});

test('conversation query selection rejects an id absent after the authoritative refresh', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-404',
            hasLoadedConversations: true,
            availableConversationIds: ['conversation-1', 'conversation-2'],
            hasAttemptedRefresh: true,
        }),
        {
            status: 'unavailable',
            conversationId: 'conversation-404',
        },
    );
});

test('unavailable conversation thread detection classifies inaccessible conversation api errors', () => {
    const inaccessibleError = new ApiRequestError(
        'conversation not found',
        'Invalid data provided. Please check your inputs.',
        403,
    );
    const validationError = new ApiRequestError(
        'recipient_id is required',
        'Invalid data provided. Please check your inputs.',
        400,
    );

    assert.equal(isUnavailableConversationThreadError(inaccessibleError), true);
    assert.equal(isUnavailableConversationThreadError(validationError), false);
});
