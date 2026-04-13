import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiRequestError } from '@/lib/apiUtils';
import {
    isUnavailableConversationThreadError,
    resolveConversationQuerySelection,
} from '@/lib/messagesInbox';

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

test('conversation query selection clears a stale deep-linked conversation after load', () => {
    assert.deepEqual(
        resolveConversationQuerySelection({
            requestedConversationId: 'conversation-404',
            hasLoadedConversations: true,
            availableConversationIds: ['conversation-1', 'conversation-2'],
        }),
        {
            status: 'clear',
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
