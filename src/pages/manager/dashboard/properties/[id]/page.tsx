"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Edit, Trash2, MapPin, Home, Calendar, Copy, Share2, Heart,
    Bed, Bath, Car, Maximize, Building, DollarSign, CheckCircle, X,
    Phone, Mail, Globe, Shield, Star, TrendingUp, Eye, MessageCircle,
    ChevronLeft, ChevronRight, Clock, User, FileText, Verified, Settings,
    Send, Video, Camera
} from 'lucide-react';
import { useProperties } from '@/contexts/PropertyContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useAuth } from '@/contexts/AuthContext';
import VirtualTourViewer from '@/components/virtual-tour/VirtualTourViewer';
import ShareModal from '@/components/dashboard/ShareModal';

// Helper for currency formatting
const formatPrice = (price: any) => {
    if (!price) return 'Price on Request';
    const amount = typeof price === 'number' ? price : price?.amount || 0;
    const currency = typeof price === 'object' ? price?.currency || 'GBP' : 'GBP';

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatArea = (area: number, unit: string = 'sqft') => {
    return `${area.toLocaleString()} ${unit}`;
};

export default function PropertyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { getProperty, deleteProperty, updateProperty, duplicateProperty } = useProperties();
    const { toggleProperty, isPropertySaved } = useSavedProperties();
    const { user } = useAuth();

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'virtual-tour' | 'location'>('details');

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });

    // Track if view has been counted for this session
    const viewCountedRef = useRef(false);

    const property = id ? getProperty(id) : undefined;
    const isFavorited = id ? isPropertySaved(id) : false;

    // Get virtual tour
    const defaultVirtualTour = null;

    // Increment views on mount - only once per session per property
    useEffect(() => {
        if (id && !viewCountedRef.current && property) {
            const viewedKey = `property_viewed_${id}`;
            const alreadyViewed = sessionStorage.getItem(viewedKey);

            if (!alreadyViewed) {
                // Increment view count
                updateProperty(id, {
                    ...property,
                    analytics: {
                        ...property.analytics,
                        views: (property.analytics?.views || 0) + 1
                    }
                });
                sessionStorage.setItem(viewedKey, 'true');
            }
            viewCountedRef.current = true;
        }
    }, [id, property]);

    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    if (!property) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <Home className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Property not found</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">The property you're looking for doesn't exist or has been removed.</p>
                <button
                    onClick={() => navigate('/manager/dashboard/properties')}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Properties
                </button>
            </div>
        );
    }

    const handleDelete = async () => {
        if (id) {
            await deleteProperty(id);
            navigate('/manager/dashboard/properties');
        }
    };

    const handleDuplicate = async () => {
        if (id) {
            const duplicate = await duplicateProperty(id);
            if (duplicate) {
                navigate(`/manager/dashboard/properties/edit/${duplicate.id}`);
            }
        }
    };

    const handlePublish = async () => {
        if (!id || !property) return;

        setPublishing(true);
        try {
            const updatedProperty = await updateProperty(id, {
                ...property,
                status: 'published',
                published: true,
                draft: false,
            });

            if (updatedProperty) {
                setToast({
                    message: 'Property published successfully!',
                    type: 'success',
                    visible: true,
                });
                // In React Router, we don't have router.refresh(). 
                // Since this component uses context state (useProperties), 
                // the updateProperty call should already trigger a re-render.
            } else {
                setToast({
                    message: 'Failed to publish property. Please try again.',
                    type: 'error',
                    visible: true,
                });
            }
        } catch (error: any) {
            console.error('Error publishing property:', error);
            setToast({
                message: `Failed to publish property: ${error?.message || 'Unknown error'}`,
                type: 'error',
                visible: true,
            });
        } finally {
            setPublishing(false);
        }
    };

    const handleFavoriteToggle = async () => {
        if (!property || !id) {
            setToast({
                message: 'Property not found',
                type: 'error',
                visible: true
            });
            return;
        }

        try {
            const result = await toggleProperty(id);

            if (result?.success) {
                setToast({
                    message: isFavorited ? 'Removed from favorites' : 'Added to favorites',
                    type: 'success',
                    visible: true
                });
            } else {
                setToast({
                    message: result?.error || 'Failed to update favorites',
                    type: 'error',
                    visible: true
                });
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
            setToast({
                message: 'An error occurred. Please try again.',
                type: 'error',
                visible: true
            });
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            online: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            offline: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
            draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            under_offer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            sold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            let: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        };
        return colors[status] || colors.online;
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // Get images from the property
    const images = property.media?.images?.map(img => img.url) ||
        property.images?.filter((img): img is string => typeof img === 'string') || [];

    // Get videos from the property  
    const videos = property.media?.videos?.map(vid => vid.url) ||
        property.videos?.filter((vid): vid is string => typeof vid === 'string') || [];

    return (
        <div className="max-w-7xl mx-auto space-y-6 font-sans p-4 lg:p-6 pb-8">
            {/* Toast Notification */}
            {toast.visible && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    } text-white font-medium`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button
                    onClick={() => navigate('/manager/dashboard/properties')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors w-fit"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Properties
                </button>
                <div className="flex flex-wrap gap-2">
                    {/* Favorite */}
                    <button
                        onClick={handleFavoriteToggle}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isFavorited
                            ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <Heart className={`w-5 h-5 ${isFavorited ? '-current' : ''}`} />
                        <span className="hidden sm:inline">{isFavorited ? 'Saved' : 'Favorite'}</span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Share2 className="w-5 h-5" />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Duplicate */}
                    <button
                        onClick={handleDuplicate}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Copy className="w-5 h-5" />
                        <span className="hidden sm:inline">Duplicate</span>
                    </button>

                    {/* Edit */}
                    <button
                        onClick={() => navigate(`/manager/dashboard/properties/edit/${id}`)}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                        <Edit className="w-5 h-5" />
                        <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete */}
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'details'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    Property Details
                    {activeTab === 'details' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 dark:bg-orange-400"></div>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('virtual-tour')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'virtual-tour'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    Virtual Tour
                    {defaultVirtualTour && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                    {activeTab === 'virtual-tour' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 dark:bg-orange-400"></div>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('location')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'location'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    Location & Street View
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {activeTab === 'location' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 dark:bg-orange-400"></div>
                    )}
                </button>
            </div>

            {/* Main Content - Details Tab */}
            {activeTab === 'details' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Images & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image Gallery */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                            {images.length > 0 ? (
                                <div className="relative">
                                    <div
                                        className="aspect-video bg-gray-100 dark:bg-gray-800 cursor-pointer relative"
                                        onClick={() => setShowImageModal(true)}
                                    >
                                        <img
                                            src={images[currentImageIndex]}
                                            alt={`${property.title} - Image ${currentImageIndex + 1}`}

                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Navigation Arrows */}
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                                                }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
                                            >
                                                <ChevronLeft size={24} className="text-gray-800" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                                                }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
                                            >
                                                <ChevronRight size={24} className="text-gray-800" />
                                            </button>
                                        </>
                                    )}

                                    {/* Image Counter */}
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm z-10">
                                        {currentImageIndex + 1} / {images.length}
                                    </div>

                                    {/* Thumbnails */}
                                    {images.length > 1 && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
                                            <div className="flex gap-2">
                                                {images.map((image, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setCurrentImageIndex(index)}
                                                        className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all relative ${index === currentImageIndex
                                                            ? 'border-orange-600 shadow-lg'
                                                            : 'border-transparent opacity-70 hover:opacity-100'
                                                            }`}
                                                    >
                                                        <img
                                                            src={image}
                                                            alt={`Thumbnail ${index + 1}`}

                                                            className="object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-gray-500">No images available</p>
                                </div>
                            )}
                        </div>

                        {/* Videos Section */}
                        {videos.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Video className="w-5 h-5 text-orange-600" />
                                        Property Videos ({videos.length})
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {videos.map((videoUrl, index) => (
                                        <div key={index} className="relative">
                                            <video
                                                src={videoUrl}
                                                controls
                                                className="w-full rounded-lg"
                                                style={{ maxHeight: '600px' }}
                                                preload="metadata"
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Property Details */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                            {/* Title & Price */}
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                                        {property.title}
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-orange-600" />
                                        {property.location?.addressLine1 || property.address}, {property.location?.city || property.city}, {property.location?.state || property.state}
                                        {property.location?.country && `, ${property.location.country}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-orange-600">
                                        {property.price?.amount
                                            ? formatPrice(property.price)
                                            : property.priceString || 'Price on Request'}
                                    </p>
                                    {property.listingType === 'rent' && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">per month</p>
                                    )}
                                    {property.price?.negotiable && (
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            Price Negotiable
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Key Specs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-gray-200 dark:border-gray-700">
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Bed className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {property.rooms?.bedrooms || property.bedrooms || 0}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Bedrooms</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Bath className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {property.rooms?.bathrooms || property.bathrooms || 0}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Bathrooms</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Maximize className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {formatArea(
                                            property.dimensions?.totalArea || property.area || 0,
                                            property.dimensions?.areaUnit || 'sqft'
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Area</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Car className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {property.rooms?.parkingSpaces || 0}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Parking</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Description</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                    {property.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Amenities */}
                            {(property.amenities?.interior?.length || property.amenities?.exterior?.length || property.amenities?.community?.length) && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-orange-600" />
                                        Amenities
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            ...(property.amenities?.interior || []),
                                            ...(property.amenities?.exterior || []),
                                            ...(property.amenities?.community || [])
                                        ].map((amenity, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <CheckCircle size={16} className="text-orange-600" />
                                                <span className="capitalize text-sm">{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-orange-600" />
                                Quick Actions
                            </h3>

                            <div className="space-y-3">
                                {/* Publish Property Button - Show only when status is draft or draft flag is true */}
                                {(property.status === 'draft' || property.draft === true) && (
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        <Send className="w-5 h-5" />
                                        {publishing ? 'Publishing...' : 'Publish Property'}
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate(`/manager/dashboard/properties/edit/${id}`)}
                                    className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-5 h-5" />
                                    Edit Property
                                </button>

                                <button
                                    onClick={handleDuplicate}
                                    className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Copy className="w-5 h-5" />
                                    Duplicate Listing
                                </button>

                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Share Property
                                </button>

                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-3 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete Property
                                </button>
                            </div>
                        </div>

                        {/* Property Status Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-orange-600" />
                                Listing Status
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Current Status</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(property.status)}`}>
                                        {formatStatus(property.status)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Listing Type</span>
                                    <span className="text-gray-800 dark:text-white font-medium capitalize">
                                        For {property.listingType}
                                    </span>
                                </div>

                                {property.createdAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Listed On</span>
                                        <span className="text-gray-800 dark:text-white font-medium">
                                            {new Date(property.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                {property.updatedAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                                        <span className="text-gray-800 dark:text-white font-medium">
                                            {new Date(property.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Analytics Card */}
                        {property.analytics && (
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-orange-600" />
                                    Property Analytics
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{property.analytics.views || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <MessageCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{property.analytics.inquiries || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Inquiries</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{property.analytics.favorites || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Favorites</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Share2 className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{property.analytics.shares || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Shares</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Virtual Tour Tab */}
            {activeTab === 'virtual-tour' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden" style={{ minHeight: '600px' }}>
                    {defaultVirtualTour ? (
                        <VirtualTourViewer
                            tour={defaultVirtualTour}
                            onClose={() => setActiveTab('details')}
                            embedded={true}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '600px' }}>
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <Camera size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Virtual Tour Available</h3>
                            <p className="text-gray-500 max-w-sm">This property doesn't have a virtual tour yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="text-orange-600" size={20} />
                            <h3 className="font-bold text-gray-900 dark:text-white">Location</h3>
                        </div>
                    </div>
                    <div className="aspect-video relative bg-gray-100 dark:bg-gray-900">
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${property.location?.latitude || 51.505},${property.location?.longitude || -0.09}&z=14&output=embed`}
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    property={{
                        id: property.id,
                        title: property.title,
                        city: property.location?.city
                    }}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Property?</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this property? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleDelete();
                                    setShowDeleteConfirm(false);
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
