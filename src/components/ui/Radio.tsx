import React from 'react';

interface RadioOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface RadioProps {
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    name: string;
    label?: string;
    direction?: 'horizontal' | 'vertical';
    className?: string;
}

const Radio: React.FC<RadioProps> = ({
    options,
    value,
    onChange,
    name,
    label,
    direction = 'vertical',
    className = '',
}) => {
    return (
        <fieldset className={className}>
            {label && (
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</legend>
            )}
            <div className={`flex gap-3 ${direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}`}>
                {options.map((opt) => (
                    <label
                        key={opt.value}
                        className={`flex items-start gap-3 cursor-pointer select-none ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="relative flex-shrink-0 mt-0.5">
                            <input
                                type="radio"
                                name={name}
                                value={opt.value}
                                checked={value === opt.value}
                                onChange={() => onChange(opt.value)}
                                disabled={opt.disabled}
                                className="sr-only peer"
                            />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${value === opt.value
                                    ? 'border-indigo-600 bg-white dark:bg-zinc-900'
                                    : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 peer-hover:border-indigo-400'
                                }`}>
                                {value === opt.value && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                )}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                            {opt.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </fieldset>
    );
};

export default Radio;
