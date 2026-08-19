"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import {
    BarChart3, Users, Eye, RefreshCw,
    Activity, Zap, Globe2, Loader2, TrendingUp, Building2, FileText
} from 'lucide-react';
import PieChart from '@/components/ui/PieChart';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { getPlatformAnalytics, invalidateAnalyticsCache, type AnalyticsData } from '../../../services/analyticsService';
import { useDashboardWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import {
    buildAdminAnalyticsCsvSnapshot,
    buildAdminAnalyticsExportRows,
    type AdminAnalyticsExportDirection,
    type AdminAnalyticsExportSortBy,
    buildAdminAnalyticsMetricCards,
    createAdminAnalyticsExportDeduper,
    type AdminAnalyticsIconKey,
} from '@/lib/adminPlatformAnalytics';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

const metricIconMap: Record<AdminAnalyticsIconKey, React.ComponentType<{ size?: number }>> = {
    activity: Activity,
    building: Building2,
    eye: Eye,
    file: FileText,
    trending: TrendingUp,
    users: Users,
    zap: Zap,
};

const PIE_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#14b8a6', '#a855f7', '#ef4444',
];

const getPieColor = (index: number): string => PIE_COLORS[index % PIE_COLORS.length];

function AnalyticsContent() {
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState('');
    const [exportStatusFilter, setExportStatusFilter] = useState('all');
    const [exportSortBy, setExportSortBy] = useState<AdminAnalyticsExportSortBy>('views');
    const [exportDirection, setExportDirection] = useState<AdminAnalyticsExportDirection>('desc');
    const exportDeduperRef = useRef(createAdminAnalyticsExportDeduper());

    const fetchAnalytics = useCallback(async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            const response = await getPlatformAnalytics(refresh);
            if (response.error) {
                throw new Error(response.error);
            }
            setData(response.data);
            setError(null);
        } catch (error: any) {
            setError(error.message || 'Analytics data is not available right now.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    useDashboardWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
        refresh: () => {
            invalidateAnalyticsCache('platform_analytics');
            return fetchAnalytics(true);
        },
    });

    const handleRefresh = () => {
        fetchAnalytics(true);
    };

    const analyticsTableOptions = {
        status: exportStatusFilter,
        sortBy: exportSortBy,
        direction: exportDirection,
    };
    const analyticsRows = buildAdminAnalyticsExportRows(data, analyticsTableOptions);

    const handleExportReport = () => {
        const rows = analyticsRows;
        if (rows.length === 0) {
            setExportStatus('No analytics rows match the current export filters.');
            return;
        }
        if (!exportDeduperRef.current.canStart()) {
            setExportStatus('Export already started. Please wait a moment before trying again.');
            return;
        }
        exportDeduperRef.current.markStarted();

        const csv = buildAdminAnalyticsCsvSnapshot(data, analyticsTableOptions);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `platform-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        setExportStatus(`Exported ${rows.length} analytics row${rows.length === 1 ? '' : 's'} to CSV.`);
    };

    const stats = buildAdminAnalyticsMetricCards(data);

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
                        type="button"
                        aria-label="Refresh analytics"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:scale-105 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat) => {
                    const MetricIcon = metricIconMap[stat.icon];

                    return (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                            <MetricIcon size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color}`}>
                                    <MetricIcon size={28} />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                            {stat.detail && (
                                <p className="mt-3 text-xs font-bold text-gray-500 dark:text-gray-400">{stat.detail}</p>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Pie Chart Section */}
            {data && data.applicationsByProperty && data.applicationsByProperty.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700 p-10">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
                        Application Insights
                    </h2>
                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        <PieChart
                            data={data.applicationsByProperty.map((item) => ({
                                label: item.label,
                                value: item.value,
                                color: getPieColor(data.applicationsByProperty!.indexOf(item)),
                            }))}
                            size={260}
                            title="Applications by Property"
                        />
                        <div className="flex-1 space-y-3">
                            {data.applicationsByProperty.map((item, index) => {
                                const total = data.applicationsByProperty!.reduce((s, i) => s + i.value, 0);
                                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                                return (
                                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPieColor(index) }} />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-gray-900 dark:text-white">{item.value}</span>
                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-14 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Pages Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-5 bg-gray-50/50 dark:bg-gray-900/20 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-indigo-500" /> Top Performing Paths
                    </h2>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        <label className="sr-only" htmlFor="analytics-export-status">Filter analytics export by status</label>
                        <select
                            id="analytics-export-status"
                            value={exportStatusFilter}
                            onChange={(event) => setExportStatusFilter(event.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="published">Published</option>
                            <option value="pending">Pending</option>
                        </select>
                        <label className="sr-only" htmlFor="analytics-export-sort">Sort analytics export</label>
                        <select
                            id="analytics-export-sort"
                            value={exportSortBy}
                            onChange={(event) => setExportSortBy(event.target.value as AdminAnalyticsExportSortBy)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                            <option value="views">Views</option>
                            <option value="applications">Applications</option>
                            <option value="conversionRate">Conversion rate</option>
                            <option value="property">Property</option>
                        </select>
                        <label className="sr-only" htmlFor="analytics-export-direction">Sort analytics export direction</label>
                        <select
                            id="analytics-export-direction"
                            value={exportDirection}
                            onChange={(event) => setExportDirection(event.target.value as AdminAnalyticsExportDirection)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                            <option value="desc">High to low</option>
                            <option value="asc">Low to high</option>
                        </select>
                        <button
                            type="button"
                            onClick={handleExportReport}
                            disabled={!analyticsRows.length}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:focus-visible:ring-offset-gray-800"
                        >
                            Export Report
                        </button>
                    </div>
                </div>
                {exportStatus ? (
                    <div role="status" aria-live="polite" className="border-b border-indigo-100 bg-indigo-50 px-10 py-3 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                        {exportStatus}
                    </div>
                ) : null}
                <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable top performing paths table">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Path</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Views</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applications</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Conv. Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y border-gray-100 dark:divide-gray-700">
                            {analyticsRows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-10 text-center text-sm font-semibold text-gray-500 dark:text-gray-300">
                                        No analytics rows match the current filters.
                                    </td>
                                </tr>
                            ) : analyticsRows.map((page, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                    <td className="px-10 py-6 font-black text-gray-900 dark:text-white text-sm">{page.property}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.views.toLocaleString()}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.applications.toLocaleString()}</td>
                                    <td className="px-10 py-6">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                            page.conversionRate > 2 ? 'text-green-700 bg-green-100 dark:bg-green-950/30 dark:text-green-300' : 'text-orange-700 bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300'
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
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading analytics..." />}>
            <AnalyticsContent />
        </Suspense>
    );
}

