"use client";

import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    Shield,
    Bell,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Star,
    BarChart3,
    Zap,
    User,
    ClipboardList,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getLoginPath } from '@/lib/authUtils';

interface AdminSidebarProps {
    isOpen?: boolean;
    onToggle?: () => void;
    useSubdomain?: boolean;
}

const AdminSidebar = ({ isOpen = true, onToggle, useSubdomain: _useSubdomain = false }: AdminSidebarProps) => {
    const { pathname } = useLocation();
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate(getLoginPath(), { replace: true });
    };

    const getLinkPath = (path: string) => path;

    const isActive = (path: string) => {
        const checkPath = getLinkPath(path);
        return pathname === checkPath || pathname?.startsWith(checkPath + '/');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin/dashboard' },
        { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        { icon: Users, label: 'User Management', path: '/admin/users' },
        { icon: Shield, label: 'Verifications', path: '/admin/verifications' },
        { icon: Building2, label: 'Properties', path: '/admin/properties' },
        { icon: Zap, label: 'Fast Track', path: '/admin/fast-track' },
        { icon: MessageSquare, label: 'Help & Support', path: '/admin/help' },
        { icon: Star, label: 'Reviews', path: '/admin/reviews' },
        { icon: ClipboardList, label: 'Observational Research', path: '/admin/research' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
        { icon: User, label: 'Profile', path: '/admin/profile' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    return (
        <aside
            aria-label="Admin workspace sidebar"
            className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-100 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${isOpen ? 'w-64 translate-x-0' : 'invisible w-64 -translate-x-full pointer-events-none lg:visible lg:w-20 lg:translate-x-0 lg:pointer-events-auto'}`}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
                <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'justify-center w-full'}`}>
                    <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50 dark:bg-orange-500/10">
                        <img src="/images/logo-icon.png" alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
                    </div>
                    <span
                        className={`font-bold text-xl tracking-tight text-gray-900 dark:text-white whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
                    >
                        EstoAdmin
                    </span>
                </div>
                {isOpen && onToggle && (
                    <button
                        onClick={onToggle}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-gray-800 lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Toggle Button (Desktop) */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 shadow-md hidden lg:flex items-center justify-center transition-transform hover:scale-110 z-50"
                    aria-label={isOpen ? 'Collapse admin sidebar' : 'Expand admin sidebar'}
                >
                    {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            )}

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <nav>
                    <ul className="space-y-2">
                        {menuItems.map((item) => {
                            const active = isActive(item.path);
                            const linkPath = getLinkPath(item.path);
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={linkPath}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${active
                                            ? 'bg-orange-700 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 hover:scale-[1.02]'
                                            }`}
                                        title={!isOpen ? item.label : ''}
                                    >
                                        <item.icon
                                            className={`w-5 h-5 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`}
                                        />
                                        {isOpen && (
                                            <span className={`transition-all duration-300 ${!active && 'group-hover:translate-x-1'}`}>
                                                {item.label}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Sign Out */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 group hover:scale-[1.02] ${!isOpen && 'justify-center'}`}
                    title={!isOpen ? 'Sign Out' : ''}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    {isOpen && <span className="text-sm font-medium transition-all duration-300 group-hover:translate-x-1">Sign out</span>}
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
