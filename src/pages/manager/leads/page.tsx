"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock3, Download, History, Loader2, MessageSquare, Plus, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';
import AddLeadModal from '@/components/dashboard/AddLeadModal';
import LeadActionMap from '@/components/manager/LeadActionMap';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { createManualLead, getBrokerLeads, getLeadAudit, respondToLead, syncLeadLifecycle, type Lead, type LeadAuditEntry } from '@/services/leadsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { bookingsService } from '@/services/bookingsService';
import { messagesService } from '@/services/messagesService';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { canRequestLeadDocuments, formatLeadStage, resolveLeadStage } from '@/lib/fastTrackWorkflow';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import {
    getManagerLeadOperationalState,
    getManagerLeadSlaRemainingSeconds,
    paginateManagerLeads,
    sortManagerLeads,
    summarizeManagerLeads,
    type ManagerLeadSortMode,
} from '@/lib/managerLeadList';
import { buildCsvContent } from '@/lib/csvExport';

const STATUS_FILTERS = [
    { value: 'all', label: 'All Leads' },
    { value: 'pending_broker_response', label: 'Awaiting SLA' },
    { value: 'broker_responded', label: 'Responded' },
    { value: 'viewing_scheduled', label: 'Viewing Scheduled' },
];

const SORT_OPTIONS: { value: ManagerLeadSortMode; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'client_az', label: 'Client A-Z' },
    { value: 'budget_desc', label: 'Budget high' },
    { value: 'score_desc', label: 'Score high' },
];

const LEADS_PER_PAGE = 10;
const managerLeadFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black';

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

function isLeadLifecycleClosed(lead: Lead) {
    const stage = resolveLeadStage(lead);
    return ['closed_won', 'closed_lost', 'cancelled'].includes(lead.status) ||
        ['completed', 'expired', 'rejected', 'withdrawn'].includes(stage) ||
        ['completed', 'rejected', 'withdrawn', 'expired'].includes(lead.outcome || '');
}

function getSlaRemainingSeconds(lead: Lead, now: number) {
    return getManagerLeadSlaRemainingSeconds(lead, now);
}

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function buildLeadCsv(leads: Lead[]) {
    const header = ['Lead Number', 'Client', 'Contact', 'Property', 'Address', 'Status', 'Stage', 'SLA', 'Budget'];
    const rows = leads.map((lead) => [
        lead.lead_number || lead.id,
        getLeadClientName(lead),
        getLeadClientContact(lead),
        getLeadTitle(lead),
        getLeadAddress(lead),
        statusLabels[lead.status] || lead.status || 'Unknown',
        formatLeadStage(resolveLeadStage(lead)),
        slaLabels[lead.sla_status || 'manual'] || lead.sla_status || 'Manual',
        lead.budget || '',
    ]);

    return buildCsvContent([header, ...rows]);
}

function parseAuditDetails(details: LeadAuditEntry['details']): Record<string, unknown> {
    if (!details) {
        return {};
    }
    if (typeof details !== 'string') {
        return details;
    }
    try {
        const parsed = JSON.parse(details);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
        return {};
    }
}

function auditDetailText(value: unknown) {
    return String(value || '').replace(/[_-]+/g, ' ').trim();
}

function formatAuditAction(action: string) {
    return auditDetailText(action) || 'Lead activity';
}

