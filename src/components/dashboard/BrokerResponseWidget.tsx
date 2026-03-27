"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info, BellRing, Loader2, MapPin, MoreHorizontal, Send, Zap } from 'lucide-react';
import BrokerRequestItem, { BrokerRequest } from './BrokerRequestItem';
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
import { sortBrokerRequestsByPriority } from '@/lib/brokerRequestSelection';
import { getUserProperties } from '@/services/userPropertiesService';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { useToast } from '@/contexts/ToastContext';

const secondsUntilDeadline = (deadline?: string) => {
    if (!deadline) {
        return undefined;
    }

    const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
    return Number.isFinite(seconds) ? seconds : undefined;
};

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
            return parsed[0];
        }
    } catch {
        // The property may already expose a direct URL.
    }

    return value;
};

const formatPropertyPrice = (price?: number) => {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return 'Price on request';
    }

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
    }).format(price);
};

const formatWorkspaceReference = (requestId?: string) => {
    const trimmed = String(requestId || '').trim();
    if (!trimmed) {
        return 'Pending';
    }

    return trimmed.slice(0, 8).toUpperCase();
};

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
    });
};

const MATCHED_WORKSPACES_ID = 'matched-client-workspaces';

type ManagerPortfolioProperty = {
    id: string;
    title: string;
    city?: string;
    postcode?: string;
    price?: number;
    listing_type?: string;
    image_urls?: string;
};

