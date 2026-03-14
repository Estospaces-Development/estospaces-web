"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Building2, Users, Target } from 'lucide-react';
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

    const monthlyRevenue = analyticsData?.revenueTrend.map((item) => ({
        month: item.label,
        value: item.value * 1000,
        change: 0
    })) || [];

    const propertyPerformance = analyticsData?.propertyPerformance.map((p) => ({
        property: p.property,
        views: p.views,
        applications: p.applications,
        conversionRate: p.conversionRate
    })) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans pb-20 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <div className="mb-4">
                    <BackButton />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Analytics</h1>
            </div>

            {/* Analytics Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500 rounded-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{analyticsData?.leadAnalytics?.totalLeads || 0}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
                </div>

                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-primary rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{analyticsData?.leadAnalytics?.totalProperties || properties.length || 0}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Properties</p>
                </div>

                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500 rounded-lg">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{analyticsData?.leadAnalytics?.conversionRate || 0}%</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
                </div>

                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{analyticsData?.leadAnalytics?.passed || 0}%</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</p>
                </div>
            </div>

            {/* Monthly Revenue Trend */}
            <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Monthly Revenue Trend</h2>
                </div>

                {/* Summary Cards */}
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
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">${(totalRevenue / 1000).toFixed(0)}k</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">6 months</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Monthly</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">${(averageRevenue / 1000).toFixed(0)}k</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Per month</p>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Best Month</p>
                                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{bestMonth.month}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">${(bestMonth.value / 1000).toFixed(0)}k</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Growth Rate</p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">+{growthRate.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Since Jan</p>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="mb-6">
                                <div className="flex items-end justify-between gap-4 h-48">
                                    {revenueData.map((item, index) => {
                                        const maxValue = Math.max(...revenueData.map(d => d.value), 1);
                                        const height = (item.value / maxValue) * 100;
                                        const prevValue = index > 0 ? revenueData[index - 1].value : item.value;
                                        const change = index > 0 ? ((item.value - prevValue) / prevValue) * 100 : 0;

                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                                                <div className="w-full flex-1 flex flex-col justify-end items-center mb-2 relative">
                                                    <div
                                                        className="w-full bg-primary rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative"
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                            ${(item.value / 1000).toFixed(0)}k
                                                            {index > 0 && (
                                                                <span className={`ml-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    ({change >= 0 ? '+' : ''}{change.toFixed(1)}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white mb-1">${(item.value / 1000).toFixed(0)}k</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{item.month}</p>
                                                {index > 0 && (
                                                    <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monthly Breakdown Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Month</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">vs Average</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                                        {revenueData.map((item, index) => {
                                            const prevValue = index > 0 ? revenueData[index - 1].value : item.value;
                                            const change = index > 0 ? ((item.value - prevValue) / prevValue) * 100 : 0;
                                            const vsAverage = ((item.value - averageRevenue) / averageRevenue) * 100;

                                            return (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.month}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">${item.value.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {index > 0 ? (
                                                            <span className={`font-medium ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {index > 0 && (
                                                            <span className={`inline-flex items-center ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`font-medium ${vsAverage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {vsAverage >= 0 ? '+' : ''}{vsAverage.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Insights */}
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Key Insights</h3>
                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    <li>• Revenue has grown by <span className="font-semibold text-green-600 dark:text-green-400">{growthRate.toFixed(1)}%</span> over the past 6 months</li>
                                    <li>• <span className="font-semibold">{bestMonth.month}</span> was the best performing month with ${(bestMonth.value / 1000).toFixed(0)}k in revenue</li>
                                    <li>• Average monthly revenue is <span className="font-semibold">${(averageRevenue / 1000).toFixed(0)}k</span>, indicating consistent growth</li>
                                    <li>• Current trend shows <span className="font-semibold text-green-600 dark:text-green-400">positive momentum</span> with steady month-over-month increases</li>
                                </ul>
                            </div>
                        </>
                    );
                })()}
            </div>




            {/* Charts Row 1: Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Application Status Distribution */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Application Status Distribution</h2>
                    <PieChart
                        data={[
                            { label: 'Approved', value: approvedApplications.length, color: '#10b981' },
                            { label: 'Pending', value: pendingApplications.length, color: '#f59e0b' },
                            { label: 'Rejected', value: applicationsList.filter((app) => app.status === 'rejected').length, color: '#ef4444' },
                        ]}
                        size={200}
                    />
                </div>

                {/* Lead Status Distribution */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Lead Status Distribution</h2>
                    <PieChart
                        data={[
                            { label: 'New Leads', value: leads.filter((l) => l.status === 'New Lead').length, color: '#3b82f6' },
                            { label: 'In Progress', value: leads.filter((l) => l.status === 'In Progress').length, color: '#f59e0b' },
                            { label: 'Approved', value: leads.filter((l) => l.status === 'Approved').length, color: '#10b981' },
                        ]}
                        size={200}
                    />
                </div>
            </div>

            {/* Charts Row 2: Bar Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Performance Bar Chart */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Property Performance Comparison</h2>
                    <BarChart
                        data={propertyPerformance.slice(0, 3).map((p) => ({
                            label: p.property.split(' ').slice(0, 2).join(' '), // Shorten name
                            value: p.views,
                            color: '#FF6B35'
                        }))}
                        title="Property Views"
                        height={200}
                    />
                </div>

                {/* Applications by Property */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Applications by Property</h2>
                    <BarChart
                        data={propertyPerformance.slice(0, 3).map((p) => ({
                            label: p.property.split(' ').slice(0, 2).join(' '), // Shorten name
                            value: p.applications,
                            color: p.applications > 50 ? '#10b981' : p.applications > 20 ? '#3b82f6' : '#FF6B35'
                        }))}
                        title="Applications Received"
                        height={200}
                    />
                </div>
            </div>

            {/* Charts Row 3: Line Chart and Property Performance Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend Line Chart */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Revenue Trend (Line Chart)</h2>
                    <LineChart
                        data={monthlyRevenue.map((item) => ({
                            label: item.month,
                            value: item.value
                        }))}
                        height={200}
                        color="#FF6B35"
                    />
                </div>

                {/* Property Performance Table */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Property Performance</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Views</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Applications</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversion</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                                {propertyPerformance.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.property}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.views}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.applications}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-primary h-2 rounded-full"
                                                        style={{ width: `${item.conversionRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-900 dark:text-white">{item.conversionRate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Charts Row 4: Lead Analytics and Additional Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Analytic */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Lead Analytic</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Leads</span>
                            <span className="text-lg font-semibold text-gray-800 dark:text-white">{analyticsData?.leadAnalytics?.totalLeads || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Properties</span>
                            <span className="text-lg font-semibold text-gray-800 dark:text-white">{analyticsData?.leadAnalytics?.totalProperties || properties.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
                            <span className="text-lg font-semibold text-gray-800 dark:text-white">{analyticsData?.leadAnalytics?.conversionRate || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Passed</span>
                            <span className="text-lg font-semibold text-gray-800 dark:text-white">{analyticsData?.leadAnalytics?.passed || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Monthly Applications Trend */}
                <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Monthly Applications Trend</h2>
                    <LineChart
                        data={analyticsData?.monthlyApplicationsTrend || []}
                        height={200}
                        color="#3b82f6"
                    />
                </div>
            </div>
        </div>
    );
};

export default Analytics;