function formatAuditTimestamp(entry: LeadAuditEntry) {
    if (!entry.timestamp) {
        return 'Time not recorded';
    }
    return new Date(entry.timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
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

function buildLeadEscalationPath(lead: Lead, stage: string, remainingSeconds: number) {
    const subject = `Urgent Fast Track SLA breach: ${getLeadTitle(lead)}`;
    const message = [
        `Lead ${lead.lead_number || lead.id} has breached the 10-minute Fast Track response window.`,
        `Current stage: ${formatLeadStage(stage)}.`,
        `Client: ${getLeadClientName(lead)} (${getLeadClientContact(lead)}).`,
        `Property: ${getLeadTitle(lead)} - ${getLeadAddress(lead)}.`,
        `SLA state: ${lead.sla_status || 'breach'}; ${remainingSeconds > 0 ? `${remainingSeconds} seconds remaining` : 'response window expired'}.`,
        'Action needed: admin oversight for reassignment, recovery, or the next Fast Track operational step.',
    ].join('\n');

    const params = new URLSearchParams({
        category: 'Fast Track',
        priority: 'urgent',
        subject,
        message,
    });

    return `/manager/help?${params.toString()}`;
}

export default function ManagerLeadsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const searchParamQuery = searchParams.get('search') || '';
    const toast = useToast();
    const { user } = useAuth();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(searchParamQuery);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState<ManagerLeadSortMode>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [actingLeadID, setActingLeadID] = useState<string | null>(null);
    const [expandedAuditLeadID, setExpandedAuditLeadID] = useState<string | null>(null);
    const [leadAuditEntries, setLeadAuditEntries] = useState<Record<string, LeadAuditEntry[]>>({});
    const [leadAuditErrors, setLeadAuditErrors] = useState<Record<string, string>>({});
    const [leadAuditLoadingID, setLeadAuditLoadingID] = useState<string | null>(null);
    const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [scheduleLead, setScheduleLead] = useState<Lead | null>(null);
    const manualLeadTriggerRef = useRef<HTMLButtonElement | null>(null);
    const [scheduleForm, setScheduleForm] = useState({
        requested_date: getDateInputValue(1),
        requested_time: '10:00',
        user_notes: '',
    });
    const [exportStatus, setExportStatus] = useState('');
    const lastExportStartedAtRef = useRef(0);

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
                lead.user_id,
                lead.broker_request_id,
                lead.status,
                resolveLeadStage(lead),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [leads, searchQuery]);

    const visibleLeads = useMemo(() => (
        sortManagerLeads(filteredLeads, sortMode)
    ), [filteredLeads, sortMode]);

    const paginatedLeads = useMemo(() => (
        paginateManagerLeads(visibleLeads, currentPage, LEADS_PER_PAGE)
    ), [currentPage, visibleLeads]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortMode, statusFilter]);

    useEffect(() => {
        setSearchQuery(searchParamQuery);
    }, [searchParamQuery]);

    useEffect(() => {
        if (currentPage !== paginatedLeads.currentPage) {
            setCurrentPage(paginatedLeads.currentPage);
        }
    }, [currentPage, paginatedLeads.currentPage]);

    const summary = useMemo(() => summarizeManagerLeads(leads, now), [leads, now]);
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

        const linkedCase = fastTrackCaseByLeadId.get(lead.id) || null;

        return messagesService.upsertDirectConversation(lead.user_id, {
            propertyId: lead.property_id,
            propertyTitle: getLeadTitle(lead),
            propertyAddress: getLeadAddress(lead),
            propertyImage: parseLeadPropertyImage(lead.property?.image_urls),
            fastTrackCaseId: linkedCase?.caseId,
            listingType: lead.property?.listing_type,
            propertyPrice: lead.property?.price,
            senderName: user?.name || user?.email || 'Manager',
            senderEmail: user?.email || '',
            senderPhone: user?.phone || '',
            recipientName: getLeadClientName(lead),
            recipientEmail: lead.email || '',
            recipientPhone: lead.phone || '',
        });
    }, [fastTrackCaseByLeadId, user]);

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

    const handleToggleAudit = useCallback(async (lead: Lead) => {
        const isExpanded = expandedAuditLeadID === lead.id;
        setExpandedAuditLeadID(isExpanded ? null : lead.id);
        if (isExpanded || leadAuditEntries[lead.id]) {
            return;
        }

        setLeadAuditLoadingID(lead.id);
        setLeadAuditErrors((current) => {
            const next = { ...current };
            delete next[lead.id];
            return next;
        });

        const result = await getLeadAudit(lead.id);
        setLeadAuditLoadingID(null);
        if (result.error || !result.data) {
            const message = result.error || 'Lead audit trail is not available right now.';
            setLeadAuditErrors((current) => ({ ...current, [lead.id]: message }));
            toast.error(message);
            return;
        }
        setLeadAuditEntries((current) => ({ ...current, [lead.id]: result.data || [] }));
    }, [expandedAuditLeadID, leadAuditEntries, toast]);

    const handleCloseManualLeadModal = useCallback(() => {
        setIsManualLeadModalOpen(false);
        window.requestAnimationFrame(() => {
            manualLeadTriggerRef.current?.focus();
        });
    }, []);

    const handleCreateManualLead = useCallback(async (leadDraft: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const result = await createManualLead({
                name: leadDraft.name || '',
                email: leadDraft.email || '',
                phone: leadDraft.phone,
                property_interested: leadDraft.propertyInterested || leadDraft.property_name || '',
                status: leadDraft.status,
                score: leadDraft.score,
                budget: leadDraft.budget,
                last_contact: leadDraft.lastContact,
            });
            if (result.error || !result.data) {
                throw new Error(result.error || 'Unable to create the manual lead.');
            }

            setLeads((previous) => [{
                ...result.data!,
                propertyInterested: result.data!.propertyInterested || result.data!.property_name,
            }, ...previous]);
            toast.success('Manual lead created and added to the response desk.');
            await fetchLeads(statusFilter, { silent: true });
        } catch (createError: any) {
            toast.error(createError?.message || 'Unable to create the manual lead.');
            throw createError;
        }
    }, [fetchLeads, statusFilter, toast]);

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

    const handleLifecycleUpdate = useCallback(async (lead: Lead, nextOutcome: 'completed' | 'rejected') => {
        const closingAsWon = nextOutcome === 'completed';
        setActingLeadID(lead.id);
        try {
            const result = await syncLeadLifecycle(lead.id, {
                status: closingAsWon ? 'closed_won' : 'closed_lost',
                stage: closingAsWon ? 'completed' : 'rejected',
                outcome: nextOutcome,
            }, { suppressErrorToast: true });
            if (result.error || !result.data) {
                throw new Error(result.error || 'Unable to sync the lifecycle update.');
            }

            setLeads((previous) => previous.map((item) => (
                item.id === lead.id ? result.data! : item
            )));
            setLeadAuditEntries((current) => {
                const next = { ...current };
                delete next[lead.id];
                return next;
            });
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'Manager synced lead lifecycle',
                ids: {
                    leadId: lead.id,
                    propertyId: lead.property_id,
                },
            });
            toast.success(closingAsWon ? 'Lead marked won and lifecycle synced.' : 'Lead marked lost and lifecycle synced.');
            await fetchLeads(statusFilter, { silent: true });
            window.requestAnimationFrame(() => {
                document.getElementById(`lead-lifecycle-status-${lead.id}`)?.focus();
            });
        } catch (lifecycleError: any) {
            toast.error(lifecycleError?.message || 'Unable to sync the lifecycle update.');
        } finally {
            setActingLeadID(null);
        }
    }, [fetchLeads, publishWorkspaceSync, statusFilter, toast]);

    const handleExportCsv = useCallback(() => {
        if (visibleLeads.length === 0) {
            setExportStatus('No leads match the current export filters.');
            return;
        }

        const nowMs = Date.now();
        if (nowMs - lastExportStartedAtRef.current < 1000) {
            setExportStatus('Export already started. Please wait a moment before trying again.');
            return;
        }
        lastExportStartedAtRef.current = nowMs;

        const csv = buildLeadCsv(visibleLeads);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `manager-leads-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        setExportStatus(`Exported ${visibleLeads.length} lead${visibleLeads.length === 1 ? '' : 's'} to CSV.`);
    }, [visibleLeads]);

    return (
        <div className="space-y-8 pb-20">
            <p role="status" aria-live="polite" className="sr-only">{exportStatus}</p>
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
                <div className="flex flex-wrap gap-3">
                    <button
                        ref={manualLeadTriggerRef}
                        type="button"
                        onClick={() => setIsManualLeadModalOpen(true)}
                        className={`inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 ${managerLeadFocusClass}`}
                    >
                        <Plus className="h-4 w-4" />
                        Add manual lead
                    </button>
                    <button
                        onClick={() => void fetchLeads(statusFilter)}
                        className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={visibleLeads.length === 0}
                        className={`inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200 ${managerLeadFocusClass}`}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
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
                leads={visibleLeads}
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
                        placeholder="Search by user name, lead number, property, or email"
                        className={`w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white lg:max-w-md ${managerLeadFocusClass}`}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <span>Sort</span>
                            <select
                                aria-label="Sort leads"
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value as ManagerLeadSortMode)}
                                className={`rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800 outline-none transition-colors focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${managerLeadFocusClass}`}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FILTERS.map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                        statusFilter === filter.value
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                    } ${managerLeadFocusClass}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {exportStatus ? (
                        <div role="status" className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                            {exportStatus}
                        </div>
                    ) : null}
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
                ) : visibleLeads.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">No leads found</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            New property enquiries will appear here with their SLA timer and client contact details.
                        </p>
                    </div>
                ) : (
                    <div aria-label="Lead response list" className="divide-y divide-gray-100 dark:divide-gray-800">
                        {paginatedLeads.items.map((lead) => {
                            const remainingSeconds = getSlaRemainingSeconds(lead, now);
                            const stage = resolveLeadStage(lead);
                            const isAwaitingResponse = stage === 'matching';
                            const operationalState = getManagerLeadOperationalState(
                                lead,
                                now,
                                statusLabels[lead.status] || lead.status,
                            );
                            const canRequestDocuments = canRequestLeadDocuments(lead);
                            const canScheduleViewing = canScheduleLeadViewing(lead);
                            const canCloseLifecycle = !isLeadLifecycleClosed(lead);
                            const isBusy = actingLeadID === lead.id;
                            const isAuditExpanded = expandedAuditLeadID === lead.id;
                            const auditEntries = leadAuditEntries[lead.id] || [];
                            const auditError = leadAuditErrors[lead.id];
                            const isAuditLoading = leadAuditLoadingID === lead.id;
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
                            const leadEscalationPath = operationalState.requiresEscalation
                                ? buildLeadEscalationPath(lead, stage, remainingSeconds)
                                : null;
                            const lifecycleActions = canCloseLifecycle ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleLifecycleUpdate(lead, 'completed')}
                                        disabled={isBusy}
                                        aria-label={`Mark ${getLeadTitle(lead)} won`}
                                        className={`rounded-2xl border border-green-200 px-4 py-3 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-900/40 dark:text-green-300 dark:hover:bg-green-950/20 ${managerLeadFocusClass}`}
                                    >
                                        Mark Won
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleLifecycleUpdate(lead, 'rejected')}
                                        disabled={isBusy}
                                        aria-label={`Mark ${getLeadTitle(lead)} lost`}
                                        className={`rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20 ${managerLeadFocusClass}`}
                                    >
                                        Mark Lost
                                    </button>
                                </div>
                            ) : null;

                            return (
                                <article
                                    key={lead.id}
                                    aria-label={`${getLeadTitle(lead)} lead`}
                                    className={`p-6 ${operationalState.requiresEscalation ? 'bg-red-50/70 ring-1 ring-inset ring-red-200 dark:bg-red-950/10 dark:ring-red-900/40' : ''}`}
                                >
                                    <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 space-y-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="max-w-full break-words text-xl font-bold text-gray-900 dark:text-white">{getLeadTitle(lead)}</h2>
                                                <span
                                                    id={`lead-lifecycle-status-${lead.id}`}
                                                    tabIndex={-1}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 ${operationalState.requiresEscalation ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white' : getStatusBadge(lead.status)}`}
                                                >
                                                    {operationalState.statusLabel}
                                                </span>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSlaBadge(lead.sla_status || 'pending', remainingSeconds)}`}>
                                                    {slaLabels[lead.sla_status || 'pending'] || 'Pending'}
                                                </span>
                                                {operationalState.requiresEscalation ? (
                                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                                                        Fast Track oversight
                                                    </span>
                                                ) : null}
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                    {operationalState.requiresEscalation ? `Current stage: ${formatLeadStage(stage)}` : formatLeadStage(stage)}
                                                </span>
                                            </div>
                                            {operationalState.requiresEscalation ? (
                                                <div role="status" className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                                        <AlertTriangle className="h-5 w-5 shrink-0" />
                                                        <div>
                                                            <p className="font-bold">SLA breached. Admin escalation is required before normal handling continues.</p>
                                                            <p className="mt-1 text-red-700 dark:text-red-200/80">
                                                                The 10-minute Fast Track response window expired while this lead is still active. Use the escalation action to open an urgent Fast Track oversight ticket.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}

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
                                                        <div className="min-w-0">
                                                            <p className="break-words font-medium text-gray-900 dark:text-white">{getLeadClientName(lead)}</p>
                                                            <p className="break-all text-xs text-gray-500 dark:text-gray-400">{getLeadClientContact(lead)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Property Address</p>
                                                    <p className="mt-1 break-words">{getLeadAddress(lead)}</p>
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
                                                {isAwaitingResponse && operationalState.showResponseCountdown && (
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
                                                    aria-label={`Open live workspace for ${getLeadTitle(lead)}`}
                                                    className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 ${managerLeadFocusClass}`}
                                                >
                                                    Open Live Workspace
                                                </button>
                                            ) : null}
                                            {leadDocumentsPath ? (
                                                <button
                                                    onClick={() => navigate(leadDocumentsPath)}
                                                    aria-label={`Open documents for ${getLeadTitle(lead)}`}
                                                    className={`rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-950/20 ${managerLeadFocusClass}`}
                                                >
                                                    Open Documents
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={() => void handleToggleAudit(lead)}
                                                aria-expanded={isAuditExpanded}
                                                aria-controls={`lead-audit-${lead.id}`}
                                                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                            >
                                                <History className="h-4 w-4" />
                                                Audit Trail
                                            </button>
                                            {leadEscalationPath ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(leadEscalationPath)}
                                                    aria-label={`Escalate ${getLeadTitle(lead)} to admin oversight`}
                                                    className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 ${managerLeadFocusClass}`}
                                                >
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Escalate to Admin
                                                </button>
                                            ) : null}
                                            {isAwaitingResponse ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRespondAndOpenMessages(lead)}
                                                        disabled={isBusy}
                                                        aria-label={`Respond and message ${getLeadTitle(lead)}`}
                                                        className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 ${managerLeadFocusClass}`}
                                                    >
                                                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                                        Respond And Message
                                                    </button>
                                                    {canRequestDocuments ? (
                                                        <button
                                                            onClick={() => void handleRequestDocs(lead)}
                                                            disabled={isBusy}
                                                            aria-label={`Request documents for ${getLeadTitle(lead)}`}
                                                            className={`rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                                        >
                                                            Request Documents
                                                        </button>
                                                    ) : null}
                                                    {canScheduleViewing ? (
                                                        <button
                                                            onClick={() => openScheduleViewing(lead)}
                                                            disabled={isBusy}
                                                            aria-label={`Schedule viewing for ${getLeadTitle(lead)}`}
                                                            className={`rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                                        >
                                                            Schedule Viewing
                                                        </button>
                                                    ) : null}
                                                    {lifecycleActions}
                                                </>
                                            ) : (
                                                <>
                                                    {lead.user_id ? (
                                                        <button
                                                            onClick={() => {
                                                                void openLeadMessages(lead);
                                                            }}
                                                            aria-label={`Open messages for ${getLeadTitle(lead)}`}
                                                            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                            Open Messages
                                                        </button>
                                                    ) : null}
                                                    {canRequestDocuments ? (
                                                        <button
                                                            onClick={() => void handleRequestDocs(lead)}
                                                            disabled={isBusy}
                                                            aria-label={`Request documents for ${getLeadTitle(lead)}`}
                                                            className={`rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                                        >
                                                            {isBusy ? 'Sending request...' : 'Request Documents'}
                                                        </button>
                                                    ) : null}
                                                    {canScheduleViewing ? (
                                                        <button
                                                            onClick={() => openScheduleViewing(lead)}
                                                            disabled={isBusy}
                                                            aria-label={`Schedule viewing for ${getLeadTitle(lead)}`}
                                                            className={`rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 ${managerLeadFocusClass}`}
                                                        >
                                                            Schedule Viewing
                                                        </button>
                                                    ) : null}
                                                    {lifecycleActions}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {isAuditExpanded ? (
                                        <div
                                            id={`lead-audit-${lead.id}`}
                                            role="region"
                                            aria-label={`Audit trail for ${getLeadTitle(lead)}`}
                                            className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Lead audit trail</h3>
                                                {isAuditLoading ? (
                                                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Loading
                                                    </span>
                                                ) : null}
                                            </div>
                                            {auditError ? (
                                                <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{auditError}</p>
                                            ) : isAuditLoading ? null : auditEntries.length === 0 ? (
                                                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No audit activity has been recorded for this lead yet.</p>
                                            ) : (
                                                <ol className="mt-4 space-y-3">
                                                    {auditEntries.map((entry) => {
                                                        const details = parseAuditDetails(entry.details);
                                                        const previousStatus = auditDetailText(details.old_status || details.previous_status || details.from_status);
                                                        const nextStatus = auditDetailText(details.new_status || details.status || details.to_status);
                                                        const reason = auditDetailText(details.reason);
                                                        return (
                                                            <li key={entry.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-black">
                                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div>
                                                                        <p className="font-semibold capitalize text-gray-900 dark:text-white">{formatAuditAction(entry.action)}</p>
                                                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                            Actor {entry.actor || 'system'}{entry.actor_id ? ` (${entry.actor_id})` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <time className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatAuditTimestamp(entry)}</time>
                                                                </div>
                                                                {previousStatus || nextStatus || reason ? (
                                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                                        {previousStatus ? (
                                                                            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                                                                Previous: {previousStatus}
                                                                            </span>
                                                                        ) : null}
                                                                        {nextStatus ? (
                                                                            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                                                New: {nextStatus}
                                                                            </span>
                                                                        ) : null}
                                                                        {reason ? (
                                                                            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                                Reason: {reason}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                ) : null}
                                                            </li>
                                                        );
                                                    })}
                                                </ol>
                                            )}
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                )}
                {visibleLeads.length > 0 && paginatedLeads.totalPages > 1 ? (
                    <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            Page {paginatedLeads.currentPage} of {paginatedLeads.totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={paginatedLeads.currentPage === 1}
                                aria-label="Previous leads page"
                                className="rounded-full border border-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(paginatedLeads.totalPages, page + 1))}
                                disabled={paginatedLeads.currentPage === paginatedLeads.totalPages}
                                aria-label="Next leads page"
                                className="rounded-full border border-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                ) : null}
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
                                <DateField
                                    value={scheduleForm.requested_date}
                                    onChange={(nextValue) => setScheduleForm((previous) => ({ ...previous, requested_date: nextValue }))}
                                    className="w-full"
                                    buttonClassName="bg-gray-50 dark:bg-gray-900"
                                    ariaLabel="Lead schedule date"
                                />
                            </label>
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                                <TimeField
                                    value={scheduleForm.requested_time}
                                    onChange={(nextValue) => setScheduleForm((previous) => ({ ...previous, requested_time: nextValue }))}
                                    className="w-full"
                                    inputClassName="bg-gray-50 dark:bg-gray-900"
                                    ariaLabel="Lead schedule time"
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

            <AddLeadModal
                isOpen={isManualLeadModalOpen}
                onClose={handleCloseManualLeadModal}
                onSave={handleCreateManualLead}
            />
        </div>
    );
}
