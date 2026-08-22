"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    Bed,
    Bath,
    Maximize,
    MapPin,
    Star,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Clock,
    Eye,
} from 'lucide-react';
import ShareModal from './ShareModal';
import PropertyMediaImage from './PropertyMediaImage';
import PropertyShareAction from './PropertyShareAction';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useProperties } from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPropertyImages } from '@/lib/propertyImages';
import { getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getSavedPropertyLocationLabel } from '@/lib/savedPropertyState';
import {
    formatLaunchCurrencyForCountry,
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
    appearance?: 'default' | 'discovery';
}

const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onViewDetails,
    onStartFastTrack,
    onClick,
    showStatusBadge = false,
    showSaveAction = false,
    appearance = 'default',
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

    const isSaved = isPropertySaved(property.id);
    const viewCount = property.view_count || 0;
    const statusBadge = getManagerPropertyStatusBadge(property.status);
    const displayTitle = formatLaunchPropertyText(property.title);
    const isDiscoveryCard = appearance === 'discovery';

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

    const formatPropertyAmount = (amount: number, currencyCode?: string | null) => (
        formatLaunchCurrencyForCountry(amount, {
            countryCode: property.countryCode
                || property.country_code
                || property.country
                || property.location?.countryCode
                || property.location?.country,
            countryName: property.country || property.location?.country,
            currencyCode: currencyCode || property.currency || property.price?.currency,
        })
    );

    const formatPrice = (price: number | string | any) => {
        if (typeof price === 'object' && price !== null && 'amount' in price) {
            const { amount, currency } = price;
            const formatted = formatPropertyAmount(Number(amount), currency);

            if (property.property_type === 'rent' || property.listingType === 'rent' || property.type?.toLowerCase() === 'rent') {
                return `${formatted}/month`;
            }
            return formatted;
        }

        if (typeof price === 'number') {
            const formatted = formatPropertyAmount(price);
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

    const fastTrackAction = onStartFastTrack ? (
        <button
            type="button"
            onClick={handleStartFastTrack}
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold leading-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${isDiscoveryCard
                ? 'border border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300 hover:bg-orange-100 active:bg-orange-200 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-950/70'
                : 'bg-orange-500 text-white shadow-sm hover:bg-orange-600 hover:shadow-md active:bg-orange-700'
                }`}
        >
            <Clock size={16} className="shrink-0" />
            <span>{isDiscoveryCard ? 'Request Fast Track' : 'Request 24-Hour Fast Track'}</span>
        </button>
    ) : null;

    const viewDetailsAction = (
        <button
            type="button"
            onClick={handleViewDetails}
            className="min-h-12 w-full rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-orange-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:bg-orange-800 dark:focus:ring-offset-gray-900"
        >
            {isDiscoveryCard ? 'View home' : 'View Details'}
        </button>
    );

    return (
        <>
            <ToastNotification />

            <div
                onClick={isDiscoveryCard ? undefined : handleViewDetails}
                className={`group flex h-full flex-col overflow-hidden bg-white transition-all duration-300 dark:bg-gray-900 ${isDiscoveryCard
                    ? 'rounded-[1.5rem] border border-gray-200 shadow-[0_16px_40px_-32px_rgba(24,24,27,0.65)] hover:border-orange-200 hover:shadow-[0_22px_48px_-30px_rgba(154,52,18,0.28)] dark:border-gray-800 dark:hover:border-orange-900/60'
                    : 'cursor-pointer rounded-2xl shadow-sm hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50'
                    }`}
            >
                {/* Image Carousel */}
                <div className={`relative flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 ${isDiscoveryCard ? 'h-52 sm:h-56' : 'h-56'}`}>
                    <>
                        <PropertyMediaImage
                            src={displayImages[currentImageIndex] || PROPERTY_PLACEHOLDER_IMAGE}
                            alt={displayTitle}
                            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />

                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    onClick={prevImage}
                                    aria-label={`Show previous image for ${displayTitle}`}
                                    className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-100 shadow-md transition-opacity hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                    <ChevronLeft size={16} className="text-gray-700" />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextImage}
                                    aria-label={`Show next image for ${displayTitle}`}
                                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-100 shadow-md transition-opacity hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                    <ChevronRight size={16} className="text-gray-700" />
                                </button>

                                <div className="absolute bottom-10 left-1/2 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center justify-center overflow-x-auto">
                                    {displayImages.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentImageIndex(index);
                                            }}
                                            type="button"
                                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                                            aria-label={`Show property image ${index + 1}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`h-2 rounded-full shadow-sm transition-all ${index === currentImageIndex
                                                    ? 'w-5 bg-white'
                                                    : 'w-2 bg-white/55 group-hover:bg-white/75'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </>

                    <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col items-start gap-2 pr-2">
                            {property.type && (
                                <span className={`max-w-full truncate rounded-lg px-3 py-1.5 font-manager text-xs font-bold shadow-sm ${property.type?.toLowerCase() === 'rent'
                                    ? 'bg-blue-500 text-white'
                                    : property.type?.toLowerCase() === 'sale'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/95 text-gray-800 backdrop-blur-sm'
                                    }`}>
                                    {property.type === 'Sale' ? 'For Sale' : property.type === 'Rent' ? 'For Rent' : property.type}
                                </span>
                            )}
                            {showStatusBadge && (
                                <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-inset backdrop-blur-sm ${statusBadge.badgeClassName}`}>
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusBadge.dotClassName}`} />
                                    <span className="truncate">{statusBadge.label}</span>
                                </span>
                            )}
                        </div>

                        <div className="pointer-events-auto ml-auto flex shrink-0 gap-2">
                            {showSaveAction && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${isSaved
                                        ? 'bg-red-500 text-white shadow-lg'
                                        : 'bg-white/90 text-gray-700 shadow-sm hover:bg-white dark:bg-gray-800/90 dark:text-gray-200 dark:hover:bg-gray-800'
                                        } ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
                                    aria-label={isSaved ? `Remove ${displayTitle} from saved properties` : `Save ${displayTitle}`}
                                    title={isSaved ? 'Saved' : 'Save property'}
                                >
                                    {isSaving ? <ActionSpinner size={16} className="" /> : <Heart size={16} className={isSaved ? 'fill-current' : ''} />}
                                </button>
                            )}
                            <PropertyShareAction
                                propertyTitle={displayTitle}
                                expanded={showShareModal}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setShowShareModal(true);
                                }}
                            />
                        </div>
                    </div>

                    <div className="absolute bottom-3 left-3">
                        <span className="rounded-xl bg-white/95 px-3 py-1.5 font-display text-lg font-bold tracking-[-0.025em] text-gray-950 shadow-sm backdrop-blur-sm dark:bg-gray-900/95 dark:text-white">
                            {formatPrice(property.price)}
                        </span>
                    </div>
                    {viewCount > 0 && (
                        <div
                            className={`absolute bottom-3 right-3 flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-3 text-white shadow-lg backdrop-blur-sm ${isDiscoveryCard ? 'bg-gray-950/70' : 'bg-blue-700'}`}
                            title={`Viewed ${viewCount} time${viewCount > 1 ? 's' : ''}`}
                            aria-label={`Viewed ${viewCount} time${viewCount > 1 ? 's' : ''}`}
                            role="img"
                        >
                            <Eye size={14} aria-hidden="true" />
                            <span className="text-xs font-bold">{viewCount}</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className={`flex flex-1 flex-col ${isDiscoveryCard ? 'p-5' : 'p-4'}`}>
                    <h3 className="mb-1 line-clamp-1 font-display text-lg font-semibold tracking-[-0.025em] text-gray-950 dark:text-white">{displayTitle}</h3>
                    <p className="mb-4 flex items-center gap-1.5 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="line-clamp-1">
                            {formatLaunchPropertyLocation(
                                getSavedPropertyLocationLabel(property),
                            )}
                        </span>
                    </p>

                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
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

                    <div className="mt-auto flex flex-col gap-2 pt-4">
                        {isDiscoveryCard ? (
                            <>
                                {viewDetailsAction}
                                {fastTrackAction}
                            </>
                        ) : (
                            <>
                                {fastTrackAction}
                                {viewDetailsAction}
                            </>
                        )}
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

