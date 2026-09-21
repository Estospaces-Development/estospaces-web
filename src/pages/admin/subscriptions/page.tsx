import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { useToast } from '@/contexts/ToastContext';
import {
    approveAdminSubscriptionPlan,
    completeAdminPilotPromotion,
    createAdminSubscriptionPlan,
    getAdminPilotCoupons,
    getAdminPilotGrants,
    getAdminSubscriptionPlans,
    issueAdminPilotCoupon,
    retireAdminSubscriptionPlan,
    revokeAdminPilotCoupon,
    scheduleAdminPilotPromotion,
    type AdminSubscriptionPlanDraft,
} from '@/services/adminSubscriptionService';

const queryKeys = {
    all: ['admin-subscriptions'] as const,
    plans: () => [...queryKeys.all, 'plans'] as const,
    coupons: () => [...queryKeys.all, 'coupons'] as const,
    grants: () => [...queryKeys.all, 'grants'] as const,
};

const asDateTime = (value?: string) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';

const planDetails = {
    pro: { amount: 99900, displayAmount: '₹999', properties: 8, cases: 10, support: 'standard' as const, featured: false },
    growth: { amount: 249900, displayAmount: '₹2,499', properties: 20, cases: 50, support: 'dedicated' as const, featured: true },
};

function buildIndiaDraft(code: 'pro' | 'growth', version: number, providerPlanID: string): AdminSubscriptionPlanDraft {
    const profile = planDetails[code];
    return {
        code,
        version,
        provider_plan_id: providerPlanID.trim(),
        amount_minor: profile.amount,
        tax_minor: 0,
        currency: 'INR',
        billing_period: 'monthly',
        billing_interval: 1,
        total_cycles: 12,
        published_property_limit: profile.properties,
        property_upload_bytes: 0,
        supplied_leads: 0,
        leads_per_property: false,
        fast_track_discount_bps: 0,
        support_level: profile.support,
        featured: profile.featured,
        terms_schema_version: 2,
        image_upload_limit_bytes: 52000000,
        active_case_limit: profile.cases,
        lead_delivery_policy: 'best_effort',
        tax_inclusive: true,
        terms_version: `2026-09-india-${code}-v${version}`,
        terms_text: `Estospaces ${code === 'pro' ? 'Pro' : 'Growth'} India monthly subscription. The displayed monthly total is ${profile.displayAmount}. It includes no tax amount at launch. The plan permits ${profile.properties} published properties, ${profile.cases} active Fast Track cases, and 52 MB per property image. Leads are best-effort and are not guaranteed. Existing work stays accessible if the subscription ends; new paid actions require an active subscription.`,
    };
}

export function getCatalogReadState(catalogReady: boolean, catalogError: boolean): 'loading' | 'error' | 'ready' {
    if (catalogReady) {
        return 'ready';
    }
    return catalogError ? 'error' : 'loading';
}

