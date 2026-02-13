'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon size={20} className="text-gray-700 dark:text-gray-200" />
            ) : (
                <Sun size={20} className="text-gray-700 dark:text-gray-200" />
            )}
        </button>
    );
};

export default ThemeSwitcher;
