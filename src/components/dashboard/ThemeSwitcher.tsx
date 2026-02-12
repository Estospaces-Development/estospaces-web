'use client';

import { useState } from 'react';
import { Sun, Moon, ChevronDown, LucideIcon } from 'lucide-react';
import { useTheme, Theme } from '@/contexts/ThemeContext';

interface ThemeOption {
    id: Theme;
    label: string;
    icon: LucideIcon;
}

const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const themes: ThemeOption[] = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Deep Dark', icon: Moon },
    ];

    const currentTheme = themes.find((t) => t.id === theme) || themes[0];
    const CurrentIcon = currentTheme.icon;

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-label="Change theme"
            >
                <CurrentIcon size={20} className="text-gray-700 dark:text-gray-200" />
                <ChevronDown
                    size={16}
                    className={`text-gray-700 dark:text-gray-200 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {themes.map((themeOption) => {
                            const Icon = themeOption.icon;
                            const isActive = theme === themeOption.id;

                            return (
                                <button
                                    key={themeOption.id}
                                    onClick={() => handleThemeChange(themeOption.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'} />
                                    <span className="font-medium">{themeOption.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default ThemeSwitcher;
