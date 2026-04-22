'use client';

import { LucideIcon, TrendingUp } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string;
    change: string;
    icon: LucideIcon;
    iconColor: string;
    trendColor: string;
}

const KPICard = ({ title, value, change, icon: Icon, iconColor, trendColor }: KPICardProps) => {
    return (
        <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface-base)] p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-floating)]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                    <div className={`rounded-2xl p-3 ${iconColor} shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:scale-[1.03]`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                        <TrendingUp className="w-4 h-4" />
                        <span>{change}</span>
                    </div>
                </div>
                <h3 className="mb-1 text-2xl font-bold text-[var(--text-strong)]">{value}</h3>
                <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
            </div>
        </div>
    );
};

export default KPICard;
