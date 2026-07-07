"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as analyticsService from '@/services/analyticsService';
import { getUserProperties } from '@/services/userPropertiesService';
import { getFastTrackCases, FastTrackCase } from '@/services/fastTrackService';
import { bookingsService, type Booking } from '@/services/bookingsService';
import { isFastTrackCaseOverdue } from '@/lib/fastTrackWorkflow';
import {
  buildManagerActiveListingsPath,
  filterManagerLivePropertyPerformance,
  formatManagerAnalyticsPercentage,
  getManagerFastTrackSummary,
  getManagerLiveListingCount,
  MANAGER_LIVE_LISTINGS_STATUS_FILTERS,
  isManagerLivePropertyStatus,
} from '@/lib/managerPropertyDashboard';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { dedupeFastTrackWorkspaceCases } from '@/lib/fastTrackWorkspaceLoad';
import { useDashboardWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import {
  canLoadManagerOperationalDashboard,
  getManagerDashboardAccessState,
  type ManagerDashboardAccessState,
} from '@/lib/managerDashboardAccess';
import { Building2, Eye, UserCheck, Plus, Home, Zap, ArrowRight, Search, X, CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

// Components
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopProperties from '@/components/dashboard/TopProperties';
import TabBar from '@/components/dashboard/TabBar';
import BrokerResponseWidget from '@/components/dashboard/BrokerResponseWidget';
import Avatar from '@/components/ui/Avatar';
import PaginationBar from '@/components/ui/PaginationBar';
import ManagerPropertyCard from '@/components/dashboard/ManagerPropertyCard';
import ManualFastTrackModal from '@/components/manager/FastTrack/ManualFastTrackModal';
import RoleDocsPreviewCard from '@/components/docs/RoleDocsPreviewCard';
import { managerDocs } from '@/lib/roleDocsContent';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';

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

const managerDashboardAccessCopy: Record<Exclude<ManagerDashboardAccessState, 'approved'>, {
  title: string;
  description: string;
  actionLabel: string;
}> = {
  loading: {
    title: 'Checking manager readiness',
    description: 'Your workspace will unlock after your manager verification state is confirmed.',
    actionLabel: 'Open verification',
  },
  profile_required: {
    title: 'Complete manager verification',
    description: 'Operational data stays hidden until your manager profile and required documents are approved.',
    actionLabel: 'Complete verification',
  },
  review_pending: {
    title: 'Verification review in progress',
    description: 'Operational data stays hidden while your manager verification is being reviewed.',
    actionLabel: 'View verification',
  },
  changes_required: {
    title: 'Verification changes required',
    description: 'Operational data stays hidden until the requested verification changes are resolved and approved.',
    actionLabel: 'Fix verification',
  },
};

function DashboardContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    managerProfile,
    verificationStatus,
    isLoading: managerVerificationLoading,
    error: managerVerificationError,
  } = useManagerVerification();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<analyticsService.AnalyticsData | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [livePropertyTotal, setLivePropertyTotal] = useState<number | null>(null);
  const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isManualFastTrackOpen, setIsManualFastTrackOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');
  const [propertyPage, setPropertyPage] = useState(1);
  const [propertyTotal, setPropertyTotal] = useState(0);
  const [propertyTotalPages, setPropertyTotalPages] = useState(1);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [fastTrackError, setFastTrackError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmingBookingID, setConfirmingBookingID] = useState<string | null>(null);

  const dashboardAccessInput = {
    profile: managerProfile,
    verificationStatus,
    isLoading: managerVerificationLoading,
  };
  const dashboardAccessState = getManagerDashboardAccessState(dashboardAccessInput);
  const canLoadOperationalDashboard = canLoadManagerOperationalDashboard(dashboardAccessInput);
  const readinessCopy = dashboardAccessState === 'approved'
    ? null
    : managerDashboardAccessCopy[dashboardAccessState];
  const readinessDescription = dashboardAccessState === 'profile_required'
    ? readinessCopy?.description
    : managerVerificationError || readinessCopy?.description;

  const resetOperationalDashboardData = useCallback(() => {
    setAnalytics(null);
    setProperties([]);
    setLivePropertyTotal(0);
    setFastTrackCases([]);
    setBookings([]);
    setPropertyTotal(0);
    setPropertyTotalPages(1);
    setPropertyError(null);
    setFastTrackError(null);
    setBookingError(null);
    setIsLoading(false);
  }, []);

  const fetchDashboardData = useCallback(async (forceRefresh = false, silent = false) => {
    if (managerVerificationLoading) {
      return;
    }

    if (!canLoadOperationalDashboard) {
      resetOperationalDashboardData();
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      if (forceRefresh) {
        analyticsService.invalidateAnalyticsCache('manager_analytics');
      }

      const analyticsTask = analyticsService.getManagerAnalytics(forceRefresh);
      const fastTrackTask = getFastTrackCases({ suppressErrorToast: true });
      const livePropertiesTask = getUserProperties({
        page: 1,
        limit: 1,
        status: [...MANAGER_LIVE_LISTINGS_STATUS_FILTERS],
      });
      const bookingsTask = bookingsService.getBookings({ suppressErrorToast: true });

      const [analyticsRes, fastTrackRes, livePropertiesRes] = await Promise.allSettled([
        analyticsTask,
        fastTrackTask,
        livePropertiesTask,
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data) {
        setAnalytics(analyticsRes.value.data);
      }
      if (fastTrackRes.status === 'fulfilled' && fastTrackRes.value.data) {
        setFastTrackCases(dedupeFastTrackWorkspaceCases(fastTrackRes.value.data));
        setFastTrackError(null);
      } else if (fastTrackRes.status === 'fulfilled' && fastTrackRes.value.error) {
        setFastTrackError(fastTrackRes.value.error);
      } else if (fastTrackRes.status === 'rejected') {
        setFastTrackError(fastTrackRes.reason?.message || 'Fast-track lane failed to load.');
      }
      if (livePropertiesRes.status === 'fulfilled' && !livePropertiesRes.value.error) {
        setLivePropertyTotal(livePropertiesRes.value.pagination?.total ?? livePropertiesRes.value.data?.length ?? 0);
      }
      if (!silent) {
        setIsLoading(false);
      }

      const bookingsRes = await Promise.allSettled([bookingsTask]);
      const bookingResult = bookingsRes[0];
      if (bookingResult.status === 'fulfilled') {
        setBookings(bookingResult.value || []);
        setBookingError(null);
      } else {
        setBookings([]);
        setBookingError(bookingResult.reason?.message || 'Reservations failed to load.');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [canLoadOperationalDashboard, managerVerificationLoading, resetOperationalDashboardData]);

  const fetchManagerProperties = useCallback(async (silent = false) => {
    if (managerVerificationLoading) {
      return;
    }

    if (!canLoadOperationalDashboard) {
      setProperties([]);
      setPropertyTotal(0);
      setPropertyTotalPages(1);
      setPropertyError(null);
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setPropertyError(null);
    }

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
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [canLoadOperationalDashboard, managerVerificationLoading, propertyPage, propertySearchQuery, propertyStatusFilter, propertyTypeFilter]);

  useEffect(() => {
    if (!managerVerificationLoading) {
      void fetchDashboardData();
    }
  }, [fetchDashboardData, managerVerificationLoading]);

  useEffect(() => {
    if (managerVerificationLoading) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void fetchManagerProperties();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [fetchManagerProperties, managerVerificationLoading]);

  useDashboardWorkspaceRefresh({
    tags: [
      WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
      WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
      WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
      WORKSPACE_SYNC_TAGS.PROPERTIES,
      WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
      WORKSPACE_SYNC_TAGS.LEADS,
      WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
      WORKSPACE_SYNC_TAGS.FAST_TRACK,
      WORKSPACE_SYNC_TAGS.APPLICATIONS,
      WORKSPACE_SYNC_TAGS.VIEWINGS,
      WORKSPACE_SYNC_TAGS.VERIFICATIONS,
    ],
    refresh: async () => {
      await Promise.all([
        fetchDashboardData(true, true),
        fetchManagerProperties(true),
      ]);
    },
    enabled: canLoadOperationalDashboard,
  });

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
  const fastTrackSummary = getManagerFastTrackSummary(fastTrackCases);
  const reservationSummary = {
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
  };
  const pendingReservations = bookings
    .filter((booking) => booking.status === 'pending')
    .sort((left, right) => new Date(left.check_in_date).getTime() - new Date(right.check_in_date).getTime())
    .slice(0, 4);
  const livePropertiesFallback = properties.filter((property) => isManagerLivePropertyStatus(property.status));
  const livePropertyViewsFallback = livePropertiesFallback.reduce((total, property) => (
    total + (property.analytics?.views || 0)
  ), 0);
  const livePropertyPerformance = filterManagerLivePropertyPerformance(analytics?.propertyPerformance);
  const livePropertyViewsFromAnalytics = livePropertyPerformance.reduce((total, property) => (
    total + (property.views || 0)
  ), 0);

  const stats = {
    liveFastTrack: String(fastTrackSummary.active),
    liveFastTrackChange: `${fastTrackSummary.completed} done · ${fastTrackSummary.cancelled} closed · ${fastTrackSummary.closingSoon} urgent`,
    activeProperties: getManagerLiveListingCount(analytics, properties, livePropertyTotal).toString(),
    activeListingsChange: analytics?.property_growth || '0%',
    totalViews: analytics?.total_views?.toString() || String(
      analytics
        ? livePropertyViewsFromAnalytics
        : livePropertyViewsFallback,
    ),
    totalViewsChange: analytics?.views_growth || '0%',
    conversionRate: formatManagerAnalyticsPercentage(
      analytics?.conversion_rate ?? analytics?.leadAnalytics?.conversionRate ?? 0,
    ),
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

  const handleManualFastTrackCreated = async (createdCase: FastTrackCase) => {
    void fetchDashboardData(true, true);
    navigate(`/manager/fast-track?case=${createdCase.caseId}`);
  };

  const handleConfirmReservation = async (booking: Booking) => {
    setConfirmingBookingID(booking.id);
    setBookingError(null);
    try {
      await bookingsService.confirmBooking(booking.id, { suppressErrorToast: true });
      setBookings((previous) => previous.map((item) => (
        item.id === booking.id ? { ...item, status: 'confirmed' } : item
      )));
      toast.success('Reservation confirmed.');
    } catch (error: any) {
      const message = error?.message || 'Unable to confirm this reservation.';
      setBookingError(message);
      toast.error(message);
    } finally {
      setConfirmingBookingID(null);
    }
  };

  const hasPropertyFilters = propertySearchQuery.trim() || propertyTypeFilter !== 'all' || propertyStatusFilter !== 'all';
  const propertyPageStart = propertyTotal === 0 ? 0 : ((propertyPage - 1) * MANAGER_PROPERTIES_PAGE_SIZE) + 1;
  const propertyPageEnd = Math.min(propertyPage * MANAGER_PROPERTIES_PAGE_SIZE, propertyTotal);
  const reservationKeyFor = createDuplicateSafeKeyResolver('manager-reservation');
  const fastTrackQueueKeyFor = createDuplicateSafeKeyResolver('manager-fast-track-queue');
  const propertyCardKeyFor = createDuplicateSafeKeyResolver('manager-dashboard-property');

  return (
    <div className="space-y-6 relative min-h-screen pb-20 font-outfit">
      <WelcomeBanner
        analytics={analytics}
        loading={!analytics && isLoading}
        liveListingCount={livePropertyTotal}
        actionLabel={canLoadOperationalDashboard ? undefined : 'Complete verification'}
        actionPath={canLoadOperationalDashboard ? undefined : '/manager/verification'}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Live Fast Track"
          value={stats.liveFastTrack}
          change={stats.liveFastTrackChange}
          icon={CalendarCheck}
          iconColor="bg-emerald-500"
          trendColor="text-emerald-700"
          onClick={() => navigate('/manager/fast-track')}
        />
        <StatCard
          title="Active Listings"
          value={stats.activeProperties}
          change={stats.activeListingsChange}
          icon={Building2}
          iconColor="bg-blue-500"
          trendColor="text-blue-600"
          onClick={() => navigate(buildManagerActiveListingsPath())}
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toString()}
          change={stats.totalViewsChange}
          icon={Eye}
          iconColor="bg-purple-500"
          trendColor="text-purple-600"
          onClick={() => navigate('/manager/analytics')}
        />
        <StatCard
          title="Conversion Rate"
          value={stats.conversionRate}
          change={stats.conversionRateChange}
          icon={UserCheck}
          iconColor="bg-orange-500"
          trendColor="text-orange-600"
          onClick={() => navigate('/manager/analytics')}
        />
      </div>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {!canLoadOperationalDashboard ? (
            <div
              data-testid="manager-dashboard-readiness-gate"
              className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm dark:border-orange-900/40 dark:bg-black"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-300">
                    Manager readiness
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                    {readinessCopy?.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                    {readinessDescription}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/manager/verification')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600"
                >
                  {readinessCopy?.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Broker Response Widget (USP) */}
              <BrokerResponseWidget />

              <RoleDocsPreviewCard
                title="Manager workflow guide"
                subtitle="Open the exact docs sections for live response, fast-track, applications, appointments, contracts, and support recovery."
                hrefBase="/manager/docs"
                docsDocument={managerDocs.document}
              />

              <div className="bg-white dark:bg-black rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-outfit">Reservation approvals</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Pending booking reservations from your properties are ready to confirm here.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 sm:min-w-[360px]">
                {[
                  { label: 'Pending', value: reservationSummary.pending },
                  { label: 'Confirmed', value: reservationSummary.confirmed },
                  { label: 'Completed', value: reservationSummary.completed },
                  { label: 'Cancelled', value: reservationSummary.cancelled },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-900">
                    <p>{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {bookingError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {bookingError}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {pendingReservations.length > 0 ? pendingReservations.map((booking, bookingIndex) => (
                <div
                  key={reservationKeyFor(booking.id, bookingIndex)}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-100 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Booking {booking.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Property {booking.property_id.slice(0, 8)} - {new Date(booking.check_in_date).toLocaleDateString()} to {new Date(booking.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConfirmReservation(booking)}
                    disabled={confirmingBookingID === booking.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {confirmingBookingID === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm Reservation
                  </button>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Pending reservations will appear here as users reserve bookings from your listings.
                </div>
              )}
            </div>
              </div>

              <div className="bg-white dark:bg-black rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-outfit">Fast-track lane</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Live cases surface here automatically while user verification stays with admins.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setIsManualFastTrackOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <Plus className="w-4 h-4" />
                  Add 24h case
                </button>
                <button
                  onClick={() => navigate('/manager/fast-track')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 shadow-lg shadow-orange-500/20 transition-all"
                >
                  Open fast-track queue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Active cases</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {fastTrackSummary.active}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Closing soon</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{fastTrackSummary.closingSoon}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Completed</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{fastTrackSummary.completed}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {fastTrackError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                  <p className="font-semibold">Fast-track lane temporarily unavailable</p>
                  <p className="mt-1">{fastTrackError}</p>
                  <button
                    onClick={() => void fetchDashboardData(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-black dark:text-red-300 dark:hover:bg-red-950/20"
                  >
                    Retry fast-track lane
                  </button>
                </div>
              ) : null}
              {fastTrackQueueItems.length > 0 ? fastTrackQueueItems.map((item, itemIndex) => (
                <button
                  key={fastTrackQueueKeyFor(item.caseId, itemIndex)}
                  onClick={() => navigate(`/manager/fast-track?case=${item.caseId}`)}
                  className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4 text-left hover:border-orange-200 hover:bg-orange-50/60 dark:hover:bg-gray-900/60 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.propertyTitle}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Avatar
                          userId={item.clientId}
                          name={item.clientName}
                          size="sm"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.clientName}</p>
                      </div>
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
                  <p>Active fast-track cases will appear here automatically.</p>
                  <button
                    onClick={() => setIsManualFastTrackOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4" />
                    Add 24h case manually
                  </button>
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
                  aria-label="Filter properties by type"
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
                  aria-label="Filter properties by status"
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
                  properties.map((prop, propIndex) => (
                    <ManagerPropertyCard
                      key={propertyCardKeyFor(prop.id, propIndex)}
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
            </>
          )}
        </div>
      )}

      <ManualFastTrackModal
        open={canLoadOperationalDashboard && isManualFastTrackOpen}
        existingCases={fastTrackCases}
        onClose={() => setIsManualFastTrackOpen(false)}
        onCreated={handleManualFastTrackCreated}
      />
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
