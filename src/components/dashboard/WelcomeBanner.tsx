"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import * as analyticsService from '@/services/analyticsService';

const WelcomeBanner = () => {
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
        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const res = await analyticsService.getAnalyticsData();
                if (res.data) {
                    setStats({
                        activeProperties: res.data.leadAnalytics?.totalProperties || 0,
                        activeLeads: res.data.leadAnalytics?.totalLeads || 0,
                        totalApplications: res.data.propertyPerformance?.reduce((acc, p) => acc + p.applications, 0) || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    return (
        <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome {displayName}</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage Your Properties, ideas, and grow your business
                    </p>
                </div>
                <button
                    onClick={() => navigate('/manager/dashboard/properties/add')}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Property</span>
                </button>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-wrap items-center gap-6 mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {loading ? '...' : `${stats.activeProperties} Active Properties`}
                    </span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {loading ? '...' : `${stats.activeLeads} Active Leads`}
                    </span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {loading ? '...' : `${stats.totalApplications} Applications`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default WelcomeBanner;
