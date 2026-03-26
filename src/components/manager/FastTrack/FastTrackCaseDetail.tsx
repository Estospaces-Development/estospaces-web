"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Home,
    MessageSquare,
    Shield,
    TimerReset,
    User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { messagesService } from '@/services/messagesService';
import { FastTrackCase, FastTrackStep } from '@/services/fastTrackService';
import { isFastTrackCaseOverdue } from '@/lib/fastTrackWorkflow';
import {
    FastTrackLinkedJourney,
    formatWorkflowStatusLabel,
    resolveFastTrackPrimaryLaneLabel,
} from '@/lib/fastTrackLinkedJourney';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import FastTrackActions from './FastTrackActions';
import FastTrackDocuments from './FastTrackDocuments';
import FastTrackProgress from './FastTrackProgress';

interface FastTrackCaseDetailProps {
    caseData: FastTrackCase;
    onClose: () => void;
    onUpdate: (updatedCase: FastTrackCase) => void;
    verificationSummary?: string;
    verificationReasonLines?: string[];
    leadStatusLabel?: string;
    linkedJourney?: FastTrackLinkedJourney;
    onOpenVerificationReview?: () => void;
    onRequestDocuments?: () => void;
    isRequestingDocuments?: boolean;
    isDocumentsVerifiedOverride?: boolean;
}

const stepCopy: Record<FastTrackStep, { label: string; description: string }> = {
    property_selected: {
        label: 'Property selected',
        description: 'The user has chosen a property and the live fast-track is now bound to that exact listing.',
    },
    documents_requested: {
        label: 'Documents requested',
        description: 'The client has been asked for verification documents before the viewing and review can continue.',
    },
    documents_verified: {
        label: 'Documents verified',
        description: 'The verification checklist is complete and the real viewing flow should be scheduled next.',
    },
    viewing_scheduled: {
        label: 'Viewing scheduled',
        description: 'A real viewing has been booked and the appointments workflow now owns the next update.',
    },
    viewing_completed: {
        label: 'Viewing completed',
        description: 'The viewing is complete and the application or sale review can now continue.',
    },
    application_in_review: {
        label: 'Application in review',
        description: 'Use the linked application flow to approve, reject, or continue the deal review.',
    },
    ready_for_contract: {
        label: 'Ready for contract',
        description: 'The tenancy agreement can now be created for approved rent deals.',
    },
    completed: {
        label: 'Completed',
        description: 'The fast-track workflow is complete and ready for next-step execution.',
    },
};

const statusCopy: Record<FastTrackCase['finalStatus'], { label: string; tone: string; note: string }> = {
    in_progress: {
        label: 'In progress',
        tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        note: 'This case is still inside the 24-hour response window.',
    },
    completed: {
        label: 'Completed',
        tone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        note: 'The fast-track workflow has been completed successfully.',
    },
    expired: {
        label: 'Expired',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'The 24-hour window has elapsed, so the case needs manual follow-up.',
    },
    rejected: {
        label: 'Rejected',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'The case was actively rejected and should not continue automatically.',
    },
};

