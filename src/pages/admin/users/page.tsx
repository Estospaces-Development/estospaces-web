"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
    UserPlus, Clock, CheckCircle, XCircle, Users, Plus,
    Filter, Search, MoreVertical, Eye, Edit, Trash2,
    Mail, Phone, Download, Share2, FileDown, FileSpreadsheet,
    Star, Shield, ArrowRight, TrendingUp, UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { userService } from '@/services/userService';
import { getPlatformAnalytics } from '@/services/analyticsService';
import { User } from '@/types';
import { useToast } from '@/contexts/ToastContext';

function UserManagementContent() {
    const { user: currentUser } = useAuth();
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<any>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const [{ data: userData }, { data: analytics }] = await Promise.all([
                userService.getAllUsers(),
                getPlatformAnalytics()
            ]);
            setUsers(userData || []);
            setStatsData(analytics);
        } catch (error) {
            console.error('[UserManagement] Load Error:', error);
            toast.error('Failed to load user registry');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const stats = [
        { label: 'Network Size', value: statsData?.total_users?.toLocaleString() || '0', icon: Users, color: 'text-blue-500' },
        { label: 'Active Leads', value: statsData?.active_leads?.toLocaleString() || '0', icon: TrendingUp, color: 'text-orange-500' },
        { label: 'Total Brokers', value: statsData?.total_brokers?.toLocaleString() || '0', icon: UserCheck, color: 'text-emerald-500' },
        { label: 'Verified Props', value: statsData?.total_properties?.toLocaleString() || '0', icon: Shield, color: 'text-indigo-500' },
    ];

    const filteredUsers = users.filter(u => {
        const searchLower = searchQuery.toLowerCase();
        const displayName = u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.full_name || '';
        const matchesSearch = u.email.toLowerCase().includes(searchLower) || displayName.toLowerCase().includes(searchLower);
        const matchesTab = activeTab === 'all' || u.role === activeTab;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Relationship Hub</span>
                        <span className="text-gray-400 text-xs font-bold">Client & Lead Management</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        Global Registry
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search database..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm w-64 shadow-sm transition-all"
                        />
                    </div>
                    <button className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2">
                        <UserPlus size={18} /> Add User
                    </button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none flex items-center gap-6 group hover:translate-y-[-4px] transition-all">
                        <div className={`p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-1 mb-2 uppercase tracking-widest leading-none">{stat.label}</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-none">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Registry Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-8 border-b dark:border-gray-700 flex items-center justify-between">
                    <div className="flex gap-8">
                        {['all', 'admin', 'manager', 'user'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-xs font-black uppercase tracking-widest pb-2 transition-all border-b-2 ${activeTab === tab ? 'border-emerald-50 text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
                            <Download size={16} /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enquiry Target</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Engagement</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            {(user.avatar_url || user.avatar) ? (
                                                <img src={user.avatar_url || user.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-black text-lg">
                                                    {user.first_name?.charAt(0) || user.email.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-gray-900 dark:text-white text-sm">
                                                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.full_name || 'No Name'}
                                                </p>
                                                <p className="text-xs text-gray-400 font-bold">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-black text-gray-900 dark:text-white capitalize">{user.role}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Ref: #U-{user.id.substring(0, 6)}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                                            {user.is_active ? 'Active' : 'Deactivated'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-emerald-500 transition-all"><Eye size={18} /></button>
                                            <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-500 transition-all"><Edit size={18} /></button>
                                            <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-10 py-8 border-t dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Showing {filteredUsers.length} of {statsData?.total_users || 0} Members</p>
                    <div className="flex gap-2">
                        <button className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-30" disabled>
                            <ArrowRight size={18} className="rotate-180" />
                        </button>
                        <button className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminUserManagementPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading User Directory...</div>}>
            <UserManagementContent />
        </Suspense>
    );
}
