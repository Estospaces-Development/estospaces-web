"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    User,
    Building2,
    Search,
    RefreshCw,
    FileText,
    Eye,
    AlertCircle,
    LayoutDashboard,
    TrendingUp,
    LogOut,
    ExternalLink,
    Users,
    Briefcase,
    Sparkles,
    ArrowRight,
    Filter,
    MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as managerVerificationService from '@/services/managerVerificationService';
import type { ManagerProfile, VerificationStatus } from '@/services/managerVerificationService';
import ManagerReviewModal from '@/components/admin/ManagerReviewModal';

type TabType = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

interface ManagerWithUser extends ManagerProfile {
    user_email?: string;
    user_name?: string;
}

const AdminVerificationDashboard: React.FC = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [managers, setManagers] = useState<ManagerWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [counts, setCounts] = useState({
        all: 0,
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
    });

    const handleLogout = async () => {
        try {
            if (supabase) await supabase.auth.signOut();
            localStorage.clear();
            router.push('/admin/login');
        } catch {
            localStorage.clear();
            router.push('/admin/login');
        }
    };

    const fetchManagers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const statusMap: Record<TabType, VerificationStatus | undefined> = {
                pending: 'submitted',
                under_review: 'under_review',
                approved: 'approved',
                rejected: 'rejected',
                all: undefined,
            };

            const status = statusMap[activeTab];
            const allStatuses = activeTab === 'all';

            const result = await managerVerificationService.getPendingVerifications(status, allStatuses);

            if (result.error) {
                setError(result.error);
                // Fallback for demo if service fails or DB is empty
                if (result.error.includes('fetch') || result.error.includes('network')) {
                    setManagers([]);
                }
            } else {
                setManagers(result.data || []);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const fetchCounts = useCallback(async () => {
        try {
            const [all, pending, underReview, approved, rejected] = await Promise.all([
                managerVerificationService.getPendingVerifications(undefined, true), // all statuses
                managerVerificationService.getPendingVerifications('submitted'),
                managerVerificationService.getPendingVerifications('under_review'),
                managerVerificationService.getPendingVerifications('approved'),
                managerVerificationService.getPendingVerifications('rejected'),
            ]);
            setCounts({
                all: all.data?.length || 0,
                pending: pending.data?.length || 0,
                under_review: underReview.data?.length || 0,
                approved: approved.data?.length || 0,
                rejected: rejected.data?.length || 0,
            });
        } catch (err) {
            console.error('Error fetching counts:', err);
        }
    }, []);

    useEffect(() => { fetchManagers(); }, [fetchManagers]);
    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchManagers(), fetchCounts()]);
        setRefreshing(false);
    };

    const filteredManagers = managers.filter(manager => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (manager.user_name || '').toLowerCase().includes(query) ||
            (manager.user_email || '').toLowerCase().includes(query) ||
            (manager.license_number || '').toLowerCase().includes(query) ||
            (manager.company_registration_number || '').toLowerCase().includes(query)
        );
    });

    const getStatusConfig = (status: VerificationStatus) => {
        const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
            approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Approved' },
            rejected: { bg: 'bg-red-500/10', text: 'text-red-600', dot: 'bg-red-500', label: 'Rejected' },
            under_review: { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500', label: 'In Review' },
            submitted: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Pending' },
            verification_required: { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500', label: 'Update Needed' },
            incomplete: { bg: 'bg-gray-500/10', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Incomplete' },
        };
        return configs[status] || configs.incomplete;
    };

    const statCards = [
        { id: 'pending', label: 'Pending', count: counts.pending, icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
        { id: 'under_review', label: 'In Review', count: counts.under_review, icon: Eye, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
        { id: 'approved', label: 'Approved', count: counts.approved, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
        { id: 'rejected', label: 'Rejected', count: counts.rejected, icon: XCircle, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <Shield className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-900">Verifications</h1>
                                <p className="text-xs text-gray-500">Manager Review Portal</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/admin/chat')}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
                            >
                                <LayoutDashboard size={16} />
                                <span className="hidden sm:inline">Dashboard</span>
                            </button>
                            <button
                                onClick={() => router.push('/admin/analytics')}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
                            >
                                <TrendingUp size={16} />
                                <span className="hidden sm:inline">Analytics</span>
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-2" />
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        const isActive = activeTab === stat.id;
                        return (
                            <button
                                key={stat.id}
                                onClick={() => setActiveTab(stat.id as TabType)}
                                className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${isActive
                                        ? 'bg-white shadow-xl shadow-gray-200/50 ring-2 ring-gray-900 scale-[1.02]'
                                        : 'bg-white/60 hover:bg-white hover:shadow-lg border border-gray-100'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                        <Icon className="text-white" size={20} />
                                    </div>
                                    {isActive && (
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                                </div>
                                {isActive && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Main Panel */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 sm:p-6 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'all'
                                            ? 'bg-gray-900 text-white shadow-lg'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    All ({counts.all})
                                </button>
                                <div className="h-6 w-px bg-gray-200" />
                                <div className="flex items-center gap-1">
                                    {statCards.map(stat => (
                                        <button
                                            key={stat.id}
                                            onClick={() => setActiveTab(stat.id as TabType)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === stat.id
                                                    ? 'bg-gray-100 text-gray-900'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {stat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, email..."
                                        className="pl-10 pr-4 py-2.5 w-64 text-sm bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                            <AlertCircle className="text-red-500" size={20} />
                            <p className="text-sm text-red-700 flex-1">{error}</p>
                            <button onClick={handleRefresh} className="text-sm font-medium text-red-600 hover:underline">
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="py-24 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
                                <RefreshCw className="text-gray-400 animate-spin" size={28} />
                            </div>
                            <p className="text-gray-500 font-medium">Loading applications...</p>
                        </div>
                    ) : filteredManagers.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 mb-4">
                                <Sparkles className="text-gray-300" size={36} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications found</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                {searchQuery ? 'Try adjusting your search terms' : 'There are no verification requests in this category yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredManagers.map((manager, index) => {
                                const statusConfig = getStatusConfig(manager.verification_status);
                                const isBroker = manager.profile_type === 'broker';

                                return (
                                    <div
                                        key={manager.id}
                                        className="group px-6 py-5 hover:bg-gray-50/50 transition-all cursor-pointer"
                                        onClick={() => setSelectedManagerId(manager.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isBroker
                                                    ? 'bg-gradient-to-br from-orange-400 to-red-500'
                                                    : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                                }`}>
                                                {isBroker ? (
                                                    <User className="text-white" size={22} />
                                                ) : (
                                                    <Building2 className="text-white" size={22} />
                                                )}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${statusConfig.dot}`} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900 truncate">
                                                        {manager.user_name ||
                                                            manager.user_email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ||
                                                            `Manager ${manager.id.slice(0, 8)}`}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="truncate">{manager.user_email || manager.id.slice(0, 8) + '...'}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="hidden sm:inline font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                        {manager.license_number || manager.company_registration_number || 'No license'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Type Badge */}
                                            <div className="hidden md:block">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isBroker ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {isBroker ? <Briefcase size={12} /> : <Building2 size={12} />}
                                                    {isBroker ? 'Broker' : 'Company'}
                                                </span>
                                            </div>

                                            {/* Date */}
                                            <div className="hidden lg:block text-right">
                                                <p className="text-xs text-gray-400">Submitted</p>
                                                <p className="text-sm font-medium text-gray-700">
                                                    {manager.submitted_at
                                                        ? new Date(manager.submitted_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })
                                                        : '—'}
                                                </p>
                                            </div>

                                            {/* Action */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedManagerId(manager.id);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                            >
                                                Review
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    {!loading && filteredManagers.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-900">{filteredManagers.length}</span> of{' '}
                                <span className="font-medium text-gray-900">{counts.all}</span> applications
                            </p>
                            <button
                                onClick={() => setActiveTab('all')}
                                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                            >
                                View all →
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {selectedManagerId && (
                <ManagerReviewModal
                    managerId={selectedManagerId}
                    onClose={() => {
                        setSelectedManagerId(null);
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
};

export default AdminVerificationDashboard;
