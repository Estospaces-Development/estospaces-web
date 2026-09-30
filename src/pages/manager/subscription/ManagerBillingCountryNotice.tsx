import { Link } from 'react-router-dom';
import { AlertTriangle, LifeBuoy, ShieldCheck } from 'lucide-react';

import {
    MANAGER_VERIFICATION_PATH,
    buildBillingCountryVerificationSupportPath,
    describeBillingDocumentStatus,
    type BillingCountryDocument,
    type BillingProfileLookup,
} from '@/lib/managerSubscriptionReadiness';

interface ManagerBillingCountryNoticeProps {
    message: string;
    reviewNeeded: boolean;
    billingProfile: BillingProfileLookup;
    documents: BillingCountryDocument[];
    managerVerified: boolean;
}

// Explicit light and dark colours: this text sits on its own surface and must
// not inherit a page colour that disappears on the dark background.
export default function ManagerBillingCountryNotice({ message, reviewNeeded, billingProfile, documents, managerVerified }: ManagerBillingCountryNoticeProps) {
    if (!reviewNeeded) {
        return <p role="status" className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">{message}</p>;
    }
    return <section aria-labelledby="billing-country-review-title" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-gray-900 dark:text-gray-100">
        <h2 id="billing-country-review-title" className="flex items-center gap-2 text-base font-bold text-amber-950 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Billing country not verified</h2>
        <p role="status" className="mt-2">{message}</p>
        <p className="mt-3 font-semibold">What the admin reviews</p>
        {documents.length > 0 ? <ul className="mt-1 list-disc space-y-1 pl-5">
            {documents.map((document) => <li key={document.name}>{document.name} <span className="text-amber-900 dark:text-gray-300">({describeBillingDocumentStatus(document.status)})</span></li>)}
        </ul> : <p className="mt-1">Your manager verification documents, such as company registration or a government ID, which show the country you do business in.</p>}
        {!managerVerified ? <p className="mt-3">Your manager verification is not approved yet. Upload these documents first so the admin can confirm your billing country from them.</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
            <Link to={buildBillingCountryVerificationSupportPath(billingProfile, documents)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-700 px-4 font-bold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"><LifeBuoy className="h-4 w-4" aria-hidden="true" /> Request billing country verification</Link>
            {!managerVerified ? <Link to={MANAGER_VERIFICATION_PATH} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400 bg-white px-4 font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Go to manager verification</Link> : null}
        </div>
    </section>;
}
