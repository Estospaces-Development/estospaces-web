import { useEffect, useState } from 'react';

import { ApiRequestError } from '@/lib/apiUtils';
import {
    getAdminManagerBillingProfile,
    verifyAdminManagerBillingProfile,
    type AdminManagerBillingProfile,
} from '@/services/managerBillingProfileService';

interface ManagerBillingMarketReviewProps {
    managerID: string;
}

export default function ManagerBillingMarketReview({ managerID }: ManagerBillingMarketReviewProps) {
    const [profile, setProfile] = useState<AdminManagerBillingProfile | null>(null);
    const [market, setMarket] = useState<'' | 'IN' | 'GB'>('');
    const [reviewed, setReviewed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        setReviewed(false);
        setSaved(false);
        getAdminManagerBillingProfile(managerID)
            .then((result) => {
                if (!active) return;
                setProfile(result);
                setMarket(result.market);
            })
            .catch((reason: unknown) => {
                if (!active) return;
                if (reason instanceof ApiRequestError && reason.status === 404) {
                    setProfile(null);
                    setMarket('');
                    return;
                }
                setError('Billing profile could not be loaded. Refresh before recording a billing country.');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [managerID, reloadKey]);

    const save = async () => {
        if (!market || !reviewed || saving || loading || error) return;
        setSaving(true);
        setSaved(false);
        try {
            const result = await verifyAdminManagerBillingProfile(managerID, market, profile?.profile_version ?? 0);
            const persisted = await getAdminManagerBillingProfile(managerID);
            if (persisted.profile_version !== result.profile_version || persisted.market !== market || persisted.verification_status !== 'verified') {
                throw new Error('Billing profile did not persist as expected');
            }
            setProfile(persisted);
            setReviewed(false);
            setError(null);
            setSaved(true);
        } catch (reason) {
            setError(reason instanceof ApiRequestError && reason.status === 409
                ? 'This billing profile changed during review. Close and reopen this panel before trying again.'
                : 'Billing country could not be verified. No payment access has been confirmed. Refresh and try again.');
        } finally {
            setSaving(false);
        }
    };

    return <section aria-label="Paid-plan billing country" className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Paid-plan billing country</h3>
        <p className="mt-2 text-sm text-gray-600">Manager identity approval does not verify a billing country. Review the relevant business documents above before recording one. Free access does not require this step.</p>
        {loading ? <p role="status" className="mt-3 text-sm">Loading billing profile…</p> : <>
            <p role="status" className="mt-3 text-sm font-medium text-gray-800">{profile
                ? `Current billing country: ${profile.market === 'IN' ? 'India' : 'United Kingdom'} (${profile.verification_status.replaceAll('_', ' ')}).`
                : 'No billing country review is recorded.'}</p>
            <label htmlFor="admin-billing-market" className="mt-4 block text-sm font-semibold text-gray-800">Country confirmed by documents</label>
            <select id="admin-billing-market" value={market} onChange={(event) => { setMarket(event.target.value as '' | 'IN' | 'GB'); setReviewed(false); setSaved(false); }} disabled={saving || Boolean(error)} className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:opacity-60">
                <option value="">Select country after review</option>
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
            </select>
            <label className="mt-4 flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} disabled={saving || Boolean(error)} className="mt-1 h-4 w-4 accent-orange-600" /><span>I reviewed this manager’s supporting business documents and confirmed that the selected country is correct for subscription billing.</span></label>
            <button type="button" onClick={() => void save()} disabled={!market || !reviewed || saving || Boolean(error)} className="mt-4 min-h-11 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Verifying…' : 'Verify billing country'}</button>
        </>}
        {error ? <div className="mt-3"><p role="alert" className="text-sm font-semibold text-red-700">{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-2 min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Retry billing profile</button></div> : null}
        {saved ? <p role="status" className="mt-3 text-sm font-semibold text-green-700">Billing country verified and confirmed from the saved profile. The manager can refresh paid plans.</p> : null}
    </section>;
}
