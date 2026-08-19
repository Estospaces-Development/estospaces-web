"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BadgeCheck,
    Clock,
    FileText,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    VerificationScope,
    UserVerificationInfo,
    getPendingUserVerifications,
} from '@/services/userVerificationService';
import UserVerificationReviewModal from '@/components/verification/UserVerificationReviewModal';
import Avatar from '@/components/ui/Avatar';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    getUserVerificationQueueStats,
    getUserVerificationWorkflowStatus,
    getUserVerificationWorkflowStatusLabel,
    userMatchesVerificationTab,
    type UserVerificationQueueTab,
    type UserVerificationWorkflowStatus,
} from '@/lib/userVerificationQueue';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';

type TabType = UserVerificationQueueTab;

interface UserVerificationQueueProps {
    scope: VerificationScope;
    initialSelectedUserId?: string | null;
    onSelectionCleared?: () => void;
}

const scopeContent = {
    admin: {
        badge: 'Admin Review',
        badgeClass: 'bg-orange-500 shadow-orange-500/20',
        accentText: 'text-orange-500',
        accentRing: 'focus:ring-orange-500/10',
        focusText: 'group-focus-within:text-orange-500',
        activeBorder: 'border-orange-500',
        actionHover: 'hover:bg-orange-500',
        title: 'User Verification',
        description: 'Review submitted identity and proof of address documents',
    },
    manager: {
        badge: 'Manager Portal',
        badgeClass: 'bg-blue-700 shadow-blue-700/20',
        accentText: 'text-blue-500',
        accentRing: 'focus:ring-blue-500/10',
        focusText: 'group-focus-within:text-blue-500',
        activeBorder: 'border-blue-500',
        actionHover: 'hover:bg-blue-500',
        title: 'User Verification',
        description: 'Review users connected to your properties and leads',
    },
} as const;

