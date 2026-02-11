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
    AlertCircle,
    FileText
} from 'lucide-react';
import { useApplications } from '@/contexts/ApplicationsContext';
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

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    const handleApplicationClick = (appId: string) => {
        // Navigate to detail page
        // router.push(`/user/applications/${appId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-orange-500" />
                            My Applications
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track and manage your property applications in one place.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors shadow-sm">
                            <Plus size={18} />
                            <span>New Lead</span>
                        </button>
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
