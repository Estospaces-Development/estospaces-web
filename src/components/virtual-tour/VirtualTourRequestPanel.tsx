"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    MapPinned,
    Send,
    Video,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
    fulfillVirtualTourRequest,
    getManagerVirtualTourRequests,
    getVirtualTourByPropertyId,
    type FulfillVirtualTourInput,
    type PropertyVirtualTourState,
} from '@/services/virtualTourService';
import type { VirtualTourRequest } from '@/services/propertyService';

interface VirtualTourRequestPanelProps {
    propertyId: string;
    propertyTitle: string;
    adminView?: boolean;
    onTourReady?: (tourUrl: string) => void;
}

const statusCopy = {
    unavailable: {
        title: 'No live virtual tour request',
        description: 'No customer has requested a walkthrough for this property yet.',
        badge: 'Unavailable',
    },
    requested: {
        title: 'Tour requested',
        description: 'A user has asked for a guided or recorded virtual tour for this property.',
        badge: 'Requested',
    },
    processing: {
        title: 'Tour in progress',
        description: 'The request is being handled. Add the final tour link when it is ready.',
        badge: 'Processing',
    },
    ready: {
        title: 'Tour ready',
        description: 'The property now has a live virtual-tour link for users.',
        badge: 'Ready',
    },
} as const;

