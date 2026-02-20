'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberInputProps {
    value: number | string;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    error?: string;
    label?: string;
    id?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    placeholder,
    className = '',
    disabled = false,
    error,
    label,
    id,
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const numValue = typeof value === 'string' ? parseFloat(value) || (min ?? 0) : value;

    const handleIncrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const newValue = numValue + step;
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        } else if (max !== undefined) {
            onChange(max);
        }
    };

    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const newValue = numValue - step;
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        } else if (min !== undefined) {
            onChange(min);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (inputValue === '' || inputValue === '-') {
            onChange(min ?? 0);
            return;
        }
        const parsedValue = parseFloat(inputValue);
        if (!isNaN(parsedValue)) {
            let finalValue = parsedValue;
            if (min !== undefined && parsedValue < min) finalValue = min;
            if (max !== undefined && parsedValue > max) finalValue = max;
            onChange(finalValue);
        }
    };

    const canIncrement = max === undefined || numValue + step <= max;
    const canDecrement = min === undefined || numValue - step >= min;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                </label>
            )}
            <div className={`relative flex items-center ${isFocused ? 'ring-2 ring-primary ring-offset-1 rounded-lg' : ''}`}>
                <input
                    id={id}
                    type="number"
                    value={value || ''}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    min={min}
                    max={max}
                    step={step}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''} ${className}`}
                />
                <div className="absolute right-1 flex flex-col h-full justify-center py-1 gap-px">
                    <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={disabled || !canIncrement}
                        className={`p-0.5 rounded-t transition-all flex items-center justify-center ${disabled || !canIncrement
                                ? 'opacity-30 cursor-not-allowed'
                                : 'hover:bg-primary/10 active:bg-primary/20 cursor-pointer'
                            }`}
                        aria-label="Increment"
                        tabIndex={-1}
                    >
                        <ChevronUp className={`w-3.5 h-3.5 transition-colors ${disabled || !canIncrement ? 'text-gray-400 dark:text-gray-600' : 'text-primary'
                            }`} />
                    </button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700" />
                    <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={disabled || !canDecrement}
                        className={`p-0.5 rounded-b transition-all flex items-center justify-center ${disabled || !canDecrement
                                ? 'opacity-30 cursor-not-allowed'
                                : 'hover:bg-primary/10 active:bg-primary/20 cursor-pointer'
                            }`}
                        aria-label="Decrement"
                        tabIndex={-1}
                    >
                        <ChevronDown className={`w-3.5 h-3.5 transition-colors ${disabled || !canDecrement ? 'text-gray-400 dark:text-gray-600' : 'text-primary'
                            }`} />
                    </button>
                </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default NumberInput;
