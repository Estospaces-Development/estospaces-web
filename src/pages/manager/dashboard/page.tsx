"use client";

import { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as analyticsService from '@/services/analyticsService';
import { getUserProperties } from '@/services/userPropertiesService';
import { getFastTrackCases, FastTrackCase } from '@/services/fastTrackService';
import { isFastTrackCaseOverdue } from '@/lib/fastTrackWorkflow';
import { DollarSign, Building2, Eye, UserCheck, Plus, Home, Zap, ArrowRight, Search, X } from 'lucide-react';

// Components
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopProperties from '@/components/dashboard/TopProperties';
import TabBar from '@/components/dashboard/TabBar';
import BrokerResponseWidget from '@/components/dashboard/BrokerResponseWidget';
import PaginationBar from '@/components/ui/PaginationBar';
import ManagerPropertyCard from '@/components/dashboard/ManagerPropertyCard';

const MANAGER_PROPERTIES_PAGE_SIZE = 6;

const managerPropertyTypeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const managerPropertyStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'published', label: 'Published' },
  { value: 'active', label: 'Active' },
  { value: 'online', label: 'Online' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'rejected', label: 'Rejected' },
];

function DashboardContent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<analyticsService.AnalyticsData | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');
  const [propertyPage, setPropertyPage] = useState(1);
  const [propertyTotal, setPropertyTotal] = useState(0);
  const [propertyTotalPages, setPropertyTotalPages] = useState(1);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, fastTrackRes] = await Promise.all([
          analyticsService.getManagerAnalytics(),
          getFastTrackCases(),
        ]);

        if (analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
        if (fastTrackRes.data) {
          setFastTrackCases(fastTrackRes.data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setPropertyError(null);

      try {
        const response = await getUserProperties({
          page: propertyPage,
          limit: MANAGER_PROPERTIES_PAGE_SIZE,
          search: propertySearchQuery.trim() || undefined,
          propertyType: propertyTypeFilter !== 'all' ? propertyTypeFilter : undefined,
          status: propertyStatusFilter !== 'all' ? propertyStatusFilter : undefined,
        });

        if (response.error) {
          setPropertyError(response.error.message);
          setProperties([]);
          setPropertyTotal(0);
          setPropertyTotalPages(1);
          return;
        }

        setProperties(response.data || []);
        setPropertyTotal(response.pagination?.total || 0);
        setPropertyTotalPages(response.pagination?.totalPages || 1);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [propertyPage, propertySearchQuery, propertyStatusFilter, propertyTypeFilter]);

  const fastTrackQueueItems = fastTrackCases
    .filter((caseItem) => caseItem.finalStatus === 'in_progress')
    .map((caseItem) => {
      const isOverdue = isFastTrackCaseOverdue(caseItem);
      const summary = {
        property_selected: 'Property is selected and ready for document follow-up',
        documents_requested: 'Waiting for the client to upload requested verification documents',
        documents_verified: 'Verification is complete and the case is ready for a real viewing',
        viewing_scheduled: 'A linked viewing is booked from the appointments workflow',
        viewing_completed: 'The viewing is complete and the deal review can continue',
        application_in_review: 'Application or sale review is currently in progress',
        ready_for_contract: 'Ready for tenancy contract or final deal handoff',
        completed: 'Completed',
      }[caseItem.currentStep];

      return {
        ...caseItem,
        summary,
        statusLabel: isOverdue ? 'Overdue' : caseItem.hoursRemaining <= 6 ? 'Closing soon' : 'In progress',
        statusTone: isOverdue
          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          : caseItem.hoursRemaining <= 6
            ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
            : 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
      };
    })
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
    .slice(0, 3);
  const activeFastTrackCount = fastTrackCases.filter((caseItem) => caseItem.finalStatus === 'in_progress').length;
  const closingSoonFastTrackCount = fastTrackCases.filter((caseItem) => (
    caseItem.finalStatus === 'in_progress' && caseItem.hoursRemaining > 0 && caseItem.hoursRemaining <= 6
  )).length;
  const completedFastTrackCount = fastTrackCases.filter((caseItem) => caseItem.finalStatus === 'completed').length;

  const stats = {
    monthlyRevenue: analytics?.total_revenue?.toLocaleString() || '0.00',
    monthlyRevenueChange: analytics?.revenue_growth || '0%',
    activeProperties: analytics?.total_properties?.toString() || properties.length.toString(),
    activeListingsChange: analytics?.property_growth || '0%',
    totalViews: analytics?.total_views?.toString() || String(analytics?.propertyPerformance?.reduce((acc, p) => acc + (p.views || 0), 0) || 0),
    totalViewsChange: analytics?.views_growth || '0%',
    conversionRate: `${(analytics?.conversion_rate || analytics?.leadAnalytics?.conversionRate || 0).toFixed(1)}%`,
    conversionRateChange: analytics?.conversion_growth || '0%',
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    const tabRoutes: Record<string, string> = {
      overview: '/manager/dashboard',
      properties: '/manager/dashboard/properties',
      leads: '/manager/leads',
      application: '/manager/applications',
      analytics: '/manager/analytics',
    };

    const nextRoute = tabRoutes[tab];
    if (nextRoute) {
      navigate(nextRoute);
    }
  };

  const handleEditProperty = (id: string) => {
    navigate(`/manager/dashboard/properties/edit/${id}`);
  };

  const handleViewProperty = (id: string) => {
    navigate(`/manager/dashboard/properties/${id}`);
  };

  const handleClearPropertyFilters = () => {
    setPropertySearchQuery('');
    setPropertyTypeFilter('all');
    setPropertyStatusFilter('all');
    setPropertyPage(1);
  };

  const hasPropertyFilters = propertySearchQuery.trim() || propertyTypeFilter !== 'all' || propertyStatusFilter !== 'all';
  const propertyPageStart = propertyTotal === 0 ? 0 : ((propertyPage - 1) * MANAGER_PROPERTIES_PAGE_SIZE) + 1;
  const propertyPageEnd = Math.min(propertyPage * MANAGER_PROPERTIES_PAGE_SIZE, propertyTotal);

  return (
    <div className="space-y-6 relative min-h-screen pb-20 font-outfit">
      <WelcomeBanner analytics={analytics} loading={!analytics && isLoading} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue}`}
          change={stats.monthlyRevenueChange}
          icon={DollarSign}
          iconColor="bg-green-500"
          trendColor="text-green-600"
        />
        <StatCard
          title="Active Listings"
          value={stats.activeProperties}
          change={stats.activeListingsChange}
          icon={Building2}
          iconColor="bg-blue-500"
          trendColor="text-blue-600"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toString()}
          change={stats.totalViewsChange}
          icon={Eye}
          iconColor="bg-purple-500"
          trendColor="text-purple-600"
        />
        <StatCard
          title="Conversion Rate"
          value={stats.conversionRate}
          change={stats.conversionRateChange}
          icon={UserCheck}
          iconColor="bg-orange-500"
          trendColor="text-orange-600"
        />
      </div>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Broker Response Widget (USP) */}
          <BrokerResponseWidget />

          <div className="bg-white dark:bg-black rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white font-outfit">Fast-track lane</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Live cases surface here automatically while user verification stays with admins.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/manager/fast-track')}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 shadow-lg shadow-orange-500/20 transition-all"
              >
                Open fast-track queue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Active cases</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {activeFastTrackCount}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Closing soon</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{closingSoonFastTrackCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Completed</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{completedFastTrackCount}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {fastTrackQueueItems.length > 0 ? fastTrackQueueItems.map((item) => (
                <button
                  key={item.caseId}
                  onClick={() => navigate(`/manager/fast-track?case=${item.caseId}`)}
                  className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4 text-left hover:border-orange-200 hover:bg-orange-50/60 dark:hover:bg-gray-900/60 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.propertyTitle}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.clientName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.statusTone}`}>
                        {item.statusLabel}
                      </span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {item.summary}
                      </span>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Active fast-track cases will appear here automatically.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>

            {/* Top Properties */}
            <div>
              <TopProperties analytics={analytics} loading={!analytics && isLoading} />
            </div>
          </div>

          {/* Your Properties Section */}
          <div className="bg-white dark:bg-black rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <Home className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-outfit">Your Properties</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/manager/dashboard/properties')}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Manage All</span>
                  </button>
                  <button
                    onClick={() => navigate('/manager/dashboard/properties/add')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Property</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={propertySearchQuery}
                    onChange={(event) => {
                      setPropertySearchQuery(event.target.value);
                      setPropertyPage(1);
                    }}
                    placeholder="Search by title, city, or description"
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 px-10 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  {propertySearchQuery && (
                    <button
                      onClick={() => {
                        setPropertySearchQuery('');
                        setPropertyPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label="Clear property search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <select
                  value={propertyTypeFilter}
                  onChange={(event) => {
                    setPropertyTypeFilter(event.target.value);
                    setPropertyPage(1);
                  }}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {managerPropertyTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={propertyStatusFilter}
                  onChange={(event) => {
                    setPropertyStatusFilter(event.target.value);
                    setPropertyPage(1);
                  }}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {managerPropertyStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleClearPropertyFilters}
                  disabled={!hasPropertyFilters}
                  className="rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
              </div>

              <div className="mb-6 flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {propertyTotal > 0
                    ? `Showing ${propertyPageStart}-${propertyPageEnd} of ${propertyTotal} properties`
                    : 'No properties matched the current search.'}
                </p>
                <button
                  onClick={() => navigate('/manager/dashboard/properties')}
                  className="text-sm font-semibold text-orange-500 transition-colors hover:text-orange-600"
                >
                  Open full property workspace
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[350px] bg-gray-50 dark:bg-gray-900 animate-pulse rounded-2xl border border-gray-100 dark:border-gray-800" />
                  ))
                ) : propertyError ? (
                  <div className="col-span-full rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                    {propertyError}
                  </div>
                ) : properties.length > 0 ? (
                  properties.map(prop => (
                    <ManagerPropertyCard
                      key={prop.id}
                      property={prop}
                      onEdit={handleEditProperty}
                      onView={handleViewProperty}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-100 dark:border-gray-700">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                      <Home className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No properties found</h4>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">
                      {hasPropertyFilters
                        ? 'Try broadening your search or clearing the filters.'
                        : 'Start by adding your first property to see it here on your dashboard.'}
                    </p>
                    <button
                      onClick={() => {
                        if (hasPropertyFilters) {
                          handleClearPropertyFilters();
                          return;
                        }
                        navigate('/manager/dashboard/properties/add');
                      }}
                      className="text-orange-500 font-bold hover:underline flex items-center gap-1"
                    >
                      {hasPropertyFilters ? 'Clear filters' : 'Click here to add property'}
                    </button>
                  </div>
                )}
              </div>

              {!propertyError && propertyTotalPages > 1 && (
                <PaginationBar
                  currentPage={propertyPage}
                  totalPages={propertyTotalPages}
                  onPageChange={setPropertyPage}
                  totalItems={propertyTotal}
                  pageSize={MANAGER_PROPERTIES_PAGE_SIZE}
                  currentItemCount={properties.length}
                  itemLabel="properties"
                  disabled={isLoading}
                  className="mt-8"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
