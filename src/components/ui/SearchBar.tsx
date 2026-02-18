'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Home, DollarSign, Bed, Bath, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

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

const propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'office', label: 'Office' },
    { value: 'land', label: 'Land' },
];

const priceRanges = {
    rent: [
        { min: null, max: 500, label: 'Under £500' },
        { min: 500, max: 1000, label: '£500 - £1,000' },
        { min: 1000, max: 1500, label: '£1,000 - £1,500' },
        { min: 1500, max: 2000, label: '£1,500 - £2,000' },
        { min: 2000, max: 3000, label: '£2,000 - £3,000' },
        { min: 3000, max: null, label: '£3,000+' },
    ],
    sale: [
        { min: null, max: 100000, label: 'Under £100k' },
        { min: 100000, max: 250000, label: '£100k - £250k' },
        { min: 250000, max: 500000, label: '£250k - £500k' },
        { min: 500000, max: 750000, label: '£500k - £750k' },
        { min: 750000, max: 1000000, label: '£750k - £1M' },
        { min: 1000000, max: null, label: '£1M+' },
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
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Initialize from URL params
    useEffect(() => {
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
    }, [searchParams]);

    // Location autocomplete
    const fetchLocationSuggestions = useCallback(async (query: string) => {
        if (query.length < 2) {
            setLocationSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete`);
            const data = await response.json();

            if (data.result && Array.isArray(data.result)) {
                setLocationSuggestions(data.result.slice(0, 6));
            } else {
                setLocationSuggestions([]);
            }
        } catch {
            const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Sheffield', 'Newcastle'];
            const filtered = cities.filter((city) =>
                city.toLowerCase().includes(query.toLowerCase()),
            );
            setLocationSuggestions(filtered.slice(0, 6));
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

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const params = new URLSearchParams();
        if (filters.keyword) params.set('q', filters.keyword);
        if (filters.location) params.set('location', filters.location);
        if (filters.listingType !== 'all') params.set('type', filters.listingType);
        if (filters.propertyType) params.set('propertyType', filters.propertyType);
        if (filters.minPrice !== null) params.set('minPrice', filters.minPrice.toString());
        if (filters.maxPrice !== null) params.set('maxPrice', filters.maxPrice.toString());
        if (filters.minBedrooms !== null) params.set('beds', filters.minBedrooms.toString());
        if (filters.minBathrooms !== null) params.set('baths', filters.minBathrooms.toString());

        if (onSearch) onSearch(filters);
        if (navigateOnSearch) navigate(`${searchPath}?${params.toString()}`);
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

    // Hero variant
    if (variant === 'hero') {
        return (
            <form onSubmit={handleSearch} className={`w-full ${className}`}>
                <div className="inline-flex p-1 bg-white/10 backdrop-blur-sm rounded-t-xl border border-white/20 border-b-0">
                    {['buy', 'rent'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm tracking-wide transition-all duration-300 ${filters.listingType === (type === 'buy' ? 'sale' : type)
                                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
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
                        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                            <Search size={18} className="text-primary mr-2" />
                            <input type="text" value={filters.keyword} onChange={(e) => handleInputChange('keyword', e.target.value)} placeholder="Enter Keyword..." className="w-full outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent" />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Location</label>
                        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                            <MapPin size={18} className="text-primary mr-2" />
                            <input type="text" value={filters.location} onChange={(e) => { handleInputChange('location', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="City, Postcode..." className="w-full outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent" />
                        </div>
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                    <button key={index} type="button" onClick={() => { handleInputChange('location', suggestion); setShowSuggestions(false); }} className="w-full text-left px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors flex items-center gap-2">
                                        <MapPin size={14} className="text-primary" />
                                        <span>{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Type</label>
                        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                            <Home size={18} className="text-primary mr-2" />
                            <select value={filters.propertyType} onChange={(e) => handleInputChange('propertyType', e.target.value)} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent cursor-pointer">
                                {propertyTypes.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-end gap-2">
                        {showAdvanced && (
                            <button type="button" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Advanced Search">
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
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                                <DollarSign size={16} className="text-gray-400 mr-2" />
                                <input type="number" value={filters.minPrice || ''} onChange={(e) => handleInputChange('minPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder="Min £" className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Max Price</label>
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                                <DollarSign size={16} className="text-gray-400 mr-2" />
                                <input type="number" value={filters.maxPrice || ''} onChange={(e) => handleInputChange('maxPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder="Max £" className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Bedrooms</label>
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                                <Bed size={16} className="text-gray-400 mr-2" />
                                <select value={filters.minBedrooms || ''} onChange={(e) => handleInputChange('minBedrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent cursor-pointer">
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
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                                <Bath size={16} className="text-gray-400 mr-2" />
                                <select value={filters.minBathrooms || ''} onChange={(e) => handleInputChange('minBathrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full outline-none text-gray-900 dark:text-gray-100 bg-transparent cursor-pointer">
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
            <form onSubmit={handleSearch} className={`flex items-center gap-2 ${className}`}>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={filters.keyword || filters.location} onChange={(e) => handleInputChange('keyword', e.target.value)} placeholder="Search properties..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Search
                </button>
            </form>
        );
    }

    // Full variant
    return (
        <form onSubmit={handleSearch} className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 ${className}`}>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" value={filters.keyword} onChange={(e) => handleInputChange('keyword', e.target.value)} placeholder="Search by postcode, street, address, keyword, or property title..." className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
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
                        <input type="text" value={filters.location} onChange={(e) => { handleInputChange('location', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="City or Postcode" className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                    <button key={index} type="button" onClick={() => { handleInputChange('location', suggestion); setShowSuggestions(false); }} className="w-full text-left px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors flex items-center gap-2">
                                        <MapPin size={14} className="text-primary" />
                                        <span>{suggestion}</span>
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
                        <select value={filters.listingType} onChange={(e) => handleInputChange('listingType', e.target.value as 'all' | 'rent' | 'sale')} className="w-full pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer">
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
                            <input type="number" value={filters.minPrice || ''} onChange={(e) => handleInputChange('minPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder="Min £" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="relative flex-1">
                            <input type="number" value={filters.maxPrice || ''} onChange={(e) => handleInputChange('maxPrice', e.target.value ? parseInt(e.target.value) : null)} placeholder="Max £" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beds</label>
                        <div className="relative">
                            <Bed className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <select value={filters.minBedrooms || ''} onChange={(e) => handleInputChange('minBedrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full pl-8 pr-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer">
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
                            <select value={filters.minBathrooms || ''} onChange={(e) => handleInputChange('minBathrooms', e.target.value ? parseInt(e.target.value) : null)} className="w-full pl-8 pr-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer">
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

