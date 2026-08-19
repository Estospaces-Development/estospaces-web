"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Home, LifeBuoy } from 'lucide-react';

import BrandLoader from '@/components/ui/BrandLoader';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/contexts/MessagesContext';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import { buildConversationPropertyPath } from '@/lib/messagesInbox';
import MessageBubble from './MessageBubble';

interface ConversationThreadProps {
    conversationId: string;
}

export default function ConversationThread({ conversationId }: ConversationThreadProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getConversation, isLoading, loadOlderMessages, muteConversation, unmuteConversation } = useMessages();
    const conversation = getConversation(conversationId);
    const messages = useMemo(() => conversation?.messages || [], [conversation?.messages]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    const [isSavingPreference, setIsSavingPreference] = useState(false);
    const messageKeyFor = createDuplicateSafeKeyResolver('conversation-message');
    const propertyPath = buildConversationPropertyPath(conversation?.propertyId, user?.role);

    useEffect(() => {
        const lastMessageId = messages[messages.length - 1]?.id || null;
        if (scrollRef.current && lastMessageIdRef.current !== lastMessageId) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        lastMessageIdRef.current = lastMessageId;
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <BrandLoader size="lg" label="Loading conversation" />
            </div>
        );
    }

    const handleToggleMute = async () => {
        if (!conversation || isSavingPreference) {
            return;
        }

        setIsSavingPreference(true);
        try {
            if (conversation.isMuted) {
                await unmuteConversation(conversation.id);
            } else {
                await muteConversation(conversation.id);
            }
        } finally {
            setIsSavingPreference(false);
        }
    };

    const handleCreateSupportTicket = () => {
        const lastMessage = messages[messages.length - 1];
        const messageContent = lastMessage?.text || '';
        const params = new URLSearchParams({
            category: 'Technical Issue',
            message: messageContent,
            source: 'conversation',
        });
        navigate(`/user/dashboard/help?${params.toString()}`);
    };

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50" tabIndex={0} aria-label="Conversation messages">
            {conversation && (
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                            {conversation.contactName || conversation.agentName || 'Conversation'}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {conversation.propertyTitle || conversation.agentAgency || 'General conversation'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {propertyPath ? (
                        <button
                            type="button"
                            onClick={() => navigate(propertyPath)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:text-orange-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-500/50 dark:hover:text-orange-300"
                        >
                            <Home size={16} />
                            Back to property
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void handleCreateSupportTicket()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-orange-500/20 dark:text-orange-200 dark:hover:border-orange-500/50 dark:hover:text-orange-300"
                    >
                        <LifeBuoy size={16} />
                        Create support ticket
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleToggleMute()}
                        disabled={isSavingPreference}
                        aria-label={conversation.isMuted ? 'Unmute conversation notifications' : 'Mute conversation notifications'}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-500/50 dark:hover:text-orange-300"
                    >
                        {conversation.isMuted ? <Bell size={16} /> : <BellOff size={16} />}
                        {isSavingPreference ? 'Updating...' : conversation.isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    </div>
                </div>
            )}
            {messages.length > 0 ? (
                <>
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => void loadOlderMessages(conversationId)}
                            disabled={!conversation?.hasOlderMessages || conversation?.isLoadingOlderMessages}
                            aria-label={conversation?.hasOlderMessages ? 'Load older messages' : 'No older messages available'}
                            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-orange-500/50 dark:hover:text-orange-300"
                        >
                            {conversation?.isLoadingOlderMessages
                                ? 'Loading older messages...'
                                : conversation?.hasOlderMessages
                                    ? 'Load older messages'
                                    : 'No older messages'}
                        </button>
                    </div>
                    {messages.map((message: any, index) => {
                        const isUser = message.senderId === 'me';
                        const previousMessage = index > 0 ? messages[index - 1] : null;
                        const showAvatar = !isUser && (!previousMessage || previousMessage.senderId !== message.senderId);

                        return (
                            <MessageBubble
                                key={messageKeyFor(message.id, index)}
                                message={message}
                                isUser={isUser}
                                isSupportConversation={conversation?.isSupportConversation}
                                showAvatar={showAvatar}
                                agentUserId={conversation?.isSupportConversation ? undefined : conversation?.agentId}
                                agentName={conversation?.agentName || conversation?.contactName || 'Agent'}
                                agentAvatar={conversation?.agentAvatar || undefined}
                            />
                        );
                    })}
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Start the conversation by sending a message below.</p>
                </div>
            )}
        </div>
    );
}
