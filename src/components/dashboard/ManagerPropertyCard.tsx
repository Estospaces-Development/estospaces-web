"use client";

import React from 'react';
import { Star, Home as HomeIcon, Bed, Bath, Maximize, MapPin, Edit, Eye, Filter } from 'lucide-react';
;

interface ManagerPropertyCardProps {
    property: {
        id: string;
        title?: string;
        name?: string;
        address?: string;
        location?: any; // could be object or string in some contexts
        price?: number;
        bedrooms?: number;
        bathrooms?: number;
        area?: number;
        sqft?: number;
        status: string;
        images?: string[] | any[];
        image?: string;
        media?: any;
        rating?: number;
        reviews?: number;
        created_at?: string;
        view_count?: number;
    };
    onEdit?: (id: string) => void;
    onView?: (id: string) => void;
}

const ManagerPropertyCard: React.FC<ManagerPropertyCardProps> = ({ property, onEdit, onView }) => {
    // Safe accessors
    const title = property.title || property.name || 'Untitled Property';
    const address = property.address || (typeof property.location === 'string' ? property.location : property.location?.addressLine1) || 'No Address';
    const beds = property.bedrooms || 0;
    const baths = property.bathrooms || 0;
    const size = property.area || property.sqft || 0;

    // Image logic
    const getImage = () => {
        if (property.images && Array.isArray(property.images) && property.images.length > 0) return property.images[0];
        if (property.image) return property.image;
        // Handle specific media structure if present
        if (property.media?.images?.[0]?.url) return property.media.images[0].url;
        return null;
    };
    const imageUrl = getImage();

    // Status Colors
    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || 'draft';
        switch (s) {
            case 'online':
            case 'active':
            case 'published':
                return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' };
            case 'draft':
                return { bg: 'bg-gray-500/10', text: 'text-gray-600', dot: 'bg-gray-500' };
            case 'under_offer':
                return { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500' };
            case 'sold':
                return { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' };
            case 'let':
                return { bg: 'bg-purple-500/10', text: 'text-purple-600', dot: 'bg-purple-500' };
            default:
                return { bg: 'bg-gray-500/10', text: 'text-gray-600', dot: 'bg-gray-500' };
        }
    };

    const statusConfig = getStatusColor(property.status);
    const statusLabel = property.status?.replace(/_/g, ' ') || 'Draft';

    return (
        <div className="bg-white dark:bg-black rounded-xl overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="relative h-48 bg-gray-100 dark:bg-gray-900">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}

                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <HomeIcon className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm shadow-sm ${statusConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                        <span className="capitalize">{statusLabel}</span>
                    </span>
                </div>

                {/* View Count */}
                {property.view_count !== undefined && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        <Eye size={12} />
                        {property.view_count}
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate flex-1 pr-2">{title}</h3>
                    {property.price !== undefined && (
                        <p className="font-display font-bold text-lg text-orange-600 dark:text-orange-500 whitespace-nowrap">
                            £{property.price.toLocaleString()}
                        </p>
                    )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1.5 truncate">
                    <MapPin size={14} className="flex-shrink-0 text-gray-400" />
                    {address}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-5 py-3">
                    <div className="flex items-center gap-1.5" title="Bedrooms">
                        <Bed size={16} className="text-gray-400" />
                        <span className="font-medium">{beds}</span> <span className="text-xs text-gray-400 hidden sm:inline">Beds</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex items-center gap-1.5" title="Bathrooms">
                        <Bath size={16} className="text-gray-400" />
                        <span className="font-medium">{baths}</span> <span className="text-xs text-gray-400 hidden sm:inline">Baths</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex items-center gap-1.5" title="Area">
                        <Maximize size={16} className="text-gray-400" />
                        <span className="font-medium">{size}</span> <span className="text-xs text-gray-400 hidden sm:inline">sqft</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(property.id); }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Edit size={16} />
                        Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onView && onView(property.id); }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        <Eye size={16} />
                        View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManagerPropertyCard;

