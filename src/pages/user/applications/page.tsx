"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Building2,
    MapPin,
    Plus,
    LayoutGrid,
    List,
    FileText,
    ArrowLeft,
    Clock,
    CheckCircle,
    Bell,
    X,
    XCircle,
    AlertCircle,
    Calendar,
    User,
    Phone,
    Mail,
    Upload,
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
import FastTrackCompanionPanel from '@/components/fast-track/FastTrackCompanionPanel';
import UserActivitySubnav from '@/components/layout/UserActivitySubnav';
import Modal from '@/components/ui/Modal';
import DateField from '@/components/ui/DateField';
import { attachLinkedFastTrackCase } from '@/lib/fastTrackCompanion';
import { buildWorkspacePath, resolveFocusedApplication } from '@/lib/workspaceLinks';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import { formatLaunchCurrencyForCountry } from '@/lib/launchLocale';
import { messagesService } from '@/services/messagesService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    canWithdrawApplicationRecord,
    getNextSaleJourneyActions,
    getSaleJourneySummary,
    getSaleJourneyStageLabel,
    isSaleProgressionRecord,
    resolveSaleJourneyDisplayStage,
} from '@/lib/saleJourney';

export const APPLICATION_DETAIL_DRAWER_CLOSE_LABEL = 'Close application detail panel';
const MAX_APPLICATION_WITHDRAW_REASON_LENGTH = 500;
const MAX_NEW_APPLICATION_MESSAGE_LENGTH = 1000;

type NewApplicationForm = {
    property_id: string;
    manager_id: string;
    move_in_date: string;
    applicant_name: string;
    applicant_email: string;
    applicant_phone: string;
    message: string;
};

type NewApplicationFormErrors = Partial<Record<keyof NewApplicationForm, string>>;

const EMPTY_NEW_APPLICATION_FORM: NewApplicationForm = {
    property_id: '',
    manager_id: '',
    move_in_date: '',
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    message: '',
};

const normalizeApplicationWithdrawReason = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeNewApplicationText = (value: string) => value.trim().replace(/\s+/g, ' ');

function parseApplicationDate(value: string) {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return null;
    }

    return parsed;
}

function validateNewApplicationForm(form: NewApplicationForm): NewApplicationFormErrors {
    const errors: NewApplicationFormErrors = {};
    const moveInDate = form.move_in_date.trim() ? parseApplicationDate(form.move_in_date) : null;

    if (!form.property_id.trim()) {
        errors.property_id = 'Enter a property ID.';
    }
    if (!form.manager_id.trim()) {
        errors.manager_id = 'Enter a manager ID.';
    }
    if (!form.move_in_date.trim()) {
        errors.move_in_date = 'Choose a move-in date.';
    } else if (!moveInDate) {
        errors.move_in_date = 'Enter a valid move-in date.';
    }
    if (normalizeNewApplicationText(form.message).length > MAX_NEW_APPLICATION_MESSAGE_LENGTH) {
        errors.message = 'Keep the application message to 1000 characters or fewer.';
    }

    return errors;
}

const validateApplicationWithdrawReason = (value: string) => {
    const normalized = normalizeApplicationWithdrawReason(value);
    if (!normalized) {
        return { normalized, error: 'Enter a withdrawal reason.' };
    }
    if (normalized.length > MAX_APPLICATION_WITHDRAW_REASON_LENGTH) {
        return { normalized, error: 'Withdrawal reason must be 500 characters or fewer.' };
    }
    return { normalized, error: '' };
};

