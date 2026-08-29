'use client';

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarCheck, CalendarClock, CheckCircle2, Clock3, FileText, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingsService, type Viewing } from '@/services/bookingsService';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';
import FastTrackCompanionPanel from '@/components/fast-track/FastTrackCompanionPanel';
import ViewingResponseCountdown from '@/components/viewings/ViewingResponseCountdown';
import UserVerificationReviewModal from '@/components/verification/UserVerificationReviewModal';
import { resolveFocusedViewing } from '@/lib/workspaceLinks';
import {
    findLinkedFastTrackCase,
    syncFastTrackCompanionAction,
} from '@/lib/fastTrackCompanion';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

type FetchAppointmentsOptions = {
    background?: boolean;
};

function formatDateTime(dateTime: string) {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) {
        return { date: 'Unknown date', time: '' };
    }

    return {
        date: parsed.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }),
        time: parsed.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
}

function toDateInputValue(dateTime: string) {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const offset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
}

function toTimeInputValue(dateTime: string) {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) {
        return '10:00';
    }

    return parsed.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export const MAX_MANAGER_APPOINTMENT_NOTE_LENGTH = 1000;
export const MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH = 500;

export type ManagerRescheduleForm = {
    requested_date: string;
    requested_time: string;
    manager_notes: string;
};

export type ManagerRescheduleValidationErrors = Partial<Record<keyof ManagerRescheduleForm, string>>;

