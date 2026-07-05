"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getPaginationNavigationState, getPaginationRange, getVisiblePageTokens } from '@/lib/pagination';

interface PaginationBarProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
    currentItemCount?: number;
    itemLabel?: string;
    disabled?: boolean;
    className?: string;
    stacked?: boolean;
    showWhenSinglePage?: boolean;
}

export const getPaginationPagesScrollLabel = () => 'Scrollable pagination pages';

export default function PaginationBar({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    pageSize,
    currentItemCount,
    itemLabel = 'items',
    disabled = false,
    className = '',
    stacked = false,
    showWhenSinglePage = false,
}: PaginationBarProps) {
    if (totalPages <= 1 && !showWhenSinglePage) {
        return null;
    }

    const navigation = getPaginationNavigationState(currentPage, totalPages, disabled);
    const safeCurrentPage = navigation.safeCurrentPage;
    const tokens = getVisiblePageTokens(safeCurrentPage, totalPages);
    const range = getPaginationRange(safeCurrentPage, pageSize, totalItems, currentItemCount);

    const containerLayoutClass = stacked
        ? 'flex-col items-stretch justify-start'
        : 'flex-col sm:flex-row sm:items-center sm:justify-between';

    return (
        <div className={`flex min-w-0 max-w-full gap-4 rounded-3xl border border-gray-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-5 dark:border-gray-800 dark:bg-gray-900/95 ${containerLayoutClass} ${className}`}>
            <div className="min-w-0 space-y-1">
                {range && totalItems !== undefined ? (
                    <>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Results</p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Showing <span className="text-gray-900 dark:text-white">{range.start}-{range.end}</span> of <span className="text-gray-900 dark:text-white">{totalItems}</span> {itemLabel}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Page</p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Page <span className="text-gray-900 dark:text-white">{safeCurrentPage}</span> of <span className="text-gray-900 dark:text-white">{totalPages}</span>
                        </p>
                    </>
                )}
            </div>

            <div className={`flex min-w-0 max-w-full flex-wrap items-center gap-2 ${stacked ? 'w-full' : ''}`}>
                <button
                    type="button"
                    aria-label="First page"
                    onClick={() => navigation.canGoFirst && onPageChange(navigation.firstPage)}
                    disabled={!navigation.canGoFirst}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 dark:focus-visible:ring-offset-gray-950"
                >
                    <ChevronsLeft className="h-4 w-4" />
                    First
                </button>

                <button
                    type="button"
                    onClick={() => navigation.canGoPrevious && onPageChange(navigation.previousPage)}
                    disabled={!navigation.canGoPrevious}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 dark:focus-visible:ring-offset-gray-950"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </button>

                <div
                    aria-label={getPaginationPagesScrollLabel()}
                    tabIndex={0}
                    className={[
                        'flex max-w-full min-w-0 items-center gap-2 overflow-x-auto rounded-2xl bg-gray-50/90 px-2 py-2 dark:bg-gray-800/80',
                        stacked ? 'w-full justify-start sm:justify-center' : 'w-full sm:w-auto',
                    ].join(' ')}
                >
                    {tokens.map((token, index) => {
                        if (token === 'ellipsis') {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="inline-flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center px-2 text-sm font-semibold text-gray-400"
                                >
                                    ...
                                </span>
                            );
                        }

                        const isActive = token == safeCurrentPage;

                        return (
                            <button
                                key={token}
                                type="button"
                                onClick={() => onPageChange(token)}
                                disabled={disabled || isActive}
                                className={`inline-flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-2xl px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 ${
                                    isActive
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                } disabled:cursor-not-allowed`}
                            >
                                {token}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => navigation.canGoNext && onPageChange(navigation.nextPage)}
                    disabled={!navigation.canGoNext}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 dark:focus-visible:ring-offset-gray-950"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    aria-label="Last page"
                    onClick={() => navigation.canGoLast && onPageChange(navigation.lastPage)}
                    disabled={!navigation.canGoLast}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 dark:focus-visible:ring-offset-gray-950"
                >
                    Last
                    <ChevronsRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
