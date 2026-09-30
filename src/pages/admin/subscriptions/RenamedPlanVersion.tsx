import { useState } from 'react';

import {
    COPIED_PLAN_FIELDS,
    copiedFieldsMatch,
    otherTierLegacyName,
    type RenamedTerms,
    type RenamedVersionAction,
} from '@/lib/adminPlanRenamedVersion';
import { getManagerPlanDisplayName } from '@/lib/managerPlanNames';
import type { AdminSubscriptionPlan, AdminSubscriptionPlanDraft } from '@/services/adminSubscriptionService';

interface RenamedVersionButtonProps {
    plan: AdminSubscriptionPlan;
    action: RenamedVersionAction;
    busy: string | null;
    open: boolean;
    onOpen: () => void;
}

// Rendered only in the plan approval record, next to Retire.
export function RenamedVersionButton({ plan, action, busy, open, onOpen }: RenamedVersionButtonProps) {
    if (action.state === 'hidden') return null;
    const noteId = `rename-note-${plan.id}`;
    return <div className="flex flex-col items-start gap-1">
        <button type="button" disabled={action.state !== 'enabled' || busy !== null || open} aria-describedby={action.state === 'disabled' ? noteId : undefined} aria-expanded={open} onClick={onOpen} className="min-h-11 rounded-lg border border-orange-300 px-3 font-bold text-orange-800 disabled:opacity-60 dark:border-orange-800 dark:text-orange-200">Create renamed version</button>
        {action.state === 'disabled' ? <p id={noteId} className="max-w-48 text-xs text-gray-600 dark:text-gray-300">{action.reason}</p> : null}
    </div>;
}

const display = (value: unknown) => value === undefined || value === '' ? '—' : String(value);

function TermsText({ terms, side }: { terms: RenamedTerms; side: 'old' | 'new' }) {
    return <p className="mt-2 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        {terms.parts.map((part, index) => part.replacement === undefined
            ? <span key={index}>{part.text}</span>
            : side === 'old'
                ? <del key={index} className="rounded bg-red-100 px-0.5 text-red-900 dark:bg-red-950/60 dark:text-red-100">{part.text}</del>
                : <ins key={index} className="rounded bg-green-100 px-0.5 text-green-900 dark:bg-green-950/60 dark:text-green-100">{part.replacement}</ins>)}
    </p>;
}

interface RenamedVersionPanelProps {
    source: AdminSubscriptionPlan;
    draft: AdminSubscriptionPlanDraft;
    terms: RenamedTerms;
    busy: string | null;
    onCreate: () => void;
    onCancel: () => void;
}

export const renameBusyKey = (plan: Pick<AdminSubscriptionPlan, 'id'>) => `rename:${plan.id}`;

export function RenamedVersionPanel({ source, draft, terms, busy, onCreate, onCancel }: RenamedVersionPanelProps) {
    const [compared, setCompared] = useState(false);
    const identical = copiedFieldsMatch(source, draft);
    const otherTierName = otherTierLegacyName(source.code, source.terms_text);
    const creating = busy === renameBusyKey(source);
    const headingId = `rename-heading-${source.id}`;
    return <section aria-labelledby={headingId} className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-gray-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-gray-100">
        <h3 id={headingId} className="font-black text-orange-950 dark:text-orange-100">Create renamed version: {getManagerPlanDisplayName(source.code)} ({source.code}) v{source.version} to Draft v{draft.version} · {source.currency}</h3>
        <p className="mt-1 text-orange-900 dark:text-orange-200">This creates a new immutable Draft only. Managers do not see it until you approve it separately, and v{source.version} stays approved until you retire it. Only the plan names in the terms change ({terms.replacements} {terms.replacements === 1 ? 'phrase' : 'phrases'}).</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div><p className="text-xs font-bold text-gray-700 dark:text-gray-200">Current terms · v{source.version} · {source.terms_version}</p><TermsText terms={terms} side="old" /></div>
            <div><p className="text-xs font-bold text-gray-700 dark:text-gray-200">New terms · Draft v{draft.version} · {draft.terms_version}</p><TermsText terms={terms} side="new" /></div>
        </div>
        {otherTierName ? <p role="note" className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">The current terms also contain &quot;{otherTierName}&quot;, which is the other tier&apos;s old name. It is left unchanged, so read the new terms to make sure they still make sense.</p> : null}
        <table className="mt-4 w-full text-left text-xs">
            <caption className="text-left font-bold text-gray-700 dark:text-gray-200">Commercial fields sent with the draft</caption>
            <thead><tr className="text-gray-600 dark:text-gray-300"><th scope="col" className="py-1 pr-2">Field</th><th scope="col" className="py-1 pr-2">Approved v{source.version}</th><th scope="col" className="py-1 pr-2">Draft v{draft.version}</th><th scope="col" className="py-1">Result</th></tr></thead>
            <tbody>
                {COPIED_PLAN_FIELDS.map((field) => {
                    const same = source[field] === draft[field];
                    return <tr key={field} className="border-t border-orange-200 dark:border-orange-900/50"><th scope="row" className="py-1 pr-2 font-mono font-normal">{field}</th><td className="break-all py-1 pr-2 font-mono">{display(source[field])}</td><td className="break-all py-1 pr-2 font-mono">{display(draft[field])}</td><td className={same ? 'py-1 font-semibold text-green-800 dark:text-green-200' : 'py-1 font-semibold text-red-800 dark:text-red-200'}>{same ? 'Identical' : 'Different'}</td></tr>;
                })}
                <tr className="border-t border-orange-200 dark:border-orange-900/50"><th scope="row" className="py-1 pr-2 font-mono font-normal">version</th><td className="py-1 pr-2 font-mono">{source.version}</td><td className="py-1 pr-2 font-mono">{draft.version}</td><td className="py-1 font-semibold">New</td></tr>
                <tr className="border-t border-orange-200 dark:border-orange-900/50"><th scope="row" className="py-1 pr-2 font-mono font-normal">terms_version</th><td className="break-all py-1 pr-2 font-mono">{source.terms_version}</td><td className="break-all py-1 pr-2 font-mono">{draft.terms_version}</td><td className="py-1 font-semibold">New</td></tr>
                <tr className="border-t border-orange-200 dark:border-orange-900/50"><th scope="row" className="py-1 pr-2 font-mono font-normal">terms_text</th><td className="py-1 pr-2" colSpan={2}>Plan names only, shown above</td><td className="py-1 font-semibold">Renamed</td></tr>
            </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-700 dark:text-gray-200">Terms schema v{draft.terms_schema_version} also sends property_upload_bytes 0, supplied_leads 0, leads_per_property false and fast_track_discount_bps 0, as that schema requires.</p>
        {identical
            ? <p className="mt-2 font-semibold text-green-800 dark:text-green-200">Every commercial field is identical to approved v{source.version}, including the provider plan ID.</p>
            : <p role="alert" className="mt-2 font-semibold text-red-800 dark:text-red-200">A commercial field differs from the approved version. This draft cannot be created.</p>}
        <label className="mt-3 flex items-center gap-2 font-semibold"><input type="checkbox" checked={compared} onChange={(event) => setCompared(event.target.checked)} className="h-4 w-4" /> I compared the terms</label>
        <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!compared || !identical || busy !== null} onClick={onCreate} className="min-h-11 rounded-lg bg-orange-700 px-4 font-bold text-white disabled:opacity-60">{creating ? 'Creating…' : `Create Draft v${draft.version}`}</button>
            <button type="button" disabled={busy !== null} onClick={onCancel} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 font-bold text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">Cancel</button>
        </div>
    </section>;
}
