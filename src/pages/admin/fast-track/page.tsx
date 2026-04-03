"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertOctagon,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Loader2,
    RefreshCw,
    Trash2,
    Zap,
} from 'lucide-react';
import FastTrackCaseCard from '@/components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '@/components/manager/FastTrack/FastTrackCaseDetail';
import BackButton from '@/components/ui/BackButton';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    FastTrackCase,
    deleteFastTrackCase,
    getFastTrackCases,
    updateFastTrackCase,
} from '@/services/fastTrackService';

const AdminFastTrackDashboard = () => {
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FastTrackCase | null>(null);
    const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const { data, error: requestError } = await getFastTrackCases();
        if (data) {
            setCases(data);
            setError(null);
            setSelectedCaseId((previous) => {
                if (!previous) {
                    return previous;
                }

                return data.some((caseItem) => caseItem.caseId === previous) ? previous : null;
            });
        } else if (!silent) {
            setError(requestError || 'Failed to fetch cases');
        }

        if (!silent) {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases, publishWorkspaceSync]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
        ],
        refresh: () => fetchCases(true),
    });

    const handleUpdateCase = useCallback(async (updatedCase: FastTrackCase) => {
        setCases((previous) => previous.map((caseItem) => (
            caseItem.caseId === updatedCase.caseId ? updatedCase : caseItem
        )));

        const { error: updateError } = await updateFastTrackCase(updatedCase.id, {
            current_step: updatedCase.currentStep,
            final_status: updatedCase.finalStatus,
            documents: updatedCase.documents,
        });

        if (updateError) {
            setToast({ message: 'Failed to update case', type: 'error', visible: true });
            void fetchCases();
            return;
        }

        publishWorkspaceSync({
            source: 'mutation',
            tags: [
                WORKSPACE_SYNC_TAGS.FAST_TRACK,
                WORKSPACE_SYNC_TAGS.APPLICATIONS,
                WORKSPACE_SYNC_TAGS.VIEWINGS,
                WORKSPACE_SYNC_TAGS.CONTRACTS,
                WORKSPACE_SYNC_TAGS.PAYMENTS,
                WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            ],
            reason: 'Admin updated fast-track case',
            ids: {
                caseId: updatedCase.caseId,
                leadId: updatedCase.leadId,
                propertyId: updatedCase.propertyId,
                applicationId: updatedCase.applicationId,
                viewingId: updatedCase.viewingId,
                contractId: updatedCase.contractId,
            },
        });
        setToast({ message: 'Case updated successfully', type: 'success', visible: true });
    }, [fetchCases]);

    const openDeleteConfirmation = useCallback((caseItem: FastTrackCase) => {
        setDeleteTarget(caseItem);
    }, []);

    const closeDeleteConfirmation = useCallback(() => {
        if (deletingCaseId) {
            return;
        }

        setDeleteTarget(null);
    }, [deletingCaseId]);

    const handleDeleteCase = useCallback(async () => {
        if (!deleteTarget) {
            return;
        }

        setDeletingCaseId(deleteTarget.caseId);
        const { error: deleteError } = await deleteFastTrackCase(deleteTarget.id);

        if (deleteError) {
            setToast({ message: deleteError || 'Failed to delete fast-track case', type: 'error', visible: true });
            setDeletingCaseId(null);
            return;
        }

        setCases((previous) => previous.filter((caseItem) => caseItem.caseId !== deleteTarget.caseId));
        setSelectedCaseId((previous) => previous === deleteTarget.caseId ? null : previous);
        publishWorkspaceSync({
            source: 'mutation',
            tags: [
                WORKSPACE_SYNC_TAGS.FAST_TRACK,
                WORKSPACE_SYNC_TAGS.APPLICATIONS,
                WORKSPACE_SYNC_TAGS.VIEWINGS,
                WORKSPACE_SYNC_TAGS.CONTRACTS,
                WORKSPACE_SYNC_TAGS.PAYMENTS,
                WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            ],
            reason: 'Admin deleted fast-track case',
            ids: {
                caseId: deleteTarget.caseId,
                leadId: deleteTarget.leadId,
                propertyId: deleteTarget.propertyId,
                applicationId: deleteTarget.applicationId,
                viewingId: deleteTarget.viewingId,
                contractId: deleteTarget.contractId,
            },
        });
        setDeleteTarget(null);
        setDeletingCaseId(null);
        setToast({ message: 'Fast-track case deleted successfully', type: 'success', visible: true });
        void fetchCases(true);
    }, [deleteTarget, fetchCases, publishWorkspaceSync]);

    const selectedCase = useMemo(
        () => cases.find((caseItem) => caseItem.caseId === selectedCaseId),
        [cases, selectedCaseId],
    );

    const stats = useMemo(() => ({
        active: cases.filter((caseItem) => caseItem.finalStatus === 'in_progress').length,
        completedToday: cases.filter((caseItem) => caseItem.finalStatus === 'completed').length,
        attention: cases.filter((caseItem) => (
            caseItem.finalStatus === 'expired' || caseItem.finalStatus === 'rejected'
        )).length,
    }), [cases]);

    const content = selectedCase ? (
        <div className="relative h-[calc(100vh-100px)] animate-in slide-in-from-right duration-300">
            <div className="pointer-events-none absolute right-4 top-4 z-20">
                <button
                    type="button"
                    onClick={() => openDeleteConfirmation(selectedCase)}
                    disabled={deletingCaseId === selectedCase.caseId}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/95 px-4 py-2 text-sm font-semibold text-red-600 shadow-lg backdrop-blur transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-70 dark:border-red-900/40 dark:bg-zinc-950/90 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                    {deletingCaseId === selectedCase.caseId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete case
                </button>
            </div>
            <FastTrackCaseDetail
                caseData={selectedCase}
                onClose={() => setSelectedCaseId(null)}
                onUpdate={handleUpdateCase}
            />
        </div>
    ) : (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-2">
                <BackButton />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fast Track Oversight</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Monitor, intervene, and remove invalid 24-hour fast-track cases.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchCases()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-200 dark:hover:bg-zinc-900"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh queue
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    <div>
                        <p className="font-semibold">Unable to load fast-track cases</p>
                        <p className="mt-1 text-red-600/90 dark:text-red-200/90">{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchCases()}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Cases</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.active}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Today</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.completedToday}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs Attention</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.attention}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <AlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Priority Queue</h2>

                {loading && cases.length === 0 ? (
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-20 text-gray-500 dark:border-gray-700 dark:bg-black/50 dark:text-gray-400">
                        <div className="flex items-center gap-3 text-sm font-medium">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading fast-track queue...
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {cases.map((caseItem) => (
                            <div key={caseItem.caseId} className="relative">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openDeleteConfirmation(caseItem);
                                    }}
                                    disabled={deletingCaseId === caseItem.caseId}
                                    className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-red-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-70 dark:border-red-900/40 dark:bg-zinc-950/90 dark:text-red-300 dark:hover:bg-red-950/40"
                                >
                                    {deletingCaseId === caseItem.caseId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Delete
                                </button>
                                <div
                                    onClick={() => setSelectedCaseId(caseItem.caseId)}
                                    className="cursor-pointer transition-transform hover:scale-[1.02]"
                                >
                                    <FastTrackCaseCard
                                        caseData={caseItem}
                                        onUpdate={handleUpdateCase}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && cases.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-black/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No active fast track cases.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative h-full">
            {content}

            <Modal
                isOpen={Boolean(deleteTarget)}
                onClose={closeDeleteConfirmation}
                title="Delete Fast-Track Case"
                size="md"
                closeOnBackdrop={!deletingCaseId}
                footer={(
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeDeleteConfirmation}
                            disabled={Boolean(deletingCaseId)}
                            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDeleteCase()}
                            disabled={!deleteTarget || Boolean(deletingCaseId)}
                            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
                        >
                            {deletingCaseId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete case
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
                        <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-700 dark:text-red-200">This action removes the fast-track process.</p>
                            <p className="mt-1 text-sm text-red-600/90 dark:text-red-200/90">
                                The case will be deleted from admin oversight and unlinked from any downstream application, viewing, contract, or sale records. Those downstream records will be preserved.
                            </p>
                        </div>
                    </div>

                    {deleteTarget && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{deleteTarget.propertyTitle}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Client: {deleteTarget.clientName}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Case ID: {deleteTarget.caseId}</p>
                        </div>
                    )}
                </div>
            </Modal>

            {toast.visible && (
                <div className="fixed right-4 top-4 z-[10000]">
                    <Toast
                        id="admin-fast-track-toast"
                        message={toast.message}
                        type={toast.type}
                        isVisible={toast.visible}
                        onClose={() => setToast((previous) => ({ ...previous, visible: false }))}
                    />
                </div>
            )}
        </div>
    );
};

export default AdminFastTrackDashboard;
