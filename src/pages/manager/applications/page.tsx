"use client";

import React, { useState, Suspense, useEffect, useMemo } from 'react';
import {
    FileText, Clock, CheckCircle, XCircle, FileCheck, Plus, Filter,
    Search, Eye, Edit, Trash2, Mail, Phone, Download, Share2,
    FileDown, FileSpreadsheet, Loader2, MoreVertical, ChevronRight,
    ArrowUpRight, TrendingUp, Users, Calendar, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as applicationsService from '@/services/applicationsService';
import { useApplications, APPLICATION_STATUS, ApplicationsProvider } from '@/contexts/ApplicationsContext';
import ApplicationCard from '@/components/manager/applications/ApplicationCard';
import ApplicationDetail from '@/components/manager/applications/ApplicationDetail';
import ApplicationFilters from '@/components/manager/applications/ApplicationFilters';

interface ApplicationsContentProps {
    initialView?: 'list' | 'detail';
}

function ApplicationsContent({ initialView = 'list' }: ApplicationsContentProps) {
    const { user } = useAuth();
    const toast = useToast();
    const {
        allApplications,
        isLoading: contextLoading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        propertyTypeFilter,
        setPropertyTypeFilter,
        dateRangeFilter,
        setDateRangeFilter,
        updateApplicationStatus
    } = useApplications();

    const [view, setView] = useState<'list' | 'detail'>(initialView);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Filtered applications are already provided by context
    const applications = allApplications;

    const stats = useMemo(() => {
        const total = applications.length;
        const pending = applications.filter((a: any) => a.status === APPLICATION_STATUS.PENDING || a.status === APPLICATION_STATUS.SUBMITTED).length;
        const actionRequired = applications.filter((a: any) => a.requiresAction).length;
        const approved = applications.filter((a: any) => a.status === APPLICATION_STATUS.APPROVED).length;

        return [
            { label: 'Total Active', value: total.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Pending Review', value: pending.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Action Required', value: actionRequired.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Completed', value: approved.toString(), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ];
    }, [applications]);

    const handleCardClick = (id: string) => {
        setSelectedId(id);
        setView('detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCloseDetail = () => {
        setView('list');
        setSelectedId(null);
    };

    const handleUpdateStatus = async (id: string, status: any) => {
        try {
            await updateApplicationStatus(id, status);
            toast.success(`Application status updated to ${status.replace(/_/g, ' ')}`);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    if (view === 'detail' && selectedId) {
        return (
            <ApplicationDetail
                applicationId={selectedId}
                onClose={handleCloseDetail}
                onUpdateStatus={handleUpdateStatus}
            />
        );
    }

    return (
        <div className="space-y-6 font-outfit animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Applications
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Track and manage your property applications
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95">
                        <Plus size={18} /> New Application
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Filters */}
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

            {/* Applications List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {contextLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[200px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700" />
                    ))
                ) : applications.length > 0 ? (
                    applications.map((app) => (
                        <ApplicationCard
                            key={app.id}
                            application={app}
                            onClick={() => handleCardClick(app.id)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No applications found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            {searchQuery || statusFilter !== 'all'
                                ? "No applications match your current filters. Try adjusting them to see more results."
                                : "You haven't submitted any applications yet. When you do, they'll appear here."}
                        </p>
                        {(searchQuery || statusFilter !== 'all' || propertyTypeFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setPropertyTypeFilter('all');
                                    setDateRangeFilter({ start: null, end: null });
                                }}
                                className="mt-6 text-orange-500 font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ManagerApplicationsPage() {
    return (
        <ApplicationsProvider>
            <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Applications...</div>}>
                <ApplicationsContent />
            </Suspense>
        </ApplicationsProvider>
    );
}
