import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import {
    MANAGER_VERIFICATION_PATH,
    VERIFIED_MANAGER_AREA_DETAIL,
    VERIFIED_MANAGER_AREA_LABELS,
    VERIFIED_MANAGER_AREA_VIEW_ACTION,
    resolveManagerVerificationGate,
    type ManagerVerificationNotice,
    type VerifiedManagerArea,
} from '@/lib/managerVerificationGate';

const primaryActionClass = 'inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2';
const secondaryActionClass = 'inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800';

interface ManagerVerificationBannerProps {
    notice: ManagerVerificationNotice;
    detail: string;
    onRetry?: () => void;
}

/** Compact, persistent explanation shown above a page that opened while the manager is not verified. */
export function ManagerVerificationBanner({ notice, detail, onRetry }: ManagerVerificationBannerProps) {
    return (
        <div
            role="status"
            data-manager-verification-banner={notice.status}
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-start sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        >
            <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                    <p className="font-semibold">{notice.heading}</p>
                    <p className="mt-1">Verification status: <strong>{notice.statusLabel}</strong>. {detail}</p>
                </div>
            </div>
            {notice.retryable && onRetry ? (
                <button type="button" onClick={onRetry} className="shrink-0 rounded-md border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-amber-800 dark:hover:bg-amber-900/40">
                    Retry
                </button>
            ) : (
                <Link to={MANAGER_VERIFICATION_PATH} className="shrink-0 rounded-md border border-amber-300 px-3 py-2 text-center font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-amber-800 dark:hover:bg-amber-900/40">
                    Go to verification
                </Link>
            )}
        </div>
    );
}

interface ManagerVerificationGateProps {
    area: VerifiedManagerArea;
    children: ReactNode;
}

/**
 * Replaces the former silent redirect to the dashboard. The requested URL stays
 * in place and the manager sees why the page is limited, the current status,
 * and the way forward.
 */
export default function ManagerVerificationGate({ area, children }: ManagerVerificationGateProps) {
    const { isLoading, error, managerProfile, verificationStatus, refetch } = useManagerVerification();
    const [showExisting, setShowExisting] = useState(false);

    // The subscription page stays readable and disables checkout itself.
    if (area === 'subscription') {
        return <>{children}</>;
    }

    const decision = resolveManagerVerificationGate({
        isLoading,
        error,
        hasProfile: Boolean(managerProfile),
        verificationStatus,
        reverificationReason: managerProfile?.agency_verification_reason,
    });

    if (decision.kind === 'loading') {
        return <BrandLoadingScreen label="Checking manager access..." />;
    }

    if (decision.kind === 'allow') {
        return <>{children}</>;
    }

    const { notice } = decision;
    const areaLabel = VERIFIED_MANAGER_AREA_LABELS[area];
    const areaDetail = VERIFIED_MANAGER_AREA_DETAIL[area];
    const viewExistingLabel = VERIFIED_MANAGER_AREA_VIEW_ACTION[area];
    const retry = () => { void refetch(); };

    if (showExisting && viewExistingLabel && !notice.retryable) {
        return (
            <>
                <div className="px-4 pt-6 sm:px-6 lg:px-8">
                    <ManagerVerificationBanner notice={notice} detail={areaDetail} />
                </div>
                {children}
            </>
        );
    }

    return (
        <div className="flex w-full justify-center px-4 py-12" data-manager-verification-gate={area}>
            <section
                className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900"
                aria-labelledby="manager-verification-gate-heading"
            >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">{areaLabel}</p>
                <h1 id="manager-verification-gate-heading" className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                    {notice.heading}
                </h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{notice.reason}</p>
                <dl className="mt-5 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-300">Verification status</dt>
                    <dd className="mt-1 font-bold text-gray-900 dark:text-white" data-manager-verification-status={notice.status}>
                        {notice.statusLabel}
                    </dd>
                </dl>
                {!notice.retryable ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{areaDetail}</p> : null}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {notice.retryable ? (
                        <button type="button" onClick={retry} className={primaryActionClass}>
                            Retry
                        </button>
                    ) : (
                        <>
                            <Link to={MANAGER_VERIFICATION_PATH} className={primaryActionClass}>
                                Go to verification
                            </Link>
                            {viewExistingLabel ? (
                                <button type="button" onClick={() => setShowExisting(true)} className={secondaryActionClass}>
                                    {viewExistingLabel}
                                </button>
                            ) : null}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
