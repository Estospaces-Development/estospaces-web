"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, LogOut, Settings, HelpCircle, User, BookOpen } from 'lucide-react';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import SearchBar from '../ui/SearchBar';
import Avatar from '../ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getProfileMenuControlLabel } from '@/lib/profileMenuAccessibility';
import { getLoginPath } from '@/lib/authUtils';

interface UserHeaderProps {
    useSubdomain?: boolean;
}

const UserHeader = ({ useSubdomain = false }: UserHeaderProps) => {
    const navigate = useNavigate();
    const { user, signOut, getDisplayName } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Get user display name and email
    const displayName = getDisplayName();
    const userEmail = user?.email || '';
    const profileMenuLabel = getProfileMenuControlLabel({
        displayName,
        role: user?.role || 'user',
        isOpen: userMenuOpen,
    });

    const handleSignOut = async () => {
        setIsSigningOut(true);
        setUserMenuOpen(false);

        try {
            await signOut();
            navigate(getLoginPath());
        } catch (error) {
            setIsSigningOut(false);
        }
    };

    const getLinkPath = (path: string) => path;

    return (
        <header className="sticky top-0 z-30 h-16 border-b border-orange-500/10 bg-[linear-gradient(135deg,#FF6B35_0%,#F97316_48%,#EA580C_100%)] text-white shadow-[var(--shadow-brand)]">
            <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
                <div className="flex shrink-0 items-center">
                    <Link
                        to={getLinkPath('/user/dashboard')}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity duration-200 cursor-pointer no-underline"
                        aria-label="Navigate to dashboard"
                    >
                        <span className="text-lg font-bold text-white transition-colors duration-300 hover:text-white/90 sm:text-xl" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif' }}>
                            Estospaces
                        </span>
                    </Link>

                </div>

                {/* Center - Global Search */}
                <div className="mx-2 min-w-0 flex-1 sm:mx-4 md:mx-8 md:max-w-xl">
                    <SearchBar variant="compact" searchPath={getLinkPath('/user/search')} />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
                    <NotificationDropdown />

                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-white/10 sm:p-2"
                            aria-label={profileMenuLabel}
                            aria-haspopup="menu"
                            aria-expanded={userMenuOpen}
                        >
                            <Avatar
                                userId={user?.id}
                                src={user?.avatar || user?.avatar_url}
                                name={displayName}
                                alt={`${displayName} avatar`}
                                size="sm"
                            />
                            <ChevronDown
                                size={16}
                                className={`hidden text-white transition-transform dark:text-gray-200 sm:block ${userMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {userMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setUserMenuOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
                                    </div>

                                    <div className="p-2">
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                navigate(getLinkPath('/user/dashboard/profile'));
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <User size={18} className="text-gray-400" />
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                navigate(getLinkPath('/user/virtual-storage'));
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <BookOpen size={18} className="text-gray-400" />
                                            Virtual Storage
                                        </button>
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                navigate(getLinkPath('/user/dashboard/settings'));
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <Settings size={18} className="text-gray-400" />
                                            Account Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                navigate(getLinkPath('/user/dashboard/help'));
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <HelpCircle size={18} className="text-gray-400" />
                                            Help & Support
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                                        <button
                                            onClick={handleSignOut}
                                            disabled={isSigningOut}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSigningOut ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <LogOut size={18} />
                                            )}
                                            {isSigningOut ? 'Signing Out...' : 'Log Out'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default UserHeader;

