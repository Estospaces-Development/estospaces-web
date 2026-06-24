"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    Bath,
    Bed,
    Building,
    Calendar,
    CheckCircle,
    Home,
    ImageOff,
    Loader2,
    Mail,
    MapPin,
    Maximize,
    Phone,
    Shield,
    Trash2,
    User,
    Video,
    XCircle,
} from 'lucide-react';
import {
    adminUpdatePropertyStatus,
    deleteProperty as deletePropertyRequest,
    getAdminPropertyById,
    Property,
} from '@/services/propertyService';
import { useToast } from '@/contexts/ToastContext';
import { formatPropertyStatusLabel, getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { getAdminPropertyDetailMedia } from '@/lib/adminPropertyDetailMedia';
import { formatLaunchCurrency } from '@/lib/launchLocale';

const parseStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
            }
        } catch {
            return trimmed
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    return [];
};

const formatPrice = (property: Property) => {
    if (typeof property.price !== 'number') {
        return 'Price on request';
    }

    return formatLaunchCurrency(property.price);
};

const formatDate = (value?: string) => {
    if (!value) {
        return 'Unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unavailable';
    }

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getPropertyVideos = (property: Property | null) => {
    if (!property) {
        return [];
    }

    return parseStringArray(property.video_urls);
};

const getAddressLine = (property: Property) => {
    return [
        property.address_line_1,
        property.address_line_2,
        property.city,
        property.postcode,
        property.country,
    ]
        .filter(Boolean)
        .join(', ');
};

export default function AdminPropertyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToast();
    const propertyId = id && id !== 'undefined' && id !== 'null' ? id.trim() : '';

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectReasonError, setRejectReasonError] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const mediaState = useMemo(() => getAdminPropertyDetailMedia(property), [property]);
    const imageUrls = mediaState.imageUrls;
    const videoUrls = useMemo(() => getPropertyVideos(property), [property]);
    const statusBadge = getManagerPropertyStatusBadge(property?.status);
    const amenities = useMemo(() => parseStringArray(property?.amenities), [property?.amenities]);
    const features = useMemo(() => parseStringArray(property?.features), [property?.features]);

    useEffect(() => {
        const loadProperty = async () => {
            if (!propertyId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await getAdminPropertyById(propertyId);
            if (error || !data) {
                showErrorToast(error || 'Failed to load property.');
                setProperty(null);
                setLoading(false);
                return;
            }

            setProperty(data);
            setLoading(false);
        };

        loadProperty();
    }, [propertyId, showErrorToast]);

    const refreshProperty = async () => {
        if (!propertyId) {
            return;
        }

        const { data, error } = await getAdminPropertyById(propertyId);
        if (error || !data) {
            throw new Error(error || 'Failed to refresh property.');
        }
        setProperty(data);
    };

    const closeRejectDialog = () => {
        setShowRejectDialog(false);
        setRejectReason('');
        setRejectReasonError('');
    };

    const openRejectDialog = () => {
        setShowDeleteDialog(false);
        setShowRejectDialog(true);
        setRejectReason('');
        setRejectReasonError('');
    };

    const openDeleteDialog = () => {
        setShowRejectDialog(false);
        setRejectReason('');
        setRejectReasonError('');
        setShowDeleteDialog(true);
    };

    const handleStatusChange = async (nextStatus: 'published' | 'rejected' | 'suspended', reason?: string): Promise<boolean> => {
        if (!propertyId) {
            return false;
        }

        if (nextStatus === 'rejected' && !reason?.trim()) {
            showWarningToast('A rejection reason is required to reject a property.');
            return false;
        }

        setActionLoading(true);
        try {
            const { error } = await adminUpdatePropertyStatus(propertyId, nextStatus, reason?.trim());
            if (error) {
                throw new Error(error);
            }

            await refreshProperty();

            if (nextStatus === 'published') {
                showSuccessToast('Property approved and published successfully.');
            } else if (nextStatus === 'rejected') {
                showSuccessToast('Property rejected successfully.');
            } else {
                showSuccessToast('Property suspended successfully.');
            }
            return true;
        } catch (error: any) {
            showErrorToast(error?.message || 'Failed to update property status.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedReason = rejectReason.trim();
        if (!trimmedReason) {
            setRejectReasonError('A rejection reason is required to reject a property.');
            return;
        }

        const rejected = await handleStatusChange('rejected', trimmedReason);
        if (rejected) {
            closeRejectDialog();
        }
    };

    const handleDeleteConfirm = async () => {
        if (!propertyId) {
            return;
        }

        setActionLoading(true);
        try {
            const { error } = await deletePropertyRequest(propertyId);
            if (error) {
                throw new Error(error);
            }

            showSuccessToast('Property deleted successfully.');
            navigate('/admin/properties');
        } catch (error: any) {
            showErrorToast(error?.message || 'Failed to delete property.');
        } finally {
            setActionLoading(false);
        }
    };

    const renderWorkflowActions = () => {
        if (!property) {
            return null;
        }

        if (property.status === 'pending_approval') {
            return (
                <>
                    <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleStatusChange('published')}
                        className="flex-1 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {actionLoading ? 'Working...' : 'Approve'}
                    </button>
                    <button
                        type="button"
                        disabled={actionLoading}
                        onClick={openRejectDialog}
                        className="flex-1 rounded-2xl bg-red-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Reject
                    </button>
                </>
            );
        }

        if (property.status === 'published' || property.status === 'online' || property.status === 'active') {
            return (
                <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange('suspended')}
                    className="w-full rounded-2xl bg-amber-700 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {actionLoading ? 'Working...' : 'Suspend Listing'}
                </button>
            );
        }

        if (property.status === 'rejected' || property.status === 'suspended') {
            return (
                <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange('published')}
                    className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {actionLoading ? 'Working...' : 'Publish Listing'}
                </button>
            );
        }

        return (
            <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Awaiting Manager Submission
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border bg-white p-10 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="font-bold">Loading property registry entry...</span>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="space-y-6">
                <Link
                    to="/admin/properties"
                    data-testid="admin-property-back-to-registry"
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Registry
                </Link>
                <div className="rounded-[2rem] border bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-900">
                        <Home className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Property not found</h1>
                    <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        This registry entry may have been removed or is no longer available.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {showRejectDialog ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-8 backdrop-blur-sm">
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reject-property-dialog-title"
                        aria-describedby="reject-property-dialog-description"
                        onSubmit={handleRejectSubmit}
                        className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-900/50 dark:bg-gray-900"
                    >
                        <div className="mb-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Admin decision</p>
                            <h2 id="reject-property-dialog-title" className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                                Reject property
                            </h2>
                            <p id="reject-property-dialog-description" className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Add a clear reason so the manager knows what to correct before resubmitting.
                            </p>
                        </div>
                        <label htmlFor="admin-detail-reject-property-reason" className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">
                            Reason
                        </label>
                        <textarea
                            id="admin-detail-reject-property-reason"
                            aria-label="Reject property reason"
                            aria-invalid={rejectReasonError ? 'true' : undefined}
                            aria-describedby={rejectReasonError ? 'admin-detail-reject-property-reason-error' : undefined}
                            value={rejectReason}
                            onChange={(event) => {
                                setRejectReason(event.target.value);
                                if (rejectReasonError) {
                                    setRejectReasonError('');
                                }
                            }}
                            className="min-h-32 w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-900 outline-none transition-all focus:border-red-400 focus:ring-4 focus:ring-red-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            placeholder="Explain what the manager must update..."
                        />
                        {rejectReasonError ? (
                            <p id="admin-detail-reject-property-reason-error" className="mt-2 text-sm font-bold text-red-600">
                                {rejectReasonError}
                            </p>
                        ) : null}
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeRejectDialog}
                                disabled={actionLoading}
                                className="rounded-2xl border border-gray-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {actionLoading ? 'Rejecting...' : 'Reject property'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
            {showDeleteDialog ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-8 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Delete property confirmation"
                        aria-labelledby="delete-property-dialog-title"
                        aria-describedby="delete-property-dialog-description"
                        className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-900/50 dark:bg-gray-900"
                    >
                        <div className="mb-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Permanent action</p>
                            <h2 id="delete-property-dialog-title" className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                                Delete property
                            </h2>
                            <p id="delete-property-dialog-description" className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Remove this listing from the registry. This action cannot be undone from the admin workspace.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(false)}
                                disabled={actionLoading}
                                className="rounded-2xl border border-gray-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={actionLoading}
                                className="rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete property'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <Link
                        to="/admin/properties"
                        data-testid="admin-property-back-to-registry"
                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Registry
                    </Link>
                    <div>
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg ring-1 ring-inset backdrop-blur-md ${statusBadge.badgeClassName}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClassName}`} />
                                <span>{statusBadge.label}</span>
                            </span>
                            <span className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-700/20">
                                Admin View
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">{property.title}</h1>
                        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            <span>{getAddressLine(property) || 'Location unavailable'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                    <span className="text-3xl font-black text-blue-500">{formatPrice(property)}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                        {property.listing_type} • {property.property_type}
                    </span>
                </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                <div className="space-y-8">
                    <div className="overflow-hidden rounded-[2rem] border bg-white shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <div className="relative h-[360px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
                            {mediaState.primaryImageUrl ? (
                                <img
                                    src={mediaState.primaryImageUrl}
                                    alt={property.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div
                                    role="img"
                                    aria-label={mediaState.fallbackAriaLabel}
                                    data-testid="admin-property-media-fallback"
                                    className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center text-gray-500 dark:text-gray-300"
                                >
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-gray-400 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800/80 dark:ring-gray-700">
                                        <ImageOff className="h-10 w-10" />
                                    </div>
                                    <div className="max-w-sm">
                                        <p className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-100">
                                            {mediaState.fallbackTitle}
                                        </p>
                                        <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                                            {mediaState.fallbackDescription}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {imageUrls.length > 1 ? (
                            <div className="grid grid-cols-2 gap-4 border-t p-4 dark:border-gray-700 md:grid-cols-4">
                                {imageUrls.slice(1, 5).map((url) => (
                                    <div key={url} className="h-24 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
                                        <img src={url} alt={property.title} className="h-full w-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {videoUrls.length > 0 ? (
                        <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                            <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
                                <Video className="h-5 w-5 text-blue-500" />
                                Uploaded Videos
                            </h2>
                            <div className="mt-6 space-y-4">
                                {videoUrls.map((url) => (
                                    <video
                                        key={url}
                                        src={url}
                                        controls
                                        preload="metadata"
                                        className="w-full rounded-2xl bg-black"
                                        style={{ maxHeight: '560px' }}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Listing Overview</h2>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-300">
                            {property.description || 'No description was provided for this property.'}
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-900">
                                <div className="mb-3 flex items-center gap-2 text-gray-400">
                                    <Bed className="h-5 w-5 text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Bedrooms</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{property.bedrooms || 0}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-900">
                                <div className="mb-3 flex items-center gap-2 text-gray-400">
                                    <Bath className="h-5 w-5 text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Bathrooms</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{property.bathrooms || 0}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-900">
                                <div className="mb-3 flex items-center gap-2 text-gray-400">
                                    <Maximize className="h-5 w-5 text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Area</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{property.property_size_sqft || 0} sqft</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-900">
                                <div className="mb-3 flex items-center gap-2 text-gray-400">
                                    <Building className="h-5 w-5 text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Type</span>
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">{property.property_type}</p>
                            </div>
                        </div>

                        {features.length > 0 ? (
                            <div className="mt-8">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Features</h3>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {features.map((feature) => (
                                        <span
                                            key={feature}
                                            className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                        >
                                            {feature.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {amenities.length > 0 ? (
                            <div className="mt-8">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Amenities</h3>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {amenities.map((amenity) => (
                                        <span
                                            key={amenity}
                                            className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        >
                                            {amenity.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <h2 className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
                            <Shield className="h-5 w-5 text-blue-500" />
                            Moderation Controls
                        </h2>
                        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Review this listing and control whether it is published, rejected, or suspended.
                        </p>

                        <div className="mt-6 space-y-3">
                            {renderWorkflowActions()}
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={openDeleteDialog}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-5 py-4 text-sm font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Listing
                            </button>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Registry Status</h2>
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Current Status</span>
                                <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${statusBadge.badgeClassName}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClassName}`} />
                                    <span>{statusBadge.label}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Created</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(property.created_at)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Updated</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(property.updated_at)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Available From</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(property.available_from)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Verified</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{property.is_verified ? 'Yes' : 'No'}</span>
                            </div>
                        </div>

                        {property.rejection_reason ? (
                            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                    <XCircle className="h-4 w-4" />
                                    Rejection Reason
                                </div>
                                {property.rejection_reason}
                            </div>
                        ) : null}

                        {property.status === 'pending_approval' ? (
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                    <AlertCircle className="h-4 w-4" />
                                    Approval Required
                                </div>
                                This listing is waiting for admin approval before it can go live on the public site.
                            </div>
                        ) : null}

                        {(property.status === 'published' || property.status === 'online' || property.status === 'active') ? (
                            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                    <CheckCircle className="h-4 w-4" />
                                    Live Listing
                                </div>
                                This property is visible on the public side until it is suspended or moved to another status.
                            </div>
                        ) : null}
                    </div>

                    <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Manager Contact</h2>
                        <div className="mt-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <User className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agent Name</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_name || 'Unavailable'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_email || 'Unavailable'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_phone || 'Unavailable'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border bg-white p-8 shadow-xl shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Listing Metadata</h2>
                        <div className="mt-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status Label</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPropertyStatusLabel(property.status)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Listing Type</p>
                                    <p className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">{property.listing_type}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="mt-0.5 h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Address</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{getAddressLine(property) || 'Unavailable'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
