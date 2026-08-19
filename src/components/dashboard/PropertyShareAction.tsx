import type { MouseEvent } from 'react';
import { Share2 } from 'lucide-react';

interface PropertyShareActionProps {
    propertyTitle: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    expanded?: boolean;
}

const PropertyShareAction = ({
    propertyTitle,
    onClick,
    disabled = false,
    expanded = false,
}: PropertyShareActionProps) => {
    const label = disabled
        ? `Publish ${propertyTitle} before sharing`
        : `Share ${propertyTitle} on social media`;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            title={disabled ? 'Publish this property before sharing' : 'Share property'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/95 text-gray-700 shadow-lg backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-gray-700 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-100 dark:hover:border-orange-500/40 dark:hover:bg-orange-600 dark:focus-visible:ring-offset-gray-950 dark:disabled:hover:bg-gray-900"
        >
            <Share2 size={17} strokeWidth={2.25} aria-hidden="true" />
        </button>
    );
};

export default PropertyShareAction;
