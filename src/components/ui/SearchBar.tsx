'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Home, IndianRupee, Bed, Bath, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { searchService, FilterOptions, AutocompleteSuggestion } from '../../services/searchService';
import { formatLaunchCurrency, LAUNCH_CURRENCY_SYMBOL } from '@/lib/launchLocale';
import { buildPropertyTypeOptions, propertyTypes } from '@/lib/propertyTypeOptions';

export interface SearchFilters {
    keyword: string;
    location: string;
    listingType: 'all' | 'rent' | 'sale';
    propertyType: string;
    minPrice: number | null;
    maxPrice: number | null;
    minBedrooms: number | null;
    maxBedrooms: number | null;
    minBathrooms: number | null;
}

interface SearchBarProps {
    variant?: 'hero' | 'compact' | 'full';
    initialFilters?: Partial<SearchFilters>;
    onSearch?: (filters: SearchFilters) => void;
    showAdvanced?: boolean;
    className?: string;
    navigateOnSearch?: boolean;
    searchPath?: string;
}

const defaultFilters: SearchFilters = {
    keyword: '',
    location: '',
    listingType: 'all',
    propertyType: '',
    minPrice: null,
    maxPrice: null,
    minBedrooms: null,
    maxBedrooms: null,
    minBathrooms: null,
};

const priceRanges = {
    rent: [
        { min: null, max: 500, label: `Under ${formatLaunchCurrency(500)}` },
        { min: 500, max: 1000, label: `${formatLaunchCurrency(500)} - ${formatLaunchCurrency(1000)}` },
        { min: 1000, max: 1500, label: `${formatLaunchCurrency(1000)} - ${formatLaunchCurrency(1500)}` },
        { min: 1500, max: 2000, label: `${formatLaunchCurrency(1500)} - ${formatLaunchCurrency(2000)}` },
        { min: 2000, max: 3000, label: `${formatLaunchCurrency(2000)} - ${formatLaunchCurrency(3000)}` },
        { min: 3000, max: null, label: `${formatLaunchCurrency(3000)}+` },
    ],
    sale: [
        { min: null, max: 100000, label: `Under ${formatLaunchCurrency(100000)}` },
        { min: 100000, max: 250000, label: `${formatLaunchCurrency(100000)} - ${formatLaunchCurrency(250000)}` },
        { min: 250000, max: 500000, label: `${formatLaunchCurrency(250000)} - ${formatLaunchCurrency(500000)}` },
        { min: 500000, max: 750000, label: `${formatLaunchCurrency(500000)} - ${formatLaunchCurrency(750000)}` },
        { min: 750000, max: 1000000, label: `${formatLaunchCurrency(750000)} - ${formatLaunchCurrency(1000000)}` },
        { min: 1000000, max: null, label: `${formatLaunchCurrency(1000000)}+` },
    ],
};

