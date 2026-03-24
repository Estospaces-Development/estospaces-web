"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  Key,
  Loader2,
  Map as MapIcon,
  X,
} from 'lucide-react';

import { useUserLocation } from '@/contexts/LocationContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useAuth } from '@/contexts/AuthContext';

import ApplicationTimelineWidget from '@/components/dashboard/ApplicationTimelineWidget';
import NearbyAgenciesList from '@/components/dashboard/NearbyAgenciesList';
import BrokerRequestWidget from '@/components/dashboard/BrokerRequestWidget';
import NearbyPropertiesMap from '@/components/dashboard/NearbyPropertiesMap';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import ProfileCompletionCard from '@/components/dashboard/ProfileCompletionCard';
import SearchBar, { SearchFilters as DashboardSearchFilters } from '@/components/ui/SearchBar';

import { searchService, SearchResult } from '@/services/searchService';

const FILTERED_RESULTS_PAGE_SIZE = 12;

const dashboardFilterOptions = [
  { id: 'recently_added', label: 'Recently Added' },
  { id: 'most_viewed', label: 'Most Viewed' },
  { id: 'high_demand', label: 'High Demand' },
  { id: 'budget_friendly', label: 'Budget Friendly' },
];

const defaultDashboardSearchFilters: DashboardSearchFilters = {
  keyword: '',
  location: '',
  listingType: 'sale',
  propertyType: '',
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  maxBedrooms: null,
  minBathrooms: null,
};

