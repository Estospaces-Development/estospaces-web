import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { isManagerEmailInput, normalizeManagerID, resolveManagerIdentifier } from '@/lib/adminPromotions';
import { describeAdminManagerBilling, describeManagerPaidPeriod } from '@/lib/managerBillingHistory';
import { getAdminManagerBilling } from '@/services/adminSubscriptionService';
import { userService } from '@/services/userService';

export const managerBillingQueryKey = (managerID: string) => ['admin-subscriptions', 'manager-billing', managerID] as const;

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white';
const buttonSecondary = 'min-h-11 rounded-lg border border-gray-300 px-3 font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800';

// Read-only: shows what the manager sees on their own subscription page.
export default function AdminManagerBillingLookup() {
    const [input, setInput] = useState('');
    const [managerID, setManagerID] = useState('');
    const [resolveError, setResolveError] = useState<string | null>(null);
    const [resolving, setResolving] = useState(false);
    // Only the latest lookup may apply its result; an older email search can finish last.
    const request = useRef(0);

    const billing = useQuery({
        queryKey: managerBillingQueryKey(managerID),
        queryFn: () => getAdminManagerBilling(managerID),
        enabled: Boolean(managerID),
    });

    const lookUp = async () => {
        const current = ++request.current;
        const isEmail = isManagerEmailInput(input.trim());
        setInput(isEmail ? input.trim() : normalizeManagerID(input));
        setResolveError(null);
        setManagerID('');
        setResolving(isEmail);
        const resolved = await resolveManagerIdentifier(input, userService.getAllUsers);
        if (current !== request.current) return;
        setResolving(false);
        if (resolved.ok) setManagerID(resolved.managerID);
        else setResolveError(resolved.message);
    };

    const result = billing.data?.data ?? null;
    const view = result ? describeAdminManagerBilling(result) : null;

    return <section aria-labelledby="manager-billing-heading" className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 id="manager-billing-heading" className="text-lg font-black text-gray-900 dark:text-white">Manager billing lookup</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Read-only. Shows the plan and payment history the manager sees, from stored payment records. Nothing is changed.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void lookUp(); }}>
            <label className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Manager ID or email<input value={input} onChange={(event) => { setInput(event.target.value); setResolveError(null); }} autoComplete="off" spellCheck={false} aria-invalid={resolveError ? true : undefined} aria-describedby={resolveError ? 'manager-billing-error' : undefined} className={inputClass} /></label>
            <button type="submit" disabled={!input.trim() || resolving} className={buttonSecondary}>{resolving ? 'Finding manager…' : 'Look up'}</button>
        </form>
        {resolveError ? <p id="manager-billing-error" role="alert" className="mt-4 text-sm font-semibold text-red-800 dark:text-red-200">{resolveError}</p> : null}
        {!managerID ? null
            : billing.isLoading ? <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><ActionSpinner size="sm" aria-hidden /> Loading billing…</p>
                : billing.data?.error || !result || !view ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">{billing.data?.error || 'Billing details could not be loaded.'} Check the manager ID, then retry.</p>
                    : view.isEmpty ? <p role="status" className="mt-4 text-sm text-gray-600 dark:text-gray-300">No subscription or payments for this manager. Current access: {view.planLabel}.</p>
                        : <div className="mt-4">
                            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                                {[['Plan', view.planLabel], ['Access', view.accessLabel], ['Subscription', view.statusLabel], ['Market', view.marketLabel], ['Current period', view.periodLabel]].map(([label, value]) => <div key={label} className="rounded-xl border p-3 dark:border-gray-800">
                                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</dt>
                                    <dd className="mt-1 font-semibold text-gray-900 first-letter:uppercase dark:text-white">{value}</dd>
                                </div>)}
                            </dl>
                            {view.isTestMode ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Test-mode records.</p> : null}
                            <h3 className="mt-5 text-sm font-bold text-gray-900 dark:text-white">Payment history (newest first, up to 50)</h3>
                            {result.invoices.length === 0 ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No payments yet.</p>
                                : <div className="mt-2 overflow-x-auto"><table className="min-w-full text-left text-sm text-gray-900 dark:text-gray-100">
                                    <thead className="text-xs uppercase text-gray-500 dark:text-gray-400"><tr><th scope="col" className="py-2 pr-4">Date</th><th scope="col" className="py-2 pr-4">Amount</th><th scope="col" className="py-2 pr-4">Status</th><th scope="col" className="py-2">Reference</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{result.invoices.map((period) => {
                                        const row = describeManagerPaidPeriod(period);
                                        return <tr key={`${period.mode}:${period.invoice_id}`} className="align-top">
                                            <td className="py-3 pr-4">{row.periodLabel}</td>
                                            <td className="py-3 pr-4 font-semibold">{row.amountLabel}</td>
                                            <td className="py-3 pr-4">{row.statusLabel}{row.refundLabel ? <span className="block text-xs text-gray-600 dark:text-gray-300">{row.refundLabel}</span> : null}</td>
                                            <td className="py-3"><code className="break-all text-xs text-gray-700 dark:text-gray-300">{row.reference}</code></td>
                                        </tr>;
                                    })}</tbody>
                                </table></div>}
                        </div>}
    </section>;
}
