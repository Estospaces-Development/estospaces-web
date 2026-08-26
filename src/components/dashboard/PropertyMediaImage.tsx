import { ImageOff } from 'lucide-react';
import type { ImgHTMLAttributes } from 'react';
import { useState } from 'react';

interface PropertyMediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
}

const PropertyMediaImage = ({ src, alt = '', className, onError, ...imageProps }: PropertyMediaImageProps) => {
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const normalizedSource = String(src || '').trim();
    const unavailable = !normalizedSource || failedSource === normalizedSource;

    if (unavailable) {
        return (
            <div
                role="img"
                aria-label={`${alt || 'Property'} media unavailable`}
                className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 px-6 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-300 ${className || ''}`}
            >
                <ImageOff size={28} aria-hidden="true" />
                <span className="text-sm font-medium">Property media unavailable</span>
            </div>
        );
    }

    return (
        <img
            {...imageProps}
            src={normalizedSource}
            alt={alt}
            className={className}
            onError={(event) => {
                setFailedSource(normalizedSource);
                onError?.(event);
            }}
        />
    );
};

export default PropertyMediaImage;
