import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { getTrialBanner, managerSubscriptionSummaryQueryKey, type TrialBanner } from '@/lib/managerLaunchTrial';
import { PLAN_UPGRADE_PATH } from '@/lib/planLimit';
import { getManagerSubscriptionSummary, type ManagerSubscriptionSummary } from '@/services/managerSubscriptionService';

interface ManagerTrialBannerProps {
    /** A summary the page already loaded; when given, the banner does not fetch its own. */
    summary?: ManagerSubscriptionSummary | null;
    /** Where the subscribe action points. Defaults to the subscription page. */
    actionHref?: string;
    className?: string;
}

const toneClasses: Record<TrialBanner['tone'], string> = {
    info: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100',
    neutral: 'border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100',
};

const toneIcons = { info: Sparkles, warning: AlertTriangle, neutral: CalendarClock };

export function ManagerTrialBannerView({ banner, actionHref = PLAN_UPGRADE_PATH, className = '' }: { banner: TrialBanner; actionHref?: string; className?: string }) {
    const Icon = toneIcons[banner.tone];
    return (
        <section
            aria-label="Growth plan trial"
            role={banner.tone === 'warning' ? 'alert' : 'status'}
            data-trial-banner={banner.kind}
            className={`flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${toneClasses[banner.tone]} ${className}`}
        >
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                    <p className="font-bold">{banner.title}</p>
                    {banner.detail ? <p className="mt-1 leading-6">{banner.detail}</p> : null}
                </div>
            </div>
            {banner.action ? (
                actionHref.startsWith('#')
                    ? <a href={actionHref} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 px-4 font-bold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">{banner.action.label}</a>
                    : <Link to={actionHref} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 px-4 font-bold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">{banner.action.label}</Link>
            ) : null}
        </section>
    );
}

// Trial status for the signed-in manager. It renders nothing when there is no
// trial, when paid access applies, or when Payment cannot be reached.
export default function ManagerTrialBanner({ summary, actionHref, className }: ManagerTrialBannerProps) {
    const { user } = useAuth();
    const provided = summary !== undefined;
    const query = useQuery({
        queryKey: managerSubscriptionSummaryQueryKey(user?.id),
        queryFn: async () => (await getManagerSubscriptionSummary({ suppressErrorToast: true })).account,
        enabled: !provided && Boolean(user?.id),
        staleTime: 60_000,
    });
    const account = provided ? summary : query.data;
    const banner = getTrialBanner(account?.trial, account?.entitlement, new Date());
    return banner ? <ManagerTrialBannerView banner={banner} actionHref={actionHref} className={className} /> : null;
}
