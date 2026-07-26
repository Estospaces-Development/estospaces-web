"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, X, Grid3X3, List, Loader2, Home, BookmarkPlus, Bell, History, Heart, AlertCircle, ChevronDown } from 'lucide-react';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { searchService, SearchResult, FilterOptions, AutocompleteSuggestion, SearchHistoryEntry } from '../../../services/searchService';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import PaginationBar from '@/components/ui/PaginationBar';
import {
    getPriceBoundAdjustmentMessage,
    getSearchFilterValidationMessage,
    getPropertySearchSortOptions,
    normalizePriceBoundInput,
    normalizePropertySearchSort,
    normalizeRoomBoundInput,
    normalizeSearchQueryInput,
    getSearchQueryValidationMessage,
    readSearchUrlFilters,
    serializeSearchMarketParam,
} from '@/lib/propertySearchControls';
import { buildPopularSearchTerms } from '@/lib/popularSearchChips';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import { getLoginPath } from '@/lib/authUtils';
import { getSavedSearchNameError, normalizeSavedSearchName } from '@/lib/savedSearchValidation';
import { buildSearchHistoryLabel, buildSearchHistoryMeta, buildSearchHistoryUrlParams } from '@/lib/searchHistory';
import {
    formatLaunchCurrencyForCountry,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    getLaunchLocationCodeLabel,
    getSupportedLaunchCountry,
    LAUNCH_CURRENCY_SYMBOL,
} from '@/lib/launchLocale';
import { buildPropertyTypeOptions } from '@/lib/propertyTypeOptions';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

const inferSearchGeoMarket = (location: string, properties: SearchResult[]) => {
    const directLocationCountry = getSupportedLaunchCountry(undefined, undefined, location);
    if (directLocationCountry) {
        return directLocationCountry;
    }

    const normalizedLocation = location.trim().toLowerCase();
    if (/\b(london|manchester|birmingham|bristol|leeds|liverpool|edinburgh|glasgow|cardiff|sheffield|nottingham|southampton|oxford|cambridge)\b/.test(normalizedLocation)) {
        return 'GB';
    }
    if (/\b(chennai|mumbai|delhi|bengaluru|bangalore|hyderabad|pune|kolkata|ahmedabad|jaipur|kochi|coimbatore)\b/.test(normalizedLocation)) {
        return 'IN';
    }

    for (const property of properties) {
        const propertyCountry = getSupportedLaunchCountry(property.country, undefined, property.postcode);
        if (propertyCountry) {
            return propertyCountry;
        }

        const currency = String(property.currency || '').trim().toUpperCase();
        if (currency === 'GBP') {
            return 'GB';
        }
        if (currency === 'INR') {
            return 'IN';
        }
    }

    return null;
};

