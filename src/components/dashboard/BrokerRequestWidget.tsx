"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Building2,
    CheckCircle2,
    Clock,
    Loader2,
    MapPin,
    MessageSquare,
    Phone,
    Radio,
    Search,
    Send,
    Timer,
    UserCheck,
} from 'lucide-react';
import {
    BrokerRequestRecord,
    createBrokerRequest,
    getBrokerRequestById,
    getNearbyAvailableBrokers,
    rematchBrokerRequest,
    selectBrokerRequestProperty,
    getUserBrokerRequests,
    LeadBrokerSummary,
} from '@/services/leadsService';
import { createFastTrackCase } from '@/services/fastTrackService';
import { messagesService } from '@/services/messagesService';
import {
    formatRequestTypeLabel,
    getDispatchWorkspaceSummary,
    getMatchedExperienceSteps,
} from '@/lib/brokerDispatchPresentation';
import { getBrokerRequestCopy } from '@/lib/userJourneyCopy';
import {
    buildBrokerRequestWorkspacePath,
    publishBrokerRequestWorkspaceSelection,
} from '@/lib/brokerRequestWorkspace';
import { selectAutoResumeBrokerRequest } from '@/lib/brokerRequestSelection';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import {
    formatLaunchCurrency,
    formatLaunchLocationCode,
    formatLaunchPropertyLocation,
    getLaunchLocationCodeErrorMessage,
    getLaunchLocationCodeLabel,
    getLaunchLocationCodePlaceholder,
    isValidLaunchLocationCode,
    isValidLaunchLocationCodeForCountry,
    LAUNCH_CURRENCY_CODE,
    normalizeLaunchLocationCode,
    normalizeLaunchLocationCodeErrorMessage,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

export const USER_DASHBOARD_NEAREST_AGENCY_LIMIT = 5;

export const limitNearestAgenciesForDashboard = (brokers: LeadBrokerSummary[]) => (
    brokers.slice(0, USER_DASHBOARD_NEAREST_AGENCY_LIMIT)
);

const secondsUntilDeadline = (deadline?: string, now = Date.now()) => {
    if (!deadline) {
        return 0;
    }

    return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
};

const formatCountdown = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

const formatAcceptedAt = (value?: string) => {
    if (!value) {
        return 'Just now';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Just now';
    }

    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatWorkspaceReference = (requestId?: string | null) => {
    const trimmed = String(requestId || '').trim();
    if (!trimmed) {
        return 'Pending';
    }

    return trimmed.slice(0, 8).toUpperCase();
};

const TOTAL_DISPATCH_SECONDS = 10 * 60;
const SHARED_HOME_CHOICE_LIMIT = 12;

const parsePropertyImage = (value?: string) => {
    if (!value) {
        return PROPERTY_PLACEHOLDER_IMAGE;
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim().length > 0) {
            return parsed[0];
        }
    } catch {
        // The API may already return a single URL string.
    }

    return value;
};

const formatPropertyPrice = (price?: number) => {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return 'Price on request';
    }

    return formatLaunchCurrency(price);
};

const formatPropertyAddress = (property?: {
    address_line_1?: string;
    city?: string;
    postcode?: string;
}) => formatLaunchPropertyLocation([property?.address_line_1, property?.city, property?.postcode]);

