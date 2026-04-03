import React from 'react';
import { Inbox, MessageSquareText } from 'lucide-react';
import { type SupportTicketSummary } from '@/services/messagesService';
import { SupportPriorityBadge, SupportStatusBadge } from '@/components/support/SupportBadges';

interface SupportTicketListProps {
    tickets: SupportTicketSummary[];
    selectedTicketId: string | null;
    onSelect: (ticketId: string) => void;
    emptyLabel: string;
}

export function SupportTicketList({
    tickets,
    selectedTicketId,
    onSelect,
    emptyLabel,
}: SupportTicketListProps) {
    if (tickets.length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white/80 px-6 text-center dark:border-orange-500/20 dark:bg-gray-900/70">
                <Inbox className="mb-4 h-10 w-10 text-orange-400" />
                <p className="text-base font-semibold text-gray-900 dark:text-white">{emptyLabel}</p>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                    New ticket activity will appear here as soon as a support request is created.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tickets.map((ticket) => {
                const active = ticket.id === selectedTicketId;
                return (
                    <button
                        key={ticket.id}
                        onClick={() => onSelect(ticket.id)}
                        className={`w-full rounded-[1.75rem] border p-4 text-left transition-all ${
                            active
                                ? 'border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10 dark:border-orange-500/40 dark:bg-orange-500/10'
                                : 'border-gray-100 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/75 dark:hover:border-orange-500/20'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                                        <MessageSquareText className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-200">
                                            {ticket.category || 'Support'}
                                        </p>
                                        <h3 className="truncate text-base font-bold text-gray-950 dark:text-white">
                                            {ticket.subject}
                                        </h3>
                                    </div>
                                </div>
                                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                    {ticket.requester_context?.name || ticket.requester_context?.email || 'Estospaces customer'}
                                    {ticket.requester_context?.module ? ` • ${ticket.requester_context.module}` : ''}
                                </p>
                                {ticket.last_message?.content && (
                                    <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                                        {ticket.last_message.content}
                                    </p>
                                )}
                            </div>
                            {ticket.unread_count > 0 && (
                                <span className="inline-flex min-w-8 justify-center rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                                    {ticket.unread_count}
                                </span>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <SupportStatusBadge status={ticket.status} />
                            <SupportPriorityBadge priority={ticket.priority} />
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                {new Date(ticket.last_message_at || ticket.updated_at).toLocaleString()}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
