import { useCallback, useEffect, useRef, useState } from 'react';
import {
    PENDING_PAYMENT_POLL_INTERVAL_MS,
    evaluatePendingPaymentPoll,
    formatSubscriptionStatus,
    isVerificationPendingError,
} from '@/lib/managerSubscriptionStatus';
import ManagerBillingHistory from '@/components/manager/ManagerBillingHistory';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { ManagerVerificationBanner } from '@/components/routing/ManagerVerificationGate';
import ManagerSubscriptionPlanCard from './ManagerSubscriptionPlanCard';
import { orderManagerPlans } from './managerPlanOrder';
import { classifyBillingProfileLookup, getSubscriptionAccessPresentation, getSubscriptionOffersErrorMessage, isBillingMarketUnavailable, type BillingProfileLookup } from '@/lib/managerSubscriptionReadiness';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { useToast } from '@/contexts/ToastContext';
import { SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON, resolveManagerVerificationGate } from '@/lib/managerVerificationGate';
import { canResumeSubscription, formatSubscriptionPrice as formatPlanPrice, loadRazorpayScript, openSubscriptionCheckout, type SubscriptionPaymentProof } from '@/lib/managerSubscriptionCheckout';
import {
    cancelManagerSubscriptionCheckout,
    getManagerSubscriptionCheckout,
    getManagerSubscriptionOffers,
    getManagerSubscriptionPlanPreviews,
    getManagerSubscriptionSummary,
    reconcileManagerSubscriptionCheckout,
    recoverManagerSubscriptionCheckout,
    startManagerSubscriptionCheckout,
    verifyManagerSubscriptionCheckout,
    type ManagerPlanOffer,
    type ManagerPlanPreview,
    type ManagerSubscriptionSummary,
    type StartCheckoutResponse,
} from '@/services/managerSubscriptionService';
import { getMyManagerBillingProfile } from '@/services/managerBillingProfileService';
export default function ManagerSubscriptionPage() {
    const toast = useToast();
    const verification = useManagerVerification();
    // Pending or re-verifying managers can compare plans, but new payments wait
    // for approval. Servicing an existing checkout (status, verify, cancel) stays open.
    const verificationGate = resolveManagerVerificationGate({
        isLoading: verification.isLoading,
        error: verification.error,
        hasProfile: Boolean(verification.managerProfile),
        verificationStatus: verification.verificationStatus,
        reverificationReason: verification.managerProfile?.agency_verification_reason,
    });
    const checkoutBlockedByVerification = verificationGate.kind !== 'allow';
    const [offers, setOffers] = useState<ManagerPlanOffer[]>([]);
    const [planPreviews, setPlanPreviews] = useState<ManagerPlanPreview[]>([]);
    const [summary, setSummary] = useState<ManagerSubscriptionSummary | null>(null);
    const [billingProfile, setBillingProfile] = useState<BillingProfileLookup>({ kind: 'unavailable' });
    const [loading, setLoading] = useState(true);
    const [busyPlan, setBusyPlan] = useState<string | null>(null);
    const [recurringConsent, setRecurringConsent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offersError, setOffersError] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState(false);
    const [acceptedCheckout, setAcceptedCheckout] = useState<StartCheckoutResponse | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [pendingProof, setPendingProof] = useState<{ checkoutId: string; proof: SubscriptionPaymentProof } | null>(null);
    // Set when checkout closes with the first charge still pending (UPI Autopay, eMandate).
    const [pendingPaymentSince, setPendingPaymentSince] = useState<number | null>(null);
    const actionLock = useRef(false);
    const loadVersion = useRef(0);

    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setLoading(true);
        setError(null);
        setOffersError(null);
        setPreviewError(false);
        setBillingProfile({ kind: 'unavailable' });
        try {
            const [offerResult, previewResult, summaryResult] = await Promise.allSettled([
                getManagerSubscriptionOffers(), getManagerSubscriptionPlanPreviews(), getManagerSubscriptionSummary(),
            ]);
            if (version !== loadVersion.current) return;
            if (previewResult.status === 'fulfilled') setPlanPreviews(previewResult.value);
            else {
                setPlanPreviews([]);
                setPreviewError(true);
            }
            if (offerResult.status === 'fulfilled') setOffers(offerResult.value);
            else {
                setOffers([]);
                setOffersError(getSubscriptionOffersErrorMessage(offerResult.reason, { kind: 'unavailable' }));
                if (isBillingMarketUnavailable(offerResult.reason)) {
                    void Promise.allSettled([getMyManagerBillingProfile()]).then(([result]) => {
                        if (version !== loadVersion.current) return;
                        const billingLookup = classifyBillingProfileLookup(result);
                        setBillingProfile(billingLookup);
                        setOffersError(getSubscriptionOffersErrorMessage(offerResult.reason, billingLookup));
                    });
                }
            }
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

    const startPendingPaymentPoll = () => {
        setPendingPaymentSince(Date.now());
        toast.info('Payment confirmation is still pending. We are checking automatically; do not pay again.');
    };

    const reportVerification = (account: ManagerSubscriptionSummary) => {
        if (account.new_paid_actions_available) {
            setPendingPaymentSince(null);
            toast.success('Subscription payment verified.');
        } else {
            startPendingPaymentPoll();
        }
    };

    // A 409 verification_pending from verify starts the automatic poll instead of failing.
    const verifyOrPoll = async (verify: () => Promise<ManagerSubscriptionSummary | null>): Promise<{ account: ManagerSubscriptionSummary | null; pending: boolean }> => {
        try {
            const account = await verify();
            if (account) reportVerification(account);
            return { account, pending: false };
        } catch (err) {
            if (!isVerificationPendingError(err)) throw err;
            startPendingPaymentPoll();
            return { account: null, pending: true };
        }
    };

    useEffect(() => {
        if (pendingPaymentSince === null) return undefined;
        let cancelled = false;
        let inFlight = false;
        const timer = window.setInterval(() => {
            // One request at a time, and never while a user action is updating the summary.
            if (inFlight || actionLock.current) return;
            inFlight = true;
            void (async () => {
                try {
                    const { account } = await getManagerSubscriptionSummary();
                    if (cancelled || actionLock.current) return;
                    setSummary(account);
                    const outcome = evaluatePendingPaymentPoll(account, pendingPaymentSince, Date.now());
                    if (outcome === 'paid') {
                        setPendingPaymentSince(null);
                        setPendingProof(null);
                        toast.success('Subscription payment verified.');
                    } else if (outcome === 'stop') {
                        setPendingPaymentSince(null);
                    } else if (outcome === 'timeout') {
                        setPendingPaymentSince(null);
                        toast.info('Your bank has not confirmed the first charge yet. Use Check payment status later; do not pay again.');
                    }
                } catch {
                    // A failed poll is retried on the next tick; the manual status check still works.
                } finally {
                    inFlight = false;
                }
            })();
        }, PENDING_PAYMENT_POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [pendingPaymentSince, toast]);

    const openCheckout = async (checkout: StartCheckoutResponse) => {
        const { account, pending } = await verifyOrPoll(() => openSubscriptionCheckout(checkout, async (proof) => {
            setPendingProof({ checkoutId: checkout.checkout.id, proof });
            const result = await verifyManagerSubscriptionCheckout(checkout.checkout.id, proof);
            setPendingProof(null);
            return result.account;
        }));
        if (!account && !pending) toast.info('Checkout closed. You can resume the same checkout below.');
    };

    const start = async (offer: ManagerPlanOffer) => {
        if (!recurringConsent) {
            toast.error('Please confirm the monthly recurring payment consent before continuing.');
            return;
        }
        if (checkoutBlockedByVerification) {
            toast.error(SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON);
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
        if (!activeCheckout || checkoutBlockedByVerification) return;
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
        setPendingPaymentSince(null);
        setConfirmCancel(false);
        toast.success('Cancellation confirmed. Any verified paid-through access remains until its end date.');
        await reconcileManagerSubscriptionCheckout(activeCheckout.id);
    });

    const retryVerification = () => runAction('verify', async () => {
        if (!pendingProof) return;
        await verifyOrPoll(async () => {
            const result = await verifyManagerSubscriptionCheckout(pendingProof.checkoutId, pendingProof.proof);
            setPendingProof(null);
            return result.account;
        });
    });

    const busy = busyPlan !== null || loading;
    const terminal = ['cancelled', 'completed', 'expired'].includes(summary?.subscription?.status ?? '');
    const access = getSubscriptionAccessPresentation(summary?.entitlement);
    const plansToShow: (ManagerPlanOffer | ManagerPlanPreview)[] = orderManagerPlans(offers.length > 0 ? offers : planPreviews);

    return (
        <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div><h1 className="text-3xl font-black text-gray-900 dark:text-white">Choose your Estospaces plan</h1><p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Compare published-property limits, Fast Track capacity and support. {offers.length > 0 ? 'Displayed monthly prices include applicable taxes.' : 'Local prices and payment are shown only when your billing country is verified and supported.'}</p></div>
                    <button type="button" disabled={busy} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
                </div>
                {verificationGate.kind === 'gate' ? <ManagerVerificationBanner notice={verificationGate.notice} detail={SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON} onRetry={() => void verification.refetch()} /> : null}
                {access ? <section aria-label="Your current access" className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">Your current access</p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{access.title}</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{access.detail}</p>
                    <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><dt className="text-xs font-semibold text-gray-500 dark:text-gray-300">Published properties</dt><dd className="mt-1 text-lg font-black text-gray-900 dark:text-white">{access.publishedProperties}</dd></div>
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><dt className="text-xs font-semibold text-gray-500 dark:text-gray-300">Active Fast Track cases</dt><dd className="mt-1 text-lg font-black text-gray-900 dark:text-white">{access.activeFastTrackCases}</dd></div>
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><dt className="text-xs font-semibold text-gray-500 dark:text-gray-300">Support</dt><dd className="mt-1 text-lg font-black capitalize text-gray-900 dark:text-white">{access.support}</dd></div>
                    </dl>
                </section> : null}
                {!loading && billingProfile.kind === 'loaded' ? <p role="status" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">Billing country for paid plans: <strong>{billingProfile.profile.market === 'IN' ? 'India' : 'United Kingdom'}</strong> ({billingProfile.profile.verification_status.replaceAll('_', ' ')}). This is separate from manager identity verification.</p> : null}
                {summary?.new_paid_actions_available ? <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200"><CheckCircle2 className="h-5 w-5" /> Your subscription payment is verified.{summary.paid_period?.billing_end ? ` Paid through ${new Date(summary.paid_period.billing_end).toLocaleString()}.` : ''}</div> : null}
                {activeCheckout ? <section aria-label="Current subscription" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100">
                    <h2 className="font-bold">Current subscription</h2>
                    <p role="status" className="mt-2">Status: {formatSubscriptionStatus(summary?.subscription?.status ?? activeCheckout.status)}. No second checkout will be created while this subscription is unresolved.</p>
                    {pendingPaymentSince !== null ? <p role="status" className="mt-2">Waiting for your bank to confirm the first charge. This page updates automatically.</p> : null}
                    {acceptedCheckout ? <div className="mt-3"><p><strong>{acceptedCheckout.terms.code} — {formatPlanPrice(acceptedCheckout.terms)} / month</strong></p><p className="mt-1">{acceptedCheckout.terms.terms_text}</p><p className="mt-1 text-xs">These are the terms accepted for this checkout, even if current offers have changed.</p></div> : null}
                    {summary?.cancellation ? <p role="status" className="mt-3">Cancellation: {summary.cancellation.status === 'confirmed' ? 'confirmed. Renewal has stopped.' : 'not yet confirmed. Check payment status or retry cancellation.'}</p> : null}
                    {pendingProof ? <div role="alert" className="mt-3"><p>Payment verification is pending. Do not pay again. Retry verification or check payment status.</p><button disabled={busy} type="button" onClick={() => void retryVerification()} className="mt-2 rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Retry payment verification</button></div> : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                        {summary && canResumeSubscription(summary) && acceptedCheckout && !pendingProof && !checkoutBlockedByVerification ? <button disabled={busy || Boolean(error)} type="button" onClick={() => void resume()} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Resume secure checkout</button> : null}
                        <button disabled={busy} type="button" onClick={() => void checkStatus()} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Check payment status</button>
                        {activeCheckout.provider_subscription_id && !terminal && summary?.cancellation?.status !== 'confirmed' ? <button disabled={busy} type="button" onClick={() => setConfirmCancel(true)} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Cancel subscription / renewal</button> : null}
                    </div>
                    {confirmCancel ? <div className="mt-4 rounded-xl border p-4"><p>Stop this subscription’s future charges? Any verified paid-through access remains until its end date. Cancelling does not delete your documents or ongoing cases.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} type="button" onClick={() => void cancel()} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Confirm cancellation</button><button disabled={busy} type="button" onClick={() => setConfirmCancel(false)} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">Keep subscription</button></div></div> : null}
                </section> : null}
                {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div> : null}
                {offersError ? <p role="status" className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">{offersError}</p> : null}
                {!loading && plansToShow.length === 0 && previewError ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Plan descriptions could not be loaded. Refresh to try again; your existing access is unchanged.</p> : null}
                {!loading && !error && plansToShow.length === 0 && !previewError ? <p role="status" className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">No approved plans are currently available to compare. Contact support or refresh later. Any existing subscription can still be managed above.</p> : null}
                {summary?.new_checkouts_paused ? <p role="status" className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">New subscriptions are temporarily paused. You can still manage an existing subscription.</p> : null}
                {loading ? <BrandLoadingScreen label="Loading subscription plans..." /> : plansToShow.length > 0 ? <section aria-label="Compare manager plans" className="grid gap-6 lg:grid-cols-2">
                    {plansToShow.map((plan) => <ManagerSubscriptionPlanCard
                        key={'id' in plan ? plan.id : plan.code}
                        plan={plan}
                        checkoutDisabled={busy || Boolean(error) || Boolean(offersError) || Boolean(summary?.new_checkouts_paused) || Boolean(activeCheckout) || !recurringConsent || checkoutBlockedByVerification}
                        checkoutDisabledReason={checkoutBlockedByVerification ? SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON : undefined}
                        busy={'id' in plan && busyPlan === plan.id}
                        onStart={(offer) => void start(offer)}
                    />)}
                </section> : null}
                {offers.length > 0 ? <label className="mt-8 flex items-start gap-3 rounded-2xl border bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"><input type="checkbox" disabled={checkoutBlockedByVerification} checked={recurringConsent && !checkoutBlockedByVerification} onChange={(event) => setRecurringConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-600" /><span>I understand this is a monthly recurring subscription, the displayed tax-inclusive amount, and the cancellation terms before payment.</span></label> : null}
                {offers.length > 0 || activeCheckout ? <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-gray-600 dark:text-gray-300"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Payment details are collected by Razorpay. Estospaces never receives or stores card or bank credentials.</div> : null}
                <ManagerBillingHistory />
            </div>
        </div>
    );
}
