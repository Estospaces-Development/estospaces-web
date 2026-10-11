import type { MouseEvent } from 'react';
import { Share2 } from 'lucide-react';

import { getShareBlockedReason } from '@/lib/propertySharing';

interface PropertyShareActionProps {
    propertyTitle: string;
    /** Listing status, used to explain why a disabled share control is blocked. */
    status?: string | null;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    expanded?: boolean;
}

const PropertyShareAction = ({
    propertyTitle,
    status,
    onClick,
    disabled = false,
    expanded = false,
}: PropertyShareActionProps) => {
    const blockedReason = getShareBlockedReason(status);
    const label = disabled
        ? `${propertyTitle}: ${blockedReason}`
        : `Share ${propertyTitle} on social media`;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            title={disabled ? blockedReason : 'Share property'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/95 text-gray-700 shadow-lg backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-300/80 disabled:text-gray-500 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:border-gray-200 disabled:hover:bg-gray-300/80 disabled:hover:text-gray-500 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-100 dark:hover:border-orange-500/40 dark:hover:bg-orange-600 dark:focus-visible:ring-offset-gray-950 dark:disabled:border-gray-700 dark:disabled:bg-gray-700/80 dark:disabled:text-gray-400 dark:disabled:hover:border-gray-700 dark:disabled:hover:bg-gray-700/80 dark:disabled:hover:text-gray-400"
        >
            <Share2 size={17} strokeWidth={2.25} aria-hidden="true" />
        </button>
    );
};

export default PropertyShareAction;
