"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Building2,
    CheckCircle2,
    Clock,
    MapPin,
    MessageSquare,
    Phone,
    Radio,
    Send,
    Timer,
    UserCheck,
} from 'lucide-react';
import {
    BrokerRequestRecord,
    createBrokerRequest,
    getBrokerRequestById,
    getNearbyAvailableBrokers,
    getUserBrokerRequests,
    LeadBrokerSummary,
} from '@/services/leadsService';
import {
    formatRequestTypeLabel,
    getDispatchWorkspaceSummary,
    getMatchedExperienceSteps,
} from '@/lib/brokerDispatchPresentation';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';

const secondsUntilDeadline = (deadline?: string) => {
    if (!deadline) {
        return 0;
    }

    return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
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

const BrokerRequestWidget = () => {
    const navigate = useNavigate();
    const [requestType, setRequestType] = useState('buy');
    const [details, setDetails] = useState('');
    const [location, setLocation] = useState('');
    const [locationPostcode, setLocationPostcode] = useState('');
    const [budget, setBudget] = useState('');
    const [fastTrackEnabled, setFastTrackEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nearbyBrokers, setNearbyBrokers] = useState<LeadBrokerSummary[]>([]);
    const [isRankingLoading, setIsRankingLoading] = useState(false);
    const [activeRequest, setActiveRequest] = useState<BrokerRequestRecord | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadActiveRequest = async () => {
            const { data } = await getUserBrokerRequests();
            if (cancelled || !data || data.length === 0) {
                return;
            }

            const latestRequest = data.find((request) => request.status !== 'expired' && request.status !== 'matched') || data[0];
            setActiveRequest(latestRequest);
            setRequestType(latestRequest.request_type || 'buy');
            setLocationPostcode(latestRequest.location_postcode || '');
            setLocation(latestRequest.location || '');
            setBudget(latestRequest.budget || '');
            setDetails(latestRequest.details || '');
            setFastTrackEnabled(latestRequest.fast_track_enabled !== false);
        };

        void loadActiveRequest();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const trimmedPostcode = locationPostcode.trim();
        if (!trimmedPostcode) {
            setNearbyBrokers([]);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setIsRankingLoading(true);
            try {
                const { data } = await getNearbyAvailableBrokers({
                    postcode: trimmedPostcode,
                    fastTrack: fastTrackEnabled,
                    limit: 5,
                });

                if (!cancelled) {
                    setNearbyBrokers(data || []);
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
    }, [fastTrackEnabled, locationPostcode]);

    useEffect(() => {
        if (!activeRequest?.id) {
            return;
        }

        const isTerminal = activeRequest.status === 'expired' || activeRequest.status === 'matched' || activeRequest.dispatch_status === 'broker_matched';
        if (isTerminal) {
            return;
        }

        const interval = window.setInterval(async () => {
            const { data } = await getBrokerRequestById(activeRequest.id);
            if (data) {
                setActiveRequest(data);
            }
        }, 5000);

        return () => window.clearInterval(interval);
    }, [activeRequest?.dispatch_status, activeRequest?.id, activeRequest?.status]);

    const refreshActiveRequest = async () => {
        if (!activeRequest?.id) {
            return;
        }

        const { data } = await getBrokerRequestById(activeRequest.id);
        if (data) {
            setActiveRequest(data);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const requestIsActive = Boolean(
            activeRequest &&
            activeRequest.dispatch_status !== 'broker_matched' &&
            activeRequest.dispatch_status !== 'expired' &&
            activeRequest.status !== 'matched' &&
            activeRequest.status !== 'expired',
        );

        if (requestIsActive) {
            await refreshActiveRequest();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { success, data, error: requestError } = await createBrokerRequest({
                requestType,
                location,
                locationPostcode,
                budget,
                details,
                fastTrackEnabled,
            });

            if (!success) {
                throw new Error(requestError || 'Failed to submit request');
            }

            if (data) {
                setActiveRequest(data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const activeRequestSeconds = secondsUntilDeadline(activeRequest?.response_deadline_at);
    const requestIsMatched = activeRequest?.dispatch_status === 'broker_matched' || activeRequest?.status === 'matched';
    const requestIsExpired = activeRequest?.dispatch_status === 'expired' || activeRequest?.status === 'expired';
    const requestIsActive = Boolean(activeRequest && !requestIsMatched && !requestIsExpired);
    const dispatchWorkspaceSummary = getDispatchWorkspaceSummary(activeRequest);
    const matchedBroker = activeRequest?.matched_broker || null;
    const matchedExperienceSteps = requestIsMatched && activeRequest ? getMatchedExperienceSteps(activeRequest) : [];
    const workspaceTone = requestIsMatched
        ? 'border-emerald-200 bg-white shadow-sm dark:border-emerald-900/40 dark:bg-gray-900'
        : requestIsExpired
            ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
            : 'border-orange-100 bg-orange-50/70 dark:border-orange-900/30 dark:bg-orange-950/20';

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                    <Send size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Request a Broker</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">10-minute live dispatch with nearby broker ranking</p>
                </div>
            </div>

            {activeRequest && (
                <div className={`mb-6 rounded-2xl border p-4 ${workspaceTone}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-300">Live dispatch workspace</p>
                            <h4 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                {dispatchWorkspaceSummary.title}
                            </h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                {dispatchWorkspaceSummary.subtitle}
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-orange-300">
                            <Timer size={13} />
                            {requestIsMatched ? 'Accepted' : requestIsExpired ? 'Closed' : formatCountdown(activeRequestSeconds)}
                        </div>
                    </div>

                    {requestIsMatched ? (
                        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/30 dark:bg-zinc-950 dark:text-emerald-300">
                                            <BadgeCheck size={12} />
                                            Broker locked in
                                        </span>
                                        <h5 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                            {matchedBroker?.name || 'Your broker is ready'}
                                        </h5>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.company_name || 'Independent broker'} is now handling your {formatRequestTypeLabel(activeRequest.request_type).toLowerCase()} request
                                            {activeRequest.location ? ` in ${activeRequest.location}` : ''}.
                                        </p>
                                    </div>
                                    <div className="min-w-[150px] rounded-2xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/30 dark:bg-zinc-950">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Accepted at</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatAcceptedAt(activeRequest.matched_at || activeRequest.updated_at || activeRequest.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <MapPin size={15} className="text-orange-500" />
                                            Requested area
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {activeRequest.location || 'Location shared in request'}
                                            {activeRequest.location_postcode ? ` - ${activeRequest.location_postcode}` : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Building2 size={15} className="text-orange-500" />
                                            Broker profile
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.company_name || 'Independent broker'}
                                            {typeof matchedBroker?.distance_miles === 'number' ? ` - ${matchedBroker.distance_miles.toFixed(1)} mi away` : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Phone size={15} className="text-orange-500" />
                                            Contact route
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {matchedBroker?.phone || matchedBroker?.email || 'Contact details will appear in your live workspace'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Clock size={15} className="text-orange-500" />
                                            Priority lane
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {activeRequest.fast_track_enabled
                                                ? 'Fast-track priority is reserved for the first property your broker shares and you choose.'
                                                : 'Standard live follow-up is active for this request.'}
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
                                            Call broker
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/user/dashboard/messages')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                    >
                                        <MessageSquare size={15} />
                                        Open messages
                                    </button>
                                    {activeRequest.fast_track_enabled && (
                                        <button
                                            type="button"
                                            onClick={() => navigate(buildBrokerRequestWorkspacePath(activeRequest.id))}
                                            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300 dark:hover:bg-orange-950/40"
                                        >
                                            Open broker workspace
                                            <ArrowRight size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-orange-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">What happens next</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">The matched broker stays linked here until a property is shared and selected.</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
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

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveRequest(null);
                                        setError(null);
                                    }}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    <Radio size={14} />
                                    Start another request
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Wave</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Wave {activeRequest.dispatch_wave || 1}</p>
                                </div>
                                <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Brokers pinged</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                        {activeRequest.dispatched_broker_count || 0} / {activeRequest.available_broker_count || nearbyBrokers.length || 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/40">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Matched broker</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                        {activeRequest.matched_broker?.name || (requestIsExpired ? 'No broker accepted in time' : 'Searching nearby brokers')}
                                    </p>
                                </div>
                            </div>

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
                                    {requestIsExpired ? 'Start another request' : 'Refresh status'}
                                </button>
                                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                    <UserCheck size={14} />
                                    {dispatchWorkspaceSummary.helper}
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
                            disabled={requestIsActive}
                            onClick={() => setRequestType(type)}
                            className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all ${
                                requestType === type
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50/70 p-3 text-sm text-gray-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-gray-200">
                    <input
                        type="checkbox"
                        checked={fastTrackEnabled}
                        disabled={requestIsActive}
                        onChange={(event) => setFastTrackEnabled(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>
                        <span className="block font-semibold text-gray-900 dark:text-white">Use 10-minute live dispatch</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Rank brokers who are currently available and closest to the area first.</span>
                    </span>
                </label>

                {requestIsActive && (
                    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-sm text-gray-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-gray-200">
                        A live request is already running. Refresh the workspace above while ranked brokers are being notified in waves.
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
                                disabled={requestIsActive}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Downtown, West End"
                                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900/50"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Postcode
                        </label>
                        <input
                            type="text"
                            value={locationPostcode}
                            disabled={requestIsActive}
                            onChange={(e) => setLocationPostcode(e.target.value.toUpperCase())}
                            placeholder="e.g. SW1A 1AA"
                            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm uppercase outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900/50"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Budget / Price Range
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">GBP</span>
                            <input
                                type="text"
                                value={budget}
                                disabled={requestIsActive}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="e.g. 500k - 600k"
                                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-12 pr-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900/50"
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
                            disabled={requestIsActive}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="e.g. 2 bedrooms, balcony, pet friendly..."
                            rows={3}
                            className="w-full resize-none rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900/50"
                            required
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Nearby brokers</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Ranked by location, availability, and live response readiness.</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-orange-300">
                            <Clock size={13} />
                            10-minute SLA
                        </div>
                    </div>
                    {isRankingLoading ? (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ranking nearby brokers...</div>
                    ) : nearbyBrokers.length > 0 ? (
                        <div className="mt-4 space-y-2">
                            {nearbyBrokers.map((broker, index) => (
                                <div key={broker.id} className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                            {index + 1}. {broker.name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {broker.company_name || 'Independent broker'}
                                            {typeof broker.distance_miles === 'number' ? ` - ${broker.distance_miles.toFixed(1)} mi` : ''}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                                        <BadgeCheck size={12} />
                                        {broker.fast_track_eligible ? 'Available' : 'Queued'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            Add a postcode to see available brokers ranked for live dispatch.
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/10 dark:text-red-400">
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
                        ? 'Dispatching...'
                        : requestIsActive
                            ? 'Refresh live dispatch'
                            : activeRequest
                                ? 'Start another live dispatch'
                                : 'Start live dispatch'}
                </button>

                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                    Your request will be sent to ranked brokers with a live 10-minute response window.
                </p>
            </form>
        </div>
    );
};

export default BrokerRequestWidget;
