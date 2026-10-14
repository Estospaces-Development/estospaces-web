import { useEffect, useState } from 'react';

import ManagerListingStatusModal from '@/components/manager/ManagerListingStatusModal';
import { useOptionalProperties } from '@/contexts/PropertyContext';
import { useToast } from '@/contexts/ToastContext';
import { shouldPromptMarkLet, type ManagerListingSubject } from '@/lib/managerListingActions';
import { getPropertyById, updateManagerPropertyStatus } from '@/services/propertyService';
import type { FastTrackCase } from '@/services/fastTrackService';

/**
 * A completed Fast Track rental leaves the home published, so other renters could still start
 * a viewing on it. Prompts the manager to run the same Mark let action as the property page.
 */
export default function ManagerMarkLetPrompt({ fastTrackCase }: { fastTrackCase: Pick<FastTrackCase, 'propertyId' | 'workspaceFinalStatus' | 'journeyMode' | 'listingType'> }) {
    const toast = useToast();
    // The context action also updates the manager's inventory list and publishes a workspace sync.
    const properties = useOptionalProperties();
    const changeStatus = properties?.changeListingStatus ?? updateManagerPropertyStatus;
    const [listing, setListing] = useState<(ManagerListingSubject & { id: string }) | null>(null);
    const [open, setOpen] = useState(false);
    const { propertyId, workspaceFinalStatus, journeyMode } = fastTrackCase;
    const eligibleCase = workspaceFinalStatus === 'completed' && journeyMode === 'rent' && Boolean(propertyId);

    useEffect(() => {
        if (!eligibleCase) {
            return undefined;
        }
        let cancelled = false;
        void getPropertyById(propertyId, { suppressErrorToast: true }).then(({ data }) => {
            if (!cancelled && data) {
                setListing({ id: propertyId, title: data.title, status: data.status, listingType: data.listing_type });
            }
        });
        return () => { cancelled = true; };
    }, [eligibleCase, propertyId]);

    if (!listing || listing.id !== propertyId || !shouldPromptMarkLet(fastTrackCase, listing)) {
        return null;
    }

    return (
        <>
            <div role="status" data-fast-track-mark-let-prompt className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-semibold">This home is still listed as available</p>
                <p className="mt-1">The tenancy is complete. Mark the listing as let so other renters can no longer start a viewing or Fast Track on it.</p>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800"
                >
                    Mark let
                </button>
            </div>
            {open && (
                <ManagerListingStatusModal
                    listing={listing}
                    action="mark_sold"
                    onClose={() => setOpen(false)}
                    onConfirm={changeStatus}
                    onChanged={(message) => {
                        setOpen(false);
                        setListing({ ...listing, status: 'let' });
                        toast.success(message);
                    }}
                />
            )}
        </>
    );
}
