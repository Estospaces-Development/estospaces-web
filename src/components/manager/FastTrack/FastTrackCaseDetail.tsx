"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Home,
    Loader2,
    MessageSquare,
    Shield,
    TimerReset,
    User,
    XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { messagesService } from '@/services/messagesService';
import { FastTrackCase, FastTrackStep } from '@/services/fastTrackService';
import { bookingsService } from '@/services/bookingsService';
import { updateSaleProgression } from '@/services/salesService';
import Modal from '@/components/ui/Modal';
import { isEnglandJurisdiction, isFastTrackCaseOverdue } from '@/lib/fastTrackWorkflow';
import {
    FastTrackLinkedJourney,
    formatWorkflowStatusLabel,
    resolveFastTrackPrimaryLaneLabel,
} from '@/lib/fastTrackLinkedJourney';
import {
    getPurchaseWorkspaceLabel,
    hasPendingRentFinanceTasks,
    resolveFastTrackStageGuidance,
} from '@/lib/fastTrackStageGuidance';
import { getNextSaleJourneyActions, saleProgressionStageForStatus } from '@/lib/saleJourney';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import type { WorkspaceSection } from '@/lib/liveCaseWorkspace';
import {
    getManagerSaleProgressionGuard,
    getManagerViewingActionGuard,
    type ManagerWorkflowActionGuard,
} from '@/lib/managerWorkflowGuards';
import Avatar from '@/components/ui/Avatar';
import CaseFileWorkspace from '@/components/case-file/CaseFileWorkspace';
import FastTrackActions from './FastTrackActions';
import FastTrackDocuments from './FastTrackDocuments';
import FastTrackProgress from './FastTrackProgress';

interface FastTrackCaseDetailProps {
    caseData: FastTrackCase;
    onClose: () => void;
    onUpdate: (updatedCase: FastTrackCase) => void;
    onRefresh?: () => void;
    verificationSummary?: string;
    verificationReasonLines?: string[];
    leadStatusLabel?: string;
    linkedJourney?: FastTrackLinkedJourney;
    workspaceSection?: WorkspaceSection;
    onOpenVerificationReview?: () => void;
    onRequestDocuments?: () => void;
    canRequestDocuments?: boolean;
    isRequestingDocuments?: boolean;
    isDocumentsVerifiedOverride?: boolean;
    isRefreshing?: boolean;
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

const toDateInputValue = (value?: string | null) => {
    const parsed = new Date(value || '');
    if (Number.isNaN(parsed.getTime())) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 10);
    }

    return parsed.toISOString().slice(0, 10);
};

const toTimeInputValue = (value?: string | null) => {
    const parsed = new Date(value || '');
    if (Number.isNaN(parsed.getTime())) {
        return '10:00';
    }

    return parsed.toISOString().slice(11, 16);
};

const toSaleProgressionStage = (
    stage: NonNullable<ReturnType<typeof saleProgressionStageForStatus>>,
): Parameters<typeof updateSaleProgression>[1] | null => {
    switch (stage) {
        case 'offer':
            return 'offer_submitted';
        case 'offer_submitted':
        case 'offer_under_review':
        case 'offer_accepted':
        case 'sale_agreed':
        case 'memorandum_issued':
        case 'conveyancing':
        case 'exchange':
        case 'completion':
            return stage;
        default:
            return null;
    }
};

