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
        <div className="bg-white dark:bg-black rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:brightness-110 dark:hover:brightness-150">
            {/* Animated light overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>

            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-30 dark:group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-br from-white/50 dark:from-white/30 via-transparent to-transparent"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 ${trendColor} transition-transform duration-300 group-hover:scale-110`}>
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">{change}</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 transition-all duration-300 group-hover:text-primary dark:group-hover:text-primary-light">{value}</h3>
                <p className="secondary-label text-gray-600 dark:text-gray-400">{title}</p>
            </div>
        </div>
    );
};

export default KPICard;
