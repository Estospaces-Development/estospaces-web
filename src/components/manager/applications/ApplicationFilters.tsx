import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { APPLICATION_STATUS } from '../../../contexts/ApplicationsContext';

interface ApplicationFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    propertyTypeFilter: string;
    setPropertyTypeFilter: (type: string) => void;
    dateRangeFilter: { start: string | null; end: string | null };
    setDateRangeFilter: (range: { start: string | null; end: string | null }) => void;
    showFilters?: boolean;
    setShowFilters?: (show: boolean) => void;
    hideToggleButton?: boolean;
}

const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    propertyTypeFilter,
    setPropertyTypeFilter,
    dateRangeFilter,
    setDateRangeFilter,
    showFilters: externalShowFilters,
    setShowFilters: externalSetShowFilters,
    hideToggleButton = false,
}) => {
    const [internalShowFilters, setInternalShowFilters] = useState(false);

    // Use external state if provided, otherwise use internal state
    const showFilters = externalShowFilters !== undefined ? externalShowFilters : internalShowFilters;
    const setShowFilters = externalSetShowFilters || setInternalShowFilters;

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: APPLICATION_STATUS.DRAFT, label: 'Draft' },
        { value: APPLICATION_STATUS.SUBMITTED, label: 'Submitted' },
        { value: APPLICATION_STATUS.UNDER_REVIEW, label: 'Under Review' },
        { value: APPLICATION_STATUS.DOCUMENTS_REQUESTED, label: 'Documents Requested' },
        { value: APPLICATION_STATUS.APPROVED, label: 'Approved' },
        { value: APPLICATION_STATUS.REJECTED, label: 'Rejected' },
        { value: APPLICATION_STATUS.WITHDRAWN, label: 'Withdrawn' },
    ];

    const propertyTypeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'apartment', label: 'Apartment' },
        { value: 'condo', label: 'Condo' },
        { value: 'house', label: 'House' },
        { value: 'townhouse', label: 'Townhouse' },
    ];

    const hasActiveFilters =
        statusFilter !== 'all' ||
        propertyTypeFilter !== 'all' ||
        dateRangeFilter.start !== null ||
        dateRangeFilter.end !== null;

    const clearFilters = () => {
        setStatusFilter('all');
        setPropertyTypeFilter('all');
        setDateRangeFilter({ start: null, end: null });
    };

    return (
        <div className="space-y-4 font-outfit">
            {/* Search Bar */}
            <div className="relative">
                <Search
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Search by property name, location, or application ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all shadow-sm"
                />
            </div>

            {/* Filter Toggle - only show if not hidden */}
            {!hideToggleButton && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Filter size={16} />
                        <span>Filters</span>
                        {hasActiveFilters && (
                            <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                                Active
                            </span>
                        )}
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        >
                            <X size={16} />
                            <span>Clear Filters</span>
                        </button>
                    )}
                </div>
            )}

            {/* Clear filters button when toggle is hidden but filters are active */}
            {hideToggleButton && hasActiveFilters && (
                <div className="flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        <X size={16} />
                        <span>Clear Filters</span>
                    </button>
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Property Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Property Type
                            </label>
                            <select
                                value={propertyTypeFilter}
                                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                            >
                                {propertyTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Date Range
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        type="date"
                                        value={dateRangeFilter.start || ''}
                                        onChange={(e) =>
                                            setDateRangeFilter({ ...dateRangeFilter, start: e.target.value || null })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        value={dateRangeFilter.end || ''}
                                        onChange={(e) =>
                                            setDateRangeFilter({ ...dateRangeFilter, end: e.target.value || null })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationFilters;
