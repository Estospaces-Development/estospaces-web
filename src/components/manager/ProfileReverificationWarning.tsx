import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

import { formatReverificationWarning } from '@/lib/managerProfileReverification';

interface ProfileReverificationWarningProps {
    fields: string[];
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Pre-save confirmation for a verified manager whose save would send core a
 * verification-sensitive change. Focus starts on Cancel so the safe choice is
 * the default for keyboard users.
 */
export default function ProfileReverificationWarning({ fields, onConfirm, onCancel }: ProfileReverificationWarningProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    return (
        <div
            role="alertdialog"
            aria-labelledby="manager-reverification-warning-title"
            aria-describedby="manager-reverification-warning-message"
            data-reverification-warning
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onCancel();
                }
            }}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        >
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div className="min-w-0">
                    <p id="manager-reverification-warning-title" className="font-semibold">
                        Saving will require re-verification
                    </p>
                    <p id="manager-reverification-warning-message" className="mt-1">
                        {formatReverificationWarning(fields)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            ref={cancelRef}
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg border border-amber-300 bg-white px-4 py-2 font-semibold text-gray-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-amber-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-amber-900/40"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                        >
                            Save changes anyway
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
