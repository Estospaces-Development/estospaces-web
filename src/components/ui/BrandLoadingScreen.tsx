import { createPortal } from 'react-dom';

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
            <div className={`brand-loading-spinner relative grid place-items-center ${spinnerClass}`} aria-hidden="true">
                <span className="brand-loading-spinner-track absolute inset-0 rounded-full" />
                <span className="brand-loading-spinner-ring absolute inset-0 rounded-full" />
                <div className="brand-loading-logo relative z-10 grid size-[78%] place-items-center rounded-full">
                    <img
                        src="/logo-icon.png"
                        alt=""
                        width={104}
                        height={55}
                        className="h-auto w-[74%] object-contain"
                    />
                </div>
            </div>
            <span className="sr-only">{accessibleMessage}</span>
        </div>
    );

    if (variant === 'screen' && typeof document !== 'undefined') {
        return createPortal(loadingSurface, document.body);
    }

    return loadingSurface;
}
