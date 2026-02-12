import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    id?: string;
    className?: string;
}

const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    size = 'md',
    id,
    className = '',
}) => {
    const trackSize = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6';
    const thumbSize = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
    const thumbTranslate = size === 'sm' ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');

    return (
        <label
            htmlFor={id}
            className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            <button
                type="button"
                role="switch"
                id={id}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`${trackSize} relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-600'
                    }`}
            >
                <span
                    className={`${thumbSize} inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ${thumbTranslate}`}
                />
            </button>
            {(label || description) && (
                <div>
                    {label && <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>}
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                    )}
                </div>
            )}
        </label>
    );
};

export default Switch;
