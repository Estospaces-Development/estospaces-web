import React from 'react';
import { MessageSquare, Users, AlertCircle, Handshake } from 'lucide-react';

interface CommunityStatsProps {
    totalPosts: number;
    activeBrokers: number;
    urgentPostsToday: number;
    dealsShared: number;
}

const CommunityStats: React.FC<CommunityStatsProps> = ({
    totalPosts,
    activeBrokers,
    urgentPostsToday,
    dealsShared,
}) => {
    const stats = [
        { icon: MessageSquare, label: 'Total Posts', value: totalPosts, bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
        { icon: Users, label: 'Active Brokers', value: activeBrokers, bgColor: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' },
        { icon: AlertCircle, label: 'Urgent Posts Today', value: urgentPostsToday, bgColor: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400' },
        { icon: Handshake, label: 'Deals Shared', value: dealsShared, bgColor: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-mobile-compact-summary-grid>
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        data-manager-mobile-metric
                        key={index}
                        className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-black sm:p-6"
                    >
                        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                            <div className={`shrink-0 rounded-lg p-1.5 sm:rounded-xl sm:p-3 ${stat.bgColor}`}>
                                <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.iconColor}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{stat.value}</p>
                                <p className="text-[11px] font-semibold leading-4 text-gray-700 dark:text-gray-300 sm:text-sm sm:font-medium sm:leading-5">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CommunityStats;
