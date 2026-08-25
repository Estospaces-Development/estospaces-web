"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Building2,
  Home,
  Key,
  Map as MapIcon,
  X,
} from 'lucide-react';

import { useUserLocation } from '@/contexts/LocationContext';
import { usePropertyFilter } from '@/contexts/PropertyFilterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

import ApplicationTimelineWidget from '@/components/dashboard/ApplicationTimelineWidget';
import NearbyAgenciesList from '@/components/dashboard/NearbyAgenciesList';
import PaginationBar from '@/components/ui/PaginationBar';
import BrokerRequestWidget from '@/components/dashboard/BrokerRequestWidget';
import NearbyPropertiesMap from '@/components/dashboard/NearbyPropertiesMap';
import PropertyCard from '@/components/dashboard/PropertyCard';
import PropertyCardSkeleton from '@/components/dashboard/PropertyCardSkeleton';
import ProfileCompletionCard from '@/components/dashboard/ProfileCompletionCard';
import FastTrackCelebrationOverlay from '@/components/dashboard/FastTrackCelebrationOverlay';
import SearchBar, { SearchFilters as DashboardSearchFilters } from '@/components/ui/SearchBar';
import RoleDocsPreviewCard from '@/components/docs/RoleDocsPreviewCard';

import { searchService, SearchResult } from '@/services/searchService';
import { FastTrackCase, getFastTrackCases } from '@/services/fastTrackService';
import { hasFastTrackReachedCompletion } from '@/lib/fastTrackWorkflow';
import { getUserBrokerRequests, type BrokerRequestRecord } from '@/services/leadsService';
import { getBrokerRequestTrackingSummary, isLiveBrokerRequest } from '@/lib/applicationTracking';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';
import { getDashboardSimplificationCopy, getJourneyStageLabel } from '@/lib/userJourneyCopy';
import { buildCompletedUserJourneyCopy, buildUserJourneyNowCopy } from '@/lib/userDashboardJourneySummary';
import { userDocs } from '@/lib/roleDocsContent';
import { LAUNCH_COUNTRY_NAME } from '@/lib/launchLocale';
import { extractPostcodeFromAddress } from '@/services/locationService';
import { hasValidMapCoordinates, loadCompleteMapCandidates } from '@/lib/nearbyMap';
import { syncDashboardMapLocation } from '@/lib/dashboardMapLocation';
import {
  clearPropertySearchReturnState,
  readPropertySearchReturnState,
  savePropertySearchReturnState,
} from '@/lib/propertySearchReturnCache';

const FILTERED_RESULTS_PAGE_SIZE = 12;
const USER_DASHBOARD_RESET_EVENT = 'estospaces:user-dashboard-reset';
const USER_DASHBOARD_PATH = '/user/dashboard';

const dashboardFilterOptions = [
  { id: 'recently_added', label: 'Recently Added' },
  { id: 'most_viewed', label: 'Most Viewed' },
  { id: 'high_demand', label: 'High Demand' },
  { id: 'budget_friendly', label: 'Budget Friendly' },
];

const dashboardSearchParamKeys = [
  'page',
  'filter',
  'type',
  'status',
  'q',
  'keyword',
  'location',
  'propertyType',
  'minPrice',
  'maxPrice',
  'beds',
  'baths',
  'minBedrooms',
  'minBathrooms',
];

