"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { MessageSquare, AlertCircle, ArrowLeft, Search, PlusCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMessages } from '@/contexts/MessagesContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import ConversationListSkeleton from '@/components/dashboard/messaging/ConversationListSkeleton';
import ConversationThreadSkeleton from '@/components/dashboard/messaging/ConversationThreadSkeleton';

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        conversations,
        isLoading,
        selectedConversationId,
        setSelectedConversationId,
        sendMessage,
    } = useMessages();

    const [error, setError] = useState<string | null>(null);

    // Handle new conversation from query params
    useEffect(() => {
        const newContactName = searchParams.get('newConversationWith');
        if (newContactName) {
            const existing = conversations.find((c: any) =>
                c.agentName === newContactName ||
                c.participants?.some((p: any) => p.name === newContactName)
            );

            if (existing) {
                setSelectedConversationId(existing.id);
            } else {
                console.log(`Starting new conversation with ${newContactName}`);
            }
        }
    }, [searchParams, conversations, setSelectedConversationId]);

    const handleSend = async (conversationId: string, text: string, attachments: any[]) => {
        try {
            await sendMessage(conversationId, text, attachments);
            setError(null);
        } catch (err) {
            setError('Failed to send message. Please try again.');
            console.error('Error sending message:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Area */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="mb-4 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <MessageSquare className="text-orange-500" />
                                Messages
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Chat with agents and property managers directly
                            </p>
                        </div>

                        <button
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                        >
                            <PlusCircle size={20} />
                            New Enquiry
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Messaging Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
                    {/* Conversation List */}
                    <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border dark:border-gray-700">
                        {isLoading ? (
                            <ConversationListSkeleton />
                        ) : (
                            <ConversationList
                                onSelectConversation={setSelectedConversationId}
                                selectedConversationId={selectedConversationId}
                            />
                        )}
                    </div>

                    {/* Conversation Thread */}
                    <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border dark:border-gray-700 flex flex-col">
                        {selectedConversationId ? (
                            <>
                                <ConversationThread conversationId={selectedConversationId} />
                                <MessageInput
                                    conversationId={selectedConversationId}
                                    onSend={handleSend}
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-gray-900/30">
                                <div className="mb-6 bg-white dark:bg-gray-800 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center relative">
                                    <MessageSquare size={40} className="text-orange-500" />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-100 rounded-full animate-ping"></div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Select an enquiry
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    Pick a conversation from the sidebar to view your messages and updates from property agents.
                                </p>
                                <button
                                    onClick={() => router.push('/user/dashboard/discover')}
                                    className="mt-8 px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30"
                                >
                                    Find Property to Enquiry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>}>
            <MessagesContent />
        </Suspense>
    );
}
