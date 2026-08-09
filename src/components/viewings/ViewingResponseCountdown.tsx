import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';

import {
    formatViewingResponseCountdown,
    getViewingResponseSlaState,
    type ViewingResponseSlaInput,
} from '@/lib/viewingResponseSla';

interface ViewingResponseCountdownProps {
    viewing: ViewingResponseSlaInput;
}

const RESPONSE_COPY = {
    expired: {
        label: '10-minute response window ended',
        className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
    },
    responded: {
        label: 'Manager response received',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
    cancelled: {
        label: 'Response timer cancelled',
        className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
    },
} as const;

const ViewingResponseCountdown = ({ viewing }: ViewingResponseCountdownProps) => {
    const [now, setNow] = useState(() => Date.now());
    const responseState = useMemo(
        () => getViewingResponseSlaState(viewing, now),
        [now, viewing],
    );

    useEffect(() => {
        if (responseState.status !== 'active') {
            return undefined;
        }

        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [responseState.status]);

    if (responseState.status === 'unavailable') {
        return null;
    }

    if (responseState.status === 'active') {
        const isUrgent = responseState.secondsRemaining <= 120;
        return (
            <div
                role="timer"
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                    isUrgent
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                        : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300'
                }`}
            >
                <Clock3 className={`h-4 w-4 ${isUrgent ? 'animate-pulse' : ''}`} />
                <span>Manager response due in</span>
                <span className="tabular-nums" aria-label={`${responseState.secondsRemaining} seconds remaining`}>
                    {formatViewingResponseCountdown(responseState.secondsRemaining)}
                </span>
            </div>
        );
    }

    const copy = RESPONSE_COPY[responseState.status];
    return (
        <div role="status" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${copy.className}`}>
            <Clock3 className="h-4 w-4" />
            <span>{copy.label}</span>
        </div>
    );
};

export default ViewingResponseCountdown;
