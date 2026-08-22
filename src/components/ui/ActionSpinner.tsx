import type { CSSProperties } from 'react';

type ActionSpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface ActionSpinnerProps {
    size?: ActionSpinnerSize | number | string;
    className?: string;
    label?: string;
    'aria-hidden'?: boolean;
}

const sizePixels: Record<ActionSpinnerSize, number> = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
};

const resolveSize = (size: ActionSpinnerProps['size']) => {
    if (typeof size === 'number') return size;
    if (typeof size === 'string' && size in sizePixels) return sizePixels[size as ActionSpinnerSize];
    const parsedSize = Number.parseFloat(size || '');
    return Number.isFinite(parsedSize) ? parsedSize : undefined;
};

export default function ActionSpinner({
    size,
    className = '',
    label = 'Loading',
    'aria-hidden': ariaHidden = false,
}: ActionSpinnerProps) {
    const pixelSize = resolveSize(size);
    const style = pixelSize
        ? ({ width: `${pixelSize}px`, height: `${pixelSize}px` } as CSSProperties)
        : undefined;

    return (
        <span
            className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent align-middle animate-spin motion-reduce:animate-none ${className}`.trim()}
            role={ariaHidden ? undefined : 'status'}
            aria-label={ariaHidden ? undefined : label}
            aria-hidden={ariaHidden || undefined}
            style={style}
        />
    );
}
