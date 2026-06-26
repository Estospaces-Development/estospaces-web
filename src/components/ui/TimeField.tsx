'use client';

import React, { useCallback, useRef } from 'react';
import { Clock3 } from 'lucide-react';

type TimeFieldSize = 'sm' | 'md';

interface TimeFieldProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    size?: TimeFieldSize;
    min?: string;
    max?: string;
    step?: number;
    name?: string;
    ariaDescribedBy?: string;
}

export default function TimeField({
    value,
    onChange,
    disabled = false,
    ariaLabel = 'Select time',
    placeholder = 'Select time',
    className = '',
    inputClassName = '',
    size = 'md',
    min,
    max,
    step,
    name,
    ariaDescribedBy,
}: TimeFieldProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const openPicker = useCallback(() => {
        if (disabled) {
            return;
        }

        const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
        input?.focus();
        input?.showPicker?.();
    }, [disabled]);

    const commitTimeValue = useCallback((event: React.FormEvent<HTMLInputElement>) => {
        onChange(event.currentTarget.value);
    }, [onChange]);

    const sizeClass = size === 'sm'
        ? 'min-h-[44px] rounded-xl px-3 py-2 text-sm'
        : 'min-h-[52px] rounded-2xl px-4 py-3 text-sm';

    const iconSizeClass = size === 'sm'
        ? 'h-8 w-8 rounded-xl'
        : 'h-9 w-9 rounded-2xl';

    const displayValue = value ? value.slice(0, 5) : placeholder;
    const displayTextClass = value
        ? 'font-medium text-gray-900 dark:text-white'
        : 'text-gray-400 dark:text-gray-500';

    return (
        <div className={`relative ${className}`.trim()} data-time-field="true">
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <div
                className={[
                    'flex w-full items-center gap-3 border border-gray-200 bg-white text-left text-gray-900 shadow-sm outline-none transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white',
                    sizeClass,
                    inputClassName,
                ].join(' ')}
            >
                <span
                    data-time-field-icon="true"
                    className={`inline-flex shrink-0 items-center justify-center border border-orange-200 bg-orange-50 text-orange-600 shadow-sm transition dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300 ${iconSizeClass}`.trim()}
                >
                    <Clock3 size={size === 'sm' ? 16 : 18} />
                </span>
                <span className={`pointer-events-none select-none [font-variant-numeric:tabular-nums] ${displayTextClass}`.trim()}>
                    {displayValue}
                </span>
            </div>
            <input
                ref={inputRef}
                type="time"
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                onClick={openPicker}
                onInput={commitTimeValue}
                onChange={commitTimeValue}
                data-time-field-input="true"
                className="modern-time-input absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
        </div>
    );
}
