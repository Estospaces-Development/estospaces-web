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
        <div className={`${bgColor} rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.03] hover:brightness-110 dark:hover:brightness-125`}>
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 dark:group-hover:opacity-15 transition-opacity duration-300 bg-gradient-to-br from-white/60 dark:from-white/40 via-transparent to-transparent"></div>

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="secondary-label text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-300 group-hover:text-gray-800 dark:group-hover:text-gray-200">{title}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white transition-all duration-300 group-hover:scale-105">{value}</p>
                </div>
                <div className={`${iconColor} p-3 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:rotate-3`}>
                    <Icon className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
