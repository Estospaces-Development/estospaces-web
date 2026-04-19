"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CircleHelp, LifeBuoy, Loader2, RefreshCw, Ticket } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SupportPriorityBadge, SupportStatusBadge } from '@/components/support/SupportBadges';
import { SupportComposer } from '@/components/support/SupportComposer';
import { SupportFilters, type SupportFilterState } from '@/components/support/SupportFilters';
import { SupportTicketList } from '@/components/support/SupportTicketList';
import { SupportTranscript } from '@/components/support/SupportTranscript';
import {
    buildPrefilledSupportComposer,
    finalizeCreatedSupportTicket,
    getAutoSelectedSupportTicketId,
    hasPrefilledSupportComposerContext,
    normalizeSupportTicketCategory,
} from '@/lib/supportCenter';
import { supportService, type SupportAttachmentDraft } from '@/services/supportService';
import type { Message, SupportTicketDetail, SupportTicketSummary } from '@/services/messagesService';
import type { User } from '@/types';

type Role = 'user' | 'manager' | 'admin';

const ROLE_COPY: Record<Role, { title: string; subtitle: string; docsPath: string; categories: string[] }> = {
    user: {
        title: 'User Help & Support',
        subtitle: 'Open a support ticket, keep talking in the same thread, and track each update from the Estospaces Team without losing context.',
        docsPath: '/user/dashboard/docs',
        categories: ['General Inquiry', 'Buying Help', 'Renting Help', 'Fast Track', 'Contracts', 'Payments', 'Technical Issue'],
    },
    manager: {
        title: 'Manager Help & Support',
        subtitle: 'Raise issues about listings, verification, leads, billing, or fast-track and keep the full transcript attached to one operational support ticket.',
        docsPath: '/manager/docs',
        categories: ['Listings', 'Verification', 'Leads', 'Applications', 'Contracts', 'Billing', 'Fast Track', 'Technical Issue'],
    },
    admin: {
        title: 'Admin Help & Support',
        subtitle: 'Run the full support queue from one place with ticket selection, assignment, priorities, transcript review, and clean status transitions.',
        docsPath: '/admin/help',
        categories: ['Support'],
    },
};

const ADMIN_QUEUE_TABS = [
    { label: 'All', status: '', assignee: '' },
    { label: 'Unassigned', status: '', assignee: 'unassigned' },
    { label: 'Assigned to me', status: '', assignee: 'me' },
    { label: 'Resolved', status: 'resolved', assignee: '' },
    { label: 'Closed', status: 'closed', assignee: '' },
];

interface SupportCenterProps {
    role: Role;
}

