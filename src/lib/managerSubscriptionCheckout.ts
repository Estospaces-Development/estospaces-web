import type { AcceptedSubscriptionTerms, ManagerSubscriptionSummary, StartCheckoutResponse } from '../services/managerSubscriptionService';
import { getManagerPlanDisplayName } from './managerPlanNames';

/** The amount the provider charges each month: tax is added only when the price excludes it. */
export function subscriptionGrossMinor(terms: Pick<AcceptedSubscriptionTerms, 'amount_minor' | 'tax_minor' | 'tax_inclusive'>): number {
    return terms.amount_minor + (terms.tax_inclusive ? 0 : (terms.tax_minor ?? 0));
}

/**
 * Formats integer minor units (paise, pence) in the market's locale. With
 * `trimWholeUnits`, a whole amount drops its ".00" (₹999, £49) so discount
 * copy reads naturally; anything else always shows two decimals.
 */
export function formatMinorCurrency(amountMinor: number, currency: string, options: { trimWholeUnits?: boolean } = {}): string {
    const digits = options.trimWholeUnits && amountMinor % 100 === 0 ? 0 : 2;
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-GB', {
        style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(amountMinor / 100);
}

export function formatSubscriptionPrice(terms: Pick<AcceptedSubscriptionTerms, 'amount_minor' | 'currency' | 'tax_minor' | 'tax_inclusive'>): string {
    return formatMinorCurrency(subscriptionGrossMinor(terms), terms.currency);
}

export interface SubscriptionPaymentProof {
    payment_id: string;
    signature: string;
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_signature: string;
    razorpay_subscription_id: string;
}

export interface SubscriptionCheckoutOptions {
    key: string;
    subscription_id: string;
    name: string;
    description: string;
    handler: (response: RazorpayResponse) => void;
    modal: { ondismiss: () => void };
    theme: { color: string };
}

declare global {
    interface Window {
        Razorpay?: new (options: SubscriptionCheckoutOptions) => { open: () => void };
    }
}

const checkoutScript = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoading: Promise<void> | null = null;

export function loadRazorpayScript(timeoutMs = 15000): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    if (scriptLoading) return scriptLoading;
    scriptLoading = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${checkoutScript}"]`);
        const script = existing ?? document.createElement('script');
        const finish = (error?: Error) => {
            clearTimeout(timer);
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
            if (error) {
                script.remove();
                reject(error);
            } else resolve();
        };
        const onLoad = () => finish(window.Razorpay ? undefined : new Error('Razorpay checkout could not load. Please try again.'));
        const onError = () => finish(new Error('Razorpay checkout could not load. Please try again.'));
        const timer = setTimeout(onError, timeoutMs);
        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });
        if (!existing) {
            script.src = checkoutScript;
            script.async = true;
            document.head.appendChild(script);
        }
    }).finally(() => { scriptLoading = null; });
    return scriptLoading;
}

export function canResumeSubscription(account: ManagerSubscriptionSummary): boolean {
    return account.checkout?.status === 'ready'
        && Boolean(account.checkout.provider_subscription_id)
        && !account.new_paid_actions_available
        && !account.cancellation
        && (!account.subscription || account.subscription.status === 'created');
}

/** The line shown on Razorpay's own screen, naming the accepted discount when there is one. */
export function describeCheckoutForProvider(checkout: Pick<StartCheckoutResponse, 'terms' | 'price'>): string {
    const base = `${getManagerPlanDisplayName(checkout.terms.code)} manager subscription`;
    const price = checkout.price;
    if (!price) return base;
    return `${base} · ${price.percent_off}% off for ${price.discount_cycles} ${price.discount_cycles === 1 ? 'month' : 'months'}`;
}

// The promise owns the SDK callback, so asynchronous verification failures reach
// the page's error handling rather than becoming unhandled rejections.
export function openSubscriptionCheckout(
    checkout: StartCheckoutResponse,
    verify: (proof: SubscriptionPaymentProof) => Promise<ManagerSubscriptionSummary>,
): Promise<ManagerSubscriptionSummary | null> {
    return new Promise((resolve, reject) => {
        if (!window.Razorpay || checkout.checkout.status !== 'ready' || !checkout.checkout.provider_subscription_id) {
            reject(new Error('Checkout is not ready. Check payment status before trying again.'));
            return;
        }
        let settled = false;
        let verifying = false;
        const razorpay = new window.Razorpay({
            key: checkout.key_id,
            subscription_id: checkout.checkout.provider_subscription_id,
            name: 'Estospaces',
            description: describeCheckoutForProvider(checkout),
            handler: (response) => {
                if (settled || verifying) return;
                verifying = true;
                void (async () => {
                    try {
                        if (response.razorpay_subscription_id !== checkout.checkout.provider_subscription_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                            throw new Error('Payment confirmation did not match this checkout. Check payment status; do not pay again.');
                        }
                        resolve(await verify({ payment_id: response.razorpay_payment_id, signature: response.razorpay_signature }));
                    } catch (error) {
                        reject(error);
                    } finally {
                        settled = true;
                    }
                })();
            },
            modal: { ondismiss: () => {
                if (!settled && !verifying) { settled = true; resolve(null); }
            } },
            theme: { color: '#ea580c' },
        });
        razorpay.open();
    });
}
