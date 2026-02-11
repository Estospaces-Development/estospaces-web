"use client";

import React from 'react';

export default function ConversationThreadSkeleton() {
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 animate-pulse p-4 md:p-6 space-y-6">
            <div className="flex justify-start">
                <div className="flex gap-3 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 mt-auto"></div>
                    <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-none"></div>
                </div>
            </div>
            <div className="flex justify-end">
                <div className="flex gap-3 max-w-[70%] flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-900/30 flex-shrink-0 mt-auto"></div>
                    <div className="h-20 w-64 bg-orange-200 dark:bg-orange-900/30 rounded-2xl rounded-br-none"></div>
                </div>
            </div>
            <div className="flex justify-start">
                <div className="flex gap-3 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 mt-auto"></div>
                    <div className="h-16 w-56 bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-none"></div>
                </div>
            </div>
        </div>
    );
}
