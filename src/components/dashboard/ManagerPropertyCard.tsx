"use client";

import React from 'react';
import { Home as HomeIcon, Bed, Bath, Maximize, MapPin, Edit, Eye } from 'lucide-react';
import type { ListingType, PriceInfo } from '@/contexts/PropertyContext';
import { formatPropertyInventoryCaption, getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import {
    formatLaunchCurrency,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    normalizeLaunchCurrencyText,
} from '@/lib/launchLocale';

interface ManagerPropertyCardProps {
    property: {
        id: string;
        title?: string;
        name?: string;
        address?: string;
        location?: any;
        price?: PriceInfo | number | string;
        priceString?: string;
        listingType?: ListingType;
        type?: string;
        bedrooms?: number;
        bathrooms?: number;
        area?: number;
        sqft?: number;
        status: string;
        images?: string[] | any[];
        image_urls?: unknown;
        image?: string;
        image_url?: string;
        media?: any;
        dimensions?: {
            totalFloors?: number;
            occupiedUnits?: number;
        };
        total_floors?: number;
        occupied_units?: number;
        created_at?: string;
        view_count?: number;
    };
    onEdit?: (id: string) => void;
    onView?: (id: string) => void;
}

const ManagerPropertyCard: React.FC<ManagerPropertyCardProps> = ({ property, onEdit, onView }) => {
    const title = formatLaunchPropertyText(property.title || property.name, 'Untitled Property');
    const address =
        formatLaunchPropertyLocation(
            property.address ||
            (typeof property.location === 'string'
                ? property.location
                : property.location?.addressLine1) ||
            '',
        ) || 'No Address';
    const beds = property.bedrooms || 0;
    const baths = property.bathrooms || 0;
    const size = property.area || property.sqft || 0;

    const formatPrice = (price?: PriceInfo | number | string) => {
        const isRentalListing =
            property.listingType === 'rent' ||
            property.type?.toLowerCase() === 'rent';

        if (property.priceString) {
            const normalized = normalizeLaunchCurrencyText(property.priceString);
            return isRentalListing ? `${normalized}/month` : normalized;
        }

        if (typeof price === 'object' && price !== null && 'amount' in price) {
            const formatted = formatLaunchCurrency(price.amount);
            return isRentalListing ? `${formatted}/month` : formatted;
        }

        if (typeof price === 'number') {
            const formatted = formatLaunchCurrency(price);
            return isRentalListing ? `${formatted}/month` : formatted;
        }

        if (typeof price === 'string' && price.trim()) {
            return normalizeLaunchCurrencyText(price);
        }

        return null;
    };

    const imageUrl = getPrimaryPropertyImage(property, PROPERTY_PLACEHOLDER_IMAGE);
    const statusConfig = getManagerPropertyStatusBadge(property.status);
    const inventoryCaption = formatPropertyInventoryCaption(
        property.dimensions?.totalFloors ?? property.total_floors,
        property.dimensions?.occupiedUnits ?? property.occupied_units,
    );
    const formattedPrice = formatPrice(property.price);

    return (
        <div className="bg-white dark:bg-black rounded-xl overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="relative h-48 bg-gray-100 dark:bg-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                    <HomeIcon className="w-12 h-12 text-gray-300" />
                </div>
                <img
                    src={imageUrl || PROPERTY_PLACEHOLDER_IMAGE}
                    alt={title}
                    className="relative h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(event) => {
                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                    }}
                />

                <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-inset backdrop-blur-sm ${statusConfig.badgeClassName}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClassName}`} />
                        <span>{statusConfig.label}</span>
                    </span>
                </div>

                {property.view_count !== undefined && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        <Eye size={12} />
                        {property.view_count}
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h2 className="min-w-0 flex-1 break-words text-lg font-bold leading-tight text-gray-900 dark:text-white">{title}</h2>
                    {formattedPrice && (
                        <p className="font-display font-bold text-lg text-orange-600 dark:text-orange-500 whitespace-nowrap">
                            {formattedPrice}
                        </p>
                    )}
                </div>

                <p className="mb-4 flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 break-words">{address}</span>
                </p>

                {inventoryCaption && (
                    <div className="mb-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {inventoryCaption}
                    </div>
                )}

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
