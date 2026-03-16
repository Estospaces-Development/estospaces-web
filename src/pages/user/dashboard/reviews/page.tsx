"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { reviewsService, type Review } from '@/services/reviewsService';
import { useToast } from '@/contexts/ToastContext';

export default function ReviewsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setIsLoading(true);
                const result = await reviewsService.getUserReviews();
                if (result.error) throw new Error(result.error);
                if (result.data) setReviews(result.data);
            } catch (error: any) {
                toast.error('Failed to load reviews');
                console.error('[ReviewsPage] Load Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReviews();
    }, [toast]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={16}
                        className={`${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

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

                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                        My Reviews
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        View and manage your property ratings and feedback
                    </p>
                </div>

                {reviews.length > 0 ? (
                    <div className="space-y-6">
                        {reviews.map((review) => (
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
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        review.status === 'approved' ? 'bg-green-50 text-green-600' :
                                        review.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                        {review.status}
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
                            <Star size={48} className="text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No reviews yet</h3>
                        <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10">
                            You haven't reviewed any properties yet. Your feedback helps others find their dream homes.
                        </p>
                        <button
                            onClick={() => navigate('/user/dashboard/discover')}
                            className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black active:scale-95 transition-all"
                        >
                            Explore Properties
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