const parsePositivePage = (value: string | null, fallback = 1) => {
  const parsed = Number.parseInt(value || `${fallback}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mapSearchParamsToDashboardType = (value: string | null): 'buy' | 'rent' | 'sold' => {
  if (value === 'rent') {
    return 'rent';
  }
  if (value === 'sold') {
    return 'sold';
  }
  return 'buy';
};

const buildDashboardSearchFiltersFromParams = (searchParams: URLSearchParams): DashboardSearchFilters => {
  const listingType = searchParams.get('type') === 'rent' ? 'rent' : 'sale';

  return {
    keyword: searchParams.get('q') || searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    listingType,
    propertyType: searchParams.get('propertyType') || '',
    minPrice: searchParams.get('minPrice') ? Number.parseInt(searchParams.get('minPrice') || '', 10) : null,
    maxPrice: searchParams.get('maxPrice') ? Number.parseInt(searchParams.get('maxPrice') || '', 10) : null,
    minBedrooms: searchParams.get('beds') || searchParams.get('minBedrooms')
      ? Number.parseInt(searchParams.get('beds') || searchParams.get('minBedrooms') || '', 10)
      : null,
    maxBedrooms: null,
    minBathrooms: searchParams.get('baths') || searchParams.get('minBathrooms')
      ? Number.parseInt(searchParams.get('baths') || searchParams.get('minBathrooms') || '', 10)
      : null,
  };
};

const hasActiveDashboardSearch = (filters: DashboardSearchFilters) => {
  return Boolean(
    filters.keyword.trim() ||
    filters.location.trim() ||
    filters.propertyType ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.minBedrooms !== null ||
    filters.minBathrooms !== null,
  );
};

const buildDashboardSortValue = (filters: string[]) => {
  if (filters.includes('budget_friendly')) {
    return 'price_asc';
  }

  if (filters.includes('recently_added')) {
    return 'newest';
  }

  return undefined;
};

const applyDashboardFilterOrdering = (results: SearchResult[], filters: string[]) => {
  const ordered = [...results];

  if (filters.includes('budget_friendly')) {
    ordered.sort((left, right) => (left.price || 0) - (right.price || 0));
  } else if (filters.includes('most_viewed') || filters.includes('high_demand')) {
    ordered.sort((left, right) => (right.view_count || 0) - (left.view_count || 0));
  } else if (filters.includes('recently_added')) {
    ordered.sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightTime - leftTime;
    });
  }

  return ordered;
};

const buildDiscoverParams = (
  selectedPropertyType: 'buy' | 'rent' | 'sold',
  selectedFilters: string[],
  searchFilters: DashboardSearchFilters,
) => {
  const params = new URLSearchParams();

  if (selectedPropertyType === 'rent') {
    params.set('type', 'rent');
  } else if (selectedPropertyType === 'sold') {
    params.set('type', 'buy');
    params.set('status', 'sold');
  } else {
    params.set('type', 'buy');
  }

  if (selectedFilters.length > 0) {
    params.set('filter', selectedFilters.join(','));
  }
  if (searchFilters.keyword.trim()) {
    params.set('q', searchFilters.keyword.trim());
  }
  if (searchFilters.location.trim()) {
    params.set('location', searchFilters.location.trim());
  }
  if (searchFilters.propertyType) {
    params.set('propertyType', searchFilters.propertyType);
  }
  if (searchFilters.minPrice !== null) {
    params.set('minPrice', String(searchFilters.minPrice));
  }
  if (searchFilters.maxPrice !== null) {
    params.set('maxPrice', String(searchFilters.maxPrice));
  }
  if (searchFilters.minBedrooms !== null) {
    params.set('beds', String(searchFilters.minBedrooms));
  }
  if (searchFilters.minBathrooms !== null) {
    params.set('baths', String(searchFilters.minBathrooms));
  }

  return params;
};

const DashboardClient = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeLocation, loading: locationLoading } = useUserLocation();
  const { setActiveTab } = usePropertyFilter();
  const { savedProperties } = useSavedProperties();

  const [selectedPropertyType, setSelectedPropertyType] = useState<'buy' | 'rent' | 'sold'>(() => (
    mapSearchParamsToDashboardType(searchParams.get('type'))
  ));
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
    const filterParam = searchParams.get('filter');
    return filterParam ? filterParam.split(',').filter(Boolean) : [];
  });
  const [dashboardSearchFilters, setDashboardSearchFilters] = useState<DashboardSearchFilters>(() => (
    buildDashboardSearchFiltersFromParams(searchParams)
  ));
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<SearchResult[]>([]);
  const [showFilteredResults, setShowFilteredResults] = useState(() => {
    const filters = buildDashboardSearchFiltersFromParams(searchParams);
    const activeFilters = searchParams.get('filter');
    return hasActiveDashboardSearch(filters) || Boolean(activeFilters);
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [filteredTotalPages, setFilteredTotalPages] = useState(0);
  const [currentFilteredPage, setCurrentFilteredPage] = useState(() => parsePositivePage(searchParams.get('page')));
  const [nearbyProperties, setNearbyProperties] = useState<SearchResult[]>([]);
  const [nearbyPropertiesLoading, setNearbyPropertiesLoading] = useState(true);

  useEffect(() => {
    const nextDashboardType = mapSearchParamsToDashboardType(searchParams.get('type'));
    const nextFilters = searchParams.get('filter')
      ? searchParams.get('filter')!.split(',').filter(Boolean)
      : [];
    const nextSearchFilters = buildDashboardSearchFiltersFromParams(searchParams);
    const nextPage = parsePositivePage(searchParams.get('page'));

    setSelectedPropertyType(nextDashboardType);
    setSelectedFilters(nextFilters);
    setDashboardSearchFilters(nextSearchFilters);
    setCurrentFilteredPage(nextPage);
    setShowFilteredResults(hasActiveDashboardSearch(nextSearchFilters) || nextFilters.length > 0);
  }, [searchParams]);

  const shouldFetchFilteredResults = hasActiveDashboardSearch(dashboardSearchFilters) || selectedFilters.length > 0;

  useEffect(() => {
    if (selectedPropertyType === 'rent') {
      setActiveTab('rent');
      return;
    }

    setActiveTab('buy');
  }, [selectedPropertyType, setActiveTab]);

  useEffect(() => {
    let active = true;

    const loadNearbyProperties = async () => {
      setNearbyPropertiesLoading(true);

      try {
        const response = await searchService.search('', {
          page: 1,
          limit: 50,
        });

        if (active && response.success) {
          setNearbyProperties(response.data || []);
        }
      } finally {
        if (active) {
          setNearbyPropertiesLoading(false);
        }
      }
    };

    loadNearbyProperties();

    return () => {
      active = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  const fetchFilteredProperties = useCallback(async () => {
    if (!shouldFetchFilteredResults) {
      setFilteredProperties([]);
      setFilteredCount(0);
      setFilteredTotalPages(0);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setError(null);
    setShowFilteredResults(true);

    try {
      const result = await searchService.search(
        dashboardSearchFilters.keyword.trim(),
        {
          location: dashboardSearchFilters.location.trim() || undefined,
          propertyType: dashboardSearchFilters.propertyType || undefined,
          minPrice: dashboardSearchFilters.minPrice ?? undefined,
          maxPrice: dashboardSearchFilters.maxPrice ?? undefined,
          minBedrooms: dashboardSearchFilters.minBedrooms ?? undefined,
          minBathrooms: dashboardSearchFilters.minBathrooms ?? undefined,
          listingType: selectedPropertyType === 'rent' ? 'rent' : 'sale',
          sortBy: buildDashboardSortValue(selectedFilters),
          page: currentFilteredPage,
          limit: FILTERED_RESULTS_PAGE_SIZE,
        },
      );

      if (!result.success) {
        setError('Failed to fetch properties. Please try again.');
        setFilteredProperties([]);
        setFilteredCount(0);
        setFilteredTotalPages(0);
        return;
      }

      const nextProperties = applyDashboardFilterOrdering(result.data || [], selectedFilters);
      const total = result.pagination?.total || nextProperties.length;
      const totalPages = total > 0 ? Math.ceil(total / FILTERED_RESULTS_PAGE_SIZE) : 0;

      setFilteredProperties(nextProperties);
      setFilteredCount(total);
      setFilteredTotalPages(totalPages);

      if (nextProperties.length === 0) {
        setLocationMessage('No properties found matching your search. Try adjusting your criteria.');
      } else {
        setLocationMessage(null);
      }
    } catch (fetchError: any) {
      setError(fetchError?.message || 'An unexpected error occurred while searching.');
      setFilteredProperties([]);
      setFilteredCount(0);
      setFilteredTotalPages(0);
    } finally {
      setSearchLoading(false);
    }
  }, [currentFilteredPage, dashboardSearchFilters, selectedFilters, selectedPropertyType, shouldFetchFilteredResults]);

  useEffect(() => {
    if (!shouldFetchFilteredResults) {
      return;
    }

    fetchFilteredProperties();
  }, [fetchFilteredProperties, shouldFetchFilteredResults]);

  const handleDashboardSearch = useCallback((nextFilters: DashboardSearchFilters) => {
    setDashboardSearchFilters(nextFilters);
    setSelectedPropertyType(nextFilters.listingType === 'rent' ? 'rent' : 'buy');
    setCurrentFilteredPage(1);
    setError(null);
    setLocationMessage(null);
    setShowFilteredResults(hasActiveDashboardSearch(nextFilters) || selectedFilters.length > 0);
  }, [selectedFilters.length]);

  const toggleQuickFilter = (filterId: string) => {
    setSelectedFilters((current) => {
      const nextFilters = current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [filterId];

      setCurrentFilteredPage(1);
      setShowFilteredResults(hasActiveDashboardSearch(dashboardSearchFilters) || nextFilters.length > 0);
      return nextFilters;
    });
  };

  const clearFilteredResults = () => {
    setSelectedFilters([]);
    setDashboardSearchFilters({
      ...defaultDashboardSearchFilters,
      listingType: selectedPropertyType === 'rent' ? 'rent' : 'sale',
    });
    setFilteredProperties([]);
    setFilteredCount(0);
    setFilteredTotalPages(0);
    setCurrentFilteredPage(1);
    setShowFilteredResults(false);
    setError(null);
    setLocationMessage(null);
  };

  const mapLocation = activeLocation || null;
  const activeMapProperties = showFilteredResults ? filteredProperties : nearbyProperties;
  const mapProperties = useMemo(() => (
    activeMapProperties.filter((property) => property && property.latitude && property.longitude)
  ), [activeMapProperties]);

  const resultHeading = selectedFilters.includes('recently_added')
    ? 'Recently Added Properties'
    : selectedFilters.includes('most_viewed')
      ? 'Most Viewed Properties'
      : selectedFilters.includes('high_demand')
        ? 'High Demand Properties'
        : selectedFilters.includes('budget_friendly')
          ? 'Budget Friendly Properties'
          : dashboardSearchFilters.location.trim()
            ? `Properties in "${dashboardSearchFilters.location.trim()}"`
            : dashboardSearchFilters.keyword.trim()
              ? `Results for "${dashboardSearchFilters.keyword.trim()}"`
              : 'Search Results';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto dark:bg-[#0a0a0a] min-h-screen transition-all duration-300">
      <div id="greeting-section" className="flex items-center justify-between animate-fadeIn">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">
            {getGreeting()}, <span className="text-orange-500 capitalize">{firstName}</span> ðŸ‘‹
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            What would you like to do today?
          </p>
        </div>

        <div className="ml-auto">
          <ProfileCompletionCard />
        </div>
      </div>

      <div id="hero-search" className="relative rounded-3xl shadow-soft-xl overflow-hidden min-h-[500px] lg:min-h-[550px] flex flex-col items-center justify-center animate-fadeIn group">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-orange-900/30" />
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/20 to-transparent" />

        <div className="relative z-10 text-center px-4 md:px-6 max-w-5xl mx-auto w-full">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight animate-slideUp"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)' }}
          >
            Find your <span className="text-orange-400" style={{ textShadow: '0 4px 20px rgba(251,146,60,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>perfect space</span>
          </h1>
          <p
            className="text-white text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-slideUp font-medium tracking-wide"
            style={{ animationDelay: '0.1s', textShadow: '0 2px 12px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)' }}
          >
            Discover thousands of premium properties for sale and rent across the UK
          </p>

          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 lg:p-8 shadow-2xl max-w-4xl mx-auto animate-slideUp border border-white/50 ring-1 ring-black/5" style={{ animationDelay: '0.2s' }}>
            <div className="w-full">
              <SearchBar
                variant="hero"
                navigateOnSearch={false}
                onSearch={handleDashboardSearch}
                initialFilters={dashboardSearchFilters}
                className="w-full text-left"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {dashboardFilterOptions.map((filter) => {
                const selected = selectedFilters.includes(filter.id);

                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleQuickFilter(filter.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
              <button
                onClick={() => navigate('/user/search')}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                Open Full Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {!showFilteredResults && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />}>
                <BrokerRequestWidget />
              </Suspense>
            </div>
            <div>
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />}>
                <NearbyAgenciesList />
              </Suspense>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setActiveTab('buy');
                navigate('/user/dashboard/discover?type=buy');
              }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className="p-3.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-500/25">
                <Building2 size={24} className="text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Buy Property</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Find your dream home</p>
              <span className="text-violet-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Browse <ArrowRight size={14} />
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('rent');
                navigate('/user/dashboard/discover?type=rent');
              }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className="p-3.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyan-500/25">
                <Key size={24} className="text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Rent Property</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Explore rentals</p>
              <span className="text-cyan-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore <ArrowRight size={14} />
              </span>
            </button>

            <button
              onClick={() => navigate('/user/dashboard/saved')}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className="p-3.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-rose-500/25">
                <Bookmark size={24} className="text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Saved</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{savedProperties?.length || 0} properties</p>
              <span className="text-rose-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                View All <ArrowRight size={14} />
              </span>
            </button>
          </div>

          <Suspense fallback={<div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />}>
            <ApplicationTimelineWidget />
          </Suspense>
        </>
      )}

      {showFilteredResults && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-orange-500">{resultHeading}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchLoading ? 'Loading...' : `${filteredCount} ${filteredCount === 1 ? 'property' : 'properties'} found`}
              </p>
            </div>
            <button
              onClick={clearFilteredResults}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <X size={16} />
              Clear Results
            </button>
          </div>

          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onViewDetails={(selectedProperty: SearchResult) => navigate(`/user/properties/${selectedProperty.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Properties Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search criteria</p>
              <button
                onClick={clearFilteredResults}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {filteredTotalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                disabled={currentFilteredPage === 1}
                onClick={() => setCurrentFilteredPage((page) => Math.max(page - 1, 1))}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page <span className="font-semibold text-gray-900 dark:text-white">{currentFilteredPage}</span> of {filteredTotalPages}
              </span>
              <button
                disabled={currentFilteredPage >= filteredTotalPages}
                onClick={() => setCurrentFilteredPage((page) => page + 1)}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {filteredProperties.length > 0 && filteredCount > FILTERED_RESULTS_PAGE_SIZE && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  const params = buildDiscoverParams(selectedPropertyType, selectedFilters, dashboardSearchFilters);
                  navigate(`/user/dashboard/discover?${params.toString()}`);
                }}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                View All {filteredCount} Properties
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-slideDown">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
            <AlertCircle className="text-red-600 dark:text-red-400" size={18} />
          </div>
          <p className="flex-1 text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 p-1.5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {locationMessage && !error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3 animate-slideDown">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <AlertCircle className="text-amber-600 dark:text-amber-400" size={18} />
          </div>
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">{locationMessage}</p>
          <button
            onClick={() => setLocationMessage(null)}
            className="text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 p-1.5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!showFilteredResults && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapIcon className="text-orange-500" size={20} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-orange-500">Nearby Properties</h2>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Explore properties on the map - click markers to view details
              </p>
            </div>
            <button
              onClick={() => navigate('/user/dashboard/discover')}
              className="flex items-center gap-2 px-4 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
            >
              <span>Browse All Properties</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {locationLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="h-[600px] lg:h-[700px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin mx-auto mb-4 text-orange-500" size={48} />
                  <p className="text-gray-600 dark:text-gray-300">Loading nearby properties...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="h-[600px] lg:h-[700px]">
                <NearbyPropertiesMap
                  properties={mapProperties}
                  userLocation={mapLocation}
                  onPropertyClick={(property: SearchResult) => navigate(`/user/properties/${property.id}`)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardClient;