function ApplicationDetailDrawer({ application, onClose }: { application: Application; onClose: () => void }) {
    const navigate = useNavigate();
    const { fetchApplications, withdrawApplication } = useApplications();
    const { user } = useAuth();
    const toast = useToast();
    const [openingConversation, setOpeningConversation] = useState(false);
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState('');
    const [withdrawReasonError, setWithdrawReasonError] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const withdrawInFlightRef = useRef(false);
    const _isSaleProgression = isSaleProgressionRecord(application);
    const canWithdraw = canWithdrawApplicationRecord(application);
    const saleDisplayStage = resolveSaleJourneyDisplayStage(application);
    const showsSaleJourney = application.listingType !== 'rent' && Boolean(saleDisplayStage);
    const nextSaleAction = getNextSaleJourneyActions(application.status)[0];
    const journeyBlockers = application.blockers || [];
    const journeyDeadlines = application.deadlines || [];
    const journeyRequiredEvidence = application.requiredEvidence || [];
    const shouldShowApplicationTracker = Boolean(
        application.liveStage
        || application.stageGroup
        || application.journeyStatusReason
        || journeyBlockers.length
        || journeyDeadlines.length
        || journeyRequiredEvidence.length
        || application.fastTrackCase,
    );

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
    const formatApplicationPrice = (amount: number) => formatLaunchCurrencyForCountry(amount, {
        countryCode: application.propertyCountry,
        countryName: application.propertyCountry,
        currencyCode: application.propertyCurrency,
    });

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
                fastTrackCaseId: application.fastTrackCaseId,
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

    const handleWithdrawApplication = async (event: React.FormEvent) => {
        event.preventDefault();
        const { normalized, error } = validateApplicationWithdrawReason(withdrawReason);
        setWithdrawReasonError(error);
        if (error || withdrawInFlightRef.current) {
            return;
        }

        withdrawInFlightRef.current = true;
        setIsWithdrawing(true);
        try {
            const result = await withdrawApplication(application.id, normalized);
            if (!result.success) {
                throw new Error(result.error || 'Unable to withdraw application.');
            }

            toast.success('Application withdrawn.');
            setShowWithdrawForm(false);
            setWithdrawReason('');
            onClose();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to withdraw application.');
        } finally {
            withdrawInFlightRef.current = false;
            setIsWithdrawing(false);
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
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={APPLICATION_DETAIL_DRAWER_CLOSE_LABEL}
                        title={APPLICATION_DETAIL_DRAWER_CLOSE_LABEL}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 space-y-6">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>

                    {application.fastTrackCase && (
                        <FastTrackCompanionPanel
                            role="user"
                            fastTrackCase={application.fastTrackCase}
                            context={{
                                applicationId: application.id,
                                caseId: application.fastTrackCase.caseId,
                                leadId: application.leadId,
                                propertyId: application.propertyId,
                            }}
                            title="Linked fast-track controls"
                            onRefresh={fetchApplications}
                        />
                    )}

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
                                    {formatApplicationPrice(application.propertyPrice)}
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

                    {shouldShowApplicationTracker && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Application Tracker</p>
                                    <h4 className="mt-2 text-base font-bold capitalize text-gray-900 dark:text-white">
                                        {application.liveStage ? application.liveStage.replace(/_/g, ' ') : 'Workflow status'}
                                    </h4>
                                    {application.journeyStatusReason && (
                                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                            {application.journeyStatusReason}
                                        </p>
                                    )}
                                </div>
                                {application.stageGroup && (
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {application.stageGroup.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Blockers</p>
                                    {journeyBlockers.length ? (
                                        <ul className="mt-3 space-y-2">
                                            {journeyBlockers.map((blocker) => (
                                                <li key={blocker.code} className="text-sm text-gray-700 dark:text-gray-200">
                                                    <span className="font-semibold">{blocker.title}</span>
                                                    {blocker.description && <span className="block text-xs text-gray-500 dark:text-gray-400">{blocker.description}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">None recorded</p>
                                    )}
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Deadlines</p>
                                    {journeyDeadlines.length ? (
                                        <ul className="mt-3 space-y-2">
                                            {journeyDeadlines.map((deadline) => (
                                                <li key={deadline.code} className="text-sm text-gray-700 dark:text-gray-200">
                                                    <span className="font-semibold">{deadline.label}</span>
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                        {deadline.due_at ? formatDate(deadline.due_at) : deadline.status || 'Pending'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">None recorded</p>
                                    )}
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Required Evidence</p>
                                    {journeyRequiredEvidence.length ? (
                                        <ul className="mt-3 space-y-2">
                                            {journeyRequiredEvidence.map((requirement) => (
                                                <li key={requirement.code} className="text-sm text-gray-700 dark:text-gray-200">
                                                    <span className="font-semibold">{requirement.label}</span>
                                                    {requirement.status && <span className="block text-xs capitalize text-gray-500 dark:text-gray-400">{requirement.status.replace(/_/g, ' ')}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">None recorded</p>
                                    )}
                                </div>
                            </div>
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
                            {openingConversation ? <ActionSpinner size={18} className="" /> : <MessageSquare size={18} />}
                            <span>{openingConversation ? 'Opening thread' : 'Message Agent'}</span>
                        </button>
                        {canWithdraw && (
                            <button
                                type="button"
                                onClick={() => setShowWithdrawForm(true)}
                                className="w-full py-3 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <XCircle size={18} /> Withdraw Application
                            </button>
                        )}
                        {application.propertyId && (
                            <button
                                onClick={() => { onClose(); navigate(`/user/properties/${application.propertyId}`); }}
                                className="w-full py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Building2 size={18} /> View Property
                            </button>
                        )}
                    </div>

                    {showWithdrawForm && (
                        <form
                            onSubmit={handleWithdrawApplication}
                            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
                        >
                            <label className="block text-sm font-semibold text-red-900 dark:text-red-100">
                                Reason for withdrawal
                                <textarea
                                    value={withdrawReason}
                                    onChange={(event) => {
                                        setWithdrawReason(event.target.value);
                                        if (withdrawReasonError) {
                                            setWithdrawReasonError('');
                                        }
                                    }}
                                    rows={3}
                                    maxLength={MAX_APPLICATION_WITHDRAW_REASON_LENGTH + 1}
                                    aria-invalid={Boolean(withdrawReasonError)}
                                    aria-describedby={withdrawReasonError ? 'application-withdraw-reason-error' : undefined}
                                    className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-red-500 dark:border-red-900/60 dark:bg-zinc-950 dark:text-white"
                                />
                            </label>
                            {withdrawReasonError && (
                                <p id="application-withdraw-reason-error" className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
                                    {withdrawReasonError}
                                </p>
                            )}
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowWithdrawForm(false);
                                        setWithdrawReasonError('');
                                    }}
                                    className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-950 dark:text-red-300"
                                >
                                    Keep Application
                                </button>
                                <button
                                    type="submit"
                                    disabled={isWithdrawing}
                                    className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
                                </button>
                            </div>
                        </form>
                    )}
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
        fetchApplications,
        createApplication
    } = useApplications();
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [hasAppliedRouteFocus, setHasAppliedRouteFocus] = useState(false);
    const [newApplicationModalOpen, setNewApplicationModalOpen] = useState(false);
    const [newApplicationForm, setNewApplicationForm] = useState<NewApplicationForm>(EMPTY_NEW_APPLICATION_FORM);
    const [newApplicationErrors, setNewApplicationErrors] = useState<NewApplicationFormErrors>({});
    const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [fastTrackCasesReady, setFastTrackCasesReady] = useState(false);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const newApplicationInFlightRef = useRef(false);
    const rawCaseId = searchParams.get('case');
    const progressionId = searchParams.get('progression');
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );
    const hasWorkspaceFocusRequest = Boolean(
        searchParams.get('application')
        || progressionId
        || sanitizedCaseId
        || searchParams.get('lead')
        || searchParams.get('property'),
    );
    const focusedApplicationFromRoute = resolveFocusedApplication(applications, {
        applicationId: searchParams.get('application'),
        progressionId,
        caseId: sanitizedCaseId,
        leadId: searchParams.get('lead'),
        propertyId: searchParams.get('property'),
    });

    const updateNewApplicationField = (field: keyof NewApplicationForm, value: string) => {
        setNewApplicationForm((previous) => ({ ...previous, [field]: value }));
        setNewApplicationErrors((previous) => {
            if (!previous[field]) {
                return previous;
            }
            const { [field]: _removedError, ...remainingErrors } = previous;
            return remainingErrors;
        });
    };

    const openNewApplicationModal = () => {
        setNewApplicationForm({
            ...EMPTY_NEW_APPLICATION_FORM,
            property_id: searchParams.get('property') || '',
        });
        setNewApplicationErrors({});
        setNewApplicationModalOpen(true);
    };

    const closeNewApplicationModal = () => {
        if (newApplicationInFlightRef.current) {
            return;
        }
        setNewApplicationModalOpen(false);
        setNewApplicationForm(EMPTY_NEW_APPLICATION_FORM);
        setNewApplicationErrors({});
    };

    const submitNewApplication = async () => {
        if (newApplicationInFlightRef.current) {
            return;
        }

        const validationErrors = validateNewApplicationForm(newApplicationForm);
        setNewApplicationErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix the application details.');
            return;
        }

        newApplicationInFlightRef.current = true;
        setIsSubmittingApplication(true);
        try {
            const result = await createApplication({
                property_id: newApplicationForm.property_id.trim(),
                manager_id: newApplicationForm.manager_id.trim(),
                move_in_date: newApplicationForm.move_in_date.trim(),
                applicant_name: normalizeNewApplicationText(newApplicationForm.applicant_name),
                applicant_email: normalizeNewApplicationText(newApplicationForm.applicant_email),
                applicant_phone: normalizeNewApplicationText(newApplicationForm.applicant_phone),
                message: normalizeNewApplicationText(newApplicationForm.message),
            });

            if (!result.success) {
                throw new Error(result.error || 'Unable to submit application.');
            }

            toast.success('Application submitted.');
            setNewApplicationModalOpen(false);
            setNewApplicationForm(EMPTY_NEW_APPLICATION_FORM);
            setNewApplicationErrors({});
        } catch (error: any) {
            toast.error(error?.message || 'Unable to submit application.');
        } finally {
            newApplicationInFlightRef.current = false;
            setIsSubmittingApplication(false);
        }
    };

    const drawerApplication = useMemo(() => {
        if (!selectedApplication) {
            return null;
        }

        const currentApplication =
            applications.find((application) => application.id === selectedApplication.id)
            || selectedApplication;

        return attachLinkedFastTrackCase(currentApplication, fastTrackCases);
    }, [applications, fastTrackCases, selectedApplication]);

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
            {drawerApplication && (
                <ApplicationDetailDrawer
                    application={drawerApplication}
                    onClose={() => setSelectedApplication(null)}
                />
            )}
            <Modal
                isOpen={newApplicationModalOpen}
                onClose={closeNewApplicationModal}
                title="Submit Application"
                size="md"
                closeOnBackdrop={!isSubmittingApplication}
                footer={(
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeNewApplicationModal}
                            disabled={isSubmittingApplication}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => void submitNewApplication()}
                            disabled={isSubmittingApplication}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmittingApplication && <ActionSpinner className="h-4 w-4" />}
                            Submit Application
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Property ID</span>
                            <input
                                type="text"
                                value={newApplicationForm.property_id}
                                onChange={(event) => updateNewApplicationField('property_id', event.target.value)}
                                aria-describedby={newApplicationErrors.property_id ? 'new-application-property-error' : undefined}
                                disabled={isSubmittingApplication}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {newApplicationErrors.property_id ? (
                                <p id="new-application-property-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {newApplicationErrors.property_id}
                                </p>
                            ) : null}
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Manager ID</span>
                            <input
                                type="text"
                                value={newApplicationForm.manager_id}
                                onChange={(event) => updateNewApplicationField('manager_id', event.target.value)}
                                aria-describedby={newApplicationErrors.manager_id ? 'new-application-manager-error' : undefined}
                                disabled={isSubmittingApplication}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {newApplicationErrors.manager_id ? (
                                <p id="new-application-manager-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {newApplicationErrors.manager_id}
                                </p>
                            ) : null}
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Move-in date</span>
                        <DateField
                            value={newApplicationForm.move_in_date}
                            onChange={(value) => updateNewApplicationField('move_in_date', value)}
                            ariaLabel="Application move-in date"
                            ariaDescribedBy={newApplicationErrors.move_in_date ? 'new-application-move-in-error' : undefined}
                            disabled={isSubmittingApplication}
                            buttonClassName="bg-gray-50 dark:bg-gray-900"
                        />
                        {newApplicationErrors.move_in_date ? (
                            <p id="new-application-move-in-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {newApplicationErrors.move_in_date}
                            </p>
                        ) : null}
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Applicant name</span>
                            <input
                                type="text"
                                value={newApplicationForm.applicant_name}
                                onChange={(event) => updateNewApplicationField('applicant_name', event.target.value)}
                                disabled={isSubmittingApplication}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Email</span>
                            <input
                                type="email"
                                value={newApplicationForm.applicant_email}
                                onChange={(event) => updateNewApplicationField('applicant_email', event.target.value)}
                                disabled={isSubmittingApplication}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Phone</span>
                        <input
                            type="tel"
                            value={newApplicationForm.applicant_phone}
                            onChange={(event) => updateNewApplicationField('applicant_phone', event.target.value)}
                            disabled={isSubmittingApplication}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </label>

                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Message</span>
                        <textarea
                            rows={4}
                            value={newApplicationForm.message}
                            onChange={(event) => updateNewApplicationField('message', event.target.value)}
                            aria-describedby={newApplicationErrors.message ? 'new-application-message-error' : 'new-application-message-count'}
                            disabled={isSubmittingApplication}
                            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        {newApplicationErrors.message ? (
                            <p id="new-application-message-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {newApplicationErrors.message}
                            </p>
                        ) : (
                            <p id="new-application-message-count" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {normalizeNewApplicationText(newApplicationForm.message).length}/{MAX_NEW_APPLICATION_MESSAGE_LENGTH}
                            </p>
                        )}
                    </label>
                </div>
            </Modal>

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
                                type="button"
                                aria-label="Switch to grid view"
                                aria-pressed={viewMode === 'grid'}
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                type="button"
                                aria-label="Switch to list view"
                                aria-pressed={viewMode === 'list'}
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={openNewApplicationModal}
                            className="flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                        >
                            <Plus size={18} />
                            <span>New Application</span>
                        </button>
                    </div>
                </div>

                <UserActivitySubnav />

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
                                onClick={openNewApplicationModal}
                                className="mt-8 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 dark:shadow-none"
                            >
                                Submit Application
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
