import React from 'react';

import ConfirmModal from '@/components/ui/ConfirmModal';

export const FORCE_DELETE_PROPERTY_STEPS = [
    'Cancel its pending reservations and withdraw its unsigned contracts',
    'Cancel its upcoming viewings and open Fast Track cases',
    'Withdraw its open applications',
    'Record the reason "Listing removed by admin" on each',
];

// Who Booking notifies, exactly: the viewing, contract and Fast Track flows send
// notices; withdrawn applications and cancelled reservations send none.
export const FORCE_DELETE_PROPERTY_NOTIFIES =
    'Notified: the person who booked each viewing, both parties to each contract, and the assigned manager of a Fast Track still in progress. Applicants, Fast Track users and guests with a pending reservation are not notified; they see the new status in their account.';

export const FORCE_DELETE_PROPERTY_STILL_BLOCKS =
    'A signed contract still in force, a confirmed stay that has not ended or a paid Fast Track still blocks the delete. The listing and its viewings, Fast Tracks and applications are then kept.';

interface ForceDeletePropertyModalProps {
    /** Core's reason for refusing the delete; null keeps the dialog closed. */
    refusal: string | null;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/** An admin's "Delete anyway" after core refused a delete because Booking still has open work on the listing. */
const ForceDeletePropertyModal = ({ refusal, loading, onClose, onConfirm }: ForceDeletePropertyModalProps) => (
    <ConfirmModal
        isOpen={refusal !== null}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete anyway?"
        message={refusal ?? ''}
        confirmText={loading ? 'Deleting...' : 'Delete anyway'}
        variant="danger"
        loading={loading}
    >
        <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Deleting anyway will first:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
            {FORCE_DELETE_PROPERTY_STEPS.map((step) => (
                <li key={step}>{step}</li>
            ))}
        </ul>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{FORCE_DELETE_PROPERTY_NOTIFIES}</p>
        <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">{FORCE_DELETE_PROPERTY_STILL_BLOCKS}</p>
    </ConfirmModal>
);

export default ForceDeletePropertyModal;