const formatPropertyBadgeLabel = (value?: string) => {
    if (!value) {
        return null;
    }

    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatMinutesUntil = (deadline?: string, now = Date.now()) => {
    if (!deadline) {
        return null;
    }

    const remainingMs = new Date(deadline).getTime() - now;
    if (!Number.isFinite(remainingMs)) {
        return null;
    }

    const minutes = Math.max(Math.ceil(remainingMs / 60000), 0);
    return minutes;
};

const formatRequirementsPreview = (value?: string | null) => {
    const trimmedValue = String(value || '').trim();
    if (!trimmedValue) {
        return null;
    }

    if (trimmedValue.length <= 140) {
        return trimmedValue;
    }

    return `${trimmedValue.slice(0, 137).trimEnd()}...`;
};

const mapListingTypeToFastTrackPropertyType = (listingType?: string) => {
    if (listingType === 'sale') {
        return 'buy' as const;
    }
    if (listingType === 'lease') {
        return 'lease' as const;
    }
    return 'rent' as const;
};

const normalizePostcode = (value?: string | null) => normalizeLaunchLocationCode(value);

const formatLaunchBrokerLocationCode = (value?: string | null) => {
    const normalized = normalizePostcode(value);
    if (!normalized || !isValidLaunchLocationCode(normalized)) {
        return '';
    }

    return formatLaunchLocationCode(normalized);
};

const formatBrokerDistance = (distanceMiles?: number) => {
    if (typeof distanceMiles !== 'number' || !Number.isFinite(distanceMiles)) {
        return '';
    }

    return `${(distanceMiles * 1.609344).toFixed(1)} km`;
};

const formatRequestArea = (
    location?: string | null,
    locationPostcode?: string | null,
    fallback = '',
) => {
    const locationCode = formatLaunchBrokerLocationCode(locationPostcode);
    if (!location && !locationCode) {
        return fallback;
    }

    return [location, locationCode].filter(Boolean).join(", ") || fallback;
};

const hasBrokerRequestDraft = ({
    requestType,
    location,
    locationPostcode,
    budget,
    details,
    fastTrackEnabled,
}: {
    requestType: string;
    location: string;
    locationPostcode: string;
    budget: string;
    details: string;
    fastTrackEnabled: boolean;
}) => (
    requestType !== 'buy'
    || location.trim().length > 0
    || locationPostcode.trim().length > 0
    || budget.trim().length > 0
    || details.trim().length > 0
    || fastTrackEnabled !== true
);

const BrokerRequestWidget = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const [requestType, setRequestType] = useState('buy');
    const [details, setDetails] = useState('');
    const [location, setLocation] = useState('');
    const [locationPostcode, setLocationPostcode] = useState('');
    const [budget, setBudget] = useState('');
    const [fastTrackEnabled, setFastTrackEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [postcodeError, setPostcodeError] = useState<string | null>(null);
    const [nearbyBrokers, setNearbyBrokers] = useState<LeadBrokerSummary[]>([]);
    const [isRankingLoading, setIsRankingLoading] = useState(false);
    const [activeRequest, setActiveRequest] = useState<BrokerRequestRecord | null>(null);
    const [clockNow, setClockNow] = useState(() => Date.now());
    const [workspacePulse, setWorkspacePulse] = useState(false);
    const [selectingPropertyId, setSelectingPropertyId] = useState<string | null>(null);
    const [rematching, setRematching] = useState(false);
    const [openingConversation, setOpeningConversation] = useState(false);
    const [sharedHomeSearch, setSharedHomeSearch] = useState('');
    const [sharedHomeSort, setSharedHomeSort] = useState<'rank' | 'price_desc' | 'price_asc' | 'title_asc'>('rank');
    const [selectionStatusMessage, setSelectionStatusMessage] = useState('');
    const workspaceContainerRef = useRef<HTMLDivElement | null>(null);
    const draftStateRef = useRef(false);
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const requestedWorkspaceRequestId = searchParams.get('workspace') === 'broker-request'
        ? searchParams.get('request')?.trim() || null
        : null;
    const displayName = user?.user_metadata?.full_name || user?.name || user?.email || 'Client';
    const brokerCopy = getBrokerRequestCopy(requestType);
    const geoMarket = useUserGeoMarket(user, {
        locationCode: activeRequest?.location_postcode || locationPostcode || user?.postcode,
    });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, locationPostcode);
    const locationCodePlaceholder = getLaunchLocationCodePlaceholder(geoMarket, undefined, locationPostcode);
    const geoMarketCurrencyCode = geoMarket === 'GB' ? 'GBP' : LAUNCH_CURRENCY_CODE;
    const visibleNearbyBrokers = useMemo(() => limitNearestAgenciesForDashboard(nearbyBrokers), [nearbyBrokers]);

    useEffect(() => {
        draftStateRef.current = hasBrokerRequestDraft({
            requestType,
            location,
            locationPostcode,
            budget,
            details,
            fastTrackEnabled,
        });
    }, [budget, details, fastTrackEnabled, location, locationPostcode, requestType]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            setClockNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!workspacePulse) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setWorkspacePulse(false);
        }, 1400);

        return () => window.clearTimeout(timeout);
    }, [workspacePulse]);

    const resetWorkspaceForm = useCallback(() => {
        setRequestType('buy');
        setDetails('');
        setLocation('');
        setLocationPostcode('');
        setBudget('');
        setFastTrackEnabled(true);
        setError(null);
        setPostcodeError(null);
    }, []);

    const loadActiveRequest = useCallback(async () => {
        if (requestedWorkspaceRequestId) {
            const { data } = await getBrokerRequestById(requestedWorkspaceRequestId, { suppressErrorToast: true });
            if (data) {
                setActiveRequest(data);
                publishBrokerRequestWorkspaceSelection(data.id);
                setRequestType(data.request_type || 'buy');
                setLocationPostcode(data.location_postcode || '');
                setLocation(data.location || '');
                setBudget(data.budget || '');
                setDetails(data.details || '');
                setFastTrackEnabled(data.fast_track_enabled !== false);
                return;
            }
        }

        const { data, error } = await getUserBrokerRequests({ suppressErrorToast: true });
        if (error) {
            return;
        }

        if (!data || data.length === 0) {
            setActiveRequest(null);
            publishBrokerRequestWorkspaceSelection(null);
            if (!draftStateRef.current) {
                resetWorkspaceForm();
            }
            return;
        }

        const latestRequest = selectAutoResumeBrokerRequest(data);
        if (!latestRequest) {
            setActiveRequest(null);
            publishBrokerRequestWorkspaceSelection(null);
            if (!draftStateRef.current) {
                resetWorkspaceForm();
            }
            return;
        }

        setActiveRequest(latestRequest);
        publishBrokerRequestWorkspaceSelection(latestRequest.id);
        setRequestType(latestRequest.request_type || 'buy');
        setLocationPostcode(latestRequest.location_postcode || '');
        setLocation(latestRequest.location || '');
        setBudget(latestRequest.budget || '');
        setDetails(latestRequest.details || '');
        setFastTrackEnabled(latestRequest.fast_track_enabled !== false);
    }, [requestedWorkspaceRequestId, resetWorkspaceForm]);

    useEffect(() => {
        void loadActiveRequest();
    }, [loadActiveRequest]);

    useEffect(() => {
        const trimmedPostcode = normalizePostcode(locationPostcode);
        if (!trimmedPostcode) {
            setNearbyBrokers([]);
            setIsRankingLoading(false);
            setPostcodeError(null);
            return;
        }

        if (!isValidLaunchLocationCodeForCountry(trimmedPostcode, geoMarket)) {
            setNearbyBrokers([]);
            setIsRankingLoading(false);
            return;
        }

        const formattedPostcode = formatLaunchBrokerLocationCode(trimmedPostcode);
        if (!formattedPostcode) {
            setNearbyBrokers([]);
            setIsRankingLoading(false);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setIsRankingLoading(true);
            try {
                const { data } = await getNearbyAvailableBrokers({
                    postcode: formattedPostcode,
                    fastTrack: fastTrackEnabled,
                    limit: USER_DASHBOARD_NEAREST_AGENCY_LIMIT,
                }, { suppressErrorToast: true });

                if (!cancelled) {
                    setNearbyBrokers(limitNearestAgenciesForDashboard(data || []));
                }
            } catch {
                if (!cancelled) {
                    setNearbyBrokers([]);
                }
            } finally {
                if (!cancelled) {
                    setIsRankingLoading(false);
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [fastTrackEnabled, geoMarket, locationPostcode]);

    const refreshActiveRequest = useCallback(async () => {
        if (!activeRequest?.id) {
            return;
        }

        const { data } = await getBrokerRequestById(activeRequest.id, { suppressErrorToast: true });
        if (data) {
            setActiveRequest(data);
            publishBrokerRequestWorkspaceSelection(data.id);
        }
    }, [activeRequest?.id]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.MESSAGES,
        ],
        refresh: () => activeRequest?.id ? refreshActiveRequest() : loadActiveRequest(),
        enabled: Boolean(activeRequest?.id || requestedWorkspaceRequestId),
    });

    const handleRematch = async () => {
        if (!activeRequest?.id) {
            return;
        }

        setRematching(true);
        setError(null);

        try {
            const { data, error: rematchError } = await rematchBrokerRequest(activeRequest.id);
            if (rematchError || !data) {
                throw new Error(rematchError || 'Unable to find another property agent right now.');
            }

            setActiveRequest(data);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                ],
                reason: 'User rematched broker request',
                ids: {
                    leadId: data.id,
                    propertyId: data.selected_property_id || undefined,
                    caseId: data.selected_fast_track_case_id || undefined,
                },
            });
            toast.success(brokerCopy.rematchSuccess);
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to find another property agent right now.';
            setError(message);
            toast.error(message);
        } finally {
            setRematching(false);
        }
    };

    const handleSelectProperty = async (propertyId: string) => {
        if (!activeRequest?.id || !user?.id) {
            setSelectionStatusMessage('Please sign in again before selecting a property.');
            toast.error('Please sign in again before selecting a property.');
            return;
        }

        setSelectingPropertyId(propertyId);
        setError(null);

        try {
            const { data: selectedRequest, error: selectionError } = await selectBrokerRequestProperty(activeRequest.id, propertyId);
            if (selectionError || !selectedRequest) {
                throw new Error(selectionError || 'Unable to save this home to your guided journey.');
            }

            const selectedProperty = selectedRequest.selected_property
                || selectedRequest.property_shares?.find((share) => share.property_id === propertyId)?.property
                || null;

            if (!selectedProperty) {
                throw new Error('The selected home could not be opened from this agent request.');
            }

            let nextFastTrackCaseId = selectedRequest.selected_fast_track_case_id || null;

            if (!nextFastTrackCaseId) {
                const fastTrackResult = await createFastTrackCase({
                    property_id: selectedProperty.id,
                    broker_request_id: selectedRequest.id,
                    lead_id: selectedRequest.selected_lead_id || undefined,
                    manager_id: selectedRequest.matched_broker_id || undefined,
                    client_id: user.id,
                    client_name: displayName,
                    property_title: selectedProperty.title,
                    property_type: mapListingTypeToFastTrackPropertyType(selectedProperty.listing_type),
                    property_country: selectedProperty.country || undefined,
                    listing_type: selectedProperty.listing_type as 'rent' | 'sale' | 'lease' | undefined,
                    started_from: 'broker_request_selection',
                });

                if (fastTrackResult.error || !fastTrackResult.data) {
                    throw new Error(fastTrackResult.error || 'Unable to start your 24-hour journey.');
                }

                nextFastTrackCaseId = fastTrackResult.data.caseId;
            }

            const refreshedRequest = await getBrokerRequestById(activeRequest.id, { suppressErrorToast: true });
            const resolvedRequest = refreshedRequest.data || selectedRequest;
            setActiveRequest(resolvedRequest);

            const params = new URLSearchParams();
            params.set('fast-track', '1');
            params.set('broker-request', resolvedRequest.id);
            if (nextFastTrackCaseId) {
                params.set('case', nextFastTrackCaseId);
            }

            setSelectionStatusMessage(brokerCopy.selectionSuccess);
            toast.success(brokerCopy.selectionSuccess);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.PROPERTIES,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                ],
                reason: 'User selected broker-request property',
                ids: {
                    leadId: resolvedRequest.id,
                    propertyId,
                    caseId: nextFastTrackCaseId || undefined,
                },
            });
            navigate(`/user/properties/${propertyId}?${params.toString()}`);
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to select this property right now.';
            setError(message);
            setSelectionStatusMessage(message);
            toast.error(message);
        } finally {
            setSelectingPropertyId(null);
        }
    };

    const handleOpenConversation = async () => {
        if (!activeRequest?.matched_broker_id || !user) {
            toast.error('The matched agent conversation is not ready yet.');
            return;
        }

        setOpeningConversation(true);
        try {
            const propertyContext = selectedProperty
                ? {
                    propertyId: selectedProperty.id,
                    propertyTitle: selectedProperty.title,
                    propertyAddress: formatPropertyAddress(selectedProperty),
                    propertyImage: parsePropertyImage(selectedProperty.image_urls),
                    listingType: selectedProperty.listing_type,
                    propertyPrice: selectedProperty.price,
                }
                : {
                    propertyTitle: `${formatRequestTypeLabel(activeRequest.request_type)} request`,
                    propertyAddress: formatRequestArea(activeRequest.location, activeRequest.location_postcode) || undefined,
                    listingType: activeRequest.request_type === 'buy' ? 'sale' : activeRequest.request_type,
                };

            const conversation = await messagesService.upsertDirectConversation(activeRequest.matched_broker_id, {
                ...propertyContext,
                senderName: displayName,
                senderEmail: user.email || '',
                senderPhone: user.phone || user.user_metadata?.phone || '',
                recipientName: matchedBroker?.name || '',
                recipientEmail: matchedBroker?.email || '',
                recipientPhone: matchedBroker?.phone || '',
                recipientAgency: matchedBroker?.company_name || '',
            });

            navigate(`/user/dashboard/messages?conversation=${conversation.id}`);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to open the message thread right now.');
        } finally {
            setOpeningConversation(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedPostcode = normalizePostcode(locationPostcode);
        if (!trimmedPostcode || !isValidLaunchLocationCodeForCountry(trimmedPostcode, geoMarket)) {
            setPostcodeError(getLaunchLocationCodeErrorMessage(geoMarket, undefined, trimmedPostcode));
            return;
        }
        const formattedPostcode = formatLaunchBrokerLocationCode(trimmedPostcode);
        if (!formattedPostcode) {
            setPostcodeError(getLaunchLocationCodeErrorMessage(geoMarket, undefined, trimmedPostcode));
            return;
        }

        setLoading(true);
        setError(null);
        setPostcodeError(null);

        try {
            const { success, data, error: requestError } = await createBrokerRequest({
                requestType,
                location,
                locationPostcode: formattedPostcode,
                budget,
                details,
                fastTrackEnabled,
            });

            if (!success) {
                throw new Error(normalizeLaunchLocationCodeErrorMessage(requestError || 'Failed to submit request', formattedPostcode));
            }

            if (data) {
                const hydratedRequest = data.id
                    ? await getBrokerRequestById(data.id, { suppressErrorToast: true })
                    : { data: null };
                const resolvedRequest = hydratedRequest.data || data;

                setActiveRequest(resolvedRequest);
                publishBrokerRequestWorkspaceSelection(resolvedRequest.id);
                publishWorkspaceSync({
                    source: 'mutation',
                    tags: [
                        WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
                        WORKSPACE_SYNC_TAGS.LEADS,
                        WORKSPACE_SYNC_TAGS.USER_DASHBOARD,
                    ],
                    reason: 'User created broker request',
                    ids: {
                        leadId: resolvedRequest.id,
                        propertyId: resolvedRequest.selected_property_id || undefined,
                        caseId: resolvedRequest.selected_fast_track_case_id || undefined,
                    },
                });
                navigate(buildBrokerRequestWorkspacePath(resolvedRequest.id), { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const activeRequestSeconds = secondsUntilDeadline(activeRequest?.response_deadline_at, clockNow);
    const requestIsMatched = activeRequest?.dispatch_status === 'broker_matched' || activeRequest?.status === 'matched';
    const requestIsExpired = activeRequest?.dispatch_status === 'expired' || activeRequest?.status === 'expired';
    const requestIsActive = Boolean(activeRequest && !requestIsMatched && !requestIsExpired);
    const dispatchWorkspaceSummary = getDispatchWorkspaceSummary(activeRequest);
    const matchedBroker = activeRequest?.matched_broker || null;
    const matchedExperienceSteps = requestIsMatched && activeRequest ? getMatchedExperienceSteps(activeRequest) : [];
    const sharedProperties = activeRequest?.property_shares || [];
    const selectedProperty = activeRequest?.selected_property
        || sharedProperties.find((share) => share.status === 'selected' || share.property_id === activeRequest?.selected_property_id)?.property
        || null;
    const visibleSharedProperties = useMemo(() => {
        const search = sharedHomeSearch.trim().toLowerCase();
        const filtered = sharedProperties.filter((share) => {
            if (!search) {
                return true;
            }
            const property = share.property;
            return [
                property?.title,
                property?.city,
                property?.postcode,
                property?.listing_type,
                property?.property_type,
            ].some((value) => String(value || '').toLowerCase().includes(search));
        });

        filtered.sort((left, right) => {
            const leftProperty = left.property;
            const rightProperty = right.property;
            if (sharedHomeSort === 'price_desc') {
                return (rightProperty?.price || 0) - (leftProperty?.price || 0);
            }
            if (sharedHomeSort === 'price_asc') {
                return (leftProperty?.price || 0) - (rightProperty?.price || 0);
            }
            if (sharedHomeSort === 'title_asc') {
                return String(leftProperty?.title || '').localeCompare(String(rightProperty?.title || ''), undefined, { sensitivity: 'base' });
            }
            return (left.rank || 0) - (right.rank || 0);
        });

        return filtered.slice(0, SHARED_HOME_CHOICE_LIMIT);
    }, [sharedHomeSearch, sharedHomeSort, sharedProperties]);
    const handoffMinutesRemaining = formatMinutesUntil(activeRequest?.handoff_due_at, clockNow);
    const workspaceTone = requestIsMatched
        ? 'border-emerald-200 bg-white shadow-sm dark:border-emerald-900/40 dark:bg-gray-900'
        : requestIsExpired
            ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
            : 'border-orange-100 bg-orange-50/70 dark:border-orange-900/30 dark:bg-orange-950/20';
    const submittedArea = formatRequestArea(
        activeRequest?.location || location,
        activeRequest?.location_postcode || locationPostcode,
    );
    const activeRequestArea = activeRequest
        ? formatRequestArea(activeRequest.location, activeRequest.location_postcode)
        : '';
    const submittedBudget = activeRequest?.budget || budget;
    const submittedRequirements = activeRequest?.details || details;
    const dispatchProgressPercent = requestIsMatched
        ? 100
        : requestIsActive
            ? Math.max(0, Math.min(100, (activeRequestSeconds / TOTAL_DISPATCH_SECONDS) * 100))
            : 0;
    const countdownTone = requestIsMatched
        ? {
            pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
            dot: 'bg-emerald-500',
        caption: 'Agent found',
            eyebrow: 'Accepted',
            progress: 'bg-emerald-500',
        }
        : requestIsExpired
            ? {
                pill: 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-300',
                dot: 'bg-gray-400',
                caption: 'Window finished',
                eyebrow: 'Closed',
                progress: 'bg-gray-400',
            }
            : activeRequestSeconds <= 120
                ? {
                    pill: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
                    dot: 'bg-red-500',
                    caption: 'Final sprint',
                    eyebrow: 'Live now',
                    progress: 'bg-gradient-to-r from-red-500 via-orange-500 to-red-400',
                }
                : activeRequestSeconds <= 300
                    ? {
                        pill: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
                        dot: 'bg-amber-500',
                        caption: 'Responses expected',
                        eyebrow: 'Live now',
                        progress: 'bg-gradient-to-r from-amber-500 via-orange-500 to-orange-400',
                    }
                    : {
                        pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
                        dot: 'bg-emerald-500',
                        caption: 'Broadcasting now',
                        eyebrow: 'Live now',
                        progress: 'bg-gradient-to-r from-emerald-500 via-orange-500 to-orange-400',
                    };
    const sharedPropertyKeyFor = createDuplicateSafeKeyResolver('broker-request-shared-property');
    const nearbyBrokerKeyFor = createDuplicateSafeKeyResolver('broker-request-nearby-broker');

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div role="status" aria-live="polite" className="sr-only">
                {selectionStatusMessage}
            </div>
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                    <Send size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">{brokerCopy.panelTitle}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{brokerCopy.panelSubtitle}</p>
                </div>
            </div>

            {activeRequest && (
                <div
                    ref={workspaceContainerRef}
                    className={`mb-6 rounded-2xl border p-4 transition-all duration-300 ${workspaceTone} ${
                        workspacePulse ? 'ring-2 ring-orange-300 shadow-lg shadow-orange-500/15' : ''
                    }`}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-300">{brokerCopy.activeRequestEyebrow}</p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                {dispatchWorkspaceSummary.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                {activeRequest?.status_reason || dispatchWorkspaceSummary.subtitle}
                            </p>
                        </div>
                        <div className={`min-w-[168px] rounded-2xl border px-4 py-3 shadow-sm ${countdownTone.pill}`}>
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <span className="relative flex h-2.5 w-2.5">
                                    {requestIsActive && (
                                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping ${countdownTone.dot}`} />
                                    )}
                                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${countdownTone.dot}`} />
                                </span>
                                {countdownTone.eyebrow}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <Timer size={14} className={requestIsActive ? 'animate-pulse' : ''} />
                                <span className="font-mono text-lg font-bold tracking-[0.18em]">
                                    {requestIsMatched ? 'LOCKED' : requestIsExpired ? 'CLOSED' : formatCountdown(activeRequestSeconds)}
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium opacity-80">
                                {countdownTone.caption}
                            </p>
                        </div>
                    </div>

                    {requestIsActive && (
                        <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3 dark:border-zinc-900/60 dark:bg-zinc-950/50">
                            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500 dark:text-orange-300">
                                <span>Response progress</span>
                                <span>{Math.max(0, Math.round(dispatchProgressPercent))}% time left</span>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-orange-100/80 dark:bg-orange-950/40">
                                <div
                                    className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${countdownTone.progress} ${requestIsActive ? 'animate-pulse' : ''}`}
                                    style={{ width: `${dispatchProgressPercent}%` }}
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>We are checking the closest available property agents.</span>
                                <span>{activeRequest.dispatched_broker_count || 0} contacted</span>
                            </div>
                        </div>
                    )}

                    {activeRequest && (
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-white bg-white/90 px-4 py-3 dark:border-zinc-900/60 dark:bg-zinc-950/60">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Search area</p>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                    {submittedArea || 'Area shared in your request'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white bg-white/90 px-4 py-3 dark:border-zinc-900/60 dark:bg-zinc-950/60">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Budget</p>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                    {submittedBudget || 'Budget saved in your request'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white bg-white/90 px-4 py-3 dark:border-zinc-900/60 dark:bg-zinc-950/60">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Requirements</p>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatRequirementsPreview(submittedRequirements) || 'Your requirements stay attached to this request.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {requestIsMatched ? (
                        <div className="mt-5 space-y-4">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/30 dark:bg-zinc-950 dark:text-emerald-300">
                                            <BadgeCheck size={12} />
                                            {brokerCopy.matchedBrokerLabel}
                                        </span>
                                        <p className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                            {matchedBroker?.name || 'Your property agent is ready'}
                                        </p>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.company_name || 'Independent agent'} is now handling your {formatRequestTypeLabel(activeRequest.request_type).toLowerCase()} request
                                            {activeRequestArea ? ` in ${activeRequestArea}` : ''}.
                                        </p>
                                    </div>
                                    <details className="min-w-[180px] rounded-2xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/30 dark:bg-zinc-950">
                                        <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 dark:text-white">
                                            {brokerCopy.detailsToggleLabel}
                                        </summary>
                                        <div className="mt-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">{brokerCopy.requestReferenceLabel}</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatWorkspaceReference(activeRequest.id)}
                                            </p>
                                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Accepted at</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatAcceptedAt(activeRequest.matched_at || activeRequest.updated_at || activeRequest.created_at)}
                                            </p>
                                        </div>
                                    </details>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <MapPin size={15} className="text-orange-500" />
                                            Search area
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {activeRequestArea || 'Location shared in request'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Building2 size={15} className="text-orange-500" />
                                            Agent profile
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.company_name || 'Independent agent'}
                                            {formatBrokerDistance(matchedBroker?.distance_miles) ? ` - ${formatBrokerDistance(matchedBroker?.distance_miles)} away` : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Phone size={15} className="text-orange-500" />
                                            Contact route
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.phone || matchedBroker?.email || 'Contact details will appear here when they are ready.'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Clock size={15} className="text-orange-500" />
                                            Journey timing
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {activeRequest.fast_track_enabled
                                                ? 'Your 24-hour journey will start as soon as you choose a home.'
                                                : 'Standard follow-up is active for this request.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    {matchedBroker?.phone && (
                                        <a
                                            href={`tel:${matchedBroker.phone}`}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                        >
                                            <Phone size={15} />
                                            Call agent
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleOpenConversation}
                                        disabled={openingConversation}
                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                    >
                                        {openingConversation ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                                        {openingConversation ? 'Opening thread' : 'Open messages'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-orange-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">What happens next</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Your property agent stays linked here until home choices are shared and you pick one.</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    {matchedExperienceSteps.map((step, index) => (
                                        <div key={step.id} className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                            <div className="flex items-start gap-3">
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</p>
                                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {activeRequest.fast_track_enabled && (
                                    <div className="mt-4 rounded-xl border border-orange-100 bg-white p-4 dark:border-orange-900/30 dark:bg-zinc-950/70">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">{brokerCopy.homeChoicesLabel}</p>
                                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                    {selectedProperty
                                                        ? 'Your chosen home is ready'
                                                        : sharedProperties.length > 0
                                                            ? `${sharedProperties.length} home choice${sharedProperties.length === 1 ? '' : 's'} ready to review`
                                                            : 'Waiting for home choices'}
                                                </p>
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                    {selectedProperty
                                                        ? 'Open your chosen home or continue your 24-hour journey.'
                                                        : sharedProperties.length > 0
                                                            ? 'Choose one of the homes below to start your 24-hour journey.'
                                                            : handoffMinutesRemaining !== null
                                                                ? `Your property agent should share options within about ${handoffMinutesRemaining} minute${handoffMinutesRemaining === 1 ? '' : 's'}.`
                                                                : 'Your property agent is preparing home choices for this request.'}
                                                </p>
                                            </div>
                                            {handoffMinutesRemaining !== null && !selectedProperty && sharedProperties.length === 0 && (
                                                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-right dark:border-orange-900/30 dark:bg-orange-950/20">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Shortlist due</p>
                                                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                                        {handoffMinutesRemaining === 0 ? 'Now' : `${handoffMinutesRemaining}m`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {selectedProperty ? (
                                            <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                                                <img
                                                    src={parsePropertyImage(selectedProperty.image_urls)}
                                                    alt={selectedProperty.title}
                                                    className="aspect-[16/9] w-full object-cover"
                                                    onError={(event) => {
                                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                    }}
                                                />
                                                <div className="space-y-4 p-5">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                                    Selected property
                                                                </span>
                                                                {formatPropertyBadgeLabel(selectedProperty.listing_type) && (
                                                                    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                                                                        {formatPropertyBadgeLabel(selectedProperty.listing_type)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-3 text-xl font-semibold leading-tight text-gray-900 dark:text-white">{selectedProperty.title}</p>
                                                            <p className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                                <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-300" />
                                                                <span>{formatPropertyAddress(selectedProperty) || 'Address available on the property page'}</span>
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl border border-emerald-200/80 bg-white px-4 py-3 text-left shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Locked price</p>
                                                            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                                                                {formatPropertyPrice(selectedProperty.price)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/user/properties/${selectedProperty.id}?fast-track=1&broker-request=${activeRequest.id}${activeRequest.selected_fast_track_case_id ? `&case=${activeRequest.selected_fast_track_case_id}` : ''}`)}
                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                                        >
                                                            Open this home
                                                            <ArrowRight size={15} />
                                                        </button>
                                                        {activeRequest.selected_fast_track_case_id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/user/dashboard/fast-track?case=${activeRequest.selected_fast_track_case_id}`)}
                                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                                            >
                                                                Continue your 24-hour journey
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : sharedProperties.length > 0 ? (
                                            <div className="mt-4 space-y-3">
                                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                                                    <label className="relative block">
                                                        <span className="sr-only">Search shared homes</span>
                                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            aria-label="Search shared homes"
                                                            value={sharedHomeSearch}
                                                            onChange={(event) => setSharedHomeSearch(event.target.value)}
                                                            maxLength={120}
                                                            placeholder="Search shared homes..."
                                                            className="w-full rounded-2xl border border-orange-100 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-white"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="sr-only">Sort shared homes</span>
                                                        <select
                                                            aria-label="Sort shared homes"
                                                            value={sharedHomeSort}
                                                            onChange={(event) => setSharedHomeSort(event.target.value as 'rank' | 'price_desc' | 'price_asc' | 'title_asc')}
                                                            className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-white"
                                                        >
                                                            <option value="rank">Agent rank</option>
                                                            <option value="price_desc">Highest price</option>
                                                            <option value="price_asc">Lowest price</option>
                                                            <option value="title_asc">Title A-Z</option>
                                                        </select>
                                                    </label>
                                                </div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                                    Showing {visibleSharedProperties.length} of {sharedProperties.length} shared homes
                                                </p>
                                                {visibleSharedProperties.map((share, shareIndex) => {
                                                        const property = share.property;
                                                        if (!property) {
                                                            return null;
                                                        }

                                                        const isSelecting = selectingPropertyId === property.id;

                                                        return (
                                                            <div
                                                                key={sharedPropertyKeyFor(share.id || property.id, shareIndex)}
                                                                className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-orange-900/30 dark:bg-zinc-950/70"
                                                            >
                                                                <img
                                                                    src={parsePropertyImage(property.image_urls)}
                                                                    alt={property.title}
                                                                    className="aspect-[16/9] w-full object-cover"
                                                                    onError={(event) => {
                                                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                                    }}
                                                                />
                                                                <div className="space-y-4 p-5">
                                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300">
                                                                                    Option {share.rank}
                                                                                </span>
                                                                                {formatPropertyBadgeLabel(property.listing_type) && (
                                                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-300">
                                                                                        {formatPropertyBadgeLabel(property.listing_type)}
                                                                                    </span>
                                                                                )}
                                                                                {formatPropertyBadgeLabel(property.property_type) && (
                                                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600 dark:border-gray-800 dark:bg-zinc-900 dark:text-gray-300">
                                                                                        {formatPropertyBadgeLabel(property.property_type)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="mt-3 text-xl font-semibold leading-tight text-gray-900 dark:text-white">{property.title}</p>
                                                                        </div>
                                                                        <div className="rounded-2xl border border-orange-200/80 bg-orange-50 px-4 py-3 text-left dark:border-orange-900/30 dark:bg-orange-950/20">
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">Guide price</p>
                                                                            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                                                                                {formatPropertyPrice(property.price)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                                        <MapPin size={15} className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-300" />
                                                                        <span>{formatPropertyAddress(property) || 'Address available on the property page'}</span>
                                                                    </p>
                                                                    {share.note && (
                                                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 dark:border-orange-900/30 dark:bg-orange-950/20">
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Agent note</p>
                                                                            <p className="mt-2 text-sm leading-6 text-orange-950 dark:text-orange-100">{share.note}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="grid gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleSelectProperty(property.id)}
                                                                            disabled={Boolean(selectingPropertyId)}
                                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            {isSelecting && <Loader2 size={15} className="animate-spin" />}
                                                                            {isSelecting ? 'Starting your journey...' : 'Choose this home'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => navigate(`/user/properties/${property.id}?broker-request=${activeRequest.id}`)}
                                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                                                        >
                                                                            View property details
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-4 text-sm text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-100">
                                                Your property agent is connected, but home choices are not ready yet. Once they arrive, you can compare them here and start your 24-hour journey.
                                            </div>
                                        )}

                                        {!selectedProperty && (
                                            <button
                                                type="button"
                                                onClick={() => void handleRematch()}
                                                disabled={rematching || Boolean(selectingPropertyId)}
                                                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                            >
                                                {rematching && <Loader2 size={15} className="animate-spin" />}
                                                {rematching ? 'Finding another agent...' : 'Find another agent'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveRequest(null);
                                        setError(null);
                                        publishBrokerRequestWorkspaceSelection(null);
                                        navigate('/user/dashboard', { replace: true });
                                    }}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    <Radio size={14} />
                                    {brokerCopy.restartRequestLabel}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <details className="mt-4 rounded-xl border border-white/70 bg-white/80 px-4 py-3 dark:border-zinc-900/60 dark:bg-zinc-950/40">
                                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 dark:text-white">
                                    {brokerCopy.detailsToggleLabel}
                                </summary>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Wave</p>
                                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Wave {activeRequest.dispatch_wave || 1}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Agents checked</p>
                                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                            {activeRequest.dispatched_broker_count || 0} / {activeRequest.available_broker_count || nearbyBrokers.length || 0}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">{brokerCopy.matchedBrokerLabel}</p>
                                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                            {activeRequest.matched_broker?.name || (requestIsExpired ? 'No agent accepted in time' : 'Looking for an agent')}
                                        </p>
                                    </div>
                                </div>
                            </details>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (requestIsExpired) {
                                            setActiveRequest(null);
                                            setError(null);
                                            return;
                                        }

                                        await refreshActiveRequest();
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    <Radio size={14} />
                                    {requestIsExpired ? brokerCopy.restartRequestLabel : brokerCopy.refreshRequestLabel}
                                </button>
                                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                    <UserCheck size={14} />
                                    {activeRequest?.next_action || dispatchWorkspaceSummary.helper}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700/50">
                    {['buy', 'rent', 'sell'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setRequestType(type)}
                            className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all ${
                                requestType === type
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50/70 p-3 text-sm text-gray-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-gray-200">
                    <input
                        type="checkbox"
                        checked={fastTrackEnabled}
                        onChange={(event) => setFastTrackEnabled(event.target.checked)}
                        aria-label={brokerCopy.useDispatchTitle}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>
                        <span className="block font-semibold text-gray-900 dark:text-white">{brokerCopy.useDispatchTitle}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{brokerCopy.useDispatchSubtitle}</span>
                    </span>
                </label>

                {requestIsActive && (
                    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-sm text-gray-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-gray-200">
                        An agent request is already running. You can still adjust the form below and start a new one if your needs change.
                    </div>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Preferred Location
                        </label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Chennai, Adyar"
                                maxLength={255}
                                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-600 dark:bg-gray-900/50"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            {locationCodeLabel}
                        </label>
                        <input
                            type="text"
                            value={locationPostcode}
                            onChange={(e) => {
                                const nextValue = normalizeLaunchLocationCode(e.target.value);
                                setLocationPostcode(nextValue);
                                if (postcodeError) {
                                    const trimmedNextValue = normalizePostcode(nextValue);
                                    if (!trimmedNextValue || isValidLaunchLocationCodeForCountry(trimmedNextValue, geoMarket)) {
                                        setPostcodeError(null);
                                    }
                                }
                            }}
                            placeholder={locationCodePlaceholder}
                            maxLength={8}
                            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm uppercase outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-600 dark:bg-gray-900/50"
                            required
                        />
                        {postcodeError && (
                            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{postcodeError}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Budget / Price Range ({geoMarketCurrencyCode})
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">{geoMarketCurrencyCode}</span>
                            <input
                                type="text"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="e.g. 500k - 600k"
                                maxLength={255}
                                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-12 pr-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-600 dark:bg-gray-900/50"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Requirements
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="e.g. 2 bedrooms, balcony, pet friendly..."
                            rows={3}
                            maxLength={2000}
                            className="w-full resize-none rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-600 dark:bg-gray-900/50"
                            required
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{brokerCopy.nearbyBrokersTitle}</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{brokerCopy.nearbyBrokersSubtitle}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-orange-300">
                            <Clock size={13} />
                            Quick help
                        </div>
                    </div>
                    {isRankingLoading ? (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">{brokerCopy.nearbyBrokersLoading}</div>
                    ) : visibleNearbyBrokers.length > 0 ? (
                        <div className="mt-4 space-y-2">
                            {visibleNearbyBrokers.map((broker, index) => (
                                <div key={nearbyBrokerKeyFor(broker.id, index)} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-white bg-white px-3 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
                                            {index + 1}. {broker.name}
                                        </p>
                                        <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                                            {broker.company_name || 'Independent agent'}
                                            {formatBrokerDistance(broker.distance_miles) ? ` - ${formatBrokerDistance(broker.distance_miles)}` : ''}
                                        </p>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                        <BadgeCheck size={12} />
                                        {broker.fast_track_eligible ? brokerCopy.nearbyBrokerAvailableLabel : brokerCopy.nearbyBrokerQueuedLabel}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            {brokerCopy.nearbyBrokersEmpty}
                        </div>
                    )}
                </div>

                {error && (
                    <div role="alert" aria-live="assertive" className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/10 dark:text-red-400">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                        <Send size={16} />
                    )}
                    {loading
                        ? 'Sending request...'
                        : requestIsActive
                            ? brokerCopy.requestFormActionAgain
                            : activeRequest
                                ? brokerCopy.requestFormActionAgain
                                : brokerCopy.requestFormAction}
                </button>

                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                    {brokerCopy.requestFormHelper}
                </p>
            </form>
        </div>
    );
};

export default BrokerRequestWidget;