export function SupportCenter({ role }: SupportCenterProps) {
    const { user } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [ticketAttachments, setTicketAttachments] = useState<SupportAttachmentDraft[]>([]);
    const [ticketDraftId, setTicketDraftId] = useState('');
    const [replyAttachments, setReplyAttachments] = useState<SupportAttachmentDraft[]>([]);
    const [replyDraftId, setReplyDraftId] = useState('');
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
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

    const isAdmin = role === 'admin';
    const selectedTicketId = searchParams.get('ticket');
    const hasPrefilledComposerContext = !isAdmin && hasPrefilledSupportComposerContext(searchParams);
    const canReply = Boolean(selectedTicket && selectedTicket.status !== 'closed' && (isAdmin || selectedTicket.status !== 'resolved'));
    const resumableTicket = useMemo(() => tickets.find((ticket) => ticket.status === 'open' || ticket.status === 'in_progress') || null, [tickets]);

    const fetchTickets = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const requestParams = {
                search: filters.search,
                status: filters.status,
                priority: filters.priority,
                requester_role: isAdmin ? filters.requesterRole : undefined,
                assignee: isAdmin ? filters.assignee : undefined,
                limit: isAdmin ? 100 : 20,
            };
            const data = isAdmin
                ? await supportService.getAllTickets(requestParams)
                : await supportService.getTickets(requestParams);
            setTickets(data);
            const targetTicketId = getAutoSelectedSupportTicketId({
                selectedTicketId: selectedTicketId || '',
                tickets: data,
                isAdmin,
                hasPrefilledComposerContext,
            });
            if (targetTicketId && data.some((ticket) => ticket.id === targetTicketId)) {
                setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('ticket', targetTicketId);
                    return next;
                }, { replace: true });
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load support tickets');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters, hasPrefilledComposerContext, isAdmin, selectedTicketId, setSearchParams, toast]);

    const loadDetail = useCallback(async (ticketId: string, silent = false) => {
        if (!silent) setDetailLoading(true);
        try {
            const detail = await supportService.getTicket(ticketId);
            setSelectedTicket(detail);
            setMessages(await supportService.getTranscript(detail.conversation_id));
        } catch (error: any) {
            toast.error(error.message || 'Failed to load support thread');
        } finally {
            if (!silent) setDetailLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchTickets();
        if (isAdmin) {
            void supportService.getSupportAgents().then(setAdminUsers).catch(() => undefined);
        }
    }, [fetchTickets, isAdmin]);

    useEffect(() => {
        if (selectedTicketId) {
            void loadDetail(selectedTicketId);
        } else {
            setSelectedTicket(null);
            setMessages([]);
        }
    }, [loadDetail, selectedTicketId]);

    useEffect(() => {
        setReply('');
        setReplyAttachments([]);
        setReplyDraftId('');
    }, [selectedTicketId]);

    useEffect(() => {
        if (isAdmin || !hasPrefilledComposerContext) {
            return;
        }

        const nextComposer = buildPrefilledSupportComposer({
            searchParams: new URLSearchParams({
                ...(prefilledCategory ? { category: prefilledCategory } : {}),
                ...(prefilledSubject ? { subject: prefilledSubject } : {}),
                ...(prefilledMessage ? { message: prefilledMessage } : {}),
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
            ) {
                return current;
            }

            return {
                ...current,
                category: nextComposer.category,
                subject: nextComposer.subject,
                message: nextComposer.message,
            };
        });
    }, [composer.priority, hasPrefilledComposerContext, isAdmin, prefilledCategory, prefilledMessage, prefilledSubject, role]);

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
                    name: user?.name || user?.full_name || '',
                    email: user?.email || '',
                    page: window.location.pathname,
                    module: composer.category,
                },
            });
            const attachmentWarning = await finalizeCreatedSupportTicket({
                ticketId: created.id,
                draftId: ticketDraftId,
                finalizeDraftAttachments: supportService.finalizeDraftAttachments,
            });
            resetTicketDraft();
            setComposer((current) => ({ ...current, subject: '', message: '' }));
            await fetchTickets();
            setSearchParams(new URLSearchParams({ ticket: created.id, conversation: created.conversation_id }), { replace: true });
            toast.success('Support ticket created');
            if (attachmentWarning) {
                toast.warning(attachmentWarning);
            }
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
            if (replyDraftId) {
                await supportService.finalizeDraftAttachments(replyDraftId, selectedTicket.id);
            }
            await supportService.sendReply(selectedTicket.conversation_id, reply.trim(), replyAttachments);
            resetReplyDraft();
            await loadDetail(selectedTicket.id);
            await fetchTickets(true);
            toast.success('Reply sent');
        } catch (error: any) {
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

    return (
        <div className="space-y-6">
            <section className="rounded-[2.25rem] border border-orange-100 bg-white/95 p-8 shadow-[0_24px_70px_-40px_rgba(255,115,0,0.35)] dark:border-orange-500/15 dark:bg-gray-900/85">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-4xl">
                        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">{ROLE_COPY[role].title}</span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 dark:text-white">{ROLE_COPY[role].title}</h1>
                        <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{ROLE_COPY[role].subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {!isAdmin && resumableTicket && (
                            <button onClick={() => setSearchParams(new URLSearchParams({ ticket: resumableTicket.id }), { replace: true })} className="rounded-full bg-orange-700 px-5 py-3 text-sm font-bold text-white">Resume live support</button>
                        )}
                        <Link to={ROLE_COPY[role].docsPath} className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-5 py-3 text-sm font-bold text-orange-700 dark:border-orange-500/20 dark:text-orange-200"><BookOpen className="h-4 w-4" /> Docs</Link>
                        {!isAdmin && <Link to={`${ROLE_COPY[role].docsPath}#faq`} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200"><CircleHelp className="h-4 w-4" /> FAQ</Link>}
                    </div>
                </div>
            </section>

            <SupportFilters filters={filters} onChange={setFilters} mode={isAdmin ? 'admin' : 'requester'} />

            {isAdmin && (
                <div className="flex flex-wrap gap-3">
                    {ADMIN_QUEUE_TABS.map((tab) => {
                        const active = filters.status === tab.status && (filters.assignee || '') === tab.assignee;
                        return (
                            <button
                                key={tab.label}
                                onClick={() => setFilters((current) => ({ ...current, status: tab.status, assignee: tab.assignee }))}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                    active
                                        ? 'bg-orange-700 text-white shadow-lg shadow-orange-500/20'
                                        : 'border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-orange-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-500/20 dark:hover:text-orange-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
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
                        {adminUsers.map((adminUser) => <option key={adminUser.id} value={adminUser.id}>{adminUser.full_name || adminUser.email}</option>)}
                    </select>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-[2rem] border border-orange-100 bg-white/90 px-5 py-4 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/80">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">{isAdmin ? 'Support queue' : 'My tickets'}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tickets.length} visible right now</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isAdmin && <button onClick={() => setSearchParams(new URLSearchParams(), { replace: true })} className="rounded-full border border-orange-200 px-3 py-2 text-xs font-bold text-orange-700 dark:border-orange-500/20 dark:text-orange-200">New ticket</button>}
                            <button onClick={() => void fetchTickets()} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200 text-orange-700 dark:border-orange-500/20 dark:text-orange-200" aria-label="Refresh support tickets"><RefreshCw className="h-4 w-4" /></button>
                        </div>
                    </div>
                    {loading ? <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-orange-100 bg-white dark:border-orange-500/15 dark:bg-gray-900/70"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div> : <SupportTicketList tickets={tickets} selectedTicketId={selectedTicketId} onSelect={(ticketId) => setSearchParams(new URLSearchParams({ ticket: ticketId }), { replace: true })} emptyLabel={isAdmin ? 'No tickets in this queue' : 'No support tickets yet'} />}
                </div>

                <div className="space-y-5">
                    {!isAdmin && !selectedTicket && (
                        <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                            <div className="mb-4 flex items-center gap-3"><Ticket className="h-6 w-6 text-orange-500" /><h2 className="text-2xl font-black text-gray-950 dark:text-white">Open a support ticket</h2></div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <select value={composer.category} onChange={(event) => setComposer((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" aria-label="Support ticket category">{ROLE_COPY[role].categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                                <select value={composer.priority} onChange={(event) => setComposer((current) => ({ ...current, priority: event.target.value as SupportTicketSummary['priority'] }))} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" aria-label="Support ticket priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                            </div>
                            <input value={composer.subject} onChange={(event) => setComposer((current) => ({ ...current, subject: event.target.value }))} placeholder="Short subject" className="mt-4 w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium dark:bg-gray-800 dark:text-white" />
                            <div className="mt-4"><SupportComposer value={composer.message} onChange={(value) => setComposer((current) => ({ ...current, message: value }))} onSubmit={() => void handleCreateTicket()} onFilesSelected={(files) => void handleFiles('ticket', files)} onRemoveAttachment={(localId) => void handleRemoveAttachment('ticket', localId)} attachments={ticketAttachments} disabled={submitting} placeholder="Describe the blocker, the screen you were on, what you expected, and what needs to happen next." submitLabel={submitting ? 'Submitting' : 'Create ticket'} /></div>
                        </div>
                    )}

                    {selectedTicket && (
                        <>
                            <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">{selectedTicket.category}</p>
                                        <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{selectedTicket.subject}</h2>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedTicket.requester_context?.name || selectedTicket.requester_context?.email || 'Support request'}
                                            {selectedTicket.requester_context?.module ? ` - ${selectedTicket.requester_context.module}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2"><SupportStatusBadge status={selectedTicket.status} /><SupportPriorityBadge priority={selectedTicket.priority} /></div>
                                </div>
                                {isAdmin && <div className="mt-5 grid gap-4 md:grid-cols-3"><select value={selectedTicket.status} onChange={(event) => void patchTicket({ status: event.target.value as SupportTicketSummary['status'] })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><select value={selectedTicket.priority} onChange={(event) => void patchTicket({ priority: event.target.value as SupportTicketSummary['priority'] })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><select value={selectedTicket.assignee_id || ''} onChange={(event) => void patchTicket({ assignee_id: event.target.value })} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800 dark:text-white" aria-label="Selected ticket assignee"><option value="">Unassigned</option>{adminUsers.map((adminUser) => <option key={adminUser.id} value={adminUser.id}>{adminUser.full_name || adminUser.email}</option>)}</select></div>}
                                {!isAdmin && <div className="mt-5 flex flex-wrap gap-3">{selectedTicket.status === 'resolved' && <button onClick={() => void patchTicket({ status: 'open' })} className="rounded-full border border-orange-200 px-4 py-2 text-sm font-bold text-orange-700 dark:border-orange-500/20 dark:text-orange-200">Reopen</button>}{selectedTicket.status !== 'closed' && <button onClick={() => void patchTicket({ status: 'closed' })} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">Close ticket</button>}</div>}
                            </div>
                            <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/85">
                                <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">Transcript</p><h3 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Live support conversation</h3></div>{detailLoading && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}</div>
                                <SupportTranscript messages={messages} currentUserId={user?.id} otherLabel={isAdmin ? (selectedTicket.requester_context?.name || selectedTicket.requester_context?.email || 'Requester') : 'Estospaces Support'} onOpenAttachment={(attachmentId) => void handleOpenAttachment(attachmentId)} />
                                {canReply && <div className="mt-6"><SupportComposer value={reply} onChange={setReply} onSubmit={() => void handleReply()} onFilesSelected={(files) => void handleFiles('reply', files)} onRemoveAttachment={(localId) => void handleRemoveAttachment('reply', localId)} attachments={replyAttachments} disabled={submitting} placeholder={isAdmin ? 'Reply as the Estospaces Team' : 'Reply to support'} submitLabel={submitting ? 'Sending' : 'Send reply'} /></div>}
                            </div>
                        </>
                    )}

                    {isAdmin && !selectedTicket && <div className="flex min-h-[500px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white/80 px-8 text-center dark:border-orange-500/20 dark:bg-gray-900/70"><LifeBuoy className="mb-4 h-12 w-12 text-orange-400" /><p className="text-2xl font-black text-gray-950 dark:text-white">Select a ticket to manage</p><p className="mt-3 max-w-lg text-sm leading-7 text-gray-500 dark:text-gray-400">Assignment, status updates, requester context, attachments, and replies will appear here once a queue item is selected.</p></div>}
                </div>
            </div>
        </div>
    );
}
