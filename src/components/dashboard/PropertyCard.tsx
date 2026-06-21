"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    Bed,
    Bath,
    Maximize,
    MapPin,
    Star,
    Share2,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Clock,
    Eye,
    Loader2,
} from 'lucide-react';
import ShareModal from './ShareModal';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useProperties } from '@/contexts/PropertyContext';
import { useApplications } from '@/contexts/ApplicationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPropertyImages } from '@/lib/propertyImages';
import { getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getSavedPropertyLocationLabel } from '@/lib/savedPropertyState';
import {
    formatLaunchCurrency,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    normalizeLaunchCurrencyText,
} from '@/lib/launchLocale';

interface PropertyCardProps {
    property: any;
    onViewDetails?: (property: any) => void;
    onStartFastTrack?: (property: any) => void;
    onClick?: () => void;
    showStatusBadge?: boolean;
    showSaveAction?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onViewDetails,
    onStartFastTrack,
    onClick,
    showStatusBadge = false,
    showSaveAction = true,
}) => {
    const navigate = useNavigate();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveToastMessage, setSaveToastMessage] = useState('');
    const [showSaveToast, setShowSaveToast] = useState(false);

    const { toggleProperty, isPropertySaved } = useSavedProperties();
    const { user } = useAuth();
    const { incrementViews } = useProperties();
    const { allApplications } = useApplications();

    const isSaved = isPropertySaved(property.id);
    const existingApplication = allApplications.find(app => app.propertyId === property.id);
    const isApplied = !!existingApplication || property.is_applied || false;
    const applicationStatus = existingApplication?.status || property.application_status || null;
    const viewCount = property.view_count || 0;
    const statusBadge = getManagerPropertyStatusBadge(property.status);
    const displayTitle = formatLaunchPropertyText(property.title);

    const handleViewDetails = (e: React.MouseEvent) => {
        e?.stopPropagation();
        if (user) incrementViews(property.id);

        if (onClick) {
            onClick();
        } else if (onViewDetails) {
            onViewDetails(property);
        } else {
            navigate(`/user/properties/${property.id}`);
        }
    };

    const handleStartFastTrack = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onStartFastTrack) {
            onStartFastTrack(property);
        } else {
            navigate(`/user/properties/${property.id}?fast-track=1`);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isSaving) {
            return;
        }

        const wasAlreadySaved = isSaved;
        setIsSaving(true);

        try {
            await toggleProperty(property);

            const message = wasAlreadySaved ? 'Property removed from saved' : 'Property saved successfully!';
            setSaveToastMessage(message);
            setShowSaveToast(true);

            setTimeout(() => setShowSaveToast(false), 3000);
        } catch (err) {
            console.error('Error saving property:', err);
            setSaveToastMessage('Failed to save property');
            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const images = getPropertyImages(property);
    const displayImages = images.length > 0 ? images : [PROPERTY_PLACEHOLDER_IMAGE];
    const hasMultipleImages = images.length > 1;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    const formatPrice = (price: number | string | any) => {
        if (typeof price === 'object' && price !== null && 'amount' in price) {
            const { amount } = price;
            const formatted = formatLaunchCurrency(Number(amount));

            if (property.property_type === 'rent' || property.listingType === 'rent' || property.type?.toLowerCase() === 'rent') {
                return `${formatted}/month`;
            }
            return formatted;
        }

        if (typeof price === 'number') {
            const formatted = formatLaunchCurrency(price);
            if (property.property_type === 'rent' || property.type?.toLowerCase() === 'rent') {
                return `${formatted}/month`;
            }
            return formatted;
        }
        return typeof price === 'string' ? normalizeLaunchCurrencyText(price) : price;
    };

    const formatListedDate = (date: string | Date) => {
        if (!date) return '';
        const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Listed today';
        if (days === 1) return 'Listed 1 day ago';
        if (days < 7) return `Listed ${days} days ago`;
        if (days < 14) return 'Listed 1 week ago';
        return `Listed ${Math.floor(days / 7)} weeks ago`;
    };

    // Toast Component
    const ToastNotification = () => {
        if (!showSaveToast) return null;
        return (
            <div
                className="fixed bottom-8 left-1/2 z-[99999] pointer-events-auto transform -translate-x-1/2"
                role="status"
                aria-live="polite"
            >
                <div
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${saveToastMessage.includes('removed') || saveToastMessage.includes('Failed')
                        ? 'bg-gray-900 text-white'
                        : 'bg-green-500 text-white'
                        }`}
                >
                    {saveToastMessage.includes('removed') ? (
                        <Heart size={24} className="text-white flex-shrink-0" />
                    ) : saveToastMessage.includes('Failed') ? (
                        <span className="text-xl">⚠️</span>
                    ) : (
                        <CheckCircle size={24} className="text-white flex-shrink-0" />
                    )}
                    <span className="font-bold text-base whitespace-nowrap">{saveToastMessage}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSaveToast(false);
                        }}
                        className="ml-3 text-white/80 hover:text-white transition-colors text-xl font-bold"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <ToastNotification />

            <div
                onClick={handleViewDetails}
                className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer h-full flex flex-col"
            >
                {/* Image Carousel */}
                <div className="relative h-56 bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    <>
                        <img
                            src={displayImages[currentImageIndex] || PROPERTY_PLACEHOLDER_IMAGE}
                            alt={displayTitle}
                            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onError={(event) => {
                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                            }}
                        />

                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    onClick={prevImage}
                                    aria-label={`Show previous image for ${displayTitle}`}
                                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-100 shadow-md transition-opacity hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                    <ChevronLeft size={16} className="text-gray-700" />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextImage}
                                    aria-label={`Show next image for ${displayTitle}`}
                                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-100 shadow-md transition-opacity hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                    <ChevronRight size={16} className="text-gray-700" />
                                </button>

                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {displayImages.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentImageIndex(index);
                                            }}
                                            className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${index === currentImageIndex
                                                ? 'bg-white w-5'
                                                : 'bg-white/50 w-2 hover:bg-white/75'
                                                }`}
                                            aria-label={`Show property image ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>

                    {(property.type || showStatusBadge) && (
                        <div className="absolute top-3 left-3 right-16 flex flex-col items-start gap-2">
                            {property.type && (
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold font-manager shadow-sm ${property.type?.toLowerCase() === 'rent'
                                    ? 'bg-blue-500 text-white'
                                    : property.type?.toLowerCase() === 'sale'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/95 backdrop-blur-sm text-gray-800'
                                    }`}>
                                    {property.type === 'Sale' ? 'For Sale' : property.type === 'Rent' ? 'For Rent' : property.type}
                                </span>
                            )}
                            {showStatusBadge && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-inset backdrop-blur-sm ${statusBadge.badgeClassName}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClassName}`} />
                                    <span>{statusBadge.label}</span>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {(showSaveAction || isApplied || viewCount > 0) && (
                    <div className="absolute top-3 right-3 flex gap-2">
                        {showSaveAction && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`p-2 rounded-full backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${isSaved
                                    ? 'bg-red-500 text-white shadow-lg'
                                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 shadow-sm'
                                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label={isSaved ? `Remove ${displayTitle} from saved properties` : `Save ${displayTitle}`}
                                title={isSaved ? 'Saved' : 'Save property'}
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} className={isSaved ? 'fill-current' : ''} />}
                            </button>
                        )}
                        {isApplied && (
                            <button
                                className="p-2 rounded-full backdrop-blur-sm bg-green-500 text-white shadow-lg"
                                title={`Applied - ${applicationStatus}`}
                                aria-label="Already applied"
                            >
                                <CheckCircle size={16} className="fill-current" />
                            </button>
                        )}
                        {viewCount > 0 && (
                            <div
                                className="p-2 rounded-full backdrop-blur-sm bg-blue-700 text-white flex items-center gap-1 shadow-lg"
                                title={`Viewed ${viewCount} time${viewCount > 1 ? 's' : ''}`}
                            >
                                <Eye size={14} />
                                <span className="text-[10px] font-bold">{viewCount}</span>
                            </div>
                        )}
                    </div>
                    )}

                    <div className="absolute bottom-3 left-3">
                        <span className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-900 dark:text-white px-3 py-1.5 rounded-xl font-bold font-manager text-lg shadow-sm">
                            {formatPrice(property.price)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{displayTitle}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="line-clamp-1">
                            {formatLaunchPropertyLocation(
                                typeof property.location === 'string'
                                    ? property.location
                                    : getSavedPropertyLocationLabel(property),
                            )}
                        </span>
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {property.bedrooms && (
                            <div className="flex items-center gap-1">
                                <Bed size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {property.bathrooms && (
                            <div className="flex items-center gap-1">
                                <Bath size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {property.area && (
                            <div className="flex items-center gap-1">
                                <Maximize size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.area} sqft</span>
                            </div>
                        )}
                    </div>

                    {/* Rating & Date */}
                    {(property.rating || property.createdAt) && (
                        <div className="flex items-center gap-2 mb-3">
                            {property.rating && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{property.rating}</span>
                                    {property.reviews_count && (
                                        <span className="text-[10px] text-yellow-600/60 dark:text-yellow-400/60">({property.reviews_count})</span>
                                    )}
                                </div>
                            )}
                            {(property.createdAt || property.listedDate) && (
                                <span className="text-[10px] text-gray-400 font-medium ml-auto">
                                    {formatListedDate(property.createdAt || property.listedDate)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    {property.tags && Array.isArray(property.tags) && property.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                            {property.tags.slice(0, 3).map((tag: string, index: number) => (
                                <span
                                    key={index}
                                    className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-md"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto pt-4">
                        {onStartFastTrack && (
                            <button
                                onClick={handleStartFastTrack}
                                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-200 hover:bg-orange-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:bg-orange-700 dark:focus:ring-offset-gray-900"
                            >
                                <Clock size={16} className="shrink-0" />
                                <span>Start 24-Hour Fast Track</span>
                            </button>
                        )}
                        <div className="flex gap-2">
                        <button
                            onClick={handleViewDetails}
                            className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-orange-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:bg-orange-700 dark:focus:ring-offset-gray-900"
                        >
                            View Details
                        </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                setShowShareModal(true);
                            }}
                            className="rounded-xl bg-gray-50 p-2.5 text-gray-600 transition-all duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
                            title="Share Property"
                        >
                            <Share2 size={16} />
                        </button>
                        </div>
                    </div>
                </div>
            </div>

                {showShareModal && (
                    <ShareModal
                    property={property}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </>
    );
};

export default React.memo(PropertyCard);

