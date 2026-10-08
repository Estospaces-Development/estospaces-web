import React from 'react';

import ConfirmModal from '@/components/ui/ConfirmModal';

export const FORCE_DELETE_PROPERTY_STEPS = [
    'Cancel its open Fast Track cases and upcoming viewings',
    'Withdraw its open applications and unsigned contracts',
    'Cancel its pending reservations',
    'Record the reason "Listing removed by admin" on each and notify the people involved',
];

export const FORCE_DELETE_PROPERTY_STILL_BLOCKS =
    'A signed contract still in force, a confirmed stay that has not ended or a paid Fast Track still blocks the delete. Then nothing is closed.';

interface ForceDeletePropertyModalProps {
    /** Core's reason for refusing the plain delete; null keeps the dialog closed. */
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
        <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">{FORCE_DELETE_PROPERTY_STILL_BLOCKS}</p>
    </ConfirmModal>
);

export default ForceDeletePropertyModal;
