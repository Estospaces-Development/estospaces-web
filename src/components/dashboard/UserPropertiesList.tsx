'use client';

import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter, Map, Square } from 'lucide-react';

// Dynamic imports for modals
const StreetViewModal = lazy(() => import('@/components/ui/StreetViewModal'));
const Tour360Modal = lazy(() => import('@/components/ui/Tour360Modal'));

interface Property {
    id: string;
    title: string;
    description?: string;
    status: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    city?: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
}

interface Pagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

interface ErrorInfo {
    message: string;
    code?: string;
}

/**
 * User Properties List Component
 * Displays user's properties with filtering, sorting, and pagination
 */
const UserPropertiesList = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ErrorInfo | null>(null);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    // Modal state
    const [viewStreetFor, setViewStreetFor] = useState<Property | null>(null);
    const [viewTourFor, setViewTourFor] = useState<Property | null>(null);

    // Query parameters
    const [status, setStatus] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [sortBy, setSortBy] = useState('created_at');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    // Fetch properties
    const fetchProperties = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Import dynamically to avoid SSR issues
            const { getUserProperties } = await import('@/services/userPropertiesService');
            const result = await getUserProperties({
                status,
                page,
                limit,
                sortBy,
                order,
            });

            if (result.error) {
                setError(result.error);
                setProperties([]);
                setPagination(null);
            } else {
                setProperties(result.data || []);
                setPagination(result.pagination);
            }
        } catch (err) {
            console.error('Error fetching properties:', err);
            setError({ message: 'Failed to load properties' });
            setProperties([]);
            setPagination(null);
        }

        setLoading(false);
    }, [status, page, limit, sortBy, order]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const handleStatusChange = (newStatus: string | null) => {
        setStatus(newStatus);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading && !properties.length) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-orange-500" size={32} />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading properties...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStatusChange(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === null
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => handleStatusChange('published')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === 'published'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Published
                        </button>
                        <button
                            onClick={() => handleStatusChange('draft')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === 'draft'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Draft
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="created_at">Date Created</option>
                            <option value="updated_at">Last Updated</option>
                            <option value="title">Title</option>
                            <option value="price">Price</option>
                            <option value="bedrooms">Bedrooms</option>
                            <option value="city">City</option>
                        </select>
                        <button
                            onClick={() => {
                                setOrder(order === 'asc' ? 'desc' : 'asc');
                                setPage(1);
                            }}
                            className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-sm shadow-sm"
                        >
                            {order === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Error</h3>
                        <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
                        {error.code && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Code: {error.code}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Properties List */}
            {!error && (
                <>
                    {properties.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
                            <p className="text-gray-600 dark:text-gray-400">
                                {status
                                    ? `No ${status} properties found.`
                                    : 'No properties found. Create your first property to get started.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {properties.map((property) => (
                                <div
                                    key={property.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    {property.title}
                                                </h3>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${property.status === 'published'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                        }`}
                                                >
                                                    {property.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {property.description || 'No description'}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span>£{property.price?.toLocaleString()}</span>
                                                <span>{property.bedrooms} beds</span>
                                                <span>{property.bathrooms} baths</span>
                                                <span>{property.city}, {property.postcode}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-3 mt-4">
                                                <button
                                                    onClick={() => setViewStreetFor(property)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                >
                                                    <Map size={14} />
                                                    Street View
                                                </button>
                                                <button
                                                    onClick={() => setViewTourFor(property)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                >
                                                    <Square size={14} />
                                                    360° Tour
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                                {pagination.totalCount} properties
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={!pagination.hasPreviousPage}
                                    className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={!pagination.hasNextPage}
                                    className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            <Suspense fallback={null}>
                {viewStreetFor && (
                    <StreetViewModal
                        location={{
                            lat: viewStreetFor.latitude || 51.5074,
                            lng: viewStreetFor.longitude || -0.1278
                        }}
                        onClose={() => setViewStreetFor(null)}
                    />
                )}

                {viewTourFor && (
                    <Tour360Modal
                        onClose={() => setViewTourFor(null)}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default UserPropertiesList;
