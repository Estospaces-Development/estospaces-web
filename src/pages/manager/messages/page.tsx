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
        <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-500">
            {/* Sidebar: Conversation List */}
            <div className="w-full md:w-96 border-r dark:border-gray-700 flex flex-col h-full bg-white dark:bg-gray-800">
                <div className="p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Messages</h2>
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
                        <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                            <MessageInput conversationId={selectedId} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="mb-6 relative">
                            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center relative z-10 border border-gray-100 dark:border-gray-700">
                                <div className="text-orange-500">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div className="absolute top-2 -right-8 w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-lg -rotate-12 z-0"></div>
                            <div className="absolute -bottom-2 -left-8 w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded-full z-0 opacity-50"></div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            You haven't selected an enquiry
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            Select a conversation from the list to view your chat history with clients.
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
