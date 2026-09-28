import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { useToast } from '@/contexts/ToastContext';
import {
    OFFER_CHECKLIST_EXPLANATION,
    RAZORPAY_OFFER_STEPS,
    REDEMPTIONS_PAGE_SIZE,
    TRIAL_REVOKE_REASON_MAX,
    buildPromotionDraft,
    buildPromotionPatch,
    canEditPromotion,
    canRevokeTrialGrant,
    checkRevokeReason,
    createIdempotencyKeys,
    describeBackfillResult,
    emptyPromotionForm,
    findLaunchCampaign,
    formatPromotionBenefit,
    formatPromotionKind,
    formatPromotionMarkets,
    formatPromotionPlan,
    formatPromotionUsage,
    getAdminTrialGrantState,
    getOfferChecklist,
    getPromotionActions,
    getPromotionErrorMessage,
    isOfferChecklistComplete,
    normalizeManagerID,
    promotionEditValues,
    shouldReuseIdempotencyKey,
    type PromotionEditResult,
    type PromotionEditValues,
    type PromotionFormErrors,
    type PromotionFormValues,
} from '@/lib/adminPromotions';
import { getManagerPlanDisplayName } from '@/lib/managerPlanNames';
import {
    backfillAdminTrialGrant,
    changeAdminPromotionStatus,
    createAdminPromotion,
    getAdminPromotionRedemptions,
    getAdminPromotions,
    getAdminTrialGrants,
    patchAdminPromotion,
    revokeAdminTrialGrant,
    type AdminPromotion,
    type AdminPromotionAction,
} from '@/services/adminSubscriptionService';

export const promotionQueryKeys = {
    all: ['admin-subscriptions', 'promotions'] as const,
    list: () => [...promotionQueryKeys.all, 'list'] as const,
    redemptions: (promotionID: string, offset: number) => [...promotionQueryKeys.all, promotionID, 'redemptions', offset] as const,
    trialGrants: (managerID: string) => [...promotionQueryKeys.all, 'trial-grants', managerID] as const,
};

const asDateTime = (value?: string | null) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : null;

const formatWindow = (promotion: AdminPromotion) =>
    `${asDateTime(promotion.valid_from) ?? 'now'} → ${asDateTime(promotion.valid_until) ?? 'no end date'}`;

const actionLabels: Record<AdminPromotionAction, string> = { activate: 'Activate', pause: 'Pause', archive: 'Archive' };
const actionSuccess: Record<AdminPromotionAction, string> = {
    activate: 'Promotion activated.',
    pause: 'Promotion paused. Existing trials and discounts continue.',
    archive: 'Promotion archived. Existing trials and discounts continue.',
};

const statusClasses: Record<AdminPromotion['status'], string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    active: 'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-100',
    paused: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    archived: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white';
const buttonPrimary = 'min-h-11 rounded-xl bg-orange-700 px-4 font-bold text-white disabled:opacity-60';
const buttonSecondary = 'min-h-11 rounded-lg border border-gray-300 px-3 font-bold dark:border-gray-700 disabled:opacity-60';

function FieldError({ id, message }: { id: string; message?: string }) {
    return message ? <p id={id} className="mt-1 text-xs font-semibold text-red-700 dark:text-red-300">{message}</p> : null;
}

type EditErrors = Extract<PromotionEditResult, { success: false }>['errors'];

