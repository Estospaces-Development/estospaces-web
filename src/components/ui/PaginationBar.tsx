"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaginationRange, getVisiblePageTokens } from '@/lib/pagination';

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
}

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
}: PaginationBarProps) {
    if (totalPages <= 1) {
        return null;
    }

    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const tokens = getVisiblePageTokens(safeCurrentPage, totalPages);
    const range = getPaginationRange(safeCurrentPage, pageSize, totalItems, currentItemCount);

    const canGoPrevious = !disabled && safeCurrentPage > 1;
    const canGoNext = !disabled && safeCurrentPage < totalPages;

    return (
        <div className={`flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <div className="space-y-1">
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

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => canGoPrevious && onPageChange(safeCurrentPage - 1)}
                    disabled={!canGoPrevious}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </button>

                <div className="flex items-center gap-2 rounded-2xl bg-gray-50/90 px-2 py-2 dark:bg-gray-800/80">
                    {tokens.map((token, index) => {
                        if (token === 'ellipsis') {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="inline-flex h-10 min-w-[2.5rem] items-center justify-center px-2 text-sm font-semibold text-gray-400"
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
                                className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-2xl px-3 text-sm font-bold transition-all ${
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
                    onClick={() => canGoNext && onPageChange(safeCurrentPage + 1)}
                    disabled={!canGoNext}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