const SearchBar: React.FC<SearchBarProps> = ({
    variant = 'full',
    initialFilters,
    onSearch,
    showAdvanced = true,
    className = '',
    navigateOnSearch = true,
    searchPath = '/user/search',
}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters, ...initialFilters });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [propertyTypeMenuOpen, setPropertyTypeMenuOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const usesDynamicFilters = variant !== 'compact';

    // Fetch dynamic filters
    useEffect(() => {
        if (!usesDynamicFilters) {
            setFilterOptions(null);
            return;
        }

        const loadFilters = async () => {
            const opts = await searchService.getFilters();
            if (opts) setFilterOptions(opts);
        };
        loadFilters();
    }, [usesDynamicFilters]);

    // Sync with initialFilters anytime they change substantially
    useEffect(() => {
        if (initialFilters && Object.keys(initialFilters).length > 0) {
            setFilters(prev => ({ ...prev, ...initialFilters }));
        } else {
            // Fallback to URL parsing if no initialFilters provided (e.g Header search)
            const urlFilters: Partial<SearchFilters> = {};

            const keyword = searchParams.get('q') || searchParams.get('keyword');
            if (keyword) urlFilters.keyword = keyword;

            const location = searchParams.get('location');
            if (location) urlFilters.location = location;

            const listingType = searchParams.get('type') as 'all' | 'rent' | 'sale';
            if (listingType && ['all', 'rent', 'sale'].includes(listingType)) {
                urlFilters.listingType = listingType;
            }

            const propertyType = searchParams.get('propertyType');
            if (propertyType) urlFilters.propertyType = propertyType;

            const minPrice = searchParams.get('minPrice');
            if (minPrice) urlFilters.minPrice = parseInt(minPrice);

            const maxPrice = searchParams.get('maxPrice');
            if (maxPrice) urlFilters.maxPrice = parseInt(maxPrice);

            const minBedrooms = searchParams.get('beds') || searchParams.get('minBedrooms');
            if (minBedrooms) urlFilters.minBedrooms = parseInt(minBedrooms);

            const minBathrooms = searchParams.get('baths') || searchParams.get('minBathrooms');
            if (minBathrooms) urlFilters.minBathrooms = parseInt(minBathrooms);

            if (Object.keys(urlFilters).length > 0) {
                setFilters((prev) => ({ ...prev, ...urlFilters }));
            }
        }
    }, [initialFilters, searchParams]);

    // Location autocomplete
    const fetchLocationSuggestions = useCallback(async (query: string) => {
        if (query.length < 2) {
            setLocationSuggestions([]);
            return;
        }

        try {
            const suggestions = await searchService.autocomplete(query);
            setLocationSuggestions(suggestions.slice(0, 10));
        } catch {
            setLocationSuggestions([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (filters.location) {
                fetchLocationSuggestions(filters.location);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [filters.location, fetchLocationSuggestions]);

    const handleInputChange = (field: keyof SearchFilters, value: string | number | null) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleSearch = (e?: React.FormEvent, nextFilters = filters) => {
        if (e) e.preventDefault();

        const params = new URLSearchParams();
        if (nextFilters.keyword) params.set('q', nextFilters.keyword);
        if (nextFilters.location) params.set('location', nextFilters.location);
        if (nextFilters.listingType !== 'all') params.set('type', nextFilters.listingType);
        if (nextFilters.propertyType) params.set('propertyType', nextFilters.propertyType);
        if (nextFilters.minPrice !== null) params.set('minPrice', nextFilters.minPrice.toString());
        if (nextFilters.maxPrice !== null) params.set('maxPrice', nextFilters.maxPrice.toString());
        if (nextFilters.minBedrooms !== null) params.set('beds', nextFilters.minBedrooms.toString());
        if (nextFilters.minBathrooms !== null) params.set('baths', nextFilters.minBathrooms.toString());

        if (onSearch) onSearch(nextFilters);
        if (navigateOnSearch) navigate(`${searchPath}?${params.toString()}`);
    };

    const handleCompactKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const nextFilters: SearchFilters = { ...filters, keyword: e.currentTarget.value, location: '' };
        setFilters(nextFilters);
        handleSearch(undefined, nextFilters);
    };

    const handleClearFilters = () => {
        setFilters(defaultFilters);
        setShowAdvancedFilters(false);
    };

    const hasActiveFilters =
        filters.keyword ||
        filters.location ||
        filters.listingType !== 'all' ||
        filters.propertyType ||
        filters.minPrice !== null ||
        filters.maxPrice !== null ||
        filters.minBedrooms !== null ||
        filters.minBathrooms !== null;
    const propertyTypeOptions = useMemo(
        () => buildPropertyTypeOptions(filterOptions?.property_types),
        [filterOptions?.property_types],
    );
    const selectedPropertyType = propertyTypeOptions.find((option) => option.value === filters.propertyType)
        || propertyTypeOptions[0];

    // Hero variant
    if (variant === 'hero') {
        return (
            <form onSubmit={handleSearch} className={`w-full ${className}`}>
                <div className="inline-flex p-1.5 bg-slate-100/95 backdrop-blur-sm rounded-t-2xl border border-slate-200 shadow-sm">
                    {['buy', 'rent'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            className={`flex min-w-[100px] items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 ${filters.listingType === (type === 'buy' ? 'sale' : type)
                                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                }`}
                            onClick={() => handleInputChange('listingType', type === 'buy' ? 'sale' : 'rent')}
                        >
                            {type === 'buy' ? 'Buy' : 'Rent'}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-b-xl rounded-tr-xl shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Keyword</label>
                        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                            <Search size={18} className="text-primary mr-2" />
                            <input type="text" value={filters.keyword} onChange={(e) => handleInputChange('keyword', e.target.value)} placeholder="Enter Keyword..." className="w-full outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent" />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Location</label>
                        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                            <MapPin size={18} className="text-primary mr-2" />
                            <input type="text" value={filters.location} onChange={(e) => { handleInputChange('location', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="City, PIN code, or postcode..." className="w-full outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent" />
                        </div>
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (suggestion.type === 'property' && suggestion.id) {
                                                navigate(`/user/properties/${suggestion.id}`);
                                            } else {
                                                handleInputChange('location', suggestion.text);
                                            }
                                            setShowSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {suggestion.type === 'property' ? <Home size={14} className="text-primary" /> : <MapPin size={14} className="text-primary" />}
                                            <span>{suggestion.text}</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{suggestion.type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Type</label>
                        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                            <Home size={18} className="text-primary mr-2" />
                            <button
                                type="button"
                                aria-haspopup="listbox"
                                aria-expanded={propertyTypeMenuOpen}
                                aria-label="Property type"
                                onClick={() => setPropertyTypeMenuOpen((open) => !open)}
                                className="flex w-full items-center justify-between gap-3 bg-transparent text-left text-gray-900 outline-none dark:text-gray-100"
                            >
                                <span className="truncate">{selectedPropertyType.label}</span>
                                <ChevronDown
                                    size={16}
                                    className={`shrink-0 text-gray-400 transition-transform ${propertyTypeMenuOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                        </div>
                        {propertyTypeMenuOpen && (
                            <div
                                role="listbox"
                                aria-label="Property type options"
                                className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-auto rounded-lg border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                            >
                                {propertyTypeOptions.map((option) => (
                                    <button
                                        key={option.value || 'all-types'}
                                        type="button"
                                        role="option"
                                        aria-selected={filters.propertyType === option.value}
                                        onClick={() => {
                                            handleInputChange('propertyType', option.value);
                                            setPropertyTypeMenuOpen(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${filters.propertyType === option.value
                                            ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-200'
                                            : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-end gap-2">
                        {showAdvanced && (
                            <button type="button" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="p-3 border border-gray-100 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Advanced Search">
                                <SlidersHorizontal size={20} />
                            </button>
                        )}
                        <button type="submit" className="flex-1 bg-primary text-white py-3 rounded font-bold hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                            <Search size={20} />
                            Search
                        </button>
                    </div>
                </div>

                {showAdvancedFilters && (
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-b-xl shadow-lg border border-t-0 border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 mt-[-1px]">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Min Price</label>
                            <div className="flex items-center border border-gray-100 dark:border-gray-700 rounded px-3 py-2">
                                <IndianRupee size={16} className="text-gray-400 mr-2" />
                                <input type="number" value={filters.minPrice || ''} min={filterOptions?.price_range.min} max={filters.maxPrice || filterOptions?.price_range.max} onChange={(e) => handleInputChange('minPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder={filterOptions ? `Min: ${formatLaunchCurrency(filterOptions.price_range.min)}` : `Min ${LAUNCH_CURRENCY_SYMBOL}`} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Max Price</label>
                            <div className="flex items-center border border-gray-100 dark:border-gray-700 rounded px-3 py-2">
                                <IndianRupee size={16} className="text-gray-400 mr-2" />
                                <input type="number" value={filters.maxPrice || ''} min={filters.minPrice || filterOptions?.price_range.min} max={filterOptions?.price_range.max} onChange={(e) => handleInputChange('maxPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder={filterOptions ? `Max: ${formatLaunchCurrency(filterOptions.price_range.max)}` : `Max ${LAUNCH_CURRENCY_SYMBOL}`} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Bedrooms</label>
                            <div className="flex items-center border border-gray-100 dark:border-gray-700 rounded px-3 py-2">
                                <Bed size={16} className="text-gray-400 mr-2" />
                                <select value={filters.minBedrooms || ''} onChange={(e) => handleInputChange('minBedrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent cursor-pointer" aria-label="Minimum bedrooms">
                                    <option value="">Any</option>
                                    <option value="1">1+</option>
                                    <option value="2">2+</option>
                                    <option value="3">3+</option>
                                    <option value="4">4+</option>
                                    <option value="5">5+</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Bathrooms</label>
                            <div className="flex items-center border border-gray-100 dark:border-gray-700 rounded px-3 py-2">
                                <Bath size={16} className="text-gray-400 mr-2" />
                                <select value={filters.minBathrooms || ''} onChange={(e) => handleInputChange('minBathrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent cursor-pointer" aria-label="Minimum bathrooms">
                                    <option value="">Any</option>
                                    <option value="1">1+</option>
                                    <option value="2">2+</option>
                                    <option value="3">3+</option>
                                    <option value="4">4+</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        );
    }

    // Compact variant
    if (variant === 'compact') {
        return (
            <form onSubmit={handleSearch} className={`flex min-w-0 items-center gap-2 ${className}`}>
                <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={filters.keyword}
                        onChange={(e) => {
                            handleInputChange('keyword', e.target.value);
                            if (filters.location) {
                                handleInputChange('location', ''); // Ensure old hidden locations don't silently apply
                            }
                        }}
                        onKeyDown={handleCompactKeywordKeyDown}
                        placeholder="Search properties..."
                        className="w-full rounded-lg border border-gray-100 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-base"
                    />
                </div>
                <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary px-0 font-medium text-white transition-colors hover:bg-primary/90 sm:w-auto sm:px-4"
                >
                    <Search size={18} className="sm:hidden" aria-hidden="true" />
                    <span className="sr-only sm:hidden">Search properties</span>
                    <span className="hidden sm:inline">Search</span>
                </button>
            </form>
        );
    }

    // Full variant
    return (
        <form onSubmit={handleSearch} className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 ${className}`}>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" value={filters.keyword} onChange={(e) => handleInputChange('keyword', e.target.value)} placeholder="Search by PIN code, postcode, street, address, keyword, or property title..." className="w-full pl-10 pr-4 py-3 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                {filters.keyword && (
                    <button type="button" onClick={() => handleInputChange('keyword', '')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" value={filters.location} onChange={(e) => { handleInputChange('location', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="City, PIN code, or postcode" className="w-full pl-10 pr-4 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                            if (suggestion.type === 'property' && suggestion.id) {
                                                navigate(`/user/properties/${suggestion.id}`);
                                            } else {
                                                handleInputChange('location', suggestion.text);
                                            }
                                            setShowSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {suggestion.type === 'property' ? <Home size={14} className="text-primary" /> : <MapPin size={14} className="text-primary" />}
                                            <span>{suggestion.text}</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{suggestion.type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Listing Type</label>
                    <div className="relative">
                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select value={filters.listingType} onChange={(e) => handleInputChange('listingType', e.target.value as 'all' | 'rent' | 'sale')} className="w-full pl-10 pr-8 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer" aria-label="Listing type">
                            <option value="all">All Listings</option>
                            <option value="rent">For Rent</option>
                            <option value="sale">For Sale</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Range</label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input type="number" value={filters.minPrice || ''} onChange={(e) => handleInputChange('minPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder={`Min ${LAUNCH_CURRENCY_SYMBOL}`} className="w-full px-3 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="relative flex-1">
                            <input type="number" value={filters.maxPrice || ''} onChange={(e) => handleInputChange('maxPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder={`Max ${LAUNCH_CURRENCY_SYMBOL}`} className="w-full px-3 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beds</label>
                        <div className="relative">
                            <Bed className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <select value={filters.minBedrooms || ''} onChange={(e) => handleInputChange('minBedrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full pl-8 pr-2 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer" aria-label="Minimum bedrooms">
                                <option value="">Any</option>
                                <option value="1">1+</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                                <option value="5">5+</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Baths</label>
                        <div className="relative">
                            <Bath className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <select value={filters.minBathrooms || ''} onChange={(e) => handleInputChange('minBathrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full pl-8 pr-2 py-2 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer" aria-label="Minimum bathrooms">
                                <option value="">Any</option>
                                <option value="1">1+</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-end gap-2">
                    {hasActiveFilters && (
                        <button type="button" onClick={handleClearFilters} className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Clear filters">
                            <X size={20} />
                        </button>
                    )}
                    <button type="submit" className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <Search size={18} />
                        Search
                    </button>
                </div>
            </div>
        </form>
    );
};

export default SearchBar;
export { defaultFilters, propertyTypes, priceRanges };

