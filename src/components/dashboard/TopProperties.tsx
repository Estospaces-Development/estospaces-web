"use client";

import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as analyticsService from '@/services/analyticsService';

interface TopProperty {
    id: string;
    name: string;
    price: string;
    views: number;
    inquiries: number;
    status: string;
}

const TopProperties = () => {
    const { user } = useAuth();
    const [topProperties, setTopProperties] = useState<TopProperty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopProperties = async () => {
            setLoading(true);
            try {
                const res = await analyticsService.getAnalyticsData();
                if (res.data && res.data.propertyPerformance) {
                    const mapped = res.data.propertyPerformance.map(p => ({
                        id: p.property, // Analytics returns property name/id
                        name: p.property,
                        price: '$0.00', // Analytics doesn't have price, we'd need a join or just show views
                        views: p.views,
                        inquiries: p.applications, // Using applications as proxy for inquiries
                        status: 'Active'
                    }));
                    setTopProperties(mapped.slice(0, 3));
                } else {
                    setTopProperties([]);
                }
            } catch (error) {
                console.error('Error fetching top properties:', error);
                setTopProperties([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTopProperties();
    }, [user]);

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-primary" />
                <h3 className="section-heading text-gray-800 dark:text-white">Top Performing properties</h3>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-lg p-4 bg-white dark:bg-black animate-pulse shadow-sm"
                        >
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            ) : topProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No properties found. Add properties to see top performers here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {topProperties.map((property) => (
                        <div
                            key={property.id}
                            className="rounded-lg p-4 bg-white dark:bg-black shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="body-text font-semibold text-gray-800 dark:text-white">{property.name}</h4>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 caption rounded-full whitespace-nowrap text-xs">
                                    {property.status}
                                </span>
                            </div>
                            <p className="text-lg font-bold text-gray-800 dark:text-white mb-2">{property.price}</p>
                            <div className="flex items-center gap-4 secondary-label text-gray-600 dark:text-gray-400 text-sm">
                                <span>{property.views} {property.views === 1 ? 'view' : 'views'}</span>
                                <span>{property.inquiries} {property.inquiries === 1 ? 'Inquiry' : 'Inquiries'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopProperties;
