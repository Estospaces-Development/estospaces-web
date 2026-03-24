"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MoreHorizontal, Info, BellRing, Loader2, Timer, Zap } from 'lucide-react';
import BrokerRequestItem, { BrokerRequest } from './BrokerRequestItem';
import {
    acceptBrokerRequestOffer,
    getBrokerAvailability,
    getBrokerLeads,
    getBrokerRequestOffers,
    respondToLead,
    updateBrokerAvailability,
} from '@/services/leadsService';
import { formatLeadStage, resolveLeadStage } from '@/lib/fastTrackWorkflow';

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

const BrokerResponseWidget: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<BrokerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [availabilitySeconds, setAvailabilitySeconds] = useState(0);
    const [availableForFastResponse, setAvailableForFastResponse] = useState(false);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityBlockedReason, setAvailabilityBlockedReason] = useState<string | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    const fetchRequests = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const [leadsResult, offersResult, availabilityResult] = await Promise.all([
                getBrokerLeads(),
                getBrokerRequestOffers(),
                getBrokerAvailability(),
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
                secondaryActionLabel: 'Open leads',
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
            setAvailableForFastResponse(Boolean(availabilityResult.data?.available_for_fast_response));
            setAvailabilitySeconds(availabilityResult.data?.seconds_remaining || 0);
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
        if (!availableForFastResponse || availabilitySeconds <= 0) {
            return;
        }

        const timer = window.setInterval(() => {
            setAvailabilitySeconds((previous) => {
                if (previous <= 1) {
                    setAvailableForFastResponse(false);
                    return 0;
                }
                return previous - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [availabilitySeconds, availableForFastResponse]);

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
            setAvailabilitySeconds(response.data.seconds_remaining || 0);
            setAvailabilityBlockedReason(response.data.blocked_reason || null);
        }
    };

    const formatCountdown = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return `${minutes}:${remainder.toString().padStart(2, '0')}`;
    };

    const pendingCount = requests.filter((request) => request.status === 'pending').length;

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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Availability session</p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Timer className="h-4 w-4 text-orange-500" />
                        <span>
                            {availabilityBlockedReason
                                ? 'Live dispatch unavailable'
                                : availableForFastResponse
                                    ? `Available for 10-minute response - ${formatCountdown(availabilitySeconds)}`
                                    : 'Offline for the rapid-response queue'}
                        </span>
                    </div>
                    {availabilityBlockedReason && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                            {availabilityBlockedReason}
                        </p>
                    )}
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
                            ? 'Stop availability'
                            : 'Available for 10 min'}
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
                            onSecondaryAction={() => navigate('/manager/leads')}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center text-gray-400">No active requests.</div>
                )}
            </div>

            <div className="mt-6 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    <span>USP: 10-minute broker response SLA and live availability session are active.</span>
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
