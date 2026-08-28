import React from 'react';
import { Inbox, MessageSquareText } from 'lucide-react';
import { type SupportTicketSummary } from '@/services/messagesService';
import { SupportPriorityBadge, SupportStatusBadge } from '@/components/support/SupportBadges';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import { getLaunchSafeSupportCategoryLabel } from '@/lib/supportCenter';
import { formatSupportTimestamp } from '@/lib/supportTranscript';

interface SupportTicketListProps {
    tickets: SupportTicketSummary[];
    selectedTicketId: string | null;
    onSelect: (ticketId: string) => void;
    emptyLabel: string;
    emptyDescription?: string;
    emptyActionLabel?: string;
    onEmptyAction?: () => void;
}

export function SupportTicketList({
    tickets,
    selectedTicketId,
    onSelect,
    emptyLabel,
    emptyDescription,
    emptyActionLabel,
    onEmptyAction,
}: SupportTicketListProps) {
    if (tickets.length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white/80 px-6 text-center dark:border-orange-500/20 dark:bg-gray-900/70">
                <Inbox className="mb-4 h-10 w-10 text-orange-400" />
                <p className="text-base font-semibold text-gray-900 dark:text-white">{emptyLabel}</p>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                    {emptyDescription || 'New ticket activity will appear here as soon as a support request is created.'}
                </p>
                {onEmptyAction && (
                    <button
                        type="button"
                        onClick={onEmptyAction}
                        className="mt-4 rounded-full border border-orange-200 px-4 py-2 text-sm font-bold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-500/10"
                    >
                        {emptyActionLabel || 'Clear filters'}
                    </button>
                )}
            </div>
        );
    }

    const ticketKeyFor = createDuplicateSafeKeyResolver('support-ticket');

    return (
        <div className="space-y-3">
            {tickets.map((ticket, ticketIndex) => {
                const active = ticket.id === selectedTicketId;
                return (
                    <button
                        key={ticketKeyFor(ticket.id, ticketIndex)}
                        type="button"
                        onClick={() => onSelect(ticket.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full min-w-0 overflow-hidden rounded-[1.75rem] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.995] dark:focus-visible:ring-offset-gray-950 ${
                            active
                                ? 'border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10 dark:border-orange-500/40 dark:bg-orange-500/10'
                                : 'border-gray-100 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/75 dark:hover:border-orange-500/20'
                        }`}
                    >
                        <div className="flex min-w-0 items-start justify-between gap-3 overflow-hidden">
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                                        <MessageSquareText className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">
                                            {getLaunchSafeSupportCategoryLabel(ticket.category)}
                                        </p>
                                        <p className="truncate text-base font-bold text-gray-950 dark:text-white">{ticket.subject}</p>
                                    </div>
                                </div>
                                <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                                    {ticket.requester_context?.name || ticket.requester_context?.email || 'Estospaces customer'}
                                    {ticket.requester_context?.module ? ` - ${getLaunchSafeSupportCategoryLabel(ticket.requester_context.module)}` : ''}
                                </p>
                                {ticket.last_message?.content && (
                                    <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                                        {ticket.last_message.content}
                                    </p>
                                )}
                            </div>
                            {ticket.unread_count > 0 && (
                                <span className="inline-flex min-w-8 shrink-0 justify-center rounded-full bg-orange-700 px-2 py-1 text-xs font-bold text-white">
                                    {ticket.unread_count}
                                </span>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <SupportStatusBadge status={ticket.status} />
                            <SupportPriorityBadge priority={ticket.priority} />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-300">
                                {formatSupportTimestamp(ticket.last_message_at, ticket.updated_at, ticket.created_at)}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