const FastTrackCaseDetail: React.FC<FastTrackCaseDetailProps> = ({
    caseData,
    onClose,
    onUpdate,
    onRefresh,
    verificationSummary,
    verificationReasonLines = [],
    leadStatusLabel,
    linkedJourney,
    workspaceSection = 'overview',
    onOpenVerificationReview,
    onRequestDocuments,
    canRequestDocuments = false,
    isRequestingDocuments = false,
    isDocumentsVerifiedOverride,
    isRefreshing = false,
}) => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuth();
    const [isOpeningConversation, setIsOpeningConversation] = useState(false);
    const [overrideReasonDraft, setOverrideReasonDraft] = useState(caseData.overrideReason || '');
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [actingViewingAction, setActingViewingAction] = useState<string | null>(null);
    const [actingSaleAction, setActingSaleAction] = useState<string | null>(null);
    const isAdminWorkspace = user?.role === 'admin';
    const [scheduleForm, setScheduleForm] = useState({
        requested_date: toDateInputValue(),
        requested_time: '10:00',
        user_notes: '',
    });
    const [rescheduleForm, setRescheduleForm] = useState({
        requested_date: toDateInputValue(linkedJourney?.viewing?.scheduled_at),
        requested_time: toTimeInputValue(linkedJourney?.viewing?.scheduled_at),
        manager_notes: linkedJourney?.viewing?.manager_notes || '',
    });
    const applicationsWorkspacePath = !isAdminWorkspace ? buildWorkspacePath('/manager/applications', {
        applicationId: linkedJourney?.application?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    }) : null;
    const appointmentsWorkspacePath = !isAdminWorkspace ? buildWorkspacePath('/manager/appointments', {
        viewingId: linkedJourney?.viewing?.id,
        applicationId: linkedJourney?.application?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    }) : null;
    const fastTrackDocumentsPath = buildWorkspacePath(isAdminWorkspace ? '/admin/fast-track' : '/manager/fast-track', {
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
        applicationId: linkedJourney?.application?.id,
        section: 'documents',
    });
    const caseFileWorkspacePath = !isAdminWorkspace ? buildWorkspacePath('/manager/case-files', {
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
        section: 'documents',
    }) : null;
    const contractsWorkspacePath = !isAdminWorkspace ? buildWorkspacePath('/manager/contracts', {
        contractId: linkedJourney?.contract?.id,
        applicationId: linkedJourney?.application?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    }) : null;
    const billingWorkspacePath = !isAdminWorkspace ? buildWorkspacePath('/manager/billing', {
        applicationId: linkedJourney?.application?.id,
        contractId: linkedJourney?.contract?.id,
        paymentId: linkedJourney?.payments[0]?.id,
        invoiceId: linkedJourney?.invoices[0]?.id,
        caseId: caseData.caseId,
        leadId: caseData.leadId,
        propertyId: caseData.propertyId,
    }) : null;

    useEffect(() => {
        setOverrideReasonDraft(caseData.overrideReason || '');
    }, [caseData.caseId, caseData.overrideReason]);

    useEffect(() => {
        setScheduleForm({
            requested_date: toDateInputValue(),
            requested_time: '10:00',
            user_notes: linkedJourney?.viewing?.user_notes || '',
        });
        setRescheduleForm({
            requested_date: toDateInputValue(linkedJourney?.viewing?.scheduled_at),
            requested_time: toTimeInputValue(linkedJourney?.viewing?.scheduled_at),
            manager_notes: linkedJourney?.viewing?.manager_notes || '',
        });
    }, [caseData.caseId, linkedJourney?.viewing?.id, linkedJourney?.viewing?.manager_notes, linkedJourney?.viewing?.scheduled_at, linkedJourney?.viewing?.user_notes]);

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
    const documentPhase = caseData.documentPhase || (isDocumentsVerified ? 'verified' : caseData.currentStep === 'documents_requested' ? 'waiting_for_upload' : 'not_requested');
    const englandRentJourney = caseData.journeyType !== 'buy' && isEnglandJurisdiction(caseData.jurisdiction || caseData.propertyCountry);
    const hasPendingFinanceTasks = caseData.journeyType !== 'buy' && hasPendingRentFinanceTasks(linkedJourney);
    const stepMeta = (() => {
        const base = stepCopy[caseData.currentStep];

        if (caseData.journeyType === 'buy') {
            const canShowLiveBuyHeadline = (
                Boolean(linkedJourney?.primaryHeadline)
                && !['property_selected', 'documents_requested', 'documents_verified', 'viewing_scheduled'].includes(caseData.currentStep)
            );
            if (canShowLiveBuyHeadline) {
                return {
                    label: linkedJourney?.primaryHeadline || base.label,
                    description: linkedJourney?.primarySummary || base.description,
                };
            }
            if (caseData.currentStep === 'application_in_review') {
                return {
                    label: 'Proof of funds and offer',
                    description: 'The purchase flow should now move through proof of funds, MIP review, and the live offer stage.',
                };
            }
            if (caseData.currentStep === 'ready_for_contract') {
                return {
                    label: 'Legal completion',
                    description: 'The purchase flow is now in memorandum, conveyancing, exchange, or completion handoff.',
                };
            }
            return base;
        }

        if (caseData.currentStep === 'application_in_review') {
            return {
                label: englandRentJourney ? 'Referencing and Right to Rent' : 'Referencing and compliance',
                description: englandRentJourney
                    ? 'The rent journey is in post-viewing referencing and England Right to Rent review.'
                    : 'The rent journey is in post-viewing referencing and jurisdiction-specific compliance review.',
            };
        }

        if (caseData.currentStep === 'ready_for_contract') {
            if (hasPendingFinanceTasks) {
                return {
                    label: 'Deposit and first-rent tasks',
                    description: 'The tenancy agreement is in place, and the remaining live blockers are deposit protection and first-rent tasks.',
                };
            }

            return {
                label: 'Tenancy agreement and signatures',
                description: 'The rent journey is approved and is now moving through tenancy paperwork and signatures.',
            };
        }

        return base;
    })();
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
    const currentStageDescription = linkedJourney?.primarySummary
        || caseData.statusReason
        || caseData.journeyStatusReason
        || stepMeta.description;
    const journeyBlockers = linkedJourney?.blockers?.length
        ? linkedJourney.blockers
        : (caseData.blockers || []);
    const journeyDeadlines = linkedJourney?.deadlines?.length
        ? linkedJourney.deadlines
        : (caseData.deadlines || []);
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
    const viewingStatus = String(linkedJourney?.viewing?.status || '').toLowerCase();
    const viewingLocked = Boolean(linkedJourney?.viewing?.workflow_locked);
    const scheduleViewingGuard = getManagerViewingActionGuard({
        action: 'schedule_viewing',
        documentsVerified: isDocumentsVerified,
        hasViewing: Boolean(linkedJourney?.viewing),
        isClosed,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const confirmViewingGuard = getManagerViewingActionGuard({
        action: 'confirm_viewing',
        documentsVerified: isDocumentsVerified,
        hasViewing: Boolean(linkedJourney?.viewing),
        viewingLocked,
        viewingLockReason: linkedJourney?.viewing?.workflow_lock_reason,
        viewingStatus,
        isClosed,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const rescheduleViewingGuard = getManagerViewingActionGuard({
        action: 'reschedule_viewing',
        documentsVerified: isDocumentsVerified,
        hasViewing: Boolean(linkedJourney?.viewing),
        viewingLocked,
        viewingLockReason: linkedJourney?.viewing?.workflow_lock_reason,
        viewingStatus,
        isClosed,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const completeViewingGuard = getManagerViewingActionGuard({
        action: 'complete_viewing',
        documentsVerified: isDocumentsVerified,
        hasViewing: Boolean(linkedJourney?.viewing),
        viewingLocked,
        viewingLockReason: linkedJourney?.viewing?.workflow_lock_reason,
        viewingStatus,
        isClosed,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const cancelViewingGuard = getManagerViewingActionGuard({
        action: 'cancel_viewing',
        documentsVerified: isDocumentsVerified,
        hasViewing: Boolean(linkedJourney?.viewing),
        viewingLocked,
        viewingLockReason: linkedJourney?.viewing?.workflow_lock_reason,
        viewingStatus,
        isClosed,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const canScheduleViewing = scheduleViewingGuard.canRun;
    const canConfirmViewing = confirmViewingGuard.canRun;
    const canRescheduleViewing = rescheduleViewingGuard.canRun;
    const canCompleteViewing = completeViewingGuard.canRun;
    const canCancelViewing = cancelViewingGuard.canRun;
    const rentJourney = caseData.journeyType !== 'buy';
    const purchaseWorkspaceLabel = getPurchaseWorkspaceLabel(linkedJourney);
    const nextStageGuidance = resolveFastTrackStageGuidance({
        currentStep: caseData.currentStep,
        journeyType: caseData.journeyType,
        linkedJourney,
        canScheduleViewing,
        hasPendingFinanceTasks,
    });
    const nextStageWorkspacePath = nextStageGuidance?.target === 'appointments'
        ? appointmentsWorkspacePath
        : nextStageGuidance?.target === 'applications'
            ? applicationsWorkspacePath
            : nextStageGuidance?.target === 'contracts'
                ? contractsWorkspacePath
                : nextStageGuidance?.target === 'billing'
                    ? billingWorkspacePath
                    : null;
    const saleProgressionActions = !rentJourney && linkedJourney?.saleProgression
        ? getNextSaleJourneyActions(linkedJourney.saleProgression.current_stage).reduce<Array<{
            status: string;
            label: string;
            description: string;
            stage: NonNullable<ReturnType<typeof saleProgressionStageForStatus>>;
        }>>((accumulator, action) => {
            const stage = saleProgressionStageForStatus(action.status);
            if (stage) {
                accumulator.push({ ...action, stage });
            }
            return accumulator;
        }, [])
        : [];
    const primaryViewingGuard = linkedJourney?.viewing
        ? (viewingStatus === 'confirmed'
            ? completeViewingGuard
            : ['pending', 'rescheduled'].includes(viewingStatus)
                ? confirmViewingGuard
                : rescheduleViewingGuard)
        : scheduleViewingGuard;
    const saleProgressionGuard = getManagerSaleProgressionGuard({
        hasSaleProgression: Boolean(linkedJourney?.saleProgression),
        canProgressFromFastTrack: saleProgressionActions.length > 0,
        isRefreshing,
        blockers: linkedJourney?.blockers,
    });
    const managerWorkflowRequestOptions = { suppressErrorToast: true } as const;

    const resolveWorkflowGuardPath = (guard: ManagerWorkflowActionGuard) => {
        switch (guard.target) {
            case 'appointments':
                return appointmentsWorkspacePath;
            case 'applications':
                return applicationsWorkspacePath;
            case 'documents':
                return fastTrackDocumentsPath;
            default:
                return null;
        }
    };

    const renderWorkflowGuardBanner = (guard: ManagerWorkflowActionGuard, key: string) => {
        if (guard.status === 'ready') {
            return null;
        }

        const targetPath = resolveWorkflowGuardPath(guard);
        return (
            <div
                key={key}
                className={`rounded-2xl border p-4 ${
                    guard.status === 'unavailable'
                        ? 'border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20'
                }`}
            >
                <p className={`text-sm font-semibold ${
                    guard.status === 'unavailable'
                        ? 'text-red-700 dark:text-red-200'
                        : 'text-amber-700 dark:text-amber-200'
                }`}
                >
                    {guard.title}
                </p>
                <p className={`mt-2 text-sm leading-6 ${
                    guard.status === 'unavailable'
                        ? 'text-red-600 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                }`}
                >
                    {guard.description}
                </p>
                {targetPath ? (
                    <button
                        type="button"
                        onClick={() => navigate(targetPath)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
                    >
                        {guard.actionLabel || 'Open workspace'}
                    </button>
                ) : null}
            </div>
        );
    };

    const runViewingAction = async (actionKey: string, action: () => Promise<void>, successMessage: string) => {
        setActingViewingAction(actionKey);
        try {
            await action();
            toast.success(successMessage);
            await onRefresh?.();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to update this viewing right now.');
        } finally {
            setActingViewingAction(null);
        }
    };

    const runSaleProgressionAction = async (actionKey: string, action: () => Promise<void>, successMessage: string) => {
        setActingSaleAction(actionKey);
        try {
            await action();
            toast.success(successMessage);
            await onRefresh?.();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to update the purchase stage right now.');
        } finally {
            setActingSaleAction(null);
        }
    };

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

    const handleScheduleViewing = async () => {
        if (!scheduleViewingGuard.canRun) {
            toast.error(scheduleViewingGuard.description);
            return;
        }

        const managerId = caseData.managerId || user?.id;
        if (!managerId) {
            toast.error('This case does not have a manager assigned for scheduling yet.');
            return;
        }
        if (!scheduleForm.requested_date || !scheduleForm.requested_time) {
            toast.error('Choose a viewing date and time first.');
            return;
        }

        await runViewingAction(
            'schedule',
            async () => {
                await bookingsService.createViewing({
                    property_id: caseData.propertyId,
                    manager_id: managerId,
                    lead_id: caseData.leadId,
                    fast_track_case_id: caseData.id,
                    client_name: caseData.clientName,
                    property_title: caseData.propertyTitle,
                    listing_type: caseData.listingType || caseData.propertyType,
                    requested_date: scheduleForm.requested_date,
                    requested_time: scheduleForm.requested_time,
                    user_notes: scheduleForm.user_notes,
                }, managerWorkflowRequestOptions);
                setScheduleModalOpen(false);
            },
            'Viewing scheduled successfully.',
        );
    };

    const handleConfirmViewing = async () => {
        if (!linkedJourney?.viewing?.id) {
            return;
        }
        if (!confirmViewingGuard.canRun) {
            toast.error(confirmViewingGuard.description);
            return;
        }

        await runViewingAction(
            'confirm',
            () => bookingsService.confirmViewing(linkedJourney.viewing!.id, managerWorkflowRequestOptions),
            'Viewing confirmed successfully.',
        );
    };

    const handleRescheduleViewing = async () => {
        if (!linkedJourney?.viewing?.id) {
            return;
        }
        if (!rescheduleViewingGuard.canRun) {
            toast.error(rescheduleViewingGuard.description);
            return;
        }
        if (!rescheduleForm.requested_date || !rescheduleForm.requested_time) {
            toast.error('Choose the new date and time first.');
            return;
        }

        await runViewingAction(
            'reschedule',
            async () => {
                await bookingsService.updateViewing(linkedJourney.viewing!.id, {
                    requested_date: rescheduleForm.requested_date,
                    requested_time: rescheduleForm.requested_time,
                    manager_notes: rescheduleForm.manager_notes,
                }, managerWorkflowRequestOptions);
                setRescheduleModalOpen(false);
            },
            'Viewing rescheduled successfully.',
        );
    };

    const handleCompleteViewing = async () => {
        if (!linkedJourney?.viewing?.id) {
            return;
        }
        if (!completeViewingGuard.canRun) {
            toast.error(completeViewingGuard.description);
            return;
        }

        await runViewingAction(
            'complete',
            () => bookingsService.updateViewing(
                linkedJourney.viewing!.id,
                { status: 'completed' },
                managerWorkflowRequestOptions,
            ).then(() => undefined),
            'Viewing marked as completed.',
        );
    };

    const handleCancelViewing = async () => {
        if (!linkedJourney?.viewing?.id) {
            return;
        }
        if (!cancelViewingGuard.canRun) {
            toast.error(cancelViewingGuard.description);
            return;
        }

        await runViewingAction(
            'cancel',
            () => bookingsService.cancelViewing(
                linkedJourney.viewing!.id,
                'Cancelled by manager',
                managerWorkflowRequestOptions,
            ),
            'Viewing cancelled successfully.',
        );
    };

    const handleSaleProgressionUpdate = async (
        nextStage: NonNullable<ReturnType<typeof saleProgressionStageForStatus>>,
        successMessage: string,
    ) => {
        if (!linkedJourney?.saleProgression?.id) {
            return;
        }

        const progressionStage = toSaleProgressionStage(nextStage);
        const nextStageGuard = getManagerSaleProgressionGuard({
            hasSaleProgression: Boolean(linkedJourney?.saleProgression),
            canProgressFromFastTrack: Boolean(progressionStage),
            isRefreshing,
            blockers: linkedJourney?.blockers,
        });
        if (!progressionStage) {
            toast.error(nextStageGuard.description);
            return;
        }
        if (!nextStageGuard.canRun) {
            toast.error(nextStageGuard.description);
            return;
        }

        await runSaleProgressionAction(
            progressionStage,
            async () => {
                const result = await updateSaleProgression(
                    linkedJourney.saleProgression!.id,
                    progressionStage,
                    undefined,
                    managerWorkflowRequestOptions,
                );
                if (result.error || !result.data) {
                    throw new Error(result.error || 'Unable to update the purchase stage right now.');
                }
            },
            successMessage,
        );
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
                                    Case {caseData.caseId} - Submitted {submittedLabel}
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
                <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
                    <div className="space-y-6">
                        <section className="bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <TimerReset className="text-orange-500" size={20} />
                                <h3 className="text-lg font-semibold">Live workflow status</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                The manager and admin views now follow the real backend stages only.
                            </p>

                            <FastTrackProgress currentStep={caseData.currentStep} journeyType={caseData.journeyType} />

                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Current stage</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{stepMeta.label}</p>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{currentStageDescription}</p>
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
                                <h3 className="text-lg font-semibold">Document summary</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                This snapshot stays useful for quick triage, and the full shared case workspace now sits directly below it for live document work.
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
                                    {nextStageGuidance?.target === 'schedule_viewing' ? (
                                        <button
                                            type="button"
                                            onClick={() => setScheduleModalOpen(true)}
                                            className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Next stage</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{nextStageGuidance.title}</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                {nextStageGuidance.description}
                                            </p>
                                        </button>
                                    ) : nextStageGuidance && nextStageWorkspacePath ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(nextStageWorkspacePath)}
                                            className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Next stage</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{nextStageGuidance.title}</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                {nextStageGuidance.description}
                                            </p>
                                        </button>
                                    ) : nextStageGuidance ? (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Next stage</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{nextStageGuidance.title}</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                {nextStageGuidance.description}
                                            </p>
                                        </div>
                                    ) : documentPhase === 'uploaded_under_review' && onOpenVerificationReview ? (
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
                                    ) : documentPhase === 'replacement_required' && onOpenVerificationReview ? (
                                        <button
                                            type="button"
                                            onClick={onOpenVerificationReview}
                                            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left transition hover:border-red-300 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Action</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">Request replacement</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                A document needs a replacement. Open the review workspace to confirm what still needs to be re-uploaded.
                                            </p>
                                        </button>
                                    ) : documentPhase === 'waiting_for_upload' ? (
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Waiting</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">Waiting for user upload</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Documents have been requested. The next stage starts automatically once the user uploads the files for review.
                                            </p>
                                        </div>
                                    ) : documentPhase === 'not_requested' ? (
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Verification</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">Documents not requested yet</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Keep the case at property selected until you explicitly request the user's verification documents.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Admin verification</p>
                                            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">User verification is admin-only</p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Managers can monitor status here, but document approval happens from the admin verification queue.
                                            </p>
                                        </div>
                                    )}
                                    {onRequestDocuments && canRequestDocuments ? (
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
                                                Trigger the user upload request while the case is still in the live response stage.
                                            </p>
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </section>
                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Shield className="text-orange-500" size={20} />
                                        <h3 className="text-lg font-semibold">Shared case workspace</h3>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Requests, uploads, review controls, tasks, and case activity now stay in this fast-track workspace so the manager can work the case end to end from one place.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(fastTrackDocumentsPath)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700"
                                    >
                                        <FileText size={18} />
                                        Open documents here
                                    </button>
                                    {caseFileWorkspacePath ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(caseFileWorkspacePath)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                                        >
                                            <FileText size={18} />
                                            Open secondary case-file page
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-6">
                                <CaseFileWorkspace
                                    role="manager"
                                    caseId={caseData.caseId}
                                    embedded
                                    appearance="manager"
                                    layout="stacked"
                                    initialTab="documents"
                                    requestedSection={workspaceSection === 'activity' ? 'activity' : workspaceSection === 'journey' ? 'journey' : 'documents'}
                                    workflowStageOverride={caseData.currentStep}
                                    workflowSummaryOverride={currentStageDescription}
                                />
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
                                <div className="mt-3 flex items-center gap-3">
                                    <Avatar
                                        userId={caseData.clientId}
                                        name={caseData.clientName}
                                        size="lg"
                                    />
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{caseData.clientName}</p>
                                </div>
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
                                {applicationsWorkspacePath ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(applicationsWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <FileText size={18} />
                                        {rentJourney ? 'Open applications workspace' : purchaseWorkspaceLabel}
                                    </button>
                                ) : null}
                                {caseFileWorkspacePath ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(caseFileWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <FileText size={18} />
                                        Open shared case file
                                    </button>
                                ) : null}
                                {appointmentsWorkspacePath ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(appointmentsWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <CalendarClock size={18} />
                                        Open appointments workspace
                                    </button>
                                ) : null}
                                {caseData.journeyType !== 'buy' && contractsWorkspacePath ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(contractsWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <Shield size={18} />
                                        Open contracts workspace
                                    </button>
                                ) : null}
                                {billingWorkspacePath ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(billingWorkspacePath)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <Shield size={18} />
                                        Open billing workspace
                                    </button>
                                ) : null}
                            </div>
                        </section>

                        {(journeyBlockers.length > 0 || journeyDeadlines.length > 0) ? (
                            <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                                <div className="flex items-start gap-3 text-gray-900 dark:text-white">
                                    <AlertTriangle className="mt-0.5 text-orange-500" size={20} />
                                    <div>
                                        <h3 className="text-lg font-semibold">Case watchlist</h3>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Keep blockers and deadline signals readable here instead of squeezing them into narrow side cards.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    {journeyBlockers.length > 0 ? (
                                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/30 dark:bg-orange-950/20">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">Active blockers</p>
                                                <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-black dark:text-orange-200">
                                                    {journeyBlockers.length}
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {journeyBlockers.slice(0, 3).map((item) => (
                                                    <div key={item.code} className="rounded-2xl border border-orange-200 bg-white px-4 py-4 dark:border-orange-900/30 dark:bg-black">
                                                        <div className="flex items-start gap-3">
                                                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-200">
                                                                <AlertTriangle size={16} />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-base font-semibold leading-6 text-orange-700 dark:text-orange-100">{item.title}</p>
                                                                {item.description ? (
                                                                    <p className="mt-2 text-sm leading-6 text-orange-600 dark:text-orange-300">{item.description}</p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {journeyDeadlines.length > 0 ? (
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">Compliance deadlines</p>
                                                <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-black dark:text-blue-200">
                                                    {journeyDeadlines.length}
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {journeyDeadlines.slice(0, 3).map((item) => (
                                                    <div key={item.code} className="rounded-2xl border border-blue-200 bg-white px-4 py-4 dark:border-blue-900/30 dark:bg-black">
                                                        <div className="flex items-start gap-3">
                                                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                                                                <Clock size={16} />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-base font-semibold leading-6 text-blue-700 dark:text-blue-100">{item.label}</p>
                                                                <p className="mt-2 text-sm leading-6 text-blue-600 dark:text-blue-300">
                                                                    {item.due_at ? new Date(item.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Deadline pending'}
                                                                    {item.status ? ` - ${item.status.replace(/_/g, ' ')}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                        ) : null}

                        <section className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileText className="text-indigo-500" size={20} />
                                <h3 className="text-lg font-semibold">Workflow actions</h3>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Move the case only when the checklist and decision state match the real record.
                            </p>
                            <div className="mt-4 grid gap-3">
                                {renderWorkflowGuardBanner(primaryViewingGuard, 'viewing-guard')}
                                {canScheduleViewing ? (
                                    <button
                                        type="button"
                                        onClick={() => setScheduleModalOpen(true)}
                                        disabled={actingViewingAction !== null || !scheduleViewingGuard.canRun}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {actingViewingAction === 'schedule' ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}
                                        Schedule viewing
                                    </button>
                                ) : null}
                                {linkedJourney?.viewing ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {appointmentsWorkspacePath ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(appointmentsWorkspacePath)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                                            >
                                                <CalendarClock size={18} />
                                                Open appointment
                                            </button>
                                        ) : null}
                                        {canConfirmViewing ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleConfirmViewing()}
                                                disabled={actingViewingAction !== null || !confirmViewingGuard.canRun}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {actingViewingAction === 'confirm' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                Confirm viewing
                                            </button>
                                        ) : null}
                                        {canRescheduleViewing ? (
                                            <button
                                                type="button"
                                                onClick={() => setRescheduleModalOpen(true)}
                                                disabled={actingViewingAction !== null || !rescheduleViewingGuard.canRun}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                                            >
                                                <CalendarClock size={18} />
                                                Reschedule
                                            </button>
                                        ) : null}
                                        {canCompleteViewing ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleCompleteViewing()}
                                                disabled={actingViewingAction !== null || !completeViewingGuard.canRun}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-950/20"
                                            >
                                                {actingViewingAction === 'complete' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                Mark completed
                                            </button>
                                        ) : null}
                                        {canCancelViewing ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleCancelViewing()}
                                                disabled={actingViewingAction !== null || !cancelViewingGuard.canRun}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20"
                                            >
                                                {actingViewingAction === 'cancel' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                                Cancel viewing
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                                {!rentJourney && linkedJourney?.saleProgression ? (
                                    <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                                        {renderWorkflowGuardBanner(saleProgressionGuard, 'sale-guard')}
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Purchase stage controls</p>
                                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                            {formatWorkflowStatusLabel(linkedJourney.saleProgression.current_stage)}
                                        </p>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {linkedJourney.primarySummary}
                                        </p>
                                        {saleProgressionActions.length > 0 ? (
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                {saleProgressionActions.map((action) => (
                                                    <button
                                                        key={action.stage}
                                                        type="button"
                                                        onClick={() => void handleSaleProgressionUpdate(action.stage, `${action.label} saved.`)}
                                                        disabled={actingSaleAction !== null || !saleProgressionGuard.canRun}
                                                        className="rounded-xl border border-violet-200 bg-white px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/40 dark:bg-black dark:hover:bg-violet-950/20"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                                {action.label}
                                                            </span>
                                                            {actingSaleAction === action.stage ? (
                                                                <Loader2 size={18} className="animate-spin text-violet-500" />
                                                            ) : (
                                                                <CheckCircle2 size={18} className="text-violet-500" />
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                                            {action.description}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                                This purchase journey is already at its latest recorded stage from the dashboard.
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                                {!rentJourney && !linkedJourney?.saleProgression && ['buyer_qualification', 'offer'].includes(String(linkedJourney?.liveStage || '')) ? (
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                                        Buyer qualification is the current live stage. Open the purchase workspace to clear proof of funds, AML, and record the first offer before sale-stage controls appear here.
                                    </div>
                                ) : null}
                            </div>
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
            <Modal
                isOpen={scheduleModalOpen}
                onClose={() => {
                    if (!actingViewingAction) {
                        setScheduleModalOpen(false);
                    }
                }}
                title="Schedule viewing"
                size="md"
                closeOnBackdrop={!actingViewingAction}
                footer={(
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setScheduleModalOpen(false)}
                            disabled={actingViewingAction !== null}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleScheduleViewing()}
                            disabled={actingViewingAction !== null || !scheduleViewingGuard.canRun}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actingViewingAction === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create appointment
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{caseData.propertyTitle}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{caseData.clientName}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Date</span>
                            <input
                                type="date"
                                value={scheduleForm.requested_date}
                                onChange={(event) => setScheduleForm((previous) => ({ ...previous, requested_date: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                            <input
                                type="time"
                                value={scheduleForm.requested_time}
                                onChange={(event) => setScheduleForm((previous) => ({ ...previous, requested_time: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                        </label>
                    </div>
                    <label className="block space-y-2 text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Notes for the client</span>
                        <textarea
                            rows={4}
                            value={scheduleForm.user_notes}
                            onChange={(event) => setScheduleForm((previous) => ({ ...previous, user_notes: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            placeholder="Share arrival details, documents to bring, or access instructions."
                        />
                    </label>
                </div>
            </Modal>
            <Modal
                isOpen={rescheduleModalOpen}
                onClose={() => {
                    if (!actingViewingAction) {
                        setRescheduleModalOpen(false);
                    }
                }}
                title="Reschedule viewing"
                size="md"
                closeOnBackdrop={!actingViewingAction}
                footer={(
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setRescheduleModalOpen(false)}
                            disabled={actingViewingAction !== null}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRescheduleViewing()}
                            disabled={actingViewingAction !== null || !rescheduleViewingGuard.canRun}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actingViewingAction === 'reschedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save reschedule
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{caseData.propertyTitle}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{caseData.clientName}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Date</span>
                            <input
                                type="date"
                                value={rescheduleForm.requested_date}
                                onChange={(event) => setRescheduleForm((previous) => ({ ...previous, requested_date: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                            <input
                                type="time"
                                value={rescheduleForm.requested_time}
                                onChange={(event) => setRescheduleForm((previous) => ({ ...previous, requested_time: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                        </label>
                    </div>
                    <label className="block space-y-2 text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Manager notes</span>
                        <textarea
                            rows={4}
                            value={rescheduleForm.manager_notes}
                            onChange={(event) => setRescheduleForm((previous) => ({ ...previous, manager_notes: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            placeholder="Explain the new slot or what the client should bring."
                        />
                    </label>
                </div>
            </Modal>
        </div>
    );
};

export default FastTrackCaseDetail;

