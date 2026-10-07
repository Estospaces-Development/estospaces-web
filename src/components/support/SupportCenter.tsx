"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CircleHelp, LifeBuoy, RefreshCw, Ticket } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SupportPriorityBadge, SupportStatusBadge } from '@/components/support/SupportBadges';
import { SupportComposer } from '@/components/support/SupportComposer';
import { SupportFilters, type SupportFilterState } from '@/components/support/SupportFilters';
import { SupportTicketList } from '@/components/support/SupportTicketList';
import { SupportTranscript } from '@/components/support/SupportTranscript';
import {
    buildPrefilledSupportComposer,
    buildUserFastTrackCasePath,
    focusSupportTicketComposer,
    getAutoSelectedSupportTicketId,
    getLaunchSafeSupportCategoryLabel,
    getSupportCaseIdFromSearchParams,
    getSupportCaseShortReference,
    getSupportTicketCaseLink,
    hasActiveSupportFilters,
    hasPrefilledSupportComposerContext,
    normalizeSupportTicketCategory,
    shouldLoadSupportTicketDetail,
} from '@/lib/supportCenter';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import { supportService, type SupportAttachmentDraft } from '@/services/supportService';
import type { Message, SupportTicketDetail, SupportTicketSummary } from '@/services/messagesService';
import type { User } from '@/types';

type Role = 'user' | 'manager' | 'admin';

const ROLE_COPY: Record<Role, { title: string; subtitle: string; docsPath: string; categories: string[] }> = {
    user: {
        title: 'User Help & Support',
        subtitle: 'Open a support ticket, keep talking in the same thread, and track each update from the Estospaces Team without losing context.',
        docsPath: '/user/dashboard/docs',
        categories: ['General Inquiry', 'Buying Help', 'Renting Help', 'Fast Track', 'Contracts', 'Technical Issue'],
    },
    manager: {
        title: 'Manager Help & Support',
        subtitle: 'Raise issues about listings, verification, leads, applications, contracts, or fast-track and keep the full transcript attached to one operational support ticket.',
        docsPath: '/manager/docs',
        categories: ['Listings', 'Verification', 'Leads', 'Applications', 'Contracts', 'Fast Track', 'Technical Issue'],
    },
    admin: {
        title: 'Admin Help & Support',
        subtitle: 'Run release, operations, and platform support from one place with ticket selection, assignment, priorities, transcript review, and clean status transitions.',
        docsPath: '/admin/help',
        categories: ['Support'],
    },
};

const ADMIN_QUEUE_TABS = [
    { label: 'All tickets', status: '', assignee: '' },
    { label: 'Unassigned tickets', status: '', assignee: 'unassigned' },
    { label: 'Assigned to me', status: '', assignee: 'me' },
    { label: 'Resolved tickets', status: 'resolved', assignee: '' },
    { label: 'Closed tickets', status: 'closed', assignee: '' },
];

const SUPPORT_ASSIGNABLE_STATUSES = new Set<SupportTicketSummary['status']>(['open', 'in_progress']);
const isSupportTicketAssignable = (ticket: SupportTicketSummary) => (
    !ticket.assignee_id && SUPPORT_ASSIGNABLE_STATUSES.has(ticket.status)
);

const supportSearchText = (ticket: SupportTicketSummary) => [
    ticket.subject,
    getLaunchSafeSupportCategoryLabel(ticket.category),
    ticket.status,
    ticket.priority,
    ticket.requester_role,
    ticket.requester_context?.name,
    ticket.requester_context?.email,
    getLaunchSafeSupportCategoryLabel(ticket.requester_context?.module, ''),
    ticket.last_message?.content,
].filter(Boolean).join(' ').toLowerCase();

const ticketMatchesFilters = (
    ticket: SupportTicketSummary,
    filters: SupportFilterState,
    currentUserId?: string,
) => {
    if (filters.status && ticket.status !== filters.status) {
        return false;
    }
    if (filters.priority && ticket.priority !== filters.priority) {
        return false;
    }
    if (filters.requesterRole && ticket.requester_role !== filters.requesterRole) {
        return false;
    }
    if (filters.assignee === 'unassigned' && ticket.assignee_id) {
        return false;
    }
    if (filters.assignee === 'me' && ticket.assignee_id !== currentUserId) {
        return false;
    }
    if (filters.assignee && !['unassigned', 'me'].includes(filters.assignee) && ticket.assignee_id !== filters.assignee) {
        return false;
    }

    const query = filters.search.trim().toLowerCase();
    return !query || supportSearchText(ticket).includes(query);
};

interface SupportCenterProps {
    role: Role;
}