const BrokerResponseWidget: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [requests, setRequests] = useState<BrokerRequest[]>([]);
    const [matchedRequests, setMatchedRequests] = useState<BrokerRequestRecord[]>([]);
    const [managerProperties, setManagerProperties] = useState<ManagerPortfolioProperty[]>([]);
    const [shareSelections, setShareSelections] = useState<Record<string, string[]>>({});
    const [shareSavingRequestId, setShareSavingRequestId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableForFastResponse, setAvailableForFastResponse] = useState(false);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityBlockedReason, setAvailabilityBlockedReason] = useState<string | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    const fetchRequests = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const [leadsResult, offersResult, availabilityResult, propertiesResult] = await Promise.all([
                getBrokerLeads(),
                getBrokerRequestOffers(),
                getBrokerAvailability(),
                getUserProperties({
                    limit: 40,
                    status: ['published', 'active', 'online'],
                }),
            ]);

            const mappedLeads = (leadsResult.data || []).map((lead) => ({
                id: lead.id,
                requestKind: 'lead' as const,
                propertyName: lead.property?.title || lead.propertyInterested || lead.property_name || 'Unknown Property',
                brokerName: lead.name || lead.email || 'Interested client',
                distance: lead.property?.city || lead.property?.postcode || 'UK',
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
            }));

            const mappedOffers = (offersResult.data || []).map((offer) => ({
                id: offer.id,
                requestKind: 'offer' as const,
                propertyName: `${(offer.request_type || 'broker').replace(/\b\w/g, (character) => character.toUpperCase())} request${offer.location ? ` - ${offer.location}` : ''}`,
                brokerName: offer.requester_name || offer.requester_email || 'Marketplace client',
                distance: offer.location_postcode || offer.location || 'UK',
                timestamp: new Date(offer.created_at || offer.dispatch_started_at || new Date().toISOString()),
                status: offer.dispatch_status === 'broker_matched'
                    ? 'responded' as const
                    : offer.dispatch_status === 'expired' || offer.status === 'expired' || offer.dispatch_status === 'unavailable'
                        ? 'expired' as const
                        : 'pending' as const,
                secondsRemaining: secondsUntilDeadline(offer.response_deadline_at),
                stageLabel: formatOfferSummary(offer.dispatch_status, offer.matched_broker?.name || null),
                dispatchStatus: offer.dispatch_status,
                primaryActionLabel: 'Accept Offer',
                secondaryActionLabel: offer.dispatch_status === 'broker_matched' ? 'Open matched workspace' : 'Open leads',
                statusReason: offer.status_reason,
                nextAction: offer.dispatch_status === 'broker_matched'
                    ? 'Open matched workspace'
                    : offer.next_action,
            }));

            const merged = [...mappedOffers, ...mappedLeads]
                .sort((left, right) => {
                    if (left.status === 'pending' && right.status !== 'pending') return -1;
                    if (left.status !== 'pending' && right.status === 'pending') return 1;

                    const leftSeconds = typeof left.secondsRemaining === 'number' ? left.secondsRemaining : Number.MAX_SAFE_INTEGER;
                    const rightSeconds = typeof right.secondsRemaining === 'number' ? right.secondsRemaining : Number.MAX_SAFE_INTEGER;
                    if (leftSeconds !== rightSeconds) {
                        return leftSeconds - rightSeconds;
                    }

                    return right.timestamp.getTime() - left.timestamp.getTime();
                });

            setRequests(merged.slice(0, 4));
            setMatchedRequests(sortBrokerRequestsByPriority((offersResult.data || []).filter((offer) => (
                (offer.dispatch_status === 'broker_matched' || offer.status === 'matched')
                && Boolean(offer.matched_broker_id)
            ))));
            setManagerProperties((propertiesResult.data || []).map((property: any) => ({
                id: property.id,
                title: property.title,
                city: property.city,
                postcode: property.postcode,
                price: property.price,
                listing_type: property.listing_type,
                image_urls: Array.isArray(property.images) && typeof property.images[0] === 'string'
                    ? JSON.stringify(property.images)
                    : property.image_urls,
            })));
            setAvailableForFastResponse(Boolean(availabilityResult.data?.available_for_fast_response));
            setAvailabilityBlockedReason(availabilityResult.data?.blocked_reason || null);
        } catch (error) {
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            void fetchRequests(true);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [fetchRequests]);

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
                await fetchRequests(true);
            }
        } catch (error) {
        }
    };

    const handleSecondaryAction = (id: string) => {
        const selectedRequest = requests.find((request) => request.id === id);
        if (selectedRequest?.requestKind === 'offer' && selectedRequest.dispatchStatus === 'broker_matched') {
            document.getElementById(MATCHED_WORKSPACES_ID)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            return;
        }

        navigate('/manager/leads');
    };

    const togglePropertySelection = (requestId: string, propertyId: string) => {
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

            toast.success('Property shortlist shared with the matched client.');
            await fetchRequests(true);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to share the shortlist right now.');
        } finally {
            setShareSavingRequestId(null);
        }
    };

    const toggleAvailability = async () => {
        if (availabilityBlockedReason && !availableForFastResponse) {
            navigate('/manager/verification');
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError(null);

        const nextAvailability = !availableForFastResponse;
        const response = await updateBrokerAvailability(nextAvailability);

        setAvailabilityLoading(false);

        if (response.error) {
            setAvailabilityError(response.error);
            await fetchRequests(true);
            return;
        }

        if (response.data) {
            setAvailableForFastResponse(response.data.available_for_fast_response);
            setAvailabilityBlockedReason(response.data.blocked_reason || null);
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

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-6 ring-2 ring-blue-500/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg animate-pulse">
                        <BellRing className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="section-heading text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-500">Live</span> Response Tracker
                            {pendingCount > 0 && (
                                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                                    {pendingCount} URGENT
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Real-time emergency assistance requests</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
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
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                    {availabilityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {availabilityBlockedReason
                        ? 'Open verification'
                        : availableForFastResponse
                            ? 'Pause live queue'
                            : 'Go live'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full py-8 text-center text-gray-400">Loading requests...</div>
                ) : requests.length > 0 ? (
                    requests.map((request) => (
                        <BrokerRequestItem
                            key={request.id}
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
                            <h4 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">Share your ranked property shortlist</h4>
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
                        {matchedRequests.map((request) => {
                            const selectedIds = shareSelections[request.id] || [];
                            const sharedCount = request.property_shares?.length || 0;
                            const selectedProperty = request.selected_property;
                            const isSaving = shareSavingRequestId === request.id;

                            return (
                                <div
                                    key={request.id}
                                    className="rounded-3xl border border-white bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-black"
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
                                            </div>
                                            <h5 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                                                {request.requester_name || request.requester_email || 'Matched client'}
                                            </h5>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                                                <span>Workspace {formatWorkspaceReference(request.id)}</span>
                                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                                <span>Started {formatWorkspaceStartedAt(request.created_at || request.updated_at)}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                {request.location || 'Location shared in request'}
                                                {request.location_postcode ? ` - ${request.location_postcode}` : ''}
                                            </p>
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
                                                {request.location_postcode || request.location || 'UK'}
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
                                                    <h6 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{selectedProperty.title}</h6>
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        {[selectedProperty.address_line_1, selectedProperty.city, selectedProperty.postcode].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatPropertyPrice(selectedProperty.price)}
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => navigate('/manager/leads')}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                                                        >
                                                            Open lead workflow
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
                                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                                        {managerProperties.map((property) => {
                                                            const isSelected = selectedIds.includes(property.id);

                                                            return (
                                                                <button
                                                                    key={`${request.id}-${property.id}`}
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
                                                                                        {[property.city, property.postcode].filter(Boolean).join(', ') || 'Location unavailable'}
                                                                                    </p>
                                                                                </div>
                                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                                    {formatPropertyPrice(property.price)}
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
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
