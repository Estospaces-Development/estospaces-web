"use client";

import React from 'react';
import {
    Heart,
    MapPin,
    Trash2,
    ExternalLink,
    Plus,
    AlertCircle,
    Building2,
    ArrowLeft,
    Search
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';

export default function SavedPropertiesPage() {
    const {
        savedProperties,
        loading,
        error,
        removeProperty,
        refreshSavedProperties
    } = useSavedProperties();
    const navigate = useNavigate();

    const handleRemove = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        await removeProperty(id);
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
                            Saved Properties
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'} saved
                        </p>
                    </div>

                    <Link
                        to="/user/dashboard/discover"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        <Search size={18} />
                        <span>Browse Properties</span>
                    </Link>
                </div>

                {/* Content */}
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
                            onClick={() => refreshSavedProperties()}
                            className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg"
                        >
                            Try Again
                        </button>
                    </div>
                ) : savedProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savedProperties.map((property) => (
                            <div key={property.id} className="relative group">
                                <PropertyCard property={property} />
                                <button
                                    onClick={(e) => handleRemove(e, property.id)}
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
                            to="/user/dashboard"
                            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 dark:shadow-none"
                        >
                            Start Exploring
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

