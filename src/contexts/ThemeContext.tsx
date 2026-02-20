"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const pathname = useLocation().pathname;
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load theme from localStorage
        const stored = localStorage.getItem('estospaces-theme');
        if (stored === 'dark' || stored === 'light') {
            setThemeState(stored);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setThemeState('dark');
        }
    }, []);

    // Apply theme to DOM
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        // Force light mode on user routes
        const isUserRoute = pathname?.startsWith('/user');
        const activeTheme = isUserRoute ? 'light' : theme;

        // Save theme preference to localStorage (only if we are using the preference)
        if (!isUserRoute) {
            localStorage.setItem('estospaces-theme', theme);
        }

        // Apply theme class to document root
        root.setAttribute('data-theme', activeTheme);

        // Apply theme-specific classes
        root.classList.remove('theme-light', 'theme-dark', 'dark');
        root.classList.add(`theme-${activeTheme}`);

        // Add dark class for Tailwind dark mode when theme is dark
        if (activeTheme === 'dark') {
            root.classList.add('dark');
        }

        // Also update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', activeTheme === 'dark' ? '#1f2937' : '#ffffff');
        }
    }, [theme, mounted, pathname]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    // Avoid hydration mismatch logic moved to useEffect/rendering
    // We must always render the Provider so hooks don't fail during SSR
    // if (!mounted) {
    //     return <>{children}</>;
    // }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

