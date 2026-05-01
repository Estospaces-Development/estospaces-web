"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Building2, Users, Target, ArrowUpRight, Calendar, Filter, Download, Clock, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import LineChart from '@/components/ui/LineChart';
import BackButton from '@/components/ui/BackButton';
import { useProperties } from '@/contexts/PropertyContext';
import { useLeads } from '@/contexts/LeadContext';
import { getManagerAnalytics, invalidateAnalyticsCache, AnalyticsData } from '@/services/analyticsService';
import { getApplications, Application } from '@/services/applicationsService';
import { useDashboardWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    formatManagerAnalyticsPercentage,
    isManagerLivePropertyStatus,
    normalizeManagerAnalyticsPercentage,
} from '@/lib/managerPropertyDashboard';

const Analytics = () => {
    const { properties } = useProperties();
    const { leads } = useLeads();

    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'6m' | '12m'>('6m');

    const fetchData = useCallback(async (forceRefresh = false, silent = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            if (forceRefresh) {
                invalidateAnalyticsCache('manager_analytics');
            }

            const [analyticsResult, applicationsResult] = await Promise.all([
                getManagerAnalytics(forceRefresh),
                getApplications({ suppressErrorToast: silent })
            ]);

            if (analyticsResult.data) {
                setAnalyticsData(analyticsResult.data);
            }

            if (applicationsResult.data) {
                setApplications(applicationsResult.data);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useDashboardWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
        refresh: () => fetchData(true, true),
    });

    // Use service data or fallbacks
    const applicationsList = applications.length > 0 ? applications : [];

    const approvedApplications = applicationsList.filter(app => app.status === 'approved');
    const pendingApplications = applicationsList.filter(app => app.status === 'submitted');
    const livePropertyCount = properties.filter((property) => isManagerLivePropertyStatus(property.status)).length;

    const revenueTrend = timeRange === '6m'
        ? (analyticsData?.revenueTrend || []).slice(-6)
        : (analyticsData?.revenueTrend || []);
    const monthlyRevenue = revenueTrend.map((item) => ({
        month: item.label,
        value: item.value * 1000,
        change: 0
    }));

    const propertyPerformance = analyticsData?.propertyPerformance?.map((p) => ({
        property: p.property,
        views: p.views,
        applications: p.applications,
        conversionRate: normalizeManagerAnalyticsPercentage(p.conversionRate)
    })) || [];

    const leadFunnel = [
        {
            label: 'New Inquiries',
            value: leads.filter((lead) => ['pending_broker_response', 'matching'].includes(lead.status)).length,
            total: leads.length,
            color: 'blue',
        },
        {
            label: 'Active Negotiations',
            value: leads.filter((lead) => ['broker_responded', 'viewing_scheduled', 'docs_requested', 'docs_uploaded', 'under_review', 'approved'].includes(lead.status)).length,
            total: leads.length,
            color: 'orange',
        },
        {
            label: 'Closed Deals',
            value: leads.filter((lead) => ['closed_won', 'completed'].includes(lead.status)).length,
            total: leads.length,
            color: 'green',
        },
    ];
    const managerConversionRate = normalizeManagerAnalyticsPercentage(
        analyticsData?.conversion_rate ?? analyticsData?.leadAnalytics?.conversionRate ?? 0,
    );
    const managerConversionRateLabel = formatManagerAnalyticsPercentage(managerConversionRate);

    const handleExportReport = () => {
        if (propertyPerformance.length === 0) {
            return;
        }

        const csv = [
            ['Property', 'Views', 'Applications', 'Conversion Rate'].join(','),
            ...propertyPerformance.map((item) => [
                `"${item.property.replace(/"/g, '""')}"`,
                item.views,
                item.applications,
                item.conversionRate,
            ].join(',')),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `manager-analytics-${timeRange === '6m' ? '6-months' : 'yearly'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-orange-500 animate-pulse" />
                    </div>
                </div>
                <p className="text-gray-500 font-medium animate-pulse">Gathering insights...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-outfit pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="mb-4">
                        <BackButton />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics Overview</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Detailed performance metrics for your properties</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setTimeRange('6m')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === '6m' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            6 Months
                        </button>
                        <button
                            type="button"
                            onClick={() => setTimeRange('12m')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === '12m' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Yearly
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleExportReport}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Analytics Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Total Leads', 
                        value: analyticsData?.total_leads || analyticsData?.leadAnalytics?.totalLeads || 0, 
                        icon: Users, 
                        color: 'blue', 
                        growth: analyticsData?.conversion_growth || '0%'
                    },
                    { 
                        label: 'Live Listings', 
                        value: analyticsData?.total_properties || analyticsData?.leadAnalytics?.totalProperties || livePropertyCount || 0, 
                        icon: Building2, 
                        color: 'orange', 
                        growth: analyticsData?.property_growth || '0%' 
                    },
                    { 
                        label: 'Conv. Rate', 
                        value: managerConversionRateLabel,
                        icon: Target, 
                        color: 'green', 
                        growth: analyticsData?.conversion_growth || '0%' 
                    },
                    { 
                        label: 'Views', 
                        value: analyticsData?.total_views || 0, 
                        icon: TrendingUp, 
                        color: 'purple', 
                        growth: analyticsData?.views_growth || '0%' 
                    }
                ].map((metric, i) => (
                    <div key={i} className="bg-white dark:bg-black rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 bg-${metric.color}-500/10 rounded-2xl group-hover:scale-110 transition-transform`}>
                                <metric.icon className={`w-6 h-6 text-${metric.color}-500`} />
                            </div>
                            <div className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded-lg">
                                <ArrowUpRight className="w-3 h-3" />
                                {metric.growth}
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{metric.value}</h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
                    </div>
                ))}
            </div>

            {/* SLA & Response Performance */}
            <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">SLA & Response Performance</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">10-minute broker response compliance</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <Zap size={14} className="text-orange-500" />
                        Live Metrics
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* SLA Compliance */}
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-800/40 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">SLA Compliance</span>
                        </div>
                        <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400">
                            {(analyticsData?.sla_success_rate ?? 0).toFixed(1)}%
                        </p>
                        <div className="mt-4 h-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(analyticsData?.sla_success_rate ?? 0, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">Responses within 10 mins</p>
                    </div>
                    {/* Avg Response Time */}
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-100 dark:border-blue-800/40 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
                                <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Avg Response</span>
                        </div>
                        <p className="text-4xl font-black text-blue-700 dark:text-blue-400">
                            {analyticsData?.avg_response_time
                                ? `${Math.floor(analyticsData.avg_response_time / 60)}m ${Math.round(analyticsData.avg_response_time % 60)}s`
                                : '—'}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-6">Average across all leads</p>
                    </div>
                    {/* SLA Status */}
                    <div className={`rounded-2xl border p-6 ${
                        (analyticsData?.sla_success_rate ?? 0) >= 80
                            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800/40'
                            : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-800/40'
                    }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2.5 rounded-xl ${
                                (analyticsData?.sla_success_rate ?? 0) >= 80
                                    ? 'bg-orange-500/10 dark:bg-orange-500/20'
                                    : 'bg-red-500/10 dark:bg-red-500/20'
                            }`}>
                                {(analyticsData?.sla_success_rate ?? 0) >= 80
                                    ? <Zap size={20} className="text-orange-600 dark:text-orange-400" />
                                    : <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />}
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</span>
                        </div>
                        <p className={`text-2xl font-black ${
                            (analyticsData?.sla_success_rate ?? 0) >= 80
                                ? 'text-orange-700 dark:text-orange-400'
                                : 'text-red-700 dark:text-red-400'
                        }`}>
                            {!analyticsData ? 'Loading...'
                                : (analyticsData.sla_success_rate ?? 0) >= 80 ? 'On Track'
                                : 'Needs Attention'}
                        </p>
                        <p className={`text-xs font-medium mt-6 ${
                            (analyticsData?.sla_success_rate ?? 0) >= 80
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                        }`}>
                            {(analyticsData?.sla_success_rate ?? 0) >= 80
                                ? 'Above 80% compliance target'
                                : 'Below 80% — respond faster to leads'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Monthly Revenue Trend */}
            <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Analysis</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly revenue trends and growth projections</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl">
                        <Calendar className="w-4 h-4" />
                        <span>Last Updated: Today</span>
                    </div>
                </div>

                {(() => {
                    const revenueData = monthlyRevenue.length > 0 ? monthlyRevenue : [
                        { month: 'Jan', value: 0 },
                        { month: 'Feb', value: 0 },
                        { month: 'Mar', value: 0 },
                        { month: 'Apr', value: 0 },
                        { month: 'May', value: 0 },
                        { month: 'Jun', value: 0 },
                    ];

                    const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
                    const averageRevenue = Math.round(totalRevenue / revenueData.length);
                    const bestMonth = revenueData.reduce((max, item) => (item.value > max.value ? item : max), revenueData[0]);

                    const startValue = revenueData[0]?.value || 0;
                    const endValue = revenueData[revenueData.length - 1]?.value || 0;
                    const growthRate = startValue > 0
                        ? ((endValue - startValue) / startValue) * 100
                        : 0;

                    return (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(0)}k`, color: 'blue' },
                                    { label: 'Avg Monthly', value: `$${(averageRevenue / 1000).toFixed(0)}k`, color: 'green' },
                                    { label: 'Peak Performance', value: bestMonth.month, color: 'orange' },
                                    { label: 'Projected Growth', value: `+${growthRate.toFixed(1)}%`, color: 'purple' }
                                ].map((item, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border border-${item.color}-100 dark:border-${item.color}-900/30 bg-${item.color}-500/5`}>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{item.label}</p>
                                        <p className={`text-2xl font-black text-${item.color}-600 dark:text-${item.color}-400`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Custom Bar Chart for Revenue */}
                            <div className="relative pt-10 pb-2">
                                <div className="flex items-end justify-between gap-4 h-64 border-b border-gray-100 dark:border-gray-800">
                                    {revenueData.map((item, index) => {
                                        const maxValue = Math.max(...revenueData.map(d => d.value), 100);
                                        const height = (item.value / maxValue) * 100;
                                        
                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center group">
                                                <div className="w-full relative flex flex-col items-center justify-end h-full mb-4">
                                                    <div
                                                        className="w-12 bg-orange-500 dark:bg-orange-600 rounded-t-xl transition-all duration-500 group-hover:opacity-80 group-hover:w-14 cursor-pointer relative shadow-lg shadow-orange-500/20"
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-xl scale-75 group-hover:scale-100">
                                                            ${(item.value / 1000).toFixed(0)}k
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Distribution */}
                <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Application Insights</h2>
                    <div className="flex flex-col items-center">
                        <PieChart
                            data={[
                                { label: 'Approved', value: approvedApplications.length, color: '#10b981' },
                                { label: 'Pending', value: pendingApplications.length, color: '#f59e0b' },
                                { label: 'Rejected', value: applicationsList.filter((app) => app.status === 'rejected').length, color: '#ef4444' },
                            ].map(d => d.value === 0 ? { ...d, value: 1 } : d)} // Hack for empty pie
                            size={240}
                        />
                        <div className="grid grid-cols-3 gap-8 mt-10 w-full">
                            {[
                                { label: 'Approved', value: approvedApplications.length, color: 'bg-green-500' },
                                { label: 'Pending', value: pendingApplications.length, color: 'bg-orange-500' },
                                { label: 'Rejected', value: applicationsList.filter((app) => app.status === 'rejected').length, color: 'bg-red-500' }
                            ].map((s, i) => (
                                <div key={i} className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lead Status */}
                <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Lead Conversion Tunnel</h2>
                    <div className="space-y-6">
                        {leadFunnel.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-sm font-bold">
                                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                                    <span className="text-gray-900 dark:text-white">{item.value}</span>
                                </div>
                                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${item.color}-500 rounded-full transition-all duration-1000`} 
                                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-500/20 rounded-lg">
                                <Target className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400">Platform Insight</h4>
                                <p className="text-xs text-orange-600/80 dark:text-orange-400/60 leading-relaxed mt-1">
                                    {(managerConversionRate > 20)
                                        ? "Your conversion rate is above industry average. Keep up the great work!"
                                        : "Focus on converting your active negotiations to hit your growth targets."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-gray-900">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Performance Rankings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Property Name</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Total Views</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Applications</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Conversion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                            {propertyPerformance.length > 0 ? propertyPerformance.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-400 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                                                {index + 1}
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white">{item.property}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium">{item.views.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium">{item.applications}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 max-w-[120px] bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="h-full bg-orange-500 rounded-full" 
                                                    style={{ width: `${item.conversionRate}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.conversionRate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Building2 className="w-12 h-12 text-gray-200 mb-4" />
                                            <p className="text-gray-400 font-medium">No performance data available yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
