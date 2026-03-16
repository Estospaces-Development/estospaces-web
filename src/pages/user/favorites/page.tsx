"use client";

import React from 'react';
import { Heart, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';

const FavoritesPage = () => {
    const { savedProperties, loading, error, refreshSavedProperties } = useSavedProperties();

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Saved Properties</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Properties you&apos;ve saved for later</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <PropertyCardSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 p-12 text-center">
                    <h3 className="text-lg font-medium mb-2">Error loading favorites</h3>
                    <p className="mb-4">{error}</p>
                    <button onClick={refreshSavedProperties} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
                </div>
            ) : savedProperties.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No saved properties</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Start exploring and save properties you like!</p>
                    <Link to="/user/search" className="inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Explore Properties
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedProperties.map(p => (
                        <PropertyCard key={p.id} property={p} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoritesPage;

