"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Menu, Globe, X } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../dashboard/ThemeSwitcher';
import NotificationDropdown from '../dashboard/NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_PAGES = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Notifications', path: '/admin/notifications' },
    { label: 'User Management', path: '/admin/users' },
    { label: 'Verifications', path: '/admin/verifications' },
    { label: 'Properties', path: '/admin/properties' },
    { label: 'Fast Track', path: '/admin/fast-track' },
    { label: 'Support Chat', path: '/admin/chat' },
    { label: 'Reviews', path: '/admin/reviews' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Profile', path: '/admin/profile' },
    { label: 'System Settings', path: '/admin/settings' },
];

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
        if (pathname?.includes('/chat')) return 'Support Chat';
        if (pathname?.includes('/reviews')) return 'Reviews';
        if (pathname?.includes('/profile')) return 'Admin Profile';
        if (pathname?.includes('/settings')) return 'System Settings';
        return 'Admin Panel';
    };

    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) return ADMIN_PAGES;
        const q = searchQuery.toLowerCase();
        return ADMIN_PAGES.filter(p => p.label.toLowerCase().includes(q));
    }, [searchQuery]);

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
            setSelectedIdx(i => Math.min(i + 1, filteredPages.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredPages[selectedIdx]) {
            handleNavigate(filteredPages[selectedIdx].path);
        }
    };

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : 'A';

    return (
        <>
            <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
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
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="hidden md:flex items-center gap-2 pl-3 pr-4 py-2 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all w-64 text-sm"
                        >
                            <Search size={16} />
                            <span>Search...</span>
                            <kbd className="ml-auto text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
                        </button>

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

                        <NotificationDropdown />

                        <Link
                            to="/admin/profile"
                            className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800 hover:ring-2 hover:ring-orange-500/30 transition-all"
                            title="Admin Profile"
                        >
                            {initials}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Command Palette */}
            {searchOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <Search size={20} className="text-gray-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Navigate to..."
                                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400"
                            />
                            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2">
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
                            )) : (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">No matching pages</p>
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
