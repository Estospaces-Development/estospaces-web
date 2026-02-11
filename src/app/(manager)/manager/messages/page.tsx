"use client";

import React, { useState, Suspense } from 'react';
import { MessagesProvider } from '@/contexts/MessagesContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import { Search, Loader2 } from 'lucide-react';

function MessagesContent() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <div className="h-[calc(100vh-12rem)] flex bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden animate-in fade-in duration-500">
            {/* Sidebar: Conversation List */}
            <div className="w-full md:w-96 border-r dark:border-gray-700 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/10">
                <div className="p-8 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-6">Messages</h2>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 outline-none font-bold text-sm shadow-sm focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ConversationList
                        onSelectConversation={setSelectedId}
                        selectedConversationId={selectedId}
                    />
                </div>
            </div>

            {/* Main: Message Thread */}
            <div className="hidden md:flex flex-1 flex-col h-full bg-white dark:bg-gray-800">
                {selectedId ? (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <ConversationThread conversationId={selectedId} />
                        </div>
                        <div className="p-6 border-t dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10">
                            <MessageInput conversationId={selectedId} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-500 mb-6">
                            <Loader2 size={40} className="animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Select a Conversation</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs">
                            Choose a chat from the left to start messaging with clients or agents.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ManagerMessagesPage() {
    return (
        <MessagesProvider>
            <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Messages...</div>}>
                <MessagesContent />
            </Suspense>
        </MessagesProvider>
    );
}
