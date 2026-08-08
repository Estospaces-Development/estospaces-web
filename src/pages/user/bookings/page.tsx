"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowLeft, Loader2, Search, Plus } from 'lucide-react';
import { bookingsService, type Booking } from '../../../services/bookingsService';
import { useToast } from '../../../contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import DateField from '@/components/ui/DateField';

export const MAX_BOOKING_SPECIAL_REQUESTS_LENGTH = 1000;
export const MAX_BOOKING_GUEST_COUNT = 20;
export const MAX_BOOKING_CANCEL_REASON_LENGTH = 500;

export type BookingReservationForm = {
    property_id: string;
    manager_id: string;
    check_in_date: string;
    check_out_date: string;
    guest_count: string;
    special_requests: string;
};

export type BookingReservationValidationErrors = Partial<Record<keyof BookingReservationForm, string>>;

export const BOOKING_STATUS_GROUPS = [
    { status: 'pending', label: 'Pending' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'completed', label: 'Completed' },
    { status: 'cancelled', label: 'Cancelled' },
] as const;

const EMPTY_RESERVATION_FORM: BookingReservationForm = {
    property_id: '',
    manager_id: '',
    check_in_date: '',
    check_out_date: '',
    guest_count: '1',
    special_requests: '',
};

function parseBookingDate(value: string) {
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

export function normalizeBookingSpecialRequests(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeBookingCancelReason(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function validateBookingCancelReason(value: string) {
    const normalizedReason = normalizeBookingCancelReason(value);
    if (!normalizedReason) {
        return 'Enter a cancellation reason.';
    }
    if (normalizedReason.length > MAX_BOOKING_CANCEL_REASON_LENGTH) {
        return 'Keep the cancellation reason to 500 characters or fewer.';
    }
    return null;
}

export function validateBookingReservationForm(form: BookingReservationForm): BookingReservationValidationErrors {
    const errors: BookingReservationValidationErrors = {};
    const checkIn = form.check_in_date.trim() ? parseBookingDate(form.check_in_date) : null;
    const checkOut = form.check_out_date.trim() ? parseBookingDate(form.check_out_date) : null;
    const guestCount = Number(form.guest_count);

    if (!form.property_id.trim()) {
        errors.property_id = 'Enter a property ID.';
    }
    if (!form.manager_id.trim()) {
        errors.manager_id = 'Enter a manager ID.';
    }
    if (!form.check_in_date.trim()) {
        errors.check_in_date = 'Choose a check-in date.';
    } else if (!checkIn) {
        errors.check_in_date = 'Enter a valid check-in date.';
    }
    if (!form.check_out_date.trim()) {
        errors.check_out_date = 'Choose a check-out date.';
    } else if (!checkOut) {
        errors.check_out_date = 'Enter a valid check-out date.';
    }
    if (!form.guest_count.trim() || !Number.isInteger(guestCount) || guestCount < 1) {
        errors.guest_count = 'Enter at least 1 guest.';
    } else if (guestCount > MAX_BOOKING_GUEST_COUNT) {
        errors.guest_count = 'Keep guests to 20 or fewer.';
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
        errors.check_out_date = 'Choose a check-out date after check-in.';
    }
    if (normalizeBookingSpecialRequests(form.special_requests).length > MAX_BOOKING_SPECIAL_REQUESTS_LENGTH) {
        errors.special_requests = 'Keep special requests to 1000 characters or fewer.';
    }

    return errors;
}

export function groupBookingsByStatus<T extends { status: string }>(bookings: T[]) {
    return BOOKING_STATUS_GROUPS.map((group) => ({
        ...group,
        items: bookings.filter((booking) => booking.status === group.status),
    }));
}

export function buildBookingDetailRows(booking: Booking) {
    const rows = [
        { label: 'Booking ID', value: booking.id },
        { label: 'Status', value: booking.status },
        { label: 'Property ID', value: booking.property_id },
        { label: 'Manager ID', value: booking.manager_id },
        { label: 'Check-in', value: new Date(booking.check_in_date).toLocaleDateString() },
        { label: 'Check-out', value: new Date(booking.check_out_date).toLocaleDateString() },
        { label: 'Guests', value: String(booking.guest_count) },
        { label: 'Total', value: `${booking.currency}${booking.total_amount.toLocaleString()}` },
    ];

    if (booking.cancellation_reason) {
        rows.push({ label: 'Cancellation reason', value: booking.cancellation_reason });
    }

    return rows;
}

export default function BookingsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [reservationForm, setReservationForm] = useState<BookingReservationForm>(EMPTY_RESERVATION_FORM);
    const [reservationErrors, setReservationErrors] = useState<BookingReservationValidationErrors>({});
    const [savingReservation, setSavingReservation] = useState(false);
    const [detailTarget, setDetailTarget] = useState<Booking | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
    const [cancellingBookingID, setCancellingBookingID] = useState<string | null>(null);
    const reservationInFlightRef = useRef(false);
    const cancelInFlightRef = useRef(false);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setIsLoading(true);
                const result = await bookingsService.getBookings();
                setBookings(result || []);
            } catch (error: any) {
                toast.error('Failed to load bookings');
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();
    }, [toast]);

    const filteredBookings = useMemo(() => {
        if (!searchQuery.trim()) return bookings;
        const query = searchQuery.toLowerCase();
        return bookings.filter(b => 
            b.id.toLowerCase().includes(query) ||
            b.property_id.toLowerCase().includes(query) || 
            (b as any).property_title?.toLowerCase().includes(query)
        );
    }, [bookings, searchQuery]);
    const groupedBookings = useMemo(() => groupBookingsByStatus(filteredBookings), [filteredBookings]);

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800';
            case 'pending':
                return 'bg-yellow-50 text-yellow-800 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800';
            case 'cancelled':
                return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800';
            case 'completed':
                return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    const updateReservationField = (field: keyof BookingReservationForm, value: string) => {
        setReservationForm((previous) => ({ ...previous, [field]: value }));
        setReservationErrors((previous) => {
            if (!previous[field]) {
                return previous;
            }
            const { [field]: _removedError, ...remainingErrors } = previous;
            return remainingErrors;
        });
    };

    const openReservationModal = () => {
        setReservationForm(EMPTY_RESERVATION_FORM);
        setReservationErrors({});
        setReservationModalOpen(true);
    };

    const closeReservationModal = () => {
        if (reservationInFlightRef.current) {
            return;
        }
        setReservationModalOpen(false);
        setReservationForm(EMPTY_RESERVATION_FORM);
        setReservationErrors({});
    };

    const openDetailModal = (booking: Booking) => {
        setDetailTarget(booking);
    };

    const closeDetailModal = () => {
        setDetailTarget(null);
    };

    const submitReservation = async () => {
        if (reservationInFlightRef.current) {
            return;
        }
        const validationErrors = validateBookingReservationForm(reservationForm);
        setReservationErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix the reservation details.');
            return;
        }

        reservationInFlightRef.current = true;
        setSavingReservation(true);
        try {
            const booking = await bookingsService.createBooking({
                property_id: reservationForm.property_id.trim(),
                manager_id: reservationForm.manager_id.trim(),
                check_in_date: reservationForm.check_in_date.trim(),
                check_out_date: reservationForm.check_out_date.trim(),
                guest_count: Number(reservationForm.guest_count),
                special_requests: normalizeBookingSpecialRequests(reservationForm.special_requests),
            });
            setBookings((previous) => [booking, ...previous.filter((item) => item.id !== booking.id)]);
            toast.success('Reservation request created.');
            setReservationModalOpen(false);
            setReservationForm(EMPTY_RESERVATION_FORM);
            setReservationErrors({});
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create reservation.');
        } finally {
            reservationInFlightRef.current = false;
            setSavingReservation(false);
        }
    };

    const openCancelModal = (booking: Booking) => {
        setCancelTarget(booking);
        setCancelReason('');
        setCancelReasonError(null);
    };

    const closeCancelModal = () => {
        if (cancelInFlightRef.current) {
            return;
        }
        setCancelTarget(null);
        setCancelReason('');
        setCancelReasonError(null);
    };

    const submitCancelBooking = async () => {
        if (!cancelTarget || cancelInFlightRef.current) {
            return;
        }
        const validationError = validateBookingCancelReason(cancelReason);
        setCancelReasonError(validationError);
        if (validationError) {
            toast.error('Please enter a valid cancellation reason.');
            return;
        }

        const normalizedReason = normalizeBookingCancelReason(cancelReason);
        cancelInFlightRef.current = true;
        setCancellingBookingID(cancelTarget.id);
        try {
            await bookingsService.cancelBooking(cancelTarget.id, normalizedReason);
            setBookings((previous) => previous.map((booking) => (
                booking.id === cancelTarget.id ? { ...booking, status: 'cancelled', cancellation_reason: normalizedReason } : booking
            )));
            toast.success('Booking cancelled.');
            setCancelTarget(null);
            setCancelReason('');
            setCancelReasonError(null);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to cancel booking.');
        } finally {
            cancelInFlightRef.current = false;
            setCancellingBookingID(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                                My Bookings
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                Track your rental stays and purchase agreements
                            </p>
                        </div>
                        
                        <div className="flex w-full flex-col gap-3 md:w-96">
                            <button
                                type="button"
                                onClick={openReservationModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 hover:bg-orange-600"
                            >
                                <Plus size={18} />
                                Reserve Booking
                            </button>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by property or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {filteredBookings.length > 0 ? (
                    <div className="space-y-6">
                        {groupedBookings.map((group) => group.items.length > 0 ? (
                            <section key={group.status} className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                        {group.label}
                                    </h2>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                                        {group.items.length}
                                    </span>
                                </div>
                                <div className="space-y-6">
                                    {group.items.map((booking) => (
                                        <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-transparent hover:border-orange-500/20 transition-all group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                                        <Calendar size={32} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Stay Booking</h3>
                                                        <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                                                            <MapPin size={14} className="text-orange-500" />
                                                            Property ID: {booking.property_id.substring(0, 8)}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(booking.status)}`}>
                                                    {booking.status}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t dark:border-gray-700">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{new Date(booking.check_in_date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-out</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{new Date(booking.check_out_date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                                                    <p className="font-black text-orange-500 text-xl">{booking.currency}{booking.total_amount.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="mt-8 flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetailModal(booking)}
                                                    className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all"
                                                >
                                                    View Details
                                                </button>
                                                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openCancelModal(booking)}
                                                        className="flex-1 rounded-2xl bg-red-50 py-4 text-xs font-black uppercase tracking-widest text-red-700 transition-all active:scale-[0.98] hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null)}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl p-16 text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8">
                            {searchQuery ? <Search size={48} className="text-gray-200" /> : <Calendar size={48} className="text-gray-200" />}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {searchQuery ? "No matching bookings" : "No bookings found"}
                        </h3>
                        <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10">
                            {searchQuery 
                                ? "We couldn't find any bookings matching your search query. Try another term."
                                : "You haven't made any stay bookings or purchases yet. Ready to find your next space?"}
                        </p>
                        {searchQuery ? (
                             <button
                                onClick={() => setSearchQuery('')}
                                className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black active:scale-95 transition-all"
                            >
                                Clear Search
                            </button>
                        ) : (
                            <button
                                onClick={openReservationModal}
                                className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black active:scale-95 transition-all"
                            >
                                Reserve Booking
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Modal
                isOpen={reservationModalOpen}
                onClose={closeReservationModal}
                title="Reserve Booking"
                size="md"
                closeOnBackdrop={!savingReservation}
                footer={(
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeReservationModal}
                            disabled={savingReservation}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={submitReservation}
                            disabled={savingReservation}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {savingReservation && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Reservation
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
                                value={reservationForm.property_id}
                                onChange={(event) => updateReservationField('property_id', event.target.value)}
                                aria-describedby={reservationErrors.property_id ? 'booking-property-error' : undefined}
                                disabled={savingReservation}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {reservationErrors.property_id ? (
                                <p id="booking-property-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {reservationErrors.property_id}
                                </p>
                            ) : null}
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Manager ID</span>
                            <input
                                type="text"
                                value={reservationForm.manager_id}
                                onChange={(event) => updateReservationField('manager_id', event.target.value)}
                                aria-describedby={reservationErrors.manager_id ? 'booking-manager-error' : undefined}
                                disabled={savingReservation}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {reservationErrors.manager_id ? (
                                <p id="booking-manager-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {reservationErrors.manager_id}
                                </p>
                            ) : null}
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Check-in</span>
                            <DateField
                                value={reservationForm.check_in_date}
                                onChange={(value) => updateReservationField('check_in_date', value)}
                                ariaLabel="Booking check-in date"
                                ariaDescribedBy={reservationErrors.check_in_date ? 'booking-check-in-error' : undefined}
                                disabled={savingReservation}
                                buttonClassName="bg-gray-50 dark:bg-gray-900"
                            />
                            {reservationErrors.check_in_date ? (
                                <p id="booking-check-in-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {reservationErrors.check_in_date}
                                </p>
                            ) : null}
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Check-out</span>
                            <DateField
                                value={reservationForm.check_out_date}
                                onChange={(value) => updateReservationField('check_out_date', value)}
                                ariaLabel="Booking check-out date"
                                ariaDescribedBy={reservationErrors.check_out_date ? 'booking-check-out-error' : undefined}
                                disabled={savingReservation}
                                buttonClassName="bg-gray-50 dark:bg-gray-900"
                            />
                            {reservationErrors.check_out_date ? (
                                <p id="booking-check-out-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {reservationErrors.check_out_date}
                                </p>
                            ) : null}
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Guests</span>
                        <input
                            type="number"
                            min={1}
                            max={MAX_BOOKING_GUEST_COUNT}
                            value={reservationForm.guest_count}
                            onChange={(event) => updateReservationField('guest_count', event.target.value)}
                            aria-describedby={reservationErrors.guest_count ? 'booking-guests-error' : undefined}
                            disabled={savingReservation}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        {reservationErrors.guest_count ? (
                            <p id="booking-guests-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {reservationErrors.guest_count}
                            </p>
                        ) : null}
                    </label>

                    <label className="block space-y-2 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Special requests</span>
                        <textarea
                            rows={4}
                            value={reservationForm.special_requests}
                            onChange={(event) => updateReservationField('special_requests', event.target.value)}
                            aria-describedby={reservationErrors.special_requests ? 'booking-special-requests-error' : 'booking-special-requests-count'}
                            disabled={savingReservation}
                            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        {reservationErrors.special_requests ? (
                            <p id="booking-special-requests-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {reservationErrors.special_requests}
                            </p>
                        ) : (
                            <p id="booking-special-requests-count" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {normalizeBookingSpecialRequests(reservationForm.special_requests).length}/{MAX_BOOKING_SPECIAL_REQUESTS_LENGTH}
                            </p>
                        )}
                    </label>
                </div>
            </Modal>

            <Modal
                isOpen={Boolean(detailTarget)}
                onClose={closeDetailModal}
                title="Booking Details"
                size="md"
                footer={(
                    <button
                        type="button"
                        onClick={closeDetailModal}
                        className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                        Close
                    </button>
                )}
            >
                {detailTarget && (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Stay booking for property {detailTarget.property_id.slice(0, 8)}
                        </p>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {buildBookingDetailRows(detailTarget).map((row) => (
                                <div key={row.label} className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                                    <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        {row.label}
                                    </dt>
                                    <dd className="mt-1 break-words text-sm font-bold text-gray-900 dark:text-white">
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(cancelTarget)}
                onClose={closeCancelModal}
                title="Cancel Booking"
                size="md"
                closeOnBackdrop={!cancellingBookingID}
                footer={cancelTarget ? (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeCancelModal}
                            disabled={Boolean(cancellingBookingID)}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                            Keep Booking
                        </button>
                        <button
                            type="button"
                            onClick={submitCancelBooking}
                            disabled={Boolean(cancellingBookingID)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {cancellingBookingID && <Loader2 className="h-4 w-4 animate-spin" />}
                            Cancel Booking
                        </button>
                    </div>
                ) : null}
            >
                {cancelTarget && (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Booking {cancelTarget.id.slice(0, 8)}
                        </p>
                        <label className="block space-y-2 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Cancellation reason</span>
                            <textarea
                                rows={4}
                                value={cancelReason}
                                onChange={(event) => {
                                    setCancelReason(event.target.value);
                                    if (cancelReasonError) {
                                        setCancelReasonError(null);
                                    }
                                }}
                                aria-describedby={cancelReasonError ? 'booking-cancel-reason-error' : 'booking-cancel-reason-count'}
                                disabled={Boolean(cancellingBookingID)}
                                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {cancelReasonError ? (
                                <p id="booking-cancel-reason-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {cancelReasonError}
                                </p>
                            ) : (
                                <p id="booking-cancel-reason-count" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {normalizeBookingCancelReason(cancelReason).length}/{MAX_BOOKING_CANCEL_REASON_LENGTH}
                                </p>
                            )}
                        </label>
                    </div>
                )}
            </Modal>
        </div>
    );
}
