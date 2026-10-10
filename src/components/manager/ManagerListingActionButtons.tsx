import { BadgeCheck, Eye, EyeOff } from 'lucide-react';

import {
    getManagerListingActionLabel,
    getManagerListingActions,
    type ManagerListingSubject,
} from '@/lib/managerListingActions';
import type { ManagerListingAction } from '@/services/propertyService';

export type ManagerListingActionButtonVariant = 'floating' | 'icon' | 'labelled';

interface ManagerListingActionButtonsProps {
    listing: ManagerListingSubject;
    variant: ManagerListingActionButtonVariant;
    /** True while a request or dialog is open, so a second action cannot start. */
    disabled?: boolean;
    onSelect: (action: ManagerListingAction) => void;
}

const ICONS = { unpublish: EyeOff, republish: Eye, mark_sold: BadgeCheck } as const;

const VARIANT_CLASS: Record<ManagerListingActionButtonVariant, string> = {
    floating: 'p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    icon: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    labelled: 'flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-45',
};

/** Unpublish / Republish / Mark sold|let for the actions core would accept for this listing. */
export default function ManagerListingActionButtons({ listing, variant, disabled = false, onSelect }: ManagerListingActionButtonsProps) {
    const title = listing.title?.trim();
    return (
        <>
            {getManagerListingActions(listing).map((action) => {
                const label = getManagerListingActionLabel(action, listing.listingType);
                const Icon = ICONS[action];
                return (
                    <button
                        key={action}
                        type="button"
                        aria-label={title && variant !== 'labelled' ? `${label} ${title}` : label}
                        title={label}
                        disabled={disabled}
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelect(action);
                        }}
                        className={VARIANT_CLASS[variant]}
                    >
                        <Icon className={variant === 'labelled' ? 'w-5 h-5' : 'w-4 h-4'} aria-hidden="true" />
                        {variant === 'labelled' && <span className="hidden sm:inline">{label}</span>}
                    </button>
                );
            })}
        </>
    );
}
