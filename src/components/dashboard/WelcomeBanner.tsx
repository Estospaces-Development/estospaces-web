"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const _location = useLocation();
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
        <div className="mb-3 sm:mb-6">
            <div className="mb-2.5 flex items-center justify-between gap-2.5 sm:mb-4 sm:gap-4">
                <div>
                    <h1 className="mb-0.5 text-lg font-semibold leading-tight tracking-[-0.025em] text-gray-800 dark:text-white sm:mb-2 sm:text-2xl sm:font-bold">
                        <span className="sm:hidden">Welcome back</span>
                        <span className="hidden sm:inline">Welcome {displayName}</span>
                    </h1>
                    <p className="hidden text-sm leading-5 text-gray-600 dark:text-gray-400 sm:block sm:text-base sm:leading-6">
                        Manage Your Properties, ideas, and grow your business
                    </p>
                </div>
                <button
                    onClick={() => navigate(actionPath)}
                    aria-label={actionLabel}
                    className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-2.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary-dark min-[360px]:px-3 min-[360px]:text-sm sm:px-6 sm:py-3"
                >
                    <Plus className="w-5 h-5" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">{actionLabel}</span>
                </button>
            </div>

            {/* Summary Stats */}
            <div className="mt-3 hidden rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:p-4">
                {summaryItems.map((item, index) => (
                    <div key={item.path} className="contents">
                        {index > 0 && <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>}
                        <button
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-label={item.ariaLabel}
                            className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-700 sm:px-2"
                        >
                            <span className={`w-3 h-3 ${item.dotClassName} rounded-full animate-pulse`} aria-hidden="true"></span>
                            <span className="min-w-0 text-[12px] font-medium leading-4 text-gray-700 dark:text-gray-300 sm:text-sm">
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
