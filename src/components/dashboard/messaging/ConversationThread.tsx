"use client";

import React, { useEffect, useRef } from 'react';
import { useMessages } from '@/contexts/MessagesContext';
import MessageBubble from './MessageBubble';

interface ConversationThreadProps {
    conversationId: string;
}

export default function ConversationThread({ conversationId }: ConversationThreadProps) {
    const { getConversation, isLoading } = useMessages();
    const conversation = getConversation(conversationId);
    const messages = conversation?.messages || [];
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50">
            {messages.length > 0 ? (
                messages.map((message: any, index) => {
                    const isUser = message.senderId === 'me';
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const showAvatar = !isUser && (!previousMessage || previousMessage.senderId !== message.senderId);

                    return (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isUser={isUser}
                            isSupportConversation={conversation?.isSupportConversation}
                            showAvatar={showAvatar}
                            agentUserId={conversation?.isSupportConversation ? undefined : conversation?.agentId}
                            agentName={conversation?.agentName || conversation?.contactName || 'Agent'}
                            agentAvatar={conversation?.agentAvatar || undefined}
                        />
                    );
                })
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Start the conversation by sending a message below.</p>
                </div>
            )}
        </div>
    );
}
