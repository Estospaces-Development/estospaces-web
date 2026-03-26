"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Star, ChevronRight, Building2, Loader2, Clock, BadgeCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrokerRequestRecord, getNearbyAvailableBrokers, getUserBrokerRequests, LeadBrokerSummary } from '@/services/leadsService';
import {
    BROKER_REQUEST_WORKSPACE_EVENT,
    buildBrokerRequestWorkspacePath,
    readBrokerRequestWorkspaceSelection,
} from '@/lib/brokerRequestWorkspace';
import { selectPrimaryBrokerRequest } from '@/lib/brokerRequestSelection';

const NearbyAgenciesList = () => {
    const [searchParams] = useSearchParams();
    const [brokers, setBrokers] = useState<LeadBrokerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeRequest, setActiveRequest] = useState<BrokerRequestRecord | null>(null);
    const requestedWorkspaceRequestId = searchParams.get('workspace') === 'broker-request'
        ? searchParams.get('request')?.trim() || null
        : null;

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
        const fetchBrokers = async () => {
            setLoading(true);
            try {
                const { data, error } = await getNearbyAvailableBrokers({
                    postcode: activeRequest?.location_postcode,
                    fastTrack: true,
                    limit: 5,
                }, { suppressErrorToast: true });

                if (error) {
                    throw new Error(error);
                }

                setBrokers(data || []);
                setLoadError(null);
            } catch (err: any) {
                setLoadError(err.message || 'Nearby brokers are not available right now.');
            } finally {
                setLoading(false);
            }
        };

        void fetchBrokers();
    }, [activeRequest?.location_postcode]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Nearby available brokers</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ranked for 10-minute live dispatch</p>
                    </div>
                </div>
                <Link
                    to={buildBrokerRequestWorkspacePath(activeRequest?.id)}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
                >
                    Open broker workspace <ChevronRight size={14} />
                </Link>
            </div>

            {activeRequest && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm dark:border-blue-900/30 dark:bg-blue-950/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500 dark:text-blue-300">Live request</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                        {activeRequest.matched_broker?.name || 'Searching nearby brokers'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {activeRequest.dispatch_status
                            ? activeRequest.dispatch_status.replace(/[_-]+/g, ' ')
                            : 'Live dispatch in progress'}
                        {activeRequest.location_postcode ? ` • ${activeRequest.location_postcode}` : ''}
                    </p>
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
            ) : brokers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    {activeRequest?.location_postcode
                        ? 'Your live request is active. Ranked brokers will appear here as each dispatch wave opens.'
                        : 'Add a postcode or start a live broker request to see ranked brokers here.'}
                </div>
            ) : (
                <div className="space-y-4">
                    {brokers.map((broker, index) => (
                        <div key={broker.id} className="flex items-start gap-4 group">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
                                <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="truncate font-semibold text-sm text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                                        {broker.name}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                        <BadgeCheck size={11} />
                                        Available
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {broker.company_name || 'Independent broker'}
                                    {broker.postcode ? ` • ${broker.postcode}` : ''}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex items-center text-xs font-medium text-gray-900 dark:text-white">
                                        <Star size={12} className="text-yellow-400 fill-yellow-400 mr-0.5" />
                                        {typeof broker.rating === 'number' ? broker.rating.toFixed(1) : 'N/A'}
                                        <span className="text-gray-400 dark:text-gray-500 font-normal ml-0.5">
                                            ({broker.review_count || 0})
                                        </span>
                                    </div>
                                    <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                        <Clock size={10} className="mr-0.5" />
                                        10-minute availability
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <MapPin size={10} className="mr-0.5" />
                                    {broker.service_areas?.length ? broker.service_areas.join(', ') : 'Service area not listed'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="w-full mt-6 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium">
                Find broker by postcode
            </button>
        </div>
    );
};

export default NearbyAgenciesList;
