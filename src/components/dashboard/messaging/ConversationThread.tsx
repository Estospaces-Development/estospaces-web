"use client";

import React, { useEffect, useRef } from 'react';
import { useMessages } from '@/contexts/MessagesContext';
import { User, CheckCheck } from 'lucide-react';

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
                messages.map((message: any) => (
                    <div
                        key={message.id}
                        className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-3 max-w-[80%] ${message.senderId === 'me' ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0 mt-auto">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.senderId === 'me' ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}>
                                    <User size={16} className={message.senderId === 'me' ? 'text-white' : 'text-gray-500'} />
                                </div>
                            </div>

                            <div className={`flex flex-col ${message.senderId === 'me' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${message.senderId === 'me'
                                    ? 'bg-orange-500 text-white rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border dark:border-gray-700'
                                    }`}>
                                    {message.text}
                                </div>
                                <div className="flex items-center gap-1 mt-1 px-1">
                                    <span className="text-[10px] text-gray-400">{message.time}</span>
                                    {message.senderId === 'me' && (
                                        <CheckCheck size={12} className={message.read ? 'text-blue-500' : 'text-gray-400'} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Start the conversation by sending a message below.</p>
                </div>
            )}
        </div>
    );
}
