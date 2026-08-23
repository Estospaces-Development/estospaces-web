"use client";

import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    icon: LucideIcon;
    iconColor: string;
    trendColor: string;
    loading?: boolean;
    onClick?: () => void;
}

const StatCard = ({ title, value, change, icon: Icon, iconColor, trendColor, loading, onClick }: StatCardProps) => {
    const isNegativeChange = change.trim().startsWith('-');
    const TrendIcon = isNegativeChange ? TrendingDown : TrendingUp;
    const resolvedTrendColor = isNegativeChange ? 'text-red-600 dark:text-red-400' : trendColor;
    const className = `bg-white dark:bg-black rounded-3xl shadow-sm p-6 relative overflow-hidden group transition-all duration-500 font-outfit border border-gray-50 dark:border-gray-900 ${
        onClick ? 'appearance-none cursor-pointer hover:shadow-xl hover:-translate-y-1 text-left w-full' : ''
    }`;

    const content = (
        <>
            {/* Animated light overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent transform -skew-x-12 translate-x-[-150%] group-hover:translate-x-[200%] transition-transform duration-[1200ms] ease-in-out pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:shadow-2xl`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {loading ? (
                        <div className="h-4 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    ) : (
                        <div className={`flex items-center gap-1.5 ${resolvedTrendColor} transition-transform duration-500 group-hover:translate-x-1`}>
                            <TrendIcon className="w-4 h-4 scale-110" aria-hidden="true" />
                            <span className="text-sm font-black tracking-tight">{change}</span>
                        </div>
                    )}
                </div>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="h-3 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    </div>
                ) : (
                    <>
                        <p className="text-3xl font-black text-gray-900 dark:text-white mb-1 transition-all duration-300 group-hover:tracking-tight">{value}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{title}</p>
                    </>
                )}
            </div>
        </>
    );

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={className}>
                {content}
            </button>
        );
    }

    return (
        <div className={className}>
            {content}
        </div>
    );
};

export default StatCard;
