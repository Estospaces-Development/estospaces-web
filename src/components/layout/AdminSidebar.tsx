"use client";

import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Activity
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminSidebarProps {
    isOpen?: boolean;
    onToggle?: () => void;
    useSubdomain?: boolean;
}

const AdminSidebar = ({ isOpen = true, onToggle, useSubdomain = false }: AdminSidebarProps) => {
    const { pathname } = useLocation();
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        signOut();
        // Force a hard refresh to ensure all states/caches are cleared
        window.location.href = '/login';
    };

    const getLinkPath = (path: string) => {
        if (!useSubdomain) return path;
        const newPath = path.replace(/^\/admin/, '');
        return newPath || '/';
    };

    const isActive = (path: string) => {
        const checkPath = getLinkPath(path);
        return pathname === checkPath || pathname?.startsWith(checkPath + '/');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin/dashboard' },
        { icon: Users, label: 'User Management', path: '/admin/users' },
        { icon: Shield, label: 'Verifications', path: '/admin/verifications' },
        { icon: Building2, label: 'Properties', path: '/admin/properties' },
        { icon: MessageSquare, label: 'Support Chat', path: '/admin/chat' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'justify-center w-full'}`}>
                    <div className="relative w-8 h-8 flex-shrink-0">
                        {/* Placeholder for logo */}
                        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">E</div>
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
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Toggle Button (Desktop) */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 shadow-md hidden md:flex items-center justify-center transition-transform hover:scale-110 z-50"
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
                                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
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
