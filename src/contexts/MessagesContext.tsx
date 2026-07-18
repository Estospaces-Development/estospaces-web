"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as messagesService from '@/services/messagesService';
import { useAuth } from './AuthContext';
import { usePublishWorkspaceSync, useWorkspaceRefresh } from './WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    createUnavailableConversationThreadIssue,
    isUnavailableConversationThreadError,
    type ConversationThreadIssue,
} from '@/lib/messagesInbox';

interface Message {
    id: string;
    senderId: string;
    senderType: string;
    text: string;
    timestamp: string;
    time: string;
    read: boolean;
    delivered: boolean;
    attachments: messagesService.MessageAttachment[];
}

interface Conversation {
    id: string;
    isSupportConversation: boolean;
    agentId: string;
    agentName: string;
    contactName: string;
    agentAgency: string;
    agentAvatar: string | null;
    agentEmail: string;
    agentPhone: string;
    isOnline: boolean;
    propertyId: string | null;
    propertyTitle: string | null;
    propertyAddress: string | null;
    propertyImage: string | null;
    propertyPrice: number | null;
    isArchived: boolean;
    isMuted: boolean;
    lastActivity: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    messages: Message[];
    messagesPage: number;
    hasOlderMessages: boolean;
    isLoadingOlderMessages: boolean;
}

