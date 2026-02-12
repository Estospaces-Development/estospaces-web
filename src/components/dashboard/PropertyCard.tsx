"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    Eye,
} from 'lucide-react';
import VirtualTourModal from './VirtualTourModal';
import ShareModal from './ShareModal';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useProperties } from '@/contexts/PropertyContext'; // Updated import
import { useApplications } from '@/contexts/ApplicationsContext';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyCardProps {
    property: any;
    onViewDetails?: (property: any) => void;
    onClick?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onViewDetails, onClick }) => {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showVirtualTour, setShowVirtualTour] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveToastMessage, setSaveToastMessage] = useState('');
    const [showSaveToast, setShowSaveToast] = useState(false);

    const { toggleProperty, isPropertySaved } = useSavedProperties();
    const { user } = useAuth();
    // useProperty hook might differ from legacy useProperties, assume context provides needed fns or we skip tracking for now if complex
    // const { trackPropertyView } = useProperty(); 
    const { allApplications } = useApplications();

    const isSaved = isPropertySaved(property.id);
    const existingApplication = allApplications.find(app => app.propertyId === property.id);
    const isApplied = !!existingApplication || property.is_applied || false;
    const applicationStatus = existingApplication?.status || property.application_status || null;
    const viewCount = property.view_count || 0;

    const handleViewDetails = (e: React.MouseEvent) => {
        e?.stopPropagation();
        // if (user) trackPropertyView(property.id); // Implement later

        if (onClick) {
            onClick();
        } else if (onViewDetails) {
            onViewDetails(property);
        } else {
            router.push(`/user/dashboard/property/${property.id}`);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

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

    // Helper to get images
    const getPropertyImages = () => {
        const imagesList = property.images || property.image_urls;
        if (imagesList && Array.isArray(imagesList) && imagesList.length > 0) {
            return imagesList.slice(0, 4);
        }

        if (typeof property.images === 'string') {
            try {
                const parsed = JSON.parse(property.images);
                if (Array.isArray(parsed)) return parsed.slice(0, 4);
            } catch { }
            if (property.images.startsWith('http')) return [property.images];
        }

        const singleImage = property.image || property.image_url || property.thumbnail_url || property.photo || property.main_image;
        return singleImage ? [singleImage] : [];
    };

    const images = getPropertyImages();
    const hasMultipleImages = images.length > 1;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const formatPrice = (price: number | string | any) => {
        if (typeof price === 'object' && price !== null && 'amount' in price) {
            const { amount, currency } = price;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency || 'USD',
                maximumFractionDigits: 0
            }).format(amount);

            if (property.property_type === 'rent' || property.listingType === 'rent' || property.type?.toLowerCase() === 'rent') {
                return `${formatted}/month`;
            }
            return formatted;
        }

        if (typeof price === 'number') {
            const formatted = `£${price.toLocaleString('en-GB')}`;
            if (property.property_type === 'rent' || property.type?.toLowerCase() === 'rent') {
                return `${formatted}/month`;
            }
            return formatted;
        }
        return price;
    };

    // Toast Component
    const ToastNotification = () => {
        if (!showSaveToast) return null;
        return (
            <div
                className="fixed bottom-8 left-1/2 z-[99999] pointer-events-auto transform -translate-x-1/2"
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
                className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1.5 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all duration-300 group cursor-pointer h-full flex flex-col"
            >
                {/* Image Carousel */}
                <div className="relative h-56 bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {images.length > 0 ? (
                        <>
                            <Image
                                src={images[currentImageIndex]}
                                alt={property.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={property.featured}
                            />

                            {hasMultipleImages && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                        <ChevronLeft size={16} className="text-gray-700" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                        <ChevronRight size={16} className="text-gray-700" />
                                    </button>

                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(index);
                                                }}
                                                className={`h-1.5 rounded-full transition-all ${index === currentImageIndex
                                                    ? 'bg-white w-4'
                                                    : 'bg-white/50 w-1.5 hover:bg-white/75'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">No Image</span>
                        </div>
                    )}

                    {/* Property Type Badge */}
                    {property.type && (
                        <div className="absolute top-3 left-3">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${property.type?.toLowerCase() === 'rent'
                                ? 'bg-blue-500 text-white'
                                : property.type?.toLowerCase() === 'sale'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/95 backdrop-blur-sm text-gray-800'
                                }`}>
                                {property.type === 'Sale' ? 'For Sale' : property.type === 'Rent' ? 'For Rent' : property.type}
                            </span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`p-2 rounded-full backdrop-blur-sm transition-all ${isSaved
                                ? 'bg-red-500 text-white'
                                : 'bg-white/90 dark:bg-white/90 text-gray-700 dark:text-gray-800 hover:bg-white dark:hover:bg-white'
                                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Heart size={16} className={isSaved ? 'fill-current' : ''} />
                        </button>
                        {isApplied && (
                            <button
                                className="p-2 rounded-full backdrop-blur-sm bg-green-500 text-white"
                                title={`Applied - ${applicationStatus}`}
                            >
                                <CheckCircle size={16} className="fill-current" />
                            </button>
                        )}
                        {viewCount > 0 && (
                            <div className="p-2 rounded-full backdrop-blur-sm bg-blue-500 text-white flex items-center gap-1">
                                <Eye size={14} />
                                <span className="text-xs font-medium">{viewCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-3 left-3">
                        <span className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-md font-bold text-lg">
                            {formatPrice(property.price)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{property.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="line-clamp-1">
                            {typeof property.location === 'string'
                                ? property.location
                                : (property.address || property.location?.addressLine1 || property.location?.city || 'Location unavailable')}
                        </span>
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {property.beds && (
                            <div className="flex items-center gap-1">
                                <Bed size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.beds} Bed{property.beds > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {property.baths && (
                            <div className="flex items-center gap-1">
                                <Bath size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.baths} Bath{property.baths > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {property.area && (
                            <div className="flex items-center gap-1">
                                <Maximize size={16} className="text-gray-400 dark:text-gray-500" />
                                <span>{property.area} sqft</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowVirtualTour(true);
                            }}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium transition-all"
                        >
                            Virtual Tour
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowShareModal(true);
                            }}
                            className="p-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl transition-all"
                        >
                            <Share2 size={16} />
                        </button>
                        <button
                            onClick={handleViewDetails}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl font-medium text-xs transition-all shadow-sm"
                        >
                            View Details
                        </button>
                    </div>
                </div>
            </div>

            {showVirtualTour && (
                <VirtualTourModal
                    property={property}
                    onClose={() => setShowVirtualTour(false)}
                />
            )}

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
