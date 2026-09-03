import { createPortal } from 'react-dom';

import BrandLoadingIndicator from './BrandLoadingIndicator';

interface BrandLoadingScreenProps {
    label?: string;
    description?: string;
    variant?: 'screen' | 'section' | 'panel';
    className?: string;
}

export default function BrandLoadingScreen({
    label = 'Preparing your workspace...',
    description,
    variant = 'screen',
    className = '',
}: BrandLoadingScreenProps) {
    const heightClass = {
        screen: 'fixed inset-0 z-[9999] h-[100dvh] min-h-[100dvh] w-full overscroll-contain',
        section: 'min-h-[18rem] sm:min-h-[22rem]',
        panel: 'min-h-32 sm:min-h-40',
    }[variant];
    const spacingClass = variant === 'screen' ? 'p-6' : 'px-4 py-8 sm:px-6';
    const spinnerClass = {
        screen: 'size-36 sm:size-40',
        section: 'size-28 sm:size-32',
        panel: 'size-20 sm:size-24',
    }[variant];
    const accessibleMessage = description ? `${label} ${description}` : label;
    const layoutClass = variant === 'screen' ? 'isolate flex' : 'relative isolate flex';

    const loadingSurface = (
        <div
            className={`brand-loading-surface ${layoutClass} w-full items-center justify-center overflow-hidden rounded-[inherit] ${spacingClass} ${heightClass} ${className}`.trim()}
            data-loading-variant={variant}
            data-loading-layer={variant === 'screen' ? 'global' : 'inline'}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy="true"
        >
            <BrandLoadingIndicator className={spinnerClass} />
            <span className="sr-only">{accessibleMessage}</span>
        </div>
    );

    if (variant === 'screen' && typeof document !== 'undefined') {
        return createPortal(loadingSurface, document.body);
    }

    return loadingSurface;
}