export default function AdminSubscriptionsPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [planCode, setPlanCode] = useState<'pro' | 'growth'>('pro');
    const [providerPlanID, setProviderPlanID] = useState('');
    const [managerID, setManagerID] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [issuedCode, setIssuedCode] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const plans = useQuery({ queryKey: queryKeys.plans(), queryFn: getAdminSubscriptionPlans });
    const coupons = useQuery({ queryKey: queryKeys.coupons(), queryFn: getAdminPilotCoupons });
    const grants = useQuery({ queryKey: queryKeys.grants(), queryFn: getAdminPilotGrants });
    const catalogReady = plans.isSuccess && Array.isArray(plans.data);
    const catalogState = getCatalogReadState(catalogReady, plans.isError);
    const catalogPlans = useMemo(() => catalogReady ? plans.data : [], [catalogReady, plans.data]);
    const nextVersion = useMemo(() => Math.max(0, ...catalogPlans.filter((plan) => plan.code === planCode).map((plan) => plan.version)) + 1, [catalogPlans, planCode]);
    const profile = planDetails[planCode];

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.plans() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.coupons() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.grants() }),
        ]);
    };

    const run = async (key: string, action: () => Promise<unknown>, success: string): Promise<boolean> => {
        setBusy(key);
        try {
            await action();
            toast.success(success);
            await refresh();
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'The change could not be confirmed.');
            return false;
        } finally {
            setBusy(null);
        }
    };

    const createDraft = async () => {
        if (!/^plan_[A-Za-z0-9]+$/.test(providerPlanID.trim())) {
            toast.error('Enter the verified Razorpay plan ID in the form plan_… .');
            return;
        }
        const created = await run('create-plan', () => createAdminSubscriptionPlan(buildIndiaDraft(planCode, nextVersion, providerPlanID)), 'Draft created. Review its terms digest, then approve it in a separate action.');
        if (created) {
            setProviderPlanID('');
        }
    };

    const issueCoupon = async () => {
        if (!managerID.trim() || !expiresAt) {
            toast.error('Enter the manager ID and a future coupon expiry time.');
            return;
        }
        setBusy('issue-coupon');
        try {
            const result = await issueAdminPilotCoupon({ manager_id: managerID.trim(), campaign: 'pilot-launch', expires_at: new Date(expiresAt).toISOString() });
            setIssuedCode(result.code);
            toast.success('Coupon created. Copy it now; it will not be shown again.');
            await refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Coupon could not be created.');
        } finally {
            setBusy(null);
        }
    };

    return <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Admin only</p>
                    <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">Manager subscription operations</h1>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">Create an immutable catalog draft, verify the provider plan and terms digest, then approve it separately. This screen never grants paid access.</p>
                </div>
                <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 font-bold dark:border-gray-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
            </div>

            <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/50 dark:bg-orange-950/30">
                <h2 className="text-lg font-black text-orange-950 dark:text-orange-100">Create India plan draft</h2>
                <p className="mt-1 text-sm text-orange-900 dark:text-orange-200">The provider plan ID is checked by the Payment service against the exact monthly amount and currency. A draft is not visible to managers until you separately approve it.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-semibold">Plan profile
                        <select value={planCode} onChange={(event) => setPlanCode(event.target.value as 'pro' | 'growth')} className="mt-1 min-h-11 w-full rounded-xl border border-orange-300 bg-white px-3 text-gray-900 dark:bg-gray-950 dark:text-white">
                            <option value="pro">Pro — ₹999/month · 8 properties · 10 active Fast Track cases</option>
                            <option value="growth">Growth — ₹2,499/month · 20 properties · 50 active Fast Track cases</option>
                        </select>
                    </label>
                    <label className="text-sm font-semibold">Verified Razorpay plan ID
                        <input value={providerPlanID} onChange={(event) => setProviderPlanID(event.target.value)} autoComplete="off" placeholder="plan_…" className="mt-1 min-h-11 w-full rounded-xl border border-orange-300 bg-white px-3 font-mono text-sm text-gray-900 dark:bg-gray-950 dark:text-white" />
                    </label>
                </div>
                <p className="mt-3 text-sm text-orange-950 dark:text-orange-100">Draft v{nextVersion}: {profile.displayAmount}/month, 52 MB per image, {profile.support} support, leads are best-effort. No Fast Track discount is included.</p>
                {catalogState === 'error' ? <p role="alert" className="mt-3 text-sm font-semibold text-red-800 dark:text-red-200">The current catalog could not be loaded. Refresh before creating a draft so its version is correct.</p> : null}
                <button type="button" disabled={busy !== null || !catalogReady} onClick={() => void createDraft()} className="mt-4 min-h-11 rounded-xl bg-orange-700 px-4 font-bold text-white disabled:opacity-60">{busy === 'create-plan' ? 'Creating…' : 'Create immutable draft'}</button>
                <p className="mt-3 text-xs text-orange-900 dark:text-orange-200">GBP drafts and checkout are intentionally unavailable until Razorpay confirms this merchant’s GBP recurring eligibility and the UK tax treatment is approved.</p>
            </section>

            <section className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Plan approval record</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Approve only after comparing the immutable terms digest with the draft shown below.</p>
                {catalogState === 'loading' ? <p className="mt-4 inline-flex items-center gap-2"><ActionSpinner size="sm" aria-hidden /> Loading plans…</p> : catalogState === 'error' ? <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100">Unable to load the subscription catalog. Use Refresh to retry.</p> : <div className="mt-4 space-y-3">{catalogPlans.length ? catalogPlans.map((plan) => <article key={plan.id} className="rounded-xl border p-4 dark:border-gray-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black uppercase text-orange-700">{plan.code} v{plan.version} · {plan.currency} {(plan.amount_minor / 100).toLocaleString()}</p><p className="mt-1 text-sm">{plan.published_property_limit} properties · {plan.active_case_limit} active Fast Track cases · {plan.support_level} support</p><p className="mt-1 break-all text-xs text-gray-500">Terms {plan.terms_version} · {plan.terms_digest}</p><p className="mt-1 text-xs text-gray-500">{plan.approved_at ? `Approved ${asDateTime(plan.approved_at)}` : 'Draft — not visible to managers'}{plan.retired_at ? ` · Retired ${asDateTime(plan.retired_at)}` : ''}</p><details className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-950"><summary className="cursor-pointer font-bold">Review complete immutable terms before approval</summary><dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2"><div><dt className="text-xs text-gray-500">Provider plan ID</dt><dd className="break-all font-mono">{plan.provider_plan_id || 'Not returned'}</dd></div><div><dt className="text-xs text-gray-500">Monthly billing</dt><dd>{plan.billing_period} · every {plan.billing_interval} month · {plan.total_cycles} cycles</dd></div><div><dt className="text-xs text-gray-500">Tax</dt><dd>{plan.tax_inclusive ? 'Included' : 'Excluded'} · {(plan.tax_minor / 100).toLocaleString()} {plan.currency}</dd></div><div><dt className="text-xs text-gray-500">Limits</dt><dd>{plan.published_property_limit} properties · {plan.active_case_limit} cases · {plan.image_upload_limit_bytes / 1000000} MB/image</dd></div><div><dt className="text-xs text-gray-500">Support and placement</dt><dd>{plan.support_level} · {plan.featured ? 'featured' : 'standard placement'} · leads {plan.lead_delivery_policy}</dd></div><div><dt className="text-xs text-gray-500">Terms schema</dt><dd>v{plan.terms_schema_version}</dd></div></dl><p className="mt-3 whitespace-pre-wrap rounded border bg-white p-3 text-xs leading-5 text-gray-700 dark:bg-gray-900 dark:text-gray-200">{plan.terms_text}</p></details></div><div className="flex gap-2">{!plan.approved_at ? <button type="button" disabled={busy !== null} onClick={() => void run(`approve:${plan.id}`, () => approveAdminSubscriptionPlan(plan.id, plan.terms_digest), 'Plan approved.')} className="min-h-11 rounded-lg bg-green-700 px-3 font-bold text-white disabled:opacity-60">Approve</button> : null}{plan.approved_at && !plan.retired_at ? <button type="button" disabled={busy !== null} onClick={() => void run(`retire:${plan.id}`, () => retireAdminSubscriptionPlan(plan.id), 'Plan retired. Existing accepted terms remain available.')} className="min-h-11 rounded-lg border border-red-300 px-3 font-bold text-red-800 disabled:opacity-60">Retire</button> : null}</div></div></article>) : <p className="text-sm text-gray-500">No plan drafts yet.</p>}</div>}
            </section>

            <section className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">60-day pilot coupon</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">The code is shown exactly once. Share it only with the named manager using an approved private channel.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold">Manager ID<input value={managerID} onChange={(event) => setManagerID(event.target.value)} autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border px-3 font-mono text-sm dark:bg-gray-950" /></label><label className="text-sm font-semibold">Coupon expiry<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 dark:bg-gray-950" /></label></div>
                <button type="button" disabled={busy !== null} onClick={() => void issueCoupon()} className="mt-4 min-h-11 rounded-xl bg-orange-700 px-4 font-bold text-white disabled:opacity-60">{busy === 'issue-coupon' ? 'Creating…' : 'Create one-time coupon'}</button>
                {issuedCode ? <div role="status" className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-950"><p className="font-bold">Copy and securely share this code now. It cannot be recovered later.</p><code className="mt-2 block break-all rounded bg-white p-2 text-sm">{issuedCode}</code><button type="button" className="mt-3 rounded-lg border border-green-400 px-3 py-2 font-bold" onClick={() => setIssuedCode(null)}>I have copied it</button></div> : null}
                {coupons.isError ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">Unable to load pilot coupons. Refresh to retry.</p> : <div className="mt-4 space-y-2">{coupons.data?.map((coupon) => <div key={coupon.id} className="flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{coupon.campaign} · manager <code>{coupon.manager_id}</code> · expires {asDateTime(coupon.expires_at)} · {coupon.redeemed_at ? 'Redeemed' : coupon.revoked_at ? 'Revoked' : 'Available'}</span>{!coupon.redeemed_at && !coupon.revoked_at ? <button type="button" disabled={busy !== null} onClick={() => void run(`revoke:${coupon.id}`, () => revokeAdminPilotCoupon(coupon.id), 'Coupon revoked.')} className="min-h-11 rounded-lg border border-red-300 px-3 font-bold text-red-800 disabled:opacity-60">Revoke</button> : null}</div>)}</div>}
            </section>

            <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><h2 className="text-lg font-black text-gray-900 dark:text-white">Pilot promotion requests</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">A request is not evidence that a listing was promoted or that a lead was delivered.</p>{grants.isError ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">Unable to load promotion requests. Refresh to retry.</p> : <div className="mt-4 space-y-3">{grants.data?.flatMap((item) => item.promotions.map((promotion) => <article key={promotion.id} className="flex flex-col gap-3 rounded-xl border p-4 text-sm dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><span>{item.grant.campaign} · manager {item.grant.manager_id} · request #{promotion.slot} · {promotion.status.replaceAll('_', ' ')}</span><div className="flex gap-2">{promotion.status === 'requested' ? <button type="button" disabled={busy !== null} onClick={() => { const scheduledAt = window.prompt('Enter confirmed scheduled time in ISO 8601 format.'); if (scheduledAt?.trim()) void run(`schedule:${promotion.id}`, () => scheduleAdminPilotPromotion(promotion.id, scheduledAt.trim()), 'Promotion request scheduled.'); }} className="min-h-11 rounded-lg border border-orange-300 px-3 font-bold text-orange-800 disabled:opacity-60">Schedule</button> : null}{promotion.status === 'scheduled' ? <button type="button" disabled={busy !== null} onClick={() => { const evidence = window.prompt('Enter the evidence reference.'); if (evidence?.trim()) void run(`complete:${promotion.id}`, () => completeAdminPilotPromotion(promotion.id, evidence.trim()), 'Promotion completion recorded.'); }} className="min-h-11 rounded-lg bg-green-700 px-3 font-bold text-white disabled:opacity-60">Record completion</button> : null}</div></article>))}</div>}</section>
            <div className="mt-6 flex gap-3 text-xs leading-5 text-gray-500"><ShieldCheck className="h-4 w-4 shrink-0 text-green-600" /> All actions are authenticated and audited by the Payment service. This page cannot mark a manager paid or bypass payment verification.</div>
        </div>
    </div>;
}
