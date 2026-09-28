import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { describeManagerPaidPeriod } from '@/lib/managerBillingHistory';
import { getManagerSubscriptionPaidPeriods } from '@/services/managerSubscriptionService';

// Verified paid periods for the signed-in manager, newest first.
export default function ManagerBillingHistory() {
    const { user } = useAuth();
    const history = useQuery({
        // Scoped to the account so another manager on this tab never sees it.
        queryKey: ['manager-subscription-paid-periods', user?.id || ''],
        queryFn: () => getManagerSubscriptionPaidPeriods(12, 0),
        enabled: Boolean(user?.id),
        staleTime: 60_000,
    });

    const periods = history.data || [];

    return (
        <section aria-label="Billing history" className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Billing history</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Verified subscription payments for this account, newest first.
            </p>
            {history.isLoading ? (
                <p role="status" className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading billing history...</p>
            ) : history.isError ? (
                <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
                    Billing history could not be loaded. Refresh to try again; your access is unchanged.
                </p>
            ) : periods.length === 0 ? (
                <p role="status" className="mt-4 text-sm text-gray-500 dark:text-gray-400">No subscription payments yet.</p>
            ) : (
                <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                    {periods.map((period) => {
                        const view = describeManagerPaidPeriod(period);
                        return (
                            <li key={`${period.mode}:${period.invoice_id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{view.periodLabel}</p>
                                    <p className="break-all text-xs text-gray-500 dark:text-gray-400">
                                        Payment reference {view.reference}{view.isTestMode ? ' (test mode)' : ''}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{view.amountLabel}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {view.statusLabel}{view.refundLabel ? ` · ${view.refundLabel}` : ''}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
