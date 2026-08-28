"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, HelpCircle, User, BookOpen, Search } from 'lucide-react';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import Avatar from '../ui/Avatar';
import UserAppSearchDialog from './UserAppSearchDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getProfileMenuControlLabel } from '@/lib/profileMenuAccessibility';
import { getLoginPath } from '@/lib/authUtils';

interface UserHeaderProps {
    useSubdomain?: boolean;
}

const UserHeader = ({ useSubdomain: _useSubdomain = false }: UserHeaderProps) => {
    const navigate = useNavigate();
    const { user, signOut, getDisplayName } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [appSearchOpen, setAppSearchOpen] = useState(false);
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
        } catch (_error) {
            setIsSigningOut(false);
        }
    };

    const getLinkPath = (path: string) => path;

    return (
        <>
            <header className="workspace-chrome sticky top-0 z-30 border-b border-orange-500/10 bg-[linear-gradient(135deg,#FF6B35_0%,#F97316_48%,#EA580C_100%)] text-white shadow-[var(--shadow-brand)]">
                <div className="mx-auto grid min-h-16 w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 lg:px-6">
                    <div className="flex shrink-0 items-center">
                        <Link
                            to={getLinkPath('/user/dashboard')}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity duration-200 cursor-pointer no-underline"
                            aria-label="Estospaces dashboard"
                        >
                            <img
                                src="/logo-icon.png"
                                alt=""
                                aria-hidden="true"
                                className="h-8 w-8 shrink-0 object-contain brightness-0 invert sm:h-9 sm:w-9"
                            />
                            <span className="text-lg font-bold text-white transition-colors duration-300 hover:text-white/90 sm:text-xl" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif' }}>
                                Estospaces
                            </span>
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAppSearchOpen(true)}
                        className="justify-self-center inline-flex h-11 min-w-11 max-w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-600 sm:px-4"
                        aria-label="Search Estospaces pages and activities"
                        aria-haspopup="dialog"
                    >
                        <Search size={18} aria-hidden="true" />
                        <span className="hidden truncate md:inline">Search Estospaces</span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Account actions">
                        <NotificationDropdown appearance="brand" />

                        <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-1.5 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-600"
                            aria-label={profileMenuLabel}
                            aria-expanded={userMenuOpen}
                            aria-controls={userMenuOpen ? 'user-profile-menu' : undefined}
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
                                <div
                                    id="user-profile-menu"
                                    className="absolute right-0 z-50 mt-2 w-[min(14rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
                                >
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
                                                <ActionSpinner size={18} className="" />
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
            <UserAppSearchDialog isOpen={appSearchOpen} onClose={() => setAppSearchOpen(false)} />
        </>
    );
};

export default UserHeader;

