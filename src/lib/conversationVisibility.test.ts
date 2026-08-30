import assert from 'node:assert/strict';
import test from 'node:test';

import type { Conversation } from '@/services/messagesService';
import {
    clearAuthorizedConversations,
    isUserVisibleConversation,
    mergeUserVisibleConversations,
    rememberAuthorizedConversation,
} from './conversationVisibility';

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
    id: 'conversation-1',
    type: 'direct',
    metadata: {},
    created_at: '2026-08-30T00:00:00Z',
    updated_at: '2026-08-30T00:00:00Z',
    ...overrides,
});

const installLocalStorage = () => {
    const values = new Map<string, string>();
    const storage = {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
    };
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: storage,
    });
    return values;
};

test('hides explicit system and automation-only conversations', () => {
    assert.equal(isUserVisibleConversation(conversation({ metadata: { is_test: true } })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: { qa_test: false } })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: { automation: { is_test: true } } })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: JSON.stringify({ context: [{ qa_test: false }] }) })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: JSON.stringify([{ is_test: true }]) })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: JSON.stringify([{ qa_test: false }]) })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"nested":{"is_test":true}' })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '"is_test":true' })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '"qa_test":false' })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"qa_test":false' })), false);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{qa_test:false' })), false);
    assert.equal(isUserVisibleConversation(conversation({ title: 'Mobile Live Approval mobile-live-1781121818495034' })), false);
    assert.equal(isUserVisibleConversation(conversation({ property_title: 'QA trace 2026-08-30T10-22-33' })), false);
});

test('keeps legitimate customer conversations and links', () => {
    assert.equal(isUserVisibleConversation(conversation({ title: 'Canal View Apartment' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: 'null' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '[]' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '"legacy"' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"not_is_test":true' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"note":"qa_test: customer phrase"' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"note":"x,is_test:true"' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{"note":"hello, qa_test: customer phrase"' })), true);
    assert.equal(isUserVisibleConversation(conversation({ metadata: '{is_test:trueish' })), true);
    assert.equal(isUserVisibleConversation(conversation({
        title: 'Viewing documents',
        last_message: {
            id: 'message-1',
            conversation_id: 'conversation-1',
            sender_id: 'manager-1',
            content: 'https://estospaces-web-dev.example.com/document/1',
            type: 'text',
            is_read: false,
            created_at: '2026-08-30T00:00:00Z',
        },
    })), true);
});

test('keeps a newly authorized direct conversation while the list endpoint catches up', () => {
    clearAuthorizedConversations();
    const newlyCreated = conversation({ id: 'new-conversation', title: 'New enquiry' });
    rememberAuthorizedConversation('user-1', newlyCreated, 1_000);

    assert.deepEqual(
        mergeUserVisibleConversations('user-1', [conversation({ id: 'existing-conversation' })], 2_000).map((item) => item.id),
        ['existing-conversation', 'new-conversation'],
    );

    clearAuthorizedConversations('user-1');
    assert.deepEqual(mergeUserVisibleConversations('user-1', []), []);
});

test('persists short-lived conversation authorization for reloads and other tabs', () => {
    const storedValues = installLocalStorage();
    clearAuthorizedConversations();
    const newlyCreated = conversation({ id: 'cross-tab-conversation', title: 'New enquiry' });

    rememberAuthorizedConversation('user-1', newlyCreated, 1_000);

    assert.equal(storedValues.size, 1);
    assert.match(Array.from(storedValues.values())[0], /cross-tab-conversation/);
    assert.deepEqual(
        mergeUserVisibleConversations('user-1', [], 2_000).map((item) => item.id),
        ['cross-tab-conversation'],
    );
    clearAuthorizedConversations();
    delete (globalThis as { localStorage?: unknown }).localStorage;
});

test('scopes temporary authorization by user and expires it', () => {
    clearAuthorizedConversations();
    rememberAuthorizedConversation('user-1', conversation({ id: 'private-conversation' }), 1_000);

    assert.deepEqual(mergeUserVisibleConversations('user-2', [], 2_000), []);
    assert.deepEqual(mergeUserVisibleConversations('user-1', [], 31_001), []);
});

test('drops temporary authorization after the authoritative list catches up', () => {
    clearAuthorizedConversations();
    const newlyCreated = conversation({ id: 'caught-up-conversation' });
    rememberAuthorizedConversation('user-1', newlyCreated, 1_000);

    assert.deepEqual(mergeUserVisibleConversations('user-1', [newlyCreated], 2_000).map((item) => item.id), ['caught-up-conversation']);
    assert.deepEqual(mergeUserVisibleConversations('user-1', [], 2_100), []);
});

test('does not retain a newly created internal QA conversation', () => {
    clearAuthorizedConversations();
    rememberAuthorizedConversation('user-1', conversation({ id: 'qa-conversation', metadata: { is_test: true } }));
    assert.deepEqual(mergeUserVisibleConversations('user-1', []), []);
});
