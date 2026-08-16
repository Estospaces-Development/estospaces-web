"use client";

import React, { Suspense, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ChevronRight,
    Copy,
    Globe,
    Home,
    Layers,
    Loader2,
    MapPin,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useProperties } from '@/contexts/PropertyContext';
import { useToast } from '@/contexts/ToastContext';
import { adminUpdatePropertyStatus, copyProperty, deleteProperty as deletePropertyRequest } from '@/services/propertyService';
import { getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import PaginationBar from '@/components/ui/PaginationBar';
import {
    ADMIN_PROPERTY_STATUS_FILTERS,
    ADMIN_PROPERTY_SORT_OPTIONS,
    ADMIN_PROPERTY_TYPE_FILTERS,
    type AdminPropertyRegistrySortOption,
    filterAdminPropertyRegistry,
    getAdminPropertyWorkflowFallbackLabel,
    getAdminPropertySortControlLabel,
    sortAdminPropertyRegistry,
} from '@/lib/adminPropertyRegistry';
import { formatLaunchCurrencyForCountry } from '@/lib/launchLocale';

function PropertyManagementContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { properties, pagination, fetchProperties, loading, setPage } = useProperties();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToast();
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
    const [filteringType, setFilteringType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<AdminPropertyRegistrySortOption>('newest');
    const [updatingPropertyId, setUpdatingPropertyId] = useState<string | null>(null);
    const [rejectingPropertyId, setRejectingPropertyId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectReasonError, setRejectReasonError] = useState('');
    const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
    const [copyingPropertyId, setCopyingPropertyId] = useState<string | null>(null);

    const resolvePropertyId = (property: any): string | null => {
        const candidates = [property?.id, property?.propertyId, property?.property_id];
        const id = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
        return id ? id.trim() : null;
    };

    const handleSearchChange = (value: string) => {
        setPage(1);
        setSearchQuery(value);
    };

    const handleTypeFilterChange = (value: string) => {
        setPage(1);
        setFilteringType(value);
    };

    const handleStatusFilterChange = (value: string) => {
        setPage(1);
        setStatusFilter(value);
    };

    const handleResetFilters = () => {
        setPage(1);
        setSearchQuery('');
        setFilteringType('all');
        setStatusFilter('all');
    };

    const filteredProperties = sortAdminPropertyRegistry(
        filterAdminPropertyRegistry(properties, {
            searchQuery,
            typeFilter: filteringType,
            statusFilter,
        }),
        sortBy,
    );
    const propertyCardKeyCounts = new Map<string, number>();

    const resolvePropertyCardKey = (propertyId: string | null, index: number): string => {
        const baseKey = propertyId || 'property-card-missing-id';
        const occurrence = propertyCardKeyCounts.get(baseKey) || 0;
        propertyCardKeyCounts.set(baseKey, occurrence + 1);

        return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}-${index}`;
    };

    const closeRejectDialog = () => {
        setRejectingPropertyId(null);
        setRejectReason('');
        setRejectReasonError('');
    };

    const openRejectDialog = (propertyId: string | null) => {
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return;
        }

        setDeletingPropertyId(null);
        setRejectingPropertyId(propertyId);
        setRejectReason('');
        setRejectReasonError('');
    };

    const closeDeleteDialog = () => {
        setDeletingPropertyId(null);
    };

    const closeCopyDialog = () => {
        setCopyingPropertyId(null);
    };

    const openCopyDialog = (propertyId: string | null) => {
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return;
        }

        setRejectingPropertyId(null);
        setRejectReason('');
        setRejectReasonError('');
        setDeletingPropertyId(null);
        setCopyingPropertyId(propertyId);
    };

    const openDeleteDialog = (propertyId: string | null) => {
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return;
        }

        setRejectingPropertyId(null);
        setRejectReason('');
        setRejectReasonError('');
        setDeletingPropertyId(propertyId);
    };

    const handleStatusChange = async (propertyId: string | null, nextStatus: 'published' | 'rejected' | 'suspended', reason?: string): Promise<boolean> => {
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return false;
        }

        if (nextStatus === 'rejected' && !reason?.trim()) {
            showWarningToast('A rejection reason is required to reject a property.');
            return false;
        }

        setUpdatingPropertyId(propertyId);
        try {
            const { error } = await adminUpdatePropertyStatus(propertyId, nextStatus, reason?.trim());
            if (error) {
                throw new Error(error);
            }

            await fetchProperties();

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
            setUpdatingPropertyId(null);
        }
    };

    const handleRejectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedReason = rejectReason.trim();
        if (!trimmedReason) {
            setRejectReasonError('A rejection reason is required to reject a property.');
            return;
        }

        const rejected = await handleStatusChange(rejectingPropertyId, 'rejected', trimmedReason);
        if (rejected) {
            closeRejectDialog();
        }
    };

    const handleDeleteConfirm = async () => {
        const propertyId = deletingPropertyId;
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return;
        }

        setUpdatingPropertyId(propertyId);
        try {
            const { error } = await deletePropertyRequest(propertyId);
            if (error) {
                throw new Error(error);
            }
            showSuccessToast('Property deleted successfully.');
            closeDeleteDialog();
            await fetchProperties();
        } catch (error: any) {
            showErrorToast(error?.message || 'Failed to delete property.');
        } finally {
            setUpdatingPropertyId(null);
        }
    };

    const handleCopyConfirm = async () => {
        const propertyId = copyingPropertyId;
        if (!propertyId) {
            showErrorToast('Property ID missing. Please refresh and try again.');
            return;
        }

        setUpdatingPropertyId(propertyId);
        try {
            const { data, error } = await copyProperty(propertyId);
            if (error) {
                throw new Error(error);
            }
            showSuccessToast('Property copied successfully. Navigate to edit the copy.');
            closeCopyDialog();
            await fetchProperties();
            if (data?.id) {
                navigate(`/admin/properties/${data.id}`);
            }
        } catch (error: any) {
            showErrorToast(error?.message || 'Failed to copy property.');
        } finally {
            setUpdatingPropertyId(null);
            setCopyingPropertyId(null);
        }
    };

    const renderWorkflowActions = (property: typeof properties[number]) => {
        const propertyId = resolvePropertyId(property);
        const isBusy = propertyId !== null && updatingPropertyId === propertyId;

        if (property.status === 'pending_approval') {
            return (
                <>
                    <button
                        type="button"
                        disabled={isBusy || !propertyId}
                        onClick={(event) => {
                            event.stopPropagation();
                            handleStatusChange(propertyId, 'published');
                        }}
                        className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isBusy ? 'Working...' : 'Approve'}
                    </button>
                    <button
                        type="button"
                        disabled={isBusy || !propertyId}
                        onClick={(event) => {
                            event.stopPropagation();
                            openRejectDialog(propertyId);
                        }}
                        className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
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
                    disabled={isBusy || !propertyId}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleStatusChange(propertyId, 'suspended');
                    }}
                    className="flex-1 rounded-xl bg-amber-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy ? 'Working...' : 'Suspend'}
                </button>
            );
        }

        if (property.status === 'rejected' || property.status === 'suspended') {
            return (
                <button
                    type="button"
                    disabled={isBusy || !propertyId}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleStatusChange(propertyId, 'published');
                    }}
                    className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy ? 'Working...' : 'Publish'}
                </button>
            );
        }

        return (
            <div className="flex-1 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:border-gray-600">
                {getAdminPropertyWorkflowFallbackLabel(property)}
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {rejectingPropertyId ? (
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
                        <label htmlFor="reject-property-reason" className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">
                            Reason
                        </label>
                        <textarea
                            id="reject-property-reason"
                            aria-label="Reject property reason"
                            aria-invalid={rejectReasonError ? 'true' : undefined}
                            aria-describedby={rejectReasonError ? 'reject-property-reason-error' : undefined}
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
                            <p id="reject-property-reason-error" className="mt-2 text-sm font-bold text-red-600">
                                {rejectReasonError}
                            </p>
                        ) : null}
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeRejectDialog}
                                disabled={updatingPropertyId === rejectingPropertyId}
                                className="rounded-2xl border border-gray-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updatingPropertyId === rejectingPropertyId}
                                className="rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {updatingPropertyId === rejectingPropertyId ? 'Rejecting...' : 'Reject property'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
            {deletingPropertyId ? (
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
                                onClick={closeDeleteDialog}
                                disabled={updatingPropertyId === deletingPropertyId}
                                className="rounded-2xl border border-gray-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={updatingPropertyId === deletingPropertyId}
                                className="rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {updatingPropertyId === deletingPropertyId ? 'Deleting...' : 'Delete property'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {copyingPropertyId ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-8 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Copy property confirmation"
                        aria-labelledby="copy-property-dialog-title"
                        aria-describedby="copy-property-dialog-description"
                        className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl dark:border-blue-900/50 dark:bg-gray-900"
                    >
                        <div className="mb-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Duplicate listing</p>
                            <h2 id="copy-property-dialog-title" className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                                Copy property
                            </h2>
                            <p id="copy-property-dialog-description" className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Create a new draft listing from this property. Images and details will be copied. You can edit the copy before publishing.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeCopyDialog}
                                disabled={updatingPropertyId === copyingPropertyId}
                                className="rounded-2xl border border-gray-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCopyConfirm}
                                disabled={updatingPropertyId === copyingPropertyId}
                                className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {updatingPropertyId === copyingPropertyId ? 'Copying...' : 'Copy as draft'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-3">
                        <span className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-700/20">Inventory Hub</span>
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                            <Globe size={12} /> Global Portfolio Management
                        </span>
                    </div>
                    <h1 className="text-4xl font-black leading-none tracking-tight text-gray-900 dark:text-white">
                        Registry Control
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
                        Review every manager listing here. Pending submissions can be approved, rejected, or suspended without leaving the registry.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="group relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={18} />
                        <input
                            type="text"
                            aria-label="Search property registry"
                            placeholder="Search registry..."
                            value={searchQuery}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            className="w-64 rounded-2xl border bg-white py-4 pl-12 pr-6 text-sm font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-800"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => showWarningToast('Property creation stays in manager workspaces. Admin can review submissions here, but new listings need to be created from a manager account.')}
                        className="flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-gray-900"
                    >
                        <Plus size={18} /> Add Property
                    </button>
                </div>
            </div>

            <div className="rounded-[2rem] border bg-white p-4 shadow-xl shadow-gray-200/50 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-1 flex-wrap gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</span>
                            {ADMIN_PROPERTY_TYPE_FILTERS.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    aria-pressed={filteringType === type.value}
                                    onClick={() => handleTypeFilterChange(type.value)}
                                    className={`rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        filteringType === type.value
                                            ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20'
                                            : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</span>
                            {ADMIN_PROPERTY_STATUS_FILTERS.map((status) => (
                                <button
                                    key={status.value}
                                    type="button"
                                    aria-pressed={statusFilter === status.value}
                                    onClick={() => handleStatusFilterChange(status.value)}
                                    className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        statusFilter === status.value
                                            ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                                            : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                    }`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <label
                                htmlFor="admin-property-sort"
                                className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
                            >
                                {getAdminPropertySortControlLabel()}
                            </label>
                            <select
                                id="admin-property-sort"
                                aria-label={getAdminPropertySortControlLabel()}
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as AdminPropertyRegistrySortOption)}
                                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none transition-all hover:text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            >
                                {ADMIN_PROPERTY_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-t pt-4 dark:border-gray-700 xl:border-l xl:border-t-0 xl:px-6 xl:pt-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Total Listed: <span className="text-gray-900 dark:text-white">{pagination.total}</span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Showing: <span className="text-gray-900 dark:text-white">{filteredProperties.length}</span>
                        </span>
                    </div>
                </div>
            </div>

            {loading && properties.length === 0 ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-[3rem] border bg-white p-20 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="font-bold">Loading full property registry...</span>
                    </div>
                </div>
            ) : filteredProperties.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProperties.map((property, index) => {
                            const statusBadge = getManagerPropertyStatusBadge(property.status);
                            const propertyId = resolvePropertyId(property);
                            const propertyCardKey = resolvePropertyCardKey(propertyId, index);
                            const isBusy = propertyId !== null && updatingPropertyId === propertyId;
                            const propertyImage = getPrimaryPropertyImage(property, PROPERTY_PLACEHOLDER_IMAGE);

                            return (
                                <div
                                    key={propertyCardKey}
                                    className="group overflow-hidden rounded-[3rem] border bg-white shadow-2xl shadow-gray-200/50 transition-all duration-500 hover:-translate-y-2 dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
                                >
                                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 dark:from-gray-800 dark:to-gray-900">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Home size={44} />
                                    </div>
                                    <img
                                        src={propertyImage || PROPERTY_PLACEHOLDER_IMAGE}
                                        alt={property.title || 'Property'}
                                        className="relative h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        onError={(event) => {
                                            event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                        }}
                                    />
                                    <div className="absolute left-6 top-6 flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg ring-1 ring-inset backdrop-blur-md ${statusBadge.badgeClassName}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClassName}`} />
                                            <span>{statusBadge.label}</span>
                                        </span>
                                    </div>
                                    <div className="absolute right-6 top-6">
                                        {isBusy ? (
                                            <span className="inline-flex items-center gap-2 rounded-xl bg-gray-900/90 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Updating
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="p-8">
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="mb-1 text-xl font-black tracking-tight text-gray-900 dark:text-white">{property.title}</h2>
                                            <p className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                                <MapPin size={12} className="text-blue-500" />
                                                {property.city || property.location?.city || 'Location unavailable'}
                                            </p>
                                        </div>
                                        <span className="text-xl font-black text-blue-500">
                                            {(() => {
                                                const propertyRecord = property as any;
                                                return typeof property.price?.amount === 'number'
                                                    ? formatLaunchCurrencyForCountry(property.price.amount, {
                                                        countryCode: propertyRecord.countryCode || propertyRecord.country_code || propertyRecord.country || property.location?.countryCode || property.location?.country,
                                                        countryName: propertyRecord.country || property.location?.country,
                                                        currencyCode: property.price.currency || propertyRecord.currency,
                                                    })
                                                    : property.priceString || 'POA';
                                            })()}
                                        </span>
                                    </div>

                                    {property.status === 'pending_approval' ? (
                                        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                                            <AlertCircle className="h-4 w-4" />
                                            Waiting for admin decision before the listing can go live.
                                        </div>
                                    ) : null}

                                    {property.status === 'rejected' && property.description ? (
                                        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                                            This property is rejected. Review the details before publishing again.
                                        </div>
                                    ) : null}

                                    <div className="my-6 grid grid-cols-3 gap-4 border-y py-6 dark:border-gray-700">
                                        <div className="border-r text-center dark:border-gray-700">
                                            <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-gray-400">Beds</p>
                                            <p className="font-black text-gray-900 dark:text-white">{property.bedrooms || property.rooms?.bedrooms || 0}</p>
                                        </div>
                                        <div className="border-r text-center dark:border-gray-700">
                                            <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-gray-400">Baths</p>
                                            <p className="font-black text-gray-900 dark:text-white">{property.bathrooms || property.rooms?.bathrooms || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-gray-400">Type</p>
                                            <span className="text-[10px] font-black uppercase text-blue-700">{property.propertyType}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-400 dark:bg-gray-700">
                                                {(property.contactName || 'AG').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-900 dark:text-white">{property.contactName || 'Unknown Owner'}</p>
                                                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Listing Owner</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (!propertyId) {
                                                    showErrorToast('Property ID missing. Please refresh and try again.');
                                                    return;
                                                }
                                                navigate(`/admin/properties/${propertyId}`);
                                            }}
                                            disabled={!propertyId}
                                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                                        >
                                            View
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    <div className="mt-6 flex gap-2">
                                        {renderWorkflowActions(property)}
                                        <button
                                            type="button"
                                            aria-label={`Copy ${property.title || 'property'}`}
                                            disabled={isBusy}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openCopyDialog(propertyId);
                                            }}
                                            className="rounded-xl bg-gray-900 px-4 py-3 text-white shadow-xl transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="Copy Property"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Delete ${property.title || 'property'}`}
                                            disabled={isBusy}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openDeleteDialog(propertyId);
                                            }}
                                            className="rounded-xl bg-gray-900 px-4 py-3 text-white shadow-xl transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="Delete Property"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                </div>
                            );
                        })}
                    </div>
                    <PaginationBar
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={setPage}
                        totalItems={pagination.total}
                        pageSize={pagination.limit}
                        currentItemCount={properties.length}
                        itemLabel="properties"
                    />
                </>
            ) : (
                <div className="rounded-[3rem] border-2 border-dashed bg-white p-20 text-center dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 text-gray-300 dark:bg-gray-900">
                        <Layers size={40} />
                    </div>
                    <h2 className="mb-2 text-2xl font-black text-gray-900 dark:text-white">No Properties Found</h2>
                    <p className="mb-8 font-medium text-gray-500">
                        No registry entries matched the current search or filter selection.
                    </p>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="rounded-2xl bg-blue-500 px-10 py-5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        Reset Filters
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminPropertyManagementPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading Properties...</div>}>
            <PropertyManagementContent />
        </Suspense>
    );
}
