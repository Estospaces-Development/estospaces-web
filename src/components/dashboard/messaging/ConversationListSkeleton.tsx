"use client";

import React from 'react';

export default function ConversationListSkeleton() {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 animate-pulse">
            <div className="p-4 border-b dark:border-gray-700">
                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
            </div>
            <div className="flex-1 space-y-1">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-3 border-b dark:border-gray-700">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 w-1/3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 w-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
                            </div>
                            <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
