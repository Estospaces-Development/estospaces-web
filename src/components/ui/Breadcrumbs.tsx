"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
    overrides?: Record<string, string>;
    className?: string;
}

const defaultLabels: Record<string, string> = {
    manager: 'Manager',
    admin: 'Admin',
    user: 'User',
    dashboard: 'Dashboard',
    properties: 'Properties',
    leads: 'Leads & CRM',
    analytics: 'Analytics',
    messages: 'Messages',
    applications: 'Applications',
    verifications: 'Verifications',
    users: 'Users',
    settings: 'Settings',
    'fast-track': 'Fast Track',
    community: 'Community',
    bookings: 'Bookings',
    saved: 'Saved',
    profile: 'Profile',
    favorites: 'Favorites',
    search: 'Search',
    clients: 'Clients',
    chat: 'Chat',
    add: 'Add New',
    edit: 'Edit',
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ overrides = {}, className = '' }) => {
    const pathname = usePathname();
    if (!pathname) return null;

    // Remove route group markers like (admin), (manager), (user)
    const cleanPath = pathname.replace(/\/\([^)]+\)/g, '');
    const segments = cleanPath.split('/').filter(Boolean);

    const crumbs = segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const label = overrides[seg] || defaultLabels[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const isLast = idx === segments.length - 1;
        return { href, label, isLast };
    });

    return (
        <nav aria-label="Breadcrumbs" className={`flex items-center gap-1 text-sm ${className}`}>
            <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Home className="w-4 h-4" />
            </Link>
            {crumbs.map((crumb) => (
                <React.Fragment key={crumb.href}>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                    {crumb.isLast ? (
                        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{crumb.label}</span>
                    ) : (
                        <Link
                            href={crumb.href}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors truncate max-w-[200px]"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
