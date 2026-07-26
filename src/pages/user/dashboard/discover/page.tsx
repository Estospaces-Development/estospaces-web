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
    Plus
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import NearbyPropertiesMap from '@/components/dashboard/NearbyPropertiesMap';
import PaginationBar from '@/components/ui/PaginationBar';
import { searchService, FilterOptions, SearchResult, AutocompleteSuggestion } from '@/services/searchService';
import { toDiscoverNearbyMapProperties } from '@/lib/discoverMap';
import {
    getCountryAwarePropertyGroups,
    getPriceBoundAdjustmentMessage,
    getSearchFilterValidationMessage,
    getPropertySearchSortOptions,
    normalizePriceBoundInput,
    normalizePropertySearchSort,
    normalizeRoomBoundInput,
    normalizeSearchQueryInput,
    readSearchUrlFilters,
} from '@/lib/propertySearchControls';
import {
    formatLaunchCurrencyForCountry,
    getLaunchLocationCodeLabel,
    getLaunchLocationCodePlaceholder,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    isValidLaunchLocationCode,
    formatLaunchLocationCode,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';
import { buildPropertyTypeOptions } from '@/lib/propertyTypeOptions';

const ITEMS_PER_PAGE = 12;

const parsePositivePage = (value: string | null, fallback = 1) => {
    const parsed = Number.parseInt(value || `${fallback}`, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mapListingTypeParamToTab = (value: string | null): 'all' | 'buy' | 'rent' => {
    if (value === 'rent') return 'rent';
    if (value === 'buy' || value === 'sale') return 'buy';
    return 'all';
};

const getPrimaryDashboardFilter = (filterParam: string) => {
    return filterParam
        .split(',')
        .map((part) => part.trim())
        .find((part) => part.length > 0) || '';
};

const mapDashboardFilterToSearchSort = (filterParam: string) => {
    const primary = getPrimaryDashboardFilter(filterParam);
    if (primary === 'budget_friendly') return 'price_asc';
    if (primary === 'most_viewed' || primary === 'high_demand') return 'views_desc';
    if (primary === 'recently_added') return 'newest';
    return undefined;
};

const applyDashboardFilterOrdering = (results: SearchResult[], filterParam: string) => {
    const primary = getPrimaryDashboardFilter(filterParam);
    const ordered = [...results];

    if (primary === 'budget_friendly') {
        ordered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (primary === 'most_viewed' || primary === 'high_demand') {
        ordered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (primary === 'recently_added') {
        ordered.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
        });
    }

    return ordered;
};

const includesNormalizedText = (value: string | undefined, query: string) => (
    (value || '').toLowerCase().includes(query)
);

const dedupeSectionProperties = (properties: SearchResult[]) => {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const property of properties) {
        if (!property.id || seen.has(property.id)) {
            continue;
        }
        seen.add(property.id);
        unique.push(property);
    }

    return unique;
};

const buildFilterOptionsFromProperties = (properties: SearchResult[]): FilterOptions => {
    const propertyTypes = new Set<string>();
    const listingTypes = new Set<string>();
    const locations = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const property of properties) {
        if (property.property_type) propertyTypes.add(property.property_type);
        if (property.listing_type) listingTypes.add(property.listing_type);
        if (property.city) locations.add(formatLaunchPropertyLocation(property.city));

        const price = Number(property.price || 0);
        if (Number.isFinite(price) && price > 0) {
            min = Math.min(min, price);
            max = Math.max(max, price);
        }
    }

    return {
        property_types: Array.from(propertyTypes).sort(),
        listing_types: Array.from(listingTypes).sort(),
        locations: Array.from(locations).sort(),
        price_range: {
            min: Number.isFinite(min) ? min : 0,
            max: Number.isFinite(max) ? max : 0,
        },
    };
};

const filterSectionProperties = (
    properties: SearchResult[],
    filters: {
        activeTab: 'all' | 'buy' | 'rent';
        searchQuery: string;
        locationQuery: string;
        statusFilter: string;
        propertyType: string;
        minPrice: string;
        maxPrice: string;
        beds: string;
        baths: string;
        countryCode: string;
    },
) => {
    const normalizedSearch = filters.searchQuery.trim().toLowerCase();
    const normalizedLocation = filters.locationQuery.trim().toLowerCase();
    const parsedMinPrice = filters.minPrice !== '' ? Number(filters.minPrice) : null;
    const parsedMaxPrice = filters.maxPrice !== '' ? Number(filters.maxPrice) : null;
    const parsedMinBeds = filters.beds !== '' ? Number(filters.beds) : null;
    const parsedMinBaths = filters.baths !== '' ? Number(filters.baths) : null;
    const minPrice = parsedMinPrice !== null && Number.isFinite(parsedMinPrice) ? parsedMinPrice : null;
    const maxPrice = parsedMaxPrice !== null && Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : null;
    const minBeds = parsedMinBeds !== null && Number.isFinite(parsedMinBeds) ? parsedMinBeds : null;
    const minBaths = parsedMinBaths !== null && Number.isFinite(parsedMinBaths) ? parsedMinBaths : null;
    const listingType = filters.activeTab === 'buy' ? 'sale' : filters.activeTab === 'rent' ? 'rent' : '';
    const status = filters.statusFilter.trim().toLowerCase();
    const type = filters.propertyType !== 'all' ? filters.propertyType.trim().toLowerCase() : '';
    const countryFilter = filters.countryCode?.trim().toUpperCase();

    return properties.filter((property) => {
        if (listingType && property.listing_type !== listingType) return false;
        if (status && (property.status || '').toLowerCase() !== status) return false;
        if (type && (property.property_type || '').toLowerCase() !== type) return false;
        if (minPrice !== null && Number(property.price || 0) < minPrice) return false;
        if (maxPrice !== null && Number(property.price || 0) > maxPrice) return false;
        if (minBeds !== null && Number(property.bedrooms || 0) < minBeds) return false;
        if (minBaths !== null && Number(property.bathrooms || 0) < minBaths) return false;
        if (countryFilter) {
            const propCountry = (property.countryCode || property.country || '').trim().toUpperCase();
            if (propCountry && propCountry !== countryFilter) return false;
        }
        if (normalizedLocation && ![
            property.location,
            property.city,
            property.postcode,
        ].some((value) => includesNormalizedText(value, normalizedLocation))) {
            return false;
        }
        if (normalizedSearch && ![
            property.title,
            property.description,
            property.location,
            property.city,
            property.postcode,
            property.property_type,
        ].some((value) => includesNormalizedText(value, normalizedSearch))) {
            return false;
        }

        return true;
    });
};

const sortSectionProperties = (properties: SearchResult[], sortBy: string, dashboardFilter: string) => {
    const ordered = applyDashboardFilterOrdering(properties, dashboardFilter);

    if (sortBy === 'price_asc') {
        ordered.sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
    } else if (sortBy === 'price_desc') {
        ordered.sort((left, right) => Number(right.price || 0) - Number(left.price || 0));
    } else if (sortBy === 'newest') {
        ordered.sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());
    } else if (sortBy === 'views_desc') {
        ordered.sort((left, right) => Number(right.view_count || 0) - Number(left.view_count || 0));
    }

    return ordered;
};