// Activating a percent discount first requires confirming the matching
// Razorpay offer's settings; Activate stays disabled until all are ticked.
function OfferChecklist({ promotion, windowLabel, ticked, busy, onToggle, onActivate }: {
    promotion: AdminPromotion;
    windowLabel: string;
    ticked: string[];
    busy: string | null;
    onToggle: (id: string, checked: boolean) => void;
    onActivate: () => void;
}) {
    const items = getOfferChecklist(promotion, windowLabel);
    const complete = isOfferChecklistComplete(items, ticked);
    const headingId = `offer-check-${promotion.id}`;
    const reasonId = `${headingId}-reason`;
    return <fieldset aria-labelledby={headingId} className="mt-3 grid min-w-72 gap-2 rounded-xl border border-orange-300 p-3 text-xs dark:border-orange-800">
        <legend id={headingId} className="px-1 text-sm font-bold">Confirm the Razorpay offer before activating</legend>
        <p className="text-gray-700 dark:text-gray-300">{OFFER_CHECKLIST_EXPLANATION}</p>
        {items.map((item) => <label key={item.id} className="flex items-start gap-2"><input type="checkbox" checked={ticked.includes(item.id)} onChange={(event) => onToggle(item.id, event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" /><span>{item.label}</span></label>)}
        <button type="button" disabled={!complete || busy !== null} aria-describedby={complete ? undefined : reasonId} onClick={onActivate} className={buttonPrimary}>{busy === `activate:${promotion.id}:${promotion.version}` ? 'Saving…' : 'Activate'}</button>
        {complete ? null : <p id={reasonId} className="text-gray-600 dark:text-gray-300">Tick every setting above to enable Activate.</p>}
    </fieldset>;
}

export default function AdminPromotionsSection() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const idempotency = useRef(createIdempotencyKeys()).current;
    const [busy, setBusy] = useState<string | null>(null);
    const [form, setForm] = useState<PromotionFormValues>(() => emptyPromotionForm());
    const [formErrors, setFormErrors] = useState<PromotionFormErrors>({});
    const [editing, setEditing] = useState<{ id: string; values: PromotionEditValues; errors: EditErrors } | null>(null);
    const [selectedID, setSelectedID] = useState<string | null>(null);
    const [redemptionOffset, setRedemptionOffset] = useState(0);
    const [lookupInput, setLookupInput] = useState('');
    const [lookupManagerID, setLookupManagerID] = useState('');
    const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [backfillManagerID, setBackfillManagerID] = useState('');
    // Ticked Razorpay offer settings, bound to one promotion version so an edit resets them.
    const [offerCheck, setOfferCheck] = useState<{ key: string; ticked: string[] } | null>(null);

    const promotions = useQuery({ queryKey: promotionQueryKeys.list(), queryFn: getAdminPromotions });
    const promotionList = useMemo(() => promotions.data ?? [], [promotions.data]);
    const selected = promotionList.find((promotion) => promotion.id === selectedID) ?? null;
    const redemptions = useQuery({
        queryKey: promotionQueryKeys.redemptions(selectedID ?? '', redemptionOffset),
        queryFn: () => getAdminPromotionRedemptions(selectedID as string, REDEMPTIONS_PAGE_SIZE, redemptionOffset),
        enabled: Boolean(selectedID),
    });
    const trialGrants = useQuery({
        queryKey: promotionQueryKeys.trialGrants(lookupManagerID),
        queryFn: () => getAdminTrialGrants(lookupManagerID),
        enabled: Boolean(lookupManagerID),
    });
    const launchCampaign = findLaunchCampaign(promotionList);
    const redemptionRows = redemptions.data ?? [];

    // Every promotion mutation can change counts, statuses, redemptions and grants.
    const refresh = () => queryClient.invalidateQueries({ queryKey: promotionQueryKeys.all });

    const run = async <T,>(scope: string, action: (key: string) => Promise<T>, success: string | ((result: T) => string)): Promise<boolean> => {
        if (busy) return false;
        setBusy(scope);
        try {
            const result = await action(idempotency.keyFor(scope));
            idempotency.clear(scope);
            toast.success(typeof success === 'string' ? success : success(result));
            return true;
        } catch (error) {
            if (!shouldReuseIdempotencyKey(error)) idempotency.clear(scope);
            toast.error(getPromotionErrorMessage(error));
            return false;
        } finally {
            await refresh();
            setBusy(null);
        }
    };

    const update = <K extends keyof PromotionFormValues>(field: K, value: PromotionFormValues[K]) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFormErrors((current) => ({ ...current, [field]: undefined, ...(field === 'market_in' || field === 'market_gb' ? { markets: undefined } : {}) }));
    };

    const create = async () => {
        const result = buildPromotionDraft(form);
        if (!result.success) {
            setFormErrors(result.errors);
            toast.error('Check the highlighted promotion fields.');
            return;
        }
        setFormErrors({});
        // The key follows the exact request body, so an edited form is a new request.
        const created = await run(`create:${JSON.stringify(result.draft)}`, (key) => createAdminPromotion(result.draft, key), 'Promotion saved as a draft. Activate it when it is ready.');
        if (created) setForm(emptyPromotionForm(form.kind));
    };

    const saveEdit = async (promotion: AdminPromotion) => {
        if (!editing) return;
        const result = buildPromotionPatch(promotion, editing.values);
        if (!result.success) {
            setEditing({ ...editing, errors: result.errors });
            return;
        }
        const saved = await run(`patch:${promotion.id}:${JSON.stringify(result.patch)}`, (key) => patchAdminPromotion(promotion.id, result.patch, key), 'Promotion updated.');
        if (saved) setEditing(null);
    };

    const changeStatus = (promotion: AdminPromotion, action: AdminPromotionAction) =>
        run(`${action}:${promotion.id}:${promotion.version}`, (key) => changeAdminPromotionStatus(promotion.id, action, key), actionSuccess[action]);

    const lookUp = (managerID: string) => {
        const value = normalizeManagerID(managerID);
        setLookupInput(value);
        setLookupManagerID(value);
        setRevokeTarget(null);
        setRevokeReason('');
    };

    const revoke = async (trialGrantID: string) => {
        const check = checkRevokeReason(revokeReason);
        if (!check.ok) {
            toast.error(check.message);
            return;
        }
        const revoked = await run(`revoke:${trialGrantID}:${check.reason}`, (key) => revokeAdminTrialGrant(trialGrantID, check.reason, key), 'Trial revoked. The manager is now on their paid or Free limits.');
        if (revoked) {
            setRevokeTarget(null);
            setRevokeReason('');
        }
    };

    const backfill = async () => {
        const managerID = normalizeManagerID(backfillManagerID);
        if (!managerID) {
            toast.error('Enter the manager ID to grant the launch trial to.');
            return;
        }
        const done = await run(`backfill:${managerID}`, (key) => backfillAdminTrialGrant(managerID, key), (result) => describeBackfillResult(result, (value) => asDateTime(value) ?? value));
        if (done) setBackfillManagerID('');
    };

    const errorProps = (field: keyof PromotionFormErrors) => formErrors[field]
        ? { 'aria-invalid': true as const, 'aria-describedby': `promotion-${field}-error` }
        : {};

    const isDiscount = form.kind === 'percent_discount';
    const now = new Date();

    return <>
        <section aria-labelledby="launch-campaign-heading" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <h2 id="launch-campaign-heading" className="flex items-center gap-2 text-lg font-black text-emerald-950 dark:text-emerald-100"><Megaphone className="h-5 w-5" aria-hidden /> Launch campaign</h2>
            {promotions.isLoading ? <p className="mt-3 inline-flex items-center gap-2 text-sm"><ActionSpinner size="sm" aria-hidden /> Loading campaign…</p>
                : promotions.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-800 dark:text-red-200">Unable to load promotions. Use Refresh to retry.</p>
                    : launchCampaign ? <div className="mt-3 text-sm text-emerald-950 dark:text-emerald-100">
                        <p className="font-bold">{launchCampaign.name}: {getManagerPlanDisplayName(launchCampaign.plan_code)} for {formatPromotionBenefit(launchCampaign)}, applied automatically to new manager signups in every market.</p>
                        <p className="mt-1">Window {formatWindow(launchCampaign)} · used {formatPromotionUsage(launchCampaign)}</p>
                        <p className="mt-1 text-xs">Pausing or archiving stops new signup trials only. Trials already granted run to their end date.</p>
                        <div className="mt-3 flex flex-wrap gap-2">{getPromotionActions(launchCampaign.status).map((action) => <button key={action} type="button" disabled={busy !== null} onClick={() => void changeStatus(launchCampaign, action)} className={buttonSecondary}>{busy === `${action}:${launchCampaign.id}:${launchCampaign.version}` ? 'Saving…' : actionLabels[action]}</button>)}</div>
                    </div>
                        : <p className="mt-3 text-sm text-emerald-950 dark:text-emerald-100">No launch campaign is active, so new manager signups do not get a trial. Create a trial promotion with “Apply automatically on signup”, then activate it.</p>}
        </section>

        <section aria-labelledby="promotions-heading" className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 id="promotions-heading" className="text-lg font-black text-gray-900 dark:text-white">Promotions</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Trials and percent discounts. Commercial terms are fixed; only the name, description, end date and cap can be edited.</p>
            {promotions.isLoading ? <p className="mt-4 inline-flex items-center gap-2 text-sm"><ActionSpinner size="sm" aria-hidden /> Loading promotions…</p>
                : promotions.isError ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">Unable to load promotions. Use Refresh to retry.</p>
                    : promotionList.length === 0 ? <p className="mt-4 text-sm text-gray-500">No promotions yet.</p>
                        : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase text-gray-500"><tr><th scope="col" className="py-2 pr-4">Name</th><th scope="col" className="py-2 pr-4">Kind</th><th scope="col" className="py-2 pr-4">Plan</th><th scope="col" className="py-2 pr-4">Benefit</th><th scope="col" className="py-2 pr-4">Window</th><th scope="col" className="py-2 pr-4">Used/cap</th><th scope="col" className="py-2 pr-4">Status</th><th scope="col" className="py-2">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{promotionList.map((promotion) => <tr key={promotion.id} className="align-top">
                                <td className="py-3 pr-4"><p className="font-bold">{promotion.name}</p>{promotion.code ? <code className="text-xs">{promotion.code}</code> : null}{promotion.auto_apply_on_signup ? <p className="text-xs text-emerald-700 dark:text-emerald-300">Auto-applies on signup</p> : null}</td>
                                <td className="py-3 pr-4">{formatPromotionKind(promotion.kind)}</td>
                                <td className="py-3 pr-4">{formatPromotionPlan(promotion)}</td>
                                <td className="py-3 pr-4">{formatPromotionBenefit(promotion)}</td>
                                <td className="py-3 pr-4 text-xs">{formatWindow(promotion)}<br />{formatPromotionMarkets(promotion)}</td>
                                <td className="py-3 pr-4">{formatPromotionUsage(promotion)}</td>
                                <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusClasses[promotion.status]}`}>{promotion.status}</span></td>
                                <td className="py-3"><div className="flex flex-wrap gap-2">
                                    {getPromotionActions(promotion.status).map((action) => action === 'activate' && promotion.kind === 'percent_discount'
                                        ? <button key={action} type="button" aria-expanded={offerCheck?.key === `${promotion.id}:${promotion.version}`} disabled={busy !== null} onClick={() => setOfferCheck(offerCheck?.key === `${promotion.id}:${promotion.version}` ? null : { key: `${promotion.id}:${promotion.version}`, ticked: [] })} className={buttonSecondary}>{offerCheck?.key === `${promotion.id}:${promotion.version}` ? 'Close offer check' : 'Activate…'}</button>
                                        : <button key={action} type="button" disabled={busy !== null} onClick={() => void changeStatus(promotion, action)} className={buttonSecondary}>{busy === `${action}:${promotion.id}:${promotion.version}` ? 'Saving…' : actionLabels[action]}</button>)}
                                    {canEditPromotion(promotion) ? <button type="button" aria-expanded={editing?.id === promotion.id} disabled={busy !== null} onClick={() => setEditing(editing?.id === promotion.id ? null : { id: promotion.id, values: promotionEditValues(promotion), errors: {} })} className={buttonSecondary}>{editing?.id === promotion.id ? 'Close edit' : 'Edit'}</button> : null}
                                    <button type="button" aria-pressed={selectedID === promotion.id} onClick={() => { setSelectedID(selectedID === promotion.id ? null : promotion.id); setRedemptionOffset(0); }} className={buttonSecondary}>{selectedID === promotion.id ? 'Hide redemptions' : 'Redemptions'}</button>
                                </div>
                                {offerCheck?.key === `${promotion.id}:${promotion.version}` ? <OfferChecklist promotion={promotion} windowLabel={formatWindow(promotion)} ticked={offerCheck.ticked} busy={busy} onToggle={(id, checked) => setOfferCheck({ key: offerCheck.key, ticked: checked ? [...offerCheck.ticked, id] : offerCheck.ticked.filter((item) => item !== id) })} onActivate={async () => { if (await changeStatus(promotion, 'activate')) setOfferCheck(null); }} /> : null}
                                {editing?.id === promotion.id ? <div className="mt-3 grid min-w-72 gap-2 rounded-xl border p-3 dark:border-gray-800">
                                    <label className="text-xs font-semibold">Name<input value={editing.values.name} maxLength={128} onChange={(event) => setEditing({ ...editing, values: { ...editing.values, name: event.target.value }, errors: {} })} className={inputClass} /><FieldError id={`edit-${promotion.id}-name`} message={editing.errors.name} /></label>
                                    <label className="text-xs font-semibold">Description<input value={editing.values.description} maxLength={1000} onChange={(event) => setEditing({ ...editing, values: { ...editing.values, description: event.target.value }, errors: {} })} className={inputClass} /><FieldError id={`edit-${promotion.id}-description`} message={editing.errors.description} /></label>
                                    <label className="text-xs font-semibold">Ends<input type="datetime-local" value={editing.values.valid_until} onChange={(event) => setEditing({ ...editing, values: { ...editing.values, valid_until: event.target.value }, errors: {} })} className={inputClass} /><FieldError id={`edit-${promotion.id}-until`} message={editing.errors.valid_until} /></label>
                                    <label className="text-xs font-semibold">Usage cap<input inputMode="numeric" value={editing.values.max_redemptions} onChange={(event) => setEditing({ ...editing, values: { ...editing.values, max_redemptions: event.target.value }, errors: {} })} className={inputClass} /><FieldError id={`edit-${promotion.id}-cap`} message={editing.errors.max_redemptions} /></label>
                                    <FieldError id={`edit-${promotion.id}-form`} message={editing.errors.form} />
                                    <button type="button" disabled={busy !== null} onClick={() => void saveEdit(promotion)} className={buttonPrimary}>{busy?.startsWith(`patch:${promotion.id}:`) ? 'Saving…' : 'Save changes'}</button>
                                </div> : null}</td>
                            </tr>)}</tbody>
                        </table></div>}
        </section>

        {selected ? <section aria-labelledby="redemptions-heading" className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 id="redemptions-heading" className="text-lg font-black text-gray-900 dark:text-white">Redemptions: {selected.name}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">To revoke a trial, open it with “Find trial”; its current state decides whether it can be revoked.</p>
            {redemptions.isLoading ? <p className="mt-4 inline-flex items-center gap-2 text-sm"><ActionSpinner size="sm" aria-hidden /> Loading redemptions…</p>
                : redemptions.isError ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">Unable to load redemptions. Use Refresh to retry.</p>
                    : redemptionRows.length === 0 ? <p className="mt-4 text-sm text-gray-500">{redemptionOffset > 0 ? 'No more redemptions.' : 'No redemptions yet.'}</p>
                        : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase text-gray-500"><tr><th scope="col" className="py-2 pr-4">Manager</th><th scope="col" className="py-2 pr-4">Source</th><th scope="col" className="py-2 pr-4">Status</th><th scope="col" className="py-2 pr-4">Created</th><th scope="col" className="py-2">Trial</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{redemptionRows.map((redemption) => <tr key={redemption.id} className="align-top">
                                <td className="py-3 pr-4"><code className="break-all text-xs">{redemption.manager_id}</code></td>
                                <td className="py-3 pr-4">{redemption.source.replaceAll('_', ' ')}</td>
                                <td className="py-3 pr-4 capitalize">{redemption.status}</td>
                                <td className="py-3 pr-4 text-xs">{asDateTime(redemption.created_at) ?? '—'}</td>
                                <td className="py-3">{redemption.kind === 'trial_grant' && redemption.trial_grant_id
                                    ? <button type="button" onClick={() => lookUp(redemption.manager_id)} className={buttonSecondary}>Find trial</button>
                                    : <span className="text-xs text-gray-500">—</span>}</td>
                            </tr>)}</tbody>
                        </table></div>}
            <div className="mt-4 flex items-center gap-3 text-sm">
                <button type="button" disabled={redemptionOffset === 0 || redemptions.isFetching} onClick={() => setRedemptionOffset(Math.max(0, redemptionOffset - REDEMPTIONS_PAGE_SIZE))} className={buttonSecondary}>Previous</button>
                <span>Showing {redemptionRows.length ? `${redemptionOffset + 1}–${redemptionOffset + redemptionRows.length}` : '0'}</span>
                <button type="button" disabled={redemptionRows.length < REDEMPTIONS_PAGE_SIZE || redemptions.isFetching} onClick={() => setRedemptionOffset(redemptionOffset + REDEMPTIONS_PAGE_SIZE)} className={buttonSecondary}>Next</button>
            </div>
        </section> : null}

        <section aria-labelledby="trial-lookup-heading" className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 id="trial-lookup-heading" className="text-lg font-black text-gray-900 dark:text-white">Find a manager’s trial</h2>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); lookUp(lookupInput); }}>
                <label className="flex-1 text-sm font-semibold">Manager ID<input value={lookupInput} onChange={(event) => setLookupInput(event.target.value)} autoComplete="off" className={`${inputClass} font-mono`} /></label>
                <button type="submit" disabled={!lookupInput.trim()} className={buttonSecondary}>Look up</button>
            </form>
            {lookupManagerID ? (trialGrants.isLoading ? <p className="mt-4 inline-flex items-center gap-2 text-sm"><ActionSpinner size="sm" aria-hidden /> Loading trial…</p>
                : trialGrants.isError ? <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">Unable to load trials for this manager. Check the ID, then retry.</p>
                    : (trialGrants.data ?? []).length === 0 ? <p className="mt-4 text-sm text-gray-500">This manager has no trial.</p>
                        : <ul className="mt-4 space-y-3">{(trialGrants.data ?? []).map((grant) => {
                            const state = getAdminTrialGrantState(grant, now);
                            return <li key={grant.id} className="rounded-xl border p-4 text-sm dark:border-gray-800">
                                <p className="font-bold">{grant.plan_name || getManagerPlanDisplayName(grant.plan_code)} trial · <span className="capitalize">{state}</span></p>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{asDateTime(grant.starts_at)} → {asDateTime(grant.ends_at)}{grant.revoke_reason ? ` · revoked: ${grant.revoke_reason}` : ''}{state === 'superseded' ? ' · replaced by a paid subscription' : ''}</p>
                                {canRevokeTrialGrant(grant, now) ? (revokeTarget === grant.id
                                    ? <div className="mt-3 flex flex-col gap-2">
                                        <label className="text-xs font-semibold">Reason for revoking<textarea value={revokeReason} maxLength={TRIAL_REVOKE_REASON_MAX} rows={2} aria-describedby={`revoke-${grant.id}-count`} onChange={(event) => setRevokeReason(event.target.value)} className={`${inputClass} py-2`} /></label>
                                        <p id={`revoke-${grant.id}-count`} className="text-xs text-gray-500">{revokeReason.length}/{TRIAL_REVOKE_REASON_MAX}</p>
                                        <div className="flex gap-2"><button type="button" disabled={busy !== null} onClick={() => void revoke(grant.id)} className="min-h-11 rounded-lg bg-red-700 px-3 font-bold text-white disabled:opacity-60">{busy?.startsWith(`revoke:${grant.id}:`) ? 'Revoking…' : 'Confirm revoke'}</button><button type="button" disabled={busy !== null} onClick={() => { setRevokeTarget(null); setRevokeReason(''); }} className={buttonSecondary}>Keep trial</button></div>
                                    </div>
                                    : <button type="button" disabled={busy !== null} onClick={() => { setRevokeTarget(grant.id); setRevokeReason(''); }} className="mt-3 min-h-11 rounded-lg border border-red-300 px-3 font-bold text-red-800 disabled:opacity-60 dark:text-red-200">Revoke trial</button>)
                                    : null}
                            </li>;
                        })}</ul>) : null}
        </section>

        <section aria-labelledby="backfill-heading" className="mb-6 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 id="backfill-heading" className="text-lg font-black text-gray-900 dark:text-white">Grant the launch trial to an existing manager</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Uses the active launch campaign and starts now. Each manager can receive one trial, ever; repeating this is safe and changes nothing.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 text-sm font-semibold">Manager ID<input value={backfillManagerID} onChange={(event) => setBackfillManagerID(event.target.value)} autoComplete="off" className={`${inputClass} font-mono`} /></label>
                <button type="button" disabled={busy !== null || !launchCampaign} onClick={() => void backfill()} className={buttonPrimary}>{busy?.startsWith('backfill:') ? 'Granting…' : 'Grant trial'}</button>
            </div>
            {!launchCampaign && !promotions.isLoading ? <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Activate a launch campaign first.</p> : null}
        </section>

        <section aria-labelledby="create-promotion-heading" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/50 dark:bg-orange-950/30">
            <h2 id="create-promotion-heading" className="text-lg font-black text-orange-950 dark:text-orange-100">Create promotion</h2>
            <p className="mt-1 text-sm text-orange-900 dark:text-orange-200">New promotions are saved as drafts. Nothing reaches managers until you activate it.</p>
            <fieldset className="mt-4">
                <legend className="text-sm font-semibold">Kind</legend>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="radio" name="promotion-kind" checked={form.kind === 'trial_grant'} onChange={() => update('kind', 'trial_grant')} className="h-4 w-4 accent-orange-600" /> Trial (plan for a number of days)</label>
                    <label className="inline-flex items-center gap-2"><input type="radio" name="promotion-kind" checked={isDiscount} onChange={() => update('kind', 'percent_discount')} className="h-4 w-4 accent-orange-600" /> Percent discount (off a number of billing months)</label>
                </div>
            </fieldset>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">Name<input value={form.name} maxLength={128} onChange={(event) => update('name', event.target.value)} className={inputClass} {...errorProps('name')} /><FieldError id="promotion-name-error" message={formErrors.name} /></label>
                <label className="text-sm font-semibold">Code {isDiscount ? '' : '(optional, for managers to type)'}<input value={form.code} onChange={(event) => update('code', event.target.value)} autoComplete="off" placeholder="LAUNCH20" className={`${inputClass} font-mono uppercase`} {...errorProps('code')} /><FieldError id="promotion-code-error" message={formErrors.code} /></label>
                <label className="text-sm font-semibold md:col-span-2">Description (optional)<input value={form.description} maxLength={1000} onChange={(event) => update('description', event.target.value)} className={inputClass} {...errorProps('description')} /><FieldError id="promotion-description-error" message={formErrors.description} /></label>
                <label className="text-sm font-semibold">Plan
                    <select value={form.plan_code} onChange={(event) => update('plan_code', event.target.value as PromotionFormValues['plan_code'])} className={inputClass}>
                        <option value="pro">{getManagerPlanDisplayName('pro')} (pro) — ₹999 / £49</option>
                        <option value="growth">{getManagerPlanDisplayName('growth')} (growth) — ₹2,499</option>
                    </select>
                </label>
                {isDiscount ? <>
                    <label className="text-sm font-semibold">Percent off (1–90)<input inputMode="numeric" value={form.percent_off} onChange={(event) => update('percent_off', event.target.value)} className={inputClass} {...errorProps('percent_off')} /><FieldError id="promotion-percent_off-error" message={formErrors.percent_off} /></label>
                    <label className="text-sm font-semibold">Discounted months (1–24)<input inputMode="numeric" value={form.discount_cycles} onChange={(event) => update('discount_cycles', event.target.value)} className={inputClass} {...errorProps('discount_cycles')} /><FieldError id="promotion-discount_cycles-error" message={formErrors.discount_cycles} /></label>
                </> : <>
                    <label className="text-sm font-semibold">Trial days (1–365)<input inputMode="numeric" value={form.trial_days} onChange={(event) => update('trial_days', event.target.value)} className={inputClass} {...errorProps('trial_days')} /><FieldError id="promotion-trial_days-error" message={formErrors.trial_days} /></label>
                    <label className="inline-flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" checked={form.auto_apply_on_signup} onChange={(event) => update('auto_apply_on_signup', event.target.checked)} className="h-4 w-4 accent-orange-600" /> Apply automatically on signup (launch campaign)</label>
                </>}
                <label className="text-sm font-semibold">Starts<input type="datetime-local" value={form.valid_from} onChange={(event) => update('valid_from', event.target.value)} className={inputClass} {...errorProps('valid_from')} /><FieldError id="promotion-valid_from-error" message={formErrors.valid_from} /></label>
                <label className="text-sm font-semibold">Ends (optional)<input type="datetime-local" value={form.valid_until} onChange={(event) => update('valid_until', event.target.value)} className={inputClass} {...errorProps('valid_until')} /><FieldError id="promotion-valid_until-error" message={formErrors.valid_until} /></label>
                <label className="text-sm font-semibold">Usage cap (empty for no cap)<input inputMode="numeric" value={form.max_redemptions} onChange={(event) => update('max_redemptions', event.target.value)} className={inputClass} {...errorProps('max_redemptions')} /><FieldError id="promotion-max_redemptions-error" message={formErrors.max_redemptions} /></label>
                {isDiscount ? <fieldset className="text-sm" {...(formErrors.markets ? { 'aria-describedby': 'promotion-markets-error' } : {})}>
                    <legend className="font-semibold">Markets</legend>
                    <div className="mt-3 flex gap-4">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.market_in} onChange={(event) => update('market_in', event.target.checked)} className="h-4 w-4 accent-orange-600" /> India (IN)</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.market_gb} onChange={(event) => update('market_gb', event.target.checked)} className="h-4 w-4 accent-orange-600" /> United Kingdom (GB)</label>
                    </div>
                    <FieldError id="promotion-markets-error" message={formErrors.markets} />
                </fieldset> : <p className="self-end pb-3 text-xs text-orange-900 dark:text-orange-200">Trials apply in every market: they start before a billing country is known and never charge.</p>}
            </div>
            {isDiscount ? <div className="mt-4 rounded-xl border border-orange-300 bg-white p-4 text-sm dark:border-orange-800 dark:bg-gray-950">
                <h3 className="font-bold">Create the matching Razorpay offer</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Every discount changes real Razorpay pricing. The offer is what Razorpay charges; this promotion only lets managers use it.</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">{RAZORPAY_OFFER_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="font-semibold">INR offer ID (optional in a draft){form.market_in ? '' : ' · India not selected'}<input value={form.provider_offer_id_inr} onChange={(event) => update('provider_offer_id_inr', event.target.value)} disabled={!form.market_in} autoComplete="off" placeholder="offer_…" className={`${inputClass} font-mono`} {...errorProps('provider_offer_id_inr')} /><FieldError id="promotion-provider_offer_id_inr-error" message={formErrors.provider_offer_id_inr} /></label>
                    <label className="font-semibold">GBP offer ID (optional in a draft){form.market_gb ? '' : ' · UK not selected'}<input value={form.provider_offer_id_gbp} onChange={(event) => update('provider_offer_id_gbp', event.target.value)} disabled={!form.market_gb} autoComplete="off" placeholder="offer_…" className={`${inputClass} font-mono`} {...errorProps('provider_offer_id_gbp')} /><FieldError id="promotion-provider_offer_id_gbp-error" message={formErrors.provider_offer_id_gbp} /></label>
                </div>
            </div> : null}
            <button type="button" disabled={busy !== null} onClick={() => void create()} className={`mt-4 ${buttonPrimary}`}>{busy?.startsWith('create:') ? 'Saving…' : 'Save as draft'}</button>
        </section>
    </>;
}
