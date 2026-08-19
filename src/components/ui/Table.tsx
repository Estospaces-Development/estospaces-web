"use client";

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PaginationBar from '@/components/ui/PaginationBar';

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
            setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortKey(key);
        setSortDir('asc');
    };

    const alignClass = (align?: string) =>
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

    return (
        <div className={`overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-zinc-800 dark:bg-black ${className}`}>
            <div className="divide-y divide-gray-100 md:hidden dark:divide-zinc-800" data-mobile-table="cards">
                {pageData.length === 0 ? (
                    <p className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                ) : pageData.map((row) => (
                    <article
                        key={String(row[keyField])}
                        className="space-y-4 p-4"
                    >
                        <dl className="space-y-3">
                            {columns.map((column) => (
                                <div key={column.key} className="grid min-w-0 grid-cols-[minmax(5.5rem,0.42fr)_minmax(0,1fr)] items-start gap-3">
                                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{column.header}</dt>
                                    <dd className={`mobile-safe-text min-w-0 text-sm text-gray-900 dark:text-gray-100 ${alignClass(column.align)}`}>
                                        {column.render ? column.render(row) : String(row[column.key] ?? '')}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {onRowClick && (
                            <button
                                type="button"
                                onClick={() => onRowClick(row)}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-orange-200 px-4 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            >
                                View details
                            </button>
                        )}
                    </article>
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block" tabIndex={0} aria-label="Scrollable data table">
                <table className="w-full min-w-max text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 ${alignClass(column.align)} ${column.sortable ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''}`}
                                    style={column.width ? { width: column.width } : undefined}
                                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortKey === column.key ? (
                                            sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                                        ) : null}
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
                                    className={`border-b border-gray-100 transition-colors last:border-b-0 dark:border-zinc-900 ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-950' : ''}`}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className={`mobile-safe-text px-4 py-3 text-gray-800 dark:text-gray-200 ${alignClass(column.align)}`}>
                                            {column.render ? column.render(row) : String(row[column.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 ? (
                <div className="border-t border-gray-100 bg-gray-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <PaginationBar
                        currentPage={page + 1}
                        totalPages={totalPages}
                        onPageChange={(nextPage) => setPage(nextPage - 1)}
                        totalItems={sortedData.length}
                        pageSize={pageSize}
                        currentItemCount={pageData.length}
                        itemLabel="rows"
                    />
                </div>
            ) : null}
        </div>
    );
}

export default Table;
