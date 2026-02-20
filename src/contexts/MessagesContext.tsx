"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as messagesService from '@/services/messagesService';
import { useAuth } from './AuthContext';

interface Message {
    id: string;
    senderId: string;
    senderType: string;
    text: string;
    timestamp: string;
    read: boolean;
    delivered: boolean;
    attachments: any[];
}

interface Conversation {
    id: string;
    agentId: string;
    agentName: string;
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
    unreadCount: number;
    messages: Message[];
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
    totalUnreadCount: number;
    createConversation: (agentData: any, propertyData: any) => Promise<string>;
    sendMessage: (conversationId: string, text: string, attachments?: any[]) => Promise<void>;
    markAsRead: (conversationId: string) => Promise<void>;
    archiveConversation: (conversationId: string) => void;
    unarchiveConversation: (conversationId: string) => void;
    muteConversation: (conversationId: string) => void;
    unmuteConversation: (conversationId: string) => void;
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

export const MessagesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const mapBackendConversation = useCallback((conv: messagesService.Conversation): Conversation => {
        let metadata = {
            agentId: '',
            agentName: 'Estate Agent',
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
        };

        try {
            if (conv.metadata) {
                const parsed = JSON.parse(conv.metadata);
                metadata = { ...metadata, ...parsed };
            }
        } catch (e) {
            console.error('Failed to parse conversation metadata', e);
        }

        const messages: Message[] = (conv.messages || []).map(msg => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderType: msg.sender_id === user?.id ? 'user' : 'agent',
            text: msg.content,
            timestamp: msg.created_at,
            read: msg.is_read,
            delivered: true,
            attachments: [] // Attachments logic can be added later
        }));

        const unreadCount = messages.filter(m => !m.read && m.senderId !== user?.id).length;

        return {
            id: conv.id,
            ...metadata,
            lastActivity: conv.updated_at,
            unreadCount: unreadCount,
            messages
        } as Conversation;
    }, [user?.id]);

    const refreshConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            const backendConvs = await messagesService.getConversations();
            setConversations(backendConvs.map(mapBackendConversation));
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
            setIsLoading(false);
        }
    }, [mapBackendConversation]);

    useEffect(() => {
        if (user) {
            refreshConversations();
        }
    }, [user, refreshConversations]);

    // Save locale changes? Not needed if syncing with DB.
    // However, mute/archive might be local-only or need backend support.
    // For now, let's keep them as mock/local updates.

    const totalUnreadCount = conversations.reduce((sum, conv) => {
        return sum + (conv.isArchived ? 0 : conv.unreadCount);
    }, 0);

    const getFilteredConversations = useCallback(() => {
        let filtered = [...conversations];

        switch (filter) {
            case 'unread':
                filtered = filtered.filter((conv) => !conv.isArchived && conv.unreadCount > 0);
                break;
            case 'archived':
                filtered = filtered.filter((conv) => conv.isArchived);
                break;
            case 'all':
            default:
                filtered = filtered.filter((conv) => !conv.isArchived);
                break;
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((conv) => {
                const matchesAgent = conv.agentName.toLowerCase().includes(query);
                const matchesAgency = conv.agentAgency.toLowerCase().includes(query);
                const matchesProperty =
                    conv.propertyTitle?.toLowerCase().includes(query) ||
                    conv.propertyAddress?.toLowerCase().includes(query);
                const matchesMessage = conv.messages.some((msg) =>
                    msg.text.toLowerCase().includes(query)
                );
                return matchesAgent || matchesAgency || matchesProperty || matchesMessage;
            });
        }

        return filtered.sort((a, b) => {
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });
    }, [conversations, filter, searchQuery]);

    const createConversation = useCallback(async (agentData: any, propertyData: any) => {
        setIsLoading(true);
        try {
            const metadata = {
                agentId: agentData.id,
                agentName: agentData.name,
                agentAgency: agentData.agency || '',
                agentAvatar: agentData.avatar || null,
                agentEmail: agentData.email || '',
                agentPhone: agentData.phone || '',
                isOnline: agentData.isOnline || false,
                propertyId: propertyData?.id || null,
                propertyTitle: propertyData?.title || null,
                propertyAddress: propertyData?.address || null,
                propertyImage: propertyData?.image || null,
                propertyPrice: propertyData?.price || null,
                isArchived: false,
                isMuted: false,
            };

            // This is a simplified call - in reality, we might need to check if one exists
            const msg = await messagesService.sendMessage({
                recipientId: agentData.id,
                content: `Hi, I'm interested in learning more about "${propertyData?.title || 'this property'}".`
            });

            await refreshConversations();
            setSelectedConversationId(msg.conversation_id);
            return msg.conversation_id;
        } catch (error) {
            console.error('Failed to create conversation', error);
            return '';
        } finally {
            setIsLoading(false);
        }
    }, [refreshConversations]);

    const sendMessage = useCallback(async (conversationId: string, text: string, attachments: any[] = []) => {
        if (!text.trim() && attachments.length === 0) return;

        try {
            await messagesService.sendMessage({
                conversationId,
                content: text.trim(),
                type: 'text'
            });
            await refreshConversations();
        } catch (error) {
            console.error('Failed to send message', error);
        }
    }, [refreshConversations]);

    const markAsRead = useCallback(async (conversationId: string) => {
        try {
            await messagesService.markAsRead(conversationId);
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId ? { ...conv, unreadCount: 0, messages: conv.messages.map(m => ({ ...m, read: true })) } : conv
            ));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    }, []);

    const archiveConversation = useCallback((conversationId: string) => {
        setConversations((prev) =>
            prev.map((conv) => conv.id === conversationId ? { ...conv, isArchived: true } : conv)
        );
    }, []);

    const unarchiveConversation = useCallback((conversationId: string) => {
        setConversations((prev) =>
            prev.map((conv) => conv.id === conversationId ? { ...conv, isArchived: false } : conv)
        );
    }, []);

    const muteConversation = useCallback((conversationId: string) => {
        setConversations((prev) =>
            prev.map((conv) => conv.id === conversationId ? { ...conv, isMuted: true } : conv)
        );
    }, []);

    const unmuteConversation = useCallback((conversationId: string) => {
        setConversations((prev) =>
            prev.map((conv) => conv.id === conversationId ? { ...conv, isMuted: false } : conv)
        );
    }, []);

    const deleteConversation = useCallback((conversationId: string) => {
        // Soft delete locally, could be backend if supported
        setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
        if (selectedConversationId === conversationId) {
            setSelectedConversationId(null);
        }
    }, [selectedConversationId]);

    const getConversation = useCallback((conversationId: string) => {
        return conversations.find((conv) => conv.id === conversationId);
    }, [conversations]);

    const value = {
        conversations: getFilteredConversations(),
        allConversations: conversations,
        selectedConversationId,
        setSelectedConversationId,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        isLoading,
        totalUnreadCount,
        createConversation,
        sendMessage,
        markAsRead,
        archiveConversation,
        unarchiveConversation,
        muteConversation,
        unmuteConversation,
        deleteConversation,
        getConversation,
        quickReplyTemplates,
        refreshConversations
    };

    return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};