export function SupportCenter({ role }: SupportCenterProps) {
    const { user } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const routePathRef = useRef(location.pathname);
    routePathRef.current = location.pathname;
    // Background refreshes must not rewrite the URL once the user has clicked
    // away: while the next page is still loading, the browser is already on the
    // new path but this page is still mounted, and a search-param write would
    // send them back to Help & Support (issues 351 and 359).
    const setBackgroundSearchParams = useCallback((...args: Parameters<typeof setSearchParams>) => {
        if (typeof window !== 'undefined' && window.location.pathname !== routePathRef.current) return;
        setSearchParams(...args);
    }, [setSearchParams]);
    const [allTickets, setAllTickets] = useState<SupportTicketSummary[]>([]);
    const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [ticketAttachments, setTicketAttachments] = useState<SupportAttachmentDraft[]>([]);
    const [ticketDraftId, setTicketDraftId] = useState('');
    const [replyAttachments, setReplyAttachments] = useState<SupportAttachmentDraft[]>([]);
    const [replyDraftId, setReplyDraftId] = useState('');
    const [reply, setReply] = useState('');
    // A reply refused because the ticket closed meanwhile is kept visible so it is not lost (MB-0959).
    const [unsentReply, setUnsentReply] = useState('');
    // A failed ticket load must not read as "No support tickets yet" (MB-1017).
    const [ticketsLoadFailed, setTicketsLoadFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [resumingTicketId, setResumingTicketId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [composerFocusRequest, setComposerFocusRequest] = useState(0);
    const [adminUsers, setAdminUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<SupportFilterState>({ search: '', status: '', priority: '', requesterRole: '', assignee: '' });
    const [composer, setComposer] = useState(() => buildPrefilledSupportComposer({
        searchParams,
        availableCategories: ROLE_COPY[role].categories,
        fallbackCategory: ROLE_COPY[role].categories[0],
        priority: 'medium',
    }));
    const prefilledCategory = searchParams.get('category') || '';
    const prefilledSubject = searchParams.get('subject') || '';
    const prefilledMessage = searchParams.get('message') || '';
    const prefilledPriority = searchParams.get('priority') || '';

    const isAdmin = role === 'admin';
    // Only the requesting user carries a case in; staff never attach one on the requester's behalf.
    const supportCaseId = role === 'user' ? getSupportCaseIdFromSearchParams(searchParams) : null;
    const selectedTicketId = searchParams.get('ticket');
    const selectedConversationId = searchParams.get('conversation');
    const hasPrefilledComposerContext = !isAdmin && hasPrefilledSupportComposerContext(searchParams);
    const hasActiveFilters = hasActiveSupportFilters(filters);
    const selectedTicketCaseLink = selectedTicket ? getSupportTicketCaseLink(selectedTicket.requester_context?.page, role) : null;
    const canReply = Boolean(selectedTicket && selectedTicket.status !== 'closed' && (isAdmin || selectedTicket.status !== 'resolved'));
    const currentAdminId = user?.id || '';
    const unassignedTicketCount = useMemo(() => allTickets.filter((ticket) => !ticket.assignee_id).length, [allTickets]);
    const claimableUnassignedTicket = useMemo(() => allTickets.find(isSupportTicketAssignable) || null, [allTickets]);
    const canClaimSelectedTicket = Boolean(isAdmin && selectedTicket && currentAdminId && isSupportTicketAssignable(selectedTicket));
    const resumableTicket = useMemo(() => tickets.find((ticket) => ticket.status === 'open' || ticket.status === 'in_progress') || null, [tickets]);
    const clearSupportFilters = useCallback(() => {
        setFilters({ search: '', status: '', priority: '', requesterRole: '', assignee: '' });
    }, []);
    const resumeLiveSupport = useCallback(() => {
        if (!resumableTicket) return;

        setResumingTicketId(resumableTicket.id);
        const next = new URLSearchParams({ ticket: resumableTicket.id });
        if (resumableTicket.conversation_id) {
            next.set('conversation', resumableTicket.conversation_id);
        }
        setSearchParams(next, { replace: true });
    }, [resumableTicket, setSearchParams]);
    // Guard against duplicate / concurrent fetches that fire when filters change
    // (every `fetchTickets` identity change re-triggers the load useEffect). This
    // also prevents multiple "Request timed out" toasts when the API is slow.
    const fetchingRef = useRef<symbol | null>(null);
    const loadingTicketDetailsRef = useRef(new Set<string>());
    const detailRequestVersionRef = useRef(0);
    const supportCenterMountedRef = useRef(false);
    const composerHeadingRef = useRef<HTMLHeadingElement>(null);
    const ticketTranscriptRef = useRef<HTMLDivElement>(null);

    const handleStartNewTicket = useCallback(() => {
        setSearchParams(new URLSearchParams(), { replace: true });
        setComposerFocusRequest((current) => current + 1);
    }, [setSearchParams]);

    useEffect(() => {
        supportCenterMountedRef.current = true;

        return () => {
            supportCenterMountedRef.current = false;
            detailRequestVersionRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (isAdmin || selectedTicket || composerFocusRequest === 0) return;

        const frame = window.requestAnimationFrame(() => {
            focusSupportTicketComposer(composerHeadingRef.current);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [composerFocusRequest, isAdmin, selectedTicket]);
    const adminQueueTabs = useMemo(() => ADMIN_QUEUE_TABS.map((tab) => {
        const tabFilters: SupportFilterState = {
            search: filters.search,
            priority: filters.priority,
            requesterRole: filters.requesterRole,
            status: tab.status,
            assignee: tab.assignee,
        };

        return {
            ...tab,
            count: allTickets.filter((ticket) => ticketMatchesFilters(ticket, tabFilters, user?.id)).length,
        };
    }), [allTickets, filters.priority, filters.requesterRole, filters.search, user?.id]);

    useEffect(() => {
        const visibleTickets = allTickets.filter((ticket) => ticketMatchesFilters(ticket, filters, user?.id));
        setTickets(visibleTickets);

        const activeSelectedTicketId = selectedTicketId || selectedTicket?.id || '';
        if (isAdmin && hasActiveFilters && activeSelectedTicketId && !visibleTickets.some((ticket) => ticket.id === activeSelectedTicketId)) {
            setSelectedTicket(null);
            setMessages([]);
            setBackgroundSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.delete('ticket');
                next.delete('conversation');
                return next;
            }, { replace: true });
        }
    }, [allTickets, filters, hasActiveFilters, isAdmin, selectedTicket?.id, selectedTicketId, setBackgroundSearchParams, user?.id]);

    const fetchTickets = useCallback(async (silent = false) => {
        // Background polls yield to an in-flight request; a manual refresh
        // supersedes it (the older response is discarded below). web-app#458
        if (fetchingRef.current && silent) return;
        const request = Symbol('ticket-list-request');
        fetchingRef.current = request;
        if (!silent) setLoading(true);
        try {
            const data = isAdmin
                ? await supportService.getAllTickets({ limit: 100 })
                : await supportService.getTickets({ limit: 100 });
            if (!supportCenterMountedRef.current || fetchingRef.current !== request) return;

            setAllTickets(data);
            setTicketsLoadFailed(false);
            const visibleTickets = data.filter((ticket) => ticketMatchesFilters(ticket, filters, user?.id));
            setTickets(visibleTickets);
            const targetTicketId = getAutoSelectedSupportTicketId({
                selectedTicketId: selectedTicketId || '',
                selectedConversationId: selectedConversationId || '',
                tickets: visibleTickets,
                isAdmin,
                hasPrefilledComposerContext,
                hasLocationHash: typeof window !== 'undefined' && Boolean(window.location.hash),
            });
            const targetTicket = targetTicketId ? visibleTickets.find((ticket) => ticket.id === targetTicketId) : undefined;
            const targetConversationId = targetTicket?.conversation_id || selectedConversationId || '';
            const alreadySelected = targetTicketId === selectedTicketId
                && targetConversationId === (selectedConversationId || '');
            if (targetTicket && !alreadySelected) {
                setBackgroundSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('ticket', targetTicket.id);
                    if (targetTicket.conversation_id) {
                        next.set('conversation', targetTicket.conversation_id);
                    }
                    return next;
                }, { replace: true });
            } else if (!targetTicket && selectedTicketId && hasActiveFilters && !visibleTickets.some((ticket) => ticket.id === selectedTicketId)) {
                setSelectedTicket(null);
                setMessages([]);
                setBackgroundSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.delete('ticket');
                    next.delete('conversation');
                    return next;
                }, { replace: true });
            }
        } catch (error: any) {
            if (!silent && supportCenterMountedRef.current && fetchingRef.current === request) {
                toast.error(error.message || 'Failed to load support tickets');
            }
            if (supportCenterMountedRef.current && fetchingRef.current === request) {
                setTicketsLoadFailed(true);
            }
        } finally {
            if (fetchingRef.current === request) {
                fetchingRef.current = null;
                if (!silent && supportCenterMountedRef.current) setLoading(false);
            }
        }
    }, [filters, hasActiveFilters, hasPrefilledComposerContext, isAdmin, selectedConversationId, selectedTicketId, setBackgroundSearchParams, toast, user?.id]);

    // Navigation and filter changes retire the old list request before it can
    // restore its captured ticket selection or overwrite the new queue.
    useLayoutEffect(() => () => {
        fetchingRef.current = null;
    }, [fetchTickets]);

    const loadDetail = useCallback(async (ticketId: string, silent = false) => {
        if (loadingTicketDetailsRef.current.has(ticketId)) {
            setResumingTicketId((current) => current === ticketId ? null : current);
            return;
        }

        loadingTicketDetailsRef.current.add(ticketId);
        const requestVersion = ++detailRequestVersionRef.current;
        if (!silent) setDetailLoading(true);
        try {
            const detail = await supportService.getTicket(ticketId);
            if (!supportCenterMountedRef.current || requestVersion !== detailRequestVersionRef.current) return;

            const transcript = await supportService.getTranscript(detail.conversation_id);
            if (supportCenterMountedRef.current && requestVersion === detailRequestVersionRef.current) {
                setSelectedTicket(detail);
                setMessages(transcript);
            }
        } catch (error: any) {
            if (!silent && supportCenterMountedRef.current) {
                setSelectedTicket(null);
                setMessages([]);
                setResumingTicketId((current) => current === ticketId ? null : current);
                toast.error(error.message || 'Failed to load support thread');
            }
        } finally {
            loadingTicketDetailsRef.current.delete(ticketId);
            if (!silent && supportCenterMountedRef.current) {
                setDetailLoading(false);
                setResumingTicketId((current) => current === ticketId ? null : current);
            }
        }
    }, [toast]);

    useEffect(() => {
        void fetchTickets();
        if (isAdmin) {
            void supportService.getSupportAgents().then((agents) => {
                if (supportCenterMountedRef.current) {
                    setAdminUsers(agents);
                }
            }).catch(() => undefined);
        }
    }, [fetchTickets, isAdmin]);

    useEffect(() => {
        const selectedTicketHiddenByActiveFilters = Boolean(
            isAdmin
            && hasActiveFilters
            && selectedTicketId
            && !loading
            && !tickets.some((ticket) => ticket.id === selectedTicketId),
        );

        if (shouldLoadSupportTicketDetail({
            selectedTicketId: selectedTicketId || '',
            selectedConversationId: selectedConversationId || '',
            isAdmin,
            queueLoading: loading,
            tickets,
            hasActiveFilters,
        })) {
            void loadDetail(selectedTicketId || '');
        } else if (!selectedTicketId || selectedTicketHiddenByActiveFilters) {
            setSelectedTicket(null);
            setMessages([]);
        }
    }, [hasActiveFilters, isAdmin, loadDetail, loading, selectedConversationId, selectedTicketId, tickets]);

    useEffect(() => {
        setReply('');
        setReplyAttachments([]);
        setReplyDraftId('');
        setUnsentReply('');
    }, [selectedTicketId]);

    useEffect(() => {
        if (!selectedTicketId || selectedTicket?.id !== selectedTicketId) {
            return;
        }

        // Defer a tick: opening a ticket changes ?ticket=, and the app-wide route scroll reset
        // (a parent effect, so it runs after this one) would otherwise jump back to the top (#628).
        // A timer, unlike requestAnimationFrame, still runs while the tab is in the background.
        const timer = window.setTimeout(() => {
            ticketTranscriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [selectedTicket?.id, selectedTicketId]);

    useEffect(() => {
        if (resumingTicketId && selectedTicket?.id === resumingTicketId && !detailLoading) {
            setResumingTicketId(null);
        }
    }, [detailLoading, resumingTicketId, selectedTicket?.id]);

    useEffect(() => {
        if (isAdmin || !hasPrefilledComposerContext) {
            return;
        }

        const nextComposer = buildPrefilledSupportComposer({
            searchParams: new URLSearchParams({
                ...(prefilledCategory ? { category: prefilledCategory } : {}),
                ...(prefilledSubject ? { subject: prefilledSubject } : {}),
                ...(prefilledMessage ? { message: prefilledMessage } : {}),
                ...(prefilledPriority ? { priority: prefilledPriority } : {}),
            }),
            availableCategories: ROLE_COPY[role].categories,
            fallbackCategory: ROLE_COPY[role].categories[0],
            priority: composer.priority,
        });

        setComposer((current) => {
            if (
                current.category === nextComposer.category
                && current.subject === nextComposer.subject
                && current.message === nextComposer.message
                && current.priority === nextComposer.priority
            ) {
                return current;
            }

            return {
                ...current,
                category: nextComposer.category,
                subject: nextComposer.subject,
                message: nextComposer.message,
                priority: nextComposer.priority,
            };
        });
    }, [composer.priority, hasPrefilledComposerContext, isAdmin, prefilledCategory, prefilledMessage, prefilledPriority, prefilledSubject, role]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            void fetchTickets(true);
            if (selectedTicketId) {
                void loadDetail(selectedTicketId, true);
            }
        }, 5000);
        return () => window.clearInterval(interval);
    }, [fetchTickets, loadDetail, selectedTicketId]);

    const handleFiles = async (mode: 'ticket' | 'reply', files: FileList | null) => {
        if (!files?.length) return;
        try {
            const currentDraftId = mode === 'ticket' ? ticketDraftId : replyDraftId;
            const uploaded = await supportService.uploadAttachments(Array.from(files), currentDraftId || undefined);
            if (mode === 'ticket') {
                setTicketDraftId(uploaded.draftId);
                setTicketAttachments((current) => [...current, ...uploaded.attachments]);
            } else {
                setReplyDraftId(uploaded.draftId);
                setReplyAttachments((current) => [...current, ...uploaded.attachments]);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload attachment');
        }
    };

    const resetTicketDraft = () => {
        setTicketAttachments([]);
        setTicketDraftId('');
    };

    const resetReplyDraft = () => {
        setReplyAttachments([]);
        setReplyDraftId('');
        setReply('');
    };

    const handleOpenAttachment = useCallback(async (attachmentId: string) => {
        try {
            await supportService.openAttachment(attachmentId);
        } catch (error: any) {
            toast.error(error.message || 'Unable to open the attachment right now.');
        }
    }, [toast]);

    const handleRemoveAttachment = useCallback(async (mode: 'ticket' | 'reply', localId: string) => {
        const attachments = mode === 'ticket' ? ticketAttachments : replyAttachments;
        const attachment = attachments.find((item) => item.local_id === localId);

        if (!attachment) {
            return;
        }

        try {
            await supportService.removeDraftAttachment(attachment.local_id);
            if (mode === 'ticket') {
                setTicketAttachments((current) => current.filter((item) => item.local_id !== localId));
            } else {
                setReplyAttachments((current) => current.filter((item) => item.local_id !== localId));
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove attachment');
        }
    }, [replyAttachments, ticketAttachments, toast]);

    const handleCreateTicket = async () => {
        if (!composer.subject.trim() || (!composer.message.trim() && ticketAttachments.length === 0)) {
            toast.error('Please add a subject and either a message or an attachment');
            return;
        }
        try {
            setSubmitting(true);
            const created = await supportService.createTicket({
                subject: composer.subject.trim(),
                message: composer.message.trim(),
                category: normalizeSupportTicketCategory(composer.category, ROLE_COPY[role].categories[0]),
                priority: composer.priority,
                attachments: ticketAttachments,
                requester_context: {
                    role,
                    name: user?.name || user?.user_metadata?.full_name || '',
                    email: user?.email || '',
                    page: supportCaseId ? buildUserFastTrackCasePath(supportCaseId) : window.location.pathname,
                    module: composer.category,
                },
            });
            resetTicketDraft();
            setComposer((current) => ({ ...current, subject: '', message: '' }));
            await fetchTickets(true);
            setSearchParams(new URLSearchParams({ ticket: created.id, conversation: created.conversation_id }), { replace: true });
            toast.success('Support ticket created');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket) return;
        if (!reply.trim() && replyAttachments.length === 0) {
            toast.error('Add a reply or at least one attachment');
            return;
        }
        try {
            setSubmitting(true);
            await supportService.sendReply(selectedTicket.conversation_id, reply.trim(), replyAttachments);
            resetReplyDraft();
            await loadDetail(selectedTicket.id);
            await fetchTickets(true);
            toast.success('Reply sent');
        } catch (error: any) {
            if (error?.status === 409) {
                setUnsentReply(reply.trim());
            }
            toast.error(error.message || 'Failed to send reply');
        } finally {
            setSubmitting(false);
        }
    };

    const patchTicket = async (patch: { status?: SupportTicketSummary['status']; priority?: SupportTicketSummary['priority']; assignee_id?: string }) => {
        if (!selectedTicket) return;
        try {
            const updated = await supportService.updateTicket(selectedTicket.id, patch);
            setSelectedTicket(updated);
            await fetchTickets(true);
            toast.success('Ticket updated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update ticket');
        }
    };

    const claimSupportTicket = async (ticket: SupportTicketSummary) => {
        if (!currentAdminId) {
            toast.error('Sign in as an admin to claim support tickets');
            return;
        }

        try {
            const updated = await supportService.updateTicket(ticket.id, {
                assignee_id: currentAdminId,
                status: ticket.status === 'open' ? 'in_progress' : ticket.status,
            });
            await fetchTickets(true);
            setSelectedTicket(updated);
            setSearchParams(new URLSearchParams({ ticket: updated.id, conversation: updated.conversation_id }), { replace: true });
            toast.success('Ticket assigned to you');
        } catch (error: any) {
            toast.error(error.message || 'Failed to claim support ticket');
        }
    };
    const adminFilterUserKeyFor = createDuplicateSafeKeyResolver('support-filter-admin-user');
    const adminAssigneeUserKeyFor = createDuplicateSafeKeyResolver('support-assignee-admin-user');

    return (
        <div className="min-w-0 max-w-full space-y-6">
            <section className="min-w-0 rounded-[2.25rem] border border-orange-100 bg-white/95 p-5 shadow-[0_24px_70px_-40px_rgba(255,115,0,0.35)] dark:border-orange-500/15 dark:bg-gray-900/85 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-4xl">
                        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">{ROLE_COPY[role].title}</span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 dark:text-white">{ROLE_COPY[role].title}</h1>
                        <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{ROLE_COPY[role].subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {!isAdmin && <Link to={ROLE_COPY[role].docsPath} className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-5 py-3 text-sm font-bold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-500/10 dark:focus-visible:ring-offset-gray-900"><BookOpen className="h-4 w-4" /> Docs</Link>}
                        {!isAdmin && <Link to={`${ROLE_COPY[role].docsPath}#faq`} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900"><CircleHelp className="h-4 w-4" /> FAQ</Link>}
                        {!isAdmin && resumableTicket && (
                            <button type="button" onClick={resumeLiveSupport} disabled={Boolean(resumingTicketId)} aria-busy={resumingTicketId === resumableTicket.id || undefined} className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-gray-900">
                                {resumingTicketId === resumableTicket.id && <ActionSpinner size="xs" label="Opening support" />}
                                {resumingTicketId === resumableTicket.id ? 'Opening support…' : 'Resume live support'}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <SupportFilters filters={filters} onChange={setFilters} mode={isAdmin ? 'admin' : 'requester'} />

            {isAdmin && (
                <div className="flex flex-wrap gap-3" aria-label="Support queue quick filters">
                    {adminQueueTabs.map((tab) => {
                        const active = filters.status === tab.status && (filters.assignee || '') === tab.assignee;
                        const countLabel = tab.count === 1 ? 'ticket' : 'tickets';
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => setFilters((current) => ({ ...current, status: tab.status, assignee: tab.assignee }))}
                                aria-pressed={active}
                                aria-label={`${tab.label}: ${tab.count} ${countLabel}`}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                                    active
                                        ? 'bg-orange-700 text-white shadow-lg shadow-orange-500/20'
                                        : 'border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-orange-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-500/20 dark:hover:text-orange-200'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${
                                    active
                                        ? 'bg-white text-orange-900'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}>{tab.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {isAdmin && unassignedTicketCount > 0 && (
                <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10 lg:flex-row lg:items-center lg:justify-between" role="status" aria-live="polite">
                    <div>
                        <p className="text-sm font-black text-amber-900 dark:text-amber-100">{unassignedTicketCount} support tickets need an owner</p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80">Claim a ticket to start triage, assign responsibility, and move open requests into active support.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedTicket && !selectedTicket.assignee_id && (
                            <button type="button" onClick={() => void claimSupportTicket(selectedTicket)} disabled={!canClaimSelectedTicket} className="rounded-full bg-amber-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">Claim selected ticket</button>
                        )}
                        <button type="button" onClick={() => claimableUnassignedTicket && void claimSupportTicket(claimableUnassignedTicket)} disabled={!currentAdminId || !claimableUnassignedTicket} className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-gray-950 dark:text-amber-100 dark:hover:bg-amber-500/10">Claim next unassigned</button>
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="grid gap-3 rounded-[2rem] border border-orange-100 bg-white/90 p-4 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/80 md:grid-cols-2">
                    <select value={filters.requesterRole || ''} onChange={(event) => setFilters((current) => ({ ...current, requesterRole: event.target.value }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white" aria-label="Filter tickets by requester role">
                        <option value="">All requester roles</option>
                        <option value="user">Users</option>
                        <option value="manager">Managers</option>
                    </select>
                    <select value={filters.assignee || ''} onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white" aria-label="Filter tickets by assignee">
                        <option value="">All assignees</option>
                        <option value="unassigned">Unassigned</option>
                        <option value="me">Assigned to me</option>
                        {adminUsers.map((adminUser, adminUserIndex) => <option key={adminFilterUserKeyFor(adminUser.id || adminUser.email, adminUserIndex)} value={adminUser.id}>{adminUser.full_name || adminUser.email}</option>)}
                    </select>
                </div>
            )}

            <div className="grid min-w-0 gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
                <div className="min-w-0 space-y-4">
                    <div className="flex min-w-0 flex-col gap-3 rounded-[2rem] border border-orange-100 bg-white/90 px-5 py-4 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/80 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">{isAdmin ? 'Support queue' : 'My tickets'}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{ticketsLoadFailed && tickets.length === 0 ? 'Could not load tickets' : `${tickets.length} visible right now`}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {!isAdmin && <button type="button" onClick={handleStartNewTicket} className="rounded-full border border-orange-200 px-3 py-2 text-xs font-bold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-500/10 dark:focus-visible:ring-offset-gray-900">New ticket</button>}
                            <button type="button" onClick={() => void fetchTickets()} disabled={loading} aria-busy={loading || undefined} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200 text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-500/10 dark:focus-visible:ring-offset-gray-900" aria-label="Refresh support tickets">{loading ? <ActionSpinner size="sm" label="Refreshing support tickets" /> : <RefreshCw className="h-4 w-4" />}</button>
                        </div>
                    </div>
                    {loading && tickets.length === 0 ? <BrandLoadingScreen variant="section" label="Loading support tickets..." /> : <SupportTicketList tickets={tickets} selectedTicketId={selectedTicketId} onSelect={(ticketId) => {
                        const ticket = tickets.find((item) => item.id === ticketId);
                        const next = new URLSearchParams({ ticket: ticketId });
                        if (ticket?.conversation_id) {
                            next.set('conversation', ticket.conversation_id);
                        }
                        setSearchParams(next, { replace: true });
                    }} emptyLabel={ticketsLoadFailed ? 'Support tickets could not load' : hasActiveFilters ? 'No tickets match these filters' : (isAdmin ? 'No tickets in this queue' : 'No support tickets yet')} emptyDescription={ticketsLoadFailed ? 'Check your connection and try again.' : hasActiveFilters ? 'The active search, status, priority, requester, or assignee filters removed every ticket from this view.' : undefined} emptyActionLabel={ticketsLoadFailed ? 'Retry' : hasActiveFilters ? 'Clear filters' : undefined} onEmptyAction={ticketsLoadFailed ? () => void fetchTickets() : hasActiveFilters ? clearSupportFilters : undefined} />}

                    {loading && tickets.length > 0 && (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 text-sm text-gray-600 dark:border-orange-500/15 dark:bg-gray-900/60 dark:text-gray-300" aria-live="polite">
                            <ActionSpinner size={16} className="text-orange-500" aria-hidden />
                            <span>Refreshing tickets…</span>
                        </div>
                    )}
                </div>

                <div ref={ticketTranscriptRef} className="min-w-0 space-y-5">
                    {!isAdmin && !selectedTicket && (
                        <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                            <div className="mb-4 flex items-center gap-3"><Ticket className="h-6 w-6 text-orange-500" /><h2 ref={composerHeadingRef} tabIndex={-1} className="text-2xl font-black text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:text-white dark:focus-visible:ring-offset-gray-900">Open a support ticket</h2></div>
                            {supportCaseId ? (
                                <p data-testid="support-case-context" className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-500/20 dark:bg-orange-950/20 dark:text-orange-100">
                                    This ticket will be linked to Fast Track case {getSupportCaseShortReference(supportCaseId)}.{' '}
                                    <Link to={buildUserFastTrackCasePath(supportCaseId)} className="font-semibold underline underline-offset-2">Back to case</Link>
                                </p>
                            ) : null}
                            <div className="grid gap-4 md:grid-cols-2">
                                <select value={composer.category} onChange={(event) => setComposer((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" aria-label="Support ticket category">{ROLE_COPY[role].categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                                <select value={composer.priority} onChange={(event) => setComposer((current) => ({ ...current, priority: event.target.value as SupportTicketSummary['priority'] }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" aria-label="Support ticket priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                            </div>
                            <input value={composer.subject} onChange={(event) => setComposer((current) => ({ ...current, subject: event.target.value }))} placeholder="Short subject" aria-label="Support ticket subject" required minLength={3} maxLength={120} className="mt-4 w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" />
                            <div className="mt-4"><SupportComposer value={composer.message} onChange={(value) => setComposer((current) => ({ ...current, message: value }))} onSubmit={() => void handleCreateTicket()} onFilesSelected={(files) => void handleFiles('ticket', files)} onRemoveAttachment={(localId) => void handleRemoveAttachment('ticket', localId)} attachments={ticketAttachments} disabled={submitting} canSubmit={Boolean(composer.subject.trim() && (composer.message.trim() || ticketAttachments.length > 0))} placeholder="Describe the blocker, the screen you were on, what you expected, and what needs to happen next." submitLabel={submitting ? 'Submitting' : 'Create ticket'} /></div>
                            {!composer.subject.trim() ? (
                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300" aria-live="polite">Add a short subject (at least 3 characters) to create the ticket.</p>
                            ) : !composer.message.trim() && ticketAttachments.length === 0 ? (
                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300" aria-live="polite">Add a message or attach a file to create the ticket.</p>
                            ) : null}
                        </div>
                    )}

                    {selectedTicket && (
                        <>
                            <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">{getLaunchSafeSupportCategoryLabel(selectedTicket.category)}</p>
                                        <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{selectedTicket.subject}</h2>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedTicket.requester_context?.name || selectedTicket.requester_context?.email || 'Support request'}
                                            {selectedTicket.requester_context?.module ? ` - ${getLaunchSafeSupportCategoryLabel(selectedTicket.requester_context.module)}` : ''}
                                        </p>
                                        {selectedTicketCaseLink ? (
                                            <Link data-testid="support-ticket-case-link" to={selectedTicketCaseLink.path} className="mt-2 inline-flex text-sm font-semibold text-orange-700 underline underline-offset-2 dark:text-orange-200">
                                                Open Fast Track case {getSupportCaseShortReference(selectedTicketCaseLink.caseId)}
                                            </Link>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2"><SupportStatusBadge status={selectedTicket.status} /><SupportPriorityBadge priority={selectedTicket.priority} /></div>
                                </div>
                                {isAdmin && <div className="mt-5 grid gap-4 md:grid-cols-3"><select value={selectedTicket.status} onChange={(event) => void patchTicket({ status: event.target.value as SupportTicketSummary['status'] })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><select value={selectedTicket.priority} onChange={(event) => void patchTicket({ priority: event.target.value as SupportTicketSummary['priority'] })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><select value={selectedTicket.assignee_id || ''} onChange={(event) => void patchTicket({ assignee_id: event.target.value })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket assignee"><option value="">Unassigned</option>{adminUsers.map((adminUser, adminUserIndex) => <option key={adminAssigneeUserKeyFor(adminUser.id || adminUser.email, adminUserIndex)} value={adminUser.id}>{adminUser.full_name || adminUser.email}</option>)}</select></div>}
                                {!isAdmin && <div className="mt-5 flex flex-wrap gap-3">{selectedTicket.status === 'resolved' && <button onClick={() => void patchTicket({ status: 'open' })} className="rounded-full border border-orange-200 px-4 py-2 text-sm font-bold text-orange-700 dark:border-orange-500/20 dark:text-orange-200">Reopen</button>}{(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && <button onClick={() => void patchTicket({ status: 'closed' })} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">Close ticket</button>}</div>}
                            </div>
                            <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                                <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">Transcript</p><h3 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Live support conversation</h3></div>{detailLoading && <ActionSpinner size={20} className="text-orange-500" label="Loading transcript" />}</div>
                                <SupportTranscript
                                    messages={messages}
                                    currentUserId={user?.id}
                                    requesterUserId={selectedTicket.user_id}
                                    requesterLabel={isAdmin ? (selectedTicket.requester_context?.name || selectedTicket.requester_context?.email || 'Requester') : 'Requester'}
                                    supportLabel={isAdmin ? 'Admin' : 'Estospaces Support'}
                                    staffUserIds={isAdmin ? adminUsers.map((adminUser) => adminUser.id) : undefined}
                                    perspective={isAdmin ? 'staff' : 'requester'}
                                    onOpenAttachment={(attachmentId) => void handleOpenAttachment(attachmentId)}
                                />
                                {unsentReply && (
                                    <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                                        <p className="font-semibold">This ticket was closed, so your reply was not sent. Copy it into a new ticket if you still need help:</p>
                                        <textarea readOnly value={unsentReply} aria-label="Your unsent reply" className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm text-gray-900 dark:border-amber-900/40 dark:bg-gray-900 dark:text-white" rows={3} />
                                    </div>
                                )}
                                {canReply && <div className="mt-6"><SupportComposer value={reply} onChange={setReply} onSubmit={() => void handleReply()} onFilesSelected={(files) => void handleFiles('reply', files)} onRemoveAttachment={(localId) => void handleRemoveAttachment('reply', localId)} attachments={replyAttachments} disabled={submitting} canSubmit={Boolean(reply.trim() || replyAttachments.length > 0)} placeholder={isAdmin ? 'Reply as the Estospaces Team' : 'Reply to support'} submitLabel={submitting ? 'Sending' : 'Send reply'} /></div>}
                            </div>
                        </>
                    )}

                    {isAdmin && !selectedTicket && <div className="flex min-h-[500px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white/80 px-8 text-center dark:border-orange-500/20 dark:bg-gray-900/70"><LifeBuoy className="mb-4 h-12 w-12 text-orange-400" /><p className="text-2xl font-black text-gray-950 dark:text-white">Select a ticket to manage</p><p className="mt-3 max-w-lg text-sm leading-7 text-gray-500 dark:text-gray-400">Assignment, status updates, requester context, attachments, and replies will appear here once a queue item is selected.</p></div>}
                </div>
            </div>
        </div>
    );
}
