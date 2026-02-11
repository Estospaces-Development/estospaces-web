"use client";

import React, { useState, Suspense } from 'react';
import {
    FileText, Clock, CheckCircle, XCircle, FileCheck, Plus, Filter,
    Search, Eye, Edit, Trash2, Mail, Phone, Download, Share2,
    FileDown, FileSpreadsheet, Loader2, MoreVertical, ChevronRight,
    ArrowUpRight, TrendingUp, Users, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Application {
    id: string;
    name: string;
    email: string;
    phone?: string;
    propertyInterested: string;
    status: string;
    score: number;
    budget: string;
    lastContact: string;
}

const MOCK_APPLICATIONS: Application[] = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+44 7700 900123', propertyInterested: 'Modern Downtown Studio', status: 'New', score: 92, budget: '£1,200/mo', lastContact: '2h ago' },
    { id: '2', name: 'Michael Chen', email: 'm.chen@email.com', phone: '+44 7700 900456', propertyInterested: 'Luxury 2BR Apartment', status: 'In Review', score: 85, budget: '£2,500/mo', lastContact: '1d ago' },
    { id: '3', name: 'Emma Wilson', email: 'emma.w@email.com', phone: '+44 7700 900789', propertyInterested: 'Camden Penthouse', status: 'Approved', score: 95, budget: '£4,800/mo', lastContact: '3h ago' },
    { id: '4', name: 'James Taylor', email: 'j.taylor@email.com', phone: '+44 7700 900321', propertyInterested: 'Greenwich Flat', status: 'Pending Docs', score: 78, budget: '£1,750/mo', lastContact: '5h ago' },
];

function ApplicationsContent() {
    const { user } = useAuth();
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);

    const getStatusConfig = (status: string) => {
        const configs: any = {
            'New': { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', icon: FileText },
            'In Review': { color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', icon: Clock },
            'Approved': { color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: CheckCircle },
            'Rejected': { color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: XCircle },
            'Pending Docs': { color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', icon: FileCheck },
        };
        return configs[status] || { color: 'text-gray-600 bg-gray-50', icon: FileText };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3">
                        Applications
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Manage and track property applications across your portfolio
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                        <Plus size={18} /> New Application
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Pending', value: '24', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Approved', value: '156', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Waitlist', value: '42', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Avg. Score', value: '88%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} dark:bg-gray-700 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                <ArrowUpRight size={12} /> +12%
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                {/* Filter Bar */}
                <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search applicants, emails or properties..."
                            className="w-full bg-white dark:bg-gray-800 border-2 border-transparent dark:border-gray-700 focus:border-orange-500 rounded-2xl pl-14 pr-6 py-4 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                        {['all', 'New', 'In Review', 'Approved', 'Pending Docs'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === f
                                    ? 'bg-orange-500 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border dark:border-gray-600'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-10 py-5">Applicant</th>
                                <th className="px-10 py-5">Property Interested</th>
                                <th className="px-10 py-5">Status</th>
                                <th className="px-10 py-5">Credit Score</th>
                                <th className="px-10 py-5">Last Activity</th>
                                <th className="px-10 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {MOCK_APPLICATIONS.map((app) => {
                                const config = getStatusConfig(app.status);
                                return (
                                    <tr key={app.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                                                    {app.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 dark:text-white leading-none mb-1">{app.name}</p>
                                                    <p className="text-xs text-gray-500 font-bold">{app.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">{app.propertyInterested}</p>
                                            <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{app.budget}</p>
                                        </td>
                                        <td className="px-10 py-7">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${config.color}`}>
                                                <config.icon size={14} />
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[80px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${app.score > 90 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${app.score}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-black text-gray-700 dark:text-gray-300">{app.score}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                                <Calendar size={14} className="text-gray-400" />
                                                {app.lastContact}
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-all rounded-xl">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all rounded-xl">
                                                    <Edit size={18} />
                                                </button>
                                                <button className="p-3 text-gray-400 hover:text-gray-900 transition-colors">
                                                    <MoreVertical size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Shadow Footer */}
                <div className="px-10 py-6 bg-gray-50/50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex items-center justify-between">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Showing 4 of 24 applications</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-xs font-black disabled:opacity-50">Prev</button>
                        <button className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-xs font-black">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ManagerApplicationsPage() {
    return (
        <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Applications...</div>}>
            <ApplicationsContent />
        </Suspense>
    );
}