const PropertySearch = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const loginPath = getLoginPath();
    const { error: showToastError } = useToast();
    const { saveProperty, removeProperty, isPropertySaved } = useSavedProperties();

    // Initialize state directly from URL params
    const [query, setQuery] = useState(() => readSearchUrlFilters(searchParams).query);
    const [market, setMarket] = useState(() => readSearchUrlFilters(searchParams).market);
    const [location, setLocation] = useState(() => readSearchUrlFilters(searchParams).location);
    const [propertyType, setPropertyType] = useState(() => readSearchUrlFilters(searchParams).propertyType);
    const [minPrice, setMinPrice] = useState(() => readSearchUrlFilters(searchParams).minPrice);
    const [maxPrice, setMaxPrice] = useState(() => readSearchUrlFilters(searchParams).maxPrice);
    const [bedrooms, setBedrooms] = useState(() => readSearchUrlFilters(searchParams).bedrooms);
    const [listingType, setListingType] = useState(() => readSearchUrlFilters(searchParams).listingType);
    const [baths, setBaths] = useState(() => readSearchUrlFilters(searchParams).baths);
    const [sortBy, setSortBy] = useState(() => readSearchUrlFilters(searchParams).sortBy);
    const [filterInputMessage, setFilterInputMessage] = useState('');

    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [properties, setProperties] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasLoadedSearch, setHasLoadedSearch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [propertyTypeMenuOpen, setPropertyTypeMenuOpen] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [popularSearchTerms, setPopularSearchTerms] = useState<string[]>([]);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null);
    const [searchSaveStatus, setSearchSaveStatus] = useState('');
    const filterValidationMessage = filterInputMessage || getSearchFilterValidationMessage(searchParams);
    const [fallbackNotice, setFallbackNotice] = useState('');
    const queryValidationMessage = getSearchQueryValidationMessage(query, searchParams.has('q') || searchParams.has('keyword'));
    const propertyTypeOptions = useMemo(
        () => buildPropertyTypeOptions(filterOptions?.property_types),
        [filterOptions?.property_types],
    );
    const selectedPropertyType = propertyTypeOptions.find((option) => option.value === propertyType) || propertyTypeOptions[0];
    const fallbackGeoMarket = useUserGeoMarket(user, {
        countryCode: market || undefined,
        locationCode: location || user?.postcode,
    });
    const inferredGeoMarket = useMemo(() => inferSearchGeoMarket(location, properties), [location, properties]);
    const geoMarket = market || inferredGeoMarket || fallbackGeoMarket;
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, location);
    const lowerLocationCodeLabel = locationCodeLabel.toLowerCase();
    const currencySymbol = geoMarket === 'GB' ? '\u00a3' : LAUNCH_CURRENCY_SYMBOL;
    const formatSearchCurrency = useCallback((amount: number) => (
        formatLaunchCurrencyForCountry(amount, { countryCode: geoMarket })
    ), [geoMarket]);

    const activeFilterChips = useMemo(() => {
        const chips: Array<{ label: string; value: string }> = [];

        if (query) {
            chips.push({ label: 'Keyword', value: query });
        }
        if (market) {
            chips.push({ label: 'Market', value: market === 'GB' ? 'England' : 'India' });
        }
        if (location) {
            chips.push({ label: 'Location', value: location });
        }
        if (propertyType) {
            chips.push({ label: 'Type', value: selectedPropertyType.label || propertyType });
        }
        if (listingType) {
            chips.push({ label: 'Listing', value: listingType === 'sale' ? 'For Sale' : 'For Rent' });
        }
        if (minPrice || maxPrice) {
            const minLabel = minPrice ? formatSearchCurrency(Number(minPrice)) : 'Any min';
            const maxLabel = maxPrice ? formatSearchCurrency(Number(maxPrice)) : 'Any max';
            chips.push({ label: 'Budget', value: `${minLabel} - ${maxLabel}` });
        }
        if (bedrooms) {
            chips.push({ label: 'Beds', value: `${bedrooms}+` });
        }
        if (baths) {
            chips.push({ label: 'Baths', value: `${baths}+` });
        }

        return chips;
    }, [baths, bedrooms, formatSearchCurrency, listingType, location, market, maxPrice, minPrice, propertyType, query, selectedPropertyType.label]);

    const buildBroaderSearchAttempts = useCallback(() => {
        const baseFilters = {
            country: market || undefined,
            propertyType: propertyType || undefined,
            listingType: listingType || undefined,
            minBedrooms: bedrooms ? parseInt(bedrooms) : undefined,
            minBathrooms: baths ? parseInt(baths) : undefined,
            sortBy: sortBy !== 'relevance' ? sortBy : undefined,
            page: 1,
            limit: 12,
        };
        const attempts: Array<{ notice: string; filters: Record<string, any> }> = [];

        if (location && (minPrice || maxPrice)) {
            attempts.push({
                notice: 'No exact matches for the selected budget. Showing matches in this location without the price range.',
                filters: { ...baseFilters, location },
            });
        }
        if (location) {
            attempts.push({
                notice: 'No exact matches for this location. Showing broader matches for the selected home criteria.',
                filters: baseFilters,
            });
        }
        if (!location && (minPrice || maxPrice)) {
            attempts.push({
                notice: 'No exact matches for the selected budget. Showing broader matches without the price range.',
                filters: baseFilters,
            });
        }

        return attempts;
    }, [baths, bedrooms, listingType, location, market, maxPrice, minPrice, propertyType, sortBy]);

    // Save Search State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [searchNameError, setSearchNameError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const latestSearchRequestRef = useRef(0);

    const loadSearchHistory = useCallback(async () => {
        if (!isAuthenticated) {
            setSearchHistory([]);
            setHistoryLoading(false);
            return;
        }

        setHistoryLoading(true);
        try {
            const history = await searchService.getSearchHistory(5);
            setSearchHistory(history);
        } finally {
            setHistoryLoading(false);
        }
    }, [isAuthenticated]);

    // Initial load for filters
    useEffect(() => {
        const loadFilters = async () => {
            const opts = await searchService.getFilters();
            if (opts) setFilterOptions(opts);
        };
        loadFilters();
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadPopularSearches = async () => {
            const popular = await searchService.getPopularSearches(8);
            if (isMounted) {
                setPopularSearchTerms(buildPopularSearchTerms(popular, 8));
            }
        };

        void loadPopularSearches();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        void loadSearchHistory();
    }, [loadSearchHistory]);

    // Sync URL params to state when searchParams change (navigation)
    useEffect(() => {
        const urlFilters = readSearchUrlFilters(searchParams);
        setQuery(urlFilters.query);
        setMarket(urlFilters.market);
        setLocation(urlFilters.location);
        setPropertyType(urlFilters.propertyType);
        setMinPrice(urlFilters.minPrice);
        setMaxPrice(urlFilters.maxPrice);
        setBedrooms(urlFilters.bedrooms);
        setListingType(urlFilters.listingType);
        setBaths(urlFilters.baths);
        setSortBy(urlFilters.sortBy);
        setPage(urlFilters.page);
    }, [searchParams]);

    useEffect(() => {
        setFallbackNotice('');
        const next = new URLSearchParams();
        const serializedMarket = serializeSearchMarketParam(market);
        if (query) next.set('q', query);
        if (serializedMarket) next.set('market', serializedMarket);
        if (location) next.set('location', location.trim());
        if (propertyType) next.set('propertyType', propertyType);
        if (minPrice) next.set('minPrice', minPrice);
        if (maxPrice) next.set('maxPrice', maxPrice);
        if (bedrooms) next.set('beds', bedrooms);
        if (baths) next.set('baths', baths);
        if (listingType) next.set('type', listingType);
        if (sortBy !== 'relevance') next.set('sort', sortBy);
        if (page > 1) next.set('page', String(page));

        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
    }, [
        baths,
        bedrooms,
        listingType,
        location,
        market,
        maxPrice,
        minPrice,
        page,
        propertyType,
        query,
        searchParams,
        setSearchParams,
        sortBy,
    ]);

    const fetchProperties = useCallback(async () => {
        const requestId = latestSearchRequestRef.current + 1;
        latestSearchRequestRef.current = requestId;

        if (queryValidationMessage) {
            setLoading(false);
            setError(null);
            setProperties([]);
            setTotal(0);
            setFallbackNotice('');
            setHasLoadedSearch(true);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            setFallbackNotice('');
            const result = await searchService.search(
                query,
                {
                    location: location || undefined,
                    country: market || undefined,
                    propertyType: propertyType || undefined,
                    minPrice: minPrice ? parseInt(minPrice) : undefined,
                    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
                    minBedrooms: bedrooms ? parseInt(bedrooms) : undefined,
                    listingType: listingType || undefined,
                    minBathrooms: baths ? parseInt(baths) : undefined,
                    sortBy: sortBy !== 'relevance' ? sortBy : undefined,
                    page,
                    limit: 12
                }
            );

            if (requestId !== latestSearchRequestRef.current) {
                return;
            }

            if (result.success) {
                const exactResults = result.data || [];
                if (exactResults.length === 0) {
                    for (const attempt of buildBroaderSearchAttempts()) {
                        const fallback = await searchService.search(query, attempt.filters);
                        if (requestId !== latestSearchRequestRef.current) {
                            return;
                        }
                        if (fallback.success && (fallback.data || []).length > 0) {
                            setProperties(fallback.data || []);
                            setTotal(fallback.pagination?.total || fallback.data?.length || 0);
                            setFallbackNotice(attempt.notice);
                            setPage(1);
                            return;
                        }
                    }
                }

                setProperties(result.data || []);
                setTotal(result.pagination?.total || 0);
            } else {
                setError(result.error || 'Failed to fetch properties. Please try again.');
                setProperties([]);
                setTotal(0);
                setFallbackNotice('');
            }
        } catch {
            if (requestId !== latestSearchRequestRef.current) {
                return;
            }

            setError('An error occurred while fetching properties.');
            setProperties([]);
            setTotal(0);
            setFallbackNotice('');
        } finally {
            if (requestId === latestSearchRequestRef.current) {
                setLoading(false);
                setHasLoadedSearch(true);
            }
        }
    }, [query, location, market, propertyType, minPrice, maxPrice, bedrooms, listingType, baths, sortBy, page, queryValidationMessage, buildBroaderSearchAttempts]);

    // Deduplicate and memoize displayed properties to prevent duplicate cards
    const displayedProperties = useMemo(() => {
        const seen = new Set<string>();
        return properties.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [properties]);

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

    const openSaveSearchModal = () => {
        if (!isAuthenticated) {
            navigate(`${loginPath}?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
            return;
        }

        setSearchName(`${query || location || 'Search'} ${new Date().toLocaleDateString()}`);
        setSearchNameError('');
        setIsSaveModalOpen(true);
    };

    const handleSaveSearch = async () => {
        const name = normalizeSavedSearchName(searchName);
        const nameError = getSavedSearchNameError(name);
        if (nameError) {
            setSearchNameError(nameError);
            return;
        }

        setIsSaving(true);
        try {
            const res = await searchService.saveSearch({
                name,
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
                    setSearchNameError('');
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
        setMarket('');
        setLocation('');
        setPropertyType('');
        setMinPrice('');
        setMaxPrice('');
        setBedrooms('');
        setListingType('');
        setBaths('');
        setSortBy('relevance');
        setFilterInputMessage('');
        setFallbackNotice('');
        setPage(1);
    };

    const hasFilters = market || query || location || propertyType || minPrice || maxPrice || bedrooms || listingType || baths || sortBy !== 'relevance';
    const applyFilters = () => {
        setPage(1);
        setShowFilters(false);
        void fetchProperties();
    };

    const handlePopularSearch = (term: string) => {
        setQuery(normalizeSearchQueryInput(term));
        setPage(1);
        setShowSuggestions(false);
    };

    const handleSearchHistoryReuse = (entry: SearchHistoryEntry) => {
        const params = buildSearchHistoryUrlParams(entry);
        navigate(`/user/search?${params.toString()}`);
        setShowSuggestions(false);
    };

    const handleSavePropertyFromSearch = async (property: SearchResult) => {
        if (savingPropertyId === property.id) {
            return;
        }

        const displayTitle = formatLaunchPropertyText(property.title);
        const wasSaved = isPropertySaved(property.id);
        setSavingPropertyId(property.id);
        try {
            const result = wasSaved
                ? await removeProperty(property.id)
                : await saveProperty(property as any);

            if (result?.success === false) {
                setSearchSaveStatus(`Could not update ${displayTitle}.`);
                showToastError(result.error || 'Could not update saved property');
                return;
            }

            setSearchSaveStatus(
                wasSaved
                    ? `${displayTitle} removed from saved properties.`
                    : `${displayTitle} saved from search results.`,
            );
        } catch {
            setSearchSaveStatus(`Could not update ${displayTitle}.`);
            showToastError('Could not update saved property');
        } finally {
            setSavingPropertyId(null);
        }
    };

    const getCoverImage = (property: SearchResult) => getPrimaryPropertyImage(property);

    const friendlySearchError = error && /request header fields too large/i.test(error)
        ? 'Your browser session has stale search data. Refresh this page and try again.'
        : error;
    const isInitialSearchLoading = loading && !hasLoadedSearch;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 pb-20 pt-5 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            {/* Navigation breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-orange-500 transition-colors dark:text-gray-400"
                    aria-label="Go back"
                >
                    <ArrowLeft size={14} />
                    Back
                </button>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <Link to="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-orange-500 transition-colors dark:text-gray-400">
                    <Home size={14} />
                    Home
                </Link>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-gray-900 dark:text-white font-medium">Search Results</span>
            </nav>

            <p role="status" aria-live="polite" className="sr-only">
                {searchSaveStatus || (loading ? (isInitialSearchLoading ? 'Loading search results.' : 'Refreshing search results.') : `${properties.length} search results shown.`)}
            </p>

            {/* Search Header */}
            <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-2 sm:flex-row sm:items-center dark:border-zinc-800">
                <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Estospaces search</p>
                    <h1 className="text-2xl font-bold text-gray-950 dark:text-white mb-1">Find Your Property</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Search verified homes and spaces across Estospaces.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        aria-label="Search properties"
                        aria-autocomplete="list"
                        aria-controls={showSuggestions && locationSuggestions.length > 0 ? 'public-search-suggestions' : undefined}
                        aria-expanded={showSuggestions && locationSuggestions.length > 0}
                        aria-haspopup="listbox"
                        role="combobox"
                        type="text"
                        value={query}
                        maxLength={120}
                        aria-invalid={Boolean(queryValidationMessage)}
                        aria-describedby={queryValidationMessage ? 'search-query-error' : undefined}
                        onChange={(e) => {
                            setQuery(normalizeSearchQueryInput(e.target.value));
                            setPage(1);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            if (locationSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder={`Search by ${lowerLocationCodeLabel}, city, property name...`}
                        className="w-full min-w-0 rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                    {queryValidationMessage && (
                        <p id="search-query-error" role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                            {queryValidationMessage}
                        </p>
                    )}
                    {showSuggestions && locationSuggestions.length > 0 && (
                        <div
                            id="public-search-suggestions"
                            role="listbox"
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg max-h-60 overflow-auto"
                        >
                            {locationSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
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
                    type="button"
                    aria-controls="public-search-filters"
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 shadow-sm transition-colors sm:w-auto sm:shrink-0 ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:border-primary/70 hover:text-primary'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters</span>
                </button>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={openSaveSearchModal}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary/30 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300 dark:hover:bg-orange-950/30 sm:w-auto sm:shrink-0"
                    >
                        <BookmarkPlus className="w-4 h-4" />
                        {isAuthenticated ? 'Save this search' : 'Sign in to save this search'}
                    </button>
                )}
            </div>

            {popularSearchTerms.length > 0 && (
                <section aria-label="Popular searches" className="min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Popular</span>
                        <div className="flex min-w-0 flex-wrap gap-2">
                            {popularSearchTerms.map((term) => (
                                <button
                                    key={term}
                                    type="button"
                                    aria-label={`Search for ${term}`}
                                    onClick={() => handlePopularSearch(term)}
                                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary/30 hover:bg-orange-50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-500/70 dark:hover:bg-orange-950/30"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section aria-label="Recent searches" className="min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        <History className="h-3.5 w-3.5" />
                        Recent
                    </span>
                    {historyLoading ? (
                        <p role="status" className="text-sm text-gray-500 dark:text-gray-400">Loading recent searches...</p>
                    ) : searchHistory.length > 0 ? (
                        <div className="flex min-w-0 flex-wrap gap-2">
                            {searchHistory.map((entry, index) => {
                                const label = buildSearchHistoryLabel(entry);
                                const meta = buildSearchHistoryMeta(entry);
                                return (
                                    <button
                                        key={entry.id || `${label}-${index}`}
                                        type="button"
                                        aria-label={`Reuse search ${label}`}
                                        onClick={() => handleSearchHistoryReuse(entry)}
                                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary/30 hover:bg-orange-50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-500/70 dark:hover:bg-orange-950/30"
                                    >
                                        <span className="mobile-safe-text min-w-0 truncate">{label}</span>
                                        {meta && <span className="shrink-0 text-xs text-gray-400">{meta}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p role="status" className="text-sm text-gray-500 dark:text-gray-400">No recent searches yet</p>
                    )}
                </div>
            </section>

            {activeFilterChips.length > 0 && (
                <section aria-label="Active search filters" className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Active filters</span>
                            {activeFilterChips.map((chip) => (
                                <span
                                    key={`${chip.label}-${chip.value}`}
                                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm dark:border-orange-900/50 dark:bg-zinc-900 dark:text-gray-100"
                                >
                                    <span className="shrink-0 text-primary">{chip.label}</span>
                                    <span className="mobile-safe-text min-w-0 truncate">{chip.value}</span>
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 dark:hover:bg-zinc-900"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear filters
                        </button>
                    </div>
                </section>
            )}

            {filterValidationMessage && (
                <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                    {filterValidationMessage}
                </div>
            )}

            {/* Filters Panel */}
            {fallbackNotice && (
                <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
                    {fallbackNotice}
                </div>
            )}

            {showFilters && (
                <div id="public-search-filters" className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select
                            id="public-search-listing-type"
                            label="Listing Type"
                            options={[
                                { value: 'rent', label: 'For Rent' },
                                { value: 'sale', label: 'For Sale' },
                            ]}
                            value={listingType}
                            onChange={(val) => { setListingType(val); setPage(1); }}
                            placeholder="Any"
                        />
                        <div className="relative flex flex-col gap-1.5">
                            <label id="public-search-property-type-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Property Type
                            </label>
                            <button
                                id="public-search-property-type"
                                type="button"
                                aria-haspopup="listbox"
                                aria-expanded={propertyTypeMenuOpen}
                                aria-labelledby="public-search-property-type-label public-search-property-type"
                                onClick={() => setPropertyTypeMenuOpen((open) => !open)}
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            >
                                <span>{selectedPropertyType.value ? selectedPropertyType.label : 'Any type'}</span>
                                <ChevronDown
                                    size={16}
                                    className={`shrink-0 text-gray-500 transition-transform ${propertyTypeMenuOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {propertyTypeMenuOpen && (
                                <div
                                    id="public-search-property-type-listbox"
                                    role="listbox"
                                    aria-labelledby="public-search-property-type-label"
                                    className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    {propertyTypeOptions.map((option) => (
                                        <button
                                            key={option.value || 'all-types'}
                                            type="button"
                                            role="option"
                                            aria-selected={propertyType === option.value}
                                            onClick={() => {
                                                setPropertyType(option.value);
                                                setPropertyTypeMenuOpen(false);
                                                setPage(1);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${propertyType === option.value
                                                ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-200'
                                                : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            {option.value ? option.label : 'Any type'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="public-search-location" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Location</label>
                            <input
                                id="public-search-location"
                                type="text"
                                value={location}
                                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                                placeholder={`City or ${lowerLocationCodeLabel}`}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label htmlFor="public-search-min-price" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Min Price ({currencySymbol})</label>
                            <input
                                id="public-search-min-price"
                                type="number"
                                value={minPrice}
                                min={0}
                                max={maxPrice || filterOptions?.price_range?.max}
                                onChange={(e) => {
                                    setFilterInputMessage(getPriceBoundAdjustmentMessage(e.target.value));
                                    setMinPrice(normalizePriceBoundInput(e.target.value));
                                    setPage(1);
                                }}
                                placeholder={filterOptions?.price_range?.min ? `Min: ${formatSearchCurrency(filterOptions.price_range.min)}` : "No min"}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label htmlFor="public-search-max-price" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Max Price ({currencySymbol})</label>
                            <input
                                id="public-search-max-price"
                                type="number"
                                value={maxPrice}
                                min={0}
                                max={filterOptions?.price_range?.max}
                                onChange={(e) => {
                                    setFilterInputMessage(getPriceBoundAdjustmentMessage(e.target.value));
                                    setMaxPrice(normalizePriceBoundInput(e.target.value));
                                    setPage(1);
                                }}
                                placeholder={filterOptions?.price_range?.max ? `Max: ${formatSearchCurrency(filterOptions.price_range.max)}` : "No max"}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <Select
                            id="public-search-sort"
                            label="Sort"
                            options={getPropertySearchSortOptions()}
                            value={sortBy}
                            onChange={(val) => { setSortBy(normalizePropertySearchSort(val)); setPage(1); }}
                            placeholder=""
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                id="public-search-bedrooms"
                                label="Bedrooms"
                                options={[
                                    { value: '1', label: '1+' },
                                    { value: '2', label: '2+' },
                                    { value: '3', label: '3+' },
                                    { value: '4', label: '4+' },
                                ]}
                                value={bedrooms}
                                onChange={(val) => { setBedrooms(normalizeRoomBoundInput(val)); setPage(1); }}
                                placeholder="Any"
                            />
                            <Select
                                id="public-search-bathrooms"
                                label="Bathrooms"
                                options={[
                                    { value: '1', label: '1+' },
                                    { value: '2', label: '2+' },
                                    { value: '3', label: '3+' },
                                ]}
                                value={baths}
                                onChange={(val) => { setBaths(normalizeRoomBoundInput(val)); setPage(1); }}
                                placeholder="Any"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={applyFilters} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                            Apply filters
                        </button>
                        {hasFilters && (
                            <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                                <X className="w-3.5 h-3.5" /> Clear all filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Results Header */}
            <div className="flex flex-col items-start justify-between gap-3 min-[360px]:flex-row min-[360px]:items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{isInitialSearchLoading ? '...' : total}</span> properties found
                </p>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                    <label htmlFor="public-search-inline-sort" className="sr-only">Sort</label>
                    <select
                        id="public-search-inline-sort"
                        aria-label="Sort"
                        value={sortBy}
                        onChange={(event) => {
                            setSortBy(normalizePropertySearchSort(event.target.value));
                            setPage(1);
                        }}
                        className="h-10 rounded-md border-0 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-zinc-700 dark:text-gray-100"
                    >
                        {getPropertySearchSortOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        aria-label="Show grid view"
                        aria-pressed={viewMode === 'grid'}
                        onClick={() => setViewMode('grid')}
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Show list view"
                        aria-pressed={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            {isInitialSearchLoading ? (
                <div className="flex justify-center flex-col items-center py-20 text-primary">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <span className="text-sm font-medium text-gray-500">Searching properties...</span>
                </div>
            ) : error ? (
                <div role="alert" className="rounded-xl border border-orange-200 bg-orange-50/80 p-6 text-left text-gray-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-gray-200 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-zinc-900">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-gray-950 dark:text-white">Search temporarily unavailable</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{friendlySearchError}</p>
                        </div>
                    </div>
                </div>
            ) : displayedProperties.length === 0 ? (
                <div role="status" aria-live="polite" className="bg-white dark:bg-black rounded-xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties found</h2>
                    <p className="text-gray-500 dark:text-gray-400">{queryValidationMessage || 'Try adjusting your search criteria'}</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
                    {displayedProperties.map(p => {
                        const coverImg = getCoverImage(p);
                        const isSaved = isPropertySaved(p.id);
                        const isSavingProperty = savingPropertyId === p.id;
                        const displayTitle = formatLaunchPropertyText(p.title);
                        return (
                            <div key={p.id} className="min-w-0 bg-white dark:bg-black rounded-xl border border-gray-100 dark:border-zinc-800 p-4 hover:shadow-md transition-all">
                                <div className="relative mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800" onClick={() => navigate(`/user/properties/${p.id}`)}>
                                    <MapPin className="w-8 h-8 text-gray-300" />
                                    {coverImg ? (
                                        <img
                                            src={coverImg}
                                            alt={displayTitle}
                                            className="absolute inset-0 h-full w-full cursor-pointer object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        null
                                    )}
                                    <button
                                        type="button"
                                        aria-label={isSaved ? `Remove ${displayTitle} from saved properties` : `Save ${displayTitle} from search results`}
                                        aria-pressed={isSaved}
                                        disabled={isSavingProperty}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleSavePropertyFromSearch(p);
                                        }}
                                        className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900 ${isSaved
                                            ? 'bg-rose-500 text-white hover:bg-rose-600'
                                            : 'bg-white/95 text-gray-700 hover:bg-orange-50 hover:text-primary dark:bg-zinc-900/90 dark:text-gray-200 dark:hover:bg-zinc-800'
                                            }`}
                                        title={isSaved ? 'Saved' : 'Save property'}
                                    >
                                        {isSavingProperty ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                                        )}
                                    </button>
                                </div>
                                <h2 className="mobile-safe-text font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer" onClick={() => navigate(`/user/properties/${p.id}`)}>{displayTitle}</h2>
                                <p className="mobile-safe-text text-sm text-gray-500 dark:text-gray-400 mb-2">{formatLaunchPropertyLocation(p.location || [p.city, p.postcode])}</p>
                                <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                    <span className="text-lg font-bold text-primary">
                                        {formatLaunchCurrencyForCountry(p.price, {
                                            countryCode: p.country || geoMarket,
                                            countryName: p.country,
                                            currencyCode: p.currency,
                                        })}
                                        {p.listing_type === 'rent' && <span className="text-sm font-normal text-gray-500">/mo</span>}
                                    </span>
                                    <span className="text-xs text-gray-500">{p.bedrooms} bed · {p.bathrooms} bath {p.square_feet ? `· ${p.square_feet} sqft` : ''}</span>
                                </div>
                                <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/user/properties/${p.id}`)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                                    >
                                        View details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {total > 12 && (
                <div className="pt-8">
                    <PaginationBar
                        currentPage={page}
                        totalPages={Math.ceil(total / 12)}
                        onPageChange={setPage}
                        totalItems={total}
                        pageSize={12}
                        currentItemCount={properties.length}
                        itemLabel="properties"
                    />
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
                            <label htmlFor="save-search-name" className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Search Name</label>
                            <input
                                id="save-search-name"
                                type="text"
                                value={searchName}
                                maxLength={80}
                                aria-invalid={Boolean(searchNameError)}
                                aria-describedby={searchNameError ? 'save-search-name-error' : undefined}
                                onChange={(e) => {
                                    setSearchName(e.target.value);
                                    if (searchNameError) {
                                        setSearchNameError(getSavedSearchNameError(e.target.value));
                                    }
                                }}
                                placeholder="e.g. 2 BHK flats in Chennai"
                                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 dark:bg-zinc-800/50 dark:text-white ${searchNameError ? 'border-red-300 focus:ring-red-500 dark:border-red-800' : 'border-gray-100 focus:ring-primary/50 dark:border-zinc-800'}`}
                            />
                            {searchNameError && (
                                <p id="save-search-name-error" role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                                    {searchNameError}
                                </p>
                            )}
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl flex gap-3">
                            <Bell className="w-5 h-5 text-primary dark:text-orange-300 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-950 dark:text-white">Email Alerts</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">We'll send you an email as soon as new matching properties are listed.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveSearch}
                            disabled={isSaving}
                            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
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
