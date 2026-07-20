"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Star, Building2, Loader2, Clock, BadgeCheck, Search, X } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { BrokerRequestRecord, getNearbyAvailableBrokers, getUserBrokerRequests, LeadBrokerSummary } from '@/services/leadsService';
import {
    BROKER_REQUEST_WORKSPACE_EVENT,
    readBrokerRequestWorkspaceSelection,
} from '@/lib/brokerRequestWorkspace';
import { selectPrimaryBrokerRequest } from '@/lib/brokerRequestSelection';
import {
    formatLaunchLocationCodeSentenceLabel,
    formatLaunchLocationCode,
    formatLaunchPropertyLocation,
    getLaunchLocationCodeErrorMessage,
    getLaunchLocationCodeLabel,
    getLaunchLocationCodePlaceholder,
    isValidLaunchLocationCodeForCountry,
    normalizeLaunchLocationCode,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

const normalizeLocationCode = (value?: string | null) => normalizeLaunchLocationCode(value);
const nearbyAgentFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800';
export const NEARBY_AGENT_DISPLAY_LIMIT = 5;
type NearbyAgentSort = 'rank' | 'distance' | 'rating';
type NearbyAgentFilter = 'all' | 'fast_track';
const formatLaunchRequestLocationCode = (value?: string | null) => formatLaunchLocationCode(value);
const formatBrokerArea = (value?: string | null) => {
    const locationCode = formatLaunchRequestLocationCode(value);
    return locationCode || formatLaunchPropertyLocation(value);
};
const formatBrokerDistance = (distanceMiles?: number) => {
    if (typeof distanceMiles !== 'number' || !Number.isFinite(distanceMiles)) {
        return '10-minute availability';
    }

    return `${(distanceMiles * 1.609344).toFixed(1)} km away`;
};

export const NearbyBrokerCard = ({ broker, index }: { broker: LeadBrokerSummary; index: number }) => {
    const agentProfileLink = `/user/dashboard/messages?recipient=${encodeURIComponent(broker.id)}&name=${encodeURIComponent(broker.name)}`;
    return (
    <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
            <span className="text-sm font-bold">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-start justify-between gap-2">
                <Link
                    to={agentProfileLink}
                    className="min-w-0 max-w-full break-words text-sm font-semibold text-gray-900 transition-colors hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                >
                    {broker.name}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <BadgeCheck size={11} />
                    Available
                </span>
            </div>
            <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                {broker.company_name || 'Independent agent'}
                {broker.postcode ? ` - ${formatBrokerArea(broker.postcode)}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <div className="flex items-center text-xs font-medium text-gray-900 dark:text-white">
                    <Star size={12} className="mr-0.5 fill-yellow-400 text-yellow-400" />
                    {typeof broker.rating === 'number' ? broker.rating.toFixed(1) : 'N/A'}
                    <span className="ml-0.5 font-normal text-gray-400 dark:text-gray-500">
                        ({broker.review_count || 0})
                    </span>
                </div>
                <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={10} className="mr-0.5" />
                    {formatBrokerDistance(broker.distance_miles)}
                </div>
            </div>
            <div className="mt-2 flex min-w-0 items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={10} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">
                    {broker.service_areas?.length ? broker.service_areas.map(formatBrokerArea).filter(Boolean).join(', ') : 'Service area not listed'}
                </span>
            </div>
        </div>
    </div>
    );
};

const NearbyAgenciesList = () => {
    const authContext = useOptionalAuth();
    const user = authContext?.user || null;
    const [searchParams] = useSearchParams();
    const [brokers, setBrokers] = useState<LeadBrokerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeRequest, setActiveRequest] = useState<BrokerRequestRecord | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [postcodeInput, setPostcodeInput] = useState('');
    const [manualPostcode, setManualPostcode] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<NearbyAgentSort>('rank');
    const [filterMode, setFilterMode] = useState<NearbyAgentFilter>('all');
    const requestedWorkspaceRequestId = searchParams.get('workspace') === 'broker-request'
        ? searchParams.get('request')?.trim() || null
        : null;

    const liveRequestPostcode = formatLaunchRequestLocationCode(activeRequest?.location_postcode);
    const effectivePostcode = manualPostcode || liveRequestPostcode;
    const isManualSearchActive = Boolean(manualPostcode);
    const showSearchForm = isSearchOpen || isManualSearchActive || !liveRequestPostcode;
    const geoMarket = useUserGeoMarket(user, {
        locationCode: effectivePostcode || postcodeInput || activeRequest?.location_postcode || user?.postcode,
    });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, effectivePostcode || postcodeInput);
    const locationCodePlaceholder = getLaunchLocationCodePlaceholder(geoMarket, undefined, effectivePostcode || postcodeInput);
    const sentenceLocationCodeLabel = formatLaunchLocationCodeSentenceLabel(locationCodeLabel);

    const loadActiveRequest = useCallback(async (preferredRequestId?: string | null) => {
        const { data } = await getUserBrokerRequests({ suppressErrorToast: true });
        if (!data) {
            return;
        }

        const latestRequest = selectPrimaryBrokerRequest(
            data,
            preferredRequestId || requestedWorkspaceRequestId || readBrokerRequestWorkspaceSelection(),
        );
        setActiveRequest(latestRequest);
    }, [requestedWorkspaceRequestId]);

    useEffect(() => {
        let cancelled = false;
        const syncActiveRequest = async (preferredRequestId?: string | null) => {
            await loadActiveRequest(preferredRequestId);
            if (cancelled) {
                return;
            }
        };

        const handleWorkspaceSelection = (event: Event) => {
            const detail = event instanceof CustomEvent ? event.detail : null;
            const requestId = typeof detail?.requestId === 'string' ? detail.requestId : null;
            void syncActiveRequest(requestId);
        };

        void syncActiveRequest();
        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            void syncActiveRequest();
        }, 5000);
        window.addEventListener(BROKER_REQUEST_WORKSPACE_EVENT, handleWorkspaceSelection);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
            window.removeEventListener(BROKER_REQUEST_WORKSPACE_EVENT, handleWorkspaceSelection);
        };
    }, [loadActiveRequest]);

    useEffect(() => {
        if (manualPostcode) {
            return;
        }

        if (!postcodeInput.trim() || normalizeLocationCode(postcodeInput) === normalizeLocationCode(liveRequestPostcode)) {
            setPostcodeInput(liveRequestPostcode);
        }
    }, [liveRequestPostcode, manualPostcode, postcodeInput]);

    useEffect(() => {
        const fetchBrokers = async () => {
            if (!effectivePostcode) {
                setBrokers([]);
                setLoadError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await getNearbyAvailableBrokers({
                    postcode: effectivePostcode,
                    fastTrack: filterMode === 'fast_track',
                    page: 1,
                    limit: NEARBY_AGENT_DISPLAY_LIMIT,
                }, { suppressErrorToast: true });

                if (error) {
                    throw new Error(error);
                }

                const seen = new Set<string>();
                const unique = (data || []).filter((broker: LeadBrokerSummary) => {
                    const key = broker.id;
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
                setBrokers(unique.slice(0, NEARBY_AGENT_DISPLAY_LIMIT));
                setLoadError(null);
            } catch (err: any) {
                setLoadError(err.message || 'Nearby property agents are not available right now.');
            } finally {
                setLoading(false);
            }
        };

        void fetchBrokers();
    }, [effectivePostcode, filterMode]);

    const handlePostcodeSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedPostcode = normalizeLocationCode(postcodeInput);
        if (!trimmedPostcode) {
            setSearchError(getLaunchLocationCodeErrorMessage(geoMarket, undefined, trimmedPostcode));
            return;
        }

        if (!isValidLaunchLocationCodeForCountry(trimmedPostcode, geoMarket)) {
            setSearchError(getLaunchLocationCodeErrorMessage(geoMarket, undefined, trimmedPostcode));
            return;
        }

        const formattedPostcode = formatLaunchRequestLocationCode(trimmedPostcode);
        setManualPostcode(formattedPostcode);
        setPostcodeInput(formattedPostcode);
        setSearchError(null);
        setIsSearchOpen(true);
    };

    const handleResetSearch = () => {
        setManualPostcode(null);
        setSearchError(null);
        setPostcodeInput(liveRequestPostcode);
        setIsSearchOpen(false);
    };

    const visibleBrokers = useMemo(() => {
        const filtered = filterMode === 'fast_track'
            ? brokers.filter((broker) => broker.fast_track_eligible)
            : brokers;

        if (sortMode === 'distance') {
            const sorted = [...filtered].sort((left, right) => {
                const leftDistance = typeof left.distance_miles === 'number' ? left.distance_miles : Number.MAX_SAFE_INTEGER;
                const rightDistance = typeof right.distance_miles === 'number' ? right.distance_miles : Number.MAX_SAFE_INTEGER;
                return leftDistance - rightDistance;
            });
            return sorted.slice(0, NEARBY_AGENT_DISPLAY_LIMIT);
        }

        if (sortMode === 'rating') {
            return [...filtered]
                .sort((left, right) => (right.rating || 0) - (left.rating || 0))
                .slice(0, NEARBY_AGENT_DISPLAY_LIMIT);
        }

        return filtered.slice(0, NEARBY_AGENT_DISPLAY_LIMIT);
    }, [brokers, filterMode, sortMode]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Nearest property agents</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ranked by who is nearest and ready to help</p>
                    </div>
                </div>
            </div>

            {activeRequest && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm dark:border-blue-900/30 dark:bg-blue-950/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">Agent request</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                        {activeRequest.matched_broker?.name || 'Searching nearby property agents'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {activeRequest.dispatch_status
                            ? activeRequest.dispatch_status.replace(/[_-]+/g, ' ')
                            : 'Agent search in progress'}
                        {liveRequestPostcode ? ` - ${liveRequestPostcode}` : ''}
                    </p>
                </div>
            )}

            {effectivePostcode && (
                <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {isManualSearchActive ? `${locationCodeLabel} search` : 'Request area'}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{effectivePostcode}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {isManualSearchActive
                                    ? `Showing property agents ranked nearest to this ${sentenceLocationCodeLabel}.`
                                    : 'Showing property agents ranked for your active request.'}
                            </p>
                        </div>
                        {isManualSearchActive && liveRequestPostcode && (
                            <button
                                type="button"
                                onClick={handleResetSearch}
                                className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${nearbyAgentFocusClass}`}
                            >
                                <X size={12} />
                                Use active request
                            </button>
                        )}
                    </div>
                </div>
            )}

            {effectivePostcode && (
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Filter
                        <select
                            value={filterMode}
                            onChange={(event) => setFilterMode(event.target.value as NearbyAgentFilter)}
                            className={`mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${nearbyAgentFocusClass}`}
                        >
                            <option value="all">All available</option>
                            <option value="fast_track">Fast-track ready</option>
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Sort
                        <select
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value as NearbyAgentSort)}
                            className={`mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${nearbyAgentFocusClass}`}
                        >
                            <option value="rank">Best match</option>
                            <option value="distance">Nearest first</option>
                            <option value="rating">Highest rated</option>
                        </select>
                    </label>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
            ) : loadError ? (
                <div className="text-center py-8 text-sm text-gray-500">
                    {loadError}
                </div>
            ) : visibleBrokers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    {effectivePostcode
                        ? `No available property agents are ranked for this ${sentenceLocationCodeLabel} yet.`
                        : 'Add a location code or request a nearby property agent to see ranked agents here.'}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleBrokers.map((broker, index) => (
                        <NearbyBrokerCard
                            key={broker.id}
                            broker={broker}
                            index={index}
                        />
                    ))}
                </div>
            )}

            {showSearchForm && (
                <form
                    onSubmit={handlePostcodeSearch}
                    className="mt-6 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/50"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Find nearest agent by {locationCodeLabel}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Enter a valid {sentenceLocationCodeLabel} to rank the nearest available property agents in that area.
                            </p>
                        </div>
                        {liveRequestPostcode && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPostcodeInput(liveRequestPostcode);
                                    setSearchError(null);
                                    setManualPostcode(null);
                                    setIsSearchOpen(false);
                                }}
                                className={`text-[11px] font-semibold text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${nearbyAgentFocusClass}`}
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={postcodeInput}
                                onChange={(event) => {
                                    setPostcodeInput(normalizeLaunchLocationCode(event.target.value));
                                    if (searchError) {
                                        setSearchError(null);
                                    }
                                }}
                                placeholder={locationCodePlaceholder}
                                inputMode="text"
                                maxLength={8}
                                className={`w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${nearbyAgentFocusClass}`}
                            />
                        </div>
                        <button
                            type="submit"
                            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 ${nearbyAgentFocusClass}`}
                        >
                            <Search size={15} />
                            Search
                        </button>
                    </div>

                    {searchError && (
                        <p className="mt-2 text-xs text-red-500 dark:text-red-400">{searchError}</p>
                    )}
                </form>
            )}

            {!showSearchForm && (
                <button
                    type="button"
                    onClick={() => {
                        setIsSearchOpen(true);
                        setPostcodeInput(manualPostcode || liveRequestPostcode);
                        setSearchError(null);
                    }}
                    className={`mt-6 w-full rounded-lg bg-gray-50 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700 ${nearbyAgentFocusClass}`}
                >
                    Find nearest agent by {locationCodeLabel}
                </button>
            )}
        </div>
    );
};

export default NearbyAgenciesList;
