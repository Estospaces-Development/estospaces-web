"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, ArrowLeft, Loader2, Calendar, Trash2, Plus, X, Search } from 'lucide-react';
import { reviewsService, type Review } from '@/services/reviewsService';
import { useToast } from '@/contexts/ToastContext';

const REVIEW_COMMENT_MAX_LENGTH = 1000;
type ReviewStatusFilter = 'all' | 'pending' | 'approved';
type ReviewSortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function ReviewsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all');
    const [sortMode, setSortMode] = useState<ReviewSortMode>('newest');
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showWriteForm, setShowWriteForm] = useState(false);
    const [writeForm, setWriteForm] = useState({ property_id: '', rating: 0, comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const reviewCommentHelpId = 'review-comment-length';

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            const result = await reviewsService.getUserReviews();
            if (result.error) throw new Error(result.error);
            if (result.data) setReviews(result.data);
        } catch (error: any) {
            toast.error('Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const filteredReviews = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const matched = reviews.filter((review) => {
            if (statusFilter !== 'all' && review.status !== statusFilter) {
                return false;
            }
            if (!query) {
                return true;
            }
            return review.comment.toLowerCase().includes(query)
                || review.property_id.toLowerCase().includes(query);
        });

        return [...matched].sort((left, right) => {
            if (sortMode === 'oldest') {
                return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
            }
            if (sortMode === 'highest') {
                return right.rating - left.rating;
            }
            if (sortMode === 'lowest') {
                return left.rating - right.rating;
            }
            return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        });
    }, [reviews, searchQuery, sortMode, statusFilter]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const result = await reviewsService.deleteReview(id);
        if (result.success) {
            setReviews((prev) => prev.filter((r) => r.id !== id));
            toast.success('Review deleted');
        } else {
            toast.error(result.error || 'Failed to delete review');
        }
        setDeletingId(null);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!writeForm.property_id.trim()) {
            toast.error('Please enter a property ID');
            return;
        }
        if (writeForm.rating < 1) {
            toast.error('Please choose a rating');
            return;
        }
        if (!writeForm.comment.trim()) {
            toast.error('Please enter a review comment');
            return;
        }
        if (writeForm.comment.length > REVIEW_COMMENT_MAX_LENGTH) {
            toast.error(`Review comments must be ${REVIEW_COMMENT_MAX_LENGTH} characters or less`);
            return;
        }
        setIsSubmitting(true);
        const result = await reviewsService.createReview(writeForm);
        if (result.success) {
            toast.success('Review submitted — pending moderation');
            setShowWriteForm(false);
            setWriteForm({ property_id: '', rating: 0, comment: '' });
            fetchReviews();
        } else {
            toast.error(result.error || 'Failed to submit review');
        }
        setIsSubmitting(false);
    };

    const isReviewFormReady = writeForm.property_id.trim().length > 0
        && writeForm.comment.trim().length > 0
        && writeForm.rating > 0;

    const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
        <div
            className="flex gap-1"
            role={interactive ? 'radiogroup' : undefined}
            aria-label={interactive ? 'Review rating' : `${rating} out of 5 stars`}
            aria-required={interactive ? 'true' : undefined}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                interactive ? (
                    <button
                        key={star}
                        type="button"
                        onClick={onChange ? () => onChange(star) : undefined}
                        aria-label={`Set rating to ${star} ${star === 1 ? 'star' : 'stars'}`}
                        aria-pressed={rating === star}
                        className="cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        <Star
                            size={24}
                            className={`${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                        />
                    </button>
                ) : (
                    <span key={star} aria-hidden="true">
                        <Star
                            size={16}
                            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                    </span>
                )
            ))}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                                My Reviews
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                View and manage your property ratings and feedback
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    aria-label="Search reviews"
                                    placeholder="Search reviews..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
                                />
                            </div>
                            <label className="sr-only" htmlFor="user-review-status-filter">Filter reviews by status</label>
                            <select
                                id="user-review-status-filter"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as ReviewStatusFilter)}
                                className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:w-44"
                            >
                                <option value="all">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                            </select>
                            <label className="sr-only" htmlFor="user-review-sort">Sort reviews</label>
                            <select
                                id="user-review-sort"
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value as ReviewSortMode)}
                                className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:w-44"
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="highest">Highest rating</option>
                                <option value="lowest">Lowest rating</option>
                            </select>
                            <button
                                onClick={() => setShowWriteForm(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                Write a Review
                            </button>
                        </div>
                    </div>
                </div>

                {/* Write Review Form */}
                {showWriteForm && (
                    <div className="mb-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-orange-200 dark:border-orange-800/40 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Leave a Review</h2>
                            <button onClick={() => setShowWriteForm(false)} aria-label="Close review form" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitReview} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Property ID</label>
                                <input
                                    type="text"
                                    value={writeForm.property_id}
                                    onChange={(e) => setWriteForm((prev) => ({ ...prev, property_id: e.target.value }))}
                                    placeholder="Paste the property ID from the listing"
                                    aria-required="true"
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rating</label>
                                {renderStars(writeForm.rating, true, (r) => setWriteForm((prev) => ({ ...prev, rating: r })))}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comment</label>
                                <textarea
                                    rows={4}
                                    value={writeForm.comment}
                                    onChange={(e) => setWriteForm((prev) => ({ ...prev, comment: e.target.value }))}
                                    placeholder="Share your experience with this property..."
                                    maxLength={REVIEW_COMMENT_MAX_LENGTH}
                                    aria-describedby={reviewCommentHelpId}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white resize-none"
                                    required
                                />
                                <p id={reviewCommentHelpId} className="text-xs font-bold text-gray-400">
                                    {writeForm.comment.length}/{REVIEW_COMMENT_MAX_LENGTH} characters
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !isReviewFormReady}
                                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-2xl font-black shadow-xl shadow-orange-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} />}
                                {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    </div>
                )}

                {filteredReviews.length > 0 ? (
                    <div className="space-y-6">
                        {filteredReviews.map((review) => (
                            <div key={review.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-transparent hover:border-orange-500/20 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                            <MessageSquare size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white tracking-tight">Property Review</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {renderStars(review.rating)}
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            review.status === 'approved' ? 'bg-green-50 text-green-600' :
                                            review.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {review.status}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            disabled={deletingId === review.id}
                                            aria-label={`Delete review for property ${review.property_id}`}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-40"
                                            title="Delete review"
                                        >
                                            {deletingId === review.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">
                                    "{review.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl p-16 text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8">
                            {searchQuery ? <Search size={48} className="text-gray-200" /> : <Star size={48} className="text-gray-200" />}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {searchQuery ? "No matching reviews" : "No reviews yet"}
                        </h3>
                        <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10">
                            {searchQuery 
                                ? `We couldn't find any reviews matching "${searchQuery}".`
                                : "You haven't reviewed any properties yet. Your feedback helps others find their dream homes."}
                        </p>
                        {searchQuery ? (
                             <button
                                onClick={() => setSearchQuery('')}
                                className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black active:scale-95 transition-all"
                            >
                                Clear Search
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowWriteForm(true)}
                                className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-orange-500/25"
                            >
                                Write a Review
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
