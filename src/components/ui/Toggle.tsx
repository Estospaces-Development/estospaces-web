"use client";

import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${checked
                ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
                : 'bg-gray-200 dark:bg-gray-700'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

export default Toggle;
