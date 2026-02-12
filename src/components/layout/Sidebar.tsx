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
    Zap,
    Calendar,
    CreditCard,
    BarChart3,
    Activity,
    UserCircle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useManagerVerification } from '../../contexts/ManagerVerificationContext';
import Image from 'next/image';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    useSubdomain?: boolean;
}

const Sidebar = ({ isOpen, onToggle, useSubdomain = false }: SidebarProps) => {
    const pathname = usePathname();
    const { user, getDisplayName, signOut, getRole } = useAuth();
    const { isVerified, isLoading: isVerificationLoading } = useManagerVerification();
    const role = getRole();
    const router = useRouter();
    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const getLinkPath = (path: string) => {
        if (!useSubdomain) return path;
        // Strip the role prefix from the path
        const newPath = path.replace(/^\/(manager|user|admin)/, '');
        return newPath || '/'; // If empty (was just /manager), return /
    };

    const isActive = (path: string) => {
        const checkPath = getLinkPath(path);
        return pathname === checkPath || pathname?.startsWith(checkPath + '/');
    };

    // Manager menu items — matches legacy sidebar ordering exactly
    const managerMenuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/manager/dashboard' },
        { icon: Zap, label: 'Fast Track 24h', path: '/manager/fast-track' },
        { icon: Users, label: 'Brokers Community', path: '/manager/community' },
        { icon: Building2, label: 'Properties', path: '/manager/properties' },
        { icon: Users, label: 'Leads & Clients', path: '/manager/leads' },
        { icon: FileText, label: 'Applications', path: '/manager/applications' },
        { icon: Calendar, label: 'Appointments', path: '/manager/appointments' },
        { icon: MessageSquare, label: 'Messages', path: '/manager/messages' },
        { icon: BarChart3, label: 'Analytics', path: '/manager/analytics' },
        { icon: CreditCard, label: 'Billing', path: '/manager/billing' },
    ];

    // Manager footer items — matches legacy sidebar footer exactly
    const managerFooterItems = [
        { icon: Shield, label: 'Verification', path: '/manager/verification' },
        { icon: UserCircle, label: 'Profile', path: '/manager/profile' },
        { icon: HelpCircle, label: 'Help & Support', path: '/manager/help' },
    ];

    const userMenuItems = [
        { icon: Search, label: 'Explore', path: '/user/dashboard' },
        { icon: Heart, label: 'Saved', path: '/user/saved' },
        { icon: FileText, label: 'Applications', path: '/user/applications' },
        { icon: MessageSquare, label: 'Messages', path: '/user/dashboard/messages' },
        { icon: Home, label: 'My Home', path: '/user/dashboard/contracts' },
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
            className={`fixed left-0 top-0 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'
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
                        Estospaces
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

            {/* Navigation Links — matches legacy active style: bg-primary text-white shadow-md */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                <nav>
                    <ul className="space-y-2">
                        {menuItems.map((item) => {
                            const active = isActive(item.path);
                            const linkPath = getLinkPath(item.path);
                            return (
                                <li key={item.path}>
                                    <Link
                                        href={linkPath}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${active
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white hover:scale-[1.02] hover:shadow-sm hover:brightness-105 dark:hover:brightness-110'
                                            }`}
                                        title={!isOpen ? item.label : ''}
                                    >
                                        <item.icon
                                            className={`w-5 h-5 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`}
                                        />
                                        {isOpen && (
                                            <span className={`menu-item transition-all duration-300 ${!active && 'group-hover:translate-x-1'}`}>
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

            {/* Footer Menu Items — Verification, Profile, Help & Support for manager */}
            {role === 'manager' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
                    <ul className="space-y-2">
                        {managerFooterItems.map((item) => {
                            const active = isActive(item.path);
                            const linkPath = getLinkPath(item.path);
                            return (
                                <li key={item.path}>
                                    <Link
                                        href={linkPath}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${active
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white hover:scale-[1.02] hover:shadow-sm hover:brightness-105 dark:hover:brightness-110'
                                            }`}
                                        title={!isOpen ? item.label : ''}
                                    >
                                        <item.icon
                                            className={`w-5 h-5 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`}
                                        />
                                        {isOpen && (
                                            <span className={`menu-item transition-all duration-300 ${!active && 'group-hover:translate-x-1'}`}>
                                                {item.label}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Sign Out */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
                <button
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 group hover:scale-[1.02] hover:shadow-sm ${!isOpen && 'justify-center'}`}
                    title={!isOpen ? 'Sign Out' : ''}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    {isOpen && <span className="text-sm font-medium transition-all duration-300 group-hover:translate-x-1">Sign out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
