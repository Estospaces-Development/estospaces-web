import type { CSSProperties } from 'react';

interface BrandLoadingIndicatorProps {
    className?: string;
    style?: CSSProperties;
    showLogo?: boolean;
}

export default function BrandLoadingIndicator({
    className = '',
    style,
    showLogo = true,
}: BrandLoadingIndicatorProps) {
    return (
        <span
            className={`brand-loading-spinner relative grid shrink-0 place-items-center ${className}`.trim()}
            aria-hidden="true"
            style={style}
        >
            <span className="brand-loading-spinner-track absolute inset-0 rounded-full" />
            <span className="brand-loading-spinner-ring absolute inset-0 rounded-full" />
            {showLogo ? (
                <span className="brand-loading-logo relative z-10 grid size-[78%] place-items-center rounded-full">
                    <img
                        src="/logo-icon.png"
                        alt=""
                        width={104}
                        height={55}
                        className="h-auto w-[74%] object-contain"
                    />
                </span>
            ) : null}
        </span>
    );
}
