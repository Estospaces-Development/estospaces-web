'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarCheck, CalendarClock, CheckCircle2, Clock3, Loader2, MapPin, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bookingsService, type Viewing } from '@/services/bookingsService';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

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
    const toast = useToast();
    const [appointments, setAppointments] = useState<Viewing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actingID, setActingID] = useState<string | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<Viewing | null>(null);
    const [rescheduleForm, setRescheduleForm] = useState({
        requested_date: '',
        requested_time: '10:00',
        manager_notes: '',
    });

    const fetchAppointments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await bookingsService.getViewings();
            setAppointments(data);
        } catch (fetchError: any) {
            setError(fetchError?.message || 'Failed to load appointments');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

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

        return filtered;
    }, [appointments, statusFilter, searchQuery]);

    const summary = useMemo(() => ({
        total: appointments.length,
        pending: appointments.filter((appointment) => appointment.status === 'pending').length,
        confirmed: appointments.filter((appointment) => appointment.status === 'confirmed').length,
        completed: appointments.filter((appointment) => appointment.status === 'completed').length,
        cancelled: appointments.filter((appointment) => appointment.status === 'cancelled').length,
    }), [appointments]);
    const isSavingReschedule = Boolean(rescheduleTarget && actingID === rescheduleTarget.id);

    const runAction = async (appointmentID: string, action: () => Promise<void>, successMessage: string) => {
        setActingID(appointmentID);
        try {
            await action();
            toast.success(successMessage);
            await fetchAppointments();
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to update this appointment.');
        } finally {
            setActingID(null);
        }
    };

    const openReschedule = (appointment: Viewing) => {
        setRescheduleTarget(appointment);
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
        if (!rescheduleForm.requested_date || !rescheduleForm.requested_time) {
            toast.error('Please choose the new date and time.');
            return;
        }

        await runAction(
            rescheduleTarget.id,
            async () => {
                await bookingsService.updateViewing(rescheduleTarget.id, {
                    requested_date: rescheduleForm.requested_date,
                    requested_time: rescheduleForm.requested_time,
                    manager_notes: rescheduleForm.manager_notes,
                });
                setRescheduleTarget(null);
            },
            'Appointment rescheduled successfully.',
        );
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
                        Confirm, reschedule, complete, and cancel real viewing appointments from booking-service.
                    </p>
                </div>
                <button
                    onClick={fetchAppointments}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {[
                    { label: 'Total', value: summary.total, icon: CalendarClock, accent: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Pending', value: summary.pending, icon: Clock3, accent: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
                    { label: 'Confirmed', value: summary.confirmed, icon: CheckCircle2, accent: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
                    { label: 'Completed', value: summary.completed, icon: CalendarCheck, accent: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
                    { label: 'Cancelled', value: summary.cancelled, icon: XCircle, accent: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
                ].map((card) => (
                    <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-black">
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.accent}`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
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
                    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading appointments...</p>
                    </div>
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
                        {filteredAppointments.map((appointment) => {
                            const { date, time } = formatDateTime(appointment.scheduled_at);
                            const isBusy = actingID === appointment.id;

                            return (
                                <div key={appointment.id} className="p-6">
                                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getPropertyName(appointment)}</h2>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(appointment.status)}`}>
                                                    {appointment.status}
                                                </span>
                                            </div>

                                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{getClientName(appointment)}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.client_email || appointment.client_phone || 'No direct contact saved'}</p>
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
                                        </div>

                                        <div className="flex flex-col gap-3 xl:min-w-[260px]">
                                            {(appointment.status === 'pending' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => runAction(appointment.id, () => bookingsService.confirmViewing(appointment.id), 'Appointment confirmed successfully.')}
                                                    disabled={isBusy}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Confirm
                                                </button>
                                            )}

                                            {(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => openReschedule(appointment)}
                                                    disabled={isBusy}
                                                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                                >
                                                    Reschedule
                                                </button>
                                            )}

                                            {appointment.status === 'confirmed' && (
                                                <button
                                                    onClick={() => runAction(appointment.id, () => bookingsService.updateViewing(appointment.id, { status: 'completed' }).then(() => undefined), 'Appointment marked as completed.')}
                                                    disabled={isBusy}
                                                    className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                                >
                                                    Mark Completed
                                                </button>
                                            )}

                                            {(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
                                                <button
                                                    onClick={() => runAction(appointment.id, () => bookingsService.cancelViewing(appointment.id, 'Cancelled by manager'), 'Appointment cancelled successfully.')}
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
                        setRescheduleTarget(null);
                    }
                }}
                title="Reschedule Appointment"
                size="md"
                closeOnBackdrop={!isSavingReschedule}
                footer={rescheduleTarget ? (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setRescheduleTarget(null)}
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
                            {isSavingReschedule && <Loader2 className="h-4 w-4 animate-spin" />}
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
                                <input
                                    type="date"
                                    value={rescheduleForm.requested_date}
                                    onChange={(event) => setRescheduleForm((previous) => ({ ...previous, requested_date: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </label>
                            <label className="space-y-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
                                <input
                                    type="time"
                                    value={rescheduleForm.requested_time}
                                    onChange={(event) => setRescheduleForm((previous) => ({ ...previous, requested_time: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </label>
                        </div>

                        <label className="mt-4 block space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Manager Notes</span>
                            <textarea
                                rows={4}
                                value={rescheduleForm.manager_notes}
                                onChange={(event) => setRescheduleForm((previous) => ({ ...previous, manager_notes: event.target.value }))}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                placeholder="Explain the new slot or what the client should bring."
                            />
                        </label>
                    </>
                )}
            </Modal>
        </div>
    );
}
