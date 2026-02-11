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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CommunityStats;
