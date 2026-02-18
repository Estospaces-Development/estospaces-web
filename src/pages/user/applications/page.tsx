"use client";

import React, { useState } from 'react';
import {
    Building2,
    MapPin,
    Search,
    Filter,
    Plus,
    LayoutGrid,
    List,
    FileText,
    ArrowLeft,
    Clock,
    CheckCircle,
    Bell,
    Inbox,
    X,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApplications, APPLICATION_STATUS } from '@/contexts/ApplicationsContext';
import ApplicationCard from '@/components/dashboard/applications/ApplicationCard';
import ApplicationCardSkeleton from '@/components/dashboard/applications/ApplicationCardSkeleton';
import ApplicationFilters from '@/components/dashboard/applications/ApplicationFilters';

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
        fetchApplications
    } = useApplications();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    // Calculate stats
    const totalApplications = applications.length;
    const pendingStatusList: string[] = [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.UNDER_REVIEW, APPLICATION_STATUS.PENDING];
    const pendingCount = applications.filter(app =>
        pendingStatusList.includes(app.status)
    ).length;
    const approvedCount = applications.filter(app => app.status === APPLICATION_STATUS.APPROVED).length;
    const actionRequiredCount = applications.filter(app => app.requiresAction).length;

    const handleApplicationClick = (appId: string) => {
        // Navigate to detail page
        // navigate(`/user/applications/${appId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            My Applications
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track and manage your property applications in one place.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center p-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button className="flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none">
                            <Plus size={18} />
                            <span>New Search</span>
                        </button>
                    </div>
                </div>

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

                {/* Action Required Banner */}
                {applications.some(app => app.requiresAction) && (
                    <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-start gap-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                            <AlertCircle className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Action Required</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                You have applications that require document uploads or additional information.
                                Look for the orange "Action" badge below.
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
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                onClick={() => handleApplicationClick(app.id)}
                            />
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
                                ? "We couldn't find any applications matching your filters. Try clearing them to see all applications."
                                : "You haven't submitted any property applications yet. Start your journey by discovering properties."}
                        </p>
                        {!searchQuery && statusFilter === 'all' && propertyTypeFilter === 'all' && (
                            <button className="mt-8 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 dark:shadow-none">
                                Discover Properties
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
