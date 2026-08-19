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
        screen: 'fixed inset-0 z-[120] h-[100dvh] min-h-[100dvh] w-screen overscroll-contain',
        section: 'min-h-[18rem] sm:min-h-[22rem]',
        panel: 'min-h-32 sm:min-h-40',
    }[variant];
    const spacingClass = variant === 'screen' ? 'p-6 sm:p-10' : 'px-4 py-8 sm:px-6';
    const logoClass = {
        screen: 'h-28 w-52 rounded-[2rem] p-5 sm:h-32 sm:w-60 sm:p-6',
        section: 'h-20 w-40 rounded-[1.75rem] p-4 sm:h-24 sm:w-48 sm:p-5',
        panel: 'h-16 w-32 rounded-2xl p-3 sm:h-18 sm:w-36',
    }[variant];
    const brandClass = {
        screen: 'mt-7 text-3xl sm:text-4xl',
        section: 'mt-6 text-2xl sm:text-3xl',
        panel: 'mt-4 text-lg sm:text-xl',
    }[variant];
    const labelClass = variant === 'screen'
        ? 'mt-3 text-base leading-7 sm:text-lg'
        : 'mt-2 text-sm leading-6';
    const trackClass = variant === 'screen'
        ? 'mt-7 h-2 w-48 sm:w-56'
        : variant === 'section'
            ? 'mt-6 h-1.5 w-40'
            : 'mt-4 h-1.5 w-28';

    return (
        <div
            className={`brand-loading-surface relative isolate flex w-full items-center justify-center overflow-hidden rounded-[inherit] ${spacingClass} ${heightClass} ${className}`.trim()}
            data-loading-variant={variant}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy="true"
        >
            <div className="brand-loading-ambient pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

            <div className={`flex w-full flex-col items-center text-center ${variant === 'screen' ? 'max-w-lg' : 'max-w-sm'}`}>
                <div className="brand-loading-emblem relative grid place-items-center" aria-hidden="true">
                    <span className="brand-loading-halo absolute inset-0 rounded-[2rem]" />
                    <div className={`brand-loading-logo relative grid place-items-center ${logoClass}`}>
                        <img
                            src="/logo-icon.png"
                            alt=""
                            width={160}
                            height={56}
                            className="h-auto w-full object-contain"
                        />
                    </div>
                </div>

                <p className={`${brandClass} font-display font-bold tracking-[-0.035em] text-zinc-950 dark:text-white`}>
                    Estospaces
                </p>
                <p className={`${labelClass} max-w-[34ch] font-medium text-zinc-600 dark:text-zinc-300`}>
                    {label}
                </p>
                {description ? (
                    <p className="mt-1 max-w-[38ch] text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        {description}
                    </p>
                ) : null}

                <div className={`brand-loading-track ${trackClass} overflow-hidden rounded-full`} aria-hidden="true">
                    <span className="brand-loading-progress block h-full w-1/2 rounded-full" />
                </div>
            </div>
        </div>
    );
}
