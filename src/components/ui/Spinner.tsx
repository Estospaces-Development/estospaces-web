import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
    label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
    xl: 'w-14 h-14 border-4',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', label }) => {
    return (
        <div className={`inline-flex flex-col items-center gap-3 ${className}`} role="status">
            <div
                className={`${sizeClasses[size]} rounded-full border-gray-200 dark:border-zinc-700 border-t-indigo-600 dark:border-t-indigo-400 animate-spin`}
            />
            {label && <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>}
            <span className="sr-only">{label || 'Loading...'}</span>
        </div>
    );
};

export default Spinner;
