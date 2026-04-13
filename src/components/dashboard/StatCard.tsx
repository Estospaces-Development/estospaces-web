"use client";

import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    icon: LucideIcon;
    iconColor: string;
    trendColor: string;
    onClick?: () => void;
}

const StatCard = ({ title, value, change, icon: Icon, iconColor, trendColor, onClick }: StatCardProps) => {
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
                    <div className={`flex items-center gap-1.5 ${trendColor} transition-transform duration-500 group-hover:translate-x-1`}>
                        <TrendingUp className="w-4 h-4 scale-110" />
                        <span className="text-sm font-black tracking-tight">{change}</span>
                    </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1 transition-all duration-300 group-hover:tracking-tight">{value}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{title}</p>
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
