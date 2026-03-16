"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Building2, Users, Target, ArrowUpRight, Calendar, Filter, Download } from 'lucide-react';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import LineChart from '@/components/ui/LineChart';
import BackButton from '@/components/ui/BackButton';
import { useProperties } from '@/contexts/PropertyContext';
import { useLeads } from '@/contexts/LeadContext';
import { getManagerAnalytics, AnalyticsData } from '@/services/analyticsService';
import { getApplications, Application } from '@/services/applicationsService';

const Analytics = () => {
    const { properties } = useProperties();
    const { leads } = useLeads();

    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsResult, applicationsResult] = await Promise.all([
                    getManagerAnalytics(),
                    getApplications()
                ]);

                if (analyticsResult.data) {
                    setAnalyticsData(analyticsResult.data);
                }

                if (applicationsResult.data) {
                    setApplications(applicationsResult.data);
                }
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Use service data or fallbacks
    const applicationsList = applications.length > 0 ? applications : [];

    const approvedApplications = applicationsList.filter(app => app.status === 'approved');
    const pendingApplications = applicationsList.filter(app => app.status === 'submitted');

    const monthlyRevenue = analyticsData?.revenueTrend?.map((item) => ({
        month: item.label,
        value: item.value * 1000,
        change: 0
    })) || [];

    const propertyPerformance = analyticsData?.propertyPerformance?.map((p) => ({
        property: p.property,
        views: p.views,
        applications: p.applications,
        conversionRate: p.conversionRate
    })) || [];

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
                        <button className="px-4 py-2 bg-white dark:bg-gray-700 shadow-sm rounded-lg text-sm font-bold text-gray-900 dark:text-white transition-all">6 Months</button>
                        <button className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">Yearly</button>
                    </div>
                    <button className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                        <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Analytics Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Total Leads', 
                        value: analyticsData?.leadAnalytics?.totalLeads || 0, 
                        icon: Users, 
                        color: 'blue', 
                        growth: analyticsData?.leadAnalytics?.passed ? `+${analyticsData.leadAnalytics.passed}%` : '+0%'
                    },
                    { 
                        label: 'Properties', 
                        value: analyticsData?.leadAnalytics?.totalProperties || properties.length || 0, 
                        icon: Building2, 
                        color: 'orange', 
                        growth: analyticsData?.property_growth || '+0' 
                    },
                    { 
                        label: 'Conv. Rate', 
                        value: `${analyticsData?.leadAnalytics?.conversionRate || 0}%`, 
                        icon: Target, 
                        color: 'green', 
                        growth: analyticsData?.conversion_growth || '+0%' 
                    },
                    { 
                        label: 'Views', 
                        value: analyticsData?.total_views || 0, 
                        icon: TrendingUp, 
                        color: 'purple', 
                        growth: analyticsData?.views_growth || '+0%' 
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
                        {[
                            { label: 'New Inquiries', value: leads.filter((l) => l.status === 'New Lead').length, total: leads.length, color: 'blue' },
                            { label: 'Active Negotiations', value: leads.filter((l) => l.status === 'In Progress').length, total: leads.length, color: 'orange' },
                            { label: 'Closed Deals', value: leads.filter((l) => l.status === 'Approved').length, total: leads.length, color: 'green' }
                        ].map((item, i) => (
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
                                    {analyticsData?.leadAnalytics?.conversionRate && analyticsData.leadAnalytics.conversionRate > 20 
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
