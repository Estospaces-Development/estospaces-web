"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
    label: string;
    value: string;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
}

interface DropdownProps {
    trigger?: React.ReactNode;
    items: DropdownItem[];
    onSelect: (value: string) => void;
    label?: string;
    placeholder?: string;
    align?: 'left' | 'right';
    className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
    trigger,
    items,
    onSelect,
    label,
    placeholder = 'Select...',
    align = 'left',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item: DropdownItem) => {
        if (item.disabled) return;
        onSelect(item.value);
        setIsOpen(false);
    };

    return (
        <div ref={ref} className={`relative inline-block ${className}`}>
            {/* Trigger */}
            {trigger ? (
                <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-zinc-600 transition-colors"
                >
                    {label || placeholder}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {/* Menu */}
            {isOpen && (
                <div
                    className={`absolute z-50 mt-1 min-w-[180px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150 ${align === 'right' ? 'right-0' : 'left-0'
                        }`}
                >
                    {items.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => handleSelect(item)}
                            disabled={item.disabled}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${item.disabled
                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    : item.danger
                                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                }`}
                        >
                            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
