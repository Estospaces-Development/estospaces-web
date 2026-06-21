"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Bell,
    Shield,
    Users,
    Building2,
    Clock,
    TrendingUp,
    MessageSquare,
    Zap,
    ArrowRight,
    Loader2,
    FileText,
    Info,
    ClipboardList,
    Calendar,
    Search,
    X,
} from 'lucide-react';
import { getPlatformAnalytics, invalidateAnalyticsCache, AnalyticsData } from '@/services/analyticsService';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useDashboardWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { buildAdminDashboardSnapshot, type AdminAnalyticsIconKey } from '@/lib/adminPlatformAnalytics';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    getNotificationNavigationPath,
    NOTIFICATION_TYPES,
    type Notification,
} from '@/services/notificationsService';
import { getNotificationIconColorClass, getNotificationTone } from '@/lib/notificationVisuals';
import { getLaunchSafeNotificationCopy } from '@/lib/notificationLaunchCopy';

const snapshotIconMap: Record<AdminAnalyticsIconKey, React.ComponentType<{ size?: number }>> = {
    activity: Activity,
    building: Building2,
    eye: Activity,
    file: FileText,
    trending: TrendingUp,
    users: Users,
    zap: Shield,
};

const formatNotificationTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const getNotificationIcon = (notification: Notification) => {
    const { type } = notification;
    const iconClass = getNotificationIconColorClass(notification);
    const tone = getNotificationTone(notification);

    switch (type) {
        case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
        case NOTIFICATION_TYPES.PROFILE_VERIFIED:
        case NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED:
            return <Shield size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        case NOTIFICATION_TYPES.APPLICATION_UPDATE:
        case NOTIFICATION_TYPES.APPLICATION_APPROVED:
        case NOTIFICATION_TYPES.APPLICATION_REJECTED:
        case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED:
        case NOTIFICATION_TYPES.CONTRACT_UPDATE:
        case NOTIFICATION_TYPES.CONTRACT_EXPIRING:
            return <FileText size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        case NOTIFICATION_TYPES.TICKET_RESPONSE:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED:
            return <MessageSquare size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.APPOINTMENT_APPROVED:
        case NOTIFICATION_TYPES.APPOINTMENT_REJECTED:
        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        case NOTIFICATION_TYPES.VIEWING_BOOKED:
        case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
        case NOTIFICATION_TYPES.VIEWING_COMPLETED:
        case NOTIFICATION_TYPES.VIEWING_CANCELLED:
        case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
            return <Calendar size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
        case NOTIFICATION_TYPES.PAYMENT_FAILED:
            return <FileText size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.PROPERTY_SAVED:
        case NOTIFICATION_TYPES.PROPERTY_SELECTED:
        case NOTIFICATION_TYPES.PRICE_DROP:
        case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
        case NOTIFICATION_TYPES.PROPERTY_AVAILABLE:
        case NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE:
            return <Building2 size={16} className={iconClass} />;
        case NOTIFICATION_TYPES.FAST_TRACK_STARTED:
        case NOTIFICATION_TYPES.FAST_TRACK_UPDATED:
        case NOTIFICATION_TYPES.FAST_TRACK_COMPLETED:
        case NOTIFICATION_TYPES.SALE_JOURNEY_UPDATED:
        case NOTIFICATION_TYPES.SALE_JOURNEY_COMPLETED:
            return <Zap size={16} className={iconClass} />;
        default:
            if (tone === 'orange') {
                return <Building2 size={16} className={iconClass} />;
            }
            return <Info size={16} className={iconClass} />;
    }
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recentNotificationSearch, setRecentNotificationSearch] = useState('');
    const {
        notifications,
        loading: notificationsLoading,
        markAsRead,
    } = useNotifications();

    const fetchAnalytics = useCallback(async (forceRefresh = false, silent = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            if (forceRefresh) {
                invalidateAnalyticsCache('platform_analytics');
            }

            const result = await getPlatformAnalytics(forceRefresh);
            if (result.data) {
                setData(result.data);
                setError(null);
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchAnalytics();
    }, [fetchAnalytics]);

    useDashboardWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.ADMIN_PROPERTIES,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.MESSAGES,
            WORKSPACE_SYNC_TAGS.SUPPORT,
        ],
        refresh: () => fetchAnalytics(true, true),
    });

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 lg:p-10">
                <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
                <p className="text-gray-500 font-medium">Initializing Command Center...</p>
            </div>
        );
    }

    // Map values from backend
    const stats = {
        slaCompliance: data?.sla_success_rate || 0,
        avgResponseTime: data?.avg_response_time ? `${Math.floor(data.avg_response_time / 60)}m ${Math.round(data.avg_response_time % 60)}s` : "0m 0s",
        pendingVerifications: data?.pending_verifications || 0,
        activeTransactions: data?.leadAnalytics?.totalLeads || data?.active_leads || 0
    };

    const platformSnapshot = buildAdminDashboardSnapshot(data);

    const recentNotificationSearchTerm = recentNotificationSearch.trim().toLowerCase();
    const recentNotifications = [...notifications]
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .filter((notification) => {
            if (!recentNotificationSearchTerm) {
                return true;
            }

            const displayCopy = getLaunchSafeNotificationCopy(notification);
            return [
                displayCopy.title,
                displayCopy.message,
                notification.type,
                formatNotificationTime(notification.created_at),
            ].join(' ').toLowerCase().includes(recentNotificationSearchTerm);
        })
        .slice(0, 5);
    const hasRecentNotificationSearch = recentNotificationSearchTerm.length > 0;

    const handleRecentNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        const targetPath = getNotificationNavigationPath(notification, 'admin') || '/admin/verifications';
        navigate(targetPath);
    };

    return (
        <div className="min-h-screen p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-700 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20">
                            Command Center
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center gap-1">
                            <Activity size={12} /> Backend Synced
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                        Platform Health
                    </h1>
                </div>
            </header>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* SLA Compliance */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Zap size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">SLA Compliance</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.slaCompliance.toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-2">Responses under 10 mins</p>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${stats.slaCompliance}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Zap size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                <Clock size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Avg Response</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.avgResponseTime}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-2">Global broker average</p>
                    </div>
                </div>

                {/* Pending Verifications */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <Shield size={100} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
                                <Shield size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Pending Verifications</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingVerifications}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-2">Awaiting admin review</p>
                    </div>
                </div>

                {/* Active Transactions */}
                <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                        <Activity size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/10 rounded-xl text-white backdrop-blur-sm">
                                <Activity size={24} />
                            </div>
                            <span className="text-xs font-bold text-orange-100 uppercase tracking-widest">Live Deals</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{stats.activeTransactions}</span>
                        </div>
                        <p className="text-xs text-orange-100 font-medium mt-2">Active fast-track flows</p>
                        <button
                            onClick={() => navigate('/admin/fast-track')}
                            className="mt-5 w-full py-2 bg-white text-orange-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-orange-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            Open Fast-Track Queue <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area - Quick Actions & Feed */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Actions Rail */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Zap className="text-orange-500" size={20} /> Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => navigate('/admin/verifications')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Verifications</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-orange-700/80 dark:group-hover:text-orange-300/80">{data?.pending_verifications || 0} Pending Reviews</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-orange-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/properties')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Property Hub</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-blue-700/80 dark:group-hover:text-blue-300/80">Manage Inventory</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-blue-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/users')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">User Registry</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-emerald-700/80 dark:group-hover:text-emerald-300/80">View Clients</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-emerald-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/help')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/10 border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-purple-500 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Help & Support</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-purple-700/80 dark:group-hover:text-purple-300/80">Ticket queue and live replies</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-purple-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/research')}
                                className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Observational Research</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-orange-700/80 dark:group-hover:text-orange-300/80">Shadow journeys and review friction</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-orange-500">
                                    <ArrowRight size={16} />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="rounded-2xl bg-gray-900 dark:bg-black p-8 text-white relative overflow-hidden border border-white/10 dark:border-gray-800">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-orange-600 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-2 text-white">Quarterly Goals</h2>
                                <p className="text-gray-200 text-sm max-w-md mb-6">
                                    Platform status summary:
                                    {` ${data?.total_properties || 0} `}verified properties,
                                    {` ${data?.total_brokers || 0} `}brokers, and
                                    {` ${stats.activeTransactions} `}active lead transactions.
                                </p>
                                <span className="inline-flex text-xs font-bold text-gray-200 bg-gray-800 px-3 py-1.5 rounded-lg">
                                    Live backend metrics
                                </span>
                            </div>
                            <div className="hidden sm:block">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <TrendingUp size={32} className="text-orange-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Platform Snapshot */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Activity className="text-orange-500" size={20} /> Platform Snapshot
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">Core Service</span>
                        </div>

                        <div className="space-y-4">
                            {platformSnapshot.map((item) => {
                                const SnapshotIcon = snapshotIconMap[item.icon];

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`rounded-lg bg-white dark:bg-gray-900 p-2 ${item.color}`}>
                                                <SnapshotIcon size={16} />
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-6 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Snapshot data is loaded from <code>/api/v1/admin/analytics</code>.
                        </p>
                    </div>

                    <div
                        id="recent-notifications"
                        className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 h-fit"
                    >
                        <div className="flex items-center justify-between mb-6 gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Bell className="text-orange-500" size={20} /> Recent Notifications
                                </h2>
                                <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    New verification submissions and platform alerts land here first.
                                </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                {recentNotifications.length} Recent
                            </span>
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="recent-notification-search"
                                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300"
                            >
                                Search recent notifications
                            </label>
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    id="recent-notification-search"
                                    type="search"
                                    value={recentNotificationSearch}
                                    onChange={(event) => setRecentNotificationSearch(event.target.value)}
                                    aria-label="Search recent notifications"
                                    placeholder="Search recent notifications"
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100 dark:border-gray-800 dark:bg-gray-800/70 dark:text-white dark:focus:border-orange-700 dark:focus:bg-gray-900 dark:focus:ring-orange-950"
                                />
                                {recentNotificationSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setRecentNotificationSearch('')}
                                        aria-label="Clear recent notification search"
                                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {notificationsLoading && recentNotifications.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                                <Loader2 size={20} className="mx-auto mb-3 animate-spin text-orange-500" />
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Loading recent notifications...
                                </p>
                            </div>
                        ) : recentNotifications.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                                    <Bell size={18} />
                                </div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {hasRecentNotificationSearch
                                        ? 'No recent notifications match this search'
                                        : 'No recent notifications'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {hasRecentNotificationSearch
                                        ? 'Try another title, type, message, or time keyword.'
                                        : 'New user and manager verification submissions will appear here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentNotifications.map((notification) => {
                                    const displayCopy = getLaunchSafeNotificationCopy(notification);

                                    return (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleRecentNotificationClick(notification)}
                                            className={`w-full rounded-xl border px-4 py-4 text-left transition-all hover:shadow-sm ${
                                                notification.is_read
                                                    ? 'border-gray-100 bg-gray-50/70 hover:border-gray-200 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:border-gray-700'
                                                    : 'border-orange-100 bg-orange-50/60 hover:border-orange-200 dark:border-orange-900/40 dark:bg-orange-900/10 dark:hover:border-orange-800/60'
                                            }`}
                                        >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-900">
                                                {getNotificationIcon(notification)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-start gap-2">
                                                            <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                                                                {displayCopy.title}
                                                            </p>
                                                            {!notification.is_read && (
                                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                                            {displayCopy.message}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                                        {formatNotificationTime(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

