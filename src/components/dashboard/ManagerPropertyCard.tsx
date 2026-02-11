"use client";

import React from 'react';
import { Star, Home as HomeIcon, Bed, Bath, Maximize, MapPin, Edit, Eye, Filter } from 'lucide-react';
import Image from 'next/image';

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
        <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="relative h-48 bg-gray-100 dark:bg-gray-900">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
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
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1 truncate">
                    <MapPin size={14} />
                    {address}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-1">
                        <Bed size={16} className="text-gray-400" />
                        <span>{beds}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Bath size={16} className="text-gray-400" />
                        <span>{baths}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Maximize size={16} className="text-gray-400" />
                        <span>{size} sqft</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit && onEdit(property.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Edit size={14} />
                        Edit
                    </button>
                    <button
                        onClick={() => onView && onView(property.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManagerPropertyCard;
