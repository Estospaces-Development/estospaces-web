"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Home, ArrowRight, MapPin, AlertCircle, TrendingUp, Star,
  Loader2, X, Clock, Eye, DollarSign, Sparkles,
  Building2, Key, Bookmark, Map as MapIcon
} from 'lucide-react';

// Contexts
import { useUserLocation } from '@/contexts/LocationContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useAuth } from '@/contexts/AuthContext';

// Components
import ApplicationTimelineWidget from '@/components/dashboard/ApplicationTimelineWidget';
import NearbyAgenciesList from '@/components/dashboard/NearbyAgenciesList';
import BrokerRequestWidget from '@/components/dashboard/BrokerRequestWidget';
import NearbyPropertiesMap from '@/components/dashboard/NearbyPropertiesMap';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import ProfileCompletionCard from '@/components/dashboard/ProfileCompletionCard';

// Mock data
const MOCK_PROPERTIES: any[] = [];

const DashboardClient = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeLocation, loading: locationLoading } = useUserLocation();
  const { activeTab, setActiveTab } = usePropertyFilter();
  const { savedProperties } = useSavedProperties();

  // State for selected property type tab (Buy/Rent/Sold) - default to 'sold'
  const [selectedPropertyType, setSelectedPropertyType] = useState(() => {
    const urlType = searchParams.get('type');
    if (urlType === 'buy' || urlType === 'rent' || urlType === 'sold') {
      return urlType;
    }
    return 'sold';
  });

  // State for selected filter options (array for multiple selections)
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      return filterParam.split(',').filter(f => f);
    }
    return [];
  });

  // Search & filter state
  const [searchInput, setSearchInput] = useState(() => {
    return searchParams.get('location') || '';
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  // Filtered properties state
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [showFilteredResults, setShowFilteredResults] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);

  // Sync selectedPropertyType with URL params
  useEffect(() => {
    const urlType = searchParams.get('type');
    if (urlType === 'buy' || urlType === 'rent' || urlType === 'sold') {
      setSelectedPropertyType(urlType);
    } else if (!urlType) {
      setSelectedPropertyType('sold');
    }
  }, [searchParams]);

  // Sync selectedFilters with URL params
  useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter) {
      setSelectedFilters(urlFilter.split(',').filter(f => f));
    } else {
      setSelectedFilters([]);
    }
  }, [searchParams]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get first name from user metadata
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  // Fetch filtered properties
  const fetchFilteredProperties = useCallback(async () => {
    setSearchLoading(true);
    setError(null);
    setShowFilteredResults(true);

    try {
      let results = [...MOCK_PROPERTIES];

      // Filter by property type
      if (selectedPropertyType === 'rent') {
        results = results.filter((p: any) => p.property_type === 'rent');
      } else {
        results = results.filter((p: any) => p.property_type === 'sale' || p.listing_type === 'sale');
        if (selectedPropertyType === 'sold') {
          results = results.slice(0, 5);
        }
      }

      // Apply filter options
      if (selectedFilters.length > 0) {
        let filteredResults: any[] = [];

        if (selectedFilters.includes('recently_added')) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recent = results.filter((p: any) => new Date(p.created_at || Date.now()) >= sevenDaysAgo);
          filteredResults = [...filteredResults, ...recent];
        }
        if (selectedFilters.includes('most_viewed')) {
          const popular = results.filter((p: any) => (p.view_count || 0) > 200);
          filteredResults = [...filteredResults, ...popular];
        }
        if (selectedFilters.includes('high_demand')) {
          const highDemand = results.filter((p: any) => (p.view_count || 0) > 150);
          filteredResults = [...filteredResults, ...highDemand];
        }
        if (selectedFilters.includes('budget_friendly')) {
          const budget = results.filter((p: any) => {
            const price = parseFloat(p.price) || 0;
            return selectedPropertyType === 'rent' ? price <= 2000 : price <= 1000000;
          });
          filteredResults = [...filteredResults, ...budget];
        }
        results = [...new Set(filteredResults)];
      }

      // Apply location filter
      const locationTerm = searchInput.trim().toLowerCase();
      if (locationTerm) {
        results = results.filter((p: any) =>
          (p.city || '').toLowerCase().includes(locationTerm) ||
          (p.address_line_1 || '').toLowerCase().includes(locationTerm) ||
          (p.postcode || '').toLowerCase().includes(locationTerm)
        );
      }

      results.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setFilteredProperties(results);
      setFilteredCount(results.length);

      if (results.length === 0) {
        setLocationMessage('No properties found matching your filters. Try adjusting your search criteria.');
      }
      setSearchLoading(false);
    } catch (err) {
      console.error('[Dashboard] Error filtering properties:', err);
      setSearchLoading(false);
    }
  }, [selectedPropertyType, selectedFilters, searchInput]);

  // Handle location search
  const handleLocationSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLocationMessage(null);

    if (selectedFilters.length > 0 || searchInput.trim()) {
      fetchFilteredProperties();
    } else {
      const params = new URLSearchParams();
      if (selectedPropertyType === 'buy') {
        params.set('tab', 'buy');
      } else if (selectedPropertyType === 'rent') {
        params.set('tab', 'rent');
      } else if (selectedPropertyType === 'sold') {
        params.set('tab', 'buy');
        params.set('status', 'sold');
      }
      navigate(`/user/dashboard/discover?${params.toString()}`);
    }
  }, [searchInput, selectedPropertyType, selectedFilters, navigate, fetchFilteredProperties]);

  // Map location
  const mapLocation = activeLocation || {
    type: 'default',
    postcode: 'SW1A 1AA',
    latitude: 51.5074,
    longitude: -0.1278,
    city: 'London',
    source: 'default',
  };

  // Map properties - pass raw properties with latitude/longitude for NearbyPropertiesMap
  const mapProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter((p: any) => p && p.latitude && p.longitude);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto dark:bg-[#0a0a0a] min-h-screen transition-all duration-300">

      {/* Simple Welcome Greeting */}
      <div id="greeting-section" className="flex items-center justify-between animate-fadeIn">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">
            {getGreeting()}, <span className="text-orange-500 capitalize">{firstName}</span> 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            What would you like to do today?
          </p>
        </div>

        {/* Profile Completion Widget - Top Right */}
        <div className="ml-auto">
          <ProfileCompletionCard />
        </div>
      </div>

      {/* Hero Search Section - Modern Polished Design */}
      <div id="hero-search" className="relative rounded-3xl shadow-soft-xl overflow-hidden min-h-[500px] lg:min-h-[550px] flex flex-col items-center justify-center animate-fadeIn group">
        {/* Background Image with parallax effect */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')`,
          }}
        />
        {/* Elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-orange-900/30" />

        {/* Top decorative gradient for seamless header blend */}
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/20 to-transparent" />

        {/* Hero Content - Centered */}
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

          {/* Search Card - Clean Glass Effect */}
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 lg:p-8 shadow-2xl max-w-4xl mx-auto animate-slideUp border border-white/50 ring-1 ring-black/5" style={{ animationDelay: '0.2s' }}>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 bg-gray-100/80 p-1.5 rounded-2xl w-fit mx-auto border border-gray-200/50">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedPropertyType('buy');
                  setSearchParams({ type: 'buy' }, { replace: true });
                }}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${selectedPropertyType === 'buy'
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedPropertyType('rent');
                  setSearchParams({ type: 'rent' }, { replace: true });
                }}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${selectedPropertyType === 'rent'
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                Rent
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedPropertyType('sold');
                  setSearchParams({ type: 'sold' }, { replace: true });
                }}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${selectedPropertyType === 'sold'
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                Sold
              </button>
            </div>

            {/* Filter Options Row - Multiple Selection */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { id: 'all', label: 'All Properties', icon: Sparkles },
                { id: 'recently_added', label: 'Recently Added', icon: Clock },
                { id: 'most_viewed', label: 'Most Visited', icon: Eye },
                { id: 'high_demand', label: 'High Demand', icon: TrendingUp },
                { id: 'budget_friendly', label: 'Budget Friendly', icon: DollarSign },
              ].map((filter) => {
                const Icon = filter.icon;
                const isAllSelected = filter.id === 'all' && selectedFilters.length === 0;
                const isSelected = filter.id === 'all' ? isAllSelected : selectedFilters.includes(filter.id);

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      let newFilters: string[];

                      if (filter.id === 'all') {
                        newFilters = [];
                      } else {
                        if (selectedFilters.includes(filter.id)) {
                          newFilters = selectedFilters.filter(f => f !== filter.id);
                        } else {
                          newFilters = [...selectedFilters, filter.id];
                        }
                      }

                      setSelectedFilters(newFilters);

                      const newParams = new URLSearchParams(searchParams);
                      if (newFilters.length === 0) {
                        newParams.delete('filter');
                      } else {
                        newParams.set('filter', newFilters.join(','));
                      }
                      setSearchParams(newParams, { replace: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${isSelected
                      ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-none'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-orange-500' : 'text-gray-400'} />
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Form - Inline */}
            <form onSubmit={handleLocationSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group/input">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-orange-500 transition-colors" size={22} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter postcode, city, or area..."
                  className="w-full pl-14 pr-12 py-4 bg-gray-50 hover:bg-white border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl text-gray-900 placeholder-gray-400 text-lg transition-all duration-300 outline-none shadow-inner"
                  disabled={searchLoading}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 min-w-[160px] shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transform hover:-translate-y-1"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Searching</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Quick Action CTAs - Property Tech Style (hidden when showing filtered results) */}
      {!showFilteredResults && (
        <>
          {/* PROMINENT: Broker + Agencies - Full Width Grid */}
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

          {/* Quick Action Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setActiveTab('buy');
                navigate('/user/dashboard/discover?tab=buy');
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
                navigate('/user/dashboard/discover?tab=rent');
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

          {/* Real-Time Application Monitoring */}
          <Suspense fallback={<div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />}>
            <ApplicationTimelineWidget />
          </Suspense>
        </>
      )}

      {/* Filtered Properties Results */}
      {showFilteredResults && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-orange-500">
                {selectedFilters.includes('recently_added') && 'Recently Added Properties'}
                {selectedFilters.includes('most_viewed') && !selectedFilters.includes('recently_added') && 'Most Visited Properties'}
                {selectedFilters.includes('high_demand') && !selectedFilters.includes('recently_added') && !selectedFilters.includes('most_viewed') && 'High Demand Properties'}
                {selectedFilters.includes('budget_friendly') && !selectedFilters.includes('recently_added') && !selectedFilters.includes('most_viewed') && !selectedFilters.includes('high_demand') && 'Budget Friendly Properties'}
                {selectedFilters.length === 0 && searchInput && `Properties in "${searchInput}"`}
                {selectedFilters.length === 0 && !searchInput && 'Search Results'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchLoading ? 'Loading...' : `${filteredCount} ${filteredCount === 1 ? 'property' : 'properties'} found`}
              </p>
            </div>
            <button
              onClick={() => {
                setShowFilteredResults(false);
                setFilteredProperties([]);
                setSelectedFilters([]);
                setSearchInput('');
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <X size={16} />
              Clear Results
            </button>
          </div>

          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property: any) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onViewDetails={(p: any) => navigate(`/user/dashboard/property/${p.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Properties Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search criteria</p>
              <button
                onClick={() => {
                  setShowFilteredResults(false);
                  setSelectedFilters([]);
                  setSearchInput('');
                  navigate('/user/dashboard/discover');
                }}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Browse All Properties
              </button>
            </div>
          )}

          {/* View More Button */}
          {filteredProperties.length > 0 && filteredCount > 12 && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('tab', selectedPropertyType === 'rent' ? 'rent' : 'buy');
                  if (selectedFilters.length > 0) {
                    params.set('filter', selectedFilters.join(','));
                  }
                  if (searchInput) {
                    params.set('location', searchInput);
                  }
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-slideDown">
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

      {/* Location Message (Info/Warning) */}
      {locationMessage && !error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3 animate-slideDown">
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

      {/* Main Map View - Nearby Properties (hidden when showing filtered results) */}
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
            <div className="bg-white dark:bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-300 overflow-hidden">
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
                  onPropertyClick={(p: any) => navigate(`/user/dashboard/property/${p.id}`)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Section */}
      <DashboardFooter />
    </div>
  );
};

export default DashboardClient;
