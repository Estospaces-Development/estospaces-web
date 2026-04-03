import React from 'react';
import { type SupportTicketSummary } from '@/services/messagesService';

const STATUS_STYLES: Record<SupportTicketSummary['status'], string> = {
    open: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
    resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    closed: 'bg-slate-200 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200',
};

const PRIORITY_STYLES: Record<SupportTicketSummary['priority'], string> = {
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200',
    high: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
};

const formatLabel = (value: string) => value.replace(/_/g, ' ');

export function SupportStatusBadge({ status }: { status: SupportTicketSummary['status'] }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${STATUS_STYLES[status]}`}>
            {formatLabel(status)}
        </span>
    );
}

export function SupportPriorityBadge({ priority }: { priority: SupportTicketSummary['priority'] }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${PRIORITY_STYLES[priority]}`}>
            {formatLabel(priority)}
        </span>
    );
}
