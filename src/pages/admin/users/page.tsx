"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus, Clock, CheckCircle, XCircle, Users, Plus,
    Filter, Search, MoreVertical, Eye, Edit, Trash2,
    Mail, Phone, Download, Share2, FileDown, FileSpreadsheet,
    Star, Shield, TrendingUp, UserCheck, Loader2, Power
} from 'lucide-react';

import { userService } from '@/services/userService';
import { getPlatformAnalytics, invalidateAnalyticsCache } from '@/services/analyticsService';
import { User } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useDashboardWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import PaginationBar from '@/components/ui/PaginationBar';
import Avatar from '@/components/ui/Avatar';

function UserManagementContent() {
    const navigate = useNavigate();
    const { success: showToastSuccess, error: showToastError } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionUserId, setActionUserId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const [{ data: userData, error: userError }, { data: analytics, error: analyticsError }] = await Promise.all([
                userService.getAllUsers(),
                getPlatformAnalytics()
            ]);
            if (userError) {
                throw new Error(userError);
            }
            if (analyticsError) {
                throw new Error(analyticsError);
            }
            setUsers(userData || []);
            setStatsData(analytics);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(error.message || 'User registry is not available right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useDashboardWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
        ],
        refresh: async () => {
            invalidateAnalyticsCache('platform_analytics');
            await fetchUsers();
        },
    });

    const handleReviewVerification = (user: User) => {
        if (user.role === 'admin') {
            showToastError('Admin accounts do not have a verification review screen.');
            return;
        }

        const params = new URLSearchParams({
            entity: user.role === 'manager' ? 'manager' : 'user',
        });

        if (user.role === 'manager') {
            params.set('managerId', user.id);
        } else {
            params.set('userId', user.id);
        }

        navigate(`/admin/verifications?${params.toString()}`);
    };

    const handleToggleUserState = async (user: User) => {
        setActionUserId(user.id);
        const { error } = await userService.setUserActiveState(user.id, !user.is_active);
        setActionUserId(null);

        if (error) {
            showToastError(`Failed to ${user.is_active ? 'deactivate' : 'activate'} user: ${error}`);
            return;
        }

        showToastSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
        fetchUsers();
    };

    const stats = [
        { label: 'Network Size', value: statsData?.total_users?.toLocaleString() || '0', icon: Users, color: 'text-blue-500' },
        { label: 'Active Leads', value: statsData?.active_leads?.toLocaleString() || '0', icon: TrendingUp, color: 'text-orange-500' },
        { label: 'Total Brokers', value: statsData?.total_brokers?.toLocaleString() || '0', icon: UserCheck, color: 'text-emerald-500' },
        { label: 'Total Properties', value: statsData?.total_properties?.toLocaleString() || '0', icon: Shield, color: 'text-indigo-500' },
    ];

    const filteredUsers = users.filter(u => {
        const searchLower = searchQuery.toLowerCase();
        const displayName = u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.full_name || '';
        const matchesSearch = u.email.toLowerCase().includes(searchLower) || displayName.toLowerCase().includes(searchLower);
        const matchesTab = activeTab === 'all' || u.role === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedUsers = filteredUsers.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

    const handleExportCSV = () => {
        if (filteredUsers.length === 0) {
            showToastError('No users to export.');
            return;
        }
        const headers = ['Name', 'Email', 'Role', 'Status', 'Joined'];
        const rows = filteredUsers.map(u => {
            const name = u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.full_name || 'No Name';
            return [
                name.replace(/,/g, ' '),
                u.email,
                u.role,
                u.is_active ? 'Active' : 'Deactivated',
                new Date(u.created_at).toLocaleDateString(),
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToastSuccess(`Exported ${filteredUsers.length} users to CSV.`);
    };

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

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
                    <button
                        onClick={() => navigate('/auth/register')}
                        className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    >
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

            {loadError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                    {loadError}
                </div>
            )}

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
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                        >
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
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                userId={user.id}
                                                src={user.avatar_url || user.avatar}
                                                name={user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.full_name || user.email}
                                                size="lg"
                                                shape="rounded"
                                                fallbackClassName="from-emerald-500 to-teal-600"
                                            />
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
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                            <button
                                                onClick={() => handleReviewVerification(user)}
                                                disabled={user.role === 'admin'}
                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 hover:text-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                                            >
                                                <Eye size={16} />
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handleToggleUserState(user)}
                                                disabled={actionUserId === user.id}
                                                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                                                    user.is_active
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                } disabled:opacity-60`}
                                            >
                                                {actionUserId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t bg-gray-50/50 px-10 py-8 dark:border-gray-700 dark:bg-gray-900/20">
                    <PaginationBar
                        currentPage={safeCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredUsers.length}
                        pageSize={PAGE_SIZE}
                        currentItemCount={paginatedUsers.length}
                        itemLabel="members"
                    />
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
