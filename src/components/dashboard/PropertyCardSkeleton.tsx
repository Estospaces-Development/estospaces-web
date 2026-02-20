import React from 'react';

const PropertyCardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col animate-pulse">
            {/* Image Skeleton */}
            <div className="relative h-48 bg-gray-200 dark:bg-gray-700 w-full" />

            {/* Content Skeleton */}
            <div className="p-4 flex flex-col flex-1 gap-3">
                {/* Title and Price */}
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>

                {/* Location */}
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />

                {/* Features (Beds, Baths, Area) */}
                <div className="flex items-center gap-4 mt-2">
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>

                {/* Footer with Agent/Date */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        </div>
    );
};

export default PropertyCardSkeleton;
