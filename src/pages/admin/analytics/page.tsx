"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
    BarChart3, Users, Eye, RefreshCw,
    Activity, Zap, Globe2, Loader2
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { getPlatformAnalytics, type AnalyticsData } from '../../../services/analyticsService';

function AnalyticsContent() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState<AnalyticsData | null>(null);

    const fetchAnalytics = useCallback(async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            const response = await getPlatformAnalytics();
            if (response.error) {
                throw new Error(response.error);
            }
            setData(response.data);
        } catch (error: any) {
            toast.error('Failed to load analytics data');
            console.error('[AdminAnalyticsPage] Error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleRefresh = () => {
        fetchAnalytics(true);
    };

    const stats = [
        { 
            label: 'Total Leads', 
            value: (data?.leadAnalytics?.totalLeads ?? data?.total_leads ?? 0).toLocaleString(),
            icon: Users, 
            color: 'text-blue-500' 
        },
        { 
            label: 'Total Properties', 
            value: (data?.leadAnalytics?.totalProperties ?? data?.total_properties ?? 0).toLocaleString(),
            icon: Activity, 
            color: 'text-purple-500' 
        },
        { 
            label: 'Total Views', 
            value: (data?.leadAnalytics?.passed ?? 0).toLocaleString(),
            icon: Eye, 
            color: 'text-green-500' 
        },
        { 
            label: 'Conversion Rate', 
            value: `${data?.leadAnalytics?.conversionRate ?? 0}%`,
            icon: Zap, 
            color: 'text-orange-500' 
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Data Intelligence</span>
                        <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                            <Globe2 size={12} /> Live Platform Metrics
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        System Insights
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 hover:scale-105 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                            <stat.icon size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color}`}>
                                    <stat.icon size={28} />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pages Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-8 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-indigo-500" /> Top Performing Paths
                    </h2>
                    <button className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">Export Report</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Path</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Views</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applications</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Conv. Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {(data?.propertyPerformance || []).map((page, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                    <td className="px-10 py-6 font-black text-gray-900 dark:text-white text-sm">{page.property}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.views.toLocaleString()}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.applications.toLocaleString()}</td>
                                    <td className="px-10 py-6">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                            page.conversionRate > 2 ? 'text-green-500 bg-green-50 dark:bg-green-900/10' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                        }`}>
                                            {page.conversionRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AdminAnalyticsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-bold">Loading Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}

