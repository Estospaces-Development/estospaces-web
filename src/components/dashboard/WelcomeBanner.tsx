"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const WelcomeBanner = () => {
    const { getDisplayName, getRole, user } = useAuth();
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

            try {
                // Fetch properties count
                const { count: propertiesCount } = await supabase
                    .from('properties')
                    .select('*', { count: 'exact', head: true })
                    .eq('agent_id', user.id)
                    .eq('status', 'active');

                // Fetch leads count
                const { count: leadsCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('agent_id', user.id);

                // Fetch applications count
                const { count: applicationsCount } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('agent_id', user.id)
                    .eq('status', 'pending');

                setStats({
                    activeProperties: propertiesCount || 0,
                    activeLeads: leadsCount || 0,
                    totalApplications: applicationsCount || 0
                });
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

