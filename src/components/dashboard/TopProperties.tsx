"use client";

import { TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as analyticsService from '@/services/analyticsService';
import { filterManagerLivePropertyPerformance } from '@/lib/managerPropertyDashboard';
import { formatPropertyStatusLabel } from '@/lib/propertyStatusBadge';
import { formatManagerDashboardCount } from '@/lib/managerDashboardPresentation';

interface TopProperty {
    id: string;
    propertyId?: string;
    name: string;
    price: string;
    views: number;
    inquiries: number;
    status: string;
}

interface TopPropertiesProps {
    analytics?: analyticsService.AnalyticsData | null;
    loading?: boolean;
}

const mapTopProperties = (propertyPerformance?: analyticsService.PropertyPerformance[] | null): TopProperty[] => (
    filterManagerLivePropertyPerformance(propertyPerformance)
        .map((property, index) => {
            const propertyId = property.property_id?.trim() || undefined;
            return {
                id: propertyId || `${property.property}-${index}`,
                propertyId,
                name: property.property,
                price: '',
                views: property.views,
                inquiries: property.applications,
                status: formatPropertyStatusLabel(property.status || 'available'),
            };
        })
        .slice(0, 3)
);

const TopProperties = ({ analytics, loading: externalLoading = false }: TopPropertiesProps) => {
    const navigate = useNavigate();
    const [topProperties, setTopProperties] = useState<TopProperty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (analytics !== undefined) {
            setTopProperties(mapTopProperties(analytics?.propertyPerformance));
            setLoading(externalLoading);
            return;
        }

        const fetchTopProperties = async () => {
            setLoading(true);
            try {
                const res = await analyticsService.getManagerAnalytics();
                if (res.data && res.data.propertyPerformance) {
                    setTopProperties(mapTopProperties(res.data.propertyPerformance));
                } else {
                    setTopProperties([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTopProperties();
    }, [analytics, externalLoading]);

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
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
                    <p>No approved listings found. Publish a property to see top performers here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {topProperties.map((property) => (
                        <button
                            key={property.id}
                            type="button"
                            onClick={() => {
                                if (property.propertyId) {
                                    navigate(`/manager/dashboard/properties/${property.propertyId}`);
                                }
                            }}
                            className={`w-full rounded-lg p-4 bg-white dark:bg-black shadow-sm text-left ${
                                property.propertyId ? 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/70' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="body-text font-semibold text-gray-800 dark:text-white">{property.name}</h4>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 caption rounded-full whitespace-nowrap text-xs">
                                    {property.status}
                                </span>
                            </div>
                            {property.price && <p className="text-lg font-bold text-gray-800 dark:text-white mb-2">{property.price}</p>}
                            <div className="flex items-center gap-4 secondary-label text-gray-600 dark:text-gray-400 text-sm">
                                <span>{formatManagerDashboardCount(property.views)} {property.views === 1 ? 'view' : 'views'}</span>
                                <span>{formatManagerDashboardCount(property.inquiries)} {property.inquiries === 1 ? 'Inquiry' : 'Inquiries'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopProperties;
