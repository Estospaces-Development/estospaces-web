import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useToast } from '@/contexts/ToastContext';
import {
    getManagerSubscriptionOffers,
    getManagerSubscriptionSummary,
    startManagerSubscriptionCheckout,
    verifyManagerSubscriptionCheckout,
    type ManagerPlanOffer,
    type ManagerSubscriptionSummary,
} from '@/services/managerSubscriptionService';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
}

const CONSENT_VERSION = 'manager-subscription-v2';

function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not load')), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Razorpay checkout could not load'));
        document.head.appendChild(script);
    });
}

const formatPlanPrice = (offer: ManagerPlanOffer) => new Intl.NumberFormat(offer.currency === 'INR' ? 'en-IN' : 'en-GB', {
    style: 'currency', currency: offer.currency, maximumFractionDigits: 0,
}).format(offer.amount_minor / 100);

export default function ManagerSubscriptionPage() {
    const toast = useToast();
    const [offers, setOffers] = useState<ManagerPlanOffer[]>([]);
    const [summary, setSummary] = useState<ManagerSubscriptionSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyPlan, setBusyPlan] = useState<string | null>(null);
    const [recurringConsent, setRecurringConsent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [offerData, summaryData] = await Promise.all([getManagerSubscriptionOffers(), getManagerSubscriptionSummary()]);
            setOffers(offerData);
            setSummary(summaryData.account);
        } catch {
            setError('Subscription plans are not available yet. Please try again shortly.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const activeCheckout = summary?.checkout;
    const activePlan = useMemo(() => offers.find((offer) => offer.id === activeCheckout?.plan_version_id), [activeCheckout?.plan_version_id, offers]);

    const start = async (offer: ManagerPlanOffer) => {
        if (!recurringConsent) {
            toast.error('Please confirm the monthly recurring payment consent before continuing.');
            return;
        }
        if (activeCheckout && ['creating', 'ready', 'reconciliation_required'].includes(activeCheckout.status)) {
            toast.info('You already have a subscription checkout in progress. Refresh this page to continue it.');
            return;
        }
        setBusyPlan(offer.id);
        try {
            const checkout = await startManagerSubscriptionCheckout({
                plan_version_id: offer.id,
                idempotency_key: `web-${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`,
                terms_digest: offer.terms_digest,
                consent_version: CONSENT_VERSION,
                recurring_consent: true,
            });
            await loadRazorpayScript();
            if (!window.Razorpay || !checkout.checkout.provider_subscription_id) throw new Error('Checkout is not ready yet.');
            const razorpay = new window.Razorpay({
                key: checkout.key_id,
                subscription_id: checkout.checkout.provider_subscription_id,
                name: 'Estospaces',
                description: `${offer.code === 'growth' ? 'Growth' : 'Pro'} manager subscription`,
                handler: async (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
                    await verifyManagerSubscriptionCheckout(checkout.checkout.id, {
                        payment_id: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                    });
                    toast.success('Subscription payment verified. Your manager limits are now active.');
                    await load();
                },
                modal: { ondismiss: () => { void load(); } },
                theme: { color: '#ea580c' },
            });
            razorpay.open();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Unable to start checkout.');
            await load();
        } finally {
            setBusyPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Manager plans</p><h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">Choose your Estospaces plan</h1><p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Prices include applicable taxes. A monthly plan unlocks your published-property, Fast Track and support limits.</p></div>
                    <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
                </div>
                {summary?.new_paid_actions_available ? <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200"><CheckCircle2 className="h-5 w-5" /> Your paid manager access is active.</div> : null}
                {activeCheckout && activePlan ? <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100">Checkout in progress for <strong>{activePlan.code}</strong> ({activeCheckout.status}). No second checkout will be created while this one is unresolved.</div> : null}
                {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div> : null}
                {loading ? <BrandLoadingScreen label="Loading subscription plans..." /> : <div className="grid gap-6 lg:grid-cols-2">{offers.map((offer) => <article key={offer.id} className={`rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${offer.featured ? 'border-orange-400 ring-2 ring-orange-100 dark:ring-orange-950/40' : ''}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">{offer.code}</p><h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{formatPlanPrice(offer)}<span className="text-base font-semibold text-gray-500"> / month</span></h2></div>{offer.featured ? <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">Featured</span> : null}</div><div className="mt-6 grid gap-3 text-sm text-gray-700 dark:text-gray-200"><p><strong>{offer.published_property_limit}</strong> published properties</p><p><strong>{offer.active_case_limit}</strong> active Fast Track cases</p><p><strong>{offer.support_level === 'dedicated' ? 'Dedicated' : 'Standard'}</strong> support</p><p><strong>{offer.image_upload_limit_bytes / 1_000_000} MB</strong> per property image</p></div><p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">{offer.terms_text}</p><button type="button" disabled={busyPlan !== null || Boolean(activeCheckout)} onClick={() => void start(offer)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{busyPlan === offer.id ? <ActionSpinner size="sm" aria-hidden /> : <CreditCard className="h-4 w-4" />} Continue to secure payment</button></article>)}</div>}
                <label className="mt-8 flex items-start gap-3 rounded-2xl border bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"><input type="checkbox" checked={recurringConsent} onChange={(event) => setRecurringConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-600" /><span>I understand this is a monthly recurring subscription, the displayed tax-inclusive amount, and the cancellation terms before payment.</span></label>
                <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-gray-500 dark:text-gray-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Payment details are collected by Razorpay. Estospaces never receives or stores card or bank credentials.</div>
            </div>
        </div>
    );
}
