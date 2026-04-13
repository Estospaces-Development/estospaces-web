"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Loader2, MessageSquare, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import LeadActionMap from '@/components/manager/LeadActionMap';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { getBrokerLeads, respondToLead, type Lead } from '@/services/leadsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { bookingsService } from '@/services/bookingsService';
import { messagesService } from '@/services/messagesService';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { canRequestLeadDocuments, formatLeadStage, getLeadDeadline, resolveLeadStage } from '@/lib/fastTrackWorkflow';
import { buildWorkspacePath } from '@/lib/workspaceLinks';

const STATUS_FILTERS = [
    { value: 'all', label: 'All Leads' },
    { value: 'pending_broker_response', label: 'Awaiting SLA' },
    { value: 'broker_responded', label: 'Responded' },
    { value: 'viewing_scheduled', label: 'Viewing Scheduled' },
];

const statusLabels: Record<string, string> = {
    pending_broker_response: 'Awaiting response',
    broker_responded: 'Responded',
    viewing_scheduled: 'Viewing scheduled',
    closed_won: 'Won',
    closed_lost: 'Lost',
    cancelled: 'Cancelled',
};

const slaLabels: Record<string, string> = {
    pending: 'Pending',
    warning: 'Warning',
    breach: 'Breached',
    success: 'Within SLA',
    manual: 'Manual',
};

function parseLeadPropertyImage(raw?: string) {
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed[0];
        }
    } catch {
        if (raw.startsWith('http')) {
            return raw;
        }
    }

    return undefined;
}

function getLeadTitle(lead: Lead) {
    return lead.property?.title || lead.propertyInterested || lead.property_name || 'Property enquiry';
}

