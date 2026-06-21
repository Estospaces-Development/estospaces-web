"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Menu, Globe, X } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../dashboard/ThemeSwitcher';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import { getProfileLinkLabel } from '@/lib/profileMenuAccessibility';

const ADMIN_PAGES = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Notifications', path: '/admin/notifications' },
    { label: 'User Management', path: '/admin/users' },
    { label: 'Verifications', path: '/admin/verifications' },
    { label: 'Properties', path: '/admin/properties' },
    { label: 'Fast Track', path: '/admin/fast-track' },
    { label: 'Help & Support', path: '/admin/help' },
    { label: 'Reviews', path: '/admin/reviews' },
    { label: 'Observational Research', path: '/admin/research' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Profile', path: '/admin/profile' },
    { label: 'System Settings', path: '/admin/settings' },
];

const normalizeCommandSearch = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

interface AdminHeaderProps {
    onMenuToggle?: () => void;
}

const AdminHeader = ({ onMenuToggle }: AdminHeaderProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const pathname = location.pathname;
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const getPageTitle = () => {
        if (pathname?.includes('/dashboard')) return 'Dashboard';
        if (pathname?.includes('/analytics')) return 'Analytics';
        if (pathname?.includes('/fast-track')) return 'Fast Track';
        if (pathname?.includes('/notifications')) return 'Notifications';
        if (pathname?.includes('/users')) return 'User Management';
        if (pathname?.includes('/verifications')) return 'Verifications';
        if (pathname?.includes('/properties')) return 'Properties';
        if (pathname?.includes('/chat') || pathname?.includes('/help')) return 'Help & Support';
        if (pathname?.includes('/reviews')) return 'Reviews';
        if (pathname?.includes('/research')) return 'Observational Research';
        if (pathname?.includes('/profile')) return 'Admin Profile';
        if (pathname?.includes('/settings')) return 'System Settings';
        return 'Admin Panel';
    };

    const normalizedSearchQuery = normalizeCommandSearch(searchQuery);
    const visibleSearchQuery = searchQuery.trim().replace(/\s+/g, ' ');

    const filteredPages = useMemo(() => {
        if (!normalizedSearchQuery) return ADMIN_PAGES;
        const q = normalizedSearchQuery;
        return ADMIN_PAGES.filter(p => p.label.toLowerCase().includes(q));
    }, [normalizedSearchQuery]);
    const showFastTrackSearchAction = normalizedSearchQuery.length > 0 && filteredPages.length === 0;
    const adminDisplayName = user?.name || user?.email || 'Admin';
    const isDashboard = pathname === '/admin/dashboard';

    const handleNavigate = useCallback((path: string) => {
        setSearchOpen(false);
        setSearchQuery('');
        navigate(path);
    }, [navigate]);

    useEffect(() => {
        setSelectedIdx(0);
    }, [searchQuery]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (searchOpen) inputRef.current?.focus();
    }, [searchOpen]);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, Math.max(filteredPages.length - 1, 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredPages[selectedIdx]) {
            handleNavigate(filteredPages[selectedIdx].path);
        } else if (e.key === 'Enter' && showFastTrackSearchAction) {
            handleNavigate(`/admin/fast-track?search=${encodeURIComponent(normalizedSearchQuery)}`);
        }
    };

    return (
        <>
            <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        {onMenuToggle && (
                            <button onClick={onMenuToggle} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden" aria-label="Open admin sidebar">
                                <Menu size={20} />
                            </button>
                        )}
                        {!isDashboard && (
                            <button
                                type="button"
                                onClick={() => navigate('/admin/dashboard')}
                                aria-label="Back to admin dashboard"
                                title="Back to dashboard"
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-orange-900 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden xl:inline">Dashboard</span>
                            </button>
                        )}
                        <h1 className="min-w-0 break-words text-lg font-bold leading-tight tracking-tight text-gray-800 dark:text-white sm:text-2xl">{getPageTitle()}</h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="hidden md:flex items-center gap-2 pl-3 pr-4 py-2 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all w-64 text-sm"
                            aria-label="Open admin command palette"
                        >
                            <Search size={16} />
                            <span>Search...</span>
                            <kbd className="ml-auto text-[10px] font-bold bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
                        </button>

                        <div className="mx-1 hidden h-8 w-px bg-gray-200 dark:bg-gray-700 sm:block"></div>

                        <Link
                            to="/"
                            target="_blank"
                            className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                            title="Visit Landing Page"
                            aria-label="Open landing page"
                        >
                            <Globe size={20} />
                        </Link>

                        <ThemeSwitcher />

                        <NotificationDropdown />

                        <Link
                            to="/admin/profile"
                            className="rounded-full hover:ring-2 hover:ring-orange-500/30 transition-all"
                            title="Admin Profile"
                            aria-label={getProfileLinkLabel({ displayName: adminDisplayName, role: 'admin' })}
                        >
                            <Avatar
                                userId={user?.id}
                                src={user?.avatar || user?.avatar_url}
                                name={adminDisplayName}
                                size="md"
                            />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Command Palette */}
            {searchOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} />
                    <div className="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <Search size={20} className="text-gray-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Navigate to..."
                                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder-gray-400 dark:text-white"
                            />
                            <button
                                type="button"
                                aria-label="Close admin command palette"
                                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:text-gray-300"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="h-80 overflow-y-auto p-2">
                            {filteredPages.length > 0 ? filteredPages.map((page, idx) => (
                                <button
                                    key={page.path}
                                    onClick={() => handleNavigate(page.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                                        idx === selectedIdx
                                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {page.label}
                                    {pathname === page.path && (
                                        <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current</span>
                                    )}
                                </button>
                            )) : showFastTrackSearchAction ? (
                                <button
                                    onClick={() => handleNavigate(`/admin/fast-track?search=${encodeURIComponent(normalizedSearchQuery)}`)}
                                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <span className="block font-semibold text-gray-900 dark:text-white">Search fast-track cases</span>
                                    <span className="mt-1 block break-words text-xs text-gray-500 [overflow-wrap:anywhere] dark:text-gray-400">
                                        No admin page matched "{visibleSearchQuery}". Search case, application, lead, or property IDs instead.
                                    </span>
                                </button>
                            ) : (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">No matching admin pages</p>
                            )}
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 flex items-center gap-4">
                            <span>Arrow keys to navigate</span>
                            <span>Enter to select</span>
                            <span>Esc to close</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminHeader;