const userWorkflowStatusStyles: Record<UserVerificationWorkflowStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
    review: { bg: 'bg-blue-100', text: 'text-blue-800' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

const UserVerificationQueue: React.FC<UserVerificationQueueProps> = ({
    scope,
    initialSelectedUserId = null,
    onSelectionCleared,
}) => {
    const content = scopeContent[scope];
    const isAdmin = scope === 'admin';
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'recent' | 'name' | 'leads'>('recent');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [users, setUsers] = useState<UserVerificationInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchUsers = useCallback(async (options: { background?: boolean } = {}) => {
        const isBackground = options.background === true;
        try {
            if (!isBackground) {
                setLoading(true);
            }
            const { data, error } = await getPendingUserVerifications(scope);
            if (error) {
                throw new Error(error);
            }
            setUsers(data || []);
            setLoadError(null);
        } catch (err: any) {
            setLoadError(err.message || 'Failed to load verification queue');
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
            setIsRefreshing(false);
        }
    }, [scope]);

    useEffect(() => {
        fetchUsers({ background: false });
    }, [fetchUsers]);

    useWorkflowWorkspaceRefresh({
        tags: scope === 'admin'
            ? [
                WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
                WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            ]
            : [
                WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                WORKSPACE_SYNC_TAGS.USER_VERIFICATIONS,
                WORKSPACE_SYNC_TAGS.MANAGER_VERIFICATION,
            ],
        refresh: () => fetchUsers({ background: true }),
    });

    useEffect(() => {
        if (initialSelectedUserId) {
            setSelectedUserId(initialSelectedUserId);
        }
    }, [initialSelectedUserId]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchUsers({ background: true });
    };

    const stats = useMemo(() => {
        const queueStats = getUserVerificationQueueStats(users);

        return [
            { id: 'all', label: 'All Users', count: queueStats.all, icon: User, color: 'text-gray-500', bg: 'bg-gray-50' },
            { id: 'pending', label: 'Pending', count: queueStats.pending, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50' },
            { id: 'review', label: 'In Review', count: queueStats.inReview, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
            { id: 'approved', label: 'Approved', count: queueStats.approved, icon: BadgeCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ];
    }, [users]);

    const filteredUsers = useMemo(() => {
        const searchLower = searchQuery.trim().toLowerCase();
        const matchedUsers = users.filter((user) => {
            if (!userMatchesVerificationTab(user, activeTab)) {
                return false;
            }

            if (!searchLower) {
                return true;
            }

            return (
                user.full_name.toLowerCase().includes(searchLower)
                || user.email.toLowerCase().includes(searchLower)
                || (user.phone || '').toLowerCase().includes(searchLower)
            );
        });

        return [...matchedUsers].sort((left, right) => {
            if (sortMode === 'name') {
                return left.full_name.localeCompare(right.full_name);
            }
            if (sortMode === 'leads') {
                return (right.pending_leads || 0) - (left.pending_leads || 0);
            }

            return new Date(right.last_active || right.created_at).getTime()
                - new Date(left.last_active || left.created_at).getTime();
        });
    }, [activeTab, searchQuery, sortMode, users]);
    const userCardKeyFor = createDuplicateSafeKeyResolver(`${scope}-verification-user`);

    return (
        <div data-testid="user-verification-queue" className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${content.badgeClass}`}>
                            {content.badge}
                        </span>
                        <span className="text-gray-400 text-xs font-bold">Verification Queue</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        {content.title}
                    </h1>
                    <p className="text-gray-500 mt-2">{content.description}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors ${content.focusText}`} size={18} />
                        <input
                            type="text"
                            aria-label="Search users"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className={`pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 font-bold text-sm w-64 shadow-sm transition-all ${content.accentRing}`}
                        />
                    </div>
                    <label className="sr-only" htmlFor={`${scope}-verification-sort`}>Sort verification queue</label>
                    <select
                        id={`${scope}-verification-sort`}
                        value={sortMode}
                        onChange={(event) => setSortMode(event.target.value as 'recent' | 'name' | 'leads')}
                        className="rounded-2xl border bg-white px-4 py-4 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                        <option value="recent">Recent activity</option>
                        <option value="name">Name</option>
                        <option value="leads">Pending leads</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        aria-label="Refresh verification queue"
                        title="Refresh verification queue"
                        className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 hover:scale-105 transition-all text-gray-600 dark:text-gray-400"
                    >
                        {isRefreshing ? <BrandLoader size="sm" label="Refreshing verification queue" /> : <RefreshCw size={20} />}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {stats.map((stat) => (
                    <button
                        key={stat.id}
                        onClick={() => setActiveTab(stat.id as TabType)}
                        aria-pressed={activeTab === stat.id}
                        aria-label={`${stat.label}: ${stat.count} users`}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${
                            activeTab === stat.id
                                ? `bg-white dark:bg-gray-800 ${content.activeBorder} shadow-2xl scale-105 z-10`
                                : 'bg-gray-50/50 dark:bg-gray-900/50 border-transparent hover:bg-white dark:hover:bg-gray-800 shadow-sm'
                        }`}
                    >
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-6 transition-transform group-hover:scale-110`}>
                            <stat.icon size={28} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-2">{stat.label}</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white">{stat.count}</p>
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                    {loadError}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-10 py-6 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'} Found
                    </h2>
                </div>

                <div className="p-4 sm:p-10">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <BrandLoader className={`${content.accentText}`} size={40} />
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredUsers.map((user, userIndex) => (
                                <UserVerificationCard
                                    key={userCardKeyFor(user.user_id, userIndex)}
                                    user={user}
                                    onViewDetails={() => setSelectedUserId(user.user_id)}
                                    hoverClass={content.actionHover}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-gray-400 font-bold">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Shield className="opacity-20" size={40} />
                            </div>
                            <p className="uppercase tracking-widest text-xs">No users match your criteria</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedUserId && (
                <UserVerificationReviewModal
                    scope={scope}
                    userId={selectedUserId}
                    onClose={() => {
                        setSelectedUserId(null);
                        onSelectionCleared?.();
                        fetchUsers({ background: true });
                    }}
                />
            )}
        </div>
    );
};

const UserVerificationCard: React.FC<{
    user: UserVerificationInfo;
    onViewDetails: () => void;
    hoverClass: string;
    isAdmin: boolean;
}> = ({ user, onViewDetails, hoverClass, isAdmin }) => {
    const workflowStatus = getUserVerificationWorkflowStatus(user);
    const statusStyle = userWorkflowStatusStyles[workflowStatus];
    const statusLabel = getUserVerificationWorkflowStatusLabel(workflowStatus);

    return (
        <div className="p-8 rounded-[2rem] bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl overflow-hidden">
            <div className="flex min-w-0 items-center gap-6">
                <Avatar
                    userId={user.user_id}
                    src={user.avatar}
                    name={user.full_name}
                    size="xl"
                    shape="rounded"
                    fallbackClassName={isAdmin ? 'from-orange-500 to-amber-600' : 'from-blue-500 to-indigo-600'}
                />
                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-3 mb-1">
                        <h3 className="min-w-0 text-lg font-black text-gray-900 dark:text-white tracking-tight break-words [overflow-wrap:anywhere]">{user.full_name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="min-w-0 text-xs text-gray-500 font-bold flex items-center gap-1 break-all">
                            <Mail size={12} /> {user.email}
                        </span>
                        {user.phone && (
                            <span className="min-w-0 text-xs text-gray-500 font-bold flex items-center gap-1 break-words [overflow-wrap:anywhere]">
                                <Phone size={12} /> {user.phone}
                            </span>
                        )}
                        {user.address && (
                            <span className="min-w-0 text-xs text-gray-500 font-bold flex items-center gap-1 break-words [overflow-wrap:anywhere]">
                                <MapPin size={12} /> {user.address}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4">
                    <DocumentStatus icon={BadgeCheck} label="ID" status={user.has_identity_doc} />
                    <DocumentStatus icon={MapPin} label="Address" status={user.has_address_doc} />
                    <DocumentStatus icon={FileText} label="Finance" status={user.has_financial_doc} />
                </div>

                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Recent Activity</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                        {user.last_active ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true }) : 'Unknown'}
                    </p>
                </div>

                <button
                    onClick={onViewDetails}
                    aria-label={`Review verification for ${user.full_name}`}
                    className={`px-8 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 ${hoverClass} hover:text-white dark:hover:text-white`}
                >
                    Review <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

const DocumentStatus: React.FC<{ icon: React.ElementType; label: string; status: boolean }> = ({ icon: Icon, label, status }) => (
    <div className="flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon size={18} />
        </div>
        <span className="text-[10px] font-medium text-gray-400">{label}</span>
    </div>
);

export default UserVerificationQueue;
