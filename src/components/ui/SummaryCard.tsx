'use client';

import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    iconColor: string;
    bgColor?: string;
}

const SummaryCard = ({ title, value, icon: Icon, iconColor, bgColor = 'bg-white dark:bg-black' }: SummaryCardProps) => {
    return (
        <div className={`${bgColor} group relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-soft)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-floating)]`}>
            <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                    <p className="mb-1 text-sm font-medium text-[var(--text-muted)]">{title}</p>
                    <p className="text-2xl font-bold text-[var(--text-strong)]">{value}</p>
                </div>
                <div className={`${iconColor} rounded-2xl p-3 shadow-[var(--shadow-card)]`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
