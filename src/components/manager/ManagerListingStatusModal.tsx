import { useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmModal from '@/components/ui/ConfirmModal';
import {
    describeManagerListingAction,
    presentManagerListingActionError,
    type ManagerListingFailure,
    type ManagerListingSubject,
} from '@/lib/managerListingActions';
import type { ManagerListingAction, ManagerListingStatusResult } from '@/services/propertyService';

interface ManagerListingStatusModalProps {
    listing: ManagerListingSubject & { id: string };
    action: ManagerListingAction;
    onClose: () => void;
    onConfirm: (id: string, action: ManagerListingAction) => Promise<ManagerListingStatusResult>;
    /** Called once core has accepted the change, with the sentence to show. */
    onChanged: (message: string) => void;
}

/**
 * Confirms Unpublish / Republish / Mark sold|let and keeps core's refusal in the
 * dialog, so a manager can read what is still open before trying again. Mount it
 * only while an action is chosen; its state is per choice.
 */
export default function ManagerListingStatusModal({ listing, action, onClose, onConfirm, onChanged }: ManagerListingStatusModalProps) {
    const [pending, setPending] = useState(false);
    const [failure, setFailure] = useState<ManagerListingFailure | null>(null);
    const copy = describeManagerListingAction(action, listing);

    const handleConfirm = async () => {
        if (pending) {
            return;
        }
        setPending(true);
        setFailure(null);
        try {
            const result = await onConfirm(listing.id, action);
            if (result.error || !result.data) {
                setFailure(presentManagerListingActionError(action, result, listing));
                return;
            }
            onChanged(copy.successMessage);
        } finally {
            setPending(false);
        }
    };

    return (
        <ConfirmModal
            isOpen
            title={copy.title}
            message={copy.summary}
            confirmText={failure ? 'Try again' : copy.confirmLabel}
            variant={action === 'republish' ? 'default' : 'warning'}
            loading={pending}
            onClose={onClose}
            onConfirm={() => { void handleConfirm(); }}
        >
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                {copy.effects.map((effect) => <li key={effect}>{effect}</li>)}
            </ul>
            {failure && (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                    <p className="font-semibold">{failure.title}</p>
                    {failure.items.length > 0 && (
                        <ul className="mt-1 list-disc pl-5">
                            {failure.items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    )}
                    {failure.message && <p className="mt-1">{failure.message}</p>}
                    {failure.upgrade && (
                        <Link to={failure.upgrade.href} className="mt-2 inline-block font-semibold underline">
                            {failure.upgrade.label}
                        </Link>
                    )}
                </div>
            )}
        </ConfirmModal>
    );
}
