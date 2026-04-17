"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare, Search, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import * as messagesService from '@/services/messagesService';

const statusClasses: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function AdminHelpPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tickets, setTickets] = useState<messagesService.SupportTicket[]>([]);
    const [search, setSearch] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get('ticket') || '');
    const [messages, setMessages] = useState<messagesService.Message[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [reply, setReply] = useState('');

    const filteredTickets = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return tickets;
        }
        return tickets.filter((ticket) => ticket.subject.toLowerCase().includes(query));
    }, [search, tickets]);

    const selectedTicket = useMemo(
        () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
        [tickets, selectedTicketId],
    );

    const syncSelectedTicket = useCallback((ticketId: string) => {
        setSelectedTicketId(ticketId);
        const nextParams = new URLSearchParams(searchParams);
        if (ticketId) {
            nextParams.set('ticket', ticketId);
        } else {
            nextParams.delete('ticket');
        }
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const fetchTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const data = await messagesService.getTickets();
            const ordered = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTickets(ordered);

            const requestedTicketId = searchParams.get('ticket');
            const nextSelectedId = requestedTicketId && ordered.some((ticket) => ticket.id === requestedTicketId)
                ? requestedTicketId
                : ordered.some((ticket) => ticket.id === selectedTicketId)
                    ? selectedTicketId
                    : ordered[0]?.id || '';

            if (nextSelectedId !== selectedTicketId) {
                setSelectedTicketId(nextSelectedId);
            }
        } catch (error) {
            console.error('Failed to load support tickets:', error);
            setTickets([]);
        } finally {
            setTicketsLoading(false);
        }
    }, [searchParams, selectedTicketId]);

    const fetchMessages = useCallback(async (ticket: messagesService.SupportTicket | null) => {
        if (!ticket) {
            setMessages([]);
            return;
        }

        setMessagesLoading(true);
        try {
            const data = await messagesService.getMessages(ticket.conversation_id, 1, 100);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load support conversation:', error);
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        if (selectedTicketId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('ticket', selectedTicketId);
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, selectedTicketId, setSearchParams]);

    useEffect(() => {
        fetchMessages(selectedTicket);
    }, [fetchMessages, selectedTicket]);

    const handleStatusUpdate = async (status: messagesService.SupportTicket['status']) => {
        if (!selectedTicket) {
            return;
        }
        setActionLoading(true);
        try {
            await messagesService.updateTicketStatus(selectedTicket.id, status);
            await fetchTickets();
        } catch (error) {
            console.error('Failed to update ticket status:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !reply.trim()) {
            return;
        }

        setActionLoading(true);
        try {
            await messagesService.sendMessage({
                conversationId: selectedTicket.conversation_id,
                content: reply.trim(),
                type: 'text',
            });
            setReply('');
            await fetchMessages(selectedTicket);
            await fetchTickets();
        } catch (error) {
            console.error('Failed to send support reply:', error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="mb-3 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span>Dashboard</span>
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Help & Support</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
                        Review live support tickets, reply to users, and update ticket status from the admin host.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[720px]">
                <div className="xl:col-span-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search support tickets"
                            className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-11 py-3 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-orange-500"
                        />
                    </div>

                    <div className="space-y-3 max-h-[620px] overflow-y-auto">
                        {ticketsLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="animate-spin text-orange-500" />
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                No tickets found.
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => syncSelectedTicket(ticket.id)}
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${selectedTicketId === ticket.id
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-orange-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black text-sm text-gray-900 dark:text-white">{ticket.subject}</p>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
                                                {new Date(ticket.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusClasses[ticket.status] || statusClasses.open}`}>
                                            {ticket.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="xl:col-span-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col">
                    {!selectedTicket ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                            <MessageSquare className="mb-4 text-orange-500" size={40} />
                            <p className="text-lg font-bold">Select a support ticket</p>
                            <p className="text-sm font-medium mt-2">The conversation and ticket controls will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedTicket.subject}</h2>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
                                        Ticket {selectedTicket.id}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTicket.status !== 'in_progress' && (
                                        <button
                                            type="button"
                                            disabled={actionLoading}
                                            onClick={() => handleStatusUpdate('in_progress')}
                                            className="rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                        >
                                            Mark In Progress
                                        </button>
                                    )}
                                    {selectedTicket.status !== 'resolved' && (
                                        <button
                                            type="button"
                                            disabled={actionLoading}
                                            onClick={() => handleStatusUpdate('resolved')}
                                            className="rounded-2xl bg-green-100 px-4 py-2 text-sm font-black text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                    {selectedTicket.status !== 'closed' && (
                                        <button
                                            type="button"
                                            disabled={actionLoading}
                                            onClick={() => handleStatusUpdate('closed')}
                                            className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-black text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                                        >
                                            Close Ticket
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto py-6 space-y-4">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="animate-spin text-orange-500" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        No conversation messages yet.
                                    </div>
                                ) : (
                                    messages.map((message) => {
                                        const fromAdmin = message.sender_id === user?.id;
                                        return (
                                            <div key={message.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${fromAdmin
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                                    }`}>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-2 opacity-80">
                                                        {fromAdmin ? 'Admin' : 'User'}
                                                    </p>
                                                    <p className="text-sm font-medium">{message.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form onSubmit={handleReply} className="border-t border-gray-200 dark:border-gray-800 pt-5 space-y-3">
                                <textarea
                                    rows={4}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Send an update to the user..."
                                    className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-5 py-4 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-orange-500 resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={actionLoading || !reply.trim()}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    <span>{actionLoading ? 'Sending...' : 'Send Reply'}</span>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
