"use client";

import React, { useState, Suspense, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Clock, CheckCircle, Plus, Download, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { useApplications, APPLICATION_STATUS, type Application } from '@/contexts/ApplicationsContext';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import ApplicationCard from '@/components/manager/applications/ApplicationCard';
import ApplicationDetail from '@/components/manager/applications/ApplicationDetail';
import ApplicationFilters from '@/components/manager/applications/ApplicationFilters';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { attachLinkedFastTrackCase } from '@/lib/fastTrackCompanion';
import { buildCsvContent } from '@/lib/csvExport';
import { resolveFocusedApplication } from '@/lib/workspaceLinks';
import { resolveWorkspaceSection } from '@/lib/liveCaseWorkspace';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';

interface ApplicationsContentProps {
    initialView?: 'list' | 'detail';
}

function formatApplicationStatus(status?: string) {
    return (status || 'unknown')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildManagerApplicationsCsv(applications: Application[]) {
    const header = [
        'Reference',
        'Property',
        'Address',
        'Applicant',
        'Status',
        'Listing Type',
        'Agent',
        'Created',
        'Updated',
        'Action Required',
        'Fast Track Case',
    ];
    const rows = applications.map((application) => [
        application.referenceId || application.id,
        application.propertyTitle || application.property?.title || 'Property not recorded',
        application.propertyAddress || application.property?.address || 'Address not recorded',
        application.userId || 'Applicant not recorded',
        formatApplicationStatus(application.status),
        application.listingType || application.propertyType || 'Not recorded',
        application.agentName || application.agentAgency || application.managerId || 'Agent not recorded',
        application.submittedDate || application.createdAt || '',
        application.lastUpdated || application.updatedAt || '',
        application.requiresAction ? 'Yes' : 'No',
        application.fastTrackCaseId || application.fastTrackCase?.caseId || '',
    ]);

    return buildCsvContent([header, ...rows]);
}

function ApplicationsContent({ initialView = 'list' }: ApplicationsContentProps) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user: _user } = useAuth();
    const toast = useToast();
    const {
        applications: filteredApplications,
        allApplications,
        isLoading: contextLoading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        propertyTypeFilter,
        setPropertyTypeFilter,
        dateRangeFilter,
        setDateRangeFilter,
        updateApplicationStatus
    } = useApplications();

    const [view, setView] = useState<'list' | 'detail'>(initialView);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [hasAppliedRouteFocus, setHasAppliedRouteFocus] = useState(false);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [fastTrackCasesReady, setFastTrackCasesReady] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const removedCaseNoticeRef = useRef<string | null>(null);
    const lastExportStartedAtRef = useRef(0);
    const rawCaseId = searchParams.get('case');
    const progressionId = searchParams.get('progression');
    const requestedSection = resolveWorkspaceSection(searchParams.get('section'), 'overview');
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );
    const hasWorkspaceFocusRequest = Boolean(
        searchParams.get('application')
        || progressionId
        || sanitizedCaseId
        || searchParams.get('lead')
        || searchParams.get('property')
        || requestedSection !== 'overview',
    );
    const focusedApplicationFromRoute = resolveFocusedApplication(allApplications, {
        applicationId: searchParams.get('application'),
        progressionId,
        caseId: sanitizedCaseId,
        leadId: searchParams.get('lead'),
        propertyId: searchParams.get('property'),
    });
    const selectedApplication = useMemo(() => {
        if (!selectedId) {
            return null;
        }

        const baseApplication = allApplications.find((application) => application.id === selectedId);
        if (!baseApplication) {
            return null;
        }

        return attachLinkedFastTrackCase(baseApplication, fastTrackCases);
    }, [allApplications, fastTrackCases, selectedId]);

    useEffect(() => {
        let cancelled = false;

        const loadFastTrackCases = async () => {
            const result = await getFastTrackCases({ suppressErrorToast: true });
            if (cancelled) {
                return;
            }
            setFastTrackCases(result.data || []);
            setFastTrackCasesReady(true);
        };

        void loadFastTrackCases();

        return () => {
            cancelled = true;
        };
    }, []);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
        refresh: async () => {
            const result = await getFastTrackCases({ suppressErrorToast: true });
            setFastTrackCases(result.data || []);
            setFastTrackCasesReady(true);
        },
    });

    useEffect(() => {
        setHasAppliedRouteFocus(false);
    }, [searchParams]);

    useEffect(() => {
        if (!fastTrackCasesReady || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [fastTrackCasesReady, removedCaseId, setSearchParams, toast]);

    useEffect(() => {
        if (hasAppliedRouteFocus || !focusedApplicationFromRoute) {
            return;
        }

        setSelectedId(focusedApplicationFromRoute.id);
        setView('detail');
        setHasAppliedRouteFocus(true);
    }, [focusedApplicationFromRoute, hasAppliedRouteFocus]);

    // Stats use allApplications (unfiltered) so counts are always accurate
    const stats = useMemo(() => {
        const total = allApplications.length;
        const pending = allApplications.filter((a: any) => [
            APPLICATION_STATUS.PENDING,
            APPLICATION_STATUS.SUBMITTED,
            APPLICATION_STATUS.BUYER_QUALIFICATION,
            APPLICATION_STATUS.OFFER_READY,
            APPLICATION_STATUS.OFFER_SUBMITTED,
            APPLICATION_STATUS.OFFER_UNDER_REVIEW,
            APPLICATION_STATUS.OFFER_ACCEPTED,
            APPLICATION_STATUS.SALE_AGREED,
            APPLICATION_STATUS.MEMORANDUM_ISSUED,
            APPLICATION_STATUS.CONVEYANCING,
            APPLICATION_STATUS.EXCHANGE,
        ].includes(a.status)).length;
        const actionRequired = allApplications.filter((a: any) => a.requiresAction).length;
        const approved = allApplications.filter((a: any) => a.status === APPLICATION_STATUS.APPROVED).length;

        return [
            { label: 'Total Active', value: total.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Pending Review', value: pending.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Action Required', value: actionRequired.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Completed', value: approved.toString(), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ];
    }, [allApplications]);

    const handleCardClick = (id: string) => {
        setSelectedId(id);
        setView('detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCloseDetail = () => {
        setView('list');
        setSelectedId(null);
    };

    const handleUpdateStatus = async (id: string, status: any, reviewNotes?: string) => {
        try {
            const result = await updateApplicationStatus(id, status, reviewNotes);
            if (!result.success) {
                throw new Error(result.error || 'Failed to update application status');
            }
            toast.success(`Application status updated to ${status.replace(/_/g, ' ')}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleExportApplicationsCsv = useCallback(() => {
        if (filteredApplications.length === 0) {
            setExportStatus('No applications match the current export filters.');
            return;
        }

        const now = Date.now();
        if (now - lastExportStartedAtRef.current < 1000) {
            setExportStatus('Export already started. Please wait a moment before trying again.');
            return;
        }
        lastExportStartedAtRef.current = now;

        const csv = buildManagerApplicationsCsv(filteredApplications);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `manager-applications-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        setExportStatus(`Exported ${filteredApplications.length} application${filteredApplications.length === 1 ? '' : 's'} to CSV.`);
    }, [filteredApplications]);

    if (view === 'detail' && selectedId) {
        return (
            <ApplicationDetail
                key={selectedId}
                applicationId={selectedId}
                application={selectedApplication || undefined}
                onClose={handleCloseDetail}
                onUpdateStatus={handleUpdateStatus}
                requestedSection={requestedSection}
            />
        );
    }

    return (
        <div className="space-y-6 font-outfit animate-in fade-in duration-500">
            <p role="status" aria-live="polite" className="sr-only">{exportStatus}</p>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Applications
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Track and manage your property applications
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportApplicationsCsv}
                        disabled={contextLoading || filteredApplications.length === 0}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-200 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/manager/leads')}
                        className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
                    >
                            <Plus size={18} /> Open Lead Intake
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <ApplicationFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                propertyTypeFilter={propertyTypeFilter}
                setPropertyTypeFilter={setPropertyTypeFilter}
                dateRangeFilter={dateRangeFilter}
                setDateRangeFilter={setDateRangeFilter}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
            />

            {exportStatus ? (
                <div role="status" className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                    {exportStatus}
                </div>
            ) : null}

            {hasWorkspaceFocusRequest && !focusedApplicationFromRoute && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                    You are in the correct applications workspace for this fast-track case, but no linked application record exists yet. It will appear here automatically as soon as the live workflow creates it.
                </div>
            )}

            {/* Applications List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {contextLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[200px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl border border-gray-100 dark:border-gray-700" />
                    ))
                ) : filteredApplications.length > 0 ? (
                    filteredApplications.map((app) => (
                        <ApplicationCard
                            key={app.id}
                            application={app}
                            onClick={() => handleCardClick(app.id)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No applications found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            {searchQuery || statusFilter !== 'all'
                                ? "No applications match your current filters. Try adjusting them to see more results."
                                : "No applications have been received yet. When users submit applications for your properties, they will appear here."}
                        </p>
                        {(searchQuery || statusFilter !== 'all' || propertyTypeFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setPropertyTypeFilter('all');
                                    setDateRangeFilter({ start: null, end: null });
                                }}
                                className="mt-6 text-orange-500 font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ManagerApplicationsPage() {
    return (
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading applications..." />}>
            <ApplicationsContent />
        </Suspense>
    );
}
