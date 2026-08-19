import type { CSSProperties } from 'react';

type BrandLoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface BrandLoaderProps {
    size?: BrandLoaderSize | number | string;
    className?: string;
    label?: string;
    showLabel?: boolean;
    'aria-label'?: string;
}

const sizePixels: Record<BrandLoaderSize, number> = {
    xs: 14,
    sm: 18,
    md: 24,
    lg: 36,
    xl: 48,
};

const resolveSize = (size: BrandLoaderProps['size']) => {
    if (typeof size === 'number') return size;
    if (typeof size === 'string' && size in sizePixels) return sizePixels[size as BrandLoaderSize];
    const parsedSize = Number.parseFloat(size || '');
    return Number.isFinite(parsedSize) ? parsedSize : sizePixels.md;
};

const legacySizePattern = /^(?:h|w)-(\d+(?:\.5)?)$/;

const readLegacySpinnerSize = (className: string) => {
    const heightClass = className
        .split(/\s+/)
        .find((name) => name.startsWith('h-') && legacySizePattern.test(name));
    const heightMatch = heightClass?.match(legacySizePattern);

    return heightMatch ? Number.parseFloat(heightMatch[1]) * 4 : undefined;
};

const removeLegacySpinnerClasses = (className: string) => className
    .split(/\s+/)
    .filter((name) => name && name !== 'animate-spin' && !legacySizePattern.test(name))
    .join(' ');

export default function BrandLoader({
    size,
    className = '',
    label = 'Loading',
    showLabel = false,
    'aria-label': ariaLabel,
}: BrandLoaderProps) {
    const pixelSize = resolveSize(size ?? readLegacySpinnerSize(className) ?? 'md');
    const logoWidth = Math.max(pixelSize * 1.7, 24);
    const style = {
        '--brand-loader-height': `${pixelSize}px`,
        '--brand-loader-width': `${logoWidth}px`,
    } as CSSProperties;

    return (
        <span
            className={`brand-loader inline-flex min-w-0 items-center justify-center gap-2 align-middle ${removeLegacySpinnerClasses(className)}`.trim()}
            role="status"
            aria-label={ariaLabel || label}
            aria-live="polite"
            aria-busy="true"
            style={style}
        >
            <span className="brand-loader-mark relative inline-grid shrink-0 place-items-center overflow-hidden" aria-hidden="true">
                <span className="brand-loader-glow absolute inset-0" />
                <img src="/logo-icon.png" alt="" className="relative block h-auto w-full object-contain" />
            </span>
            {showLabel ? <span className="brand-loader-label truncate text-sm font-semibold">{label}</span> : null}
        </span>
    );
}
