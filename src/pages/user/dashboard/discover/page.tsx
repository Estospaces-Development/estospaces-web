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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import MapView from '@/components/dashboard/MapView';
import { searchService, FilterOptions, SearchResult } from '@/services/searchService';

function DiscoverContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { activeTab, setActiveTab } = usePropertyFilter();

    // Local state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [properties, setProperties] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [propertyType, setPropertyType] = useState('all');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [beds, setBeds] = useState('');
    const [baths, setBaths] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Initialize filters from URL/Context
    useEffect(() => {
        const type = searchParams.get('type');
        if (type === 'rent') setActiveTab('rent');
        else if (type === 'buy') setActiveTab('buy');
    }, [searchParams, setActiveTab]);

    // Initial load for filters
    useEffect(() => {
        const loadFilters = async () => {
            const opts = await searchService.getFilters();
            if (opts) setFilterOptions(opts);
        };
        loadFilters();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await searchService.search(
                searchQuery,
                {
                    propertyType: propertyType !== 'all' ? propertyType : undefined,
                    minPrice: priceRange.min ? parseInt(priceRange.min) : undefined,
                    maxPrice: priceRange.max ? parseInt(priceRange.max) : undefined,
                    minBedrooms: beds ? parseInt(beds) : undefined,
                    minBathrooms: baths ? parseInt(baths) : undefined,
                    listingType: activeTab === 'buy' ? 'sale' : activeTab === 'rent' ? 'rent' : 'all',
                    location: locationQuery.trim() ? locationQuery.trim() : undefined,
                    page: currentPage,
                    limit: itemsPerPage
                }
            );

            if (result.success) {
                setProperties(result.data || []);
                setTotal(result.pagination?.total || 0);
            } else {
                setProperties([]);
                setTotal(0);
                setError('Failed to fetch properties from server.');
            }
        } catch {
            setProperties([]);
            setTotal(0);
            setError('An unexpected error occurred while processing the search.');
        } finally {
            setLoading(false);
        }
    };

    // Refetch when dependencies change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, propertyType, priceRange, beds, baths, currentPage, activeTab, locationQuery]);

    // Autocomplete location suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.length >= 2) {
                try {
                    const suggestions = await searchService.autocomplete(searchQuery);
                    setLocationSuggestions(suggestions.slice(0, 6));
                } catch {
                    setLocationSuggestions([]);
                }
            } else {
                setLocationSuggestions([]);
            }
        };

        const timer = setTimeout(() => {
            fetchSuggestions();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // The backend now handles all filtering and pagination natively.
    const filteredProperties = properties;

    const totalPages = Math.ceil(total / itemsPerPage);
    const paginatedProperties = properties; // Backend paginates for us

    const handleClearFilters = () => {
        setSearchQuery('');
        setLocationQuery('');
        setPriceRange({ min: '', max: '' });
        setBeds('');
        setBaths('');
        setCurrentPage(1);
    };

    const transformForMap = (props: SearchResult[]) => {
        return props
            .filter(p => p.latitude != null && p.longitude != null)
            .map(p => ({
                id: p.id,
                title: p.title,
                lat: p.latitude as number,
                lng: p.longitude as number,
                price: `£${p.price.toLocaleString()}`,
                address: p.location || p.city || 'Unknown Location'
            }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/user/dashboard')}
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

                    <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Postcode, street, or property name..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => {
                                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    onBlur={() => setShowSuggestions(false)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                                {showSuggestions && locationSuggestions.length > 0 && (
                                    <div
                                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-auto"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {locationSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                                                onClick={() => {
                                                    setSearchQuery(suggestion);
                                                    setCurrentPage(1);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                    onChange={(e) => {
                                        setLocationQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder={filterOptions?.price_range?.min ? `Min: £${filterOptions.price_range.min.toLocaleString()}` : "Min"}
                                    value={priceRange.min}
                                    min={filterOptions?.price_range?.min}
                                    max={priceRange.max || filterOptions?.price_range?.max}
                                    onChange={(e) => {
                                        setPriceRange({ ...priceRange, min: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder={filterOptions?.price_range?.max ? `Max: £${filterOptions.price_range.max.toLocaleString()}` : "Max"}
                                    value={priceRange.max}
                                    min={priceRange.min || filterOptions?.price_range?.min}
                                    max={filterOptions?.price_range?.max}
                                    onChange={(e) => {
                                        setPriceRange({ ...priceRange, max: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Property Type</label>
                            <select
                                value={propertyType}
                                onChange={(e) => {
                                    setPropertyType(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                <option value="all">Any Type</option>
                                {(filterOptions?.property_types || []).map((t: string) => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bedrooms</label>
                            <select
                                value={beds}
                                onChange={(e) => {
                                    setBeds(e.target.value);
                                    setCurrentPage(1);
                                }}
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
                                onChange={(e) => {
                                    setBaths(e.target.value);
                                    setCurrentPage(1);
                                }}
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
                    <div className="h-[700px] rounded-2xl overflow-hidden shadow-xl">
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
                        ) : error ? (
                            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30">
                                <div className="inline-flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-full mb-6">
                                    <AlertCircle className="text-red-500" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                                    {error}
                                </p>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        fetchData();
                                    }}
                                    className="mt-8 px-8 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all shadow-md active:scale-95"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : paginatedProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {paginatedProperties.map((property) => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
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
                                    className="p-2 rounded-xl bg-white dark:bg-gray-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
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

