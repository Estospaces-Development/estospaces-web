"use client";

import React from 'react';

const ApplicationCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
            <div className="flex">
                {/* Image Skeleton */}
                <div className="w-32 sm:w-40 lg:w-48 min-h-[160px] bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

                {/* Content Skeleton */}
                <div className="flex-1 p-4 lg:p-5 flex flex-col justify-between">
                    {/* Top Section */}
                    <div>
                        {/* Title */}
                        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />

                        {/* Address */}
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-5" />

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {/* Price */}
                        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationCardSkeleton;
