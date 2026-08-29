"use client";

import { Search, User, Shield, CheckCircle, AlertCircle, Menu, LogOut, Settings, BookOpen } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useManagerVerification } from '../../contexts/ManagerVerificationContext';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import ThemeSwitcher from '../dashboard/ThemeSwitcher';
import Avatar from '../ui/Avatar';
import { getProfileMenuControlLabel } from '@/lib/profileMenuAccessibility';
import { getLoginPath } from '@/lib/authUtils';
import { getManagerSearchDestinations } from '@/lib/managerGlobalSearch';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export const getManagerPageTitle = (pathname: string) => {
    if (pathname === '/manager/dashboard') return 'Dashboard';
    if (pathname.startsWith('/manager/fast-track')) return 'Fast Track';
    if (pathname.startsWith('/manager/dashboard/properties/add')) return 'Add Property';
    if (pathname.startsWith('/manager/dashboard/properties/edit')) return 'Edit Property';
    if (pathname.startsWith('/manager/dashboard/properties')) return 'Properties';
    if (pathname.startsWith('/manager/leads') || pathname.startsWith('/manager/clients')) return 'Leads & Clients';
    if (pathname.startsWith('/manager/applications')) return 'Applications';
    if (pathname.startsWith('/manager/contracts')) return 'Contracts';
    if (pathname.startsWith('/manager/appointments')) return 'Appointments';
    if (pathname.startsWith('/manager/messages')) return 'Messages';
    if (pathname.startsWith('/manager/analytics')) return 'Analytics';
    if (pathname.startsWith('/manager/verification') || pathname.startsWith('/manager/user-verifications')) return 'Verification';
    if (pathname.startsWith('/manager/profile')) return 'Profile';
    if (pathname.startsWith('/manager/docs')) return 'Docs';
    if (pathname.startsWith('/manager/help')) return 'Help & Support';
    if (pathname.startsWith('/manager/case-files')) return 'Case Files';
    return 'Manager';
};

const Header = ({ onMenuToggle }: HeaderProps) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, signOut, getDisplayName, getRole } = useAuth();
    const { notifications: _notifications, unreadCount: _unreadCount } = useNotifications();
    const {
        verificationStatus,
        isLoading: isVerificationLoading,
        isPropertySubmissionReady,
    } = useManagerVerification();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const role = getRole();
    const workspaceRole = role === 'broker' ? 'manager' : role;
    const displayName = getDisplayName();
    const profileMenuLabel = getProfileMenuControlLabel({
        displayName,
        role: workspaceRole || 'manager',
        isOpen: isProfileOpen,
    });

    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLFormElement>(null);
    const searchDestinations = getManagerSearchDestinations(searchQuery);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent | React.KeyboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const normalizedSearchQuery = searchQuery.trim().replace(/\s+/g, ' ');
        if (normalizedSearchQuery) {
            setSearchQuery(normalizedSearchQuery);
            setIsSearchOpen(true);
        }
    };

    const openSearchDestination = (path: string) => {
        setIsSearchOpen(false);
        navigate(path);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate(getLoginPath());
        } catch (_error) {
        }
    };

    const getVerificationBadge = () => {
        if (role !== 'manager' && role !== 'broker') return null;

        if (isVerificationLoading) {
            return <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>;
        }

        switch (verificationStatus) {
            case 'approved':
                if (!isPropertySubmissionReady) {
                    return (
                        <Link to="/manager/profile" className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-colors">
                            <AlertCircle size={12} />
                            <span>Complete Profile</span>
                        </Link>
                    );
                }
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
                            <span className="text-yellow-700 dark:text-yellow-400">Pending Review</span>
                        </div>
                    </div>
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
                    <Link to="/manager/verification" className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full border border-gray-100 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Shield size={12} />
                        <span>Verify Profile</span>
                    </Link>
                );
        }
    };

    return (
        <header className="workspace-chrome sticky top-0 z-40 h-16 border-b border-gray-100 bg-white transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-full items-center justify-between gap-2 px-2.5 sm:gap-3 sm:px-6 lg:px-8">

                {/* Left: Mobile Menu & Search */}
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={onMenuToggle}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
                        aria-label="Open manager navigation"
                    >
                        <Menu size={20} />
                    </button>

                    <h1 className="min-w-0 flex-1 truncate text-base font-bold leading-tight text-gray-900 dark:text-white md:hidden">
                        {getManagerPageTitle(pathname)}
                    </h1>

                    <form ref={searchRef} onSubmit={handleSearch} className="group relative hidden w-full max-w-md items-center md:flex">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            role="combobox"
                            placeholder="Search properties, leads, or tasks..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(Boolean(e.target.value.trim()));
                            }}
                            onFocus={() => setIsSearchOpen(Boolean(searchQuery.trim()))}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsSearchOpen(false);
                                    return;
                                }
                                if (e.key === 'Enter') {
                                    handleSearch(e);
                                }
                            }}
                            aria-expanded={isSearchOpen}
                            aria-controls="manager-global-search-destinations"
                            aria-autocomplete="list"
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                        />
                        {isSearchOpen && searchDestinations.length > 0 && (
                            <div
                                id="manager-global-search-destinations"
                                role="listbox"
                                aria-label="Choose where to search"
                                className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                            >
                                <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                                    Search in
                                </p>
                                {searchDestinations.map((destination) => (
                                    <button
                                        key={destination.key}
                                        type="button"
                                        role="option"
                                        onClick={() => openSearchDestination(destination.path)}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-gray-100 dark:hover:bg-orange-500/10 dark:hover:text-orange-100"
                                    >
                                        <Search className="h-4 w-4 shrink-0 text-orange-500" />
                                        <span className="min-w-0 truncate">{destination.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </form>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 lg:gap-4">
                    {/* Theme Toggle */}
                    {/* Theme Toggle */}
                    <div className="hidden sm:block"><ThemeSwitcher /></div>

                    {/* Verification Badge (Desktop) */}
                    <div className="hidden md:block">
                        {getVerificationBadge()}
                    </div>

                    <Link
                        to="/manager/docs"
                        className="hidden items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 transition-all hover:-translate-y-0.5 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100 dark:hover:bg-orange-500/15 sm:inline-flex"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden md:inline">Docs</span>
                    </Link>

                    {/* Notifications */}
                    <div className="relative">
                        <NotificationDropdown />
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-gray-800"
                            aria-label={profileMenuLabel}
                            aria-haspopup="menu"
                            aria-expanded={isProfileOpen}
                        >
                            <Avatar
                                userId={user?.id}
                                src={user?.avatar || user?.avatar_url}
                                name={displayName}
                                size="sm"
                            />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-[min(14rem,calc(100vw-1.5rem))] rounded-xl border border-gray-100 bg-white py-2 shadow-lg animate-in fade-in slide-in-from-top-2 dark:border-gray-800 dark:bg-gray-900">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
                                </div>
                                <div className="py-1">
                                    <Link
                                        to={`/${workspaceRole}/profile`}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <User size={16} />
                                        Profile
                                    </Link>
                                    <Link
                                        to="/manager/profile"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </Link>
                                </div>
                                <div className="py-1 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

