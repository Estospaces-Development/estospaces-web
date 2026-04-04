'use client';

import React, { useMemo } from 'react';
import {
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileImage,
    Loader2,
    MessageCircle,
    ShieldCheck,
    Upload,
    X,
} from 'lucide-react';
import { FastTrackCase } from '@/services/fastTrackService';
import { Lead, UserDocument } from '@/services/leadsService';
import FastTrackProgress from '@/components/manager/FastTrack/FastTrackProgress';
import {
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    deriveLiveFastTrackDocumentPhase,
    deriveLiveFastTrackCurrentStep,
    filterDocumentsForLead,
    resolveLeadStage,
    shouldBlockFastTrackWorkspaceRefresh,
} from '@/lib/fastTrackWorkflow';

type UploadType = 'identity' | 'address';

interface PropertyFastTrackModalProps {
    open: boolean;
    propertyTitle: string;
    propertyAddress: string;
    lead: Lead | null;
    fastTrackCase: FastTrackCase | null;
    userDocuments: UserDocument[];
    isRefreshing: boolean;
    uploadingType: UploadType | null;
    onClose: () => void;
    onUploadDocument: (type: UploadType, file: File) => Promise<void>;
    onOpenDashboard: () => void;
    onOpenMessages: () => void;
}

const formatLeadLabel = (value?: string) => {
    if (!value) {
        return 'Active lead';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
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

const formatDocumentStatus = (value?: string) => {
    if (!value) {
        return {
            label: 'Upload needed',
            className: 'border-stone-200 bg-stone-100 text-gray-600',
        };
    }

    const normalized = value.toLowerCase();
    if (normalized === 'approved' || normalized === 'verified') {
        return {
            label: 'Verified',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }

    if (normalized === 'rejected' || normalized === 'reupload_required') {
        return {
            label: 'Needs replacement',
            className: 'border-red-200 bg-red-50 text-red-700',
        };
    }

    if (normalized === 'missing' || normalized === 'requested') {
        return {
            label: 'Upload needed',
            className: 'border-stone-200 bg-stone-100 text-gray-600',
        };
    }

    return {
        label: 'In review',
        className: 'border-orange-200 bg-orange-50 text-orange-700',
    };
};

const formatWindowLabel = (lead: Lead | null, fastTrackCase: FastTrackCase | null) => {
    if (lead?.documents_requested) {
        return 'Documents requested';
    }

    if (lead?.matched_broker || lead?.matched_broker_id) {
        return 'Broker matched';
    }

    if (typeof lead?.response_deadline_at === 'string') {
        const remainingMs = new Date(lead.response_deadline_at).getTime() - Date.now();
        if (Number.isFinite(remainingMs)) {
            const remainingMinutes = Math.max(Math.ceil(remainingMs / 60000), 0);
            if (remainingMinutes > 0) {
                return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} left`;
            }
            return 'Response window ending now';
        }
    }

    if (fastTrackCase) {
        if (fastTrackCase.finalStatus === 'completed') {
            return 'Completed';
        }

        if (fastTrackCase.finalStatus === 'expired') {
            return 'Expired';
        }

        if (fastTrackCase.finalStatus === 'rejected') {
            return 'Rejected';
        }

        return `${Math.max(fastTrackCase.hoursRemaining, 0)}h remaining`;
    }

    if (typeof lead?.sla_remaining_seconds === 'number' && lead.sla_remaining_seconds > 0) {
        return `${Math.max(Math.ceil(lead.sla_remaining_seconds / 60), 1)} min broker SLA`;
    }

    if (lead?.first_response_at) {
        return 'Broker replied';
    }

    return '10-minute live response';
};

const buildRoadmap = (
    lead: Lead | null,
    fastTrackCase: FastTrackCase | null,
    hasIdentityDocument: boolean,
    hasAddressDocument: boolean,
) => {
    const documentPhase = fastTrackCase?.documentPhase || (
        lead?.documents_verified
            ? 'verified'
            : lead?.documents_requested || fastTrackCase?.currentStep === 'documents_requested'
                ? 'waiting_for_upload'
                : 'not_requested'
    );
    const documentRequestStarted = (
        documentPhase !== 'not_requested'
        || lead?.documents_requested
        || lead?.documents_uploaded
        || lead?.documents_verified
    );
    const hasUploadedDocuments = (
        documentPhase === 'uploaded_under_review'
        || documentPhase === 'replacement_required'
        || lead?.documents_uploaded
        || hasIdentityDocument
        || hasAddressDocument
    );
    const documentsCleared = (
        lead?.documents_verified
        || documentPhase === 'verified'
        || fastTrackCase?.currentStep === 'documents_verified'
        || fastTrackCase?.currentStep === 'viewing_scheduled'
        || fastTrackCase?.currentStep === 'viewing_completed'
        || fastTrackCase?.currentStep === 'application_in_review'
        || fastTrackCase?.currentStep === 'ready_for_contract'
        || fastTrackCase?.currentStep === 'completed'
    );
    const activeIndex = (() => {
        if (fastTrackCase?.finalStatus === 'completed') {
            return 4;
        }

        if (fastTrackCase?.currentStep === 'ready_for_contract') {
            return 4;
        }

        if (fastTrackCase?.currentStep === 'application_in_review' || fastTrackCase?.currentStep === 'viewing_completed') {
            return 3;
        }

        if (
            fastTrackCase?.currentStep === 'viewing_scheduled'
            || fastTrackCase?.currentStep === 'documents_verified'
            || fastTrackCase?.currentStep === 'documents_requested'
            || hasUploadedDocuments
            || documentRequestStarted
        ) {
            return 2;
        }

        if (
            fastTrackCase?.currentStep === 'property_selected'
            || lead?.broker_request_id
            || lead?.first_response_at
            || lead?.response_type
            || lead?.sla_status === 'success'
        ) {
            return 1;
        }

        return 0;
    })();

    const currentReviewLabel =
        fastTrackCase?.currentStep === 'viewing_completed'
            ? 'The viewing is done and the application review is now taking over.'
            : fastTrackCase?.currentStep === 'application_in_review'
                ? 'The linked application or sale decision is under review.'
                : fastTrackCase?.currentStep === 'ready_for_contract'
                    ? 'The case is cleared for the final contract or completion handoff.'
                    : 'The broker and operations team take over after documents are ready.';

    return [
        {
            title: 'Lead is live',
            description: lead?.lead_number
                ? `Lead ${lead.lead_number} is active for this property.`
                : 'Your fast-track request is active on this property.',
        },
        {
            title: 'Property is selected',
            description: fastTrackCase || lead?.broker_request_id
                ? 'This property is now the active selection for the live fast-track journey.'
                : 'The broker response window is still being tracked live.',
        },
        {
            title: 'Documents and identity',
            description: documentsCleared
                ? 'Identity and legal compliance evidence is verified.'
                : hasUploadedDocuments
                    ? 'Supporting files are uploaded and waiting for review.'
                    : documentRequestStarted
                        ? 'Upload ID and address proof to keep the case moving smoothly.'
                        : 'The manager will request verification documents when this selected property moves into document review.',
        },
        {
            title: 'Viewing and review',
            description: currentReviewLabel,
        },
        {
            title: 'Ready for next step',
            description: fastTrackCase?.finalStatus === 'completed'
                ? 'The fast-track path is complete.'
                : 'Once review clears, the team can move into the final handoff stage.',
        },
    ].map((item, index) => {
        let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (index < activeIndex) {
            state = 'completed';
        } else if (index === activeIndex) {
            state = 'current';
        }

        return { ...item, state };
    });
};

export default function PropertyFastTrackModal({
    open,
    propertyTitle,
    propertyAddress,
    lead,
    fastTrackCase,
    userDocuments,
    isRefreshing,
    uploadingType,
    onClose,
    onUploadDocument,
    onOpenDashboard,
    onOpenMessages,
}: PropertyFastTrackModalProps) {
    const leadScopedDocuments = useMemo(
        () => filterDocumentsForLead(userDocuments, fastTrackCase?.leadId || lead?.id),
        [fastTrackCase?.leadId, lead?.id, userDocuments],
    );
    const documentItems = useMemo(
        () => buildFastTrackDocumentItems(
            leadScopedDocuments,
            fastTrackCase?.documents || {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        [fastTrackCase?.documents, leadScopedDocuments],
    );
    const verificationContent = useMemo(
        () => buildFastTrackVerificationContent(documentItems),
        [documentItems],
    );
    const latestDocuments = useMemo(() => ({
        identity: documentItems.find((item) => item.id === 'identity') || null,
        address: documentItems.find((item) => item.id === 'address') || null,
    }), [documentItems]);
    const resolvedLeadStage = useMemo(
        () => resolveLeadStage(lead, leadScopedDocuments),
        [lead, leadScopedDocuments],
    );
    const liveFastTrackCase = useMemo(
        () => fastTrackCase
            ? {
                ...fastTrackCase,
                currentStep: deriveLiveFastTrackCurrentStep(
                    fastTrackCase.currentStep,
                    leadScopedDocuments,
                    fastTrackCase.documents || {
                        identityProof: 'pending',
                        addressProof: 'pending',
                    },
                ),
                documentPhase: deriveLiveFastTrackDocumentPhase(
                    leadScopedDocuments,
                    fastTrackCase.documents || {
                        identityProof: 'pending',
                        addressProof: 'pending',
                    },
                    {
                        currentStep: fastTrackCase.currentStep,
                        backendPhase: fastTrackCase.documentPhase,
                    },
                ),
            }
            : null,
        [fastTrackCase, leadScopedDocuments],
    );

    const roadmap = useMemo(
        () => buildRoadmap(
            lead,
            liveFastTrackCase,
            Boolean(latestDocuments.identity && latestDocuments.identity.status !== 'missing'),
            Boolean(latestDocuments.address && latestDocuments.address.status !== 'missing'),
        ),
        [lead, latestDocuments.address, latestDocuments.identity, liveFastTrackCase],
    );

    const leadStatusLabel = formatLeadStage(resolvedLeadStage);
    const leadStageLabel = formatLeadStage(resolvedLeadStage);
    const windowLabel = (() => {
        if (resolvedLeadStage === 'approved') {
            return 'Documents verified';
        }
        if (resolvedLeadStage === 'under_review' || resolvedLeadStage === 'docs_uploaded') {
            return 'Under review';
        }
        if (resolvedLeadStage === 'docs_requested') {
            return 'Documents requested';
        }

        return formatWindowLabel(lead, liveFastTrackCase);
    })();
    const verificationLabel = liveFastTrackCase?.documentPhase === 'not_requested'
        ? 'Not requested'
        : verificationContent.verificationLabel;
    const matchedBrokerLabel = lead?.matched_broker?.name || lead?.matched_broker?.company_name || lead?.matched_broker_id || 'No broker matched yet';
    const dispatchLabel = formatLeadStage(
        lead?.dispatch_status || (lead?.matched_broker || lead?.matched_broker_id ? 'broker_matched' : 'matching'),
    );
    const documentsLabel = liveFastTrackCase?.documentPhase === 'not_requested'
        ? 'Documents not requested yet'
        : verificationContent.documentsLabel;
    const showBlockingRefresh = isRefreshing && shouldBlockFastTrackWorkspaceRefresh(lead, fastTrackCase, leadScopedDocuments);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[150] bg-[rgba(15,23,42,0.68)] px-4 py-5 backdrop-blur-sm sm:px-6" onClick={onClose}>
            <div
                className="mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[#fcfbf8] shadow-[0_32px_120px_-48px_rgba(15,23,42,0.55)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">24-hour fast track</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2.1rem]">
                            Live progress for {propertyTitle}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                            {propertyAddress}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                                10-minute live response
                            </span>
                            <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                                {leadStageLabel}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                                {documentsLabel}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
                        aria-label="Close fast-track dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    {showBlockingRefresh ? (
                        <div className="flex h-full min-h-[20rem] items-center justify-center text-orange-500">
                            <Loader2 className="h-9 w-9 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isRefreshing && (
                                <div className="flex justify-end">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 shadow-sm">
                                        <Loader2 size={14} className="animate-spin text-orange-500" />
                                        Syncing live status
                                    </div>
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                            <CalendarClock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Live window</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{windowLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Lead status</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{leadStatusLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Verification</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{verificationLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Dispatch</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{dispatchLabel}</p>
                                </div>
                                <div className="rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Matched broker</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{matchedBrokerLabel}</p>
                                </div>
                                <div className="rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Documents</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{documentsLabel}</p>
                                </div>
                            </div>

                            <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Live status reason</p>
                                <p className="mt-2 text-base font-semibold text-gray-900">{verificationContent.summary}</p>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {verificationContent.reasonLines.map((line) => (
                                        <div
                                            key={line}
                                            className="rounded-[1.2rem] border border-stone-200/80 bg-stone-50 px-4 py-3 text-sm leading-6 text-gray-600"
                                        >
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {fastTrackCase && (
                                <div className="rounded-[1.9rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Roadmap</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-900">
                                                Case {fastTrackCase.caseId}
                                            </p>
                                        </div>
                                        <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                                            {formatLeadLabel(fastTrackCase.finalStatus)}
                                        </div>
                                    </div>
                                    <div className="mt-5">
                                        <FastTrackProgress currentStep={liveFastTrackCase?.currentStep || fastTrackCase.currentStep} />
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                <section className="rounded-[1.9rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Stage roadmap</p>
                                    <div className="mt-5 space-y-4">
                                        {roadmap.map((item, index) => {
                                            const tone =
                                                item.state === 'completed'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : item.state === 'current'
                                                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                                                        : 'border-stone-200 bg-stone-50 text-gray-400';

                                            return (
                                                <div key={item.title} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${tone}`}>
                                                            {item.state === 'completed' ? <CheckCircle2 size={18} /> : <span className="text-sm font-semibold">{index + 1}</span>}
                                                        </div>
                                                        {index < roadmap.length - 1 && (
                                                            <div className="mt-2 h-10 w-px bg-stone-200" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 pb-3">
                                                        <p className="text-base font-semibold text-gray-900">{item.title}</p>
                                                        <p className="mt-1 text-sm leading-6 text-gray-500">{item.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="rounded-[1.9rem] border border-stone-200/80 bg-[#faf7f2] px-5 py-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Shared workspace</p>
                                            <h3 className="mt-2 text-lg font-semibold text-gray-900">Finish documents from the live case</h3>
                                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                                This modal now keeps the status visible, but the actual uploads and review steps live in the main fast-track workspace so there is only one document flow to follow.
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                            <ArrowUpRight size={18} />
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {documentItems.map((item) => {
                                            const status = formatDocumentStatus(item.status);

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="rounded-[1.5rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                                                    <FileImage size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                                                        {item.id === 'identity'
                                                                            ? 'Passport, driver licence, or national ID'
                                                                            : 'Bank statement, utility bill, or tenancy proof'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="mt-3 truncate text-sm text-gray-600">
                                                                {item.fileName || 'No file uploaded yet'}
                                                            </p>
                                                            {item.reason && (
                                                                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                                                                    Reason: {item.reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                                                            {status.label}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onOpenDashboard}
                                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.4rem] bg-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                                    >
                                        <Upload size={16} />
                                        Open shared document workspace
                                    </button>

                                    <div className="mt-4 rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 text-sm leading-6 text-gray-600 shadow-sm">
                                        Uploading the requested identity and legal compliance evidence still helps the fast-track team verify the case faster, but now it all happens from the same live workspace.
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 border-t border-stone-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={onOpenMessages}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50"
                    >
                        <MessageCircle size={16} />
                        <span>Open message thread</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenDashboard}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                    >
                        <span>Open live workspace</span>
                        <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
