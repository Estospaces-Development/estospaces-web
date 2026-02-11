"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  TrendingUp,
  Search,
  Sliders,
  Bell,
  Home,
  Star,
  Compass,
  Building2,
  DollarSign,
  Briefcase,
  ArrowRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Contexts
import { useUserLocation } from '@/contexts/LocationContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import { useProperties } from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';

// Components
import ApplicationTimelineWidget from '@/components/dashboard/ApplicationTimelineWidget';
import NearbyAgenciesList from '@/components/dashboard/NearbyAgenciesList';
import BrokerRequestWidget from '@/components/dashboard/BrokerRequestWidget';
import PropertyDiscoverySection from '@/components/dashboard/PropertyDiscoverySection';
import LakshmiAssistant from '@/components/dashboard/LakshmiAssistant';
import ProfileCompletionCard from '@/components/dashboard/ProfileCompletionCard';

const DashboardClient = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation, loading: locationLoading } = useUserLocation();
  const { activeTab, setActiveTab } = usePropertyFilter(); // We will use this with shouldNavigate=false
  const { savedProperties } = useSavedProperties();

  // Local state for filters mimicking legacy behavior
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceRange: [0, 10000000],
    bedrooms: 'any',
    propertyType: 'any'
  });

  // Mock properties for now to allow render
  const featuredProperties: any[] = [];
  const trendingProperties: any[] = [];
  const isLoadingProperties = false;

  // Local state for welcome message
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to discover with search params
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    params.set('type', activeTab);
    router.push(`/user/dashboard/discover?${params.toString()}`);
  };

  const dashboardTabs = [
    { id: 'all', label: 'All', icon: Compass },
    { id: 'rent', label: 'Rent', icon: Home },
    { id: 'buy', label: 'Buy', icon: DollarSign },
    { id: 'invest', label: 'Invest', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24 lg:pb-12">
      {/* Lakshmi AI Assistant */}
      <LakshmiAssistant />

      {/* Profile Completion Widget - Floating */}
      <div className="fixed bottom-6 right-6 z-40">
        <ProfileCompletionCard />
      </div>

      {/* Hero Section - Legacy Style */}
      <div className="relative h-[500px] w-full bg-gray-900 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

        <div className="relative h-full max-w-7xl mx-auto px-4 lg:px-6 flex flex-col justify-center">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Find your place<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
                  in the world
                </span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6"
            >
              {/* Tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 md:pb-0 scrollbars-none">
                {dashboardTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id, false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isActive
                        ? 'bg-white text-gray-900 shadow-lg scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="City, Neighborhood, or Address..."
                    className="w-full h-14 pl-12 pr-4 bg-white rounded-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 px-8 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                >
                  Search
                </button>
                <button
                  type="button"
                  className="h-14 w-14 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                  title="Advanced Filters"
                >
                  <Sliders size={20} />
                </button>
              </form>

              {/* Quick Filters / Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['Apartment', 'House', 'Villa', 'Office', 'Studio'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilters(prev => ({ ...prev, propertyType: type.toLowerCase() }))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${filters.propertyType === type.toLowerCase()
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 -mt-20 relative z-10 space-y-8">

        {/* 1. Welcome & Location Status (Moved slightly down from legacy, but matches structure) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl shadow-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {greeting}, {user?.name?.split(' ')[0] || 'User'}!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You have {savedProperties?.length || 0} saved properties and 2 upcoming viewings.
            </p>
          </div>
          {locationLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse">
              <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-xl">
              <MapPin size={16} className="text-orange-500" />
              {activeLocation?.city || 'Location not found'}
            </div>
          )}
        </div>

        {/* 2. Real-Time Application Tracking (Priority) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase size={20} className="text-orange-500" />
              Your Applications
            </h3>
          </div>
          <ApplicationTimelineWidget />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Discovery */}
          <div className="lg:col-span-2 space-y-8">
            {/* 3. Property Discovery - Featured/Trending */}
            <PropertyDiscoverySection
              title="Recommended for You"
              description={`Based on your search in ${activeLocation?.city || 'your area'}`}
              icon={TrendingUp}
              properties={trendingProperties}
              loading={isLoadingProperties}
              badge={{ type: 'trending' }}
              emptyMessage="No recommendations available yet."
            />

            <PropertyDiscoverySection
              title="New to Market"
              description="Fresh listings added within the last 48 hours"
              icon={Star}
              properties={featuredProperties}
              loading={isLoadingProperties}
              badge={{ type: 'new' }}
              emptyMessage="No new properties listed recently."
            />
          </div>

          {/* Right Column - Actions & Widgets */}
          <div className="space-y-6">
            {/* 4. Broker Request Widget */}
            <BrokerRequestWidget />

            {/* 5. Incoming Nearby Agencies */}
            <NearbyAgenciesList />

            {/* 6. Quick Stats/Summary Card */}
            <div className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Your Activity
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-3xl font-bold">{savedProperties?.length || 0}</div>
                  <div className="text-xs text-white/80 mt-1">Saved Homes</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-3xl font-bold">2</div>
                  <div className="text-xs text-white/80 mt-1">Viewings</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-3xl font-bold">1</div>
                  <div className="text-xs text-white/80 mt-1">Offers Made</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-3xl font-bold">5</div>
                  <div className="text-xs text-white/80 mt-1">Searches</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
