"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowLeft, Loader2, CreditCard, Search } from 'lucide-react';
import { bookingsService, type Booking } from '../../../services/bookingsService';
import { useToast } from '../../../contexts/ToastContext';

export default function BookingsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:border-green-800';
            case 'pending':
                return 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800';
            case 'cancelled':
                return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800';
            case 'completed':
                return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:border-gray-700';
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
                        
                        <div className="relative w-full md:w-80">
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

                {filteredBookings.length > 0 ? (
                    <div className="space-y-6">
                        {filteredBookings.map((booking) => (
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
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</p>
                                        <p className="font-black text-orange-500 text-xl">{booking.currency}{booking.total_amount.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all">
                                        View Details
                                    </button>
                                    <button className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-gray-400 hover:text-orange-500 transition-colors">
                                        <CreditCard size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
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
                                onClick={() => navigate('/user/dashboard/discover')}
                                className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black active:scale-95 transition-all"
                            >
                                Find Properties
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