interface MessagesContextType {
    conversations: Conversation[];
    allConversations: Conversation[];
    selectedConversationId: string | null;
    setSelectedConversationId: (id: string | null) => void;
    filter: string;
    setFilter: (filter: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isLoading: boolean;
    hasLoadedConversations: boolean;
    totalUnreadCount: number;
    conversationThreadIssue: ConversationThreadIssue | null;
    clearConversationThreadIssue: () => void;
    createConversation: (agentData: any, propertyData: any) => Promise<string>;
    sendMessage: (conversationId: string, text: string, attachments?: any[]) => Promise<void>;
    markAsRead: (conversationId: string) => Promise<void>;
    loadOlderMessages: (conversationId: string) => Promise<void>;
    archiveConversation: (conversationId: string) => Promise<void>;
    unarchiveConversation: (conversationId: string) => Promise<void>;
    muteConversation: (conversationId: string) => Promise<void>;
    unmuteConversation: (conversationId: string) => Promise<void>;
    deleteConversation: (conversationId: string) => void;
    getConversation: (conversationId: string) => Conversation | undefined;
    quickReplyTemplates: string[];
    refreshConversations: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const useMessages = () => {
    const context = useContext(MessagesContext);
    if (!context) {
        throw new Error('useMessages must be used within a MessagesProvider');
    }
    return context;
};

const quickReplyTemplates = [
    "Is this property still available?",
    "Can I schedule a viewing?",
    "What are the property details?",
    "What's the best time to contact you?",
    "I'm interested in this property.",
];

const CONVERSATION_POLL_INTERVAL_MS = 5000;
const MESSAGE_POLL_INTERVAL_MS = 3000;
const MESSAGE_PAGE_SIZE = 20;

const parseMetadata = (metadata: messagesService.Conversation['metadata']) => {
    if (!metadata) {
        return {} as Record<string, any>;
    }

    if (typeof metadata === 'string') {
        try {
            return JSON.parse(metadata) as Record<string, any>;
        } catch {
            return {};
        }
    }

    return metadata as Record<string, any>;
};

const formatMessageTime = (timestamp?: string) => {
    if (!timestamp) {
        return '';
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const resolveCurrentUserName = (user: any) => {
    return user?.user_metadata?.full_name || user?.name || user?.email || 'You';
};

const resolveCurrentUserPhone = (user: any) => {
    return user?.phone || user?.user_metadata?.phone || '';
};

const buildConversationContext = (
    user: any,
    agentData: any,
    propertyData: any,
): messagesService.ConversationContext => ({
    propertyId: propertyData?.id || null,
    propertyTitle: propertyData?.title || null,
    propertyAddress: propertyData?.address || propertyData?.address_line_1 || null,
    propertyImage: propertyData?.image || propertyData?.image_urls?.[0] || null,
    listingType: propertyData?.listingType || propertyData?.listing_type || null,
    propertyPrice: propertyData?.price || null,
    senderName: resolveCurrentUserName(user),
    senderEmail: user?.email || '',
    senderPhone: resolveCurrentUserPhone(user),
    senderAgency: user?.user_metadata?.agency || '',
    recipientName: agentData?.name || agentData?.agent_name || '',
    recipientEmail: agentData?.email || agentData?.agent_email || '',
    recipientPhone: agentData?.phone || agentData?.agent_phone || '',
    recipientAgency: agentData?.agency || agentData?.agent_company || '',
});

const createPlaceholderConversation = (conversationId: string): Conversation => ({
    id: conversationId,
    isSupportConversation: false,
    agentId: '',
    agentName: 'Conversation',
    contactName: 'Conversation',
    agentAgency: '',
    agentAvatar: null,
    agentEmail: '',
    agentPhone: '',
    isOnline: false,
    propertyId: null,
    propertyTitle: null,
    propertyAddress: null,
    propertyImage: null,
    propertyPrice: null,
    isArchived: false,
    isMuted: false,
    lastActivity: new Date().toISOString(),
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    messages: [],
    messagesPage: 0,
    hasOlderMessages: false,
    isLoadingOlderMessages: false,
});

export const MessagesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationIdState, setSelectedConversationIdState] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
    const [conversationThreadIssue, setConversationThreadIssue] = useState<ConversationThreadIssue | null>(null);
    const locallyReadConversationMarkersRef = useRef<Record<string, string>>({});

    const getConversationReadMarker = useCallback((conversation: {
        id?: string;
        updated_at?: string;
        last_message?: messagesService.Message | null;
    }) => (
        conversation.updated_at ||
        conversation.last_message?.created_at ||
        conversation.last_message?.id ||
        ''
    ), []);

    const markConversationReadLocally = useCallback((conversationId: string) => {
        setConversations((previous) =>
            previous.map((conversation) => {
                if (conversation.id !== conversationId) {
                    return conversation;
                }

                const lastMessage = conversation.messages[conversation.messages.length - 1];
                locallyReadConversationMarkersRef.current[conversationId] = lastMessage?.id || conversation.lastActivity || '';
                return {
                    ...conversation,
                    unreadCount: 0,
                    messages: conversation.messages.map((message) => ({ ...message, read: true })),
                };
            }),
        );
    }, []);

    const mapBackendMessage = useCallback((message: messagesService.Message): Message => {
        const isMine = message.sender_id === user?.id;
        return {
            id: message.id,
            senderId: isMine ? 'me' : message.sender_id,
            senderType: isMine ? 'user' : 'agent',
            text: message.content,
            timestamp: message.created_at,
            time: formatMessageTime(message.created_at),
            read: message.is_read,
            delivered: true,
            attachments: message.attachments || [],
        };
    }, [user?.id]);

    const mapBackendConversation = useCallback((
        backendConversation: messagesService.Conversation,
        existingConversation?: Conversation,
    ): Conversation => {
        const metadata = parseMetadata(backendConversation.metadata);
        const isSupportConversation = backendConversation.type === 'support';
        const lastMessage = backendConversation.last_message
            ? mapBackendMessage(backendConversation.last_message)
            : existingConversation?.messages[existingConversation.messages.length - 1];
        const contactName = isSupportConversation
            ? 'Estospaces Support'
            :
            backendConversation.counterpart_name ||
            metadata?.recipient_name ||
            metadata?.recipientName ||
            metadata?.agentName ||
            'Estate Agent';

        return {
            id: backendConversation.id,
            isSupportConversation,
            agentId: isSupportConversation ? 'support' : (backendConversation.counterpart_id || metadata?.agentId || ''),
            agentName: contactName,
            contactName,
            agentAgency: isSupportConversation
                ? 'Estospaces Team'
                : (backendConversation.counterpart_agency || metadata?.recipient_agency || metadata?.recipientAgency || metadata?.agentAgency || ''),
            agentAvatar: null,
            agentEmail: isSupportConversation
                ? ''
                : (backendConversation.counterpart_email || metadata?.recipient_email || metadata?.recipientEmail || metadata?.agentEmail || ''),
            agentPhone: isSupportConversation
                ? ''
                : (backendConversation.counterpart_phone || metadata?.recipient_phone || metadata?.recipientPhone || metadata?.agentPhone || ''),
            isOnline: false,
            propertyId: backendConversation.property_id || metadata?.property_id || metadata?.propertyId || null,
            propertyTitle: backendConversation.property_title || metadata?.property_title || metadata?.propertyTitle || null,
            propertyAddress: backendConversation.property_address || metadata?.property_address || metadata?.propertyAddress || null,
            propertyImage: backendConversation.property_image || metadata?.property_image || metadata?.propertyImage || null,
            propertyPrice: backendConversation.property_price ?? metadata?.property_price ?? metadata?.propertyPrice ?? null,
            isArchived: backendConversation.is_archived ?? existingConversation?.isArchived ?? false,
            isMuted: backendConversation.is_muted ?? existingConversation?.isMuted ?? false,
            lastActivity: backendConversation.updated_at,
            lastMessage: lastMessage?.text || '',
            lastMessageTime: formatMessageTime(lastMessage?.timestamp || backendConversation.updated_at),
            unreadCount: (() => {
                const backendUnreadCount = Number(backendConversation.unread_count ?? existingConversation?.unreadCount ?? 0);
                const readMarker = getConversationReadMarker(backendConversation);
                const locallyReadMarker = locallyReadConversationMarkersRef.current[backendConversation.id];
                const selectedInThisClient = backendConversation.id === selectedConversationIdState;
                if (selectedInThisClient && readMarker) {
                    locallyReadConversationMarkersRef.current[backendConversation.id] = readMarker;
                }
                if (selectedInThisClient || (locallyReadMarker && locallyReadMarker === readMarker)) {
                    return 0;
                }
                return Number.isFinite(backendUnreadCount) ? backendUnreadCount : 0;
            })(),
            messages: existingConversation?.messages || [],
            messagesPage: existingConversation?.messagesPage || 0,
            hasOlderMessages: existingConversation?.hasOlderMessages || false,
            isLoadingOlderMessages: existingConversation?.isLoadingOlderMessages || false,
        };
    }, [getConversationReadMarker, mapBackendMessage, selectedConversationIdState]);

    const ensureConversationShell = useCallback((conversationId: string) => {
        setConversations((previous) => {
            if (previous.some((conversation) => conversation.id === conversationId)) {
                return previous;
            }

            return [createPlaceholderConversation(conversationId), ...previous];
        });
    }, []);

    const setSelectedConversationId = useCallback((id: string | null) => {
        setConversationThreadIssue(null);
        if (id) {
            ensureConversationShell(id);
        }
        setSelectedConversationIdState(id);
    }, [ensureConversationShell]);

    const clearConversationThreadIssue = useCallback(() => {
        setConversationThreadIssue(null);
    }, []);

    const clearConversationMessages = useCallback((conversationId: string) => {
        setConversations((previous) =>
            previous.map((conversation) =>
                conversation.id === conversationId
                    ? {
                        ...conversation,
                        messages: [],
                    }
                    : conversation,
            ),
        );
    }, []);

    const handleUnavailableConversationThread = useCallback((conversationId: string, error: unknown) => {
        if (!isUnavailableConversationThreadError(error)) {
            return false;
        }

        clearConversationMessages(conversationId);
        setConversationThreadIssue(createUnavailableConversationThreadIssue(conversationId));
        setSelectedConversationIdState((current) => (current === conversationId ? null : current));
        return true;
    }, [clearConversationMessages]);

    const loadConversations = useCallback(async (silent: boolean) => {
        if (!user) {
            setConversations([]);
            setSelectedConversationIdState(null);
            setConversationThreadIssue(null);
            setHasLoadedConversations(false);
            return;
        }

        if (!silent) {
            setIsLoading(true);
        }

        try {
            const backendConversations = await messagesService.getConversations();
            setConversations((previous) =>
                {
                    const mappedConversations = backendConversations.map((conversation) =>
                        mapBackendConversation(
                            conversation,
                            previous.find((existingConversation) => existingConversation.id === conversation.id),
                        ),
                    );
                    const preservedConversations = previous.filter((existingConversation) => {
                        const existsInBackend = backendConversations.some((conversation) => conversation.id === existingConversation.id);
                        if (existsInBackend) {
                            return false;
                        }

                        return existingConversation.id === selectedConversationIdState || existingConversation.messages.length > 0;
                    });

                    return [...mappedConversations, ...preservedConversations];
                },
            );
        } catch {
            // Keep the current state if a polling request fails.
        } finally {
            if (!silent) {
                setIsLoading(false);
                setHasLoadedConversations(true);
            }
        }
    }, [mapBackendConversation, selectedConversationIdState, user]);

    const refreshConversations = useCallback(async () => {
        await loadConversations(false);
    }, [loadConversations]);

    const loadConversationMessages = useCallback(async (conversationId: string) => {
        try {
            const backendMessages = await messagesService.getMessages(conversationId, 1, MESSAGE_PAGE_SIZE);
            const mappedMessages = backendMessages.map(mapBackendMessage);

            setConversations((previous) =>
                {
                    let didUpdateConversation = false;
                    const updatedConversations = previous.map((conversation) => {
                        if (conversation.id !== conversationId) {
                            return conversation;
                        }

                        didUpdateConversation = true;
                        return {
                            ...conversation,
                            messages: mappedMessages,
                            messagesPage: 1,
                            hasOlderMessages: backendMessages.length === MESSAGE_PAGE_SIZE,
                            isLoadingOlderMessages: false,
                            lastMessage: mappedMessages[mappedMessages.length - 1]?.text || conversation.lastMessage,
                            lastMessageTime: mappedMessages.length > 0
                                ? mappedMessages[mappedMessages.length - 1].time
                                : conversation.lastMessageTime,
                        };
                    });

                    if (didUpdateConversation) {
                        return updatedConversations;
                    }

                    return [
                        {
                            ...createPlaceholderConversation(conversationId),
                            messages: mappedMessages,
                            messagesPage: 1,
                            hasOlderMessages: backendMessages.length === MESSAGE_PAGE_SIZE,
                            lastMessage: mappedMessages[mappedMessages.length - 1]?.text || '',
                            lastMessageTime: mappedMessages.length > 0
                                ? mappedMessages[mappedMessages.length - 1].time
                                : '',
                        },
                        ...updatedConversations,
                    ];
                },
            );
            return true;
        } catch (error) {
            if (handleUnavailableConversationThread(conversationId, error)) {
                return false;
            }

            // Keep the existing local state if a non-fatal polling request fails.
            return false;
        }
    }, [handleUnavailableConversationThread, mapBackendMessage]);

    const loadOlderMessages = useCallback(async (conversationId: string) => {
        const conversation = conversations.find((item) => item.id === conversationId);
        if (!conversation || conversation.isLoadingOlderMessages || !conversation.hasOlderMessages) {
            return;
        }

        const nextPage = Math.max(conversation.messagesPage, 1) + 1;
        setConversations((previous) =>
            previous.map((item) =>
                item.id === conversationId ? { ...item, isLoadingOlderMessages: true } : item,
            ),
        );

        try {
            const backendMessages = await messagesService.getMessages(conversationId, nextPage, MESSAGE_PAGE_SIZE);
            const mappedMessages = backendMessages.map(mapBackendMessage);
            setConversations((previous) =>
                previous.map((item) => {
                    if (item.id !== conversationId) {
                        return item;
                    }

                    const existingIds = new Set(item.messages.map((message) => message.id));
                    const olderMessages = mappedMessages.filter((message) => !existingIds.has(message.id));
                    return {
                        ...item,
                        messages: [...olderMessages, ...item.messages],
                        messagesPage: nextPage,
                        hasOlderMessages: backendMessages.length === MESSAGE_PAGE_SIZE,
                        isLoadingOlderMessages: false,
                    };
                }),
            );
        } catch (error) {
            if (handleUnavailableConversationThread(conversationId, error)) {
                return;
            }
            setConversations((previous) =>
                previous.map((item) =>
                    item.id === conversationId ? { ...item, isLoadingOlderMessages: false } : item,
                ),
            );
        }
    }, [conversations, handleUnavailableConversationThread, mapBackendMessage]);

    useWorkspaceRefresh({
        tags: [WORKSPACE_SYNC_TAGS.MESSAGES, WORKSPACE_SYNC_TAGS.SUPPORT],
        refresh: async () => {
            await loadConversations(true);
            if (selectedConversationIdState) {
                await loadConversationMessages(selectedConversationIdState);
            }
        },
        enabled: Boolean(user),
    });

    useEffect(() => {
        if (user) {
            void loadConversations(false);
            return;
        }

        setConversations([]);
        setSelectedConversationIdState(null);
        setConversationThreadIssue(null);
        setHasLoadedConversations(false);
    }, [loadConversations, user]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            void loadConversations(true);
        }, CONVERSATION_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [loadConversations, user]);

    useEffect(() => {
        if (!selectedConversationIdState) {
            return;
        }

        let isActive = true;

        void (async () => {
            const didLoadMessages = await loadConversationMessages(selectedConversationIdState);
            if (!isActive || !didLoadMessages) {
                return;
            }

            try {
                await messagesService.markAsRead(selectedConversationIdState);
            } catch (error) {
                if (isActive) {
                    handleUnavailableConversationThread(selectedConversationIdState, error);
                }
            }
        })();

        markConversationReadLocally(selectedConversationIdState);

        return () => {
            isActive = false;
        };
    }, [handleUnavailableConversationThread, loadConversationMessages, markConversationReadLocally, selectedConversationIdState]);

    useEffect(() => {
        if (!selectedConversationIdState) {
            return;
        }

        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            void Promise.all([
                loadConversations(true),
                loadConversationMessages(selectedConversationIdState),
            ]);
        }, MESSAGE_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [loadConversations, loadConversationMessages, selectedConversationIdState]);

    useEffect(() => {
        if (!selectedConversationIdState) {
            return;
        }

        const hasConversation = conversations.some((conversation) => conversation.id === selectedConversationIdState);
        if (conversations.length === 0) {
            return;
        }
        if (!hasConversation) {
            setSelectedConversationIdState(null);
        }
    }, [conversations, selectedConversationIdState]);

    useEffect(() => {
        if (!selectedConversationIdState) {
            return;
        }

        const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationIdState);
        if (selectedConversation && selectedConversation.messages.length === 0) {
            void loadConversationMessages(selectedConversationIdState);
        }
    }, [conversations, loadConversationMessages, selectedConversationIdState]);