const defaultDashboardSearchFilters: DashboardSearchFilters = {
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

const parsePositivePage = (value: string | null, fallback = 1) => {
  const parsed = Number.parseInt(value || `${fallback}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mapSearchParamsToDashboardType = (
  typeValue: string | null,
  statusValue: string | null,
): 'buy' | 'rent' | 'sold' => {
  if (statusValue === 'sold') {
    return 'sold';
  }

  const value = typeValue;
  if (value === 'rent') {
    return 'rent';
  }
  return 'buy';
};

const buildDashboardSearchFiltersFromParams = (searchParams: URLSearchParams): DashboardSearchFilters => {
  const typeParam = searchParams.get('type');
  const listingType = searchParams.get('status') === 'sold'
    ? 'sale'
    : typeParam === 'rent'
      ? 'rent'
      : typeParam === 'buy' || typeParam === 'sale'
        ? 'sale'
        : 'all';

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

  if (selectedPropertyType === 'sold') {
    params.set('type', 'buy');
    params.set('status', 'sold');
  } else if (searchFilters.listingType === 'sale') {
    params.set('type', 'buy');
  } else if (searchFilters.listingType === 'rent') {
    params.set('type', 'rent');
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

const hasDashboardSearchParams = (searchParams: URLSearchParams) => (
  dashboardSearchParamKeys.some((key) => searchParams.has(key))
);

const buildDashboardReturnSearchParams = (
  currentSearchParams: URLSearchParams,
  selectedPropertyType: 'buy' | 'rent' | 'sold',
  selectedFilters: string[],
  searchFilters: DashboardSearchFilters,
  currentPage: number,
) => {
  const params = new URLSearchParams(currentSearchParams);
  dashboardSearchParamKeys.forEach((key) => params.delete(key));
  buildDiscoverParams(selectedPropertyType, selectedFilters, searchFilters).forEach((value, key) => {
    params.set(key, value);
  });
  if (currentPage > 1) {
    params.set('page', String(currentPage));
  }
  return params;
};

const searchParamsMatch = (left: URLSearchParams, right: URLSearchParams) => {
  const normalizedLeft = new URLSearchParams(left);
  const normalizedRight = new URLSearchParams(right);
  normalizedLeft.sort();
  normalizedRight.sort();
  return normalizedLeft.toString() === normalizedRight.toString();
};

const DashboardClient = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedDashboardSearchRef = useRef(
    typeof window === 'undefined'
      ? null
      : readPropertySearchReturnState(window.sessionStorage, USER_DASHBOARD_PATH),
  );
  const initialDashboardSearchParamsRef = useRef<URLSearchParams | null>(null);
  if (!initialDashboardSearchParamsRef.current) {
    const cachedSearch = cachedDashboardSearchRef.current?.search;
    initialDashboardSearchParamsRef.current = !hasDashboardSearchParams(searchParams) && cachedSearch
      ? new URLSearchParams(cachedSearch)
      : new URLSearchParams(searchParams);
  }
  const initialDashboardSearchParams = initialDashboardSearchParamsRef.current;
  const { user } = useAuth();
  const toast = useToast();
  const {
    activeLocation,
    loading: locationLoading,
    updateLocationFromSearch,
    clearSearchLocation,
  } = useUserLocation();
  const { setActiveTab } = usePropertyFilter();
  const dashboardCelebrateRequested = searchParams.get('celebrate') === '1';
  const dashboardCelebrateCaseId = searchParams.get('fastTrackCase');
  const dashboardResetRequested = searchParams.get('reset') === '1';

  const [selectedPropertyType, setSelectedPropertyType] = useState<'buy' | 'rent' | 'sold'>(() => (
    mapSearchParamsToDashboardType(initialDashboardSearchParams.get('type'), initialDashboardSearchParams.get('status'))
  ));
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
    const filterParam = initialDashboardSearchParams.get('filter');
    return filterParam ? filterParam.split(',').filter(Boolean) : [];
  });
  const [dashboardSearchFilters, setDashboardSearchFilters] = useState<DashboardSearchFilters>(() => (
    buildDashboardSearchFiltersFromParams(initialDashboardSearchParams)
  ));
  const dashboardLocationParam = (
    hasDashboardSearchParams(searchParams) ? searchParams : initialDashboardSearchParams
  ).get('location') || '';
  const [searchLoading, setSearchLoading] = useState(false);
  const [filteredSearchCompleted, setFilteredSearchCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<SearchResult[]>([]);
  const [showFilteredResults, setShowFilteredResults] = useState(() => {
    const filters = buildDashboardSearchFiltersFromParams(initialDashboardSearchParams);
    const activeFilters = initialDashboardSearchParams.get('filter');
    return hasActiveDashboardSearch(filters) || Boolean(activeFilters) || initialDashboardSearchParams.get('status') === 'sold';
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [filteredTotalPages, setFilteredTotalPages] = useState(0);
  const [currentFilteredPage, setCurrentFilteredPage] = useState(() => parsePositivePage(initialDashboardSearchParams.get('page')));
  const [nearbyProperties, setNearbyProperties] = useState<SearchResult[]>([]);
  const [_nearbyPropertiesLoading, setNearbyPropertiesLoading] = useState(true);
  const [showFastTrackCelebration, setShowFastTrackCelebration] = useState(false);
  const [celebrationPropertyTitle, setCelebrationPropertyTitle] = useState<string | null>(null);
  const [activeBrokerRequest, setActiveBrokerRequest] = useState<BrokerRequestRecord | null>(null);
  const [brokerRequestLocationContext, setBrokerRequestLocationContext] = useState<string | null>(null);
  const [activeJourney, setActiveJourney] = useState<FastTrackCase | null>(null);
  const [completedJourney, setCompletedJourney] = useState<FastTrackCase | null>(null);
  const [journeySummaryLoading, setJourneySummaryLoading] = useState(true);
  const [journeySummaryError, setJourneySummaryError] = useState<string | null>(null);
  const brokerRequestWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const celebratedDashboardCaseIdRef = useRef<string | null>(null);
  const completionStatusRef = useRef<Record<string, FastTrackCase['workspaceFinalStatus']>>({});
  const dashboardCopy = useMemo(() => getDashboardSimplificationCopy(), []);
  const dashboardReturnSearchParams = useMemo(() => buildDashboardReturnSearchParams(
    searchParams,
    selectedPropertyType,
    selectedFilters,
    dashboardSearchFilters,
    currentFilteredPage,
  ), [currentFilteredPage, dashboardSearchFilters, searchParams, selectedFilters, selectedPropertyType]);
  const dashboardReturnSearch = dashboardReturnSearchParams.toString();
  const dashboardReturnPath = `${USER_DASHBOARD_PATH}${dashboardReturnSearch ? `?${dashboardReturnSearch}` : ''}`;

  const openDashboardCelebration = useCallback((caseItem: FastTrackCase) => {
    celebratedDashboardCaseIdRef.current = caseItem.caseId;
    setCelebrationPropertyTitle(caseItem.propertyTitle || null);
    toast.clearAll();
    setShowFastTrackCelebration(true);
  }, [toast]);

  useEffect(() => {
    const cachedSearch = cachedDashboardSearchRef.current?.search;
    const hasExplicitDashboardSearch = hasDashboardSearchParams(searchParams);
    if (
      hasExplicitDashboardSearch
      && cachedSearch
      && !searchParamsMatch(searchParams, new URLSearchParams(cachedSearch))
    ) {
      clearPropertySearchReturnState(window.sessionStorage, USER_DASHBOARD_PATH);
      cachedDashboardSearchRef.current = null;
    }
    const sourceSearchParams = !hasExplicitDashboardSearch && cachedSearch
      ? new URLSearchParams(cachedSearch)
      : searchParams;
    const nextDashboardType = mapSearchParamsToDashboardType(sourceSearchParams.get('type'), sourceSearchParams.get('status'));
    const nextFilters = sourceSearchParams.get('filter')
      ? sourceSearchParams.get('filter')!.split(',').filter(Boolean)
      : [];
    const nextSearchFilters = buildDashboardSearchFiltersFromParams(sourceSearchParams);
    const nextPage = parsePositivePage(sourceSearchParams.get('page'));

    setSelectedPropertyType(nextDashboardType);
    setSelectedFilters(nextFilters);
    setDashboardSearchFilters(nextSearchFilters);
    setCurrentFilteredPage(nextPage);
    setShowFilteredResults(
      hasActiveDashboardSearch(nextSearchFilters)
      || nextFilters.length > 0
      || nextDashboardType === 'sold',
    );

    if (sourceSearchParams !== searchParams) {
      setSearchParams(sourceSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    void syncDashboardMapLocation(
      dashboardLocationParam,
      updateLocationFromSearch,
      clearSearchLocation,
    );
  }, [clearSearchLocation, dashboardLocationParam, updateLocationFromSearch]);

  const shouldFetchFilteredResults =
    hasActiveDashboardSearch(dashboardSearchFilters)
    || selectedFilters.length > 0
    || selectedPropertyType === 'sold';

  useEffect(() => {
    if (selectedPropertyType === 'rent') {
      setActiveTab('rent');
      return;
    }

    setActiveTab('buy');
  }, [selectedPropertyType, setActiveTab]);

  useEffect(() => {
    if (searchParams.get('workspace') !== 'broker-request') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      brokerRequestWorkspaceRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchParams]);

  useEffect(() => {
    if (locationLoading) {
      return;
    }

    let active = true;

    const loadNearbyProperties = async () => {
      setNearbyPropertiesLoading(true);

      try {
        if (!hasValidMapCoordinates(activeLocation)) {
          if (active) {
            setNearbyProperties([]);
          }
          return;
        }

        const candidates = await loadCompleteMapCandidates((page, limit) => (
          searchService.search('', {
            page,
            limit,
          })
        ));

        if (active) {
          setNearbyProperties(candidates);
        }
      } catch {
        if (active) {
          setNearbyProperties([]);
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
  }, [activeLocation, locationLoading]);

  useEffect(() => {
    if (!user?.id) {
      setActiveBrokerRequest(null);
      setActiveJourney(null);
      setCompletedJourney(null);
      setJourneySummaryError(null);
      setJourneySummaryLoading(false);
      return;
    }

    let active = true;

    const loadJourneySummary = async () => {
      setJourneySummaryLoading(true);
      setJourneySummaryError(null);

      try {
        const [brokerResult, fastTrackResult] = await Promise.all([
          getUserBrokerRequests({ suppressErrorToast: true }),
          getFastTrackCases({ suppressErrorToast: true }),
        ]);

        if (!active) {
          return;
        }

        const liveBrokerRequest = (brokerResult.data || [])
          .filter((request) => isLiveBrokerRequest(request))
          .sort((left, right) => (
            new Date(right.updated_at || right.created_at || 0).getTime()
            - new Date(left.updated_at || left.created_at || 0).getTime()
          ))[0] || null;

        const fastTrackCases = fastTrackResult.data || [];
        const liveFastTrackJourney = fastTrackCases
          .filter((caseItem) => caseItem.workspaceFinalStatus === 'active')
          .sort((left, right) => {
            if (left.hoursRemaining !== right.hoursRemaining) {
              return left.hoursRemaining - right.hoursRemaining;
            }
            return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
          })[0] || null;

        const completedCases = fastTrackCases
          .filter((caseItem) => hasFastTrackReachedCompletion(caseItem))
          .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());

        const previousCompletionStatus = completionStatusRef.current;
        const freshlyCompletedCase = fastTrackCases.find((caseItem) => {
          const previousStatus = previousCompletionStatus[caseItem.caseId];
          return Boolean(previousStatus && previousStatus !== 'completed' && caseItem.workspaceFinalStatus === 'completed');
        }) || null;
        const nextCompletionStatus = fastTrackCases.reduce<Record<string, FastTrackCase['workspaceFinalStatus']>>((statusMap, caseItem) => {
          statusMap[caseItem.caseId] = caseItem.workspaceFinalStatus;
          return statusMap;
        }, {});
        completionStatusRef.current = nextCompletionStatus;

        setActiveBrokerRequest(liveBrokerRequest);
        setActiveJourney(liveFastTrackJourney);
        setCompletedJourney(completedCases[0] || null);

        if (!dashboardCelebrateRequested) {
          if (freshlyCompletedCase && celebratedDashboardCaseIdRef.current !== freshlyCompletedCase.caseId) {
            openDashboardCelebration(freshlyCompletedCase);
          }
          return;
        }

        const forcedCelebrationCase = dashboardCelebrateCaseId
          ? completedCases.find((caseItem) => caseItem.caseId === dashboardCelebrateCaseId) || null
          : completedCases[0] || null;

        setSearchParams((previous) => {
          const next = new URLSearchParams(previous);
          next.delete('celebrate');
          next.delete('fastTrackCase');
          return next;
        });

        if (forcedCelebrationCase) {
          openDashboardCelebration(forcedCelebrationCase);
        } else if (freshlyCompletedCase && celebratedDashboardCaseIdRef.current !== freshlyCompletedCase.caseId) {
          openDashboardCelebration(freshlyCompletedCase);
        }
      } catch {
        if (!active) {
          return;
        }

        setActiveBrokerRequest(null);
        setActiveJourney(null);
        setCompletedJourney(null);
        setJourneySummaryError('Unable to load your latest journey update right now.');
      } finally {
        if (active) {
          setJourneySummaryLoading(false);
        }
      }
    };

    void loadJourneySummary();

    return () => {
      active = false;
    };
  }, [dashboardCelebrateCaseId, dashboardCelebrateRequested, openDashboardCelebration, setSearchParams, user?.id]);

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

  const nextStepSummary = useMemo(() => {
    if (activeJourney) {
      const stageLabel = getJourneyStageLabel(activeJourney.stage, activeJourney.journeyMode, 'user');
      return {
        title: dashboardCopy.activeJourneyTitle,
        now: buildUserJourneyNowCopy(activeJourney.propertyTitle, stageLabel),
        next: activeJourney.workspaceFinalStatus === 'active'
          ? `Next: ${activeJourney.hoursRemaining > 0 ? `${activeJourney.hoursRemaining}h left today.` : 'This journey needs attention.'}`
          : 'Next: review the latest update.',
        primaryLabel: dashboardCopy.activeJourneyPrimaryLabel,
        primaryAction: () => navigate(`/user/dashboard/fast-track?case=${activeJourney.caseId}`),
        secondaryLabel: dashboardCopy.activeJourneySecondaryLabel,
        secondaryAction: () => navigate('/user/dashboard/fast-track'),
      };
    }

    if (activeBrokerRequest) {
      const tracking = getBrokerRequestTrackingSummary(activeBrokerRequest);
      const sharedHomes = activeBrokerRequest.property_shares?.length || 0;
      return {
        title: dashboardCopy.brokerRequestTitle,
        now: activeBrokerRequest.matched_broker?.name
          ? `${activeBrokerRequest.matched_broker.name} is helping you now.`
          : `${tracking.currentStage}.`,
        next: sharedHomes > 0
          ? `Next: review ${sharedHomes} home choice${sharedHomes === 1 ? '' : 's'}.`
          : `Next: ${tracking.nextAction}.`,
        primaryLabel: dashboardCopy.brokerRequestPrimaryLabel,
        primaryAction: () => navigate(buildBrokerRequestWorkspacePath(activeBrokerRequest.id)),
        secondaryLabel: dashboardCopy.brokerRequestSecondaryLabel,
        secondaryAction: () => brokerRequestWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      };
    }

    if (completedJourney) {
      return {
        title: dashboardCopy.completedJourneyTitle,
        now: buildCompletedUserJourneyCopy(completedJourney.propertyTitle),
        next: 'Next: review the property and any final records.',
        primaryLabel: dashboardCopy.completedJourneyPrimaryLabel,
        primaryAction: () => navigate(`/user/properties/${completedJourney.propertyId}`),
        secondaryLabel: dashboardCopy.completedJourneySecondaryLabel,
        secondaryAction: () => navigate('/user/dashboard/fast-track'),
      };
    }

    return {
      title: dashboardCopy.noJourneyTitle,
      now: dashboardCopy.noJourneySummary,
      next: 'Next: choose one option below to get started.',
      primaryLabel: dashboardCopy.noJourneyPrimaryLabel,
      primaryAction: () => navigate('/user/search'),
      secondaryLabel: dashboardCopy.noJourneySecondaryLabel,
      secondaryAction: () => brokerRequestWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    };
  }, [activeBrokerRequest, activeJourney, completedJourney, dashboardCopy, navigate]);

  const fetchFilteredProperties = useCallback(async () => {
    if (!shouldFetchFilteredResults) {
      setFilteredProperties([]);
      setFilteredCount(0);
      setFilteredTotalPages(0);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setFilteredSearchCompleted(false);
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
          listingType: selectedPropertyType === 'sold'
            ? 'sale'
            : dashboardSearchFilters.listingType === 'all'
              ? undefined
              : dashboardSearchFilters.listingType,
          status: selectedPropertyType === 'sold' ? 'sold' : undefined,
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
      setFilteredSearchCompleted(true);
    }
  }, [currentFilteredPage, dashboardSearchFilters, selectedFilters, selectedPropertyType, shouldFetchFilteredResults]);

  useEffect(() => {
    if (!shouldFetchFilteredResults) {
      return;
    }

    fetchFilteredProperties();
  }, [fetchFilteredProperties, shouldFetchFilteredResults]);

  const handleDashboardSearch = useCallback((nextFilters: DashboardSearchFilters) => {
    const nextDashboardType = nextFilters.listingType === 'rent'
      ? 'rent'
      : nextFilters.listingType === 'sale'
        ? 'buy'
        : selectedPropertyType === 'sold'
          ? 'sold'
          : selectedPropertyType;

    setDashboardSearchFilters(nextFilters);
    if (nextFilters.listingType === 'rent') {
      setSelectedPropertyType('rent');
    } else if (nextFilters.listingType === 'sale') {
      setSelectedPropertyType('buy');
    }
    setCurrentFilteredPage(1);
    setFilteredSearchCompleted(false);
    setError(null);
    setLocationMessage(null);
    setShowFilteredResults(
      hasActiveDashboardSearch(nextFilters)
      || selectedFilters.length > 0
      || nextDashboardType === 'sold',
    );
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      dashboardSearchParamKeys.forEach((key) => next.delete(key));

      buildDiscoverParams(nextDashboardType, selectedFilters, nextFilters).forEach((value, key) => {
        next.set(key, value);
      });

      return next;
    }, { replace: true });
  }, [selectedFilters, selectedPropertyType, setSearchParams]);

  const toggleQuickFilter = (filterId: string) => {
    setSelectedFilters((current) => {
      const nextFilters = current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [filterId];

      setCurrentFilteredPage(1);
      setShowFilteredResults(
        hasActiveDashboardSearch(dashboardSearchFilters)
        || nextFilters.length > 0
        || selectedPropertyType === 'sold',
      );
      return nextFilters;
    });
  };

  useEffect(() => {
    if (!showFilteredResults) {
      return;
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      dashboardSearchParamKeys.forEach((key) => next.delete(key));
      dashboardReturnSearchParams.forEach((value, key) => next.set(key, value));
      return next.toString() === previous.toString() ? previous : next;
    }, { replace: true });
  }, [dashboardReturnSearchParams, setSearchParams, showFilteredResults]);

  const clearFilteredResults = useCallback(() => {
    if (typeof window !== 'undefined') {
      clearPropertySearchReturnState(window.sessionStorage, USER_DASHBOARD_PATH);
    }
    cachedDashboardSearchRef.current = null;
    setSelectedFilters([]);
    setSelectedPropertyType((current) => (current === 'rent' ? 'rent' : 'buy'));
    setDashboardSearchFilters(defaultDashboardSearchFilters);
    setFilteredProperties([]);
    setFilteredCount(0);
    setFilteredTotalPages(0);
    setCurrentFilteredPage(1);
    setFilteredSearchCompleted(false);
    setShowFilteredResults(false);
    setError(null);
    setLocationMessage(null);
    clearSearchLocation();
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      dashboardSearchParamKeys.forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [clearSearchLocation, setSearchParams]);

  const handleBrokerRequestLocationContextChange = useCallback((locationCode: string | null) => {
    setBrokerRequestLocationContext(locationCode?.trim() || null);
  }, []);

  const clearDashboardSearchParams = useCallback(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('reset');
      dashboardSearchParamKeys.forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (!dashboardResetRequested) {
      return;
    }

    clearFilteredResults();
    clearDashboardSearchParams();
  }, [clearDashboardSearchParams, clearFilteredResults, dashboardResetRequested]);

  useEffect(() => {
    const handleDashboardReset = () => {
      clearFilteredResults();
      clearDashboardSearchParams();
    };

    window.addEventListener(USER_DASHBOARD_RESET_EVENT, handleDashboardReset);
    return () => window.removeEventListener(USER_DASHBOARD_RESET_EVENT, handleDashboardReset);
  }, [clearDashboardSearchParams, clearFilteredResults]);

  const mapLocation = activeLocation || null;
  const activeMapProperties = showFilteredResults ? filteredProperties : nearbyProperties;
  const mapProperties = useMemo(() => (
    activeMapProperties.filter((property): property is SearchResult & { latitude: number; longitude: number } => (
      Boolean(property) && hasValidMapCoordinates(property)
    ))
  ), [activeMapProperties]);
  const hasNearbyMapPreview = Boolean(
    (mapLocation?.latitude && mapLocation?.longitude) || mapProperties.length > 0,
  );

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

  useEffect(() => {
    const cachedSearch = cachedDashboardSearchRef.current;
    if (!cachedSearch || searchLoading || !filteredSearchCompleted || !showFilteredResults) {
      return;
    }

    const expectedSearch = dashboardReturnSearch ? `?${dashboardReturnSearch}` : '';
    if (cachedSearch.search !== expectedSearch) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: cachedSearch.scrollY, behavior: 'auto' });
      clearPropertySearchReturnState(window.sessionStorage, USER_DASHBOARD_PATH);
      cachedDashboardSearchRef.current = null;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dashboardReturnSearch, filteredSearchCompleted, searchLoading, showFilteredResults]);

  const cacheDashboardSearchReturn = useCallback(() => {
    if (typeof window === 'undefined' || !dashboardReturnSearch) {
      return;
    }

    savePropertySearchReturnState(window.sessionStorage, {
      pathname: USER_DASHBOARD_PATH,
      search: dashboardReturnSearch,
      scrollY: window.scrollY,
    });
  }, [dashboardReturnSearch]);

  const openPropertyFromDashboard = useCallback((property: { id: string }) => {
    cacheDashboardSearchReturn();
    navigate(`/user/properties/${property.id}`, {
      state: {
        backTo: dashboardReturnPath,
        backLabel: 'Back to Dashboard',
      },
    });
  }, [cacheDashboardSearchReturn, dashboardReturnPath, navigate]);

  const openFastTrackFromDashboard = useCallback((property: { id: string }) => {
    cacheDashboardSearchReturn();
    navigate(`/user/properties/${property.id}?fast-track=1`, {
      state: {
        backTo: dashboardReturnPath,
        backLabel: 'Back to Dashboard',
      },
    });
  }, [cacheDashboardSearchReturn, dashboardReturnPath, navigate]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto dark:bg-[#0a0a0a] min-h-screen transition-all duration-300">
      <FastTrackCelebrationOverlay
        active={showFastTrackCelebration}
        role="user"
        title="Your journey is complete"
        subtitle={celebrationPropertyTitle
          ? `${celebrationPropertyTitle} is ready for the next step.`
          : 'Your 24-hour journey is complete and ready for the next step.'}
        onComplete={() => setShowFastTrackCelebration(false)}
      />
      {!showFilteredResults && (
        <>
          <div
            id="hero-search"
            className="relative overflow-hidden rounded-[32px] shadow-2xl animate-fadeIn group min-h-[480px] lg:min-h-[540px]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover:scale-105"
              style={{
                backgroundImage: "url('https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/78 via-slate-900/58 to-orange-950/30" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

            <div className="relative z-10 flex min-h-[480px] lg:min-h-[540px] items-center px-4 py-10 md:px-6 lg:px-10">
              <div className="mx-auto w-full max-w-6xl">
                <div className="max-w-3xl text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-300/90">
                    Search sale and rental homes
                  </p>
                  <h1
                    className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
                    style={{ textShadow: '0 4px 20px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)' }}
                  >
                    Find your <span className="text-orange-400">perfect space</span>
                  </h1>
                  <p className="mt-4 max-w-2xl text-base text-white/88 md:text-lg">
                    {dashboardCopy.searchSubtitle}
                  </p>
                </div>

                <div
                  className="mt-8 rounded-[28px] border border-white/40 bg-white/92 p-5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 md:p-6 lg:p-8"
                  style={{ animationDelay: '0.15s' }}
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                    <div>
                      <SearchBar
                        variant="hero"
                        navigateOnSearch={false}
                        onSearch={handleDashboardSearch}
                        initialFilters={dashboardSearchFilters}
                        locationContextCode={brokerRequestLocationContext || activeBrokerRequest?.location_postcode || undefined}
                        countryContextName={activeJourney?.propertyCountry}
                        fallbackCountryName={LAUNCH_COUNTRY_NAME}
                        className="w-full text-left"
                      />

                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                        {dashboardFilterOptions.map((filter) => {
                          const selected = selectedFilters.includes(filter.id);

                          return (
                            <button
                              key={filter.id}
                              onClick={() => toggleQuickFilter(filter.id)}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                                selected
                                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/95 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quick actions</p>
                      <div className="mt-4 grid gap-3">
                        <button
                          onClick={() => {
                            setActiveTab('buy');
                            navigate('/user/dashboard/discover?type=buy');
                          }}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                        >
                          <span>{dashboardCopy.quickBuyLabel}</span>
                          <Building2 size={16} className="text-orange-500" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('rent');
                            navigate('/user/dashboard/discover?type=rent');
                          }}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                        >
                          <span>{dashboardCopy.quickRentLabel}</span>
                          <Key size={16} className="text-orange-500" />
                        </button>
                        <button
                          onClick={() => navigate('/user/saved')}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                        >
                          <span>{dashboardCopy.quickSavedLabel}</span>
                          <Bookmark size={16} className="text-orange-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="greeting-section" className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_320px] animate-fadeIn">
            <section className="rounded-3xl border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,1)_0%,rgba(255,255,255,1)_58%)] p-6 shadow-sm dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(124,45,18,0.22)_0%,rgba(10,10,10,1)_60%)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                    {dashboardCopy.nextStepEyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">
                    {getGreeting()}, <span className="text-orange-500 capitalize">{firstName}</span>
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {dashboardCopy.greetingSubtitle}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {nextStepSummary.title}
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">What is happening now?</p>
                    <p className="mt-2 text-base text-gray-900 dark:text-white">
                      {journeySummaryLoading ? 'Loading your latest update...' : nextStepSummary.now}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">What do I need to do next?</p>
                    <p className="mt-2 text-base text-gray-900 dark:text-white">
                      {journeySummaryLoading ? 'Checking your next step...' : nextStepSummary.next}
                    </p>
                  </div>
                </div>
                {journeySummaryError ? (
                  <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{journeySummaryError}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={nextStepSummary.primaryAction}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                  >
                    {nextStepSummary.primaryLabel}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={nextStepSummary.secondaryAction}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {nextStepSummary.secondaryLabel}
                  </button>
                </div>
              </div>
            </section>

            <div className="min-w-0">
              <ProfileCompletionCard />
            </div>
          </div>

          {user?.role === 'admin' && (
            <RoleDocsPreviewCard
              title="User dashboard guide"
              subtitle="Open the exact docs sections for search, broker requests, bookings, viewings, documents, support, and recovery."
              hrefBase="/user/dashboard/docs"
              docsDocument={userDocs.document}
            />
          )}
        </>
      )}

      {!showFilteredResults && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div
              id="broker-request-workspace"
              ref={brokerRequestWorkspaceRef}
              className={`lg:col-span-2 scroll-mt-24 rounded-3xl transition-shadow ${
                searchParams.get('workspace') === 'broker-request'
                  ? 'ring-2 ring-orange-200 shadow-lg shadow-orange-500/10'
                  : ''
              }`}
            >
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />}>
                <BrokerRequestWidget onLocationContextChange={handleBrokerRequestLocationContextChange} />
              </Suspense>
            </div>
            <div>
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />}>
                <NearbyAgenciesList />
              </Suspense>
            </div>
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
                  onViewDetails={openPropertyFromDashboard}
                  onStartFastTrack={openFastTrackFromDashboard}
                  showSaveAction
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
            <div className="mt-8">
              <PaginationBar
                currentPage={currentFilteredPage}
                totalPages={filteredTotalPages}
                onPageChange={setCurrentFilteredPage}
                totalItems={filteredCount}
                pageSize={FILTERED_RESULTS_PAGE_SIZE}
                currentItemCount={filteredProperties.length}
                itemLabel="properties"
              />
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

      <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapIcon className="text-orange-500" size={20} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-orange-500">{dashboardCopy.mapTitle}</h2>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {dashboardCopy.mapSubtitle}
              </p>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                This is a compact preview. Open Browse All for the full map experience.
              </p>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                const userPostcode = user?.postcode || extractPostcodeFromAddress(user?.address || '');
                if (userPostcode) {
                  params.set('location', userPostcode);
                }
                const queryString = params.toString();
                navigate(`/user/dashboard/discover${queryString ? `?${queryString}` : ''}`);
              }}
              className="flex items-center gap-2 px-4 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
            >
              <span>Browse All Properties</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {locationLoading ? (
            <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex h-[240px] items-center justify-center sm:h-[270px] lg:h-[300px]">
                <div className="text-center">
                  <BrandLoader className="mx-auto mb-4 text-orange-500" size={48} />
                  <p className="text-gray-600 dark:text-gray-300">Loading nearby properties...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className={hasNearbyMapPreview ? 'h-[310px] sm:h-[350px] lg:h-[400px]' : 'h-[250px] sm:h-[280px] lg:h-[320px]'}>
                <NearbyPropertiesMap
                  properties={mapProperties}
                  userLocation={mapLocation}
                  onPropertyClick={openPropertyFromDashboard}
                  onStartFastTrack={openFastTrackFromDashboard}
                  compact
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default DashboardClient;
