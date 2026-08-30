"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '@/contexts/MessagesContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import {
    buildConversationListUrl,
    createConversationRefreshFailedIssue,
    createUnavailableConversationThreadIssue,
    resolveConversationQuerySelection,
    type ConversationThreadIssue,
} from '@/lib/messagesInbox';

function MessagesContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const attemptedConversationRefreshesRef = useRef<Set<string>>(new Set());
    const conversationRefreshesInFlightRef = useRef<Set<string>>(new Set());
    const requestedConversationIdRef = useRef<string | null>(null);
    const ignoredConversationRouteRef = useRef<string | null>(null);
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const threadIssueRef = useRef<HTMLDivElement | null>(null);
    const [routeConversationIssue, setRouteConversationIssue] = useState<ConversationThreadIssue | null>(null);
    const {
        conversations,
        allConversations,
        hasLoadedConversations,
        selectedConversationId,
        setSelectedConversationId,
        refreshConversations,
    } = useMessages();
    const requestedConversationId = searchParams.get('conversation');
    const normalizedRequestedConversationId = requestedConversationId?.trim() || null;
    requestedConversationIdRef.current = normalizedRequestedConversationId;
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
        if (!normalizedRequestedConversationId) {
            attemptedConversationRefreshesRef.current.clear();
            conversationRefreshesInFlightRef.current.clear();
            ignoredConversationRouteRef.current = null;
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
            ignoredConversationId: ignoredConversationRouteRef.current,
        });

        if (queryResolution.status === 'wait') {
            return;
        }

        if (queryResolution.status === 'refresh' && queryResolution.conversationId) {
            const conversationId = queryResolution.conversationId;
            conversationRefreshesInFlightRef.current.add(conversationId);
            void refreshConversations()
                .then((result) => {
                    if (requestedConversationIdRef.current !== conversationId) {
                        return;
                    }
                    if (result.outcome === 'superseded') {
                        return;
                    }
                    if (!result.success) {
                        setSelectedConversationId(null);
                        setRouteConversationIssue(createConversationRefreshFailedIssue(conversationId));
                        navigate(buildConversationListUrl(location.pathname, location.search), { replace: true });
                        return;
                    }
                    attemptedConversationRefreshesRef.current.add(conversationId);
                    if (result.conversationIds.includes(conversationId)) {
                        setRouteConversationIssue(null);
                        setSelectedConversationId(conversationId);
                        return;
                    }
                    setSelectedConversationId(null);
                    setRouteConversationIssue(createUnavailableConversationThreadIssue(conversationId));
                    navigate(buildConversationListUrl(location.pathname, location.search), { replace: true });
                })
                .finally(() => {
                    conversationRefreshesInFlightRef.current.delete(conversationId);
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

        if (queryResolution.status === 'unavailable' && queryResolution.conversationId) {
            setSelectedConversationId(null);
            setRouteConversationIssue(createUnavailableConversationThreadIssue(queryResolution.conversationId));
            navigate(buildConversationListUrl(location.pathname, location.search), { replace: true });
        }
    }, [
        allConversations,
        hasLoadedConversations,
        location.pathname,
        location.search,
        navigate,
        normalizedRequestedConversationId,
        refreshConversations,
        selectedConversationId,
        setSelectedConversationId,
    ]);

    useEffect(() => {
        if (requestedConversationId) {
            return;
        }

        if (hasLoadedConversations && isDesktop && !selectedConversationId && !routeConversationIssue && conversations.length > 0) {
            setSelectedConversationId(conversations[0].id);
        }
    }, [conversations, hasLoadedConversations, isDesktop, requestedConversationId, routeConversationIssue, selectedConversationId, setSelectedConversationId]);

    useEffect(() => {
        if (!normalizedRequestedConversationId) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            headingRef.current?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [normalizedRequestedConversationId]);

    useEffect(() => {
        if (!routeConversationIssue) {
            return;
        }
        const frame = window.requestAnimationFrame(() => threadIssueRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [routeConversationIssue]);

    const showConversationList = isDesktop || (!selectedConversationId && !routeConversationIssue);
    const showThread = isDesktop || Boolean(selectedConversationId) || Boolean(routeConversationIssue);

    const handleRetryUnavailableThread = async () => {
        const conversationId = routeConversationIssue?.conversationId;
        if (!conversationId) {
            return;
        }
        const result = await refreshConversations();
        if (!result.success) {
            return;
        }
        if (result.conversationIds.includes(conversationId)) {
            setRouteConversationIssue(null);
            setSelectedConversationId(conversationId);
            return;
        }
        setRouteConversationIssue(createUnavailableConversationThreadIssue(conversationId));
        setSelectedConversationId(null);
    };

    const handleBackToConversations = () => {
        ignoredConversationRouteRef.current = selectedConversationId || routeConversationIssue?.conversationId || null;
        setRouteConversationIssue(null);
        setSelectedConversationId(null);
        navigate(buildConversationListUrl(location.pathname, location.search), { replace: true });
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in duration-500">
            <div className={`${showConversationList ? 'flex' : 'hidden'} w-full md:w-96 border-r dark:border-gray-700 flex-col h-full bg-white dark:bg-gray-800`}>
                <div className="p-4 border-b dark:border-gray-700">
                    <h1 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Messages</h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ConversationList
                        onSelectConversation={(conversationId) => {
                            ignoredConversationRouteRef.current = normalizedRequestedConversationId;
                            setRouteConversationIssue(null);
                            setSelectedConversationId(conversationId);
                            if (normalizedRequestedConversationId) {
                                navigate(buildConversationListUrl(location.pathname, location.search), { replace: true });
                            }
                        }}
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
                                    onClick={handleBackToConversations}
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
                        <MessageInput conversationId={selectedConversationId} />
                    </>
                ) : routeConversationIssue ? (
                    <div ref={threadIssueRef} role="alert" aria-live="assertive" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 p-8 text-center focus:outline-none dark:bg-gray-900/50">
                        {!isDesktop && (
                            <button
                                type="button"
                                onClick={handleBackToConversations}
                                className="mb-6 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-400 hover:text-orange-500 dark:border-gray-700 dark:text-gray-200"
                            >
                                <ArrowLeft size={16} />
                                Back to conversations
                            </button>
                        )}
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                            <AlertCircle size={30} />
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{routeConversationIssue.title}</h2>
                        <p className="max-w-sm text-gray-500 dark:text-gray-400">{routeConversationIssue.message}</p>
                        <button type="button" onClick={() => void handleRetryUnavailableThread()} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-700 transition-colors hover:border-orange-400 hover:text-orange-500 dark:border-gray-700 dark:text-gray-200">
                            <RefreshCw size={18} />
                            Retry
                        </button>
                    </div>
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
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            You haven't selected an enquiry
                        </h2>
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
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading messages..." />}>
            <MessagesContent />
        </Suspense>
    );
}
