import type { Conversation } from '@/services/messagesService';

import { isInternalApplicationTitle } from './applicationDisplayTitle';

interface AuthorizedConversationEntry {
    conversation: Conversation;
    expiresAt: number;
}

const AUTHORIZED_CONVERSATION_TTL_MS = 30_000;
const AUTHORIZED_CONVERSATION_STORAGE_PREFIX = 'estospaces:authorized-conversations:v1:';
const recentlyAuthorizedConversations = new Map<string, Map<string, AuthorizedConversationEntry>>();
const INTERNAL_CONVERSATION_TITLE_PATTERNS = [
    /\bround\d+\s+contact\s+agent\s+proof(?:\s+home)?\b/i,
    /^test\s+user(?:'s)?\s+fast[-\s]*track\s+case$/i,
];

const getAuthorizedConversationStorage = () => {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
};

const getAuthorizedConversationStorageKey = (userId: string) => (
    `${AUTHORIZED_CONVERSATION_STORAGE_PREFIX}${encodeURIComponent(userId)}`
);

const persistAuthorizedConversations = (
    userId: string,
    conversations: Map<string, AuthorizedConversationEntry>,
) => {
    const storage = getAuthorizedConversationStorage();
    if (!storage) {
        return;
    }

    const key = getAuthorizedConversationStorageKey(userId);
    try {
        if (conversations.size === 0) {
            storage.removeItem(key);
            return;
        }
        storage.setItem(key, JSON.stringify(Array.from(conversations.entries())));
    } catch {
        // The in-memory cache still covers the active tab when storage is unavailable.
    }
};

const readPersistedAuthorizedConversations = (userId: string) => {
    const storage = getAuthorizedConversationStorage();
    if (!storage) {
        return new Map<string, AuthorizedConversationEntry>();
    }

    try {
        const raw = storage.getItem(getAuthorizedConversationStorageKey(userId));
        const entries = raw ? JSON.parse(raw) as unknown : [];
        if (!Array.isArray(entries)) {
            return new Map<string, AuthorizedConversationEntry>();
        }

        return new Map(
            entries.filter((entry): entry is [string, AuthorizedConversationEntry] => (
                Array.isArray(entry)
                && typeof entry[0] === 'string'
                && Boolean(entry[1])
                && typeof entry[1] === 'object'
                && typeof (entry[1] as AuthorizedConversationEntry).expiresAt === 'number'
                && Boolean((entry[1] as AuthorizedConversationEntry).conversation?.id)
            )),
        );
    } catch {
        return new Map<string, AuthorizedConversationEntry>();
    }
};

const getAuthorizedConversationsForUser = (userId: string) => {
    const merged = new Map<string, AuthorizedConversationEntry>(
        recentlyAuthorizedConversations.get(userId) || [],
    );
    for (const [conversationId, entry] of readPersistedAuthorizedConversations(userId)) {
        const current = merged.get(conversationId);
        if (!current || entry.expiresAt > current.expiresAt) {
            merged.set(conversationId, entry);
        }
    }
    return merged;
};

const readMetadata = (metadata: Conversation['metadata']) => {
    if (typeof metadata !== 'string') {
        return metadata && typeof metadata === 'object'
            ? metadata
            : {};
    }

    try {
        const parsed = JSON.parse(metadata) as unknown;
        return parsed && typeof parsed === 'object'
            ? parsed as Record<string, unknown> | unknown[]
            : {};
    } catch {
        return {};
    }
};

const readText = (value: unknown) => typeof value === 'string' ? value : '';

const hasRawInternalMetadataMarker = (metadata: Conversation['metadata']) => {
    if (typeof metadata !== 'string') {
        return false;
    }

    try {
        JSON.parse(metadata);
        return false;
    } catch {}

    const readKeyAt = (start: number) => {
        let cursor = start;
        while (/\s/.test(metadata[cursor] || '')) cursor += 1;

        let key = '';
        const quote = metadata[cursor] === '"' || metadata[cursor] === "'" ? metadata[cursor] : '';
        if (quote) {
            cursor += 1;
            while (cursor < metadata.length && metadata[cursor] !== quote) {
                if (metadata[cursor] === '\\' && cursor + 1 < metadata.length) cursor += 1;
                key += metadata[cursor];
                cursor += 1;
            }
            if (metadata[cursor] !== quote) return false;
            cursor += 1;
        } else {
            while (/[a-z0-9_]/i.test(metadata[cursor] || '')) {
                key += metadata[cursor];
                cursor += 1;
            }
        }

        while (/\s/.test(metadata[cursor] || '')) cursor += 1;
        if (metadata[cursor] !== ':') return false;
        cursor += 1;
        while (/\s/.test(metadata[cursor] || '')) cursor += 1;

        const normalizedKey = key.toLowerCase();
        if (normalizedKey === 'qa_test') return true;
        if (normalizedKey !== 'is_system' && normalizedKey !== 'is_test') return false;
        if (metadata.slice(cursor, cursor + 4).toLowerCase() !== 'true') return false;
        const boundary = metadata[cursor + 4];
        return !boundary || /[\s,}\]]/.test(boundary);
    };

    let quote = '';
    let escaped = false;
    for (let index = 0; index < metadata.length; index += 1) {
        const character = metadata[index];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === quote) {
                quote = '';
            }
            continue;
        }
        const keyStart = character === '{' || character === ',' ? index + 1 : 0;
        if ((index === 0 || character === '{' || character === ',') && readKeyAt(keyStart)) {
            return true;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
    }
    return false;
};

