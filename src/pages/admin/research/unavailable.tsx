import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminResearchUnavailablePage() {
    return (
        <section
            data-admin-research-unavailable
            aria-labelledby="admin-research-unavailable-title"
            className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
            <div className="mb-4 rounded-full bg-orange-50 p-4 text-orange-500 dark:bg-orange-500/10">
                <ClipboardList size={28} aria-hidden="true" />
            </div>
            <h1 id="admin-research-unavailable-title" className="text-xl font-bold text-gray-900 dark:text-white">
                Research tools are not available yet
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Observational research sessions cannot be created or reviewed on this environment yet. Nothing has been saved.
            </p>
            <Link
                to="/admin/dashboard"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
                Back to dashboard
            </Link>
        </section>
    );
}
