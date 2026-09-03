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

export const getAdminPageTitles = (pathname: string) => {
    let full = 'Admin Panel';
    if (pathname.includes('/dashboard')) full = 'Dashboard';
    else if (pathname.includes('/analytics')) full = 'Analytics';
    else if (pathname.includes('/fast-track')) full = 'Fast Track';
    else if (pathname.includes('/notifications')) full = 'Notifications';
    else if (pathname.includes('/users')) full = 'User Management';
    else if (pathname.includes('/verifications')) full = 'Verifications';
    else if (pathname.includes('/properties')) full = 'Properties';
    else if (pathname.includes('/chat') || pathname.includes('/help')) full = 'Help & Support';
    else if (pathname.includes('/reviews')) full = 'Reviews';
    else if (pathname.includes('/research')) full = 'Observational Research';
    else if (pathname.includes('/profile')) full = 'Admin Profile';
    else if (pathname.includes('/settings')) full = 'System Settings';

    const compact = full === 'Observational Research'
        ? 'Research'
        : full === 'User Management'
            ? 'Users'
            : full === 'Admin Profile'
                ? 'Profile'
                : full === 'System Settings'
                    ? 'Settings'
                    : full;

    return { full, compact };
};

const AdminHeader = ({ onMenuToggle }: AdminHeaderProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const pathname = location.pathname;
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const pageTitles = getAdminPageTitles(pathname);

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
            <header className="workspace-chrome bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="flex min-h-16 items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-6 sm:py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                        {onMenuToggle && (
                            <button onClick={onMenuToggle} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-gray-800 lg:hidden" aria-label="Open admin sidebar">
                                <Menu size={20} />
                            </button>
                        )}
                        {!isDashboard && (
                            <button
                                type="button"
                                onClick={() => navigate('/admin/dashboard')}
                                aria-label="Back to admin dashboard"
                                title="Back to dashboard"
                                className="hidden h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-orange-900 dark:hover:bg-orange-900/20 dark:hover:text-orange-300 sm:inline-flex"
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden xl:inline">Dashboard</span>
                            </button>
                        )}
                        <h1 className="min-w-0 flex-1 truncate text-base font-bold leading-tight tracking-tight text-gray-800 dark:text-white sm:text-2xl" title={pageTitles.full}>
                            <span className="sm:hidden">{pageTitles.compact}</span>
                            <span className="hidden sm:inline">{pageTitles.full}</span>
                        </h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 lg:gap-4">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
                            aria-label="Open admin search"
                        >
                            <Search size={20} />
                        </button>
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="hidden min-h-11 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-2 pl-3 pr-4 text-sm text-gray-500 transition-all hover:border-orange-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-orange-700 md:flex md:w-64"
                            aria-label="Open admin command palette"
                        >
                            <Search size={16} />
                            <span>Search...</span>
                            <kbd className="ml-auto text-[10px] font-bold bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
                        </button>

                        <div className="mx-1 hidden h-8 w-px bg-gray-200 dark:bg-gray-700 lg:block"></div>

                        <Link
                            to="/"
                            target="_blank"
                            className="hidden h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-gray-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 sm:inline-flex"
                            title="Visit Landing Page"
                            aria-label="Open landing page"
                        >
                            <Globe size={20} />
                        </Link>

                        <div className="hidden sm:block"><ThemeSwitcher /></div>

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
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[15vh]">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} />
                    <div className="relative flex max-h-[min(88dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl sm:pb-0 sm:zoom-in-95">
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
                        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:h-80 sm:flex-none">
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
