"use client";

import {
    LayoutDashboard,
    Building2,
    Users,
    MessageSquare,
    Settings,
    HelpCircle,
    FileText,
    PieChart,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Home,
    Heart,
    Search,
    MapPin,
    Briefcase,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useManagerVerification } from '../../contexts/ManagerVerificationContext';
import Image from 'next/image';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
    const pathname = usePathname();
    const { user, getDisplayName, signOut, getRole } = useAuth();
    const { isVerified, isLoading: isVerificationLoading } = useManagerVerification();
    const role = getRole();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const isActive = (path: string) => {
        return pathname === path || pathname?.startsWith(path + '/');
    };

    const managerMenuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/manager/dashboard' },
        { icon: Zap, label: 'Fast Track (24h)', path: '/manager/fast-track' },
        { icon: Users, label: 'Community', path: '/manager/community' },
        { icon: Building2, label: 'Properties', path: '/manager/properties' },
        { icon: Briefcase, label: 'Leads & CRM', path: '/manager/leads' },
        { icon: FileText, label: 'Applications', path: '/manager/applications' },
        { icon: MessageSquare, label: 'Messages', path: '/manager/messages' },
        { icon: PieChart, label: 'Analytics', path: '/manager/analytics' },
    ];

    const userMenuItems = [
        { icon: Search, label: 'Explore', path: '/user/dashboard' },
        { icon: Heart, label: 'Saved', path: '/user/saved' },
        { icon: FileText, label: 'Applications', path: '/user/applications' },
        { icon: MessageSquare, label: 'Messages', path: '/user/messages' },
        { icon: Home, label: 'My Home', path: '/user/my-home' },
    ];

    const adminMenuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin/dashboard' },
        { icon: Users, label: 'User Management', path: '/admin/users' },
        { icon: Shield, label: 'Verifications', path: '/admin/verifications' },
        { icon: Building2, label: 'All Properties', path: '/admin/properties' },
        { icon: Settings, label: 'System Settings', path: '/admin/settings' },
    ];

    let menuItems = userMenuItems;
    if (role === 'manager') menuItems = managerMenuItems;
    if (role === 'admin') menuItems = adminMenuItems;

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'
                }`}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'justify-center w-full'}`}>
                    <div className="relative w-8 h-8 flex-shrink-0">
                        <Image
                            src="/images/logo-icon.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            sizes="32px"
                        />
                    </div>
                    <span
                        className={`font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'
                            }`}
                    >
                        EstoBytes
                    </span>
                </div>
                {isOpen && (
                    <button
                        onClick={onToggle}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors md:hidden"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Toggle Button (Desktop) */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1.5 text-gray-500 hover:text-orange-500 shadow-md hidden md:flex items-center justify-center transition-transform hover:scale-110 z-50"
            >
                {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* User Info (Collapsed/Expanded) */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        {getDisplayName().charAt(0).toUpperCase()}
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {getDisplayName()}
                        </p>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {role}
                            </span>
                            {role === 'manager' && !isVerificationLoading && (
                                isVerified ? (
                                    <Shield size={12} className="text-green-500" fill="currentColor" />
                                ) : (
                                    <Shield size={12} className="text-gray-400" />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                <nav className="px-3 space-y-1">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${active
                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 font-medium shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                title={!isOpen ? item.label : ''}
                            >
                                <item.icon
                                    size={20}
                                    className={`flex-shrink-0 transition-colors ${active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                        }`}
                                />
                                <span
                                    className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'
                                        }`}
                                >
                                    {item.label}
                                </span>

                                {/* Active Indicator Bar */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <Link
                    href="/settings"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors w-full group ${!isOpen && 'justify-center'
                        }`}
                    title={!isOpen ? 'Settings' : ''}
                >
                    <Settings size={20} className="flex-shrink-0 group-hover:rotate-45 transition-transform duration-300" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                        Settings
                    </span>
                </Link>

                <button
                    onClick={handleSignOut}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full group ${!isOpen && 'justify-center'
                        }`}
                    title={!isOpen ? 'Sign Out' : ''}
                >
                    <LogOut size={20} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                        Sign Out
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
