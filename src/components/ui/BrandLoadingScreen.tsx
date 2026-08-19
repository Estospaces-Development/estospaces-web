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
        screen: 'min-h-[100dvh]',
        section: 'min-h-[14rem] sm:min-h-[18rem]',
        panel: 'min-h-32 sm:min-h-40',
    }[variant];
    const spacingClass = variant === 'screen' ? 'px-5 py-12 sm:px-8' : 'px-4 py-8 sm:px-6';
    const logoClass = variant === 'panel'
        ? 'h-16 w-24 rounded-2xl p-3 sm:h-18 sm:w-28'
        : 'h-20 w-32 rounded-[1.5rem] p-4 sm:h-24 sm:w-40';

    return (
        <div
            className={`brand-loading-surface relative isolate flex w-full items-center justify-center overflow-hidden rounded-[inherit] bg-orange-50/70 dark:bg-zinc-950 ${spacingClass} ${heightClass} ${className}`.trim()}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy="true"
        >
            <div
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.13),transparent_48%)] dark:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.16),transparent_48%)]"
                aria-hidden="true"
            />

            <div className="flex w-full max-w-sm flex-col items-center text-center">
                <div
                    className={`brand-loading-logo grid place-items-center bg-white shadow-[0_18px_50px_-24px_rgba(154,52,18,0.55)] ring-1 ring-orange-200/80 dark:bg-zinc-900 dark:ring-orange-400/20 ${logoClass}`}
                    aria-hidden="true"
                >
                    <img
                        src="/logo-icon.png"
                        alt=""
                        width={160}
                        height={56}
                        className="h-auto w-full object-contain"
                    />
                </div>

                <p className={`${variant === 'panel' ? 'mt-4 text-lg' : 'mt-5 text-xl sm:text-2xl'} font-display font-bold tracking-tight text-zinc-950 dark:text-white`}>
                    Estospaces
                </p>
                <p className="mt-2 max-w-[32ch] text-sm font-medium leading-6 text-zinc-600 dark:text-zinc-300">
                    {label}
                </p>
                {description ? (
                    <p className="mt-1 max-w-[38ch] text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        {description}
                    </p>
                ) : null}

                <div className={`${variant === 'panel' ? 'mt-4 w-28' : 'mt-5 w-36'} h-1.5 overflow-hidden rounded-full bg-orange-200/70 dark:bg-orange-950`} aria-hidden="true">
                    <span className="brand-loading-progress block h-full w-1/2 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400" />
                </div>
            </div>
        </div>
    );
}
