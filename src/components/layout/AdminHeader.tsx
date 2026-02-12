"use client";

import { Bell, Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface AdminHeaderProps {
    onMenuToggle?: () => void;
}

const AdminHeader = ({ onMenuToggle }: AdminHeaderProps) => {
    const pathname = usePathname();

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
        <header className="bg-white shadow-sm sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onMenuToggle && (
                        <button onClick={onMenuToggle} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <Menu size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-semibold text-gray-800">{getPageTitle()}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                        />
                    </div>
                    <button className="p-2 relative text-gray-400 hover:text-indigo-600 transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                        A
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
