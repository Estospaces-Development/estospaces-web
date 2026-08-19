interface BrandLoadingScreenProps {
    label?: string;
    variant?: 'screen' | 'section';
    className?: string;
}

export default function BrandLoadingScreen({
    label = 'Preparing your workspace...',
    variant = 'screen',
    className = '',
}: BrandLoadingScreenProps) {
    const heightClass = variant === 'screen' ? 'min-h-[100dvh]' : 'min-h-[18rem]';

    return (
        <div
            className={`brand-loading-surface relative isolate flex w-full items-center justify-center overflow-hidden bg-orange-50/70 px-6 py-12 dark:bg-zinc-950 ${heightClass} ${className}`.trim()}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy="true"
        >
            <div
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.13),transparent_48%)] dark:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.16),transparent_48%)]"
                aria-hidden="true"
            />

            <div className="flex max-w-sm flex-col items-center text-center">
                <div
                    className="grid h-24 w-24 place-items-center rounded-[1.75rem] bg-white p-4 shadow-[0_18px_50px_-24px_rgba(154,52,18,0.55)] ring-1 ring-orange-200/80 dark:bg-zinc-900 dark:ring-orange-400/20 sm:h-28 sm:w-28"
                    aria-hidden="true"
                >
                    <img
                        src="/logo-icon.png"
                        alt=""
                        width={112}
                        height={56}
                        className="h-auto w-full object-contain"
                    />
                </div>

                <p className="mt-6 font-display text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    Estospaces
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    {label}
                </p>

                <div className="mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-orange-200/70 dark:bg-orange-950" aria-hidden="true">
                    <span className="brand-loading-progress block h-full w-1/2 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400" />
                </div>
            </div>
        </div>
    );
}