export function normalizeManagerAppointmentNote(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeManagerAppointmentCancelReason(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function validateManagerAppointmentCancelReason(value: string) {
    const normalizedReason = normalizeManagerAppointmentCancelReason(value);
    if (!normalizedReason) {
        return 'Enter a cancellation reason.';
    }
    if (normalizedReason.length > MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH) {
        return 'Keep the cancellation reason to 500 characters or fewer.';
    }
    return null;
}

export function validateManagerRescheduleForm(form: ManagerRescheduleForm, now = new Date()): ManagerRescheduleValidationErrors {
    const errors: ManagerRescheduleValidationErrors = {};
    const requestedDate = form.requested_date.trim();
    const requestedTime = form.requested_time.trim();
    const dateMatch = requestedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = requestedTime.match(/^(\d{2}):(\d{2})$/);
    let dateParts: { year: number; month: number; day: number } | null = null;
    let timeParts: { hour: number; minute: number } | null = null;

    if (!requestedDate) {
        errors.requested_date = 'Choose a new appointment date.';
    } else if (!dateMatch) {
        errors.requested_date = 'Enter a valid appointment date.';
    } else {
        const year = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const day = Number(dateMatch[3]);
        const parsed = new Date(year, month - 1, day);
        if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
            errors.requested_date = 'Enter a valid appointment date.';
        } else {
            dateParts = { year, month, day };
        }
    }

    if (!requestedTime) {
        errors.requested_time = 'Choose a new appointment time.';
    } else if (!timeMatch) {
        errors.requested_time = 'Enter a valid appointment time.';
    } else {
        const hour = Number(timeMatch[1]);
        const minute = Number(timeMatch[2]);
        if (hour > 23 || minute > 59) {
            errors.requested_time = 'Enter a valid appointment time.';
        } else {
            timeParts = { hour, minute };
        }
    }

    if (dateParts && timeParts) {
        const scheduledAt = new Date(
            dateParts.year,
            dateParts.month - 1,
            dateParts.day,
            timeParts.hour,
            timeParts.minute,
        );
        if (scheduledAt <= now) {
            errors.requested_time = 'Choose a future appointment time.';
        }
    }

    if (normalizeManagerAppointmentNote(form.manager_notes).length > MAX_MANAGER_APPOINTMENT_NOTE_LENGTH) {
        errors.manager_notes = 'Keep manager notes to 1000 characters or fewer.';
    }

    return errors;
}

function getClientName(viewing: Viewing) {
    return viewing.client_name || viewing.client_email || (viewing.user_id ? `Client ${viewing.user_id.slice(0, 8)}` : 'Client');
}

function getPropertyName(viewing: Viewing) {
    return viewing.property_title || viewing.property_address || (viewing.property_id ? `Property ${viewing.property_id.slice(0, 8)}` : 'Property');
}

function getStatusBadge(status: Viewing['status']) {
    switch (status) {
        case 'confirmed':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'pending':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'rescheduled':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case 'completed':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'cancelled':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
}

export default function ManagerAppointmentsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [appointments, setAppointments] = useState<Viewing[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actingID, setActingID] = useState<string | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<Viewing | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Viewing | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
    const [verificationTarget, setVerificationTarget] = useState<Viewing | null>(null);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const cancelInFlightRef = useRef(false);
    const [rescheduleForm, setRescheduleForm] = useState<ManagerRescheduleForm>({
        requested_date: '',
        requested_time: '10:00',
        manager_notes: '',
    });
    const [rescheduleFormErrors, setRescheduleFormErrors] = useState<ManagerRescheduleValidationErrors>({});
    const hasLoadedAppointmentsRef = useRef(false);

    const fetchAppointments = useCallback(async (options: FetchAppointmentsOptions = {}) => {
        const shouldBlockForLoad = !options.background && !hasLoadedAppointmentsRef.current;
        if (shouldBlockForLoad) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        try {
            const [viewingsData, fastTrackCasesResult] = await Promise.all([
                bookingsService.getViewings(),
                getFastTrackCases({ suppressErrorToast: true }),
            ]);
            setAppointments(viewingsData);
            setFastTrackCases(fastTrackCasesResult.data || []);
            setError(null);
            hasLoadedAppointmentsRef.current = true;
        } catch (fetchError: any) {
            if (shouldBlockForLoad || !hasLoadedAppointmentsRef.current) {
                setError(fetchError?.message || 'Failed to load appointments');
                setAppointments([]);
            } else {
                toast.error('Unable to refresh appointments. Showing the last loaded information.');
            }
        } finally {
            if (shouldBlockForLoad) {
                setLoading(false);
            }
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchAppointments();
    }, [fetchAppointments]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
        ],
        refresh: () => fetchAppointments({ background: true }),
    });

    const rawCaseId = searchParams.get('case');
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );

    useEffect(() => {
        if (loading || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [loading, removedCaseId, setSearchParams, toast]);

    const focusedCase = useMemo(
        () => (sanitizedCaseId
            ? fastTrackCases.find((caseItem) => caseItem.caseId === sanitizedCaseId) || null
            : null),
        [fastTrackCases, sanitizedCaseId],
    );

    const focusedAppointmentId = resolveFocusedViewing(appointments, {
        viewingId: searchParams.get('viewing'),
        applicationId: searchParams.get('application'),
        caseId: sanitizedCaseId,
        leadId: searchParams.get('lead') || focusedCase?.leadId || null,
        propertyId: searchParams.get('property') || focusedCase?.propertyId || null,
    })?.id || null;

    const filteredAppointments = useMemo(() => {
        let filtered = appointments;

        // Status Filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((appointment) => appointment.status === statusFilter);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((appointment) => {
                const clientName = (getClientName(appointment) || '').toLowerCase();
                const propertyName = (getPropertyName(appointment) || '').toLowerCase();
                return clientName.includes(query) || propertyName.includes(query);
            });
        }

        return [...filtered].sort((left, right) => {
            if (!focusedAppointmentId) {
                return 0;
            }
            if (left.id === focusedAppointmentId) {
                return -1;
            }
            if (right.id === focusedAppointmentId) {
                return 1;
            }
            return 0;
        });
    }, [appointments, focusedAppointmentId, searchQuery, statusFilter]);

    const summary = useMemo(() => ({
        total: appointments.length,
        pending: appointments.filter((appointment) => appointment.status === 'pending').length,
        confirmed: appointments.filter((appointment) => appointment.status === 'confirmed').length,
        completed: appointments.filter((appointment) => appointment.status === 'completed').length,
        cancelled: appointments.filter((appointment) => appointment.status === 'cancelled').length,
    }), [appointments]);
    const isSavingReschedule = Boolean(rescheduleTarget && actingID === rescheduleTarget.id);
    const isSavingCancel = Boolean(cancelTarget && actingID === cancelTarget.id);
    const isCancelReasonValid = validateManagerAppointmentCancelReason(cancelReason) === null;

    const runAction = async (
        appointmentID: string,
        action: () => Promise<void>,
        successMessage: string,
        fastTrackSync?: { action: string; payload?: Record<string, unknown> },
    ) => {
        setActingID(appointmentID);
        try {
            const appointment = appointments.find((item) => item.id === appointmentID);
            await action();
            if (appointment && fastTrackSync) {
                const linkedFastTrackCase = findLinkedFastTrackCase(fastTrackCases, {
                    caseId: appointment.fast_track_case_id,
                    viewingId: appointment.id,
                    applicationId: appointment.application_id,
                    leadId: appointment.lead_id,
                    propertyId: appointment.property_id,
                });
                if (linkedFastTrackCase) {
                    const syncResult = await syncFastTrackCompanionAction({
                        fastTrackCase: linkedFastTrackCase,
                        request: fastTrackSync,
                        publishWorkspaceSync,
                        reason: `Manager appointments companion action: ${fastTrackSync.action}`,
                    });
                    if (syncResult.error || !syncResult.data) {
                        throw new Error(syncResult.error || 'Unable to sync the linked fast-track case.');
                    }
                    setFastTrackCases((previous) => previous.map((caseItem) => (
                        caseItem.caseId === syncResult.data?.caseId ? syncResult.data : caseItem
                    )));
                }
            }
            toast.success(successMessage);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.VIEWINGS,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                ],
                reason: successMessage,
                ids: {
                    viewingId: appointmentID,
                    applicationId: appointment?.application_id,
                    caseId: appointment?.fast_track_case_id,
                    leadId: appointment?.lead_id,
                    propertyId: appointment?.property_id,
                },
            });
            await fetchAppointments({ background: true });
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to update this appointment.');
        } finally {
            setActingID(null);
        }
    };

    const updateRescheduleFormField = (field: keyof ManagerRescheduleForm, value: string) => {
        setRescheduleForm((previous) => ({ ...previous, [field]: value }));
        setRescheduleFormErrors((previous) => {
            if (!previous[field]) {
                return previous;
            }
            const nextErrors = { ...previous };
            delete nextErrors[field];
            return nextErrors;
        });
    };

    const closeReschedule = () => {
        setRescheduleTarget(null);
        setRescheduleFormErrors({});
    };

    const openReschedule = (appointment: Viewing) => {
        setRescheduleTarget(appointment);
        setRescheduleFormErrors({});
        setRescheduleForm({
            requested_date: toDateInputValue(appointment.scheduled_at),
            requested_time: toTimeInputValue(appointment.scheduled_at),
            manager_notes: appointment.manager_notes || '',
        });
    };

    const submitReschedule = async () => {
        if (!rescheduleTarget) {
            return;
        }
        const validationErrors = validateManagerRescheduleForm(rescheduleForm);
        setRescheduleFormErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix the reschedule details.');
            return;
        }
        const requestedDate = rescheduleForm.requested_date.trim();
        const requestedTime = rescheduleForm.requested_time.trim();
        const managerNotes = normalizeManagerAppointmentNote(rescheduleForm.manager_notes);

        await runAction(
            rescheduleTarget.id,
            async () => {
                await bookingsService.updateViewing(rescheduleTarget.id, {
                    requested_date: requestedDate,
                    requested_time: requestedTime,
                    manager_notes: managerNotes,
                });
                closeReschedule();
            },
            'Appointment rescheduled successfully.',
            {
                action: 'reschedule_viewing',
                payload: {
                    scheduled_at: new Date(`${requestedDate}T${requestedTime}:00`).toISOString(),
                    note: managerNotes,
                },
            },
        );
    };

    const openCancel = (appointment: Viewing) => {
        setCancelTarget(appointment);
        setCancelReason('');
        setCancelReasonError(null);
    };

    const closeCancel = () => {
        if (cancelInFlightRef.current) {
            return;
        }
        setCancelTarget(null);
        setCancelReason('');
        setCancelReasonError(null);
    };

    const submitCancel = async () => {
        if (!cancelTarget || cancelInFlightRef.current) {
            return;
        }
        const validationError = validateManagerAppointmentCancelReason(cancelReason);
        setCancelReasonError(validationError);
        if (validationError) {
            toast.error('Please enter a valid cancellation reason.');
            return;
        }

        const normalizedReason = normalizeManagerAppointmentCancelReason(cancelReason);
        cancelInFlightRef.current = true;
        await runAction(
            cancelTarget.id,
            async () => {
                await bookingsService.cancelViewing(cancelTarget.id, normalizedReason);
                setCancelTarget(null);
                setCancelReason('');
                setCancelReasonError(null);
            },
            'Appointment cancelled successfully.',
            {
                action: 'skip_viewing',
                payload: {
                    note: normalizedReason,
                },
            },
        );
        cancelInFlightRef.current = false;
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-orange-500"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Confirm, reschedule, complete, and cancel property viewings in one place.
                    </p>
                </div>
                <button
                    onClick={() => {
                        void fetchAppointments({ background: true });
                    }}
                    disabled={loading || isRefreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    {isRefreshing ? <ActionSpinner size="xs" label="Refreshing appointments" /> : <RefreshCw className="h-4 w-4" />}
                    {isRefreshing ? 'Refreshing' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 md:grid-cols-5 md:gap-4" data-mobile-compact-summary-grid>
                {[
                    { label: 'Total', value: summary.total, icon: CalendarClock, accent: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Pending', value: summary.pending, icon: Clock3, accent: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
                    { label: 'Confirmed', value: summary.confirmed, icon: CheckCircle2, accent: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
                    { label: 'Completed', value: summary.completed, icon: CalendarCheck, accent: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
                    { label: 'Cancelled', value: summary.cancelled, icon: XCircle, accent: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
                ].map((card) => (
                    <div key={card.label} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-black sm:rounded-3xl sm:p-5">
                        <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl ${card.accent}`}>
                            <card.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                        </div>
                        <p className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400 sm:text-sm sm:font-medium">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Clock3 size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            aria-label="Search appointments"
                            placeholder="Search by client or property..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                statusFilter === filter.value
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                {loading ? (
                    <BrandLoadingScreen variant="section" label="Loading appointments..." />
                ) : error ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">No appointments found</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            When users request viewings, they will appear here with manager actions.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {focusedCase && (
                            <div className="p-6">
                                <FastTrackCompanionPanel
                                    role="manager"
                                    fastTrackCase={focusedCase}
                                    context={{
                                        caseId: sanitizedCaseId || focusedCase.caseId,
                                        viewingId: focusedAppointmentId,
                                        applicationId: searchParams.get('application') || focusedCase.applicationId,
                                        leadId: searchParams.get('lead') || focusedCase.leadId,
                                        propertyId: searchParams.get('property') || focusedCase.propertyId,
                                    }}
                                    title="Linked viewing controls"
                                    onCaseUpdated={(nextCase) => {
                                        setFastTrackCases((previous) => previous.map((caseItem) => (
                                            caseItem.caseId === nextCase.caseId ? nextCase : caseItem
                                        )));
                                    }}
                                    onRefresh={() => fetchAppointments({ background: true })}
                                />
                            </div>
                        )}
                        {focusedAppointmentId && (
                            <div className="border-b border-orange-200 bg-orange-50 px-6 py-4 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                                The appointment linked to your live workflow is pinned first so you can confirm or reschedule it without searching manually.
                            </div>
                        )}
                        {filteredAppointments.map((appointment) => {
                            const { date, time } = formatDateTime(appointment.scheduled_at);
                            const isBusy = actingID === appointment.id;
                            const isWorkflowLocked = Boolean(appointment.workflow_locked);

                            return (
                                <div
                                    key={appointment.id}
                                    className={`p-6 ${appointment.id === focusedAppointmentId ? 'bg-orange-50/70 dark:bg-orange-950/10' : ''}`}
                                >
                                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getPropertyName(appointment)}</h2>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(appointment.status)}`}>
                                                    {appointment.status}
                                                </span>
                                            </div>

                                            <ViewingResponseCountdown viewing={appointment} />

                                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <Avatar
                                                            userId={appointment.user_id}
                                                            name={getClientName(appointment)}
                                                            size="md"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{getClientName(appointment)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.client_email || appointment.client_phone || 'No direct contact saved'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scheduled</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{date}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Location</p>
                                                    <p className="mt-1">{appointment.property_address || 'Address not available'}</p>
                                                </div>
                                            </div>

                                            {(appointment.user_notes || appointment.manager_notes || appointment.cancellation_reason) && (
                                                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                                    {appointment.user_notes && <p><span className="font-semibold text-gray-900 dark:text-white">User notes:</span> {appointment.user_notes}</p>}
                                                    {appointment.manager_notes && <p className="mt-2"><span className="font-semibold text-gray-900 dark:text-white">Manager notes:</span> {appointment.manager_notes}</p>}
                                                    {appointment.cancellation_reason && <p className="mt-2"><span className="font-semibold text-gray-900 dark:text-white">Cancellation:</span> {appointment.cancellation_reason}</p>}
                                                </div>
                                            )}

                                            {isWorkflowLocked && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                                    <p className="font-semibold">Workflow locked</p>
                                                    <p className="mt-1">{appointment.workflow_lock_reason || 'This appointment can no longer be changed because the linked deal has already advanced.'}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3 xl:min-w-[260px]">
                                            {appointment.user_id ? (
                                                <button
                                                    onClick={() => setVerificationTarget(appointment)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Review documents
                                                </button>
                                            ) : null}

                                            {!isWorkflowLocked && (appointment.status === 'pending' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => runAction(
                                                        appointment.id,
                                                        () => bookingsService.confirmViewing(appointment.id),
                                                        'Appointment confirmed successfully.',
                                                        {
                                                            action: 'schedule_viewing',
                                                            payload: {
                                                                scheduled_at: appointment.scheduled_at,
                                                                note: appointment.manager_notes,
                                                            },
                                                        },
                                                    )}
                                                    disabled={isBusy}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isBusy ? <ActionSpinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Confirm
                                                </button>
                                            )}

                                            {!isWorkflowLocked && (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => openReschedule(appointment)}
                                                    disabled={isBusy}
                                                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                >
                                                    Reschedule
                                                </button>
                                            )}

                                            {!isWorkflowLocked && appointment.status === 'confirmed' && (
                                                <button
                                                    onClick={() => runAction(
                                                        appointment.id,
                                                        () => bookingsService.updateViewing(appointment.id, { status: 'completed' }).then(() => undefined),
                                                        'Appointment marked as completed.',
                                                        {
                                                            action: 'complete_viewing',
                                                            payload: {
                                                                note: appointment.manager_notes,
                                                            },
                                                        },
                                                    )}
                                                    disabled={isBusy}
                                                    className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                                >
                                                    Mark Completed
                                                </button>
                                            )}

                                            {!isWorkflowLocked && (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => openCancel(appointment)}
                                                    disabled={isBusy}
                                                    className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={Boolean(rescheduleTarget)}
                onClose={() => {
                    if (!isSavingReschedule) {
                        closeReschedule();
                    }
                }}
                title="Reschedule Appointment"
                size="md"
                closeOnBackdrop={!isSavingReschedule}
                footer={rescheduleTarget ? (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeReschedule}
                            disabled={isSavingReschedule}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Close
                        </button>
                        <button
                            onClick={submitReschedule}
                            disabled={isSavingReschedule}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingReschedule && <ActionSpinner className="h-4 w-4" />}
                            Save Reschedule
                        </button>
                    </div>
                ) : null}
            >
                {rescheduleTarget && (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getPropertyName(rescheduleTarget)}</p>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Date</span>
                                <DateField
                                    value={rescheduleForm.requested_date}
                                    onChange={(nextValue) => updateRescheduleFormField('requested_date', nextValue)}
                                    className="w-full"
                                    buttonClassName="bg-gray-50 dark:bg-gray-900"
                                    ariaLabel="Appointment reschedule date"
                                    ariaDescribedBy={rescheduleFormErrors.requested_date ? 'manager-reschedule-date-error' : undefined}
                                />
                                {rescheduleFormErrors.requested_date ? (
                                    <p id="manager-reschedule-date-error" role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                                        {rescheduleFormErrors.requested_date}
                                    </p>
                                ) : null}
                            </label>
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                                <TimeField
                                    value={rescheduleForm.requested_time}
                                    onChange={(nextValue) => updateRescheduleFormField('requested_time', nextValue)}
                                    className="w-full"
                                    inputClassName="bg-gray-50 dark:bg-gray-900"
                                    ariaLabel="Appointment reschedule time"
                                    ariaDescribedBy={rescheduleFormErrors.requested_time ? 'manager-reschedule-time-error' : undefined}
                                />
                                {rescheduleFormErrors.requested_time ? (
                                    <p id="manager-reschedule-time-error" role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                                        {rescheduleFormErrors.requested_time}
                                    </p>
                                ) : null}
                            </label>
                        </div>

                        <label className="mt-4 block space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Manager Notes</span>
                            <textarea
                                rows={4}
                                value={rescheduleForm.manager_notes}
                                onChange={(event) => updateRescheduleFormField('manager_notes', event.target.value)}
                                aria-describedby={rescheduleFormErrors.manager_notes ? 'manager-reschedule-notes-error' : undefined}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                placeholder="Explain the new slot or what the client should bring."
                            />
                            {rescheduleFormErrors.manager_notes ? (
                                <p id="manager-reschedule-notes-error" role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {rescheduleFormErrors.manager_notes}
                                </p>
                            ) : null}
                        </label>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(cancelTarget)}
                onClose={closeCancel}
                title="Cancel Appointment"
                size="md"
                closeOnBackdrop={!isSavingCancel}
                footer={cancelTarget ? (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeCancel}
                            disabled={isSavingCancel}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Keep Appointment
                        </button>
                        <button
                            type="button"
                            onClick={submitCancel}
                            disabled={isSavingCancel || !isCancelReasonValid}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingCancel && <ActionSpinner className="h-4 w-4" />}
                            Cancel Appointment
                        </button>
                    </div>
                ) : null}
            >
                {cancelTarget && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getPropertyName(cancelTarget)}</p>
                        <label className="block space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Cancellation reason</span>
                            <textarea
                                rows={4}
                                value={cancelReason}
                                onChange={(event) => {
                                    setCancelReason(event.target.value);
                                    if (cancelReasonError) {
                                        setCancelReasonError(null);
                                    }
                                }}
                                aria-describedby={cancelReasonError ? 'manager-cancel-reason-error' : 'manager-cancel-reason-count'}
                                disabled={isSavingCancel}
                                maxLength={MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH}
                                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition-colors focus:border-red-300 focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                placeholder="Explain why this appointment needs to be cancelled."
                            />
                            {cancelReasonError ? (
                                <p id="manager-cancel-reason-error" role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {cancelReasonError}
                                </p>
                            ) : (
                                <p id="manager-cancel-reason-count" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {normalizeManagerAppointmentCancelReason(cancelReason).length}/{MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH}
                                </p>
                            )}
                        </label>
                    </div>
                )}
            </Modal>

            {verificationTarget?.user_id ? (
                <UserVerificationReviewModal
                    scope="manager"
                    userId={verificationTarget.user_id}
                    variant="fast_track"
                    missingUserContext={{
                        name: verificationTarget.client_name,
                        email: verificationTarget.client_email,
                        source: 'appointment',
                    }}
                    onUpdated={async () => {
                        await fetchAppointments({ background: true });
                    }}
                    onClose={() => {
                        setVerificationTarget(null);
                    }}
                />
            ) : null}
        </div>
    );
}
