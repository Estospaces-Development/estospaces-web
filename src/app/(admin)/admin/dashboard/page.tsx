"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    Bell
} from 'lucide-react';

// Mock Data for Platform Health
const healthMetrics = {
    slaCompliance: 94.2, // %
    avgResponseTime: "4m 12s",
    npsScore: 4.8, // out of 5
    activeTransactions: 156
};

// Mock Data for Live Feed
const activityFeed = [
    { id: 1, type: 'lead', message: 'New lead assigned to James Wilson', time: '2 mins ago', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { id: 2, type: 'verification', message: 'Skyline Real Estate verified by Admin', time: '15 mins ago', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 3, type: 'sla_breach', message: 'SLA Warning: Ticket #492 approaching 10m', time: '24 mins ago', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 4, type: 'review', message: '5-star review received for Sarah Chen', time: '1 hour ago', icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState(healthMetrics);

    // Simulate live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                slaCompliance: Math.min(100, Math.max(0, prev.slaCompliance + (Math.random() - 0.5) * 0.5))
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                            Command Center
                        </span>
                        <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                            <Activity size={12} /> System Operational
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                        Platform Health
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                        <Bell size={20} />
                    </button>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg ring-4 ring-white"></div>
                </div>
            </header>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* SLA Compliance */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                <Zap size={24} />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">SLA Compliance</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{stats.slaCompliance.toFixed(1)}%</span>
                            <span className="text-sm font-bold text-emerald-500 flex items-center">
                                <TrendingUp size={14} className="mr-1" /> +2.4%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-2">Responses under 10 mins</p>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${stats.slaCompliance}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Zap size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <Clock size={24} />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Avg Response</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{stats.avgResponseTime}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-2">Global broker average</p>
                        <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg w-fit">
                            TARGET: &lt; 5m 00s
                        </div>
                    </div>
                </div>

                {/* NPS Score */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Star size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <Star size={24} />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Net Promoter</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{stats.npsScore}</span>
                            <span className="text-lg text-gray-300">/ 5.0</span>
                        </div>
                        <div className="flex gap-1 mt-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    size={16}
                                    className={`${i <= Math.round(stats.npsScore) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Transactions */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] shadow-xl shadow-indigo-500/30 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                        <Activity size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/10 rounded-xl text-white backdrop-blur-sm">
                                <Activity size={24} />
                            </div>
                            <span className="text-xs font-black text-indigo-200 uppercase tracking-widest">Live Deals</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{stats.activeTransactions}</span>
                        </div>
                        <p className="text-xs text-indigo-100 font-medium mt-2">Active fast-track flows</p>
                        <button className="mt-5 w-full py-2 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                            View Live Map
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area - Quick Actions & Feed */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Actions Rail */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/40 border border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Zap className="text-indigo-500" size={20} /> Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => router.push('/admin/verifications')}
                                className="group p-4 rounded-2xl bg-gray-50 hover:bg-orange-50 hover:border-orange-100 border border-transparent transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">Verifications</h4>
                                        <p className="text-xs text-gray-500 group-hover:text-orange-600/70">12 Pending Reviews</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-orange-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/properties')}
                                className="group p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Property Hub</h4>
                                        <p className="text-xs text-gray-500 group-hover:text-blue-600/70">Manage Inventory</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-blue-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/users')}
                                className="group p-4 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-100 border border-transparent transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">User Registry</h4>
                                        <p className="text-xs text-gray-500 group-hover:text-emerald-600/70">View Clients</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-emerald-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/chat')}
                                className="group p-4 rounded-2xl bg-gray-50 hover:bg-purple-50 hover:border-purple-100 border border-transparent transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-purple-500 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Support Chat</h4>
                                        <p className="text-xs text-gray-500 group-hover:text-purple-600/70">3 New Messages</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-purple-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="rounded-[2.5rem] bg-gray-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-50 -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-black mb-2">Quarterly Goals</h3>
                                <p className="text-gray-400 text-sm max-w-md mb-6">
                                    The team is on track to hit the Q1 target of 150 verified properties.
                                    Keep monitoring fast-track transaction speeds.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-[10px] font-bold`}>
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">Team Active</span>
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                                    <TrendingUp size={32} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Feed Sidebar */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/40 border border-gray-100 h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Activity className="text-indigo-500" size={20} /> Live Feed
                        </h3>
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>

                    <div className="relative">
                        {/* Connector Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100"></div>

                        <div className="space-y-8">
                            {activityFeed.map((item) => (
                                <div key={item.id} className="relative flex gap-4">
                                    <div className={`relative z-10 w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 border-4 border-white shadow-sm`}>
                                        <item.icon size={18} />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-sm font-bold text-gray-900 leading-snug mb-1">
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

                    <button className="w-full mt-8 py-3 rounded-xl border-2 border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-widest hover:border-indigo-100 hover:text-indigo-600 transition-all">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
}
