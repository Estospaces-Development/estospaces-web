"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import * as analyticsService from '@/services/analyticsService';
import { getManagerApplicationCount, getManagerLiveListingCount } from '@/lib/managerPropertyDashboard';

interface WelcomeBannerProps {
    analytics?: analyticsService.AnalyticsData | null;
    loading?: boolean;
    liveListingCount?: number | null;
    actionLabel?: string;
    actionPath?: string;
}

const WelcomeBanner = ({
    analytics,
    loading: externalLoading = false,
    liveListingCount = null,
    actionLabel = 'Add Property',
    actionPath = '/manager/dashboard/properties/add',
}: WelcomeBannerProps) => {
    const { getDisplayName, user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeProperties: 0,
        activeLeads: 0,
        totalApplications: 0
    });
    const [loading, setLoading] = useState(true);

    const displayName = getDisplayName && typeof getDisplayName === 'function'
        ? getDisplayName()
        : (user?.email?.split('@')[0] || 'User');

    useEffect(() => {
        if (analytics !== undefined) {
            setStats({
                activeProperties: getManagerLiveListingCount(analytics, undefined, liveListingCount),
                activeLeads: analytics?.active_leads || 0,
                totalApplications: getManagerApplicationCount(analytics),
            });
            setLoading(externalLoading);
            return;
        }

        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const res = await analyticsService.getManagerAnalytics();
                if (res.data) {
                    setStats({
                        activeProperties: getManagerLiveListingCount(res.data, undefined, liveListingCount),
                        activeLeads: res.data.active_leads || 0,
                        totalApplications: getManagerApplicationCount(res.data),
                    });
                } else {
                    setStats({
                        activeProperties: 0,
                        activeLeads: 0,
                        totalApplications: 0,
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [analytics, externalLoading, liveListingCount, user]);

    const summaryItems = [
        {
            label: loading ? '...' : `${stats.activeProperties} Active Listings`,
            path: '/manager/dashboard/properties',
            dotClassName: 'bg-primary',
            ariaLabel: 'Open active listings',
        },
        {
            label: loading ? '...' : `${stats.activeLeads} Active Leads`,
            path: '/manager/leads',
            dotClassName: 'bg-blue-500',
            ariaLabel: 'Open active leads',
        },
        {
            label: loading ? '...' : `${stats.totalApplications} Applications`,
            path: '/manager/applications',
            dotClassName: 'bg-purple-500',
            ariaLabel: 'Open applications',
        },
    ];

    return (
        <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome {displayName}</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage Your Properties, ideas, and grow your business
                    </p>
                </div>
                <button
                    onClick={() => navigate(actionPath)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>{actionLabel}</span>
                </button>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-wrap items-center gap-6 mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                {summaryItems.map((item, index) => (
                    <div key={item.path} className="contents">
                        {index > 0 && <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>}
                        <button
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-label={item.ariaLabel}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-700"
                        >
                            <span className={`w-3 h-3 ${item.dotClassName} rounded-full animate-pulse`} aria-hidden="true"></span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {item.label}
                            </span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WelcomeBanner;
