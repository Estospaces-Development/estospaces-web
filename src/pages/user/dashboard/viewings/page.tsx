"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    Plus,
    Loader2,
    ArrowLeft,
    Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notifyViewingCancelled } from '@/services/notificationsService';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import FastTrackCompanionPanel from '@/components/fast-track/FastTrackCompanionPanel';
import UserActivitySubnav from '@/components/layout/UserActivitySubnav';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { resolveFocusedViewing } from '@/lib/workspaceLinks';
import { findLinkedFastTrackCase } from '@/lib/fastTrackCompanion';
import {
    usePublishWorkspaceSync,
    useWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { formatLaunchCurrency } from '@/lib/launchLocale';

// Services
import { bookingsService } from '@/services/bookingsService';

export const MAX_VIEWING_CANCELLATION_REASON_LENGTH = 500;

export function normalizeViewingCancellationReason(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function validateViewingCancellationReason(value: string) {
    const normalizedReason = normalizeViewingCancellationReason(value);
    if (!normalizedReason) {
        return 'Enter a cancellation reason.';
    }
    if (normalizedReason.length > MAX_VIEWING_CANCELLATION_REASON_LENGTH) {
        return 'Keep the cancellation reason to 500 characters or fewer.';
    }
    return null;
}

export default function ViewingsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [viewings, setViewings] = useState<any[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [viewingToCancel, setViewingToCancel] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
    const [cancellingViewingID, setCancellingViewingID] = useState<string | null>(null);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const cancelInFlightRef = useRef(false);

    const filterOptions = [
        { value: 'all', label: 'All' },
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This Week' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'pending', label: 'Awaiting Reply' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const fetchViewings = useCallback(async (options: { silent?: boolean } = {}) => {
        const silent = Boolean(options.silent);
        if (!silent) {
            setLoading(true);
            setLoadError(null);
        }
        try {
            const [data, fastTrackCasesResult] = await Promise.all([
                bookingsService.getViewings({ suppressErrorToast: true }),
                getFastTrackCases({ suppressErrorToast: true }),
            ]);
            const mappedViewings = data.map((viewing: any) => ({
                ...viewing,
                date: viewing.scheduled_at,
                time: viewing.scheduled_at ? new Date(viewing.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                propertyImage: viewing.property_image || PROPERTY_PLACEHOLDER_IMAGE,
                propertyTitle: viewing.property_title || 'Property',
                propertyAddress: viewing.property_address || 'Address not available',
                propertyPrice: viewing.property_price || 0,
                listingType: viewing.listing_type || 'sale',
                agentName: viewing.agent_name || 'Agent',
                agentPhone: viewing.agent_phone || '',
            }));
            setViewings(mappedViewings);
            setFastTrackCases(fastTrackCasesResult.data || []);
            setLoadError(null);
        } catch (err: any) {
            if (!silent) {
                setViewings([]);
                setFastTrackCases([]);
                setLoadError('Your viewing schedule is temporarily unavailable. Please try again.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchViewings();
    }, [fetchViewings]);

    useWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
        refresh: () => fetchViewings({ silent: true }),
        refreshOnFocus: true,
        refreshOnVisible: true,
    });

    const rawCaseId = searchParams.get('case');
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );

    useEffect(() => {
        if (loading || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [loading, removedCaseId, setSearchParams, toast]);

    const focusedCase = useMemo(
        () => (sanitizedCaseId
            ? fastTrackCases.find((caseItem) => caseItem.caseId === sanitizedCaseId) || null
            : null),
        [fastTrackCases, sanitizedCaseId],
    );

    const focusedViewingId = resolveFocusedViewing(viewings, {
        viewingId: searchParams.get('viewing'),
        applicationId: searchParams.get('application'),
        caseId: sanitizedCaseId,
        leadId: searchParams.get('lead') || focusedCase?.leadId || null,
        propertyId: searchParams.get('property') || focusedCase?.propertyId || null,
    })?.id || null;
    const focusedViewing = useMemo(
        () => viewings.find((viewing) => viewing.id === focusedViewingId) || null,
        [focusedViewingId, viewings],
    );

    const filteredViewings = [...viewings]
        .filter(viewing => {
            const viewingDate = new Date(viewing.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const matchesSearch = !searchQuery.trim() || [
                viewing.propertyTitle,
                viewing.propertyAddress,
                viewing.agentName,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(searchQuery.trim().toLowerCase()));

            if (!matchesSearch) {
                return false;
            }

            if (!viewing.date) {
                return filter === 'all';
            }

            switch (filter) {
                case 'today':
                    return viewingDate >= today && viewingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) && viewing.status !== 'cancelled';
                case 'this_week':
                    return viewingDate >= today && viewingDate < weekEnd && viewing.status !== 'cancelled';
                case 'upcoming':
                    return viewingDate >= today && viewing.status !== 'cancelled';
                case 'pending':
                    return viewing.status === 'pending' || viewing.status === 'rescheduled';
                case 'completed':
                    return viewing.status === 'completed' || viewingDate < today;
                case 'cancelled':
                    return viewing.status === 'cancelled';
                default:
                    return true;
            }
        })
        .sort((left, right) => {
            if (!focusedViewingId) {
                return 0;
            }
            if (left.id === focusedViewingId) {
                return -1;
            }
            if (right.id === focusedViewingId) {
                return 1;
            }
            return 0;
        });
    const companionFastTrackCase = useMemo(() => (
        focusedCase
        || findLinkedFastTrackCase(fastTrackCases, {
            caseId: sanitizedCaseId,
            viewingId: focusedViewingId || undefined,
            applicationId: searchParams.get('application'),
            leadId: searchParams.get('lead') || focusedViewing?.lead_id || null,
            propertyId: searchParams.get('property') || focusedViewing?.property_id || null,
        })
        || findLinkedFastTrackCase(fastTrackCases, {
            viewingId: filteredViewings[0]?.id,
            applicationId: filteredViewings[0]?.application_id,
            caseId: filteredViewings[0]?.fast_track_case_id,
            leadId: filteredViewings[0]?.lead_id,
            propertyId: filteredViewings[0]?.property_id,
        })
    ), [fastTrackCases, filteredViewings, focusedCase, focusedViewing, focusedViewingId, sanitizedCaseId, searchParams]);

    const closeCancelModal = () => {
        if (cancelInFlightRef.current) {
            return;
        }
        setCancelModalOpen(false);
        setViewingToCancel(null);
        setCancelReason('');
        setCancelReasonError(null);
    };

    const openCancelModal = (viewingId: string) => {
        setViewingToCancel(viewingId);
        setCancelReason('');
        setCancelReasonError(null);
        setCancelModalOpen(true);
    };

    const handleCancelViewing = async (viewingId: string) => {
        if (!user?.id) {
            toast.error('You must be logged in to cancel a viewing.');
            return;
        }
        if (cancelInFlightRef.current) {
            return;
        }

        const validationError = validateViewingCancellationReason(cancelReason);
        setCancelReasonError(validationError);
        if (validationError) {
            toast.error('Please enter a valid cancellation reason.');
            return;
        }

        const normalizedReason = normalizeViewingCancellationReason(cancelReason);
        cancelInFlightRef.current = true;
        setCancellingViewingID(viewingId);

        try {
            await bookingsService.cancelViewing(viewingId, normalizedReason);

            setViewings(prev => prev.map(v =>
                v.id === viewingId ? { ...v, status: 'cancelled', cancellation_reason: normalizedReason } : v
            ));

            const viewing = viewings.find(v => v.id === viewingId);
            if (viewing) {
                await notifyViewingCancelled(
                    user.id,
                    viewing.propertyTitle,
                    viewing.property_id,
                    viewing.date,
                    normalizedReason
                );
            }
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.VIEWINGS,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                ],
                reason: 'User cancelled viewing',
                ids: {
                    viewingId,
                    applicationId: viewing?.application_id,
                    caseId: viewing?.fast_track_case_id,
                    leadId: viewing?.lead_id,
                    propertyId: viewing?.property_id,
                },
            });
            toast.success('Viewing appointment cancelled successfully.');
            setCancelModalOpen(false);
            setViewingToCancel(null);
            setCancelReason('');
            setCancelReasonError(null);
        } catch (err) {
            toast.error('Failed to cancel viewing. Please try again.');
        } finally {
            cancelInFlightRef.current = false;
            setCancellingViewingID(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: any = {
            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
            confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Confirmed' },
            cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Cancelled' },
            completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'Completed' },
            rescheduled: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', label: 'Rescheduled' },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Viewings</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Keep track of upcoming visits, replies, and any schedule changes in one place.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/user/dashboard/discover')}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            Book New Viewing
                        </button>
                    </div>
                </div>

                <UserActivitySubnav />

                {/* Filters */}
                <div className="mb-8 rounded-[1.75rem] border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full max-w-md">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                size={16}
                            />
                            <input
                                type="text"
                                aria-label="Search viewings"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search by home, area, or agent"
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition-all focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100 dark:focus:bg-gray-900"
                            />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Showing {filteredViewings.length} of {viewings.length} appointments
                        </p>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
                                    filter === option.value
                                        ? 'bg-orange-500 text-white shadow-[0_14px_28px_-16px_rgba(249,115,22,0.85)]'
                                        : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-gray-900 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                        <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium tracking-wide">Fetching your appointments...</p>
                    </div>
                ) : loadError ? (
                    <div className="rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm dark:border-red-900/40 dark:bg-gray-800">
                        <div className="mx-auto mb-6 inline-flex items-center justify-center rounded-full bg-red-50 p-5 dark:bg-red-900/20">
                            <Calendar className="text-red-400" size={42} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Unable to load your viewings</h3>
                        <p className="mx-auto mt-2 max-w-md text-gray-500 dark:text-gray-400">
                            {loadError}
                        </p>
                        <button
                            onClick={() => void fetchViewings()}
                            className="mt-8 rounded-xl bg-orange-500 px-8 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredViewings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {companionFastTrackCase && (
                            <FastTrackCompanionPanel
                                role="user"
                                fastTrackCase={companionFastTrackCase}
                                context={{
                                    caseId: sanitizedCaseId || companionFastTrackCase.caseId,
                                    viewingId: focusedViewingId || filteredViewings[0]?.id,
                                    applicationId: searchParams.get('application') || filteredViewings[0]?.application_id,
                                    leadId: searchParams.get('lead') || companionFastTrackCase.leadId,
                                    propertyId: searchParams.get('property') || companionFastTrackCase.propertyId,
                                }}
                                title="Your viewing journey"
                                onCaseUpdated={(nextCase) => {
                                    setFastTrackCases((previous) => previous.map((caseItem) => (
                                        caseItem.caseId === nextCase.caseId ? nextCase : caseItem
                                    )));
                                }}
                                onRefresh={fetchViewings}
                            />
                        )}
                        {focusedViewingId && (
                            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                                Your active viewing is pinned first so you can keep this journey moving without searching for it again.
                            </div>
                        )}
                        {filteredViewings.map((viewing) => (
                            <div
                                key={viewing.id}
                                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 ${
                                    viewing.id === focusedViewingId
                                        ? 'ring-2 ring-orange-300 dark:ring-orange-700'
                                        : ''
                                }`}
                            >
                                <div className="flex flex-col md:flex-row">
                                    {/* Property Image */}
                                    <div className="md:w-64 h-48 md:h-auto relative overflow-hidden">
                                        <img
                                            src={viewing.propertyImage}
                                            alt={viewing.propertyTitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(event) => {
                                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                            }}
                                        />
                                        <div className="absolute top-4 left-4">
                                            {getStatusBadge(viewing.status)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">
                                                    {viewing.propertyTitle}
                                                </h3>
                                                {viewing.propertyPrice && (
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {formatLaunchCurrency(viewing.propertyPrice)}
                                                        <span className="text-sm text-gray-500 font-normal">{viewing.listingType === 'rent' ? '/mo' : ''}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                                                <MapPin size={16} className="text-orange-500" />
                                                <span className="line-clamp-1">{viewing.propertyAddress}</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                    <Calendar size={20} className="text-orange-500" />
                                                    <div>
                                                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Date</span>
                                                        <span className="font-bold text-gray-700 dark:text-white">{formatDate(viewing.date)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                    <Clock size={20} className="text-orange-500" />
                                                    <div>
                                                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Time</span>
                                                        <span className="font-bold text-gray-700 dark:text-white">{formatTime(viewing.time)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {(viewing.user_notes || viewing.manager_notes || viewing.cancellation_reason) && (
                                                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
                                                    {viewing.user_notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            <span className="font-bold text-gray-900 dark:text-white">Your note:</span> {viewing.user_notes}
                                                        </p>
                                                    )}
                                                    {viewing.manager_notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            <span className="font-bold text-gray-900 dark:text-white">Manager note:</span> {viewing.manager_notes}
                                                        </p>
                                                    )}
                                                    {viewing.cancellation_reason && (
                                                        <p className="text-sm text-red-600 dark:text-red-300">
                                                            <span className="font-bold">Cancellation reason:</span> {viewing.cancellation_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    userId={viewing.manager_id}
                                                    name={viewing.agentName}
                                                    size="md"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{viewing.agentName}</p>
                                                    <p className="text-xs text-gray-500">{viewing.agentPhone}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 w-full sm:w-auto">
                                                {viewing.workflow_locked && (
                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                                        {viewing.workflow_lock_reason || 'This appointment is locked because the linked workflow has already progressed.'}
                                                    </div>
                                                )}
                                                <div className="flex gap-3 w-full sm:w-auto">
                                                <button
                                                    onClick={() => navigate(`/user/properties/${viewing.property_id}`)}
                                                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    View Listing
                                                </button>
                                                {(viewing.status === 'pending' || viewing.status === 'confirmed') && !viewing.workflow_locked && (
                                                    <button
                                                        onClick={() => openCancelModal(viewing.id)}
                                                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        Cancel Appointment
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                        <div className="inline-flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                            <Calendar className="text-gray-300" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nothing to see here</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            {searchQuery
                                ? `No appointments matched "${searchQuery}".`
                                : `You do not have any ${filter === 'all' ? '' : `${filterOptions.find((option) => option.value === filter)?.label.toLowerCase()} `}viewings scheduled yet. Start exploring properties to book your first appointment.`}
                        </p>
                        <button
                            onClick={() => navigate('/user/dashboard/discover')}
                            className="mt-8 px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                        >
                            Find Properties
                        </button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={cancelModalOpen}
                onClose={closeCancelModal}
                title="Cancel Viewing Appointment"
                size="md"
                closeOnBackdrop={!cancellingViewingID}
                footer={(
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeCancelModal}
                            disabled={Boolean(cancellingViewingID)}
                            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            No, Keep It
                        </button>
                        <button
                            type="button"
                            onClick={() => viewingToCancel && handleCancelViewing(viewingToCancel)}
                            disabled={Boolean(cancellingViewingID)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {cancellingViewingID && <Loader2 size={16} className="animate-spin" />}
                            Yes, Cancel
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This action cannot be undone. Add a short reason so the manager can see why the appointment changed.
                    </p>
                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Cancellation reason</span>
                        <textarea
                            rows={4}
                            value={cancelReason}
                            onChange={(event) => {
                                setCancelReason(event.target.value);
                                if (cancelReasonError) {
                                    setCancelReasonError(null);
                                }
                            }}
                            aria-describedby={cancelReasonError ? 'viewing-cancel-reason-error' : 'viewing-cancel-reason-help'}
                            disabled={Boolean(cancellingViewingID)}
                            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-900"
                            placeholder="Example: Schedule changed and I need to book a later slot."
                        />
                        {cancelReasonError ? (
                            <p id="viewing-cancel-reason-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {cancelReasonError}
                            </p>
                        ) : (
                            <p id="viewing-cancel-reason-help" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {normalizeViewingCancellationReason(cancelReason).length}/{MAX_VIEWING_CANCELLATION_REASON_LENGTH}
                            </p>
                        )}
                    </label>
                </div>
            </Modal>
        </div>
    );
}
