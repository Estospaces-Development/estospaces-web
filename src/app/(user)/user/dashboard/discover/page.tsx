"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
    Search,
    MapPin,
    Home,
    Grid,
    Map as MapIcon,
    ArrowLeft,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Plus
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import MapView from '@/components/dashboard/MapView';
import { getProperties, Property } from '@/services/propertyService';

function DiscoverContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeTab, setActiveTab } = usePropertyFilter();

    // Local state
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [propertyType, setPropertyType] = useState('all');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [beds, setBeds] = useState('');
    const [baths, setBaths] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Initialize filters from URL/Context
    useEffect(() => {
        const type = searchParams.get('type');
        if (type === 'rent') setActiveTab('rent');
        else if (type === 'buy') setActiveTab('buy');

        fetchData();
    }, [searchParams, setActiveTab]);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await getProperties();
        if (data) setProperties(data);
        setLoading(false);
    };

    // Filter properties logic
    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            // Filter by type (buy/rent)
            if (activeTab === 'buy' && p.property_type !== 'sale') return false;
            if (activeTab === 'rent' && p.property_type !== 'rent') return false;

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matches =
                    p.title.toLowerCase().includes(query) ||
                    p.address_line_1.toLowerCase().includes(query) ||
                    p.city.toLowerCase().includes(query) ||
                    p.postcode.toLowerCase().includes(query);
                if (!matches) return false;
            }

            // Location
            if (locationQuery.trim()) {
                const loc = locationQuery.toLowerCase();
                const matches =
                    p.city.toLowerCase().includes(loc) ||
                    p.postcode.toLowerCase().includes(loc);
                if (!matches) return false;
            }

            // Price
            if (priceRange.min && p.price < parseInt(priceRange.min)) return false;
            if (priceRange.max && p.price > parseInt(priceRange.max)) return false;

            // Beds/Baths
            if (beds && p.bedrooms < parseInt(beds)) return false;
            if (baths && p.bathrooms < parseInt(baths)) return false;

            return true;
        });
    }, [properties, activeTab, searchQuery, locationQuery, priceRange, beds, baths]);

    // Pagination
    const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
    const paginatedProperties = filteredProperties.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setLocationQuery('');
        setPriceRange({ min: '', max: '' });
        setBeds('');
        setBaths('');
        setCurrentPage(1);
    };

    const transformForMap = (props: Property[]) => {
        return props.filter(p => p.latitude && p.longitude).map(p => ({
            id: p.id,
            title: p.title,
            lat: parseFloat(p.latitude || '0'),
            lng: parseFloat(p.longitude || '0'),
            price: `£${p.price.toLocaleString()}`,
            address: p.address_line_1
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Properties</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {activeTab === 'buy' ? 'Showing properties for sale' : activeTab === 'rent' ? 'Showing properties for rent' : 'Find your next home across the UK'}
                        </p>
                    </div>

                    <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border dark:border-gray-700 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Grid size={18} />
                            <span>Grid</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'map'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <MapIcon size={18} />
                            <span>Map</span>
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Postcode, street, or property name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="City or Town"
                                    value={locationQuery}
                                    onChange={(e) => setLocationQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={priceRange.min}
                                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={priceRange.max}
                                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bedrooms</label>
                            <select
                                value={beds}
                                onChange={(e) => setBeds(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                <option value="">Any Beds</option>
                                <option value="1">1+ Bed</option>
                                <option value="2">2+ Beds</option>
                                <option value="3">3+ Beds</option>
                                <option value="4">4+ Beds</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bathrooms</label>
                            <select
                                value={baths}
                                onChange={(e) => setBaths(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                <option value="">Any Baths</option>
                                <option value="1">1+ Bath</option>
                                <option value="2">2+ Baths</option>
                                <option value="3">3+ Baths</option>
                            </select>
                        </div>

                        <div className="flex items-end lg:col-span-2">
                            <button
                                onClick={handleClearFilters}
                                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-sm font-medium h-12 px-6"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {viewMode === 'map' ? (
                    <div className="h-[700px] rounded-2xl overflow-hidden border dark:border-gray-700 shadow-xl">
                        <MapView houses={transformForMap(filteredProperties)} />
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => (
                                    <PropertyCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : paginatedProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {paginatedProperties.map((property) => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-sm">
                                <div className="inline-flex items-center justify-center p-6 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                                    <Search className="text-gray-400" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No properties match your search</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                                    Try adjusting your filters or search terms. We're constantly adding new listings across the UK.
                                </p>
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-8 px-8 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all shadow-md active:scale-95"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex items-center justify-center gap-4">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="p-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    Page <span className="text-gray-900 dark:text-white">{currentPage}</span> of {totalPages}
                                </span>
                                <button
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="p-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        }>
            <DiscoverContent />
        </Suspense>
    );
}
