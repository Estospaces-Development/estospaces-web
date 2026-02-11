"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, TrendingUp, Star, Clock, Zap, Eye } from 'lucide-react';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';

interface PropertyDiscoverySectionProps {
    title: string;
    description?: string;
    icon?: any;
    properties?: any[];
    loading?: boolean;
    error?: string | null;
    badge?: { type: string; label?: string } | null;
    viewAllLink?: string;
    emptyMessage?: string;
    limit?: number;
}

const PropertyDiscoverySection: React.FC<PropertyDiscoverySectionProps> = ({
    title,
    description,
    icon: Icon,
    properties = [],
    loading = false,
    error = null,
    badge = null,
    viewAllLink = '/user/dashboard/discover',
    emptyMessage = 'No properties found in this section.',
    limit = 6,
}) => {
    const router = useRouter();

    // Transform property for card display
    const transformPropertyForCard = (property: any) => {
        if (!property) return null;

        let images: string[] = [];
        if (property.image_urls) {
            if (Array.isArray(property.image_urls)) {
                images = property.image_urls;
            } else if (typeof property.image_urls === 'string') {
                try {
                    images = JSON.parse(property.image_urls);
                } catch (e) {
                    images = [];
                }
            }
        }

        const locationParts = [
            property.address_line_1,
            property.city,
            property.postcode,
        ].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : 'UK';

        return {
            id: property.id,
            title: property.title || 'Property',
            location: location,
            price: property.price || 0,
            type: property.property_type === 'rent' ? 'Rent' : property.property_type === 'sale' ? 'Sale' : 'Property',
            property_type: property.property_type,
            beds: property.bedrooms || 0,
            baths: property.bathrooms || 0,
            area: property.property_size_sqm || null,
            image: images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
            description: property.description || '',
            is_saved: property.is_saved || false,
            is_applied: property.is_applied || false,
            application_status: property.application_status || null,
            view_count: property.view_count || 0,
            latitude: property.latitude,
            longitude: property.longitude,
            listedDate: property.created_at ? new Date(property.created_at) : new Date(),
            featured: property.featured || false,

            trending: property.trending || false,
            recently_added: property.recently_added || false,
            high_demand: property.high_demand || false,
            applications_count: property.applications_count || 0,
        };
    };

    const displayedProperties = useMemo(() => {
        return (properties || []).slice(0, limit).map(transformPropertyForCard).filter(Boolean);
    }, [properties, limit]);

    const renderBadge = () => {
        if (!badge) return null;

        switch (badge.type) {
            case 'trending':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-semibold">
                        <TrendingUp size={12} />
                        Trending
                    </span>
                );
            case 'new':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                        <Clock size={12} />
                        New
                    </span>
                );
            case 'high-demand':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold">
                        <Zap size={12} />
                        High Demand
                    </span>
                );
            case 'most-viewed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                        <Eye size={12} />
                        Most Viewed
                    </span>
                );
            case 'featured':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                        <Star size={12} />
                        Featured
                    </span>
                );
            default:
                return null;
        }
    };

    if (error) {
        return (
            <div className="mb-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 lg:mb-12">
            {/* Section Header */}
            <div className="flex items-start justify-between mb-4 lg:mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {Icon && (
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Icon className="text-orange-600 dark:text-orange-400" size={20} />
                            </div>
                        )}
                        <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            {title}
                        </h2>
                        {renderBadge()}
                    </div>
                    {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                            {description}
                        </p>
                    )}
                </div>
                {displayedProperties.length > 0 && (
                    <button
                        onClick={() => router.push(viewAllLink)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors whitespace-nowrap"
                    >
                        <span>View All</span>
                        <ArrowRight size={16} />
                    </button>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {[1, 2, 3].map((i) => (
                        <PropertyCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && displayedProperties.length === 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8 lg:p-12 text-center">
                    <div className="max-w-md mx-auto">
                        {Icon && (
                            <div className="mb-4 flex justify-center">
                                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                                    <Icon className="text-gray-400 dark:text-gray-500" size={32} />
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No Properties Found
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {emptyMessage}
                        </p>
                        <button
                            onClick={() => router.push(viewAllLink)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Browse All Properties
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Properties Grid */}
            {!loading && displayedProperties.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {displayedProperties.map((property: any) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                                onViewDetails={(prop: any) => router.push(`/user/dashboard/property/${prop.id}`)}
                            />
                        ))}
                    </div>

                    {/* Mobile View All Button */}
                    {displayedProperties.length >= limit && (
                        <div className="mt-4 sm:hidden">
                            <button
                                onClick={() => router.push(viewAllLink)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                            >
                                <span>View All Properties</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PropertyDiscoverySection;
