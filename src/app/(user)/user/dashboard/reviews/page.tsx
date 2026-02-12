'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';

const MOCK_REVIEWS = [
    {
        id: '1',
        property_title: 'Modern City Centre Flat',
        property_image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop',
        rating: 5,
        date: '2 Jan 2026',
        comment: 'Excellent property in a great location. The flat was well-maintained and the agent was very professional throughout.',
        likes: 12,
    },
    {
        id: '2',
        property_title: 'Cosy Shoreditch Studio',
        property_image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&h=200&fit=crop',
        rating: 4,
        date: '28 Dec 2025',
        comment: 'Good value for money. The studio was compact but well-designed. Would recommend for young professionals.',
        likes: 8,
    },
    {
        id: '3',
        property_title: 'Spacious Kensington Penthouse',
        property_image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop',
        rating: 5,
        date: '15 Dec 2025',
        comment: 'Absolutely stunning property with breathtaking views. The viewing experience was seamless.',
        likes: 24,
    },
];

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<typeof MOCK_REVIEWS>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setReviews(MOCK_REVIEWS);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-orange-500 mb-2">My Reviews</h1>
                <p className="text-gray-600 dark:text-gray-400">Reviews you&apos;ve written for properties and agents</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
            ) : reviews.length > 0 ? (
                <div className="grid gap-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <img src={review.property_image} alt={review.property_title} className="w-16 h-16 rounded-lg object-cover" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{review.property_title}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} className={`${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                            <span className="text-sm text-gray-500 ml-2">{review.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Published
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{review.comment}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <button className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                                    <ThumbsUp size={16} />
                                    <span>Helpful ({review.likes})</span>
                                </button>
                                <button className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                                    <MessageSquare size={16} />
                                    <span>Reply</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Star size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-orange-500 mb-2">No reviews yet</h3>
                    <p className="text-gray-600 dark:text-orange-400 mb-4">Review properties you&apos;ve visited or rented</p>
                    <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
                        View Properties
                    </button>
                </div>
            )}
        </div>
    );
}