export default function VirtualTourRequestPanel({
    propertyId,
    propertyTitle,
    adminView = false,
    onTourReady,
}: VirtualTourRequestPanelProps) {
    const toast = useToast();
    const [tourState, setTourState] = useState<PropertyVirtualTourState | null>(null);
    const [propertyRequests, setPropertyRequests] = useState<VirtualTourRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [fulfillmentNote, setFulfillmentNote] = useState('');
    const [tourUrl, setTourUrl] = useState('');

    const loadState = useCallback(async () => {
        setLoading(true);
        const [propertyResult, requestsResult] = await Promise.all([
            getVirtualTourByPropertyId(propertyId, adminView),
            getManagerVirtualTourRequests(),
        ]);

        if (propertyResult.error || !propertyResult.data) {
            toast.error(propertyResult.error || 'Unable to load virtual tour details.');
            setLoading(false);
            return;
        }

        const requestsForProperty = requestsResult.data
            .filter((request) => request.property_id === propertyId)
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
        const latestRequest = requestsForProperty[0] || null;

        const nextState: PropertyVirtualTourState = {
            ...propertyResult.data,
            active_request: latestRequest || propertyResult.data.active_request || null,
            status: propertyResult.data.virtual_tour_url
                ? 'ready'
                : latestRequest?.status || propertyResult.data.status,
            virtual_tour_url: propertyResult.data.virtual_tour_url || latestRequest?.virtual_tour_url,
        };

        setTourState(nextState);
        setPropertyRequests(requestsForProperty);
        setFulfillmentNote(latestRequest?.fulfillment_note || '');
        setTourUrl(propertyResult.data.virtual_tour_url || latestRequest?.virtual_tour_url || '');
        setLoading(false);
    }, [adminView, propertyId, toast]);

    useEffect(() => {
        void loadState();
    }, [loadState]);

    const activeRequest = tourState?.active_request || null;
    const currentStatus = tourState?.status || 'unavailable';
    const copy = statusCopy[currentStatus];

    const handleUpdate = async (input: FulfillVirtualTourInput) => {
        if (!activeRequest) {
            toast.error('There is no pending request to update yet.');
            return;
        }

        setActionLoading(true);
        const { error } = await fulfillVirtualTourRequest(activeRequest.id, input);
        if (error) {
            toast.error(error);
            setActionLoading(false);
            return;
        }

        toast.success(
            input.status === 'ready'
                ? 'Virtual tour marked ready.'
                : 'Virtual tour request moved into processing.',
        );
        if (input.status === 'ready' && input.virtual_tour_url) {
            onTourReady?.(input.virtual_tour_url);
        }
        await loadState();
        setActionLoading(false);
    };

    const requestMetadata = useMemo(() => {
        if (!activeRequest) {
            return [];
        }

        return [
            {
                label: 'Requested on',
                value: new Date(activeRequest.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            },
            {
                label: 'Requester',
                value: activeRequest.requested_by,
            },
            {
                label: 'Status',
                value: activeRequest.status.replace(/_/g, ' '),
            },
            {
                label: 'Request note',
                value: activeRequest.request_note || 'No extra request note provided.',
            },
        ];
    }, [activeRequest]);

    if (loading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <BrandLoader className="h-5 w-5 text-orange-500" />
                    Loading virtual tour workflow...
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-50 p-3 text-orange-500 dark:bg-orange-950/30 dark:text-orange-300">
                            <Video className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
                                Virtual Tour Workflow
                            </p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{propertyTitle}</h3>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
                            {copy.badge}
                        </span>
                        <h4 className="text-lg font-black text-gray-900 dark:text-white">{copy.title}</h4>
                        <p className="max-w-2xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                            {copy.description}
                        </p>
                    </div>
                </div>

                {tourState?.virtual_tour_url ? (
                    <button
                        type="button"
                        onClick={() => window.open(tourState.virtual_tour_url, '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 px-5 py-4 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-50 dark:border-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-950/30"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open live tour
                    </button>
                ) : null}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
                {requestMetadata.length > 0 ? requestMetadata.map((item) => (
                    <div key={item.label} className="rounded-2xl border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                )) : (
                    <div className="rounded-2xl border bg-gray-50 p-5 text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 md:col-span-3">
                        This property will show a live request here as soon as a user asks for a tour from the public side.
                    </div>
                )}
            </div>

            {propertyRequests.length > 0 ? (
                <div className="mt-6 rounded-2xl border bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                                Request queue
                            </h4>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                                {propertyRequests.length} request{propertyRequests.length === 1 ? '' : 's'} for this property.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {propertyRequests.slice(0, 5).map((request) => (
                            <div
                                key={request.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                            Request {request.id}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                            Requested by {request.requested_by}
                                        </p>
                                    </div>
                                    <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                                        {request.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {request.request_note || 'No request note provided.'}
                                </p>
                                {request.fulfillment_note ? (
                                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                        Fulfillment: {request.fulfillment_note}
                                    </p>
                                ) : null}
                                {request.virtual_tour_url ? (
                                    <a
                                        href={request.virtual_tour_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-300"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Open request tour link
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                        <MapPinned className="h-4 w-4 text-orange-500" />
                        Fulfillment Notes
                    </div>
                    <textarea
                        value={fulfillmentNote}
                        onChange={(event) => setFulfillmentNote(event.target.value)}
                        rows={5}
                        placeholder="Add what the user should know about the tour handoff."
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                </div>

                <div className="rounded-2xl border bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Final Tour Link
                    </div>
                    <input
                        type="url"
                        value={tourUrl}
                        onChange={(event) => setTourUrl(event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <p className="mt-3 text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">
                        Add a live walkthrough URL when the tour is ready. Until then you can move the request into processing.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    disabled={!activeRequest || actionLoading || currentStatus === 'ready'}
                    onClick={() => void handleUpdate({
                        status: 'processing',
                        fulfillment_note: fulfillmentNote.trim(),
                    })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-5 py-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    {actionLoading && currentStatus !== 'ready' ? (
                        <BrandLoader className="h-4 w-4" />
                    ) : (
                        <Clock3 className="h-4 w-4" />
                    )}
                    Mark processing
                </button>
                <button
                    type="button"
                    disabled={!activeRequest || actionLoading || tourUrl.trim() === ''}
                    onClick={() => void handleUpdate({
                        status: 'ready',
                        virtual_tour_url: tourUrl.trim(),
                        fulfillment_note: fulfillmentNote.trim(),
                    })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {actionLoading ? (
                        <BrandLoader className="h-4 w-4" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                    Mark ready
                </button>
            </div>
        </div>
    );
}
