"use client";

import React, { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import BookingCard from '@/components/dashboard/BookingCard';
import Select from '@/components/ui/Select';

const mockBookings = [
    { id: 'b1', propertyTitle: '2 Bed Apartment, Canary Wharf', propertyAddress: 'Canary Wharf, London E14', date: '15 Feb 2026', time: '10:00 AM', status: 'confirmed' as const, type: 'viewing' as const, agentName: 'Sarah Johnson' },
    { id: 'b2', propertyTitle: '3 Bed Semi-Detached, Richmond', propertyAddress: 'Richmond, London TW10', date: '18 Feb 2026', time: '2:30 PM', status: 'pending' as const, type: 'inspection' as const, agentName: 'Mike Peters' },
    { id: 'b3', propertyTitle: 'Studio Flat, Shoreditch', propertyAddress: 'Shoreditch, London E1', date: '10 Feb 2026', time: '11:00 AM', status: 'completed' as const, type: 'viewing' as const, agentName: 'Emily Davis' },
    { id: 'b4', propertyTitle: '4 Bed Detached, Kensington', propertyAddress: 'Kensington, London W8', date: '20 Feb 2026', time: '3:00 PM', status: 'confirmed' as const, type: 'meeting' as const, agentName: 'James Wilson' },
    { id: 'b5', propertyTitle: '1 Bed Flat, Brixton', propertyAddress: 'Brixton, London SW2', date: '5 Feb 2026', time: '9:30 AM', status: 'cancelled' as const, type: 'viewing' as const, agentName: 'Alice Brown' },
];

const BookingsPage = () => {
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const filtered = mockBookings.filter(b => {
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
