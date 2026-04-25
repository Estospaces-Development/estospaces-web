"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, MessageSquare, PlusCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '@/contexts/MessagesContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import ConversationListSkeleton from '@/components/dashboard/messaging/ConversationListSkeleton';
import ConversationThreadSkeleton from '@/components/dashboard/messaging/ConversationThreadSkeleton';
import {
    createUnavailableConversationThreadIssue,
    resolveConversationQuerySelection,
    type ConversationThreadIssue,
} from '@/lib/messagesInbox';

function MessagesContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const attemptedConversationRefreshesRef = useRef<Set<string>>(new Set());
    const conversationRefreshesInFlightRef = useRef<Set<string>>(new Set());
    const {
        conversations,
        allConversations,
        isLoading,
        hasLoadedConversations,
        selectedConversationId,
        setSelectedConversationId,
        conversationThreadIssue,
        clearConversationThreadIssue,
        refreshConversations,
        sendMessage,
    } = useMessages();

    const [error, setError] = useState<string | null>(null);
    const [routeConversationIssue, setRouteConversationIssue] = useState<ConversationThreadIssue | null>(null);
    const requestedConversationId = searchParams.get('conversation');
    const newConversationWith = searchParams.get('newConversationWith');
    const normalizedRequestedConversationId = requestedConversationId?.trim() || null;

    useEffect(() => {
        if (!newConversationWith) {
            return;
        }

        navigate('/user/dashboard/discover', { replace: true });
    }, [navigate, newConversationWith]);

    useEffect(() => {
        if (!normalizedRequestedConversationId) {
            attemptedConversationRefreshesRef.current.clear();
            conversationRefreshesInFlightRef.current.clear();
            return;
        }

        if (conversationRefreshesInFlightRef.current.has(normalizedRequestedConversationId)) {
            return;
        }

        const queryResolution = resolveConversationQuerySelection({
            requestedConversationId: normalizedRequestedConversationId,
            hasLoadedConversations,
            availableConversationIds: allConversations.map((conversation) => conversation.id),
            hasAttemptedRefresh: attemptedConversationRefreshesRef.current.has(normalizedRequestedConversationId),
        });

        if (queryResolution.status === 'wait' || queryResolution.status === 'ignore') {
            return;
        }

        if (queryResolution.status === 'refresh' && queryResolution.conversationId) {
            attemptedConversationRefreshesRef.current.add(queryResolution.conversationId);
            conversationRefreshesInFlightRef.current.add(queryResolution.conversationId);
            void refreshConversations()
                .finally(() => {
                    conversationRefreshesInFlightRef.current.delete(queryResolution.conversationId!);
                });
            return;
        }

        if (queryResolution.status === 'select') {
            if (queryResolution.conversationId) {
                attemptedConversationRefreshesRef.current.delete(queryResolution.conversationId);
                conversationRefreshesInFlightRef.current.delete(queryResolution.conversationId);
            }
            setRouteConversationIssue(null);
            if (selectedConversationId !== queryResolution.conversationId) {
                setSelectedConversationId(queryResolution.conversationId);
            }
            return;
        }

    }, [
        allConversations,
        clearConversationThreadIssue,
        hasLoadedConversations,
        navigate,
        normalizedRequestedConversationId,
        refreshConversations,
        selectedConversationId,
        setSelectedConversationId,
    ]);

    useEffect(() => {
        if (!selectedConversationId) {
            return;
        }

        setRouteConversationIssue(null);
    }, [selectedConversationId]);

    useEffect(() => {
        if (!conversationThreadIssue || !requestedConversationId) {
            return;
        }

        navigate('/user/dashboard/messages', { replace: true });
    }, [conversationThreadIssue, navigate, requestedConversationId]);

    const handleSend = async (conversationId: string, text: string, attachments: any[]) => {
        try {
            await sendMessage(conversationId, text, attachments);
            setError(null);
        } catch (err) {
            setError('Failed to send message. Please try again.');
        }
    };

    const handleOpenNewEnquiry = () => {
        clearConversationThreadIssue();
        setRouteConversationIssue(null);
        navigate('/user/dashboard/discover');
    };

    const handleRetryUnavailableThread = async () => {
        const conversationId = (conversationThreadIssue ?? routeConversationIssue)?.conversationId;
        clearConversationThreadIssue();
        setRouteConversationIssue(null);
        await refreshConversations();
        if (conversationId) {
            setSelectedConversationId(conversationId);
        }
    };

    const activeThreadIssue = !selectedConversationId
        ? conversationThreadIssue ?? routeConversationIssue
        : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
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
                                Chats about homes, agent requests, and support.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenNewEnquiry}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                        >
                            <PlusCircle size={20} />
                            Ask about a home
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-xl font-bold"
                        >
                            x
                        </button>
                    </div>
                )}

                <div className="grid min-h-[640px] grid-cols-1 gap-6 lg:grid-cols-12 lg:h-[700px]">
                    <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                        {isLoading ? (
                            <ConversationListSkeleton />
                        ) : (
                            <ConversationList
                                onSelectConversation={setSelectedConversationId}
                                selectedConversationId={selectedConversationId}
                            />
                        )}
                    </div>

                    <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col">
                        {selectedConversationId ? (
                            <>
                                <ConversationThread conversationId={selectedConversationId} />
                                <MessageInput
                                    conversationId={selectedConversationId}
                                    onSend={handleSend}
                                />
                            </>
                        ) : isLoading && !hasLoadedConversations ? (
                            <ConversationThreadSkeleton />
                        ) : activeThreadIssue ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-gray-900/30">
                                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 w-20 h-20 rounded-full flex items-center justify-center">
                                    <AlertCircle size={34} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {activeThreadIssue.title}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    {activeThreadIssue.message}
                                </p>
                                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={() => void handleRetryUnavailableThread()}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:border-orange-400 hover:text-orange-500 transition-colors"
                                    >
                                        <RefreshCw size={18} />
                                        Retry
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleOpenNewEnquiry}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-700 text-white rounded-xl font-bold hover:bg-orange-800 transition-all"
                                    >
                                        <PlusCircle size={18} />
                                        Ask about a home
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-gray-900/30">
                                <div className="mb-6 bg-white dark:bg-gray-800 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center relative">
                                    <MessageSquare size={40} className="text-orange-500" />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-100 rounded-full animate-ping"></div>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Choose a conversation
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    Pick a chat on the left to read messages, updates, and replies.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleOpenNewEnquiry}
                                    className="mt-8 px-8 py-3 bg-orange-700 text-white rounded-xl font-bold hover:bg-orange-800 transition-all shadow-lg shadow-orange-500/30"
                                >
                                    Ask about a home
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