    const totalUnreadCount = conversations.reduce((sum, conversation) => {
        if (conversation.isArchived) {
            return sum;
        }
        if (conversation.id === selectedConversationIdState) {
            return sum;
        }
        return sum + conversation.unreadCount;
    }, 0);

    const getFilteredConversations = useCallback(() => {
        let filtered = [...conversations];

        if (filter === 'unread') {
            filtered = filtered.filter((conversation) => !conversation.isArchived && conversation.unreadCount > 0);
        } else if (filter === 'archived') {
            filtered = filtered.filter((conversation) => conversation.isArchived);
        } else {
            filtered = filtered.filter((conversation) => !conversation.isArchived);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((conversation) => {
                return (
                    conversation.contactName.toLowerCase().includes(query) ||
                    conversation.agentAgency.toLowerCase().includes(query) ||
                    conversation.propertyTitle?.toLowerCase().includes(query) ||
                    conversation.propertyAddress?.toLowerCase().includes(query) ||
                    conversation.messages.some((message) => message.text.toLowerCase().includes(query))
                );
            });
        }

        return filtered.sort(
            (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
        );
    }, [conversations, filter, searchQuery]);

    const createConversation = useCallback(async (agentData: any, propertyData: any) => {
        if (!agentData?.id) {
            return '';
        }

        setIsLoading(true);
        try {
            const context = buildConversationContext(user, agentData, propertyData);
            const conversation = await messagesService.upsertDirectConversation(agentData.id, context);
            const introduction = `Hi, I'm interested in "${propertyData?.title || 'this property'}".`;

            await messagesService.sendMessage({
                conversationId: conversation.id,
                content: introduction,
                context,
            });

            await refreshConversations();
            await loadConversationMessages(conversation.id);
            setSelectedConversationId(conversation.id);
            publishWorkspaceSync({
                key: `messages:create:${conversation.id}`,
                source: 'mutation',
                tags: [WORKSPACE_SYNC_TAGS.MESSAGES],
                reason: 'conversation-created',
                ids: { conversationId: conversation.id, propertyId: propertyData?.id },
            });
            return conversation.id;
        } catch {
            return '';
        } finally {
            setIsLoading(false);
        }
    }, [loadConversationMessages, publishWorkspaceSync, refreshConversations, setSelectedConversationId, user]);

    const sendMessage = useCallback(async (conversationId: string, text: string, attachments: any[] = []) => {
        if (!text.trim() && attachments.length === 0) {
            return;
        }

        try {
            const sentMessage = await messagesService.sendMessage({
                conversationId,
                content: text.trim(),
                type: attachments.length > 0 && !text.trim() ? 'file' : 'text',
                attachments,
            });

            const mappedMessage = mapBackendMessage(sentMessage);
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation.id === conversationId
                        ? {
                            ...conversation,
                            lastActivity: sentMessage.created_at,
                            lastMessage: mappedMessage.text,
                            lastMessageTime: mappedMessage.time,
                            messages: [...conversation.messages, mappedMessage],
                        }
                        : conversation,
                ),
            );

            await Promise.all([
                loadConversations(true),
                loadConversationMessages(conversationId),
            ]);
            publishWorkspaceSync({
                key: `messages:send:${conversationId}:${sentMessage.id}`,
                source: 'mutation',
                tags: [WORKSPACE_SYNC_TAGS.MESSAGES],
                reason: 'message-sent',
                ids: { conversationId, messageId: sentMessage.id },
            });
        } catch {
            // Surface the error at the caller level.
            throw new Error('Failed to send message');
        }
    }, [loadConversationMessages, loadConversations, mapBackendMessage, publishWorkspaceSync]);

    const markAsRead = useCallback(async (conversationId: string) => {
        try {
            await messagesService.markAsRead(conversationId);
            markConversationReadLocally(conversationId);
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, [markConversationReadLocally]);

    const archiveConversation = useCallback(async (conversationId: string) => {
        try {
            await messagesService.updateConversationPreferences(conversationId, { is_archived: true });
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation.id === conversationId ? { ...conversation, isArchived: true } : conversation,
                ),
            );
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, []);

    const unarchiveConversation = useCallback(async (conversationId: string) => {
        try {
            await messagesService.updateConversationPreferences(conversationId, { is_archived: false });
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation.id === conversationId ? { ...conversation, isArchived: false } : conversation,
                ),
            );
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, []);

    const muteConversation = useCallback(async (conversationId: string) => {
        try {
            await messagesService.updateConversationPreferences(conversationId, { is_muted: true });
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation.id === conversationId ? { ...conversation, isMuted: true } : conversation,
                ),
            );
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, []);

    const unmuteConversation = useCallback(async (conversationId: string) => {
        try {
            await messagesService.updateConversationPreferences(conversationId, { is_muted: false });
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation.id === conversationId ? { ...conversation, isMuted: false } : conversation,
                ),
            );
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, []);

    const deleteConversation = useCallback((conversationId: string) => {
        setConversations((previous) => previous.filter((conversation) => conversation.id !== conversationId));
        if (selectedConversationIdState === conversationId) {
            setSelectedConversationIdState(null);
        }
    }, [selectedConversationIdState]);

    const getConversation = useCallback((conversationId: string) => {
        return conversations.find((conversation) => conversation.id === conversationId);
    }, [conversations]);

    const value = {
        conversations: getFilteredConversations(),
        allConversations: conversations,
        selectedConversationId: selectedConversationIdState,
        setSelectedConversationId,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        isLoading,
        hasLoadedConversations,
        totalUnreadCount,
        conversationThreadIssue,
        clearConversationThreadIssue,
        createConversation,
        sendMessage,
        markAsRead,
        loadOlderMessages,
        archiveConversation,
        unarchiveConversation,
        muteConversation,
        unmuteConversation,
        deleteConversation,
        getConversation,
        quickReplyTemplates,
        refreshConversations,
    };

    return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};
