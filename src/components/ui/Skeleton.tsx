import React from 'react';

interface SkeletonProps {
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none';
    className?: string;
}

const roundedClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
};

const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height = '1rem',
    rounded = 'md',
    className = '',
}) => {
    return (
        <div
            className={`bg-gray-200 dark:bg-zinc-800 animate-pulse ${roundedClasses[rounded]} ${className}`}
            style={{ width: width || '100%', height }}
            aria-hidden="true"
        />
    );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className = '',
}) => {
    return (
        <div className={`space-y-2.5 ${className}`} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="bg-gray-200 dark:bg-zinc-800 animate-pulse rounded h-3"
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5 ${className}`} aria-hidden="true">
            <Skeleton height="160px" rounded="lg" className="mb-4" />
            <Skeleton height="1.25rem" width="75%" className="mb-2" />
            <Skeleton height="0.875rem" width="50%" className="mb-4" />
            <div className="flex gap-2">
                <Skeleton height="2rem" width="4rem" rounded="full" />
                <Skeleton height="2rem" width="4rem" rounded="full" />
            </div>
        </div>
    );
};

export default Skeleton;
