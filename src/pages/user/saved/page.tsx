"use client";

import React, { useState, useEffect } from 'react';
import {
    Heart,
    MapPin,
    Trash2,
    ExternalLink,
    AlertCircle,
    Building2,
    ArrowLeft,
    Search,
    Bookmark,
    Bell,
    BellOff,
    Loader2,
    History
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import { searchService, SavedSearch } from '@/services/searchService';
import { useToast } from '@/contexts/ToastContext';

export default function SavedPage() {
    const [activeTab, setActiveTab] = useState<'properties' | 'searches'>('properties');
    const {
        savedProperties,
        loading: propertiesLoading,
        error: propertiesError,
        removeProperty,
        refreshSavedProperties
    } = useSavedProperties();
    const navigate = useNavigate();
    const { success: showToastSuccess } = useToast();

    const handleRemoveProperty = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        await removeProperty(id);
        showToastSuccess('Property removed from your saved list.');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors group w-fit"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Saved
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage your favorite properties and search alerts
                        </p>
                    </div>

                    <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === 'properties'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Heart size={16} />
                            Properties
                        </button>
                        <button
                            onClick={() => setActiveTab('searches')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === 'searches'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Bookmark size={16} />
                            Searches
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'properties' ? (
                    <PropertiesTab 
                        properties={savedProperties}
                        loading={propertiesLoading}
                        error={propertiesError}
                        onRemove={handleRemoveProperty}
                        onRefresh={refreshSavedProperties}
                    />
                ) : (
                    <SavedSearchesTab />
                )}
            </div>
        </div>
    );
}

function PropertiesTab({ properties, loading, error, onRemove, onRefresh }: any) {
    return (
        <>
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <PropertyCardSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                    <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <AlertCircle className="text-red-500" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Error loading saved properties</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
                    <button
                        onClick={onRefresh}
                        className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                    {properties.map((property: any) => (
                        <div key={property.id} className="relative group">
                            <PropertyCard property={property} />
                            <button
                                onClick={(e) => onRemove(e, property.id)}
                                className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-full shadow-md backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="Remove from saved"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                        <Heart className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No saved properties yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                        You haven't saved any properties yet. Browse through our listings and click the heart icon to save them here.
                    </p>
                    <Link
                        to="/user/search"
                        className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 dark:shadow-none"
                    >
                        Start Exploring
                    </Link>
                </div>
            )}
        </>
    );
}

function SavedSearchesTab() {
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { success: showToastSuccess, error: showToastError } = useToast();

    const fetchSearches = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await searchService.getSavedSearches();
            setSearches(data);
        } catch (err) {
            setError('Failed to load saved searches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSearches();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const success = await searchService.deleteSavedSearch(id);
            if (success) {
                setSearches(prev => prev.filter(s => s.id !== id));
                showToastSuccess('Saved search deleted.');
            }
        } catch (err: any) {
            showToastError(err.message || 'Failed to delete search');
        }
    };

    const handleToggleAlert = async (id: string, enabled: boolean) => {
        try {
            const success = await searchService.toggleAlert(id, enabled);
            if (success) {
                setSearches(prev => prev.map(s => s.id === id ? { ...s, alert_enabled: enabled } : s));
                showToastSuccess(enabled ? 'Email alerts enabled.' : 'Email alerts disabled.');
            }
        } catch (err: any) {
            showToastError(err.message || 'Failed to update alert settings');
        }
    };

    const handleReRun = (search: SavedSearch) => {
        const params = new URLSearchParams();
        if (search.query) params.append('q', search.query);
        if (search.location) params.append('location', search.location);
        if (search.min_price) params.append('minPrice', search.min_price.toString());
        if (search.max_price) params.append('maxPrice', search.max_price.toString());
        if (search.property_type) params.append('propertyType', search.property_type);
        if (search.listing_type) params.append('type', search.listing_type);
        if (search.bedrooms) params.append('beds', search.bedrooms.toString());
        if (search.bathrooms) params.append('baths', search.bathrooms.toString());
        
        navigate(`/user/search?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <span className="text-gray-500 font-medium">Loading saved searches...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                <AlertCircle className="text-red-500 mx-auto mb-4" size={32} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Error</h3>
                <p className="text-gray-500 mt-2">{error}</p>
                <button onClick={fetchSearches} className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg">Try Again</button>
            </div>
        );
    }

    if (searches.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 animate-in fade-in duration-500">
                <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                    <Bookmark className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No saved searches</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                    Save your search criteria to quickly re-run them later and get notified of new matching listings.
                </p>
                <Link
                    to="/user/search"
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
                >
                    <Search size={18} />
                    Go to Search
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {searches.map((search) => (
                <div key={search.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{search.name}</h3>
                            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                                {search.listing_type === 'rent' ? 'For Rent' : search.listing_type === 'sale' ? 'For Sale' : 'Any'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                            {search.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-gray-400" />
                                    <span>{search.location}</span>
                                </div>
                            )}
                            {search.property_type && (
                                <div className="flex items-center gap-1.5">
                                    <Building2 size={14} className="text-gray-400" />
                                    <span>{search.property_type}</span>
                                </div>
                            )}
                            {(search.min_price || search.max_price) && (
                                <div className="flex items-center gap-1.5">
                                    <span>£{search.min_price?.toLocaleString() || '0'} - £{search.max_price?.toLocaleString() || 'Any'}</span>
                                </div>
                            )}
                            {search.bedrooms && (
                                <div className="flex items-center gap-1.5">
                                    <span>{search.bedrooms}+ Bedrooms</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
                            <History size={12} />
                            Saved on {new Date(search.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleToggleAlert(search.id, !search.alert_enabled)}
                            className={`p-3 rounded-xl border transition-all ${
                                search.alert_enabled
                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50 text-green-600 dark:text-green-400'
                                    : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-400'
                            }`}
                            title={search.alert_enabled ? 'Disable email alerts' : 'Enable email alerts'}
                        >
                            {search.alert_enabled ? <Bell size={18} /> : <BellOff size={18} />}
                        </button>
                        <button
                            onClick={() => handleReRun(search)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                        >
                            <ExternalLink size={18} />
                            Re-run Search
                        </button>
                        <button
                            onClick={() => handleDelete(search.id)}
                            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                            title="Delete search"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
