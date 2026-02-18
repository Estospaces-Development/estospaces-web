'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary caught:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-black text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong!
            </h2>

            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
                We apologize for the inconvenience. Our team has been notified of this issue.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
}