const buildSectionSuggestions = (properties: SearchResult[], query: string): AutocompleteSuggestion[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
        return [];
    }

    const suggestions: AutocompleteSuggestion[] = [];
    const seen = new Set<string>();

    for (const property of properties) {
        const displayTitle = formatLaunchPropertyText(property.title);
        const displayCity = formatLaunchPropertyLocation(property.city);
        const displayLocationCode = isValidLaunchLocationCode(property.postcode)
            ? formatLaunchLocationCode(property.postcode)
            : '';
        const candidates = ([
            { id: property.id, text: displayTitle, title: displayTitle, city: displayCity, type: 'property' },
            { text: displayCity, city: displayCity, type: 'city' },
            { text: displayLocationCode, city: displayCity, type: 'postcode' },
        ] as AutocompleteSuggestion[]).filter((suggestion) => (
            suggestion.text && suggestion.text.toLowerCase().includes(normalizedQuery)
        ));

        for (const suggestion of candidates) {
            const key = `${suggestion.type}:${suggestion.text.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push(suggestion);
            if (suggestions.length >= 10) {
                return suggestions;
            }
        }
    }

    return suggestions;
};

function DiscoverContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { activeTab, setActiveTab } = usePropertyFilter();

    // Local state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [properties, setProperties] = useState<SearchResult[]>([]);
    const [allSectionProperties, setAllSectionProperties] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState(() => readSearchUrlFilters(searchParams).query);
    const [locationQuery, setLocationQuery] = useState(() => readSearchUrlFilters(searchParams).location);
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
    const [propertyType, setPropertyType] = useState(() => readSearchUrlFilters(searchParams).propertyType || 'all');
    const [priceRange, setPriceRange] = useState(() => ({
        min: readSearchUrlFilters(searchParams).minPrice,
        max: readSearchUrlFilters(searchParams).maxPrice,
    }));
    const [beds, setBeds] = useState(() => readSearchUrlFilters(searchParams).bedrooms);
    const [baths, setBaths] = useState(() => readSearchUrlFilters(searchParams).baths);
    const [dashboardFilter, setDashboardFilter] = useState(() => searchParams.get('filter') || '');
    const [sortBy, setSortBy] = useState(() =>
        normalizePropertySearchSort(searchParams.get('sort') || searchParams.get('sortBy') || mapDashboardFilterToSearchSort(searchParams.get('filter') || '')),
    );
    const [filterInputMessage, setFilterInputMessage] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [currentPage, setCurrentPage] = useState(() => parsePositivePage(searchParams.get('page')));

    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [globalFilterOptions, setGlobalFilterOptions] = useState<FilterOptions | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const filterValidationMessage = filterInputMessage || getSearchFilterValidationMessage(searchParams);
    const geoMarket = useUserGeoMarket(user, { locationCode: locationQuery || searchParams.get('postcode') });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, locationQuery);
    const locationCodePlaceholder = getLaunchLocationCodePlaceholder(geoMarket, undefined, locationQuery);
    const formatDiscoveryCurrency = (amount: number) => formatLaunchCurrencyForCountry(amount, {
        countryCode: geoMarket,
    });
    const discoverPropertyTypeOptions = useMemo(() => {
        const propertyTypes =
            globalFilterOptions?.property_types?.length
                ? globalFilterOptions.property_types
                : filterOptions?.property_types;

        return buildPropertyTypeOptions(propertyTypes).map((option) => (
            option.value === '' ? { ...option, value: 'all' } : option
        ));
    }, [filterOptions?.property_types, globalFilterOptions?.property_types]);

    // Initialize filters from URL/Context
    useEffect(() => {
        const listingParam = searchParams.get('type') || searchParams.get('tab');
        const nextTab = mapListingTypeParamToTab(listingParam);
        if (nextTab === 'rent') setActiveTab('rent');
        else if (nextTab === 'buy') setActiveTab('buy');
        else setActiveTab('all');
    }, [searchParams, setActiveTab]);

    useEffect(() => {
        let isMounted = true;

        const loadGlobalFilters = async () => {
            const options = await searchService.getFilters();
            if (isMounted && options) {
                setGlobalFilterOptions(options);
            }
        };

        void loadGlobalFilters();
        return () => {
            isMounted = false;
        };
    }, []);

    // Keep page filters synchronized with URL query parameters
    useEffect(() => {
        const urlFilters = readSearchUrlFilters(searchParams);
        setSearchQuery(urlFilters.query);
        setLocationQuery(urlFilters.location);
        setStatusFilter(searchParams.get('status') || '');
        setPropertyType(urlFilters.propertyType || 'all');
        setPriceRange({
            min: urlFilters.minPrice,
            max: urlFilters.maxPrice,
        });
        setBeds(urlFilters.bedrooms);
        setBaths(urlFilters.baths);
        setDashboardFilter(searchParams.get('filter') || '');
        setSortBy(normalizePropertySearchSort(searchParams.get('sort') || searchParams.get('sortBy') || mapDashboardFilterToSearchSort(searchParams.get('filter') || '')));
        setCurrentPage(parsePositivePage(searchParams.get('page')));
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await searchService.getPropertySections(geoMarket);

            if (!result.success) {
                setProperties([]);
                setAllSectionProperties([]);
                setTotal(0);
                setFilterOptions(null);
                setError(result.error || 'Failed to fetch property sections from server.');
                return;
            }

            const sectionProperties = dedupeSectionProperties(
                result.data.flatMap((section) => section.properties),
            );
            const filtered = filterSectionProperties(sectionProperties, {
                activeTab: activeTab === 'buy' || activeTab === 'rent' ? activeTab : 'all',
                searchQuery,
                locationQuery,
                statusFilter,
                propertyType,
                minPrice: priceRange.min,
                maxPrice: priceRange.max,
                beds,
                baths,
                countryCode: geoMarket,
            });
            const sorted = sortSectionProperties(
                filtered,
                sortBy !== 'relevance' ? sortBy : mapDashboardFilterToSearchSort(dashboardFilter) || 'relevance',
                dashboardFilter,
            );
            const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;

            setAllSectionProperties(sectionProperties);
            setFilterOptions(buildFilterOptionsFromProperties(sectionProperties));
            setProperties(sorted.slice(pageStart, pageStart + ITEMS_PER_PAGE));
            setTotal(sorted.length);
        } catch {
            setProperties([]);
            setAllSectionProperties([]);
            setTotal(0);
            setFilterOptions(null);
            setError('An unexpected error occurred while processing property sections.');
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
    }, [searchQuery, propertyType, priceRange, beds, baths, currentPage, activeTab, locationQuery, dashboardFilter, statusFilter, sortBy, geoMarket]);

    // Autocomplete location suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.length >= 2) {
                setLocationSuggestions(buildSectionSuggestions(allSectionProperties, searchQuery));
            } else {
                setLocationSuggestions([]);
            }
        };

        const timer = setTimeout(() => {
            fetchSuggestions();
        }, 300);
        return () => clearTimeout(timer);
    }, [allSectionProperties, searchQuery]);

    // The backend now handles all filtering and pagination natively.
    const filteredProperties = properties;
    const countryGroups = useMemo(
        () => getCountryAwarePropertyGroups(filteredProperties),
        [filteredProperties],
    );

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const paginatedProperties = properties; // Backend paginates for us
    const resultStatusMessage = loading
        ? 'Loading discovery properties.'
        : error
            ? error
            : `${paginatedProperties.length} of ${total} discovery properties shown in ${viewMode} view sorted by ${sortBy} from property sections.`;

    const handleClearFilters = () => {
        setSearchQuery('');
        setLocationQuery('');
        setStatusFilter('');
        setPropertyType('all');
        setPriceRange({ min: '', max: '' });
        setBeds('');
        setBaths('');
        setDashboardFilter('');
        setSortBy('relevance');
        setFilterInputMessage('');
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <p role="status" aria-live="polite" className="sr-only" data-discovery-status>
                {resultStatusMessage}
            </p>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-600 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-orange-400 dark:focus:ring-offset-gray-900 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Properties</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {statusFilter === 'sold'
                                ? 'Showing sold properties'
                                : activeTab === 'buy'
                                    ? 'Showing properties for sale'
                                    : activeTab === 'rent'
                                        ? 'Showing properties for rent'
                                        : 'Find your next home across India'}
                        </p>
                    </div>

                    <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${viewMode === 'grid'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Grid size={18} />
                            <span>Grid</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${viewMode === 'map'
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
                                    aria-label="Search properties"
                                    type="text"
                                    placeholder={`${locationCodeLabel}, street, or property name (${locationCodePlaceholder})`}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(normalizeSearchQueryInput(e.target.value));
                                        setCurrentPage(1);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => {
                                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    onBlur={() => setShowSuggestions(false)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                                {showSuggestions && locationSuggestions.length > 0 && (
                                    <div
                                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-auto"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {locationSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-between gap-2"
                                                onClick={() => {
                                                    if (suggestion.type === 'property' && suggestion.id) {
                                                        navigate(`/user/properties/${suggestion.id}`);
                                                    } else if (suggestion.type === 'postcode') {
                                                        setSearchQuery(suggestion.text);
                                                        setLocationQuery('');
                                                    } else {
                                                        setSearchQuery(suggestion.text);
                                                        setLocationQuery(suggestion.city || suggestion.text);
                                                    }
                                                    setCurrentPage(1);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {suggestion.type === 'property' ? <Home className="w-4 h-4 text-orange-500" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                                                    <span>{suggestion.text}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{suggestion.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="discover-location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="discover-location"
                                    type="text"
                                    placeholder={`City, town, or ${locationCodeLabel.toLowerCase()}`}
                                    value={locationQuery}
                                    onChange={(e) => {
                                        setLocationQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="discover-min-price" className="sr-only">Min Price</label>
                                    <input
                                    id="discover-min-price"
                                    type="number"
                                    aria-label="Min Price"
                                    placeholder={filterOptions?.price_range?.min ? `Min: ${formatDiscoveryCurrency(filterOptions.price_range.min)}` : "Min"}
                                    value={priceRange.min}
                                    min={0}
                                    max={priceRange.max || filterOptions?.price_range?.max}
                                    onChange={(e) => {
                                        setFilterInputMessage(getPriceBoundAdjustmentMessage(e.target.value));
                                        setPriceRange({ ...priceRange, min: normalizePriceBoundInput(e.target.value) });
                                        setCurrentPage(1);
                                    }}
                                    className="themed-number-input w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                                <span className="text-gray-400">-</span>
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="discover-max-price" className="sr-only">Max Price</label>
                                    <input
                                    id="discover-max-price"
                                    type="number"
                                    aria-label="Max Price"
                                    placeholder={filterOptions?.price_range?.max ? `Max: ${formatDiscoveryCurrency(filterOptions.price_range.max)}` : "Max"}
                                    value={priceRange.max}
                                    min={0}
                                    max={filterOptions?.price_range?.max}
                                    onChange={(e) => {
                                        setFilterInputMessage(getPriceBoundAdjustmentMessage(e.target.value));
                                        setPriceRange({ ...priceRange, max: normalizePriceBoundInput(e.target.value) });
                                        setCurrentPage(1);
                                    }}
                                    className="themed-number-input w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="discover-property-type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Property Type</label>
                            <select
                                id="discover-property-type"
                                value={propertyType}
                                onChange={(e) => {
                                    setPropertyType(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                {discoverPropertyTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="discover-sort" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sort</label>
                            <select
                                id="discover-sort"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(normalizePropertySearchSort(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                {getPropertySearchSortOptions().map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="discover-bedrooms" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bedrooms</label>
                            <select
                                id="discover-bedrooms"
                                value={beds}
                                onChange={(e) => {
                                    setBeds(normalizeRoomBoundInput(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                            >
                                <option value="">Any Beds</option>
                                <option value="1">1+ Bed</option>
                                <option value="2">2+ Beds</option>
                                <option value="3">3+ Beds</option>
                                <option value="4">4+ Beds</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="discover-bathrooms" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bathrooms</label>
                            <select
                                id="discover-bathrooms"
                                value={baths}
                                onChange={(e) => {
                                    setBaths(normalizeRoomBoundInput(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
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

                {filterValidationMessage && (
                    <div role="alert" className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                        {filterValidationMessage}
                    </div>
                )}

                {countryGroups.length > 0 && (
                    <section
                        aria-labelledby="discover-country-groups-heading"
                        className="mb-8 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-900/30 dark:bg-gray-800"
                    >
                        <h2 id="discover-country-groups-heading" className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
                            Country-aware groups
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {countryGroups.map((group) => (
                                <span
                                    key={group.key}
                                    className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-200"
                                >
                                    {group.label}: {group.count}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Content */}
                {viewMode === 'map' ? (
                    <div className="h-[min(72vh,720px)] min-h-[520px]">
                        <NearbyPropertiesMap
                            properties={toDiscoverNearbyMapProperties(filteredProperties)}
                            onPropertyClick={(property) => navigate(`/user/properties/${property.id}`)}
                            onOpenWorkspace={(property) => navigate(`/user/properties/${property.id}`)}
                            onStartFastTrack={(property) => navigate(`/user/properties/${property.id}?fast-track=1`)}
                        />
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
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        onStartFastTrack={(property) => navigate(`/user/properties/${property.id}?fast-track=1`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div role="status" aria-live="polite" className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                                <div className="inline-flex items-center justify-center p-6 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                                    <Search className="text-gray-400" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No properties match your search</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                                    Try adjusting your filters or search terms. We're constantly adding new listings across India.
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
                            <div className="mt-12">
                                <PaginationBar
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={total}
                                    pageSize={ITEMS_PER_PAGE}
                                    currentItemCount={paginatedProperties.length}
                                    itemLabel="properties"
                                />
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

