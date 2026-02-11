"use client";

import { Search, User, Palette, Shield, CheckCircle, Clock, AlertCircle, X, Menu, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useManagerVerification } from '../../contexts/ManagerVerificationContext';
import NotificationDropdown from '../dashboard/NotificationDropdown';

interface HeaderProps {
    onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, signOut, getDisplayName, getRole } = useAuth();
    const { notifications, unreadCount } = useNotifications();
    const { verificationStatus, isLoading: isVerificationLoading } = useManagerVerification();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Implement global search or redirect to search page
            console.log('Searching for:', searchQuery);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const getVerificationBadge = () => {
        if (getRole() !== 'manager') return null;

        if (isVerificationLoading) {
            return <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>;
        }

        switch (verificationStatus) {
            case 'approved':
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full border border-green-200 dark:border-green-800">
                        <CheckCircle size={12} />
                        <span>Verified</span>
                    </div>
                );
            case 'submitted':
            case 'under_review':
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full border border-yellow-200 dark:border-yellow-800">
                        {/* Verification Status (Manager Only) */}
                        <div className="hidden sm:block">
                            {getVerificationBadge()}
                        </div></div>
                );
            case 'rejected':
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">
                        <AlertCircle size={12} />
                        <span>Action Required</span>
                    </div>
                );
            default:
                return (
                    <Link href="/manager/verification" className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Shield size={12} />
                        <span>Verify Profile</span>
                    </Link>
                );
        }
    };

    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 sticky top-0 z-40 transition-colors duration-300">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">

                {/* Left: Mobile Menu & Search */}
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={onMenuToggle}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors lg:hidden"
                        aria-label="Toggle menu"
                    >
                        <Menu size={20} />
                    </button>

                    <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-md w-full relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search properties, leads, or tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                        />
                    </form>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center gap-2 sm:gap-4">
                </div>
            </div>
        </header>
    );
};

export default Header;