const formatViewingSlot = (value?: string | null) => {
    if (!value) {
        return 'No viewing is linked yet';
    }

    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const FastTrackCaseDetail: React.FC<FastTrackCaseDetailProps> = ({
    caseData,
    onClose,
    onUpdate,
    verificationSummary,
    verificationReasonLines = [],
    leadStatusLabel,
    linkedJourney,
    onOpenVerificationReview,
    onRequestDocuments,
    isRequestingDocuments = false,
    isDocumentsVerifiedOverride,
}) => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuth();
    const [isOpeningConversation, setIsOpeningConversation] = useState(false);
    const [overrideReasonDraft, setOverrideReasonDraft] = useState(caseData.overrideReason || '');
    const applicationsWorkspacePath = buildWorkspacePath('/manager/applications', {
        applicationId: linkedJourney?.application?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    });
    const contractsWorkspacePath = buildWorkspacePath('/manager/contracts', {
        contractId: linkedJourney?.contract?.id,
        applicationId: linkedJourney?.application?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    });

    useEffect(() => {
        setOverrideReasonDraft(caseData.overrideReason || '');
    }, [caseData.caseId, caseData.overrideReason]);

    const stepMeta = stepCopy[caseData.currentStep];
    const statusMeta = statusCopy[caseData.finalStatus];
    const verifiedCount = useMemo(
        () => Object.values(caseData.documents).filter((status) => status === 'verified').length,
        [caseData.documents],
    );
    const totalDocuments = useMemo(() => Object.keys(caseData.documents).length, [caseData.documents]);
    const isOverdue = isFastTrackCaseOverdue(caseData);
    const isExpired = caseData.finalStatus === 'expired';
    const isClosed = caseData.finalStatus === 'completed' || isExpired || caseData.finalStatus === 'rejected';
    const submittedLabel = new Date(caseData.submittedAt).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const propertyPath = caseData.propertyId
        ? user?.role === 'admin'
            ? `/admin/properties/${caseData.propertyId}`
            : `/manager/dashboard/properties/${caseData.propertyId}`
        : '';
    const senderName = user?.name || user?.user_metadata?.full_name || user?.email || 'Estospaces team';
    const senderEmail = user?.email || '';
    const senderPhone = user?.phone || user?.user_metadata?.phone || '';
    const senderAgency = user?.user_metadata?.agency || (user?.role === 'admin' ? 'Estospaces' : '');
    const isDocumentsVerified = typeof isDocumentsVerifiedOverride === 'boolean'
        ? isDocumentsVerifiedOverride
        : Object.values(caseData.documents).every((status) => status === 'verified');
    const displayStatusTone = isOverdue
        ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
        : statusMeta.tone;
    const displayStatusLabel = caseData.finalStatus === 'in_progress'
        ? (isOverdue ? 'Overdue' : `${caseData.hoursRemaining}h remaining`)
        : statusMeta.label;
    const displayStatusNote = caseData.statusReason || (isOverdue
        ? 'The 24-hour target has elapsed, but this case stays active until a manager completes or rejects it.'
        : statusMeta.note);
    const displayWindowLabel = caseData.finalStatus === 'in_progress'
        ? (isOverdue ? 'Overdue' : `${caseData.hoursRemaining} hours left`)
        : statusMeta.label;
    const displayWindowNote = isOverdue
        ? 'The timer is now an attention signal only. Managers can still continue the workflow from this screen.'
        : 'SLA visibility stays tied to the actual 24-hour countdown from submission time.';
    const linkedWorkflowCards = useMemo(() => {
        const rentJourney = caseData.journeyType !== 'buy';

        return [
            {
                title: rentJourney ? 'Application lane' : 'Offer and sale lane',
                value: linkedJourney
                    ? resolveFastTrackPrimaryLaneLabel(caseData.journeyType, linkedJourney)
                    : 'Not created yet',
                detail: linkedJourney?.primarySummary || (
                    rentJourney
                        ? 'No linked application has been surfaced on this case yet.'
                        : 'No linked offer or sale progression has been surfaced on this case yet.'
                ),
            },
            {
                title: 'Viewing',
                value: linkedJourney?.viewing
                    ? formatWorkflowStatusLabel(linkedJourney.viewing.status)
                    : 'Not scheduled yet',
                detail: linkedJourney?.viewing
                    ? formatViewingSlot(linkedJourney.viewing.scheduled_at)
                    : 'Schedule the real appointment so the fast-track case can move into attended review.',
            },
            {
                title: rentJourney ? 'Contract handoff' : 'Completion handoff',
                value: rentJourney
                    ? (linkedJourney?.contract
                        ? formatWorkflowStatusLabel(linkedJourney.contract.status)
                        : 'No contract drafted yet')
                    : (linkedJourney?.saleProgression
                        ? formatWorkflowStatusLabel(linkedJourney.saleProgression.current_stage)
                        : 'Legal progression not started'),
                detail: rentJourney
                    ? (linkedJourney?.contract
                        ? 'The tenancy contract is now the completion record for this case.'
                        : 'Contracts appear here after the rental application is approved.')
                    : (linkedJourney?.saleProgression
                        ? linkedJourney.nextStep
                        : 'Purchase journeys continue through the live sale progression, not tenancy contracts.'),
            },
        ];
    }, [caseData.journeyType, linkedJourney]);

    const advanceStep = () => {
        if (isClosed) {
            return;
        }

        if (caseData.currentStep !== 'documents_requested') {
            return;
        }

        if (!isDocumentsVerified && !overrideReasonDraft.trim()) {
            return;
        }
        onUpdate({
            ...caseData,
            currentStep: 'documents_verified',
            finalStatus: caseData.finalStatus,
            overrideReason: overrideReasonDraft.trim() || caseData.overrideReason,
        });
    };

    const handleOpenConversation = async () => {
        if (!caseData.clientId) {
            toast.error('This case does not have a linked client conversation yet.');
            return;
        }

        setIsOpeningConversation(true);
        try {
            const conversation = await messagesService.upsertDirectConversation(caseData.clientId, {
                propertyId: caseData.propertyId,
                propertyTitle: caseData.propertyTitle,
                senderName,
                senderEmail,
                senderPhone,
                senderAgency,
                recipientName: caseData.clientName,
            });

            const basePath = user?.role === 'admin' ? '/admin/chat' : '/manager/messages';
            navigate(`${basePath}?conversation=${conversation.id}`);
        } catch (error: any) {
            toast.error(error?.message || 'Unable to open the client thread right now.');
        } finally {
            setIsOpeningConversation(false);
        }
    };

    const handleOpenProperty = () => {
        if (!propertyPath) {
            return;
        }

        window.open(propertyPath, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex h-full flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-md z-10 rounded-t-2xl">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                aria-label="Close fast-track case detail"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{caseData.propertyTitle}</h2>
                                    <span className="px-2.5 py-0.5 text-xs rounded-full font-medium border bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-200">
                                        {caseData.propertyType.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Case {caseData.caseId} · Submitted {submittedLabel}
                                </p>
                            </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold ${displayStatusTone}`}>
                            {caseData.finalStatus === 'completed' ? (
                                <CheckCircle2 size={18} />
                            ) : isOverdue || isExpired || caseData.finalStatus === 'rejected' ? (
                                <AlertTriangle size={18} />
                            ) : (
                                <Clock size={18} className="animate-pulse" />
                            )}
                            <span>{displayStatusLabel}</span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/40 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {displayStatusNote}
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                    <div className="space-y-6">
                        <section className="bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <TimerReset className="text-orange-500" size={20} />
                                <h3 className="text-lg font-semibold">Live workflow status</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                The manager and admin views now follow the real backend stages only.
                            </p>

                            <FastTrackProgress currentStep={caseData.currentStep} />

                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Current stage</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{stepMeta.label}</p>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caseData.statusReason || stepMeta.description}</p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Documents</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                        {verifiedCount} / {totalDocuments} verified
                                    </p>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Keep the checklist current so downstream steps reflect the real case state.
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Window</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{displayWindowLabel}</p>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        {displayWindowNote}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <Shield className="text-orange-500" size={20} />
                                <h3 className="text-lg font-semibold">Document checklist</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Uploaded files are reviewed from the real verification workspace. This panel mirrors the live checklist only.
                            </p>
                            {caseData.overrideReason ? (
                                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Manager override active</p>
                                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{caseData.overrideReason}</p>
                                    {caseData.overrideAt ? (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Logged {new Date(caseData.overrideAt).toLocaleString('en-GB')}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className="mt-4">
                                <FastTrackDocuments
                                    documents={caseData.documents}
                                />
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Verification status</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                        {verificationSummary || 'Awaiting user uploads'}
                                    </p>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        {leadStatusLabel || 'The lead timeline stays aligned with the latest user verification activity.'}
                                    </p>
                                    {verificationReasonLines.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {verificationReasonLines.map((line) => (
                                                <div
                                                    key={line}
                                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs leading-5 text-gray-600 dark:border-zinc-700 dark:bg-black dark:text-gray-300"
                                                >
                                                    {line}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {onOpenVerificationReview ? (
                                        <button
                                            type="button"
                                            onClick={onOpenVerificationReview}
                                            className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-left transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-900/10 dark:hover:bg-orange-900/20"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Action</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">Review uploaded documents</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Open the tenant verification workspace, approve files, or request replacements without leaving the fast-track flow.
                                            </p>
                                        </button>
                                    ) : (
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Admin verification</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">User verification is admin-only</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Managers can monitor status here, but document approval happens from the admin verification queue.
                                            </p>
                                        </div>
                                    )}
                                    {onRequestDocuments ? (
                                        <button
                                            type="button"
                                            onClick={onRequestDocuments}
                                            disabled={isRequestingDocuments}
                                            className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-900/40 dark:bg-blue-900/10 dark:hover:bg-blue-900/20"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Follow-up</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                                {isRequestingDocuments ? 'Sending document request...' : 'Request documents from this case'}
                                            </p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Trigger the user upload request directly from the fast-track detail, even if the lead has already moved past the first response stage.
                                            </p>
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <User className="text-blue-500" size={20} />
                                <h3 className="text-lg font-semibold">Client handoff</h3>
                            </div>
                            <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Client</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{caseData.clientName}</p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Use the real message thread instead of the old placeholder actions, so all follow-up stays traceable.
                                </p>
                            </div>

                            <div className="mt-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => void handleOpenConversation()}
                                    disabled={isOpeningConversation}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 transition-colors"
                                >
                                    <MessageSquare size={18} />
                                    {isOpeningConversation ? 'Opening thread...' : 'Open message thread'}
                                </button>

                                {propertyPath && (
                                    <button
                                        type="button"
                                        onClick={handleOpenProperty}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <Home size={18} />
                                        View property in new tab
                                    </button>
                                )}
                            </div>
                        </section>

                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileText className="text-indigo-500" size={20} />
                                <h3 className="text-lg font-semibold">Linked journey records</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Keep the fast-track case aligned with the real downstream records instead of switching tabs blindly.
                            </p>
                            <div className="mt-4 space-y-3">
                                {linkedWorkflowCards.map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 p-4"
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{item.title}</p>
                                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 grid gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(applicationsWorkspacePath)}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                >
                                    <FileText size={18} />
                                    Open applications workspace
                                </button>
                                {caseData.journeyType !== 'buy' ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(contractsWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <Shield size={18} />
                                        Open contracts workspace
                                    </button>
                                ) : null}
                            </div>
                        </section>

                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileText className="text-indigo-500" size={20} />
                                <h3 className="text-lg font-semibold">Workflow actions</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Move the case only when the checklist and decision state match the real record.
                            </p>
                            <div className="mt-4">
                                <FastTrackActions
                                    currentStep={caseData.currentStep}
                                    onAdvance={advanceStep}
                                    isDocumentsVerified={isDocumentsVerified}
                                    isReadOnly={isClosed}
                                    nextAction={caseData.nextAction}
                                    statusReason={caseData.statusReason}
                                    pendingRequirements={caseData.pendingRequirements}
                                    completedRequirements={caseData.completedRequirements}
                                    overrideReason={overrideReasonDraft}
                                    onOverrideReasonChange={setOverrideReasonDraft}
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FastTrackCaseDetail;
