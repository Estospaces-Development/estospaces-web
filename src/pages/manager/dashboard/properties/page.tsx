"use client";

import { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    useProperties,
    PropertyStatus,
    PropertyType,
    SortField,
    SortOrder,
    Property
} from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';
import PaginationBar from '@/components/ui/PaginationBar';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import {
    MANAGER_LIVE_LISTINGS_STATUS_FILTERS,
    MANAGER_LIVE_LISTINGS_VIEW,
    buildManagerLivePresetFilters,
    buildManagerPropertySearchParams,
    getManagerPropertyStatusFilters,
    managerPropertyStatusFiltersEqual,
    normalizeManagerPropertyStatusFilters,
} from '@/lib/managerPropertyDashboard';
import { formatPropertyInventoryCaption, getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { formatLaunchCurrencyForCountry } from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';
import { isPropertyPubliclyShareable } from '@/lib/propertySharing';

const ManagerPropertyCard = lazy(() => import('@/components/dashboard/ManagerPropertyCard'));
const SharePropertyModal = lazy(() => import('@/components/dashboard/SharePropertyModal'));
import {
    Plus, Edit, Trash2, Filter, Search, Grid, List,
    ChevronDown, X, ArrowUpDown, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
type ViewMode = 'grid' | 'list' | 'map';
type TabType = 'all' | 'favorited' | 'draft';

const priceRangeBounds = [
    { min: undefined, max: undefined },
    { min: 0, max: 100000 },
    { min: 100000, max: 250000 },
    { min: 250000, max: 500000 },
    { min: 500000, max: 1000000 },
    { min: 1000000, max: 2000000 },
    { min: 2000000, max: undefined },
];

const buildPriceRanges = (countryCode: string) => (
    priceRangeBounds.map((range) => {
        const format = (amount: number) => formatLaunchCurrencyForCountry(amount, {
            countryCode,
            showCode: false,
        });

        if (range.min === undefined && range.max === undefined) {
            return { ...range, label: 'Any' };
        }
        if (range.min === 0 && range.max !== undefined) {
            return { ...range, label: `Under ${format(range.max)}` };
        }
        if (range.min !== undefined && range.max === undefined) {
            return { ...range, label: `${format(range.min)}+` };
        }

        return { ...range, label: `${format(range.min as number)} - ${format(range.max as number)}` };
    })
);

// Bedroom options
const bedroomOptions = [
    { label: 'Any', value: undefined },
    { label: 'Studio', value: 0 },
    { label: '1+', value: 1 },
    { label: '2+', value: 2 },
    { label: '3+', value: 3 },
    { label: '4+', value: 4 },
    { label: '5+', value: 5 },
];

// Property types
const propertyTypeOptions: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'villa', label: 'Villa' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'studio', label: 'Studio' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
];

// Status options
const statusOptions: { value: PropertyStatus | string; label: string; color: string; bgColor: string }[] = [
    { value: 'available', label: 'Available', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    { value: 'pending', label: 'Pending', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { value: 'sold', label: 'Sold', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { value: 'rented', label: 'Rented', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    { value: 'under_contract', label: 'Under Contract', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    { value: 'off_market', label: 'Off Market', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
    { value: 'online', label: 'Online', color: 'text-white', bgColor: 'bg-black/60 backdrop-blur-sm border border-white/20' },
    { value: 'active', label: 'Active', color: 'text-white', bgColor: 'bg-black/60 backdrop-blur-sm border border-white/20' },
    { value: 'draft', label: 'Draft', color: 'text-white', bgColor: 'bg-black/60 backdrop-blur-sm border border-white/20' },
];

// Sort options
const sortOptions: { field: SortField; order: SortOrder; label: string }[] = [
    { field: 'createdAt', order: 'desc', label: 'Newest First' },
    { field: 'createdAt', order: 'asc', label: 'Oldest First' },
    { field: 'price', order: 'asc', label: 'Price: Low to High' },
    { field: 'price', order: 'desc', label: 'Price: High to Low' },
    { field: 'area', order: 'desc', label: 'Area: Large to Small' },
    { field: 'area', order: 'asc', label: 'Area: Small to Large' },
    { field: 'bedrooms', order: 'desc', label: 'Bedrooms: Most First' },
];

function PropertiesContent() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const geoMarket = useUserGeoMarket(user);
    const {
        filteredProperties,
        properties: _properties,
        selectedProperties,
        filters,
        sort,
        pagination,
        loading,
        deleteProperty,
        deleteProperties: _deleteProperties,
        duplicateProperty: _duplicateProperty,
        updateProperty: _updateProperty,
        selectProperty: _selectProperty,
        deselectProperty: _deselectProperty,
        clearSelection,
        bulkUpdateStatus,
        setFilters,
        clearFilters,
        setSort,
        setPage,
        exportProperties,
        getPropertyStats,
        incrementShares,
    } = useProperties();



    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [activeTab, _setActiveTab] = useState<TabType>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [_showExportMenu, setShowExportMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [_showBulkActions, setShowBulkActions] = useState(false);
    const [_showBulkDeleteConfirm, _setShowBulkDeleteConfirm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedPropertyForShare, setSelectedPropertyForShare] = useState<Property | null>(null);
    const [pendingDeleteProperty, setPendingDeleteProperty] = useState<Property | null>(null);
    const priceRanges = useMemo(() => buildPriceRanges(geoMarket), [geoMarket]);

    // Stats
    const stats = useMemo(() => getPropertyStats(), [getPropertyStats]);

    // Local filter state
    const searchParamQuery = searchParams.get('search')?.trim() || '';
    const [searchQuery, setSearchQuery] = useState(searchParamQuery || filters.search || '');
    const [selectedPriceRange, setSelectedPriceRange] = useState(0);
    const [selectedBedrooms, setSelectedBedrooms] = useState<number | undefined>(filters.bedroomsMin);
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<PropertyType[]>(filters.propertyType || []);
    const [selectedStatuses, setSelectedStatuses] = useState<(PropertyStatus | string)[]>(filters.status || []);
    const searchParamStatuses = useMemo(
        () => getManagerPropertyStatusFilters(searchParams),
        [searchParams],
    );
    const isLiveListingsPreset = searchParams.get('view') === MANAGER_LIVE_LISTINGS_VIEW;
    const isApplyingFilters = useRef(false);
    const userHasSetFilters = useRef(false);

    useEffect(() => {
        if (!searchParams.has('search')) {
            return;
        }

        setSearchQuery(searchParamQuery);
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('search');
        setSearchParams(nextSearchParams, { replace: true });
    }, [searchParamQuery, searchParams, setSearchParams]);

    useEffect(() => {
        if (isApplyingFilters.current) {
            isApplyingFilters.current = false;
            return;
        }

        // Do not override filters the user just applied via handleApplyFilters.
        if (userHasSetFilters.current) {
            return;
        }

        if (isLiveListingsPreset) {
            const presetStatuses = searchParamStatuses.length > 0
                ? searchParamStatuses
                : [...MANAGER_LIVE_LISTINGS_STATUS_FILTERS];

            if (selectedPriceRange !== 0) {
                setSelectedPriceRange(0);
            }
            if (selectedBedrooms !== undefined) {
                setSelectedBedrooms(undefined);
            }
            if (selectedPropertyTypes.length > 0) {
                setSelectedPropertyTypes([]);
            }
            if (!managerPropertyStatusFiltersEqual(selectedStatuses, presetStatuses)) {
                setSelectedStatuses(presetStatuses);
            }

            const needsPresetSync = filters.priceMin !== undefined
                || filters.priceMax !== undefined
                || filters.bedroomsMin !== undefined
                || (filters.propertyType?.length ?? 0) > 0
                || !managerPropertyStatusFiltersEqual(filters.status, presetStatuses);

            if (needsPresetSync) {
                setFilters(buildManagerLivePresetFilters(filters, presetStatuses));
            }
            return;
        }

        if (searchParamStatuses.length > 0) {
            if (!managerPropertyStatusFiltersEqual(selectedStatuses, searchParamStatuses)) {
                setSelectedStatuses(searchParamStatuses);
            }
            if (!managerPropertyStatusFiltersEqual(filters.status, searchParamStatuses)) {
                setFilters({
                    ...filters,
                    status: searchParamStatuses,
                });
            }
            return;
        }

        if (selectedStatuses.length > 0 && !isApplyingFilters.current) {
            setSelectedStatuses([]);
        }
        if ((filters.status?.length ?? 0) > 0 && !isApplyingFilters.current) {
            setFilters({
                ...filters,
                status: undefined,
            });
        }
    }, [
        filters,
        isLiveListingsPreset,
        searchParamStatuses,
        searchQuery,
        selectedBedrooms,
        selectedPriceRange,
        selectedPropertyTypes,
        selectedStatuses,
        setFilters,
    ]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            const nextSearch = searchQuery.trim() || undefined;
            if (filters.search === nextSearch) {
                return;
            }

            setFilters({ ...filters, search: nextSearch });
        }, 300);
        return () => clearTimeout(timer);
    }, [filters, searchQuery, setFilters]);

    const handleApplyFilters = () => {
        const priceRange = priceRanges[selectedPriceRange];
        const normalizedStatuses = normalizeManagerPropertyStatusFilters(selectedStatuses);

        isApplyingFilters.current = true;
        userHasSetFilters.current = true;
        setTimeout(() => { isApplyingFilters.current = false; }, 0);

        setSearchParams(
            buildManagerPropertySearchParams(searchParams, normalizedStatuses),
            { replace: true },
        );
        setFilters({
            ...filters,
            search: searchQuery || undefined,
            priceMin: priceRange.min,
            priceMax: priceRange.max,
            bedroomsMin: selectedBedrooms,
            propertyType: selectedPropertyTypes.length > 0 ? selectedPropertyTypes : undefined,
            status: normalizedStatuses.length > 0 ? normalizedStatuses : undefined,
        });
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        userHasSetFilters.current = false;
        setSearchQuery('');
        setSelectedPriceRange(0);
        setSelectedBedrooms(undefined);
        setSelectedPropertyTypes([]);
        setSelectedStatuses([]);
        setSearchParams(buildManagerPropertySearchParams(searchParams, []), { replace: true });
        clearFilters();
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
        if (filters.bedroomsMin !== undefined) count++;
        if (filters.propertyType?.length) count++;
        if (filters.status?.length) count++;
        return count;
    }, [filters]);

    const _handleExport = (format: 'csv' | 'json' | 'pdf') => {
        const ids = selectedProperties.length > 0 ? selectedProperties : undefined;
        exportProperties(format, ids);
        setShowExportMenu(false);
    };

    const _handleBulkStatusChange = async (status: PropertyStatus | string) => {
        await bulkUpdateStatus(selectedProperties, status as PropertyStatus);
        clearSelection();
        setShowBulkActions(false);
    };

    const openDeleteDialog = (property: Property) => {
        setPendingDeleteProperty(property);
    };

    const closeDeleteDialog = () => {
        if (loading) {
            return;
        }
        setPendingDeleteProperty(null);
    };

    const handleDeleteConfirm = async () => {
        if (!pendingDeleteProperty) {
            return;
        }

        await deleteProperty(pendingDeleteProperty.id);
        setPendingDeleteProperty(null);
    };

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
            return;
        }

        setPage(nextPage);
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Filter based on tabs
    const tabFilteredProperties = useMemo(() => {
        if (activeTab === 'draft') {
            return filteredProperties.filter(p => p.draft === true || p.status === 'draft');
        }
        return filteredProperties;
    }, [filteredProperties, activeTab]);

    if (!isMounted) return <BrandLoadingScreen variant="section" label="Loading properties..." />;

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Properties</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage all your property listings ({pagination.total} total)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Stats Pills */}
                    <div className="hidden xl:flex items-center gap-2 mr-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {stats.available} Available
                        </span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {stats.pending} Pending
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {stats.sold} Sold
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/manager/dashboard/properties/add')}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Add Property
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-colors">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            aria-label="Search manager properties"
                            placeholder="Search by title, address, city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Clear property search"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter & Sort Controls */}
                    <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:justify-end">
                        {/* Filter Button */}
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-all ${showFilters || activeFiltersCount > 0
                                ? 'border-primary bg-primary/10 text-orange-800 dark:text-orange-200'
                                : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                aria-label="Sort properties"
                                onClick={() => setShowSortMenu(!showSortMenu)}
                                className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                <span className="text-sm font-medium hidden sm:inline">Sort</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                                {showSortMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 z-50 mt-2 w-[min(14rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        {sortOptions.map((option, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setSort({ field: option.field, order: option.order });
                                                    setShowSortMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${sort.field === option.field && sort.order === option.order
                                                    ? 'bg-primary/10 text-orange-800 dark:text-orange-100 font-medium'
                                                    : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            {[
                                { mode: 'grid' as ViewMode, icon: <Grid className="w-4 h-4" /> },
                                { mode: 'list' as ViewMode, icon: <List className="w-4 h-4" /> },
                            ].map(({ mode, icon }) => (
                                <button
                                    type="button"
                                    key={mode}
                                    aria-label={`Switch to ${mode} view`}
                                    aria-pressed={viewMode === mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`p-2 rounded-md transition-all ${viewMode === mode
                                        ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mt-4"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Advanced Filters</h2>
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Price Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Price Range
                                        </label>
                                        <select
                                            value={selectedPriceRange}
                                            onChange={(e) => setSelectedPriceRange(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        >
                                            {priceRanges.map((range, index) => (
                                                <option key={index} value={index}>{range.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Bedrooms */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Bedrooms
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {bedroomOptions.map((option) => (
                                                <button
                                                    key={option.label}
                                                    onClick={() => setSelectedBedrooms(option.value)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedBedrooms === option.value
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Property Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Property Type
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {propertyTypeOptions.slice(0, 5).map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        if (selectedPropertyTypes.includes(option.value)) {
                                                            setSelectedPropertyTypes(selectedPropertyTypes.filter(t => t !== option.value));
                                                        } else {
                                                            setSelectedPropertyTypes([...selectedPropertyTypes, option.value]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPropertyTypes.includes(option.value)
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Status
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {statusOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        isApplyingFilters.current = true;
                                                        if (selectedStatuses.includes(option.value as PropertyStatus | string)) {
                                                            setSelectedStatuses(selectedStatuses.filter(s => s !== option.value));
                                                        } else {
                                                            setSelectedStatuses([...selectedStatuses, option.value as PropertyStatus | string]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedStatuses.includes(option.value as PropertyStatus | string)
                                                        ? `${option.bgColor} ${option.color}`
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-4 py-2 border border-gray-100 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleApplyFilters}
                                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Grid/List View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tabFilteredProperties.map((property) => (
                        <div key={property.id} className="relative group">
                            <ManagerPropertyCard
                                property={property}
                                onEdit={(id) => navigate(`/manager/dashboard/properties/edit/${id}`)}
                                onView={(id) => navigate(`/manager/dashboard/properties/${id}`)}
                            />
                            {/* Quick Actions Overlay (visible on hover) */}
                            <div className="absolute right-3 top-14 z-10 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                                <button
                                    aria-label={`Delete ${property.title}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteDialog(property);
                                    }}
                                    className="p-2 bg-white dark:bg-gray-800 text-red-600 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm [overscroll-behavior-inline:contain] [scrollbar-gutter:stable] touch-pan-x dark:border-gray-800 dark:bg-gray-900">
                    <table className="min-w-[760px] w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {tabFilteredProperties.map((property) => {
                                const statusBadge = getManagerPropertyStatusBadge(property.status);
                                const inventoryCaption = formatPropertyInventoryCaption(
                                    property.dimensions?.totalFloors ?? property.total_floors,
                                    property.dimensions?.occupiedUnits ?? property.occupied_units,
                                );

                                return (
                                    <tr key={property.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/manager/dashboard/properties/${property.id}`)}>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{property.title}</div>
                                                <div className="text-sm text-gray-500">{property.address || property.location?.city}</div>
                                                {inventoryCaption && (
                                                    <div className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                        {inventoryCaption}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {property.priceString}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge.badgeClassName}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClassName}`} />
                                                <span>{statusBadge.label}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                                            {property.propertyType}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    aria-label={`Edit ${property.title}`}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/manager/dashboard/properties/edit/${property.id}`); }}
                                                    className="text-primary hover:text-primary-dark transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    aria-label={isPropertyPubliclyShareable(property.status) ? `Share ${property.title}` : `Publish ${property.title} before sharing`}
                                                    disabled={!isPropertyPubliclyShareable(property.status)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPropertyForShare(property);
                                                        setShowShareModal(true);
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                                                    title={isPropertyPubliclyShareable(property.status) ? "Share public listing" : "Publish this property before sharing"}
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    aria-label={`Delete ${property.title}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteDialog(property);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {tabFilteredProperties.length > 0 && pagination.totalPages > 1 && (
                <PaginationBar
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.total}
                    pageSize={pagination.limit}
                    currentItemCount={tabFilteredProperties.length}
                    itemLabel="properties"
                    disabled={loading}
                />
            )}

            {/* Empty State */}
            {tabFilteredProperties.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No properties found matching your criteria.</p>
                </div>
            )}
            <SharePropertyModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                property={selectedPropertyForShare}
                onShare={() => {
                    if (selectedPropertyForShare) {
                        void incrementShares(selectedPropertyForShare.id);
                    }
                }}
            />
            {pendingDeleteProperty && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                    onClick={closeDeleteDialog}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Delete property confirmation"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete property</h2>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Delete {pendingDeleteProperty.title}? This action cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeDeleteDialog}
                                disabled={loading}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={loading}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? 'Deleting...' : 'Delete property'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PropertiesPage() {
    return (
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading properties..." />}>
            <PropertiesContent />
        </Suspense>
    );
}

