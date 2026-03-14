"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Shield,
    Users,
    Building2,
    Clock,
    TrendingUp,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    Star,
    Zap,
    ArrowRight,
    Bell,
    Loader2
} from 'lucide-react';
import { getPlatformAnalytics, AnalyticsData } from '@/services/analyticsService';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const result = await getPlatformAnalytics();
                if (result.data) {
                    setData(result.data);
                } else {
                    setError(result.error);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 lg:p-10">
                <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
                <p className="text-gray-500 font-medium">Initializing Command Center...</p>
            </div>
        );
    }

    // Map real values from backend
    const stats = {
        slaCompliance: data?.sla_success_rate || 0,
        avgResponseTime: data?.avg_response_time ? `${Math.floor(data.avg_response_time / 60)}m ${Math.round(data.avg_response_time % 60)}s` : "0m 0s",
        npsScore: 4.8, // Still hardcoded as NPS isn't in backend yet
        activeTransactions: data?.active_leads || 0
    };

    const activityFeed = [
        { id: 1, type: 'lead', message: 'Platform monitoring active', time: 'Just now', icon: Activity, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        { id: 2, type: 'status', message: `Managing ${data?.total_properties || 0} total properties`, time: 'Live', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { id: 3, type: 'users', message: `${data?.total_users || 0} registered members`, time: 'Updated', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    return (
        <div className="min-h-screen p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20">
                            Command Center
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center gap-1">
                            <Activity size={12} /> System Operational
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                        Platform Health
                    </h1>
                </div>
            </header>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* SLA Compliance */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Zap size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">SLA Compliance</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.slaCompliance.toFixed(1)}%</span>
                            <span className="text-sm font-bold text-emerald-500 flex items-center">
                                <TrendingUp size={14} className="mr-1" /> +2.4%
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">Responses under 10 mins</p>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${stats.slaCompliance}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Zap size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                <Clock size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Avg Response</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.avgResponseTime}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">Global broker average</p>
                        <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg w-fit">
                            TARGET: &lt; 5m 00s
                        </div>
                    </div>
                </div>

                {/* NPS Score */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Star size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
                                <Star size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Net Promoter</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.npsScore}</span>
                            <span className="text-lg text-gray-400 dark:text-gray-500">/ 5.0</span>
                        </div>
                        <div className="flex gap-1 mt-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    size={16}
                                    className={`${i <= Math.round(stats.npsScore) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Transactions */}
                <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                        <Activity size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/10 rounded-xl text-white backdrop-blur-sm">
                                <Activity size={24} />
                            </div>
                            <span className="text-xs font-bold text-orange-100 uppercase tracking-widest">Live Deals</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{stats.activeTransactions}</span>
                        </div>
                        <p className="text-xs text-orange-100 font-medium mt-2">Active fast-track flows</p>
                        <button
                            onClick={() => navigate('/admin/fast-track')}
                            className="mt-5 w-full py-2 bg-white text-orange-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-orange-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            View Live Map <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area - Quick Actions & Feed */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Actions Rail */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Zap className="text-orange-500" size={20} /> Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => navigate('/admin/verifications')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Verifications</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-orange-600/70 dark:group-hover:text-orange-400/70">{data?.pending_verifications || 0} Pending Reviews</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-orange-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/properties')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Property Hub</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600/70 dark:group-hover:text-blue-400/70">Manage Inventory</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-blue-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/users')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">User Registry</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70">View Clients</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-emerald-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/chat')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/10 border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-purple-500 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Support Chat</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-600/70 dark:group-hover:text-purple-400/70">Monitoring Active</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-purple-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="rounded-2xl bg-gray-900 dark:bg-black p-8 text-white relative overflow-hidden border border-gray-800">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-orange-600 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-white">Quarterly Goals</h3>
                                <p className="text-gray-400 text-sm max-w-md mb-6">
                                    The team is on track to hit the Q1 target. 
                                    Currently {data?.total_properties || 0} / 150 verified properties listed.
                                    Keep monitoring fast-track transaction speeds.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-gray-900 dark:border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-300`}>
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">Team Active</span>
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <TrendingUp size={32} className="text-orange-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Feed Sidebar */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800 h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="text-orange-500" size={20} /> Live Feed
                        </h3>
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>

                    <div className="relative">
                        {/* Connector Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-800"></div>

                        <div className="space-y-8">
                            {activityFeed.map((item) => (
                                <div key={item.id} className="relative flex gap-4">
                                    <div className={`relative z-10 w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 border-4 border-white dark:border-gray-900 shadow-sm`}>
                                        <item.icon size={18} />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1">
                                            {item.message}
                                        </p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {item.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full mt-8 py-3 rounded-lg border-2 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest hover:border-orange-100 dark:hover:border-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 transition-all">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
}

