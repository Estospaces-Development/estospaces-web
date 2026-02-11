"use client";

import React, { useState, Suspense } from 'react';
import {
    TrendingUp, Building2, Users, Target, DollarSign, Calendar,
    TrendingDown, AlertCircle, Lightbulb, ArrowUpRight, ArrowDownRight,
    ChevronRight, ArrowLeft, Download, Filter, MousePointer2
} from 'lucide-react';

function AnalyticsContent() {
    const [timeRange, setTimeRange] = useState('6m');

    const stats = [
        { label: 'Total Revenue', value: '£84.2k', change: '+12.5%', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Lead Conversion', value: '24.8%', change: '+5.2%', icon: Target, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Active Listings', value: '142', change: '+8', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50' },
        { label: 'Viewing Ratio', value: '3.2', change: '-2.1%', icon: MousePointer2, color: 'text-purple-500', bg: 'bg-purple-50' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3">
                        Portfolio Analytics
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Real-time insights and predictive analysis of your property portfolio
                    </p>
                </div>
                <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border dark:border-gray-700">
                    {['1m', '3m', '6m', '1y'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === range
                                ? 'bg-orange-500 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none group hover:scale-[1.05] transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${stat.bg} dark:bg-gray-700 ${stat.color}`}>
                                <stat.icon size={28} />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full ${stat.change.startsWith('+') ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                                }`}>
                                {stat.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-2">{stat.label}</p>
                        <h3 className="text-4xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Revenue Chart Area */}
                <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-[3rem] p-10 shadow-2xl border dark:border-gray-700">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Revenue Trend</h2>
                            <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Monthly Earnings in GBP</p>
                        </div>
                        <button className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl group hover:bg-orange-500 transition-all shadow-sm">
                            <Download size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Custom SVG Chart */}
                    <div className="relative h-80 w-full mb-8">
                        <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            {[0, 1, 2, 3].map((i) => (
                                <line key={i} x1="0" y1={i * 100} x2="1000" y2={i * 100} stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" />
                            ))}

                            {/* Revenue Line with Gradient Area */}
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            <path
                                d="M0,250 Q100,220 200,180 T400,150 T600,100 T800,80 T1000,40 L1000,300 L0,300 Z"
                                fill="url(#areaGradient)"
                            />
                            <path
                                d="M0,250 Q100,220 200,180 T400,150 T600,100 T800,80 T1000,40"
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="5"
                                strokeLinecap="round"
                                className="animate-in fade-in duration-1000 slide-in-from-left-4"
                            />

                            {/* Data Points */}
                            {[0, 200, 400, 600, 800, 1000].map((x, i) => (
                                <circle key={i} cx={x} cy={250 - (i * 40)} r="8" fill="white" stroke="#f97316" strokeWidth="4" className="hover:r-12 transition-all cursor-pointer shadow-lg" />
                            ))}
                        </svg>

                        {/* Tooltip Overlay Example */}
                        <div className="absolute top-10 left-[600px] bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in zoom-in duration-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">May 2024</p>
                            <p className="text-lg font-black leading-tight">£14,250.00</p>
                        </div>
                    </div>

                    <div className="flex justify-between px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                    </div>
                </div>

                {/* Market Analysis Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-orange-500 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                                <Lightbulb size={24} />
                            </div>
                            <h3 className="text-2xl font-black mb-4 leading-tight">Predictive Insight</h3>
                            <p className="text-orange-50 font-bold mb-8 opacity-90">Rental rates in <span className="underline decoration-2">Central London</span> are projected to rise by <span className="text-2xl font-black">4.2%</span> over the next quarter.</p>
                            <button className="w-full py-4 bg-white text-orange-600 font-black rounded-2xl shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2">
                                Full Forecast <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 shadow-xl border dark:border-gray-700">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Lead Distribution</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Organic Search', value: 45, color: 'bg-orange-500' },
                                { label: 'Social Media', value: 28, color: 'bg-blue-500' },
                                { label: 'Referrals', value: 15, color: 'bg-green-500' },
                                { label: 'Direct', value: 12, color: 'bg-purple-500' },
                            ].map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                        <span className="text-gray-500">{item.label}</span>
                                        <span className="text-gray-900 dark:text-white">{item.value}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Property Performance Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-8 border-b dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-900/20">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Property Performance</h2>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
                            <Filter size={16} /> Filters
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
                            <Download size={16} /> Export
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                <th className="px-10 py-6">Property</th>
                                <th className="px-10 py-6">Views</th>
                                <th className="px-10 py-6">Leads</th>
                                <th className="px-10 py-6">Inquiries</th>
                                <th className="px-10 py-6">Conversion</th>
                                <th className="px-10 py-6 text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {[
                                { name: 'Modern Downtown Penthouse', views: '2.4k', leads: 42, inquiries: 156, conv: '1.8%', trend: '+12%' },
                                { name: 'Luxury Villa Garden Estate', views: '1.8k', leads: 38, inquiries: 92, conv: '2.1%', trend: '+8%' },
                                { name: 'Skyline Studio Apartment', views: '3.2k', leads: 64, inquiries: 210, conv: '2.0%', trend: '-4%' },
                                { name: 'Riverfront Living Space', views: '1.2k', leads: 22, inquiries: 45, conv: '1.6%', trend: '+15%' },
                            ].map((row, i) => (
                                <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                    <td className="px-10 py-7 font-black text-gray-900 dark:text-white">{row.name}</td>
                                    <td className="px-10 py-7 font-bold text-gray-500">{row.views}</td>
                                    <td className="px-10 py-7 font-bold text-gray-500">{row.leads}</td>
                                    <td className="px-10 py-7 font-bold text-gray-500">{row.inquiries}</td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 max-w-[60px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500" style={{ width: `${parseFloat(row.conv) * 30}%` }}></div>
                                            </div>
                                            <span className="font-black text-gray-900 dark:text-white text-xs">{row.conv}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7 text-right">
                                        <span className={`font-black text-xs ${row.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                            {row.trend}
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

export default function ManagerAnalyticsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
