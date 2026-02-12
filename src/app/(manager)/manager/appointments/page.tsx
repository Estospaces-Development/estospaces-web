'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    CheckCircle,
    XCircle,
    CalendarCheck,
    Plus,
    Eye,
    Edit,
    Trash2,
    MapPin,
    Loader2,
    ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Appointment {
    id: string;
    clientName: string;
    date: string;
    time: string;
    description: string;
    status: string;
    property?: string;
    phone?: string;
    email?: string;
}

export default function ManagerAppointmentsPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        // Mock data — matches legacy Appointment.tsx UK-localised
        const mockAppointments: Appointment[] = [
            {
                id: '1',
                clientName: 'Sarah Johnson',
                date: '2026-02-28',
                time: '14:00',
                description: 'First viewing - Canary Wharf Apartment',
                status: 'Confirmed',
                property: 'Canary Wharf Apartment',
                phone: '+44 20 7123 4567',
                email: 'sarah.j@example.com',
            },
            {
                id: '2',
                clientName: 'Michael Chen',
                date: '2026-03-01',
                time: '10:30',
                description: 'Second viewing - Kensington Townhouse',
                status: 'Pending',
                property: 'Kensington Townhouse',
                phone: '+44 20 7987 6543',
                email: 'michael.c@example.com',
            },
            {
                id: '3',
                clientName: 'Emily Wilson',
                date: '2026-02-25',
                time: '16:00',
                description: 'Initial consultation',
                status: 'Completed',
                property: 'Shoreditch Penthouse',
                phone: '+44 20 7456 7890',
                email: 'emily.w@example.com',
            },
            {
                id: '4',
                clientName: 'David Brown',
                date: '2026-03-05',
                time: '11:00',
                description: 'Follow-up viewing',
                status: 'Cancelled',
                property: 'Richmond Family Home',
                phone: '+44 20 7234 5678',
                email: 'david.b@example.com',
            },
            {
                id: '5',
                clientName: 'Jessica Taylor',
                date: '2026-03-10',
                time: '15:30',
                description: 'Contract signing',
                status: 'Confirmed',
                property: 'Canary Wharf Apartment',
                phone: '+44 20 7345 6789',
                email: 'jessica.t@example.com',
            },
        ];

        setTimeout(() => {
            setAppointments(mockAppointments);
            setLoading(false);
        }, 300);
    }, []);

    const handleDeleteAppointment = (id: string) => {
        setAppointments((prev) => prev.filter((apt) => apt.id !== id));
        setShowDeleteConfirm(null);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <div className="mb-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Appointment</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage client appointments</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { title: 'New Appointments', value: appointments.filter(a => a.status === 'Pending').length, icon: CalendarIcon, iconColor: 'bg-blue-500', shadowColor: 'shadow-blue-500/20' },
                    { title: 'Confirmed', value: appointments.filter(a => a.status === 'Confirmed').length, icon: CheckCircle, iconColor: 'bg-green-500', shadowColor: 'shadow-green-500/20' },
                    { title: 'Pending', value: appointments.filter(a => a.status === 'Pending').length, icon: Clock, iconColor: 'bg-yellow-500', shadowColor: 'shadow-yellow-500/20' },
                    { title: 'Completed', value: appointments.filter(a => a.status === 'Completed').length, icon: CalendarCheck, iconColor: 'bg-purple-500', shadowColor: 'shadow-purple-500/20' },
                    { title: 'Cancelled', value: appointments.filter(a => a.status === 'Cancelled').length, icon: XCircle, iconColor: 'bg-red-500', shadowColor: 'shadow-red-500/20' },
                ].map((card) => (
                    <div key={card.title} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 ${card.iconColor} rounded-lg shadow-lg ${card.shadowColor}`}>
                                <card.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{card.value}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.title}</p>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${viewMode === 'calendar'
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                >
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Calendar</span>
                </button>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add New Appointment</span>
                </button>
            </div>

            {/* Appointments List View */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Appointments ({appointments.length})</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No appointments scheduled</p>
                            <button className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium">
                                Add Your First Appointment
                            </button>
                        </div>
                    ) : (
                        appointments.map((appointment) => (
                            <div key={appointment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <CalendarIcon className="w-6 h-6 text-primary" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{appointment.clientName}</h3>
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full ${appointment.status === 'Confirmed'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                            : appointment.status === 'Pending'
                                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                                                : appointment.status === 'Completed'
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                                            }`}
                                                    >
                                                        {appointment.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{appointment.description}</p>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="w-4 h-4" />
                                                        <span>{formatDate(appointment.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{appointment.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{appointment.property || 'Property Location'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="View"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Delete"
                                            onClick={() => setShowDeleteConfirm(appointment.id)}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Delete Appointment</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this appointment? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteAppointment(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
