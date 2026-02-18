"use client";

import { Bell, Search, Menu, Globe } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import ThemeSwitcher from '../dashboard/ThemeSwitcher';

interface AdminHeaderProps {
    onMenuToggle?: () => void;
}

const AdminHeader = ({ onMenuToggle }: AdminHeaderProps) => {
    const location = useLocation();
    const pathname = location.pathname;

    const getPageTitle = () => {
        if (pathname?.includes('/dashboard')) return 'Dashboard';
        if (pathname?.includes('/users')) return 'User Management';
        if (pathname?.includes('/verifications')) return 'Verifications';
        if (pathname?.includes('/properties')) return 'Properties';
        if (pathname?.includes('/settings')) return 'System Settings';
        if (pathname?.includes('/chat')) return 'Support Chat';
        return 'Admin Panel';
    };

    return (
        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onMenuToggle && (
                        <button onClick={onMenuToggle} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <Menu size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">{getPageTitle()}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64 transition-all"
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block"></div>

                    <Link
                        to="/"
                        target="_blank"
                        className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                        title="Visit Landing Page"
                    >
                        <Globe size={20} />
                    </Link>

                    <ThemeSwitcher />

                    <button className="p-2 relative text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    </button>

                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                        A
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;

