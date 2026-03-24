"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileImage,
    FileText,
    Home,
    Loader2,
    Shield,
    Upload,
} from 'lucide-react';
import { FastTrackCase, getFastTrackCases } from '@/services/fastTrackService';
import { BrokerRequestRecord, Lead, getUserBrokerRequests, getUserDocuments, getUserLeads, uploadDocument, UserDocument } from '@/services/leadsService';
import FastTrackProgress from '@/components/manager/FastTrack/FastTrackProgress';
import {
    buildFastTrackVerificationContent,
    normalizeWorkspaceDocuments,
    resolveLeadStage,
} from '@/lib/fastTrackWorkflow';
import {
    buildUserFastTrackDocumentItems,
    getOutstandingDocumentNames,
    resolveUserFastTrackSelection,
} from '@/lib/userFastTrack';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';

const statusMeta: Record<FastTrackCase['finalStatus'], { label: string; tone: string; note: string }> = {
    in_progress: {
        label: 'In progress',
        tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        note: 'Your case is still inside the live 24-hour fast-track window.',
    },
    completed: {
        label: 'Completed',
        tone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        note: 'The fast-track process is complete and ready for the next operational step.',
    },
    expired: {
        label: 'Expired',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'The 24-hour window has expired, so follow-up will continue manually.',
    },
    rejected: {
        label: 'Rejected',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'This fast-track case was rejected and will not auto-progress further.',
    },
};

