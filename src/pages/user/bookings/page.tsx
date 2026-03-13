"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import BookingCard from '@/components/dashboard/BookingCard';
import Select from '@/components/ui/Select';
import { bookingsService, Booking } from '@/services/bookingsService';

const BookingsPage = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await bookingsService.getBookings();
            if (data) {
                // Map backend bookings to UI format
                const mapped = data.map(b => ({
                    id: b.id,
                    propertyTitle: 'Property Booking', // Ideally joined from backend
                    propertyAddress: 'Location',
                    date: new Date(b.check_in_date).toLocaleDateString(),
                    time: 'All Day',
                    status: b.status,
                    type: 'booking',
                    agentName: 'Manager'
                }));
                setBookings(mapped);
            }
        } catch (err: any) {
            console.error('Error fetching bookings:', err);
            setError(err.message || 'Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const filtered = bookings.filter(b => {
        if (statusFilter && b.status !== statusFilter) return false;
        if (typeFilter && b.type !== typeFilter) return false;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">My Bookings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">View and manage your property viewings and appointments</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="w-4 h-4" /> Filter:
                </div>
                <Select
                    options={[
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                    className="w-full sm:w-48"
                />
                <Select
                    options={[
                        { value: 'viewing', label: 'Viewing' },
                        { value: 'inspection', label: 'Inspection' },
                        { value: 'meeting', label: 'Meeting' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    placeholder="All Types"
                    className="w-full sm:w-48"
                />
            </div>

            {/* Bookings List */}
            {filtered.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bookings found</h3>
                    <p className="text-gray-500 dark:text-gray-400">You don't have any bookings matching the filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(b => (
                        <BookingCard key={b.id} {...b} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookingsPage;
