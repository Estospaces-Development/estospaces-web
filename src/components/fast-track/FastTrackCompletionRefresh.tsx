import React, { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FastTrackCompletionRefreshProps {
    onRefresh: () => Promise<string | null>;
    disabled?: boolean;
}

export default function FastTrackCompletionRefresh({ onRefresh, disabled }: FastTrackCompletionRefreshProps) {
    const descriptionId = useId();
    const mounted = useRef(true);
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const refresh = async () => {
        if (pending.current || disabled) return;
        pending.current = true;
        setBusy(true);
        setError(null);
        setSuccess(false);
        try {
            const nextError = await onRefresh();
            if (mounted.current) {
                setError(nextError);
                setSuccess(!nextError);
            }
        } catch {
            if (mounted.current) setError('Unable to refresh completion. Please try again.');
        } finally {
            pending.current = false;
            if (mounted.current) setBusy(false);
        }
    };

    return (
        <div className="mt-4 min-w-0 space-y-3 text-sm" data-fast-track-completion-refresh>
            <p id={descriptionId} className="break-words text-gray-600 dark:text-gray-300">
                Refresh linked property status and notifications. Your handover stays completed.
            </p>
            <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal py-2.5" aria-describedby={descriptionId}
                isLoading={busy} loadingLabel="Refreshing completion…" disabled={disabled} onClick={() => void refresh()}>
                Refresh completion
            </Button>
            {error ? <p role="alert" className="break-words text-red-700 dark:text-red-300">{error} You can refresh completion again after resolving the issue.</p> : null}
            {success ? <p role="status" className="break-words text-gray-700 dark:text-gray-200">Completion refreshed. Your handover remains completed.</p> : null}
        </div>
    );
}
