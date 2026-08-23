"use client";

import BrandLoader from '@/components/ui/BrandLoader';
import ActionSpinner from '@/components/ui/ActionSpinner';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info, BellRing, MapPin, MoreHorizontal, Search, Send, Zap } from 'lucide-react';
import BrokerRequestItem, { BrokerRequest } from './BrokerRequestItem';
import {
    formatWorkspaceReference,
    getManagerTrackerResponseCountdown,
    selectManagerTrackerItems,
    getManagerWorkspaceAction,
    getManagerWorkspaceStateLabel,
    type ManagerTrackerItem,
} from '@/lib/brokerDispatchPresentation';
import {
    acceptBrokerRequestOffer,
    getBrokerAvailability,
    getBrokerLeads,
    getBrokerRequestOffers,
    respondToLead,
    syncBrokerRequestPropertyShares,
    type BrokerRequestRecord,
    updateBrokerAvailability,
} from '@/services/leadsService';
import { formatLeadStage, resolveLeadStage } from '@/lib/fastTrackWorkflow';
import {
    dedupeBrokerRequestsBySubmissionSignature,
    sortBrokerRequestsByPriority,
} from '@/lib/brokerRequestSelection';
import { getUserProperties } from '@/services/userPropertiesService';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { resolvePropertyImageUrl } from '@/lib/propertyImages';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import {
    isPortfolioPropertyEligibleForRequest,
    selectShareablePortfolioProperties,
    type ManagerPortfolioProperty,
} from '@/lib/managerPropertyShortlist';
import {
    formatLaunchCurrencyForCountry,
    formatLaunchLocationCode,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    LAUNCH_COUNTRY_NAME,
} from '@/lib/launchLocale';

const formatOfferSummary = (dispatchStatus?: string, matchedBrokerName?: string | null) => {
    if (matchedBrokerName) {
        return `Matched with ${matchedBrokerName}`;
    }

    if (!dispatchStatus) {
        return 'Live marketplace offer';
    }

    return dispatchStatus
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const parsePropertyImage = (value?: string) => {
    if (!value) {
        return PROPERTY_PLACEHOLDER_IMAGE;
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim().length > 0) {
            return resolvePropertyImageUrl(parsed[0]);
        }
    } catch {
        // The property may already expose a direct URL.
    }

    return resolvePropertyImageUrl(value);
};

const formatPropertyPrice = (property?: {
    price?: number | null;
    country?: string | null;
    currency?: string | null;
    currency_code?: string | null;
} | null) => {
    const price = property?.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return 'Price on request';
    }

    return formatLaunchCurrencyForCountry(price, {
        countryCode: property?.country,
        countryName: property?.country,
        currencyCode: property?.currency || property?.currency_code,
    });
};

const formatRequestArea = (location?: string | null, postcode?: string | null) => (
    formatLaunchPropertyLocation([
        location,
        formatLaunchLocationCode(postcode) || undefined,
    ])
);

const formatPortfolioPropertyLocation = (property: {
    address_line_1?: string | null;
    city?: string | null;
    postcode?: string | null;
}) => formatLaunchPropertyLocation([
    property.address_line_1,
    property.city,
    formatLaunchLocationCode(property.postcode) || undefined,
]);