const hasInternalMetadataMarker = (metadata: unknown) => {
    const pending: unknown[] = [metadata];
    const visited = new Set<object>();

    while (pending.length > 0) {
        const value = pending.pop();
        if (!value || typeof value !== 'object' || visited.has(value)) {
            continue;
        }
        visited.add(value);

        if (!Array.isArray(value)) {
            const record = value as Record<string, unknown>;
            if (
                record.is_system === true
                || record.is_test === true
                || Object.prototype.hasOwnProperty.call(record, 'qa_test')
            ) {
                return true;
            }
        }

        pending.push(...Object.values(value));
    }

    return false;
};

export const isUserVisibleConversation = (conversation: Conversation) => {
    const metadataValue = readMetadata(conversation.metadata);
    const metadata = Array.isArray(metadataValue) ? {} : metadataValue;
    if (
        String(conversation.type) === 'system'
        || hasRawInternalMetadataMarker(conversation.metadata)
        || hasInternalMetadataMarker(metadataValue)
    ) {
        return false;
    }

    const displayNames = [
        conversation.title,
        conversation.property_title,
        readText(metadata.property_title),
        readText(metadata.propertyTitle),
        readText(metadata.application_title),
        readText(metadata.applicationTitle),
    ];

    return !displayNames.some((value) => (
        isInternalApplicationTitle(value)
        || INTERNAL_CONVERSATION_TITLE_PATTERNS.some((pattern) => pattern.test(readText(value).trim()))
    ));
};

export const rememberAuthorizedConversation = (
    userId: string,
    conversation: Conversation,
    now = Date.now(),
) => {
    const normalizedUserId = userId.trim();
    if (normalizedUserId && conversation?.id && isUserVisibleConversation(conversation)) {
        const userConversations = getAuthorizedConversationsForUser(normalizedUserId);
        userConversations.set(conversation.id, {
            conversation,
            expiresAt: now + AUTHORIZED_CONVERSATION_TTL_MS,
        });
        recentlyAuthorizedConversations.set(normalizedUserId, userConversations);
        persistAuthorizedConversations(normalizedUserId, userConversations);
    }
};

export const forgetAuthorizedConversation = (userId: string, conversationId: string) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
        return;
    }
    const userConversations = getAuthorizedConversationsForUser(normalizedUserId);
    userConversations.delete(conversationId);
    if (userConversations.size === 0) {
        recentlyAuthorizedConversations.delete(normalizedUserId);
        persistAuthorizedConversations(normalizedUserId, userConversations);
        return;
    }
    recentlyAuthorizedConversations.set(normalizedUserId, userConversations);
    persistAuthorizedConversations(normalizedUserId, userConversations);
};

export const clearAuthorizedConversations = (userId?: string) => {
    const normalizedUserId = userId?.trim();
    if (normalizedUserId) {
        recentlyAuthorizedConversations.delete(normalizedUserId);
        persistAuthorizedConversations(normalizedUserId, new Map());
        return;
    }
    recentlyAuthorizedConversations.clear();
    const storage = getAuthorizedConversationStorage();
    if (!storage) {
        return;
    }
    try {
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
            .filter((key): key is string => Boolean(key?.startsWith(AUTHORIZED_CONVERSATION_STORAGE_PREFIX)));
        keys.forEach((key) => storage.removeItem(key));
    } catch {
        // Clearing the in-memory cache is sufficient when browser storage is unavailable.
    }
};

export const mergeUserVisibleConversations = (
    userId: string,
    conversations: Conversation[],
    now = Date.now(),
) => {
    const merged = new Map<string, Conversation>();
    for (const conversation of conversations) {
        if (isUserVisibleConversation(conversation)) {
            merged.set(conversation.id, conversation);
        }
    }

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
        return Array.from(merged.values());
    }
    const userConversations = getAuthorizedConversationsForUser(normalizedUserId);

    for (const [conversationId, entry] of userConversations) {
        if (merged.has(conversationId) || entry.expiresAt <= now) {
            userConversations.delete(conversationId);
            continue;
        }
        if (isUserVisibleConversation(entry.conversation)) {
            merged.set(conversationId, entry.conversation);
        }
    }
    if (userConversations.size === 0) {
        recentlyAuthorizedConversations.delete(normalizedUserId);
    } else {
        recentlyAuthorizedConversations.set(normalizedUserId, userConversations);
    }
    persistAuthorizedConversations(normalizedUserId, userConversations);
    return Array.from(merged.values());
};
