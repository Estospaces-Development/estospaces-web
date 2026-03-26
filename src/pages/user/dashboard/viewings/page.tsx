"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    Plus,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notifyViewingCancelled } from '@/services/notificationsService';
import { useToast } from '@/contexts/ToastContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getPropertyById } from '@/services/propertyService';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import { resolveFocusedViewing } from '@/lib/workspaceLinks';

// Services
import { bookingsService } from '@/services/bookingsService';

export default function ViewingsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const [viewings, setViewings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [viewingToCancel, setViewingToCancel] = useState<string | null>(null);

    const fetchViewings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await bookingsService.getViewings();
            const propertyIDsNeedingImages = Array.from(
                new Set(
                    data
                        .filter((viewing: any) => !viewing.property_image && typeof viewing.property_id === 'string' && viewing.property_id.trim().length > 0)
                        .map((viewing: any) => viewing.property_id),
                ),
            );

            const propertyImageEntries = await Promise.all(
                propertyIDsNeedingImages.map(async (propertyID) => {
                    try {
                        const { data: property } = await getPropertyById(propertyID);
                        return [propertyID, getPrimaryPropertyImage(property)] as const;
                    } catch {
                        return [propertyID, null] as const;
                    }
                }),
            );

            const propertyImageMap = new Map(propertyImageEntries);
            const mappedViewings = data.map((viewing: any) => ({
                ...viewing,
                date: viewing.scheduled_at,
                time: viewing.scheduled_at ? new Date(viewing.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                propertyImage: viewing.property_image || propertyImageMap.get(viewing.property_id) || PROPERTY_PLACEHOLDER_IMAGE,
                propertyTitle: viewing.property_title || 'Property',
                propertyAddress: viewing.property_address || 'Address not available',
                propertyPrice: viewing.property_price || 0,
                listingType: viewing.listing_type || 'sale',
                agentName: viewing.agent_name || 'Agent',
                agentPhone: viewing.agent_phone || '',
            }));
            setViewings(mappedViewings);
        } catch (err: any) {
            toast.error('Failed to load viewings');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchViewings();
    }, [fetchViewings]);

    const focusedViewingId = resolveFocusedViewing(viewings, {
        viewingId: searchParams.get('viewing'),
        applicationId: searchParams.get('application'),
        caseId: searchParams.get('case'),
        leadId: searchParams.get('lead'),
        propertyId: searchParams.get('property'),
    })?.id || null;

    const filteredViewings = [...viewings]
        .filter(viewing => {
            if (!viewing.date) return true;
            const viewingDate = new Date(viewing.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            switch (filter) {
                case 'upcoming':
                    return viewingDate >= today && viewing.status !== 'cancelled';
                case 'past':
                    return viewingDate < today || viewing.status === 'completed';
                case 'cancelled':
                    return viewing.status === 'cancelled';
                default:
                    return true;
            }
        })
        .sort((left, right) => {
            if (!focusedViewingId) {
                return 0;
            }
            if (left.id === focusedViewingId) {
                return -1;
            }
            if (right.id === focusedViewingId) {
                return 1;
            }
            return 0;
        });

    const handleCancelViewing = async (viewingId: string) => {
        if (!user?.id) {
            toast.error('You must be logged in to cancel a viewing.');
            return;
        }

        try {
            await bookingsService.cancelViewing(viewingId, 'Cancelled by user');

            setViewings(prev => prev.map(v =>
                v.id === viewingId ? { ...v, status: 'cancelled' } : v
            ));

            const viewing = viewings.find(v => v.id === viewingId);
            if (viewing) {
                await notifyViewingCancelled(
                    user.id,
                    viewing.propertyTitle,
                    viewing.property_id,
                    viewing.date,
                    'Cancelled by you'
                );
            }
            toast.success('Viewing appointment cancelled successfully.');
        } catch (err) {
            toast.error('Failed to cancel viewing. Please try again.');
        } finally {
            setCancelModalOpen(false);
            setViewingToCancel(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: any = {
            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
            confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Confirmed' },
            cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Cancelled' },
            completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'Completed' },
            rescheduled: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', label: 'Rescheduled' },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Viewings</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Manage your appointments with property agents
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/user/dashboard/discover')}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            Book New Viewing
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    {['all', 'upcoming', 'past', 'cancelled'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${filter === f
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)} Viewings
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                        <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium tracking-wide">Fetching your appointments...</p>
                    </div>
                ) : filteredViewings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {focusedViewingId && (
                            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                                Your linked fast-track appointment is pinned first so you can keep the live journey moving without searching manually.
                            </div>
                        )}
                        {filteredViewings.map((viewing) => (
                            <div
                                key={viewing.id}
                                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 ${
                                    viewing.id === focusedViewingId
                                        ? 'ring-2 ring-orange-300 dark:ring-orange-700'
                                        : ''
                                }`}
                            >
                                <div className="flex flex-col md:flex-row">
                                    {/* Property Image */}
                                    <div className="md:w-64 h-48 md:h-auto relative overflow-hidden">
                                        <img
                                            src={viewing.propertyImage}
                                            alt={viewing.propertyTitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(event) => {
                                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                            }}
                                        />
                                        <div className="absolute top-4 left-4">
                                            {getStatusBadge(viewing.status)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">
                                                    {viewing.propertyTitle}
                                                </h3>
                                                {viewing.propertyPrice && (
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                        £{viewing.propertyPrice.toLocaleString()}
                                                        <span className="text-sm text-gray-500 font-normal">{viewing.listingType === 'rent' ? '/mo' : ''}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                                                <MapPin size={16} className="text-orange-500" />
                                                <span className="line-clamp-1">{viewing.propertyAddress}</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                    <Calendar size={20} className="text-orange-500" />
                                                    <div>
                                                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Date</span>
                                                        <span className="font-bold text-gray-700 dark:text-white">{formatDate(viewing.date)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                    <Clock size={20} className="text-orange-500" />
                                                    <div>
                                                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Time</span>
                                                        <span className="font-bold text-gray-700 dark:text-white">{formatTime(viewing.time)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {(viewing.user_notes || viewing.manager_notes || viewing.cancellation_reason) && (
                                                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
                                                    {viewing.user_notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            <span className="font-bold text-gray-900 dark:text-white">Your note:</span> {viewing.user_notes}
                                                        </p>
                                                    )}
                                                    {viewing.manager_notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            <span className="font-bold text-gray-900 dark:text-white">Manager note:</span> {viewing.manager_notes}
                                                        </p>
                                                    )}
                                                    {viewing.cancellation_reason && (
                                                        <p className="text-sm text-red-600 dark:text-red-300">
                                                            <span className="font-bold">Cancellation reason:</span> {viewing.cancellation_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center font-bold text-orange-600">
                                                    {viewing.agentName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{viewing.agentName}</p>
                                                    <p className="text-xs text-gray-500">{viewing.agentPhone}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 w-full sm:w-auto">
                                                {viewing.workflow_locked && (
                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                                        {viewing.workflow_lock_reason || 'This appointment is locked because the linked workflow has already progressed.'}
                                                    </div>
                                                )}
                                                <div className="flex gap-3 w-full sm:w-auto">
                                                <button
                                                    onClick={() => navigate(`/user/properties/${viewing.property_id}`)}
                                                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    View Listing
                                                </button>
                                                {(viewing.status === 'pending' || viewing.status === 'confirmed') && !viewing.workflow_locked && (
                                                    <button
                                                        onClick={() => {
                                                            setViewingToCancel(viewing.id);
                                                            setCancelModalOpen(true);
                                                        }}
                                                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        Cancel Appointment
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                        <div className="inline-flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                            <Calendar className="text-gray-300" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nothing to see here</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            You don't have any {filter === 'all' ? '' : filter} viewings scheduled. Start exploring properties to book your first appointment.
                        </p>
                        <button
                            onClick={() => navigate('/user/dashboard/discover')}
                            className="mt-8 px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                        >
                            Find Properties
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={() => viewingToCancel && handleCancelViewing(viewingToCancel)}
                title="Cancel Viewing Appointment"
                message="Are you sure you want to cancel this viewing appointment? This action cannot be undone."
                confirmText="Yes, Cancel"
                cancelText="No, Keep It"
                variant="danger"
            />
        </div>
    );
}
