"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, Trash2, Loader2, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { reviewsService, type Review } from '@/services/reviewsService';
import { useToast } from '@/contexts/ToastContext';

type FilterTab = 'all' | 'pending' | 'approved';

export default function AdminReviewsPage() {
    const toast = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [actionId, setActionId] = useState<string | null>(null);

    const fetchReviews = useCallback(async () => {
        try {
            const result = await reviewsService.getPendingReviews();
            if (result.error) throw new Error(result.error);
            setReviews(result.data || []);
        } catch (error: any) {
            toast.error('Failed to load reviews');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchReviews();
    };

    const handleApprove = async (id: string) => {
        setActionId(id);
        const result = await reviewsService.approveReview(id);
        if (result.success) {
            setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_approved: true, status: 'approved' } : r));
            toast.success('Review approved');
        } else {
            toast.error(result.error || 'Failed to approve');
        }
        setActionId(null);
    };

    const handleDelete = async (id: string) => {
        setActionId(id);
        const result = await reviewsService.deleteReview(id);
        if (result.success) {
            setReviews((prev) => prev.filter((r) => r.id !== id));
            toast.success('Review deleted');
        } else {
            toast.error(result.error || 'Failed to delete');
        }
        setActionId(null);
    };

    const filtered = reviews.filter((r) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return !r.is_approved;
        return r.is_approved;
    });

    const counts = {
        all: reviews.length,
        pending: reviews.filter((r) => !r.is_approved).length,
        approved: reviews.filter((r) => r.is_approved).length,
    };

    const tabs: { id: FilterTab; label: string }[] = [
        { id: 'pending', label: 'Pending' },
        { id: 'all', label: 'All' },
        { id: 'approved', label: 'Approved' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Review Moderation</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Approve or remove user-submitted property reviews
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 hover:scale-105 transition-all text-gray-600 dark:text-gray-400"
                >
                    <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'
                                : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white">
                            {counts[tab.id]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare size={40} className="text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                        {activeTab === 'pending' ? 'No reviews pending — queue clear' : 'No reviews found'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((review) => (
                        <div
                            key={review.id}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row md:items-center gap-4"
                        >
                            {/* Star rating */}
                            <div className="flex items-center gap-1 shrink-0">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        size={16}
                                        className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                                    />
                                ))}
                            </div>

                            {/* Comment */}
                            <p className="flex-1 text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic text-sm">
                                "{review.comment}"
                            </p>

                            {/* Meta */}
                            <div className="flex flex-col gap-1 text-xs text-gray-400 shrink-0">
                                <span>Property: <span className="font-mono">{review.property_id.slice(0, 8)}…</span></span>
                                <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase w-fit ${
                                    review.is_approved ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                }`}>
                                    {review.is_approved ? 'Approved' : 'Pending'}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {!review.is_approved && (
                                    <button
                                        onClick={() => handleApprove(review.id)}
                                        disabled={actionId === review.id}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                                    >
                                        {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                        Approve
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(review.id)}
                                    disabled={actionId === review.id}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                                >
                                    {actionId === review.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-4 text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>Reviews are hidden from listings until approved by an admin.</p>
            </div>
        </div>
    );
}
