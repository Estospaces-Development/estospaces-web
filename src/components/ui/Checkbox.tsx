import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    indeterminate?: boolean;
    id?: string;
    className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    id,
    className = '',
}) => {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            <div className="relative flex-shrink-0 mt-0.5">
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${checked
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-600 peer-hover:border-indigo-400'
                    }`}>
                    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
            </div>
            {(label || description) && (
                <div>
                    {label && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                    )}
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                    )}
                </div>
            )}
        </label>
    );
};

export default Checkbox;
