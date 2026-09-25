import { CreditCard } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { formatSubscriptionPrice } from '@/lib/managerSubscriptionCheckout';
import type { ManagerPlanOffer, ManagerPlanPreview } from '@/services/managerSubscriptionService';

interface ManagerSubscriptionPlanCardProps {
    plan: ManagerPlanOffer | ManagerPlanPreview;
    checkoutDisabled: boolean;
    busy: boolean;
    onStart: (offer: ManagerPlanOffer) => void;
}

const planDescriptions = {
    pro: 'More room for published properties and active Fast Track cases, with standard support.',
    growth: 'Higher property and Fast Track capacity, with dedicated support for a larger portfolio.',
};

export default function ManagerSubscriptionPlanCard({ plan, checkoutDisabled, busy, onStart }: ManagerSubscriptionPlanCardProps) {
    const offer = 'id' in plan ? plan : null;
    const name = plan.code === 'pro' ? 'Pro' : 'Growth';

    return (
        <article className={`rounded-2xl border bg-white p-6 dark:bg-gray-900 ${plan.featured ? 'border-orange-400 dark:border-orange-700' : 'border-gray-200 dark:border-gray-800'}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">{name}</h2>
                    <p className="mt-2 max-w-prose text-sm leading-6 text-gray-600 dark:text-gray-300">{planDescriptions[plan.code]}</p>
                </div>
                {plan.featured ? <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">Featured</span> : null}
            </div>

            {offer ? <p className="mt-6 text-2xl font-black text-gray-900 dark:text-white">{formatSubscriptionPrice(offer)}<span className="text-sm font-semibold text-gray-600 dark:text-gray-300"> / month</span></p>
                : <p className="mt-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Local price and checkout unavailable for this account</p>}

            <dl className="mt-6 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 border-t border-gray-200 pt-5 text-sm dark:border-gray-700">
                <dt className="text-gray-600 dark:text-gray-300">Published properties</dt><dd className="font-bold text-gray-900 dark:text-white">{plan.published_property_limit}</dd>
                <dt className="text-gray-600 dark:text-gray-300">Active Fast Track cases</dt><dd className="font-bold text-gray-900 dark:text-white">{plan.active_case_limit}</dd>
                <dt className="text-gray-600 dark:text-gray-300">Support</dt><dd className="font-bold capitalize text-gray-900 dark:text-white">{plan.support_level}</dd>
                <dt className="text-gray-600 dark:text-gray-300">Property image limit</dt><dd className="font-bold text-gray-900 dark:text-white">{plan.image_upload_limit_bytes / 1_000_000} MB each</dd>
            </dl>
            {plan.lead_delivery_policy === 'best_effort' ? <p className="mt-5 text-xs leading-5 text-gray-600 dark:text-gray-300">Lead delivery is best-effort and is not guaranteed.</p> : null}
            {offer ? <>
                <p className="mt-4 text-xs leading-5 text-gray-600 dark:text-gray-300">{offer.terms_text}</p>
                <button type="button" disabled={checkoutDisabled} onClick={() => onStart(offer)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? <ActionSpinner size="sm" aria-hidden /> : <CreditCard className="h-4 w-4" />} Continue to secure payment
                </button>
            </> : <p className="mt-5 text-xs leading-5 text-gray-600 dark:text-gray-300">This overview is not a payment offer. Your free access remains available.</p>}
        </article>
    );
}
