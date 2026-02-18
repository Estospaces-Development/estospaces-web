"use client";

import React from 'react';
import { Search, User } from 'lucide-react';
import { useMessages } from '@/contexts/MessagesContext';

interface ConversationListProps {
    onSelectConversation: (id: string | null) => void;
    selectedConversationId: string | null;
}

export default function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
    const { conversations, searchQuery, setSearchQuery } = useMessages();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <div className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length > 0 ? (
                    <div className="">
                        {conversations.map((conv: any) => (
                            <button
                                key={conv.id}
                                onClick={() => onSelectConversation(conv.id)}
                                className={`w-full p-4 flex items-center gap-3 transition-colors text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedConversationId === conv.id ? 'bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-500' : ''
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                        <User size={24} className="text-orange-600" />
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                            {conv.unreadCount}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{conv.contactName}</h4>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{conv.lastMessageTime}</span>
                                    </div>
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {conv.lastMessage}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No conversations found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
