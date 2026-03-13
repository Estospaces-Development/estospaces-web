"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, X, Grid3X3, List, Loader2, Home, BookmarkPlus, Bell } from 'lucide-react';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { searchService, SearchResult, FilterOptions, AutocompleteSuggestion } from '../../../services/searchService';

import { useToast } from '@/contexts/ToastContext';

const PropertySearch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { error: showToastError } = useToast();

    // Initialize state directly from URL params
    const [query, setQuery] = useState(() => searchParams.get('q') || searchParams.get('keyword') || '');
    const [location, setLocation] = useState(() => searchParams.get('location') || '');
    const [propertyType, setPropertyType] = useState(() => searchParams.get('propertyType') || '');
    const [minPrice, setMinPrice] = useState(() => searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') || '');
    const [bedrooms, setBedrooms] = useState(() => searchParams.get('beds') || searchParams.get('minBedrooms') || '');
    const [listingType, setListingType] = useState(() => searchParams.get('type') || '');
    const [baths, setBaths] = useState(() => searchParams.get('baths') || searchParams.get('minBathrooms') || '');

    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [properties, setProperties] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Save Search State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Initial load for filters
    useEffect(() => {
        const loadFilters = async () => {
            const opts = await searchService.getFilters();
            if (opts) setFilterOptions(opts);
        };
        loadFilters();
    }, []);

    // Sync URL params to state when searchParams change (navigation)
    useEffect(() => {
        setQuery(searchParams.get('q') || searchParams.get('keyword') || '');
        setLocation(searchParams.get('location') || '');
        setPropertyType(searchParams.get('propertyType') || '');
        setMinPrice(searchParams.get('minPrice') || '');
        setMaxPrice(searchParams.get('maxPrice') || '');
        setBedrooms(searchParams.get('beds') || searchParams.get('minBedrooms') || '');
        setListingType(searchParams.get('type') || '');
        setBaths(searchParams.get('baths') || searchParams.get('minBathrooms') || '');
        setPage(parseInt(searchParams.get('page') || '1'));
    }, [searchParams]);

    const fetchProperties = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await searchService.search(
                query,
                {
                    location: location || undefined,
                    propertyType: propertyType || undefined,
                    minPrice: minPrice ? parseInt(minPrice) : undefined,
                    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
                    minBedrooms: bedrooms ? parseInt(bedrooms) : undefined,
                    listingType: listingType || undefined,
                    minBathrooms: baths ? parseInt(baths) : undefined,
                    page,
                    limit: 12
                }
            );

            if (result.success) {
                setProperties(result.data || []);
                setTotal(result.pagination?.total || 0);
            } else {
                setError('Failed to fetch properties. Please try again.');
                setProperties([]);
                setTotal(0);
            }
        } catch {
            setError('An error occurred while fetching properties.');
            setProperties([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [query, location, propertyType, minPrice, maxPrice, bedrooms, listingType, baths, page]);

    // Refetch when search dependencies change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProperties();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchProperties]);

    // Autocomplete location suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length >= 2) {
                try {
                    const suggestions = await searchService.autocomplete(query);
                    setLocationSuggestions(suggestions.slice(0, 10));
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
    }, [query]);

    const handleSaveSearch = async () => {
        if (!searchName.trim()) return;
        setIsSaving(true);
        try {
            const res = await searchService.saveSearch({
                name: searchName,
                query,
                location,
                property_type: propertyType,
                min_price: minPrice ? parseInt(minPrice) : undefined,
                max_price: maxPrice ? parseInt(maxPrice) : undefined,
                bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
                listing_type: listingType,
                bathrooms: baths ? parseInt(baths) : undefined,
            });

            if (res.success) {
                setSaveSuccess(true);
                setTimeout(() => {
                    setIsSaveModalOpen(false);
                    setSaveSuccess(false);
                    setSearchName('');
                }, 1500);
            } else {
                showToastError('Error saving search: ' + (res.error || 'Unknown error'));
            }
        } catch (error) {
            showToastError('Failed to save search');
        } finally {
            setIsSaving(false);
        }
    };

    const clearFilters = () => {
        setQuery('');
        setLocation('');
        setPropertyType('');
        setMinPrice('');
        setMaxPrice('');
        setBedrooms('');
        setListingType('');
        setBaths('');
        setPage(1);
    };

    const hasFilters = query || location || propertyType || minPrice || maxPrice || bedrooms || listingType || baths;

    // Helper for images
    const getCoverImage = (property: SearchResult) => {
        if (!property.images) return null;
        if (Array.isArray(property.images) && property.images.length > 0) return property.images[0];
        if (typeof property.images === 'string') {
            try {
                const parsed = JSON.parse(property.images);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            } catch {
                return property.images;
            }
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Find Your Property</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Search through verified listings</p>
                </div>
                {hasFilters && (
                    <button
                        onClick={() => {
                            setSearchName(`${query || location || 'Search'} ${new Date().toLocaleDateString()}`);
                            setIsSaveModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-semibold"
                    >
                        <BookmarkPlus className="w-4 h-4" />
                        Save this search
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            if (locationSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search by location, property name..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {showSuggestions && locationSuggestions.length > 0 && (
                        <div
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-60 overflow-auto"
                        >
                            {locationSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-between gap-2"
                                    onClick={() => {
                                        if (suggestion.type === 'property' && suggestion.id) {
                                            navigate(`/user/properties/${suggestion.id}`);
                                        } else {
                                            setQuery(suggestion.text);
                                        }
                                        setShowSuggestions(false);
                                        setPage(1);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {suggestion.type === 'property' ? <Home className="w-4 h-4 text-orange-500" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                                        <span>{suggestion.text}</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded">{suggestion.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-colors ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters</span>
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select
                            label="Listing Type"
                            options={[
                                { value: 'rent', label: 'For Rent' },
                                { value: 'sale', label: 'For Sale' },
                            ]}
                            value={listingType}
                            onChange={(val) => { setListingType(val); setPage(1); }}
                            placeholder="Any"
                        />
                        <Select
                            label="Property Type"
                            options={(filterOptions?.property_types || []).map((t: string) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                            value={propertyType}
                            onChange={(val) => { setPropertyType(val); setPage(1); }}
                            placeholder="Any type"
                        />
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Location</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                                placeholder="City or postcode"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Min Price (£)</label>
                            <input
                                type="number"
                                value={minPrice}
                                min={filterOptions?.price_range?.min}
                                max={maxPrice || filterOptions?.price_range?.max}
                                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                                placeholder={filterOptions?.price_range?.min ? `Min: £${filterOptions.price_range.min.toLocaleString()}` : "No min"}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Max Price (£)</label>
                            <input
                                type="number"
                                value={maxPrice}
                                min={minPrice || filterOptions?.price_range?.min}
                                max={filterOptions?.price_range?.max}
                                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                                placeholder={filterOptions?.price_range?.max ? `Max: £${filterOptions.price_range.max.toLocaleString()}` : "No max"}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Bedrooms"
                                options={[
                                    { value: '1', label: '1+' },
                                    { value: '2', label: '2+' },
                                    { value: '3', label: '3+' },
                                    { value: '4', label: '4+' },
                                ]}
                                value={bedrooms}
                                onChange={(val) => { setBedrooms(val); setPage(1); }}
                                placeholder="Any"
                            />
                            <Select
                                label="Bathrooms"
                                options={[
                                    { value: '1', label: '1+' },
                                    { value: '2', label: '2+' },
                                    { value: '3', label: '3+' },
                                ]}
                                value={baths}
                                onChange={(val) => { setBaths(val); setPage(1); }}
                                placeholder="Any"
                            />
                        </div>
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="mt-4 flex items-center gap-1.5 text-sm text-red-600 hover:underline">
                            <X className="w-3.5 h-3.5" /> Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{loading ? '...' : total}</span> properties found
                </p>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}>
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div className="flex justify-center flex-col items-center py-20 text-indigo-600">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <span className="text-sm font-medium text-gray-500">Searching properties...</span>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 p-12 text-center">
                    <X className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Error Loading Results</h3>
                    <p className="text-sm">{error}</p>
                </div>
            ) : properties.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
                    {properties.map(p => {
                        const coverImg = getCoverImage(p);
                        return (
                            <div key={p.id} className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:shadow-md transition-all">
                                <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg h-40 mb-3 flex items-center justify-center overflow-hidden" onClick={() => navigate(`/user/properties/${p.id}`)}>
                                    {coverImg ? (
                                        <img src={coverImg} alt={p.title} className="w-full h-full object-cover cursor-pointer" />
                                    ) : (
                                        <MapPin className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate cursor-pointer" onClick={() => navigate(`/user/properties/${p.id}`)}>{p.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">{p.location || p.city || p.postcode}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-lg font-bold text-indigo-600">
                                        £{p.price?.toLocaleString()}
                                        {p.listing_type === 'rent' && <span className="text-sm font-normal text-gray-500">/mo</span>}
                                    </span>
                                    <span className="text-xs text-gray-500">{p.bedrooms} bed · {p.bathrooms} bath {p.square_feet ? `· ${p.square_feet} sqft` : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {total > 12 && (
                <div className="flex justify-center pt-8">
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 text-sm font-medium"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
                            Page {page} of {Math.ceil(total / 12)}
                        </span>
                        <button
                            disabled={page >= Math.ceil(total / 12)}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 text-sm font-medium"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Save Search Modal */}
            <Modal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                title="Save this search"
            >
                {saveSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                            <BookmarkPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Search Saved!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You'll find this in your Saved Searches</p>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Give your search a name so you can easily re-run it later. We'll also notify you when new properties match these criteria.
                        </p>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Search Name</label>
                            <input
                                type="text"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                placeholder="e.g. 2 Bed Flats in London"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl flex gap-3">
                            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Email Alerts</h4>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">We'll send you an email as soon as new matching properties are listed.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveSearch}
                            disabled={isSaving || !searchName.trim()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookmarkPlus className="w-5 h-5" />}
                            Save Search
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PropertySearch;
