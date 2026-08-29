"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, MessageSquare, PlusCircle, RefreshCw, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '@/contexts/MessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ConversationList from '@/components/dashboard/messaging/ConversationList';
import ConversationThread from '@/components/dashboard/messaging/ConversationThread';
import MessageInput from '@/components/dashboard/messaging/MessageInput';
import ConversationListSkeleton from '@/components/dashboard/messaging/ConversationListSkeleton';
import ConversationThreadSkeleton from '@/components/dashboard/messaging/ConversationThreadSkeleton';
import { getApplications } from '@/services/applicationsService';
import { getUserLeads } from '@/services/leadsService';
import { messagesService } from '@/services/messagesService';
import {

    resolveConversationQuerySelection,
    type ConversationThreadIssue,
} from '@/lib/messagesInbox';

type ManagerRecommendation = {
    managerId: string;
    managerName: string;
    managerEmail?: string;
    managerPhone?: string;
    managerAgency?: string;
    propertyId?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyImage?: string;
    propertyPrice?: number;
    listingType?: string;
    fastTrackCaseId?: string;
};

const terminalApplicationStatuses = new Set(['rejected', 'withdrawn', 'completed']);

function latestTimestamp(value?: string) {
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildApplicationRecommendation(applications: Awaited<ReturnType<typeof getApplications>>['data']) {
    return [...(applications || [])]
        .filter((application) => application.manager_id)
        .sort((left, right) => {
            const leftActive = terminalApplicationStatuses.has(String(left.status || '').toLowerCase()) ? 0 : 1;
            const rightActive = terminalApplicationStatuses.has(String(right.status || '').toLowerCase()) ? 0 : 1;
            if (leftActive !== rightActive) {
                return rightActive - leftActive;
            }
            return latestTimestamp(right.updated_at || right.created_at) - latestTimestamp(left.updated_at || left.created_at);
        })[0];
}

function buildLeadRecommendation(leads: Awaited<ReturnType<typeof getUserLeads>>['data']) {
    return [...(leads || [])]
        .filter((lead) => lead.matched_broker_id || lead.broker_id)
        .sort((left, right) => latestTimestamp(right.updated_at || right.created_at) - latestTimestamp(left.updated_at || left.created_at))[0];
}

function formatLeadAddress(lead: NonNullable<Awaited<ReturnType<typeof getUserLeads>>['data']>[number]) {
    return [lead.property?.address_line_1, lead.property?.city].filter(Boolean).join(', ');
}

function MessagesContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const attemptedConversationRefreshesRef = useRef<Set<string>>(new Set());
    const conversationRefreshesInFlightRef = useRef<Set<string>>(new Set());
    const {
        conversations: _conversations,
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
    const [managerRecommendation, setManagerRecommendation] = useState<ManagerRecommendation | null>(null);
    const [recommendationLoading, setRecommendationLoading] = useState(false);
    const [openingRecommendedConversation, setOpeningRecommendedConversation] = useState(false);
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
        if (!user) {
            setManagerRecommendation(null);
            return;
        }

        let cancelled = false;
        setRecommendationLoading(true);

        const loadRecommendation = async () => {
            const [applicationsResult, leadsResult] = await Promise.all([
                getApplications({ suppressErrorToast: true }),
                getUserLeads({ suppressErrorToast: true }),
            ]);

            if (cancelled) {
                return;
            }

            const application = buildApplicationRecommendation(applicationsResult.data);
            if (application?.manager_id) {
                setManagerRecommendation({
                    managerId: application.manager_id,
                    managerName: application.agent_name || application.agent_agency || 'Assigned manager',
                    managerEmail: application.agent_email || undefined,
                    managerPhone: application.agent_phone || undefined,
                    managerAgency: application.agent_agency || undefined,
                    propertyId: application.property_id,
                    propertyTitle: application.property_title || undefined,
                    propertyAddress: application.property_address || undefined,
                    propertyImage: application.property_image || undefined,
                    propertyPrice: application.property_price,
                    listingType: application.listing_type || undefined,
                    fastTrackCaseId: application.fast_track_case_id || undefined,
                });
                setRecommendationLoading(false);
                return;
            }

            const lead = buildLeadRecommendation(leadsResult.data);
            const managerId = lead?.matched_broker_id || lead?.broker_id;
            if (lead && managerId) {
                setManagerRecommendation({
                    managerId,
                    managerName: lead.matched_broker?.name || lead.property?.agent_name || 'Assigned manager',
                    managerEmail: lead.matched_broker?.email || lead.property?.agent_email || undefined,
                    managerPhone: lead.matched_broker?.phone || lead.property?.agent_phone || undefined,
                    managerAgency: lead.matched_broker?.company_name || lead.property?.agent_company || undefined,
                    propertyId: lead.property_id,
                    propertyTitle: lead.property?.title || lead.property_name || lead.propertyInterested,
                    propertyAddress: formatLeadAddress(lead) || undefined,
                    propertyImage: undefined,
                    propertyPrice: lead.property?.price,
                    listingType: lead.property?.listing_type || lead.journey_type,
                });
            } else {
                setManagerRecommendation(null);
            }
            setRecommendationLoading(false);
        };

        void loadRecommendation().catch(() => {
            if (!cancelled) {
                setManagerRecommendation(null);
                setRecommendationLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [user]);

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
        } catch (_err) {
            setError('Failed to send message. Please try again.');
        }
    };

    const handleOpenNewEnquiry = () => {
        clearConversationThreadIssue();
        setRouteConversationIssue(null);
        navigate('/user/dashboard/discover');
    };

    const handleOpenRecommendedManager = useCallback(async () => {
        if (!managerRecommendation || !user) {
            return;
        }

        setOpeningRecommendedConversation(true);
        try {
            const conversation = await messagesService.upsertDirectConversation(managerRecommendation.managerId, {
                propertyId: managerRecommendation.propertyId,
                propertyTitle: managerRecommendation.propertyTitle,
                propertyAddress: managerRecommendation.propertyAddress,
                propertyImage: managerRecommendation.propertyImage,
                listingType: managerRecommendation.listingType,
                propertyPrice: managerRecommendation.propertyPrice,
                fastTrackCaseId: managerRecommendation.fastTrackCaseId,
                senderName: user.user_metadata?.full_name || user.name || user.email || '',
                senderEmail: user.email || '',
                senderPhone: user.phone || user.user_metadata?.phone || '',
                recipientName: managerRecommendation.managerName,
                recipientEmail: managerRecommendation.managerEmail || '',
                recipientPhone: managerRecommendation.managerPhone || '',
                recipientAgency: managerRecommendation.managerAgency || '',
            });
            await refreshConversations();
            setSelectedConversationId(conversation.id);
            navigate('/user/dashboard/messages?conversation=' + conversation.id);
        } catch (conversationError: any) {
            toast.error(conversationError?.message || 'Unable to open the manager conversation right now.');
        } finally {
            setOpeningRecommendedConversation(false);
        }
    }, [managerRecommendation, navigate, refreshConversations, setSelectedConversationId, toast, user]);

    const handleRetryUnavailableThread = async () => {
        const conversationId = (conversationThreadIssue ?? routeConversationIssue)?.conversationId;
        clearConversationThreadIssue();
        setRouteConversationIssue(null);
        await refreshConversations();
        if (conversationId) {
            setSelectedConversationId(conversationId);
        }
    };

    const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
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
                    {/* Conversation list panel — hidden on mobile when viewing a thread */}
                    <div className={`${mobileView === 'thread' ? 'hidden lg:block' : ''} min-w-0 overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-gray-800 lg:col-span-4`}>
                        {isLoading ? (
                            <ConversationListSkeleton />
                        ) : (
                            <ConversationList
                                onSelectConversation={(id) => {
                                    setSelectedConversationId(id);
                                    setMobileView('thread');
                                }}
                                selectedConversationId={selectedConversationId}
                            />
                        )}
                    </div>

                    {/* Thread panel — shown on mobile when a conversation is selected, always shown on desktop */}
                    {selectedConversationId ? (
                        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-gray-800 lg:col-span-8`}>
                            {/* Mobile back button */}
                            <button
                                type="button"
                                onClick={() => setMobileView('list')}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors border-b border-gray-100 dark:border-gray-700 lg:hidden"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                            <ConversationThread conversationId={selectedConversationId} />
                            <MessageInput
                                conversationId={selectedConversationId}
                                onSend={handleSend}
                            />
                        </div>
                    ) : mobileView === 'thread' && isLoading && !hasLoadedConversations ? (
                        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                            <ConversationThreadSkeleton />
                        </div>
                    ) : mobileView === 'thread' && activeThreadIssue ? (
                        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-gray-900/30">
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
                        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col items-center justify-center overflow-hidden rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-gray-800 lg:col-span-8`}>
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

                            {managerRecommendation ? (
                                <div className="mt-8 w-full max-w-md rounded-3xl border border-orange-100 bg-white p-4 text-left shadow-xl shadow-orange-100/60 dark:border-orange-500/20 dark:bg-gray-950 dark:shadow-none">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                                            <UserRound size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                Message {managerRecommendation.managerName}
                                            </p>
                                            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                                                {managerRecommendation.propertyTitle || managerRecommendation.managerAgency || 'Your assigned property manager'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleOpenRecommendedManager()}
                                        disabled={openingRecommendedConversation}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {openingRecommendedConversation ? <ActionSpinner size={17} className="" /> : <MessageSquare size={17} />}
                                        {openingRecommendedConversation ? 'Opening chat' : 'Open manager chat'}
                                    </button>
                                </div>
                            ) : recommendationLoading ? (
                                <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                                    <ActionSpinner size={16} aria-hidden />
                                    Checking assigned manager
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading messages..." />}>
            <MessagesContent />
        </Suspense>
    );
}