function getLeadAddress(lead: Lead) {
    const parts = [lead.property?.address_line_1, lead.property?.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

function getLeadClientName(lead: Lead) {
    return lead.name || lead.email || (lead.user_id ? `Client ${lead.user_id.slice(0, 8)}` : 'Property enquiry');
}

function getLeadClientContact(lead: Lead) {
    return lead.email || lead.phone || 'No contact details';
}

function getDateInputValue(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function canScheduleLeadViewing(lead: Lead) {
    const stage = resolveLeadStage(lead);
    return Boolean(
        lead.user_id &&
        lead.property_id &&
        (lead.broker_id || lead.matched_broker_id) &&
        !['completed', 'expired', 'rejected', 'withdrawn'].includes(stage) &&
        !['closed_won', 'closed_lost', 'cancelled'].includes(lead.status),
    );
}

function getSlaRemainingSeconds(lead: Lead, now: number) {
    if (typeof lead.sla_remaining_seconds === 'number') {
        return Math.max(0, lead.sla_remaining_seconds);
    }

    const deadline = getLeadDeadline(lead);
    if (!deadline) {
        return 0;
    }

    const remaining = Math.ceil((new Date(deadline).getTime() - now) / 1000);
    return remaining > 0 ? remaining : 0;
}

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'pending_broker_response':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'broker_responded':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'viewing_scheduled':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case 'closed_won':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'closed_lost':
        case 'cancelled':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
}

function getSlaBadge(status: string, remainingSeconds: number) {
    if (status === 'breach' || remainingSeconds === 0) {
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }
    if (status === 'warning' || remainingSeconds <= 60) {
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    }
    if (status === 'success') {
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
}

export default function ManagerLeadsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuth();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actingLeadID, setActingLeadID] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const [scheduleLead, setScheduleLead] = useState<Lead | null>(null);
    const [scheduleForm, setScheduleForm] = useState({
        requested_date: getDateInputValue(1),
        requested_time: '10:00',
        user_notes: '',
    });

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            setNow(Date.now());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const fetchLeads = useCallback(async (
        selectedStatus = statusFilter,
        options: { silent?: boolean } = {},
    ) => {
        if (!options.silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const [result, fastTrackCasesResult] = await Promise.all([
                getBrokerLeads(selectedStatus === 'all' ? undefined : selectedStatus),
                getFastTrackCases({ suppressErrorToast: true }),
            ]);
            if (result.error) {
                throw new Error(result.error);
            }
            setLeads(result.data || []);
            setFastTrackCases(fastTrackCasesResult.data || []);
        } catch (fetchError: any) {
            if (!options.silent) {
                setError(fetchError?.message || 'Failed to load leads');
                setLeads([]);
            }
        } finally {
            if (!options.silent) {
                setLoading(false);
            }
        }
    }, [statusFilter]);

    useEffect(() => {
        void fetchLeads(statusFilter);
    }, [fetchLeads, statusFilter]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
        ],
        refresh: () => fetchLeads(statusFilter, { silent: true }),
    });

    const filteredLeads = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return leads;
        }

        return leads.filter((lead) => {
            const haystack = [
                lead.lead_number,
                getLeadTitle(lead),
                getLeadAddress(lead),
                getLeadClientName(lead),
                getLeadClientContact(lead),
                lead.status,
                resolveLeadStage(lead),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [leads, searchQuery]);

    const summary = useMemo(() => {
        const awaitingResponse = leads.filter((lead) => resolveLeadStage(lead) === 'matching').length;
        const documentsQueue = leads.filter((lead) => {
            const stage = resolveLeadStage(lead);
            return stage === 'docs_requested' || stage === 'under_review' || stage === 'approved';
        }).length;
        const viewingScheduled = leads.filter((lead) => lead.status === 'viewing_scheduled').length;
        const breached = leads.filter((lead) => {
            const remaining = getSlaRemainingSeconds(lead, now);
            return lead.sla_status === 'breach' || (lead.status === 'pending_broker_response' && remaining === 0);
        }).length;

        return {
            total: leads.length,
            awaitingResponse,
            documentsQueue,
            viewingScheduled,
            breached,
        };
    }, [leads, now]);
    const fastTrackCaseByLeadId = useMemo(() => {
        const mapping = new Map<string, FastTrackCase>();

        fastTrackCases.forEach((caseItem) => {
            if (caseItem.leadId) {
                mapping.set(caseItem.leadId, caseItem);
            }
        });

        return mapping;
    }, [fastTrackCases]);

    const openConversation = useCallback(async (lead: Lead) => {
        if (!lead.user_id) {
            throw new Error('This lead does not have a linked user conversation yet.');
        }

        return messagesService.upsertDirectConversation(lead.user_id, {
            propertyId: lead.property_id,
            propertyTitle: getLeadTitle(lead),
            propertyAddress: getLeadAddress(lead),
            propertyImage: parseLeadPropertyImage(lead.property?.image_urls),
            listingType: lead.property?.listing_type,
            propertyPrice: lead.property?.price,
            senderName: user?.name || user?.email || 'Manager',
            senderEmail: user?.email || '',
            senderPhone: user?.phone || '',
            recipientName: getLeadClientName(lead),
            recipientEmail: lead.email || '',
            recipientPhone: lead.phone || '',
        });
    }, [user]);

    const sendLeadMessage = useCallback(async (lead: Lead, content: string) => {
        const conversation = await openConversation(lead);
        await messagesService.sendMessage({
            conversationId: conversation.id,
            content,
            type: 'text',
        });
        return conversation;
    }, [openConversation]);

    const openLeadMessages = useCallback(async (lead: Lead) => {
        try {
            const conversation = await openConversation(lead);
            navigate(`/manager/messages?conversation=${conversation.id}`);
        } catch (conversationError: any) {
            toast.error(conversationError?.message || 'Unable to open the conversation.');
        }
    }, [navigate, openConversation, toast]);

    const handleRequestDocs = useCallback(async (lead: Lead) => {
        if (!lead.user_id) {
            toast.error('This lead does not have a linked user account for document follow-up yet.');
            return;
        }
        if (!canRequestLeadDocuments(lead)) {
            toast.error('This journey has already moved beyond the live lead-response stage. Continue it from messages, viewings, or the matched workspace instead.');
            return;
        }

        const requestMessage = `Hi ${getLeadClientName(lead)}, to keep your 24-hour fast-track moving, please upload your verification documents in the app. I will review them as soon as they arrive.`;

        setActingLeadID(lead.id);
        try {
            const result = await respondToLead(lead.id, 'request_docs', requestMessage, undefined, {
                suppressErrorToast: true,
            });
            if (result.error) {
                throw new Error(result.error);
            }

            await sendLeadMessage(lead, requestMessage);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                    WORKSPACE_SYNC_TAGS.MESSAGES,
                ],
                reason: 'Manager requested lead documents',
                ids: {
                    leadId: lead.id,
                    propertyId: lead.property_id,
                },
            });
            toast.success('Document request sent to the user and the chat thread is live.');
            await fetchLeads(statusFilter, { silent: true });
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to request documents right now.');
        } finally {
            setActingLeadID(null);
        }
    }, [fetchLeads, publishWorkspaceSync, sendLeadMessage, statusFilter, toast]);

    const handleRespondAndOpenMessages = useCallback(async (lead: Lead) => {
        if (!lead.user_id) {
            toast.error('This lead does not have a linked user conversation yet.');
            return;
        }

        const responseMessage = `Hi ${getLeadClientName(lead)}, I can help you with ${getLeadTitle(lead)}.`;

        setActingLeadID(lead.id);
        try {
            const response = await respondToLead(
                lead.id,
                'message',
                responseMessage,
                undefined,
                { suppressErrorToast: true },
            );
            if (response.error) {
                throw new Error(response.error);
            }

            const conversation = await sendLeadMessage(lead, responseMessage);

            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.MESSAGES,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'Manager responded to lead',
                ids: {
                    leadId: lead.id,
                    propertyId: lead.property_id,
                },
            });
            await fetchLeads(statusFilter, { silent: true });
            toast.success('Lead responded to. Opening the conversation thread.');
            navigate(`/manager/messages?conversation=${conversation.id}`);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to open the conversation.');
        } finally {
            setActingLeadID(null);
        }
    }, [fetchLeads, navigate, sendLeadMessage, statusFilter, toast]);

    const openScheduleViewing = useCallback((lead: Lead) => {
        setScheduleLead(lead);
        setScheduleForm({
            requested_date: getDateInputValue(1),
            requested_time: '10:00',
            user_notes: lead.notes || '',
        });
    }, []);

    const handleScheduleViewing = useCallback(async () => {
        const assignedManagerId = scheduleLead?.broker_id || scheduleLead?.matched_broker_id;
        if (!scheduleLead?.property_id || !scheduleLead.user_id || !assignedManagerId) {
            toast.error('This lead is missing the property, user, or manager link required for scheduling.');
            return;
        }
        if (!scheduleForm.requested_date || !scheduleForm.requested_time) {
            toast.error('Choose a viewing date and time first.');
            return;
        }

        setActingLeadID(scheduleLead.id);
        try {
            await bookingsService.createViewing({
                property_id: scheduleLead.property_id,
                manager_id: assignedManagerId,
                lead_id: scheduleLead.id,
                client_name: getLeadClientName(scheduleLead),
                client_email: scheduleLead.email || '',
                client_phone: scheduleLead.phone || '',
                property_title: getLeadTitle(scheduleLead),
                property_address: getLeadAddress(scheduleLead),
                property_image: parseLeadPropertyImage(scheduleLead.property?.image_urls),
                property_price: scheduleLead.property?.price,
                listing_type: scheduleLead.property?.listing_type,
                agent_name: scheduleLead.property?.agent_name,
                agent_email: scheduleLead.property?.agent_email,
                agent_phone: scheduleLead.property?.agent_phone,
                requested_date: scheduleForm.requested_date,
                requested_time: scheduleForm.requested_time,
                user_notes: scheduleForm.user_notes,
            });

            setScheduleLead(null);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.VIEWINGS,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                ],
                reason: 'Manager scheduled viewing from lead',
                ids: {
                    leadId: scheduleLead.id,
                    propertyId: scheduleLead.property_id,
                },
            });
            toast.success('Viewing created successfully. The appointment and linked application are now in sync.');
            await fetchLeads(statusFilter, { silent: true });
        } catch (scheduleError: any) {
            toast.error(scheduleError?.message || 'Unable to schedule the viewing right now.');
        } finally {
            setActingLeadID(null);
        }
    }, [fetchLeads, scheduleForm.requested_date, scheduleForm.requested_time, scheduleForm.user_notes, scheduleLead, statusFilter, toast]);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-4">
                        <BackButton />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lead Response Desk</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Live lead stages, document requests, and the 10-minute response window in one workspace.
                    </p>
                </div>
                <button
                    onClick={() => void fetchLeads(statusFilter)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                    { label: 'Total Leads', value: summary.total, icon: UserRound, accent: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Live Matching', value: summary.awaitingResponse, icon: Clock3, accent: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
                    { label: 'Documents Queue', value: summary.documentsQueue, icon: ShieldCheck, accent: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
                    { label: 'Breached', value: summary.breached, icon: AlertTriangle, accent: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
                ].map((card) => (
                    <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${card.accent}`}>
                            <card.icon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    </div>
                ))}
            </div>

            <LeadActionMap
                leads={filteredLeads}
                now={now}
                actingLeadID={actingLeadID}
                canRequestDocuments={canRequestLeadDocuments}
                onRequestDocuments={handleRequestDocs}
                onScheduleViewing={openScheduleViewing}
                onOpenMessages={(lead) => {
                    void openLeadMessages(lead);
                }}
            />

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by lead number, client, property, or email"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white lg:max-w-md"
                    />
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                    statusFilter === filter.value
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading live broker leads...</p>
                    </div>
                ) : error ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">No leads found</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            New property enquiries will appear here with their SLA timer and client contact details.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredLeads.map((lead) => {
                            const remainingSeconds = getSlaRemainingSeconds(lead, now);
                            const stage = resolveLeadStage(lead);
                            const isAwaitingResponse = stage === 'matching';
                            const canRequestDocuments = canRequestLeadDocuments(lead);
                            const canScheduleViewing = canScheduleLeadViewing(lead);
                            const isBusy = actingLeadID === lead.id;
                            const linkedCase = fastTrackCaseByLeadId.get(lead.id)
                                || fastTrackCases.find((caseItem) => (
                                    caseItem.propertyId === lead.property_id
                                ))
                                || null;
                            const leadWorkspacePath = linkedCase
                                ? buildWorkspacePath('/manager/fast-track', {
                                    caseId: linkedCase.caseId,
                                    leadId: lead.id,
                                    propertyId: lead.property_id,
                                    section: 'overview',
                                })
                                : null;
                            const leadDocumentsPath = linkedCase
                                ? buildWorkspacePath('/manager/fast-track', {
                                    caseId: linkedCase.caseId,
                                    leadId: lead.id,
                                    propertyId: lead.property_id,
                                    section: 'documents',
                                })
                                : null;

                            return (
                                <div key={lead.id} className="p-6">
                                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getLeadTitle(lead)}</h2>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(lead.status)}`}>
                                                    {statusLabels[lead.status] || lead.status}
                                                </span>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSlaBadge(lead.sla_status || 'pending', remainingSeconds)}`}>
                                                    {slaLabels[lead.sla_status || 'pending'] || 'Pending'}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                    {formatLeadStage(stage)}
                                                </span>
                                            </div>

                                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lead Number</p>
                                                    <p className="mt-1">{lead.lead_number || lead.id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <Avatar
                                                            userId={lead.user_id}
                                                            name={getLeadClientName(lead)}
                                                            size="md"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{getLeadClientName(lead)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{getLeadClientContact(lead)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Property Address</p>
                                                    <p className="mt-1">{getLeadAddress(lead)}</p>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dispatch</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                                        {(lead.dispatch_status || 'matching').replace(/[_-]+/g, ' ')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Matched Broker</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                                        {lead.matched_broker?.name || lead.property?.agent_name || 'Awaiting first response'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {lead.matched_broker?.company_name || lead.property?.agent_company || '10-minute response window live'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Documents</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                                        {lead.documents_verified ? 'Approved' : lead.documents_uploaded ? 'Uploaded' : lead.documents_requested ? 'Requested' : 'Not requested'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                <div className="rounded-2xl bg-gray-100 px-4 py-2 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                                    Created {new Date(lead.created_at).toLocaleString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                                {lead.viewing_scheduled_at && (
                                                    <div className="rounded-2xl bg-purple-100 px-4 py-2 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        Viewing {new Date(lead.viewing_scheduled_at).toLocaleString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                )}
                                                {isAwaitingResponse && (
                                                    <div className={`rounded-2xl px-4 py-2 font-semibold ${getSlaBadge(lead.sla_status || 'pending', remainingSeconds)}`}>
                                                        {remainingSeconds > 0 ? `10 min ${formatCountdown(remainingSeconds)}` : 'Response window expired'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 xl:min-w-[240px]">
                                            {leadWorkspacePath ? (
                                                <button
                                                    onClick={() => navigate(leadWorkspacePath)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                                                >
                                                    Open Live Workspace
                                                </button>
                                            ) : null}
                                            {leadDocumentsPath ? (
                                                <button
                                                    onClick={() => navigate(leadDocumentsPath)}
                                                    className="rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-950/20"
                                                >
                                                    Open Documents
                                                </button>
                                            ) : null}
                                            {isAwaitingResponse ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRespondAndOpenMessages(lead)}
                                                        disabled={isBusy}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                                        Respond And Message
                                                    </button>
                                                    {canRequestDocuments ? (
                                                        <button
                                                            onClick={() => void handleRequestDocs(lead)}
                                                            disabled={isBusy}
                                                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            Request Documents
                                                        </button>
                                                    ) : null}
                                                    {canScheduleViewing ? (
                                                        <button
                                                            onClick={() => openScheduleViewing(lead)}
                                                            disabled={isBusy}
                                                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            Schedule Viewing
                                                        </button>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <>
                                                    {lead.user_id ? (
                                                        <button
                                                            onClick={() => {
                                                                void openLeadMessages(lead);
                                                            }}
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                            Open Messages
                                                        </button>
                                                    ) : null}
                                                    {canRequestDocuments ? (
                                                        <button
                                                            onClick={() => void handleRequestDocs(lead)}
                                                            disabled={isBusy}
                                                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            {isBusy ? 'Sending request...' : 'Request Documents'}
                                                        </button>
                                                    ) : null}
                                                    {canScheduleViewing ? (
                                                        <button
                                                            onClick={() => openScheduleViewing(lead)}
                                                            disabled={isBusy}
                                                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            Schedule Viewing
                                                        </button>
                                                    ) : null}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={Boolean(scheduleLead)}
                onClose={() => {
                    if (!actingLeadID) {
                        setScheduleLead(null);
                    }
                }}
                title="Schedule Viewing"
                size="md"
                footer={scheduleLead ? (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setScheduleLead(null)}
                            disabled={Boolean(actingLeadID)}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => void handleScheduleViewing()}
                            disabled={Boolean(actingLeadID)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actingLeadID === scheduleLead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create Appointment
                        </button>
                    </div>
                ) : null}
            >
                {scheduleLead ? (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{getLeadTitle(scheduleLead)}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{getLeadClientName(scheduleLead)} · {getLeadAddress(scheduleLead)}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Date</span>
                                <input
                                    type="date"
                                    value={scheduleForm.requested_date}
                                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, requested_date: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </label>
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                                <input
                                    type="time"
                                    value={scheduleForm.requested_time}
                                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, requested_time: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </label>
                        </div>

                        <label className="block space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Notes</span>
                            <textarea
                                rows={4}
                                value={scheduleForm.user_notes}
                                onChange={(event) => setScheduleForm((previous) => ({ ...previous, user_notes: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                placeholder="Share anything the client or manager should know before the appointment."
                            />
                        </label>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
