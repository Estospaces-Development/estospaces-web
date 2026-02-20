'use client';

import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Home, Search, ChevronDown, LucideIcon } from 'lucide-react';

interface DropdownOption {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface PropertyFilterTabsProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    loading?: boolean;
}

const PropertyFilterTabs = ({ activeTab = 'all', onTabChange, loading = false }: PropertyFilterTabsProps) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const dropdownOptions: DropdownOption[] = [
        { id: 'buy', label: 'Buy', icon: ShoppingBag },
        { id: 'rent', label: 'Rent', icon: Home },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBrowseClick = () => setIsDropdownOpen(!isDropdownOpen);

    const handleResetToAll = () => {
        onTabChange?.('all');
        setIsDropdownOpen(false);
    };

    const handleDropdownOptionClick = (optionId: string) => {
        onTabChange?.(optionId);
        setIsDropdownOpen(false);
    };

    const getActiveIcon = (): LucideIcon => {
        if (activeTab === 'buy') return ShoppingBag;
        if (activeTab === 'rent') return Home;
        return Search;
    };

    const ActiveIcon = getActiveIcon();
    const isButtonActive = activeTab === 'all' || activeTab === 'buy' || activeTab === 'rent';

    return (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={handleBrowseClick}
                    disabled={loading}
                    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 border-transparent ${isButtonActive
                            ? 'text-orange-600 dark:text-orange-400 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900`}
                    aria-label="Browse Properties"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                >
                    <ActiveIcon size={18} className={`flex-shrink-0 ${isButtonActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span>Browse Properties</span>
                    <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} ${isButtonActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {activeTab !== 'all' && (
                            <button onClick={handleResetToAll} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors border-b border-gray-200 dark:border-gray-700">
                                <Search size={18} className="flex-shrink-0" />
                                <span>All Properties</span>
                            </button>
                        )}
                        {dropdownOptions.map((option) => {
                            const OptionIcon = option.icon;
                            const isOptionActive = activeTab === option.id;
                            return (
                                <button key={option.id} onClick={() => handleDropdownOptionClick(option.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isOptionActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400'}`}>
                                    <OptionIcon size={18} className="flex-shrink-0" />
                                    <span>{option.label}</span>
                                    {isOptionActive && <span className="ml-auto text-orange-600 dark:text-orange-400">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyFilterTabs;
