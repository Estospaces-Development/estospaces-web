"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Loader2,
    MessageSquare,
    RefreshCw,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { reviewsService, type Review } from '@/services/reviewsService';
import {
    managerReviewsService,
    type ManagerReview,
} from '@/services/managerReviewsService';
import { useToast } from '@/contexts/ToastContext';

type FilterTab = 'all' | 'pending' | 'approved';
type ReviewMode = 'property' | 'manager';
type ReviewAction = {
    id: string;
    mode: ReviewMode;
    action: 'approve' | 'remove';
    label: string;
};

export default function AdminReviewsPage() {
    const toast = useToast();
    const [propertyReviews, setPropertyReviews] = useState<Review[]>([]);
    const [managerReviews, setManagerReviews] = useState<ManagerReview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [reviewMode, setReviewMode] = useState<ReviewMode>('property');
    const [actionId, setActionId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);

    const fetchReviews = useCallback(async (mode: ReviewMode, status: FilterTab) => {
        try {
            if (mode === 'property') {
                const result = await reviewsService.getAdminReviews();
                if (!result.success || !result.data) {
                    throw new Error(result.error || 'Failed to load property reviews');
                }
                setPropertyReviews(result.data);
                return;
            }

            const result = await managerReviewsService.getAdminManagerReviews(status);
            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to load manager reviews');
            }
            setManagerReviews(result.data);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load reviews');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        setIsLoading(true);
        void fetchReviews(reviewMode, activeTab);
    }, [activeTab, fetchReviews, reviewMode]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        void fetchReviews(reviewMode, activeTab);
    };

    const requestApprove = (id: string, label: string) => {
        setPendingAction({ id, label, mode: reviewMode, action: 'approve' });
    };

    const requestRemove = (id: string, label: string) => {
        setPendingAction({ id, label, mode: reviewMode, action: 'remove' });
    };

    const handleConfirmedAction = async () => {
        if (!pendingAction) return;

        setActionId(pendingAction.id);
        const result = pendingAction.action === 'approve'
            ? pendingAction.mode === 'property'
                ? await reviewsService.approveReview(pendingAction.id)
                : await managerReviewsService.approveManagerReview(pendingAction.id)
            : pendingAction.mode === 'property'
                ? await reviewsService.deleteReview(pendingAction.id)
                : await managerReviewsService.deleteManagerReview(pendingAction.id);

        if (result.success) {
            toast.success(
                pendingAction.action === 'approve'
                    ? 'Review approved'
                    : pendingAction.mode === 'property' ? 'Review deleted' : 'Manager review rejected',
            );
            await fetchReviews(pendingAction.mode, activeTab);
        } else {
            toast.error(result.error || (pendingAction.action === 'approve' ? 'Failed to approve' : 'Failed to remove review'));
        }

        setActionId(null);
        setPendingAction(null);
    };

    const filteredPropertyReviews = useMemo(() => propertyReviews.filter((review) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return !review.is_approved;
        return review.is_approved;
    }), [activeTab, propertyReviews]);

    const filteredManagerReviews = useMemo(() => managerReviews.filter((review) => {
        if (activeTab === 'all') return true;
        return review.approval_status === activeTab;
    }), [activeTab, managerReviews]);

    const counts = useMemo(() => {
        const source = reviewMode === 'property'
            ? {
                all: propertyReviews.length,
                pending: propertyReviews.filter((review) => !review.is_approved).length,
                approved: propertyReviews.filter((review) => review.is_approved).length,
            }
            : {
                all: managerReviews.length,
                pending: managerReviews.filter((review) => review.approval_status === 'pending').length,
                approved: managerReviews.filter((review) => review.approval_status === 'approved').length,
            };
        return source;
    }, [managerReviews, propertyReviews, reviewMode]);

    const displayedItems = reviewMode === 'property' ? filteredPropertyReviews : filteredManagerReviews;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Review Moderation</h1>
                    <p className="mt-1 font-medium text-gray-500 dark:text-gray-400">
                        Approve property reviews and manager feedback before they affect public trust signals.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    aria-label="Refresh review moderation queue"
                    className="rounded-2xl border bg-white p-4 text-gray-600 shadow-sm transition-all hover:scale-105 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                    <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {([
                    { id: 'property', label: 'Property reviews' },
                    { id: 'manager', label: 'Manager reviews' },
                ] as const).map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => setReviewMode(mode.id)}
                        aria-pressed={reviewMode === mode.id}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            reviewMode === mode.id
                                ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                : 'bg-white text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                    { id: 'pending', label: 'Pending' },
                    { id: 'all', label: 'All' },
                    { id: 'approved', label: 'Approved' },
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-gray-900 text-white shadow-xl dark:bg-white dark:text-gray-900'
                                : 'bg-white text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                            {counts[tab.id]}
                        </span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                </div>
            ) : displayedItems.length === 0 ? (
                <div className="rounded-3xl bg-white p-16 text-center shadow-sm dark:bg-gray-800">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900">
                        <MessageSquare size={40} className="text-gray-200" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {activeTab === 'pending' ? 'No reviews pending' : 'No reviews found'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviewMode === 'property' ? filteredPropertyReviews.map((review) => (
                        <div
                            key={review.id}
                            className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center"
                        >
                            <div className="flex shrink-0 items-center gap-1">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <Star
                                        key={value}
                                        size={16}
                                        className={value <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                    />
                                ))}
                            </div>
                            <p className="flex-1 text-sm font-medium italic leading-relaxed text-gray-700 dark:text-gray-300">
                                "{review.comment}"
                            </p>
                            <div className="flex shrink-0 flex-col gap-1 text-xs text-gray-400">
                                <span>Property: <span className="font-mono">{review.property_id.slice(0, 8)}...</span></span>
                                <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                    review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {review.is_approved ? 'Approved' : 'Pending'}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {!review.is_approved ? (
                                    <button
                                        type="button"
                                        onClick={() => requestApprove(review.id, `property review for ${review.property_id}`)}
                                        disabled={actionId === review.id}
                                        aria-label={`Approve review for property ${review.property_id}`}
                                        className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-green-800 disabled:opacity-50"
                                    >
                                        {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                        Approve
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => requestRemove(review.id, `property review for ${review.property_id}`)}
                                    disabled={actionId === review.id}
                                    aria-label={`Delete review for property ${review.property_id}`}
                                    className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                >
                                    {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    )) : filteredManagerReviews.map((review) => {
                        const isPending = review.approval_status === 'pending';
                        return (
                            <div
                                key={review.id}
                                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {review.manager_name || 'Manager review'}
                                            </h2>
                                            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                                review.approval_status === 'approved'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    : review.approval_status === 'rejected'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {review.approval_status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <Star
                                                    key={value}
                                                    size={16}
                                                    className={value <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid gap-2 text-sm text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                                            <p>User: <span className="font-semibold text-gray-900 dark:text-white">{review.user_name || review.user_id}</span></p>
                                            <p>Journey: <span className="font-mono text-xs">{review.fast_track_case_id}</span></p>
                                            <p>Property: <span className="font-semibold text-gray-900 dark:text-white">{review.property_title || 'Unknown property'}</span></p>
                                            <p>Submitted: <span className="font-semibold text-gray-900 dark:text-white">{new Date(review.created_at).toLocaleDateString()}</span></p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                            {review.comment?.trim() || 'No comment was provided.'}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {isPending ? (
                                            <button
                                                type="button"
                                                onClick={() => requestApprove(review.id, `manager review from ${review.user_name || review.user_id}`)}
                                                disabled={actionId === review.id}
                                                aria-label={`Approve manager review from ${review.user_name || review.user_id}`}
                                                className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-green-800 disabled:opacity-50"
                                            >
                                                {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                Approve
                                            </button>
                                        ) : null}
                                        {isPending ? (
                                            <button
                                                type="button"
                                                onClick={() => requestRemove(review.id, `manager review from ${review.user_name || review.user_id}`)}
                                                disabled={actionId === review.id}
                                                aria-label={`Reject manager review from ${review.user_name || review.user_id}`}
                                                className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                            >
                                                {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                Reject
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                    {reviewMode === 'property'
                        ? 'Property reviews stay hidden from listings until approved by an admin.'
                        : 'Manager feedback only affects the public star score after admin approval.'}
                </p>
            </div>

            {pendingAction ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Review action confirmation"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Confirm review action</p>
                                <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                                    {pendingAction.action === 'approve' ? 'Approve this review?' : pendingAction.mode === 'property' ? 'Delete this review?' : 'Reject this manager review?'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPendingAction(null)}
                                disabled={actionId === pendingAction.id}
                                aria-label="Close review action confirmation"
                                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                            You are about to {pendingAction.action === 'approve' ? 'approve' : pendingAction.mode === 'property' ? 'delete' : 'reject'} {pendingAction.label}. The queue will refresh after the action completes.
                        </p>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setPendingAction(null)}
                                disabled={actionId === pendingAction.id}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleConfirmedAction()}
                                disabled={actionId === pendingAction.id}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                                    pendingAction.action === 'approve'
                                        ? 'bg-green-700 hover:bg-green-800'
                                        : 'bg-red-700 hover:bg-red-800'
                                }`}
                            >
                                {actionId === pendingAction.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                {pendingAction.action === 'approve' ? 'Approve' : pendingAction.mode === 'property' ? 'Delete' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
