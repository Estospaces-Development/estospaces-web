"use client";

import React, { useState, Suspense } from 'react';
import {
    BarChart3, Users, Eye, Globe, TrendingUp, RefreshCw,
    Monitor, Smartphone, Tablet, Clock, Shield, LayoutDashboard,
    Activity, MapPin, Zap, PieChart as PieChartIcon, LineChart as LineChartIcon,
    Calendar, ArrowUpRight, ArrowDownRight, Globe2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

function AnalyticsContent() {
    const { user } = useAuth();
    const toast = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState('7d');

    const stats = [
        { label: 'Total Visitors', value: '12,482', trend: '+14%', up: true, icon: Users, color: 'text-blue-500' },
        { label: 'Active Sessions', value: '842', trend: '+8%', up: true, icon: Activity, color: 'text-purple-500' },
        { label: 'Page Views', value: '84,201', trend: '+22%', up: true, icon: Eye, color: 'text-green-500' },
        { label: 'Bounce Rate', value: '24.2%', trend: '-2%', up: false, icon: Zap, color: 'text-orange-500' },
    ];

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1500);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
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
                    <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl border dark:border-gray-700 shadow-sm">
                        {['24h', '7d', '30d', '12m'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 hover:scale-105 transition-all"
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
                                <div className={`flex items-center gap-1 text-[10px] font-black tracking-widest ${stat.up ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {stat.trend}
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-[3rem] p-10 shadow-2xl border dark:border-gray-700 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Traffic Velocity</h2>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Real-time engagement across sessions</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desktop</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Pulse Line */}
                    <div className="h-64 relative flex items-end justify-between px-4 pb-10">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <path
                                d="M0 150 Q 100 80, 200 120 T 400 60 T 600 100 T 800 40 T 1000 80"
                                fill="none"
                                stroke="currentColor"
                                className="text-indigo-500/20"
                                strokeWidth="4"
                            />
                            <path
                                d="M0 150 Q 80 100, 150 140 T 300 80 T 500 120 T 700 60 T 900 100 T 1100 50"
                                fill="none"
                                stroke="currentColor"
                                className="text-indigo-500"
                                strokeWidth="4"
                                strokeDasharray="1000"
                                strokeDashoffset="1000"
                            >
                                <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="3s" fill="freeze" />
                            </path>
                        </svg>

                        {/* Pulse Dot */}
                        <div className="absolute top-[40px] right-[10%] w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-ping"></div>

                        <div className="absolute bottom-0 left-0 w-full flex justify-between px-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>23:59</span>
                        </div>
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-10 shadow-2xl border dark:border-gray-700 overflow-hidden group">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Access Points</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Desktop', percentage: 58, icon: Monitor, color: 'bg-blue-500' },
                                { label: 'Mobile', percentage: 34, icon: Smartphone, color: 'bg-indigo-500' },
                                { label: 'Tablet', percentage: 8, icon: Tablet, color: 'bg-purple-500' },
                            ].map((device) => (
                                <div key={device.label} className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-3">
                                            <device.icon size={16} className="text-gray-400" />
                                            <span className="text-gray-900 dark:text-white">{device.label}</span>
                                        </div>
                                        <span className="text-gray-400">{device.percentage}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${device.color} rounded-full transition-all duration-1000`}
                                            style={{ width: `${device.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:rotate-12 transition-transform duration-700">
                            <Monitor size={100} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-lg font-black mb-2">Browser Insights</h4>
                            <p className="text-indigo-50 text-xs font-medium opacity-90 leading-relaxed mb-6">Chrome remains the dominant choice across 72% of all platform visits.</p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest">Chrome</span>
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest">Safari</span>
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest">Edge</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pages Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-8 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-indigo-500" /> Page Performance
                    </h2>
                    <button className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">Export Report</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Path</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Views</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Time</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Exit Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {[
                                { path: '/explore', views: '12,401', time: '2m 14s', exit: '12%' },
                                { path: '/manager/dashboard', views: '8,214', time: '5m 45s', exit: '5%' },
                                { path: '/property/:id', views: '6,482', time: '1m 50s', exit: '24%' },
                                { path: '/auth/login', views: '4,102', time: '0m 45s', exit: '38%' },
                            ].map((page, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                    <td className="px-10 py-6 font-black text-gray-900 dark:text-white text-sm">{page.path}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.views}</td>
                                    <td className="px-10 py-6 text-sm text-gray-500 font-bold">{page.time}</td>
                                    <td className="px-10 py-6">
                                        <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full uppercase tracking-widest">{page.exit}</span>
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
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
