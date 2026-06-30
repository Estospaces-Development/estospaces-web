'use client';

import React, { ReactNode } from 'react';
import {
    Heart, FileText, MessageSquare, Calendar, Search, Home,
    Star, Bell, FolderOpen, LucideIcon,
} from 'lucide-react';

interface VariantConfig {
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
}

const VARIANTS: Record<string, VariantConfig> = {
    'no-saved': { icon: Heart, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Saved Properties', description: 'Properties you save will appear here. Start exploring and keep your shortlist focused.' },
    'no-applications': { icon: FileText, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Applications Yet', description: 'Your active applications will appear here once you move forward with a property.' },
    'no-messages': { icon: MessageSquare, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Messages', description: 'Your conversations with managers and support will appear here.' },
    'no-viewings': { icon: Calendar, iconColor: 'text-emerald-600 dark:text-emerald-300', iconBg: 'bg-emerald-100 dark:bg-emerald-950/30', title: 'No Scheduled Viewings', description: 'Confirmed property viewings will appear here once they are booked.' },
    'no-results': { icon: Search, iconColor: 'text-gray-500 dark:text-gray-300', iconBg: 'bg-gray-100 dark:bg-gray-800', title: 'No Results Found', description: 'Try adjusting your filters or clear a few constraints to widen the search.' },
    'no-properties': { icon: Home, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Properties Available', description: 'Check back soon for new listings in this area.' },
    'no-payments': { icon: FileText, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Contract Activity', description: 'Contract milestones will appear here when they become relevant.' },
    'no-reviews': { icon: Star, iconColor: 'text-amber-600 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-950/30', title: 'No Reviews Yet', description: 'Your reviews and ratings will appear here.' },
    'no-notifications': { icon: Bell, iconColor: 'text-orange-600 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-950/30', title: 'No Notifications', description: "You're all caught up. New activity will appear here as soon as something changes." },
    'empty-folder': { icon: FolderOpen, iconColor: 'text-gray-500 dark:text-gray-300', iconBg: 'bg-gray-100 dark:bg-gray-800', title: 'Nothing Here Yet', description: 'This section is empty for now. Content will appear here when it becomes relevant.' },
};

interface EmptyStateProps {
    variant?: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    title?: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

const EmptyState = ({
    variant = 'empty-folder',
    icon: CustomIcon,
    iconColor,
    iconBg,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) => {
    const config = VARIANTS[variant] || VARIANTS['empty-folder'];

    const Icon = CustomIcon || config.icon;
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;
    const displayIconColor = iconColor || config.iconColor;
    const displayIconBg = iconBg || config.iconBg;

    return (
        <div className={`rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface-base)] px-6 py-12 text-center shadow-[var(--shadow-card)] ${className}`}>
            <div className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${displayIconBg}`}>
                <Icon size={36} className={displayIconColor} strokeWidth={1.5} />
                <div
                    className="absolute inset-0 rounded-full border border-dashed border-[var(--border-soft)]"
                    style={{ transform: 'scale(1.2)' }}
                />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-[var(--text-strong)]">
                {displayTitle}
            </h3>

            <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--text-muted)]">
                {displayDescription}
            </p>

            {action && <div>{action}</div>}
        </div>
    );
};

export default EmptyState;
