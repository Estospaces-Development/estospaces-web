'use client';

import React from 'react';
import { Clock3 } from 'lucide-react';

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
        ? 'min-h-[44px] rounded-xl pl-12 pr-3 py-2 text-sm'
        : 'min-h-[52px] rounded-2xl pl-14 pr-4 py-3 text-sm';

    const iconSizeClass = size === 'sm'
        ? 'h-8 w-8 rounded-xl'
        : 'h-9 w-9 rounded-2xl';

    return (
        <div className={`relative ${className}`.trim()} data-time-field="true">
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <span
                data-time-field-icon="true"
                className={`pointer-events-none absolute left-3 top-1/2 z-[1] inline-flex -translate-y-1/2 items-center justify-center border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300 ${iconSizeClass}`.trim()}
            >
                <Clock3 size={size === 'sm' ? 16 : 18} />
            </span>
            <input
                type="time"
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                aria-label={ariaLabel}
                onChange={(event) => onChange(event.target.value)}
                data-time-field-input="true"
                className={[
                    'modern-time-input w-full border border-gray-200 bg-white text-gray-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white',
                    sizeClass,
                    inputClassName,
                ].join(' ')}
            />
        </div>
    );
}
