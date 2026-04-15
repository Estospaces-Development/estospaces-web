'use client';

import React from 'react';

type TimeFieldSize = 'sm' | 'md';

interface TimeFieldProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
    inputClassName?: string;
    size?: TimeFieldSize;
    min?: string;
    max?: string;
    step?: number;
    name?: string;
}

export default function TimeField({
    value,
    onChange,
    disabled = false,
    ariaLabel = 'Select time',
    className = '',
    inputClassName = '',
    size = 'md',
    min,
    max,
    step,
    name,
}: TimeFieldProps) {
    const sizeClass = size === 'sm'
        ? 'min-h-[44px] rounded-xl px-3 py-2 text-sm'
        : 'min-h-[52px] rounded-2xl px-4 py-3 text-sm';

    return (
        <div className={`relative ${className}`.trim()}>
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <input
                type="time"
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                aria-label={ariaLabel}
                onChange={(event) => onChange(event.target.value)}
                className={[
                    'modern-time-input w-full border border-gray-200 bg-white text-gray-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white',
                    sizeClass,
                    inputClassName,
                ].join(' ')}
            />
        </div>
    );
}