const formatWorkspaceStartedAt = (value?: string) => {
    if (!value) {
        return 'Just now';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Just now';
    }

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const MATCHED_WORKSPACES_ID = 'matched-client-workspaces';
const LIVE_RESPONSE_OPTIONS_MENU_ID = 'live-response-options-menu';
const PROPERTY_SHARE_PICKER_LIMIT = 12;
const TRACKER_ITEM_LIMIT = 4;
const getMatchedWorkspaceCardId = (requestId: string) => `matched-workspace-${requestId}`;

type TrackerFilter = 'all' | 'pending' | 'responded' | 'expired';
type TrackerSort = 'priority' | 'newest' | 'oldest';
type TrackerRequest = BrokerRequest & ManagerTrackerItem;

const BrokerResponseWidget: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [requests, setRequests] = useState<TrackerRequest[]>([]);
    const [matchedRequests, setMatchedRequests] = useState<BrokerRequestRecord[]>([]);
    const [managerProperties, setManagerProperties] = useState<ManagerPortfolioProperty[]>([]);
    const [shareSelections, setShareSelections] = useState<Record<string, string[]>>({});
    const [shareSavingRequestId, setShareSavingRequestId] = useState<string | null>(null);
    const [focusedWorkspaceRequestId, setFocusedWorkspaceRequestId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableForFastResponse, setAvailableForFastResponse] = useState(false);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityBlockedReason, setAvailabilityBlockedReason] = useState<string | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [propertyPickerSearch, setPropertyPickerSearch] = useState('');
    const [propertyPickerSort, setPropertyPickerSort] = useState<'price_desc' | 'price_asc' | 'title_asc'>('price_desc');
    const [shareStatusMessage, setShareStatusMessage] = useState('');
    const [availabilityStatusMessage, setAvailabilityStatusMessage] = useState('');
    const [trackerFilter, setTrackerFilter] = useState<TrackerFilter>('all');
    const [trackerSort, setTrackerSort] = useState<TrackerSort>('priority');
    const [liveResponseOptionsOpen, setLiveResponseOptionsOpen] = useState(false);
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const fetchRequests = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const [leadsResult, offersResult, availabilityResult, propertiesResult] = await Promise.all([
                getBrokerLeads(),
                getBrokerRequestOffers({ limit: 40, sort: 'created_at_desc' }),
                getBrokerAvailability(),
                getUserProperties({
                    limit: 40,
                    status: ['published', 'active', 'online'],
                }),
            ]);

            const mappedLeads = (leadsResult.data || []).map((lead) => {
                const propertyLocation = formatPortfolioPropertyLocation({
                    address_line_1: lead.property?.address_line_1,
                    city: lead.property?.city,
                    postcode: lead.property?.postcode,
                });
                const propertyTitle = formatLaunchPropertyText(
                    lead.property?.title || lead.propertyInterested || lead.property_name,
                    'Unknown Property',
                );

                return {
                    id: lead.id,
                    requestKind: 'lead' as const,
                    propertyName: propertyTitle,
                    brokerName: lead.name || lead.email || 'Interested client',
                    userId: lead.user_id,
                    email: lead.email,
                    phone: lead.phone,
                    location: propertyLocation || formatLaunchPropertyText(lead.propertyInterested, 'Location not available'),
                    interestedIn: propertyTitle || 'Property enquiry',
                    distance: formatLaunchPropertyLocation([
                        lead.property?.city,
                        formatLaunchLocationCode(lead.property?.postcode) || undefined,
                    ]),
                    timestamp: new Date(lead.created_at),
                    status: resolveLeadStage(lead) === 'matching'
                        ? 'pending' as const
                        : resolveLeadStage(lead) === 'expired'
                            ? 'expired' as const
                            : 'responded' as const,
                    secondsRemaining: typeof lead.sla_remaining_seconds === 'number' ? lead.sla_remaining_seconds : undefined,
                    stageLabel: formatLeadStage(resolveLeadStage(lead)),
                    dispatchStatus: lead.dispatch_status,
                    primaryActionLabel: 'Respond Now',
                    secondaryActionLabel: 'Open leads',
                    statusReason: lead.status_reason,
                    nextAction: lead.next_action,
                    trackerLane: resolveLeadStage(lead) === 'matching'
                        ? 'lead_pending' as const
                        : resolveLeadStage(lead) === 'expired'
                            ? 'expired' as const
                            : 'lead_responded' as const,
                };
            });

            const dedupedOffers = dedupeBrokerRequestsBySubmissionSignature(offersResult.data || []);

            const mappedOffers = dedupedOffers.map((offer) => {
                const workspaceAction = getManagerWorkspaceAction(offer);
                const workspaceReference = formatWorkspaceReference(offer.id);
                const hasSelectedProperty = Boolean(offer.selected_property_id || offer.selected_fast_track_case_id);
                const hasSharedShortlist = (offer.property_shares?.length || 0) > 0;
                const isMatchedOffer = offer.dispatch_status === 'broker_matched' || offer.status === 'matched';

                const offerArea = formatRequestArea(offer.location, offer.location_postcode);

                return {
                    id: offer.id,
                    requestKind: 'offer' as const,
                propertyName: `${(offer.request_type || 'broker').replace(/\b\w/g, (character) => character.toUpperCase())} request${offerArea ? ` - ${offerArea}` : ''}`,
                brokerName: offer.requester_name || offer.requester_email || 'Marketplace client',
                userId: offer.user_id,
                email: offer.requester_email,
                phone: offer.requester_phone,
                requestSummary: offer.details?.trim() || undefined,
                location: offerArea || 'Location not available',
                interestedIn: formatOfferSummary(offer.dispatch_status, offer.matched_broker?.name || null),
                distance: formatLaunchLocationCode(offer.location_postcode) || offerArea || LAUNCH_COUNTRY_NAME,
                timestamp: new Date(offer.created_at || offer.dispatch_started_at || new Date().toISOString()),
                status: offer.dispatch_status === 'broker_matched'
                    ? 'responded' as const
                    : offer.dispatch_status === 'expired' || offer.status === 'expired' || offer.dispatch_status === 'unavailable'
                        ? 'expired' as const
                        : 'pending' as const,
                secondsRemaining: getManagerTrackerResponseCountdown(offer),
                stageLabel: `${formatOfferSummary(offer.dispatch_status, offer.matched_broker?.name || null)} - Workspace ${workspaceReference}`,
                dispatchStatus: offer.dispatch_status,
                    primaryActionLabel: 'Accept Offer',
                    secondaryActionLabel: offer.dispatch_status === 'broker_matched' ? workspaceAction.label : 'Open leads',
                    secondaryActionPath: workspaceAction.path,
                    statusReason: offer.status_reason,
                    nextAction: offer.dispatch_status === 'broker_matched'
                        ? workspaceAction.label
                        : offer.next_action,
                    trackerLane: offer.dispatch_status === 'expired' || offer.status === 'expired' || offer.dispatch_status === 'unavailable'
                        ? 'expired' as const
                        : offer.dispatch_status === 'broker_matched'
                            ? hasSelectedProperty
                                ? 'property_selected' as const
                                : hasSharedShortlist
                                    ? 'shortlist_shared' as const
                                    : 'share_needed' as const
                            : isMatchedOffer
                                ? 'share_needed' as const
                                : 'offer_pending' as const,
                };
            });

            setRequests([...mappedOffers, ...mappedLeads] as TrackerRequest[]);
            setMatchedRequests(sortBrokerRequestsByPriority(dedupedOffers.filter((offer) => (
                (offer.dispatch_status === 'broker_matched' || offer.status === 'matched')
                && Boolean(offer.matched_broker_id)
            ))));
            setManagerProperties((propertiesResult.data || []).map((property: any) => ({
                id: property.id,
                title: formatLaunchPropertyText(property.title, 'Property'),
                city: formatLaunchPropertyLocation(property.city),
                postcode: formatLaunchLocationCode(property.postcode),
                country: property.country,
                currency: property.currency,
                price: property.price,
                listing_type: property.listing_type,
                image_urls: Array.isArray(property.images) && typeof property.images[0] === 'string'
                    ? JSON.stringify(property.images)
                    : property.image_urls,
            })));
            setAvailableForFastResponse(Boolean(availabilityResult.data?.available_for_fast_response));
            setAvailabilityBlockedReason(availabilityResult.data?.blocked_reason || null);
        } catch (_error) {
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
        ],
        refresh: () => fetchRequests(true),
    });

    useEffect(() => {
        setShareSelections((previous) => {
            const next = { ...previous };

            matchedRequests.forEach((request) => {
                const existingSelection = next[request.id];
                if (existingSelection && existingSelection.length > 0) {
                    return;
                }

                next[request.id] = (request.property_shares || [])
                    .sort((left, right) => left.rank - right.rank)
                    .map((share) => share.property_id);
            });

            return next;
        });
    }, [matchedRequests]);

    useEffect(() => {
        if (!focusedWorkspaceRequestId) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setFocusedWorkspaceRequestId((current) => current === focusedWorkspaceRequestId ? null : current);
        }, 4000);

        return () => window.clearTimeout(timeout);
    }, [focusedWorkspaceRequestId]);

    const visibleRequests = useMemo(() => {
        const filtered = trackerFilter === 'all'
            ? requests
            : requests.filter((request) => request.status === trackerFilter);

        if (trackerSort === 'newest') {
            return [...filtered]
                .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
                .slice(0, TRACKER_ITEM_LIMIT);
        }

        if (trackerSort === 'oldest') {
            return [...filtered]
                .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
                .slice(0, TRACKER_ITEM_LIMIT);
        }

        return selectManagerTrackerItems(filtered, TRACKER_ITEM_LIMIT);
    }, [requests, trackerFilter, trackerSort]);

    const handleRespond = async (id: string) => {
        try {
            const selectedRequest = requests.find((request) => request.id === id);
            if (!selectedRequest) {
                return;
            }

            const response = selectedRequest.requestKind === 'offer'
                ? await acceptBrokerRequestOffer(id)
                : await respondToLead(id, 'message', 'Thank you for your inquiry. Let me assist you with this property.');

            if (response.data) {
                publishWorkspaceSync({
                    source: 'mutation',
                    tags: [
                        WORKSPACE_SYNC_TAGS.LEADS,
                        WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                        WORKSPACE_SYNC_TAGS.MESSAGES,
                        WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                    ],
                    reason: 'Manager responded from dashboard tracker',
                    ids: {
                        leadId: selectedRequest.requestKind === 'lead' ? id : undefined,
                    },
                });
                await fetchRequests(true);
            }
        } catch (_error) {
        }
    };

    const handleSecondaryAction = (id: string) => {
        const selectedRequest = requests.find((request) => request.id === id);
        if (selectedRequest?.requestKind === 'offer' && selectedRequest.dispatchStatus === 'broker_matched') {
            setFocusedWorkspaceRequestId(id);
            const matchedWorkspaceCard = document.getElementById(getMatchedWorkspaceCardId(id));
            if (matchedWorkspaceCard) {
                matchedWorkspaceCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
                return;
            }

            document.getElementById(MATCHED_WORKSPACES_ID)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            return;
        }

        navigate('/manager/leads');
    };

    const togglePropertySelection = (requestId: string, propertyId: string) => {
        const currentSelection = shareSelections[requestId] || [];
        if (!currentSelection.includes(propertyId) && currentSelection.length >= PROPERTY_SHARE_PICKER_LIMIT) {
            setShareStatusMessage(`Share ${PROPERTY_SHARE_PICKER_LIMIT} properties or fewer.`);
            return;
        }
        setShareSelections((previous) => {
            const current = previous[requestId] || [];
            const nextSelection = current.includes(propertyId)
                ? current.filter((item) => item !== propertyId)
                : [...current, propertyId];

            return {
                ...previous,
                [requestId]: nextSelection,
            };
        });
    };

    const savePropertyShares = async (requestId: string) => {
        const selectedPropertyIds = shareSelections[requestId] || [];
        if (selectedPropertyIds.length === 0) {
            setShareStatusMessage('Choose at least one property before sharing the shortlist.');
            toast.error('Choose at least one property before sharing the shortlist.');
            return;
        }

        setShareSavingRequestId(requestId);

        try {
            const { data, error } = await syncBrokerRequestPropertyShares(
                requestId,
                selectedPropertyIds.map((propertyId, index) => ({
                    property_id: propertyId,
                    rank: index + 1,
                })),
            );

            if (error || !data) {
                throw new Error(error || 'Unable to share the shortlisted properties right now.');
            }

            setShareStatusMessage('Property shortlist shared with the matched client.');
            toast.success('Property shortlist shared with the matched client.');
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'Manager shared broker-request shortlist',
                ids: {
                    leadId: requestId,
                },
            });
            await fetchRequests(true);
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to share the shortlist right now.';
            setShareStatusMessage(message);
            toast.error(message);
        } finally {
            setShareSavingRequestId(null);
        }
    };

    const toggleAvailability = async () => {
        if (availabilityBlockedReason && !availableForFastResponse) {
            setAvailabilityStatusMessage(availabilityBlockedReason);
            navigate('/manager/verification');
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError(null);
        setAvailabilityStatusMessage('');

        const nextAvailability = !availableForFastResponse;
        const response = await updateBrokerAvailability(nextAvailability);

        setAvailabilityLoading(false);

        if (response.error) {
            setAvailabilityError(response.error);
            setAvailabilityStatusMessage(response.error);
            await fetchRequests(true);
            return;
        }

        if (response.data) {
            setAvailableForFastResponse(response.data.available_for_fast_response);
            setAvailabilityBlockedReason(response.data.blocked_reason || null);
            setAvailabilityStatusMessage(
                response.data.blocked_reason
                    || (response.data.available_for_fast_response ? 'Live queue is on.' : 'Live queue paused.')
            );
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'Manager toggled broker availability',
            });
        }
    };

    const pendingCount = requests.filter((request) => request.status === 'pending').length;
    const availabilityLabel = availabilityBlockedReason
        ? 'Live dispatch unavailable'
        : availableForFastResponse
            ? 'Live queue is on'
            : 'Offline for the rapid-response queue';
    const availabilityHint = availabilityBlockedReason
        ? availabilityBlockedReason
        : availableForFastResponse
            ? pendingCount > 0
                ? `${pendingCount} waiting user${pendingCount === 1 ? '' : 's'} are shown below with their own countdown.`
                : 'Waiting users will appear here with their own 10-minute countdown.'
            : 'Go live when you want to start receiving user requests.';
    const visibleRequestKeyFor = createDuplicateSafeKeyResolver('broker-response-request');
    const matchedRequestKeyFor = createDuplicateSafeKeyResolver('broker-response-matched-request');

    return (
        <div
            data-testid="broker-response-widget"
            className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-6 ring-2 ring-blue-500/10"
        >
            <div role="status" aria-live="polite" className="sr-only">
                {[shareStatusMessage, availabilityStatusMessage].filter(Boolean).join(' ')}
            </div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg animate-pulse">
                        <BellRing className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="section-heading text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-500">Live</span> Response Tracker
                            {pendingCount > 0 && (
                                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                                    {pendingCount} URGENT
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Real-time emergency assistance requests</p>
                    </div>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-300"
                        aria-label="Open live response options"
                        aria-haspopup="menu"
                        aria-expanded={liveResponseOptionsOpen}
                        aria-controls={LIVE_RESPONSE_OPTIONS_MENU_ID}
                        onClick={() => setLiveResponseOptionsOpen((open) => !open)}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {liveResponseOptionsOpen && (
                        <div
                            id={LIVE_RESPONSE_OPTIONS_MENU_ID}
                            role="menu"
                            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 text-sm font-semibold text-gray-700 shadow-xl dark:border-gray-800 dark:bg-black dark:text-gray-200"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setLiveResponseOptionsOpen(false);
                                    navigate('/manager/leads');
                                }}
                                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                            >
                                Open lead desk
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setLiveResponseOptionsOpen(false);
                                    navigate('/manager/dashboard/properties');
                                }}
                                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                            >
                                Manage properties
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setTrackerFilter('pending');
                                    setLiveResponseOptionsOpen(false);
                                }}
                                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                            >
                                Show pending requests
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Live dispatch</p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Zap className="h-4 w-4 text-orange-500" />
                        <span>{availabilityLabel}</span>
                    </div>
                    <p className={`mt-2 text-xs ${
                        availabilityBlockedReason
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}>
                        {availabilityHint}
                    </p>
                    {availabilityError && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                            {availabilityError}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => void toggleAvailability()}
                    disabled={availabilityLoading}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                        availabilityBlockedReason
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : availableForFastResponse
                                ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                                : 'brand-orange-action'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                    {availabilityLoading ? <ActionSpinner className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    {availabilityBlockedReason
                        ? 'Open verification'
                        : availableForFastResponse
                            ? 'Pause live queue'
                            : 'Go live'}
                </button>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Status
                    <select
                        value={trackerFilter}
                        onChange={(event) => setTrackerFilter(event.target.value as TrackerFilter)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-black dark:text-gray-200"
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="responded">Responded</option>
                        <option value="expired">Expired</option>
                    </select>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Sort
                    <select
                        value={trackerSort}
                        onChange={(event) => setTrackerSort(event.target.value as TrackerSort)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-black dark:text-gray-200"
                    >
                        <option value="priority">Priority</option>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full flex justify-center py-8 text-gray-500 dark:text-gray-400">
                        <BrandLoader size="md" label="Loading requests" showLabel />
                    </div>
                ) : visibleRequests.length > 0 ? (
                    visibleRequests.map((request, requestIndex) => (
                        <BrokerRequestItem
                            key={visibleRequestKeyFor(request.id, requestIndex)}
                            request={request}
                            onRespond={handleRespond}
                            onSecondaryAction={handleSecondaryAction}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center text-gray-400">No active requests.</div>
                )}
            </div>

            {matchedRequests.length > 0 && (
                <div
                    id={MATCHED_WORKSPACES_ID}
                    className="mt-8 rounded-3xl border border-gray-100 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-900/30"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Matched client workspaces</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">Share your ranked property shortlist</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                These are the live broker requests you already accepted. Only your published, active, or online properties appear here. Newly created listings stay in admin approval until an admin publishes them.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/manager/dashboard/properties')}
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Manage properties
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-5 space-y-5">
                        {matchedRequests.map((request, requestIndex) => {
                            const selectedIds = shareSelections[request.id] || [];
                            const sharedCount = request.property_shares?.length || 0;
                            const selectedProperty = request.selected_property;
                            const selectedWorkspaceAction = getManagerWorkspaceAction(request);
                            const isSaving = shareSavingRequestId === request.id;
                            const propertyKeyFor = createDuplicateSafeKeyResolver(`broker-response-property-${request.id}`);
                            const eligibleManagerPropertyCount = managerProperties.filter((property) => (
                                isPortfolioPropertyEligibleForRequest(property, request.request_type)
                            )).length;
                            const visibleManagerProperties = selectShareablePortfolioProperties(managerProperties, {
                                requestType: request.request_type,
                                search: propertyPickerSearch,
                                sort: propertyPickerSort,
                                limit: PROPERTY_SHARE_PICKER_LIMIT,
                            });

                            return (
                                <div
                                    key={matchedRequestKeyFor(request.id, requestIndex)}
                                    id={getMatchedWorkspaceCardId(request.id)}
                                    className={`scroll-mt-28 rounded-3xl border bg-white p-5 shadow-sm transition-all dark:bg-black ${
                                        focusedWorkspaceRequestId === request.id
                                            ? 'border-orange-300 ring-2 ring-orange-200 dark:border-orange-700 dark:ring-orange-900/40'
                                            : 'border-white dark:border-gray-800'
                                    }`}
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                                    Matched
                                                </span>
                                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                                    {request.request_type}
                                                </span>
                                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                                    request.handoff_status === 'property_selected' || request.selected_property_id || request.selected_fast_track_case_id
                                                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300'
                                                        : request.handoff_status === 'portfolio_shared' || (request.property_shares?.length || 0) > 0
                                                            ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-300'
                                                            : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300'
                                                }`}>
                                                    {getManagerWorkspaceStateLabel(request)}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                                                {request.requester_name || request.requester_email || 'Matched client'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                                                <span>Workspace {formatWorkspaceReference(request.id)}</span>
                                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                                <span>Started {formatWorkspaceStartedAt(request.created_at || request.updated_at)}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                {formatRequestArea(request.location, request.location_postcode) || 'Location shared in request'}
                                            </p>
                                            {request.details?.trim() ? (
                                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">Requirements:</span>{' '}
                                                    {request.details.trim()}
                                                </p>
                                            ) : null}
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                {selectedProperty
                                                    ? `${selectedProperty.title} has already been selected by the client.`
                                                    : sharedCount > 0
                                                        ? `${sharedCount} shortlisted propert${sharedCount === 1 ? 'y is' : 'ies are'} already shared. Update the ranking or add more options below.`
                                                        : 'No property shortlist shared yet. Choose the best owned properties below and send them into the client workspace.'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Request area</p>
                                            <p className="mt-2 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                                                <MapPin className="h-4 w-4 text-orange-500" />
                                                {formatRequestArea(request.location, request.location_postcode)}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedProperty && (
                                        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                                            <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                                                <img
                                                    src={parsePropertyImage(selectedProperty.image_urls)}
                                                    alt={selectedProperty.title}
                                                    className="h-full min-h-[140px] w-full object-cover"
                                                    onError={(event) => {
                                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                    }}
                                                />
                                                <div className="p-4">
                                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="text-sm font-semibold">Client selected this property</span>
                                                    </div>
                                                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{selectedProperty.title}</p>
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        {formatPortfolioPropertyLocation(selectedProperty)}
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatPropertyPrice(selectedProperty)}
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => navigate(selectedWorkspaceAction.path || '/manager/leads')}
                                                            className="brand-orange-action inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                                                        >
                                                            {selectedWorkspaceAction.label}
                                                            <ArrowRight className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/manager/dashboard/properties/${selectedProperty.id}`)}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                                                        >
                                                            Open property
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedProperty && (
                                        <>
                                            {managerProperties.length > 0 ? (
                                                <>
                                                    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                                                        <label className="relative block">
                                                            <span className="sr-only">Search portfolio properties</span>
                                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                aria-label="Search portfolio properties"
                                                                value={propertyPickerSearch}
                                                                onChange={(event) => setPropertyPickerSearch(event.target.value)}
                                                                maxLength={120}
                                                                placeholder="Search portfolio..."
                                                                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-700 dark:bg-black dark:text-white"
                                                            />
                                                        </label>
                                                        <label className="block">
                                                            <span className="sr-only">Sort portfolio properties</span>
                                                            <select
                                                                aria-label="Sort portfolio properties"
                                                                value={propertyPickerSort}
                                                                onChange={(event) => setPropertyPickerSort(event.target.value as 'price_desc' | 'price_asc' | 'title_asc')}
                                                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-700 dark:bg-black dark:text-white"
                                                            >
                                                                <option value="price_desc">Highest price</option>
                                                                <option value="price_asc">Lowest price</option>
                                                                <option value="title_asc">Title A-Z</option>
                                                            </select>
                                                        </label>
                                                    </div>
                                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                                        Showing {visibleManagerProperties.length} of {eligibleManagerPropertyCount} matching portfolio properties
                                                    </p>
                                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                                        {visibleManagerProperties.map((property, propertyIndex) => {
                                                            const isSelected = selectedIds.includes(property.id);

                                                            return (
                                                                <button
                                                                    key={propertyKeyFor(property.id, propertyIndex)}
                                                                    type="button"
                                                                    onClick={() => togglePropertySelection(request.id, property.id)}
                                                                    className={`overflow-hidden rounded-2xl border text-left transition ${
                                                                        isSelected
                                                                            ? 'border-orange-300 bg-orange-50 shadow-sm dark:border-orange-800 dark:bg-orange-950/20'
                                                                            : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/70 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-orange-900/40'
                                                                    }`}
                                                                >
                                                                    <div className="grid gap-4 md:grid-cols-[112px_minmax(0,1fr)]">
                                                                        <img
                                                                            src={parsePropertyImage(property.image_urls)}
                                                                            alt={property.title}
                                                                            className="h-full min-h-[112px] w-full object-cover"
                                                                            onError={(event) => {
                                                                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                                            }}
                                                                        />
                                                                        <div className="p-4">
                                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                                                            isSelected
                                                                                                ? 'bg-orange-500 text-white'
                                                                                                : 'border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-300'
                                                                                        }`}>
                                                                                            {isSelected ? selectedIds.indexOf(property.id) + 1 : '+'}
                                                                                        </span>
                                                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.title}</p>
                                                                                    </div>
                                                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                                                        {formatPortfolioPropertyLocation(property) || 'Location unavailable'}
                                                                                    </p>
                                                                                </div>
                                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                                    {formatPropertyPrice(property)}
                                                                                </p>
                                                                            </div>
                                                                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                                                <span>{property.listing_type || 'property'}</span>
                                                                                <span>{isSelected ? 'Included in shortlist' : 'Click to shortlist'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {selectedIds.length > 0
                                                                ? `${selectedIds.length} propert${selectedIds.length === 1 ? 'y is' : 'ies are'} ready to share in ranked order.`
                                                                : 'Choose the strongest matching properties from your live inventory.'}
                                                        </div>
                                                        <button
                                                            onClick={() => void savePropertyShares(request.id)}
                                                            disabled={isSaving || selectedIds.length === 0}
                                                            className="brand-orange-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {isSaving ? <ActionSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                            {isSaving ? 'Sharing shortlist...' : sharedCount > 0 ? 'Update shared shortlist' : 'Share selected properties'}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                                    No published portfolio is ready to share yet. Newly created properties stay in Admin Approval Pending until an admin publishes them.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    <span>The user keeps the 10-minute countdown. Managers stay live until they pause availability.</span>
                </div>
                <button
                    onClick={() => navigate('/manager/leads')}
                    className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium group"
                >
                    View All Requests
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
};

export default BrokerResponseWidget;
