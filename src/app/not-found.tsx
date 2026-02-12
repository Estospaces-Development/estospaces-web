import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-black text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-orange-600 dark:text-orange-500" />
            </div>

            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                404
            </h1>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Page Not Found
            </h2>

            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>

            <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
                <Home className="w-4 h-4" />
                Return Home
            </Link>
        </div>
    );
}
