"use client";

import { Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '@/contexts/MessagesContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import { ArrowLeft } from 'lucide-react';
import { resolveConversationQuerySelection } from '@/lib/messagesInbox';

function MessagesContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        conversations,
        allConversations,
        hasLoadedConversations,
        selectedConversationId,
        setSelectedConversationId,
    } = useMessages();
    const requestedConversationId = searchParams.get('conversation');
    const [isDesktop, setIsDesktop] = useState(() => (
        typeof window === 'undefined' ? true : window.matchMedia('(min-width: 768px)').matches
    ));

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia('(min-width: 768px)');
        const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
        setIsDesktop(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    useEffect(() => {
        const queryResolution = resolveConversationQuerySelection({
            requestedConversationId,
            hasLoadedConversations,
            availableConversationIds: allConversations.map((conversation) => conversation.id),
        });

        if (queryResolution.status === 'wait') {
            return;
        }

        if (queryResolution.status === 'select') {
            if (selectedConversationId !== queryResolution.conversationId) {
                setSelectedConversationId(queryResolution.conversationId);
            }
            return;
        }

        if (queryResolution.status === 'clear') {
            setSelectedConversationId(null);
            navigate('/manager/messages', { replace: true });
        }
    }, [
        allConversations,
        hasLoadedConversations,
        navigate,
        requestedConversationId,
        selectedConversationId,
        setSelectedConversationId,
    ]);

    useEffect(() => {
        if (requestedConversationId) {
            return;
        }

        if (hasLoadedConversations && isDesktop && !selectedConversationId && conversations.length > 0) {
            setSelectedConversationId(conversations[0].id);
        }
    }, [conversations, hasLoadedConversations, isDesktop, requestedConversationId, selectedConversationId, setSelectedConversationId]);

    const showConversationList = isDesktop || !selectedConversationId;
    const showThread = isDesktop || Boolean(selectedConversationId);

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in duration-500">
            <div className={`${showConversationList ? 'flex' : 'hidden'} w-full md:w-96 border-r dark:border-gray-700 flex-col h-full bg-white dark:bg-gray-800`}>
                <div className="p-4 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Messages</h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ConversationList
                        onSelectConversation={setSelectedConversationId}
                        selectedConversationId={selectedConversationId}
                    />
                </div>
            </div>

            <div className={`${showThread ? 'flex' : 'hidden'} flex-1 flex-col h-full bg-white dark:bg-gray-800`}>
                {selectedConversationId ? (
                    <>
                        {!isDesktop && (
                            <div className="border-b dark:border-gray-700 p-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedConversationId(null)}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400"
                                >
                                    <ArrowLeft size={16} />
                                    Back to conversations
                                </button>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            <ConversationThread conversationId={selectedConversationId} />
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                            <MessageInput conversationId={selectedConversationId} />
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
        <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Messages...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
