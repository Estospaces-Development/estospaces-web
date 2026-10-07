// Shown instead of zero-filled KPI tiles when analytics failed and nothing is cached, so an outage
// is not read as "no business activity" (MB-0649, MB-0660).
export default function AnalyticsUnavailable({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
    return (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="text-base font-semibold">Analytics could not load</p>
            <p className="mt-1 text-sm">{message || 'The figures are unavailable right now, so none are shown rather than zeros.'}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                Retry
            </button>
        </div>
    );
}
