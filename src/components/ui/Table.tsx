"use client";

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: string;
    pageSize?: number;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    className?: string;
}

function Table<T extends Record<string, unknown>>({
    columns,
    data,
    keyField,
    pageSize = 10,
    emptyMessage = 'No data available',
    onRowClick,
    className = '',
}: TableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal == null || bVal == null) return 0;
            const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
    const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const alignClass = (a?: string) =>
        a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

    return (
        <div className={`bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 ${alignClass(col.align)} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''
                                        }`}
                                    style={col.width ? { width: col.width } : undefined}
                                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            pageData.map((row) => (
                                <tr
                                    key={String(row[keyField])}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={`border-b border-gray-100 dark:border-zinc-900 last:border-b-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-950' : ''
                                        }`}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-4 py-3 text-gray-800 dark:text-gray-200 ${alignClass(col.align)}`}>
                                            {col.render ? col.render(row) : String(row[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Table;
