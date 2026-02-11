"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, ChevronDown, Loader2, LogOut, Settings, HelpCircle } from 'lucide-react';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import { useAuth } from '@/contexts/AuthContext';
// import logoIcon from '../../assets/logo-icon.png'; // Need to handle image import or use next/image

const UserHeader = () => {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    // const logoRef = useRef(null);

    // Get user display name and email
    const displayName = user?.name || (user?.email?.split('@')[0] || 'User');
    const userEmail = user?.email || '';

    const handleSignOut = async () => {
        setIsSigningOut(true);
        setUserMenuOpen(false);

        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            setIsSigningOut(false);
        }
    };

    return (
        <header className="h-16 gradient-header sticky top-0 z-30 shadow-lg shadow-primary/15 border-b border-primary/10 bg-black text-white">
            {/* Added bg-black text-white to mimic gradient-header roughly until refined */}
            <div className="h-full px-4 lg:px-6 flex items-center justify-between">
                {/* Left side - Logo - Clickable to go to dashboard */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/user/dashboard"
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity duration-200 cursor-pointer no-underline"
                        aria-label="Navigate to dashboard"
                    >
                        {/* 
            <img
              ref={logoRef}
              src={logoIcon.src}
              alt="Estospaces Logo"
              className="h-8 w-auto object-contain transition-all duration-300"
              style={{
                filter: 'brightness(0) invert(1)',
                WebkitFilter: 'brightness(0) invert(1)'
              }}
            /> 
            */}
                        <span className="text-xl font-bold text-white dark:text-orange-500 transition-colors duration-300 hover:text-white/90" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            Estospaces
                        </span>
                    </Link>

                </div>

                {/* Right side - Notifications, User */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* User menu */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div className="w-8 h-8 bg-white/20 dark:bg-gray-700 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 dark:border-gray-600">
                                <User size={18} className="text-white dark:text-gray-200" />
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-white dark:text-gray-200 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* User dropdown */}
                        {userMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setUserMenuOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                                    {/* User Info */}
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="p-2">
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                router.push('/user/dashboard/settings');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <Settings size={18} className="text-gray-400" />
                                            Account Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                router.push('/user/dashboard/help');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            <HelpCircle size={18} className="text-gray-400" />
                                            Help & Support
                                        </button>
                                    </div>

                                    {/* Sign Out */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                        <button
                                            onClick={handleSignOut}
                                            disabled={isSigningOut}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