const formatLeadStage = (value?: string) => {
    if (!value) {
        return 'Matching nearby brokers';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDeadlineLabel = (deadline?: string) => {
    if (!deadline) {
        return '10-minute broker response';
    }

    const remainingMs = new Date(deadline).getTime() - Date.now();
    if (!Number.isFinite(remainingMs)) {
        return '10-minute broker response';
    }

    const minutes = Math.max(Math.ceil(remainingMs / 60000), 0);
    if (minutes === 0) {
        return 'Response window ending now';
    }

    return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
};

const stepDescriptions: Record<FastTrackCase['currentStep'], string> = {
    documents: 'The team is reviewing verification documents and supporting records.',
    owner_approval: 'The case is waiting for owner approval before moving forward.',
    legal_check: 'Legal and compliance checks are being completed.',
    payment_ready: 'The case is in final readiness for handoff.',
    completed: 'Everything required for this fast-track case is complete.',
};

export default function UserFastTrackPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [brokerRequests, setBrokerRequests] = useState<BrokerRequestRecord[]>([]);
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(searchParams.get('case'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadingType, setUploadingType] = useState<'identity' | 'address' | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const identityUploadInputRef = useRef<HTMLInputElement | null>(null);
    const addressUploadInputRef = useRef<HTMLInputElement | null>(null);

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const [casesResult, leadsResult, documentsResult, brokerRequestsResult] = await Promise.all([
            getFastTrackCases(),
            getUserLeads(),
            getUserDocuments(),
            getUserBrokerRequests(),
        ]);

        if (casesResult.data) {
            setCases(casesResult.data);
        }

        if (leadsResult.data) {
            setLeads(leadsResult.data);
        }

        setUserDocuments(normalizeWorkspaceDocuments(documentsResult.data, documentsResult.error));
        setBrokerRequests(brokerRequestsResult.data || []);

        const requestError = casesResult.error || leadsResult.error || documentsResult.error || brokerRequestsResult.error;
        if (casesResult.data || leadsResult.data) {
            setError(null);
            setUploadError(null);
            setSelectedCaseId((previous) => resolveUserFastTrackSelection(
                casesResult.data || [],
                searchParams.get('case'),
                searchParams.get('lead'),
                previous,
            ));
        } else if (!silent) {
            setError(requestError || 'Unable to load your fast-track cases.');
        }

        if (!silent) {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        const refreshCases = () => {
            void fetchCases(true);
        };

        const interval = window.setInterval(refreshCases, 5000);
        window.addEventListener('focus', refreshCases);
        document.addEventListener('visibilitychange', refreshCases);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshCases);
            document.removeEventListener('visibilitychange', refreshCases);
        };
    }, [fetchCases]);

    useEffect(() => {
        if (!selectedCaseId) {
            if (!searchParams.get('case')) {
                return;
            }
            setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.delete('case');
                return next;
            });
            return;
        }

        if (searchParams.get('case') === selectedCaseId) {
            return;
        }

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('case', selectedCaseId);
            next.delete('lead');
            return next;
        });
    }, [searchParams, selectedCaseId, setSearchParams]);

    const selectedCase = useMemo(
        () => cases.find((item) => item.caseId === selectedCaseId) || cases[0] || null,
        [cases, selectedCaseId],
    );

    const selectedLead = useMemo(
        () => leads.find((item) => item.id === selectedCase?.leadId || item.property_id === selectedCase?.propertyId) || null,
        [leads, selectedCase?.leadId, selectedCase?.propertyId],
    );

    const stats = useMemo(() => ({
        active: cases.filter((item) => item.finalStatus === 'in_progress').length,
        completed: cases.filter((item) => item.finalStatus === 'completed').length,
        attention: cases.filter((item) => item.finalStatus === 'expired' || item.finalStatus === 'rejected').length,
    }), [cases]);
    const matchedPriorityRequest = useMemo(
        () => brokerRequests.find((item) => (
            item.fast_track_enabled
            && (item.dispatch_status === 'broker_matched' || item.status === 'matched' || Boolean(item.matched_broker))
        )) || null,
        [brokerRequests],
    );
    const activePriorityRequest = useMemo(
        () => brokerRequests.find((item) => (
            item.fast_track_enabled
            && item.dispatch_status !== 'expired'
            && item.status !== 'expired'
        )) || null,
        [brokerRequests],
    );

    const requestedDocumentItems = useMemo(
        () => buildUserFastTrackDocumentItems(selectedCase?.documents || {
            identityProof: 'pending',
            addressProof: 'pending',
        }, userDocuments),
        [selectedCase?.documents, userDocuments],
    );
    const verificationContent = useMemo(
        () => buildFastTrackVerificationContent(
            requestedDocumentItems.map((item) => ({
                id: item.id,
                title: item.title,
                status: item.status === 'requested' ? 'missing' : item.status,
                statusLabel: item.statusLabel,
                fileName: item.fileName,
                reason: item.reason,
                reviewedAt: item.reviewedAt,
            })),
        ),
        [requestedDocumentItems],
    );
    const selectedLeadStage = formatLeadStage(resolveLeadStage(selectedLead, userDocuments));
    const selectedLeadDeadline = formatDeadlineLabel(selectedLead?.response_deadline_at || selectedLead?.sla_deadline);
    const selectedLeadBroker = selectedLead?.matched_broker?.name || selectedLead?.matched_broker?.company_name || selectedLead?.matched_broker_id || 'No broker matched yet';
    const uploadActionItems = useMemo(
        () => requestedDocumentItems.filter((item) => item.status === 'requested' || item.status === 'reupload_required'),
        [requestedDocumentItems],
    );
    const outstandingDocumentNames = useMemo(
        () => getOutstandingDocumentNames(requestedDocumentItems),
        [requestedDocumentItems],
    );
    const selectedLeadDocuments = selectedLead?.documents_requested || selectedLead?.documents_uploaded || selectedLead?.documents_verified
        ? verificationContent.documentsLabel
        : 'No pending document request';
    const documentRequestLabel = outstandingDocumentNames.length > 0
        ? outstandingDocumentNames.join(', ')
        : 'Identity proof and address proof';
    const showRequestedDocumentsPanel = Boolean(
        selectedCase && (
            selectedLead?.documents_requested
            || selectedLead?.documents_uploaded
            || selectedLead?.documents_verified
            || selectedCase.finalStatus === 'in_progress'
        ),
    );

    const handleUploadDocument = useCallback(async (type: 'identity' | 'address', file: File) => {
        if (!selectedLead?.id) {
            return;
        }

        setUploadError(null);
        setUploadingType(type);
        const result = await uploadDocument(type, file, { leadId: selectedLead.id });
        setUploadingType(null);

        if (!result.success || result.error) {
            setUploadError(result.error || 'Unable to upload the requested document right now.');
            return;
        }

        await fetchCases(true);
    }, [fetchCases, selectedLead?.id]);

    const handleBannerUpload = useCallback(async (
        type: 'identity' | 'address',
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        event.currentTarget.value = '';
        if (!file) {
            return;
        }

        await handleUploadDocument(type, file);
    }, [handleUploadDocument]);

    const openUploadPicker = useCallback((type: 'identity' | 'address') => {
        const target = type === 'identity' ? identityUploadInputRef.current : addressUploadInputRef.current;
        target?.click();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">24-Hour Fast Track</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track every live case, 10-minute broker response, document checkpoint, and stage update in one place.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active cases</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs attention</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.attention}</p>
                    </div>
                </div>

                {loading && cases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-orange-500">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your fast-track cases...</p>
                    </div>
                ) : error ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 p-10 text-center">
                        <AlertTriangle className="mx-auto text-red-500 mb-4" size={36} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Unable to load fast-track cases</h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        <button
                            onClick={() => void fetchCases()}
                            className="mt-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
                        <Clock className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {matchedPriorityRequest ? 'Property handoff is still pending' : 'No fast-track cases yet'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {matchedPriorityRequest
                                ? 'Your broker is matched, but the 24-hour property fast-track has not started yet. It begins only after property options are shared and you choose one.'
                                : activePriorityRequest
                                    ? 'Your live broker request is active. A 24-hour fast-track case will appear here only after a specific property is shared and selected.'
                                    : 'Start a 24-hour fast-track case from a selected property and it will appear here automatically.'}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            {(matchedPriorityRequest || activePriorityRequest) ? (
                                <button
                                    onClick={() => navigate(buildBrokerRequestWorkspacePath((matchedPriorityRequest || activePriorityRequest)?.id))}
                                    className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-3 transition-colors"
                                >
                                    Open broker workspace
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/user/search')}
                                    className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold px-5 py-3 transition-colors"
                                >
                                    Explore properties
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/user/dashboard/messages')}
                                className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                Open messages
                            </button>
                        </div>
                    </div>
                ) : selectedCase ? (
                    <div className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="space-y-4">
                            {cases.map((item) => {
                                const meta = statusMeta[item.finalStatus];
                                const isSelected = item.caseId === selectedCase.caseId;
                                return (
                                    <button
                                        key={item.caseId}
                                        type="button"
                                        onClick={() => setSelectedCaseId(item.caseId)}
                                        className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                            isSelected
                                                ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-500/10 dark:border-orange-800 dark:bg-orange-950/20'
                                                : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-900/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.propertyTitle}</p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Case {item.caseId}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.tone}`}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {item.finalStatus === 'in_progress' ? `${item.hoursRemaining}h remaining` : meta.note}
                                        </div>
                                    </button>
                                );
                            })}
                        </aside>

                        <section className="space-y-6">
                            <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</h2>
                                            <span className="px-2.5 py-0.5 text-xs rounded-full font-medium border bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-200">
                                                {selectedCase.propertyType.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Submitted {new Date(selectedCase.submittedAt).toLocaleString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${statusMeta[selectedCase.finalStatus].tone}`}>
                                        {selectedCase.finalStatus === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                        <span>
                                            {selectedCase.finalStatus === 'in_progress'
                                                ? `${selectedCase.hoursRemaining}h remaining`
                                                : statusMeta[selectedCase.finalStatus].label}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
                                    {statusMeta[selectedCase.finalStatus].note}
                                </div>

                                {selectedLead && (
                                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/20 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Live window</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadDeadline}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Stage</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadStage}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Matched broker</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadBroker}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Documents</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadDocuments}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedLead?.documents_requested && (
                                    <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/80 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Document request</p>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                            {selectedLeadBroker} asked for {documentRequestLabel}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            Upload the requested files from this case below. The live stage updates here as soon as the documents are submitted.
                                        </p>
                                        <div className="mt-3 rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-orange-900/30 dark:bg-black/20 dark:text-gray-200">
                                            {verificationContent.summary}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {uploadActionItems.length > 0 ? (
                                                uploadActionItems.map((item) => (
                                                    <button
                                                        key={`${item.id}-banner-action`}
                                                        type="button"
                                                        onClick={() => openUploadPicker(item.uploadType)}
                                                        disabled={!selectedLead?.id || uploadingType === item.uploadType}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
                                                    >
                                                        <Upload size={15} />
                                                        <span>
                                                            {uploadingType === item.uploadType ? 'Uploading...' : item.actionLabel === 'Upload replacement'
                                                                ? `Re-upload ${item.title}`
                                                                : `Upload ${item.title}`}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                                                    All requested documents are uploaded. The case is now waiting for manager review.
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={identityUploadInputRef}
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            disabled={!selectedLead?.id || uploadingType === 'identity'}
                                            onChange={(event) => void handleBannerUpload('identity', event)}
                                        />
                                        <input
                                            ref={addressUploadInputRef}
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            disabled={!selectedLead?.id || uploadingType === 'address'}
                                            onChange={(event) => void handleBannerUpload('address', event)}
                                        />
                                    </div>
                                )}

                                {selectedLead?.documents_requested && selectedCase.propertyId && (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            onClick={() => navigate(`/user/properties/${selectedCase.propertyId}?fast-track=1`)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                        >
                                            Open property workspace
                                        </button>
                                        <button
                                            onClick={() => navigate(`/user/dashboard/fast-track?case=${selectedCase.caseId}`)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            Refresh live status
                                        </button>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <FastTrackProgress currentStep={selectedCase.currentStep} />
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Clock size={16} className="text-orange-500" />
                                            <p className="font-semibold">Current stage</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{stepDescriptions[selectedCase.currentStep]}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Shield size={16} className="text-blue-500" />
                                            <p className="font-semibold">Document progress</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {Object.values(selectedCase.documents).filter((status) => status === 'verified').length} of {Object.keys(selectedCase.documents).length} required items are verified.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <FileText size={16} className="text-indigo-500" />
                                            <p className="font-semibold">Next action</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedLead?.documents_requested
                                                ? `Upload ${documentRequestLabel} from this case so ${selectedLeadBroker} can continue the live review.`
                                                : 'If documents are requested or re-uploads are needed, upload them from this case instead of using profile settings.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Shield className="text-orange-500" size={20} />
                                        <h3 className="text-lg font-semibold">
                                            {selectedLead?.documents_requested ? 'Requested documents' : 'Document checklist'}
                                        </h3>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        {selectedLead?.documents_requested
                                            ? 'Upload the requested files directly from this case. The manager will see them in the same live workflow.'
                                            : 'Your verification file status stays visible here for this fast-track case.'}
                                    </p>

                                    {showRequestedDocumentsPanel && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {requestedDocumentItems.map((item) => (
                                                <span
                                                    key={`${item.id}-pill`}
                                                    className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300"
                                                >
                                                    {item.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-5 space-y-3">
                                        {requestedDocumentItems.map((item) => {
                                            const isUploading = uploadingType === item.uploadType;
                                            const badgeTone = item.status === 'verified'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300'
                                                : item.status === 'reupload_required'
                                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300'
                                                    : item.status === 'uploaded'
                                                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300'
                                                        : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300';

                                            return (
                                                <label
                                                    key={item.id}
                                                    className="block cursor-pointer rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/60 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-orange-900/40"
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        disabled={!selectedLead?.id || isUploading}
                                                        onChange={async (event) => {
                                                            const file = event.target.files?.[0];
                                                            event.currentTarget.value = '';
                                                            if (!file) {
                                                                return;
                                                            }

                                                            await handleUploadDocument(item.uploadType, file);
                                                        }}
                                                    />
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
                                                                    <FileImage size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.hint}</p>
                                                                </div>
                                                            </div>
                                                            <p className="mt-3 truncate text-sm text-gray-600 dark:text-gray-300">
                                                                {item.fileName || 'No file uploaded yet'}
                                                            </p>
                                                            {item.reason && (
                                                                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                                                                    Reason: {item.reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone}`}>
                                                            {isUploading ? <Loader2 size={13} className="animate-spin" /> : item.statusLabel}
                                                        </span>
                                                    </div>
                                                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-300">
                                                        <Upload size={15} />
                                                        <span>{item.actionLabel}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {uploadError && (
                                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                                            {uploadError}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Home className="text-blue-500" size={20} />
                                        <h3 className="text-lg font-semibold">Quick links</h3>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        <button
                                            onClick={() => navigate(`/user/dashboard/fast-track?case=${selectedCase.caseId}`)}
                                            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-3 transition-colors"
                                        >
                                            Open live workspace
                                        </button>
                                        <button
                                            onClick={() => navigate('/user/dashboard/messages')}
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            Open messages
                                        </button>
                                        {selectedCase.propertyId && (
                                            <button
                                                onClick={() => navigate(`/user/properties/${selectedCase.propertyId}?fast-track=1`)}
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                            >
                                                Open property workspace
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
