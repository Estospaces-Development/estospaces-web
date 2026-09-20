import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useToast } from '@/contexts/ToastContext';
import { canResumeSubscription, formatSubscriptionPrice as formatPlanPrice, loadRazorpayScript, openSubscriptionCheckout, type SubscriptionPaymentProof } from '@/lib/managerSubscriptionCheckout';
import {
    cancelManagerSubscriptionCheckout,
    getManagerSubscriptionCheckout,
    getManagerSubscriptionOffers,
    getManagerSubscriptionSummary,
    reconcileManagerSubscriptionCheckout,
    recoverManagerSubscriptionCheckout,
    startManagerSubscriptionCheckout,
    verifyManagerSubscriptionCheckout,
    type ManagerPlanOffer,
    type ManagerSubscriptionSummary,
    type StartCheckoutResponse,
} from '@/services/managerSubscriptionService';
export default function ManagerSubscriptionPage() {
    const toast = useToast();
    const [offers, setOffers] = useState<ManagerPlanOffer[]>([]);
    const [summary, setSummary] = useState<ManagerSubscriptionSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyPlan, setBusyPlan] = useState<string | null>(null);
    const [recurringConsent, setRecurringConsent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offersError, setOffersError] = useState<string | null>(null);
    const [acceptedCheckout, setAcceptedCheckout] = useState<StartCheckoutResponse | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [pendingProof, setPendingProof] = useState<{ checkoutId: string; proof: SubscriptionPaymentProof } | null>(null);
    const actionLock = useRef(false);
    const loadVersion = useRef(0);

    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setLoading(true);
        setError(null);
        setOffersError(null);
        try {
            const [offerResult, summaryResult] = await Promise.allSettled([getManagerSubscriptionOffers(), getManagerSubscriptionSummary()]);
            if (version !== loadVersion.current) return;
            if (offerResult.status === 'fulfilled') setOffers(offerResult.value);
            else { setOffers([]); setOffersError('New plans are unavailable. You can still manage an existing subscription below.'); }
            if (summaryResult.status === 'rejected') {
                setSummary(null);
                setAcceptedCheckout(null);
                throw summaryResult.reason;
            }
            const account = summaryResult.value.account;
            setSummary(account);
            setAcceptedCheckout(null);
            if (account.checkout) {
                const checkout = await getManagerSubscriptionCheckout(account.checkout.id);
                if (version === loadVersion.current) setAcceptedCheckout(checkout);
            }
        } catch {
            if (version === loadVersion.current) setError('Subscription details could not be refreshed. Please retry before making a payment.');
        } finally {
            if (version === loadVersion.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const requestVersion = loadVersion;
        void load();
        return () => { requestVersion.current++; };
    }, [load]);

    const activeCheckout = summary?.checkout;
    const runAction = async (name: string, action: () => Promise<void>) => {
        if (actionLock.current) return;
        actionLock.current = true;
        setBusyPlan(name);
        try { await action(); }
        catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to complete this action. Check payment status before trying again.'); }
        finally {
            await load();
            actionLock.current = false;
            setBusyPlan(null);
        }
    };

    const reportVerification = (account: ManagerSubscriptionSummary) => {
        if (account.new_paid_actions_available) toast.success('Subscription payment verified.');
        else toast.info('Payment confirmation is still pending. Check payment status; do not pay again.');
    };

    const openCheckout = async (checkout: StartCheckoutResponse) => {
        const account = await openSubscriptionCheckout(checkout, async (proof) => {
            setPendingProof({ checkoutId: checkout.checkout.id, proof });
            const result = await verifyManagerSubscriptionCheckout(checkout.checkout.id, proof);
            setPendingProof(null);
            return result.account;
        });
        if (account) reportVerification(account);
        else toast.info('Checkout closed. You can resume the same checkout below.');
    };

    const start = async (offer: ManagerPlanOffer) => {
        if (!recurringConsent) {
            toast.error('Please confirm the monthly recurring payment consent before continuing.');
            return;
        }
        if (activeCheckout || loading || error || offersError || summary?.new_checkouts_paused) return;
        await runAction(offer.id, async () => {
            await loadRazorpayScript();
            const checkout = await startManagerSubscriptionCheckout({
                plan_version_id: offer.id,
                idempotency_key: `web-${crypto.randomUUID()}`,
                terms_digest: offer.terms_digest,
                consent_version: offer.terms_version,
                recurring_consent: true,
            });
            await openCheckout(checkout);
        });
    };

    const resume = () => runAction('resume', async () => {
        if (!activeCheckout) return;
        await loadRazorpayScript();
        await reconcileManagerSubscriptionCheckout(activeCheckout.id);
        const { account } = await getManagerSubscriptionSummary();
        setSummary(account);
        if (account.checkout?.id !== activeCheckout.id || !canResumeSubscription(account)) {
            toast.info('Subscription status changed. Review its current status before continuing.');
            return;
        }
        await openCheckout(await getManagerSubscriptionCheckout(activeCheckout.id));
    });

    const checkStatus = () => runAction('status', async () => {
        if (!activeCheckout) return;
        if (!activeCheckout.provider_subscription_id) await recoverManagerSubscriptionCheckout(activeCheckout.id);
        await reconcileManagerSubscriptionCheckout(activeCheckout.id);
        const { account } = await getManagerSubscriptionSummary();
        if (account.new_paid_actions_available) setPendingProof(null);
        reportVerification(account);
    });

    const cancel = () => runAction('cancel', async () => {
        if (!activeCheckout) return;
        const cancellation = await cancelManagerSubscriptionCheckout(activeCheckout.id);
        if (cancellation.status !== 'confirmed') throw new Error('Cancellation is pending confirmation. Check payment status again.');
        setConfirmCancel(false);
        toast.success('Cancellation confirmed. Any verified paid-through access remains until its end date.');
        await reconcileManagerSubscriptionCheckout(activeCheckout.id);
    });

    const retryVerification = () => runAction('verify', async () => {
        if (!pendingProof) return;
        const result = await verifyManagerSubscriptionCheckout(pendingProof.checkoutId, pendingProof.proof);
        setPendingProof(null);
        reportVerification(result.account);
    });

    const busy = busyPlan !== null || loading;
    const terminal = ['cancelled', 'completed', 'expired'].includes(summary?.subscription?.status ?? '');

    return (
        <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Manager plans</p><h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">Choose your Estospaces plan</h1><p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Prices include applicable taxes. A monthly plan unlocks your published-property, Fast Track and support limits.</p></div>
                    <button type="button" disabled={busy} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
                </div>
                {summary?.new_paid_actions_available ? <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200"><CheckCircle2 className="h-5 w-5" /> Your subscription payment is verified.{summary.paid_period?.billing_end ? ` Paid through ${new Date(summary.paid_period.billing_end).toLocaleString()}.` : ''}</div> : null}
                {activeCheckout ? <section aria-label="Current subscription" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100">
                    <h2 className="font-bold">Current subscription</h2>
                    <p role="status" className="mt-2">Status: {summary?.subscription?.status ?? activeCheckout.status}. No second checkout will be created while this subscription is unresolved.</p>
                    {acceptedCheckout ? <div className="mt-3"><p><strong>{acceptedCheckout.terms.code} — {formatPlanPrice(acceptedCheckout.terms)} / month</strong></p><p className="mt-1">{acceptedCheckout.terms.terms_text}</p><p className="mt-1 text-xs">These are the terms accepted for this checkout, even if current offers have changed.</p></div> : null}
                    {summary?.cancellation ? <p role="status" className="mt-3">Cancellation: {summary.cancellation.status === 'confirmed' ? 'confirmed. Renewal has stopped.' : 'not yet confirmed. Check payment status or retry cancellation.'}</p> : null}
                    {pendingProof ? <div role="alert" className="mt-3"><p>Payment verification is pending. Do not pay again. Retry verification or check payment status.</p><button disabled={busy} type="button" onClick={() => void retryVerification()} className="mt-2 rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Retry payment verification</button></div> : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                        {summary && canResumeSubscription(summary) && acceptedCheckout && !pendingProof ? <button disabled={busy || Boolean(error)} type="button" onClick={() => void resume()} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Resume secure checkout</button> : null}
                        <button disabled={busy} type="button" onClick={() => void checkStatus()} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Check payment status</button>
                        {activeCheckout.provider_subscription_id && !terminal && summary?.cancellation?.status !== 'confirmed' ? <button disabled={busy} type="button" onClick={() => setConfirmCancel(true)} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Cancel subscription / renewal</button> : null}
                    </div>
                    {confirmCancel ? <div className="mt-4 rounded-xl border p-4"><p>Stop this subscription’s future charges? Any verified paid-through access remains until its end date. Cancelling does not delete your documents or ongoing cases.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} type="button" onClick={() => void cancel()} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Confirm cancellation</button><button disabled={busy} type="button" onClick={() => setConfirmCancel(false)} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Keep subscription</button></div></div> : null}
                </section> : null}
                {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div> : null}
                {offersError ? <p role="status" className="mb-4 rounded-xl border p-4 text-sm">{offersError}</p> : null}
                {summary?.new_checkouts_paused ? <p role="status" className="mb-4 rounded-xl border p-4 text-sm">New subscriptions are temporarily paused. You can still manage an existing subscription.</p> : null}
{loading ? <BrandLoadingScreen label="Loading subscription plans..." /> : <div className="grid gap-6 lg:grid-cols-2">{offers.map((offer) => <article key={offer.id} className={`rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${offer.featured ? 'border-orange-400 ring-2 ring-orange-100 dark:ring-orange-950/40' : ''}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">{offer.code}</p><h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{formatPlanPrice(offer)}<span className="text-base font-semibold text-gray-500"> / month</span></h2></div>{offer.featured ? <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">Featured</span> : null}</div><div className="mt-6 grid gap-3 text-sm text-gray-700 dark:text-gray-200"><p><strong>{offer.published_property_limit}</strong> published properties</p><p><strong>{offer.active_case_limit}</strong> active Fast Track cases</p><p><strong>{offer.support_level === 'dedicated' ? 'Dedicated' : 'Standard'}</strong> support</p><p><strong>{offer.image_upload_limit_bytes / 1_000_000} MB</strong> per property image</p></div><p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">{offer.terms_text}</p><button type="button" disabled={busy || Boolean(error) || Boolean(offersError) || Boolean(summary?.new_checkouts_paused) || Boolean(activeCheckout) || !recurringConsent} onClick={() => void start(offer)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{busyPlan === offer.id ? <ActionSpinner size="sm" aria-hidden /> : <CreditCard className="h-4 w-4" />} Continue to secure payment</button></article>)}</div>}
                <label className="mt-8 flex items-start gap-3 rounded-2xl border bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"><input type="checkbox" checked={recurringConsent} onChange={(event) => setRecurringConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-600" /><span>I understand this is a monthly recurring subscription, the displayed tax-inclusive amount, and the cancellation terms before payment.</span></label>
                <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-gray-500 dark:text-gray-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Payment details are collected by Razorpay. Estospaces never receives or stores card or bank credentials.</div>
            </div>
        </div>
    );
}
