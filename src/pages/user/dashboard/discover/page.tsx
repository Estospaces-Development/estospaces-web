"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import {
    Search,
    MapPin,
    Home,
    Grid,
    Map as MapIcon,
    ArrowLeft,
    AlertCircle,
    ChevronDown,
    SlidersHorizontal,
} from 'lucide-react';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { usePublishWorkspaceSync } from '@/contexts/WorkspaceSyncContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import NearbyPropertiesMap from '@/components/dashboard/NearbyPropertiesMap';
import FastTrackRequestConfirmationModal from '@/components/fast-track/FastTrackRequestConfirmationModal';
import PaginationBar from '@/components/ui/PaginationBar';
import { searchService, FilterOptions, SearchResult, AutocompleteSuggestion } from '@/services/searchService';
import { toDiscoverNearbyMapProperties } from '@/lib/discoverMap';
import {
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
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    isValidLaunchLocationCode,
    formatLaunchLocationCode,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';
import { filterPropertiesForMarket } from '@/lib/propertyMarket';
import { buildPropertyTypeOptions } from '@/lib/propertyTypeOptions';
import {
    buildDiscoverSearchParams,
    consumeDiscoverReturnHistoryState,
    isDiscoverReturnHistoryState,
    markDiscoverReturnHistoryState,
    readDiscoverViewMode,
    selectDiscoverSearchSource,
} from '@/lib/discoverSearchState';
import {
    clearPropertySearchReturnState,
    readPropertySearchReturnState,
    savePropertySearchReturnState,
} from '@/lib/propertySearchReturnCache';
import {
    getFastTrackRequestPendingKey,
    readFastTrackRequestPending,
    writeFastTrackRequestPending,
} from '@/lib/fastTrackRequestPending';
import {
    requestDirectPropertyFastTrack,
    type FastTrackRequestStatus,
} from '@/lib/propertyFastTrackRequest';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

const ITEMS_PER_PAGE = 12;
const DISCOVER_PATH = '/user/dashboard/discover';

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
        countryCode?: string;
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
    const searchParamSnapshot = searchParams.toString();
    const isDiscoverReturnEntryRef = useRef(
        typeof window !== 'undefined' && isDiscoverReturnHistoryState(window.history.state),
    );
    const cachedDiscoverSearchRef = useRef(
        typeof window === 'undefined'
            ? null
            : readPropertySearchReturnState(window.sessionStorage, DISCOVER_PATH),
    );
    const initialSearchParamsRef = useRef<URLSearchParams | null>(null);
    const discardedInitialCacheRef = useRef(false);
    if (!initialSearchParamsRef.current) {
        const selection = selectDiscoverSearchSource(
            searchParamSnapshot,
            cachedDiscoverSearchRef.current?.search ?? null,
            isDiscoverReturnEntryRef.current,
        );
        discardedInitialCacheRef.current = selection.discardCachedSearch;
        if (!selection.useCachedSearch) {
            cachedDiscoverSearchRef.current = null;
        }
        initialSearchParamsRef.current = new URLSearchParams(selection.search);
    }
    const initialSearchParams = initialSearchParamsRef.current;
    const { user, getDisplayName } = useAuth();
    const toast = useToast();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const { activeTab, setActiveTab } = usePropertyFilter();

    // Local state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [properties, setProperties] = useState<SearchResult[]>([]);
    const [allSectionProperties, setAllSectionProperties] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState(() => readSearchUrlFilters(initialSearchParams).query);
    const [locationQuery, setLocationQuery] = useState(() => readSearchUrlFilters(initialSearchParams).location);
    const [statusFilter, setStatusFilter] = useState(() => initialSearchParams.get('status') || '');
    const [propertyType, setPropertyType] = useState(() => readSearchUrlFilters(initialSearchParams).propertyType || 'all');
    const [priceRange, setPriceRange] = useState(() => ({
        min: readSearchUrlFilters(initialSearchParams).minPrice,
        max: readSearchUrlFilters(initialSearchParams).maxPrice,
    }));
    const [beds, setBeds] = useState(() => readSearchUrlFilters(initialSearchParams).bedrooms);
    const [baths, setBaths] = useState(() => readSearchUrlFilters(initialSearchParams).baths);
    const [dashboardFilter, setDashboardFilter] = useState(() => initialSearchParams.get('filter') || '');
    const [sortBy, setSortBy] = useState(() =>
        normalizePropertySearchSort(initialSearchParams.get('sort') || initialSearchParams.get('sortBy') || mapDashboardFilterToSearchSort(initialSearchParams.get('filter') || '')),
    );
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => Boolean(
        readSearchUrlFilters(initialSearchParams).location
        || readSearchUrlFilters(initialSearchParams).propertyType
        || readSearchUrlFilters(initialSearchParams).minPrice
        || readSearchUrlFilters(initialSearchParams).maxPrice
        || readSearchUrlFilters(initialSearchParams).bedrooms
        || readSearchUrlFilters(initialSearchParams).baths
        || initialSearchParams.get('sort')
        || initialSearchParams.get('sortBy')
        || initialSearchParams.get('filter'),
    ));
    const [filterInputMessage, setFilterInputMessage] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>(() => readDiscoverViewMode(initialSearchParams));
    const [currentPage, setCurrentPage] = useState(() => parsePositivePage(initialSearchParams.get('page')));
    const [fastTrackStatusByProperty, setFastTrackStatusByProperty] = useState<Record<string, FastTrackRequestStatus>>({});
    const [fastTrackConfirmationProperty, setFastTrackConfirmationProperty] = useState<SearchResult | null>(null);
    const fastTrackRequestsInFlightRef = useRef(new Set<string>());

    useEffect(() => {
        if (isDiscoverReturnEntryRef.current) {
            window.history.replaceState(
                consumeDiscoverReturnHistoryState(window.history.state),
                '',
                window.location.href,
            );
            isDiscoverReturnEntryRef.current = false;
        }

        if (!discardedInitialCacheRef.current) {
            return;
        }
        clearPropertySearchReturnState(window.sessionStorage, DISCOVER_PATH);
        discardedInitialCacheRef.current = false;
    }, []);

    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [globalFilterOptions, setGlobalFilterOptions] = useState<FilterOptions | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const filterValidationMessage = filterInputMessage || getSearchFilterValidationMessage(searchParams);
    const geoMarket = useUserGeoMarket(user, { locationCode: locationQuery || searchParams.get('postcode') });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, locationQuery);
    const formatDiscoveryCurrency = (amount: number) => formatLaunchCurrencyForCountry(amount, {
        countryCode: geoMarket,
    });
    const activeAdvancedFilterCount = [
        locationQuery,
        propertyType !== 'all' ? propertyType : '',
        priceRange.min,
        priceRange.max,
        beds,
        baths,
        sortBy !== 'relevance' ? sortBy : '',
    ].filter(Boolean).length;
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
        const currentSearchParams = new URLSearchParams(
            cachedDiscoverSearchRef.current?.search || searchParamSnapshot,
        );
        const listingParam = currentSearchParams.get('type') || currentSearchParams.get('tab');
        const nextTab = mapListingTypeParamToTab(listingParam);
        if (nextTab === 'rent') setActiveTab('rent');
        else if (nextTab === 'buy') setActiveTab('buy');
        else setActiveTab('all');
    }, [searchParamSnapshot, setActiveTab]);

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
        const currentSearchParams = new URLSearchParams(
            cachedDiscoverSearchRef.current?.search || searchParamSnapshot,
        );
        const urlFilters = readSearchUrlFilters(currentSearchParams);
        setSearchQuery(urlFilters.query);
        setLocationQuery(urlFilters.location);
        setStatusFilter(currentSearchParams.get('status') || '');
        setPropertyType(urlFilters.propertyType || 'all');
        setPriceRange({
            min: urlFilters.minPrice,
            max: urlFilters.maxPrice,
        });
        setBeds(urlFilters.bedrooms);
        setBaths(urlFilters.baths);
        setDashboardFilter(currentSearchParams.get('filter') || '');
        setSortBy(normalizePropertySearchSort(currentSearchParams.get('sort') || currentSearchParams.get('sortBy') || mapDashboardFilterToSearchSort(currentSearchParams.get('filter') || '')));
        setCurrentPage(parsePositivePage(currentSearchParams.get('page')));
        setViewMode(readDiscoverViewMode(currentSearchParams));
    }, [searchParamSnapshot]);

    const fetchData = useCallback(async () => {
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

            const sectionProperties = filterPropertiesForMarket(dedupeSectionProperties(
                result.data.flatMap((section) => section.properties),
            ), geoMarket);
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
    }, [activeTab, baths, beds, currentPage, dashboardFilter, geoMarket, locationQuery, priceRange.max, priceRange.min, propertyType, searchQuery, sortBy, statusFilter]);

    // Refetch when dependencies change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, propertyType, priceRange, beds, baths, currentPage, activeTab, locationQuery, dashboardFilter, statusFilter, sortBy, fetchData]);

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

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const paginatedProperties = properties; // Backend paginates for us
    const discoverReturnSearch = useMemo(() => buildDiscoverSearchParams({
        query: searchQuery,
        location: locationQuery,
        status: statusFilter,
        propertyType,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        bedrooms: beds,
        bathrooms: baths,
        dashboardFilter,
        sortBy,
        listingTab: activeTab === 'buy' || activeTab === 'rent' ? activeTab : 'all',
        viewMode,
        page: currentPage,
    }).toString(), [activeTab, baths, beds, currentPage, dashboardFilter, locationQuery, priceRange.max, priceRange.min, propertyType, searchQuery, sortBy, statusFilter, viewMode]);
    const discoverReturnPath = discoverReturnSearch
        ? `${DISCOVER_PATH}?${discoverReturnSearch}`
        : DISCOVER_PATH;
    const resultStatusMessage = loading
        ? 'Loading discovery properties.'
        : error
            ? error
            : `${paginatedProperties.length} of ${total} discovery properties shown in ${viewMode} view sorted by ${sortBy} from property sections.`;

    useEffect(() => {
        const cachedSearch = cachedDiscoverSearchRef.current;
        if (!cachedSearch || loading || error) {
            return;
        }

        const expectedSearch = discoverReturnSearch ? `?${discoverReturnSearch}` : '';
        if (cachedSearch.search !== expectedSearch) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: cachedSearch.scrollY, behavior: 'auto' });
            clearPropertySearchReturnState(window.sessionStorage, DISCOVER_PATH);
            cachedDiscoverSearchRef.current = null;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [discoverReturnSearch, error, loading]);

    const cacheDiscoverSearchReturn = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.history.replaceState(
            markDiscoverReturnHistoryState(window.history.state),
            '',
            discoverReturnPath,
        );

        savePropertySearchReturnState(window.sessionStorage, {
            pathname: DISCOVER_PATH,
            search: discoverReturnSearch,
            scrollY: window.scrollY,
        });
    }, [discoverReturnPath, discoverReturnSearch]);

    const openPropertyFromDiscover = useCallback((property: { id: string }) => {
        cacheDiscoverSearchReturn();
        navigate(`/user/properties/${property.id}`, {
            state: {
                backTo: discoverReturnPath,
                backLabel: 'Back to Discover',
                backState: markDiscoverReturnHistoryState(null),
            },
        });
    }, [cacheDiscoverSearchReturn, discoverReturnPath, navigate]);

    const getFastTrackRequestStatus = useCallback((propertyID: string): FastTrackRequestStatus => {
        const currentStatus = fastTrackStatusByProperty[propertyID];
        if (currentStatus) {
            return currentStatus;
        }
        if (!user?.id || typeof window === 'undefined') {
            return 'idle';
        }

        const pendingKey = getFastTrackRequestPendingKey(user.id, propertyID);
        return readFastTrackRequestPending(window.localStorage, pendingKey) ? 'requested' : 'idle';
    }, [fastTrackStatusByProperty, user?.id]);

    const submitFastTrackRequestFromDiscover = useCallback(async (propertyReference: { id: string }) => {
        const property = filteredProperties.find((item) => item.id === propertyReference.id);
        if (!property || !user?.id) {
            toast.error('Unable to prepare this Fast Track request. Please refresh and try again.');
            return false;
        }

        const pendingKey = getFastTrackRequestPendingKey(user.id, property.id);
        if (
            fastTrackRequestsInFlightRef.current.has(property.id)
            || readFastTrackRequestPending(window.localStorage, pendingKey)
        ) {
            setFastTrackStatusByProperty((current) => ({
                ...current,
                [property.id]: 'requested',
            }));
            toast.info('Your Fast Track request is already waiting for manager approval.');
            return true;
        }

        fastTrackRequestsInFlightRef.current.add(property.id);
        setFastTrackStatusByProperty((current) => ({
            ...current,
            [property.id]: 'requesting',
        }));

        try {
            const result = await requestDirectPropertyFastTrack({
                property,
                clientId: user.id,
                clientName: getDisplayName(),
            });
            writeFastTrackRequestPending(window.localStorage, pendingKey, result.requestedAt);
            setFastTrackStatusByProperty((current) => ({
                ...current,
                [property.id]: 'requested',
            }));
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                    WORKSPACE_SYNC_TAGS.LEADS,
                ],
                reason: 'User requested Fast Track from property discovery',
                ids: {
                    leadId: result.leadId,
                    propertyId: property.id,
                },
            });
            toast.success('Fast Track requested. The property manager has been notified.');
            return true;
        } catch (requestError) {
            setFastTrackStatusByProperty((current) => ({
                ...current,
                [property.id]: 'idle',
            }));
            toast.error(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to request Fast Track right now.',
            );
            return false;
        } finally {
            fastTrackRequestsInFlightRef.current.delete(property.id);
        }
    }, [filteredProperties, getDisplayName, publishWorkspaceSync, toast, user?.id]);

    const requestFastTrackFromDiscover = useCallback((propertyReference: { id: string }) => {
        const property = filteredProperties.find((item) => item.id === propertyReference.id);
        if (!property || !user?.id) {
            toast.error('Unable to prepare this Fast Track request. Please refresh and try again.');
            return;
        }

        setFastTrackConfirmationProperty(property);
    }, [filteredProperties, toast, user?.id]);

    const confirmFastTrackFromDiscover = useCallback(async () => {
        if (!fastTrackConfirmationProperty) {
            return;
        }

        const submitted = await submitFastTrackRequestFromDiscover(fastTrackConfirmationProperty);
        if (submitted) {
            setFastTrackConfirmationProperty(null);
        }
    }, [fastTrackConfirmationProperty, submitFastTrackRequestFromDiscover]);

    const handleClearFilters = () => {
        clearPropertySearchReturnState(window.sessionStorage, DISCOVER_PATH);
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
        setActiveTab('all');
        setCurrentPage(1);
        navigate(DISCOVER_PATH, { replace: true });
    };

    return (
        <div className="min-h-screen bg-zinc-50 pb-12 dark:bg-gray-950">
            <p role="status" aria-live="polite" className="sr-only" data-discovery-status>
                {resultStatusMessage}
            </p>
            <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            navigate('/user/dashboard');
                        }
                    }}
                    className="group mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-orange-300 dark:focus:ring-offset-gray-950"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header */}
                <header className="mb-4 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/80 p-4 shadow-[0_18px_55px_-42px_rgba(154,52,18,0.55)] dark:border-orange-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-orange-950/30 sm:mb-6 sm:rounded-[2rem] sm:p-8">
                    <div className="flex flex-col gap-4 sm:gap-7 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">
                                Homes on Estospaces
                            </p>
                            <h1 className="mt-2 max-w-xl font-display text-[1.625rem] font-bold leading-tight tracking-[-0.04em] text-gray-950 dark:text-white sm:mt-3 sm:text-4xl">
                                Find a home that fits your next move
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:mt-3 sm:text-base sm:leading-7">
                                {statusFilter === 'sold'
                                    ? 'Review homes that have already completed their journey.'
                                    : activeTab === 'buy'
                                        ? 'Compare homes for sale and request a guided Fast Track when you are ready.'
                                        : activeTab === 'rent'
                                            ? 'Explore rental homes and choose the place that works for you.'
                                            : 'Browse homes for sale and rent, compare the essentials, and decide with confidence.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
                            <div role="group" aria-label="Listing type" className="grid min-h-11 grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex sm:min-h-12 sm:rounded-2xl">
                                {([
                                    ['all', 'All homes'],
                                    ['buy', 'For sale'],
                                    ['rent', 'To rent'],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setActiveTab(value)}
                                        aria-pressed={activeTab === value}
                                        className={`min-h-10 rounded-lg px-2 text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:rounded-xl sm:px-4 sm:text-sm ${activeTab === value
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div role="group" aria-label="Results view" className="grid min-h-11 grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex sm:min-h-12 sm:rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    aria-pressed={viewMode === 'grid'}
                                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:rounded-xl sm:px-4 sm:text-sm ${viewMode === 'grid'
                                        ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-950'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Grid size={18} aria-hidden="true" />
                                    <span>Cards</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('map')}
                                    aria-pressed={viewMode === 'map'}
                                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:rounded-xl sm:px-4 sm:text-sm ${viewMode === 'map'
                                        ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-950'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <MapIcon size={18} aria-hidden="true" />
                                    <span>Map</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Canonical property search */}
                <section aria-label="Property search" className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mb-6 sm:rounded-[1.75rem] sm:p-6">
                    <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="discover-property-search" className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">
                                Find a home
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="discover-property-search"
                                    aria-label="Search properties"
                                    type="text"
                                    placeholder={`City, ${locationCodeLabel.toLowerCase()}, or property`}
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
                                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-orange-500 dark:focus:bg-gray-900 dark:focus:ring-orange-500/10"
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
                                                            openPropertyFromDiscover({ id: suggestion.id });
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

                        <button
                            type="button"
                            aria-controls="discover-advanced-filters"
                            aria-expanded={showAdvancedFilters}
                            onClick={() => setShowAdvancedFilters((visible) => !visible)}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-orange-700 dark:hover:bg-orange-950/30 lg:w-auto"
                        >
                            <SlidersHorizontal size={18} aria-hidden="true" />
                            <span>Filters{activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ''}</span>
                            <ChevronDown
                                size={17}
                                aria-hidden="true"
                                className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>

                    {showAdvancedFilters && (
                    <div id="discover-advanced-filters" aria-labelledby="discover-filters-heading" className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
                        <div className="mb-5">
                            <h2 id="discover-filters-heading" className="font-display text-lg font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
                                Narrow your search
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add only the details that matter to your decision.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label htmlFor="discover-location" className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">City or location code</label>
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
                            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Budget</label>
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
                                type="button"
                                onClick={handleClearFilters}
                                className="h-12 rounded-xl px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-orange-300 dark:hover:bg-orange-950/30"
                            >
                                Clear filters
                            </button>
                        </div>
                        </div>
                    </div>
                    )}
                </section>

                {filterValidationMessage && (
                    <div role="alert" className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                        {filterValidationMessage}
                    </div>
                )}

                <section
                    aria-labelledby="discover-results-heading"
                    className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    data-discover-results-summary
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Available homes</p>
                        <h2 id="discover-results-heading" className="mt-1 font-display text-xl font-semibold tracking-[-0.025em] text-gray-950 dark:text-white">
                            {total} {total === 1 ? 'home' : 'homes'} found
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {paginatedProperties.length > 0
                                ? `Showing ${paginatedProperties.length} on this page in ${viewMode === 'map' ? 'map' : 'card'} view.`
                                : 'Adjust your search to find the right home.'}
                        </p>
                    </div>

                </section>

                {/* Content */}
                {viewMode === 'map' ? (
                    <div className="h-[min(72vh,720px)] min-h-[520px] overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <NearbyPropertiesMap
                            properties={toDiscoverNearbyMapProperties(filteredProperties)}
                            onPropertyClick={openPropertyFromDiscover}
                            onOpenWorkspace={openPropertyFromDiscover}
                            onStartFastTrack={requestFastTrackFromDiscover}
                            getFastTrackRequestStatus={getFastTrackRequestStatus}
                        />
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
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
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                                {paginatedProperties.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        onViewDetails={openPropertyFromDiscover}
                                        onStartFastTrack={requestFastTrackFromDiscover}
                                        fastTrackStatus={getFastTrackRequestStatus(property.id)}
                                        showSaveAction
                                        appearance="discovery"
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
            <FastTrackRequestConfirmationModal
                open={Boolean(fastTrackConfirmationProperty)}
                propertyTitle={fastTrackConfirmationProperty?.title || 'Selected property'}
                propertyLocation={fastTrackConfirmationProperty
                    ? formatLaunchPropertyLocation(
                        fastTrackConfirmationProperty.location
                        || [fastTrackConfirmationProperty.city, fastTrackConfirmationProperty.postcode].filter(Boolean).join(', '),
                    )
                    : undefined}
                isSubmitting={fastTrackConfirmationProperty
                    ? getFastTrackRequestStatus(fastTrackConfirmationProperty.id) === 'requesting'
                    : false}
                onClose={() => setFastTrackConfirmationProperty(null)}
                onConfirm={confirmFastTrackFromDiscover}
            />
        </div>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={
            <BrandLoadingScreen variant="section" label="Loading properties..." />
        }>
            <DiscoverContent />
        </Suspense>
    );
}

