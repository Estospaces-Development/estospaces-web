"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Building2,
    MapPin,
    Search,
    Filter,
    Plus,
    LayoutGrid,
    List,
    FileText,
    ArrowLeft,
    Clock,
    CheckCircle,
    Bell,
    Inbox,
    X,
    AlertCircle,
    Calendar,
    User,
    Phone,
    Mail,
    ChevronRight,
    Upload,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApplications, APPLICATION_STATUS, type Application } from '@/contexts/ApplicationsContext';
import { useToast } from '@/contexts/ToastContext';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import ApplicationCard from '@/components/dashboard/applications/ApplicationCard';
import ApplicationCardSkeleton from '@/components/dashboard/applications/ApplicationCardSkeleton';
import ApplicationFilters from '@/components/dashboard/applications/ApplicationFilters';
import { buildWorkspacePath, resolveFocusedApplication } from '@/lib/workspaceLinks';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import { messagesService } from '@/services/messagesService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    getNextSaleJourneyActions,
    getSaleJourneySummary,
    getSaleJourneyStageLabel,
    isSaleProgressionRecord,
    resolveSaleJourneyDisplayStage,
} from '@/lib/saleJourney';

function ApplicationDetailDrawer({ application, onClose }: { application: Application; onClose: () => void }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [openingConversation, setOpeningConversation] = useState(false);
    const isSaleProgression = isSaleProgressionRecord(application);
    const saleDisplayStage = resolveSaleJourneyDisplayStage(application);
    const showsSaleJourney = application.listingType !== 'rent' && Boolean(saleDisplayStage);
    const nextSaleAction = getNextSaleJourneyActions(application.status)[0];

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const statusMap: Record<string, { label: string; color: string }> = {
        draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
        pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700' },
        submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
        under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
        documents_requested: { label: 'Documents Required', color: 'bg-orange-100 text-orange-700' },
        offer_submitted: { label: 'Offer Submitted', color: 'bg-blue-100 text-blue-700' },
        offer_under_review: { label: 'Offer Under Review', color: 'bg-amber-100 text-amber-700' },
        offer_accepted: { label: 'Offer Accepted', color: 'bg-green-100 text-green-700' },
        sale_agreed: { label: 'Sale Agreed', color: 'bg-emerald-100 text-emerald-700' },
        memorandum_issued: { label: 'Memorandum Issued', color: 'bg-purple-100 text-purple-700' },
        conveyancing: { label: 'Conveyancing', color: 'bg-indigo-100 text-indigo-700' },
        exchange: { label: 'Exchange', color: 'bg-cyan-100 text-cyan-700' },
        approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
        rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
        withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
        completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    };

    const statusInfo = statusMap[application.status] || { label: application.status, color: 'bg-gray-100 text-gray-700' };

    const handleOpenConversation = async () => {
        if (!application.managerId || !user) {
            toast.error('The live agent conversation is not ready yet.');
            return;
        }

        setOpeningConversation(true);
        try {
            const conversation = await messagesService.upsertDirectConversation(application.managerId, {
                propertyId: application.propertyId,
                propertyTitle: application.propertyTitle,
                propertyAddress: application.propertyAddress,
                propertyImage: application.propertyImage,
                listingType: application.listingType === 'buy' ? 'sale' : application.listingType,
                propertyPrice: application.propertyPrice,
                senderName: user.user_metadata?.full_name || user.name || user.email,
                senderEmail: user.email,
                senderPhone: user.phone || user.user_metadata?.phone || '',
                recipientName: application.agentName || '',
                recipientEmail: application.agentEmail || '',
                recipientPhone: application.agentPhone || '',
                recipientAgency: application.agentAgency || '',
            });

            onClose();
            navigate(`/user/dashboard/messages?conversation=${conversation.id}`);
        } catch (error: any) {
            toast.error(error?.message || 'Unable to open the agent conversation right now.');
        } finally {
            setOpeningConversation(false);
        }
    };

    const uploadDocumentsPath = buildWorkspacePath('/user/dashboard/fast-track', {
        applicationId: application.id,
        caseId: application.fastTrackCaseId,
        leadId: application.leadId,
        propertyId: application.propertyId,
        section: 'documents',
    });

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            {/* Drawer */}
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Application Detail</h2>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{application.referenceId || application.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 space-y-6">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>

                    {/* Property */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                        {application.propertyImage && (
                            <img src={application.propertyImage} alt={application.propertyTitle} className="w-full h-40 object-cover" />
                        )}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{application.propertyTitle}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                                <MapPin size={14} className="text-orange-500" />
                                {application.propertyAddress}
                            </p>
                            {application.propertyPrice && (
                                <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                                    £{application.propertyPrice.toLocaleString()}
                                    <span className="text-sm font-normal text-gray-500">{application.listingType === 'rent' ? '/mo' : ''}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Agent */}
                    {application.agentName && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Agent</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <User size={14} className="text-gray-400" />
                                <span className="font-medium">{application.agentName}</span>
                                {application.agentAgency && <span className="text-gray-400">· {application.agentAgency}</span>}
                            </div>
                            {application.agentEmail && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Mail size={14} className="text-gray-400" />
                                    <span>{application.agentEmail}</span>
                                </div>
                            )}
                            {application.agentPhone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{application.agentPhone}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Appointment */}
                    {application.hasAppointment && application.appointment && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Appointment</h4>
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                                <Calendar size={16} />
                                <span>{formatDate(application.appointment.date)} at {application.appointment.time}</span>
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                            <p className="text-xs text-gray-400 mb-1">Submitted</p>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatDate(application.createdAt)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                            <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatDate(application.lastUpdated)}</p>
                        </div>
                    </div>

                    {showsSaleJourney && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Purchase Journey</p>
                                    <h4 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                                        {application.journeyLabel || getSaleJourneyStageLabel(application)}
                                    </h4>
                                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                        {getSaleJourneySummary(application.status, application.journeySummary)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-orange-900/30 dark:bg-orange-950/40">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Next milestone</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                        {nextSaleAction?.label || 'Completion recorded'}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                {nextSaleAction?.description || 'This purchase journey is already at its latest recorded stage.'}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        {application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED && (
                            <button
                                onClick={() => { onClose(); navigate(uploadDocumentsPath); }}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Upload size={18} /> Upload Documents
                            </button>
                        )}
                        <button
                            onClick={() => void handleOpenConversation()}
                            disabled={openingConversation}
                            className="w-full py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-wait disabled:opacity-70"
                        >
                            {openingConversation ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                            <span>{openingConversation ? 'Opening thread' : 'Message Agent'}</span>
                        </button>
                        {application.propertyId && (
                            <button
                                onClick={() => { onClose(); navigate(`/user/properties/${application.propertyId}`); }}
                                className="w-full py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Building2 size={18} /> View Property
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ApplicationsPage() {
    const {
        applications,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        propertyTypeFilter,
        setPropertyTypeFilter,
        dateRangeFilter,
        setDateRangeFilter,
        fetchApplications
    } = useApplications();
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [hasAppliedRouteFocus, setHasAppliedRouteFocus] = useState(false);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [fastTrackCasesReady, setFastTrackCasesReady] = useState(false);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const rawCaseId = searchParams.get('case');
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );
    const hasWorkspaceFocusRequest = Boolean(
        searchParams.get('application')
        || sanitizedCaseId
        || searchParams.get('lead')
        || searchParams.get('property'),
    );
    const focusedApplicationFromRoute = resolveFocusedApplication(applications, {
        applicationId: searchParams.get('application'),
        caseId: sanitizedCaseId,
        leadId: searchParams.get('lead'),
        propertyId: searchParams.get('property'),
    });

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

        setSelectedApplication(focusedApplicationFromRoute);
        setHasAppliedRouteFocus(true);
    }, [focusedApplicationFromRoute, hasAppliedRouteFocus]);

    const totalApplications = applications.length;
    const pendingStatusList: string[] = [
        APPLICATION_STATUS.SUBMITTED,
        APPLICATION_STATUS.UNDER_REVIEW,
        APPLICATION_STATUS.PENDING,
        APPLICATION_STATUS.OFFER_SUBMITTED,
        APPLICATION_STATUS.OFFER_UNDER_REVIEW,
        APPLICATION_STATUS.OFFER_ACCEPTED,
        APPLICATION_STATUS.SALE_AGREED,
        APPLICATION_STATUS.MEMORANDUM_ISSUED,
        APPLICATION_STATUS.CONVEYANCING,
        APPLICATION_STATUS.EXCHANGE,
    ];
    const pendingCount = applications.filter(app => pendingStatusList.includes(app.status)).length;
    const approvedCount = applications.filter(app => app.status === APPLICATION_STATUS.APPROVED).length;
    const actionRequiredCount = applications.filter(app => app.requiresAction).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {selectedApplication && (
                <ApplicationDetailDrawer
                    application={selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors group w-fit"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Applications</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your property applications in one place.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center p-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/user/search')}
                            className="flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                        >
                            <Plus size={18} />
                            <span>New Search</span>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalApplications}</p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Apps</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                                <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{approvedCount}</p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Approved</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                                <Bell className="text-orange-600 dark:text-orange-400" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{actionRequiredCount}</p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Action Required</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-8 shadow-sm">
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
                </div>

                {hasWorkspaceFocusRequest && !focusedApplicationFromRoute && (
                    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                        You are in the right application workspace for this live case, but no linked application record exists yet. It will appear here automatically as soon as the broker or manager creates it.
                    </div>
                )}

                {/* Action Required Banner */}
                {applications.some(app => app.requiresAction) && (
                    <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-start gap-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                            <AlertCircle className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Action Required</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                You have applications that require document uploads. Click on them to take action.
                            </p>
                        </div>
                    </div>
                )}

                {/* Content */}
                {isLoading ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                        {[...Array(4)].map((_, i) => (
                            <ApplicationCardSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                        <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                            <AlertCircle className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Failed to load applications</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{error}</p>
                        <button
                            onClick={() => fetchApplications()}
                            className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Try Again
                        </button>
                    </div>
                ) : applications.length > 0 ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                        {applications.map((app) => (
                            <div
                                key={app.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all cursor-pointer group overflow-hidden"
                                onClick={() => setSelectedApplication(app)}
                            >
                                <ApplicationCard
                                    application={app}
                                    onClick={() => setSelectedApplication(app)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                        <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            <FileText className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No applications found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            {searchQuery || statusFilter !== 'all' || propertyTypeFilter !== 'all'
                                ? "No applications match your filters. Try clearing them."
                                : "You haven't submitted any applications yet. Discover properties to get started."}
                        </p>
                        {!searchQuery && statusFilter === 'all' && propertyTypeFilter === 'all' && (
                            <button
                                onClick={() => navigate('/user/search')}
                                className="mt-8 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 dark:shadow-none"
                            >
                                Discover Properties
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
