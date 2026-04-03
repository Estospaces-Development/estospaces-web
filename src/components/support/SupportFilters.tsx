import React from 'react';
import { Search } from 'lucide-react';

export interface SupportFilterState {
    search: string;
    status: string;
    priority: string;
    requesterRole?: string;
    assignee?: string;
}

interface SupportFiltersProps {
    filters: SupportFilterState;
    onChange: (next: SupportFilterState) => void;
    mode: 'requester' | 'admin';
}

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'All priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function SupportFilters({ filters, onChange, mode }: SupportFiltersProps) {
    return (
        <div className="grid gap-3 rounded-[2rem] border border-orange-100 bg-white/90 p-4 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/80 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block xl:col-span-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    value={filters.search}
                    onChange={(event) => onChange({ ...filters, search: event.target.value })}
                    placeholder={mode === 'admin' ? 'Search tickets, requesters, or modules' : 'Search your tickets'}
                    className="w-full rounded-2xl border border-transparent bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white dark:bg-gray-800 dark:text-white dark:focus:border-orange-500/40"
                />
            </label>

            <select
                value={filters.status}
                onChange={(event) => onChange({ ...filters, status: event.target.value })}
                className="rounded-2xl border border-transparent bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white dark:bg-gray-800 dark:text-white dark:focus:border-orange-500/40"
            >
                {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>

            <select
                value={filters.priority}
                onChange={(event) => onChange({ ...filters, priority: event.target.value })}
                className="rounded-2xl border border-transparent bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white dark:bg-gray-800 dark:text-white dark:focus:border-orange-500/40"
            >
                {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );
}
