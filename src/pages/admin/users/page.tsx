"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus, Users,
    Filter, Search, Eye, Download, Shield, TrendingUp, UserCheck, Loader2, Power, RefreshCw
} from 'lucide-react';

import { userService } from '@/services/userService';
import { getPlatformAnalytics, invalidateAnalyticsCache } from '@/services/analyticsService';
import { getAdminBrokers, getAllLeads, reassignLead } from '@/services/leadsService';
import type { AdminBrokerOption, Lead } from '@/services/leadsService';
import { User } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { buildCsvContent } from '@/lib/csvExport';
import PaginationBar from '@/components/ui/PaginationBar';
import Avatar from '@/components/ui/Avatar';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { getAuthPath } from '@/lib/authUtils';

export type AdminUsersSortOption = 'newest' | 'oldest' | 'name_asc' | 'email_asc' | 'status';
export type AdminLeadSortOption = 'newest' | 'oldest' | 'lead_number' | 'status';
export type AdminLeadStatusFilter = 'open' | 'all' | 'pending_broker_response' | 'broker_responded' | 'viewing_scheduled';

export const ADMIN_USER_SEARCH_MAX_LENGTH = 120;
export const ADMIN_LEAD_QUEUE_PAGE_SIZE = 10;
export const ADMIN_LEAD_REASSIGN_REASON_MAX_LENGTH = 500;

const adminUserSortLabels: Record<AdminUsersSortOption, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    name_asc: 'Name A-Z',
    email_asc: 'Email A-Z',
    status: 'Active status',
};

const adminLeadSortLabels: Record<AdminLeadSortOption, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    lead_number: 'Lead number',
    status: 'Status',
};

const adminLeadStatusLabels: Record<AdminLeadStatusFilter, string> = {
    open: 'Open leads',
    all: 'All leads',
    pending_broker_response: 'Pending response',
    broker_responded: 'Broker responded',
    viewing_scheduled: 'Viewing scheduled',
};

export function getAdminUserSortControlLabel(): string {
    return 'Sort users';
}

export function getAdminUsersGlobalSearchLabel(): string {
    return 'Search users and lead reassignment leads';
}

export function getAdminUsersGlobalSearchPlaceholder(): string {
    return 'Search users and leads...';
}

export function getAdminUsersRegistryTableScrollLabel(): string {
    return 'Scrollable user registry table';
}

export function getAdminUsersPageTitle(): string {
    return 'User Management';
}

export function getAdminUsersPageSubtitle(): string {
    return 'Global Registry';
}

export function getAdminAddUserPath(): string {
    return `${getAuthPath('/register')}?switch=true`;
}

export function normalizeAdminUserSearch(value: string): string {
    return value.trim().toLowerCase();
}

export function normalizeAdminUserSearchInput(value: string): string {
    return value.slice(0, ADMIN_USER_SEARCH_MAX_LENGTH);
}

export function getAdminUserEmptyStateTitle(): string {
    return 'No users match your current filters';
}

export function getAdminUserEmptyStateBody(): string {
    return 'Try clearing the search, choosing a different role, or changing the sort before exporting or reviewing account state.';
}

export function getAdminUserDisplayName(user: User): string {
    const firstName = String(user.first_name || '').trim();
    const lastName = String(user.last_name || '').trim();
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || String(user.full_name || '').trim() || user.email;
}

export function buildAdminUsersCsv(users: User[]) {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined'];
    const rows = users.map((user) => [
        getAdminUserDisplayName(user),
        user.email,
        user.role,
        user.is_active ? 'Active' : 'Deactivated',
        new Date(user.created_at).toLocaleDateString(),
    ]);

    return buildCsvContent([headers, ...rows]);
}

export function buildAdminUserActionLabel(user: User, busy: boolean): string {
    const action = user.is_active
        ? busy ? 'Deactivating' : 'Deactivate'
        : busy ? 'Activating' : 'Activate';
    return `${action} ${getAdminUserDisplayName(user)} (${user.email})`;
}

export function buildAdminUserStateDialogTitle(user: User): string {
    return `${user.is_active ? 'Deactivate' : 'Activate'} ${getAdminUserDisplayName(user)} account`;
}

export function validateAdminUserStateReason(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'Reason is required before changing account access.';
    }
    if ([...trimmed].length > 500) {
        return 'Reason must be 500 characters or fewer.';
    }
    return null;
}

function getAdminLeadDisplayNumber(lead: Pick<Lead, 'id' | 'lead_number'>): string {
    return String(lead.lead_number || lead.id.slice(0, 8)).trim();
}

export function buildAdminLeadOptionLabel(lead: Lead): string {
    const title = String(lead.property?.title || lead.property_name || lead.name || 'Unlinked lead').trim();
    return `${getAdminLeadDisplayNumber(lead)} - ${title}`;
}

export function getAdminBrokerDisplayName(broker: AdminBrokerOption): string {
    return String(broker.company_name || broker.branch_name || broker.user_id).trim();
}

export function isLeadClosedForReassignment(lead: Pick<Lead, 'status' | 'stage' | 'outcome' | 'closed_at'>): boolean {
    const status = String(lead.status || '').trim();
    const stage = String(lead.stage || '').trim();
    const outcome = String(lead.outcome || '').trim();
    return Boolean(lead.closed_at)
        || ['closed_won', 'closed_lost', 'cancelled'].includes(status)
        || ['completed', 'rejected', 'withdrawn'].includes(stage)
        || ['completed', 'rejected', 'withdrawn', 'expired'].includes(outcome);
}

export function validateAdminLeadReassignSelection(lead: Lead, brokerId: string): string | null {
    const selectedBrokerId = brokerId.trim();
    if (isLeadClosedForReassignment(lead)) {
        return 'Closed leads cannot be reassigned.';
    }
    if (!selectedBrokerId) {
        return 'Choose a broker before reassigning this lead.';
    }
    if (selectedBrokerId === String(lead.broker_id || '').trim()) {
        return 'This lead is already assigned to that broker.';
    }
    return null;
}

export function isAdminLeadReassignActionDisabled(
    lead: Lead,
    brokerId: string,
    brokerCount: number,
    busy: boolean,
): boolean {
    return busy || brokerCount === 0 || validateAdminLeadReassignSelection(lead, brokerId) !== null;
}

export function buildAdminLeadReassignLabel(lead: Lead, brokerName: string, busy: boolean): string {
    const action = busy ? 'Reassigning' : 'Reassign';
    return `${action} ${getAdminLeadDisplayNumber(lead)} to ${brokerName}`;
}

export function formatAdminLeadReassignmentLoadError(error?: string | null): string {
    const detail = String(error || '').trim();
    if (!detail || detail.toLowerCase() === 'internal server error') {
        return 'Lead reassignment data could not refresh for the current filters. Existing rows may be stale; try Refresh or adjust the lead search/filter.';
    }
    return `Lead reassignment data could not refresh for the current filters. Existing rows may be stale; service message: ${detail}`;
}

export function sortAdminUsers(users: User[], sortBy: AdminUsersSortOption): User[] {
    const sorted = [...users];
    const byName = (left: User, right: User) =>
        getAdminUserDisplayName(left).localeCompare(getAdminUserDisplayName(right), undefined, { sensitivity: 'base' });
    const byEmail = (left: User, right: User) =>
        left.email.localeCompare(right.email, undefined, { sensitivity: 'base' });
    const byCreated = (left: User, right: User) =>
        new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();

    switch (sortBy) {
        case 'oldest':
            return sorted.sort(byCreated);
        case 'name_asc':
            return sorted.sort(byName);
        case 'email_asc':
            return sorted.sort(byEmail);
        case 'status':
            return sorted.sort((left, right) => {
                if (left.is_active !== right.is_active) {
                    return left.is_active ? -1 : 1;
                }
                return byName(left, right);
            });
        default:
            return sorted.sort((left, right) => byCreated(right, left));
    }
}

function UserManagementContent() {
    const navigate = useNavigate();
    const { success: showToastSuccess, error: showToastError } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [sortBy, setSortBy] = useState<AdminUsersSortOption>('newest');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionUserId, setActionUserId] = useState<string | null>(null);
    const [stateChangeUser, setStateChangeUser] = useState<User | null>(null);
    const [stateChangeReason, setStateChangeReason] = useState('');
    const [stateChangeError, setStateChangeError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<{ total: number; page: number; limit: number } | null>(null);
    const [adminLeads, setAdminLeads] = useState<Lead[]>([]);
    const [adminBrokers, setAdminBrokers] = useState<AdminBrokerOption[]>([]);
    const [adminLeadLoading, setAdminLeadLoading] = useState(true);
    const [adminLeadError, setAdminLeadError] = useState<string | null>(null);
    const [leadBrokerSelections, setLeadBrokerSelections] = useState<Record<string, string>>({});
    const [leadReassignErrors, setLeadReassignErrors] = useState<Record<string, string>>({});
    const [reassigningLeadId, setReassigningLeadId] = useState<string | null>(null);
    const [leadSearchQuery, setLeadSearchQuery] = useState('');
    const [leadStatusFilter, setLeadStatusFilter] = useState<AdminLeadStatusFilter>('open');
    const [leadSortBy, setLeadSortBy] = useState<AdminLeadSortOption>('newest');
    const [leadPage, setLeadPage] = useState(1);
    const [leadPagination, setLeadPagination] = useState<{ total?: number; page?: number; limit?: number } | null>(null);
    const [leadReassignReason, setLeadReassignReason] = useState('Admin reassignment from relationship hub');
    const PAGE_SIZE = 20;

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const roleFilter = activeTab === 'all' ? '' : activeTab;
            const [{ data: userData, pagination: userPagination, error: userError }, { data: analytics, error: analyticsError }] = await Promise.all([
                userService.getAllUsers(currentPage, PAGE_SIZE, {
                    search: normalizeAdminUserSearch(searchQuery),
                    role: roleFilter,
                }),
                getPlatformAnalytics()
            ]);
            if (userError) {
                throw new Error(userError);
            }
            if (analyticsError) {
                throw new Error(analyticsError);
            }
            setUsers(userData || []);
            setPagination(userPagination);
            setStatsData(analytics);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(error.message || 'User registry is not available right now.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage, searchQuery]);

    const fetchLeadReassignmentData = useCallback(async () => {
        try {
            setAdminLeadLoading(true);
            const [leadResponse, brokerResponse] = await Promise.all([
                getAllLeads(leadPage, ADMIN_LEAD_QUEUE_PAGE_SIZE, {
                    search: normalizeAdminUserSearch(leadSearchQuery),
                    status: leadStatusFilter === 'all' ? '' : leadStatusFilter,
                    sort: leadSortBy,
                }),
                getAdminBrokers(1, 50, 'approved'),
            ]);
            if (leadResponse.error) {
                throw new Error(leadResponse.error);
            }
            if (brokerResponse.error) {
                throw new Error(brokerResponse.error);
            }
            setAdminLeads(leadResponse.data || []);
            setLeadPagination(leadResponse.pagination || null);
            setAdminBrokers(brokerResponse.data || []);
            setAdminLeadError(null);
        } catch (error: any) {
            setAdminLeadError(formatAdminLeadReassignmentLoadError(error.message));
        } finally {
            setAdminLeadLoading(false);
        }
    }, [leadPage, leadSearchQuery, leadSortBy, leadStatusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLeadReassignmentData();
    }, [fetchLeadReassignmentData]);

    useWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
        ],
        refresh: async () => {
            invalidateAnalyticsCache('platform_analytics');
            await Promise.all([fetchUsers(), fetchLeadReassignmentData()]);
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

    const handleToggleUserState = (user: User) => {
        setStateChangeUser(user);
        setStateChangeReason('');
        setStateChangeError(null);
    };

    const handleCancelUserStateChange = () => {
        if (actionUserId) {
            return;
        }
        setStateChangeUser(null);
        setStateChangeReason('');
        setStateChangeError(null);
    };

    const handleConfirmUserStateChange = async () => {
        if (!stateChangeUser) {
            return;
        }

        const reasonError = validateAdminUserStateReason(stateChangeReason);
        if (reasonError) {
            setStateChangeError(reasonError);
            return;
        }

        const user = stateChangeUser;
        setActionUserId(user.id);
        const { error } = await userService.setUserActiveState(user.id, !user.is_active, stateChangeReason.trim());
        setActionUserId(null);

        if (error) {
            showToastError(`Failed to ${user.is_active ? 'deactivate' : 'activate'} user: ${error}`);
            return;
        }

        showToastSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
        setStateChangeUser(null);
        setStateChangeReason('');
        setStateChangeError(null);
        fetchUsers();
    };

    const brokerNameById = useMemo(() => {
        return new Map(adminBrokers.map((broker) => [broker.user_id, getAdminBrokerDisplayName(broker)]));
    }, [adminBrokers]);

    const visibleReassignableLeads = useMemo(() => (
        adminLeads.filter((lead) => !isLeadClosedForReassignment(lead))
    ), [adminLeads]);
    const leadTotalItems = leadPagination?.total ?? visibleReassignableLeads.length;
    const leadTotalPages = Math.max(1, Math.ceil(leadTotalItems / ADMIN_LEAD_QUEUE_PAGE_SIZE));
    const safeLeadPage = Math.min(leadPage, leadTotalPages);

    const handleLeadBrokerSelection = (leadId: string, brokerId: string) => {
        setLeadBrokerSelections((current) => ({ ...current, [leadId]: brokerId }));
        setLeadReassignErrors((current) => {
            const next = { ...current };
            delete next[leadId];
            return next;
        });
    };

    const handleLeadReassign = async (lead: Lead) => {
        const selectedBrokerId = leadBrokerSelections[lead.id] || '';
        const validationError = validateAdminLeadReassignSelection(lead, selectedBrokerId);
        if (validationError) {
            setLeadReassignErrors((current) => ({ ...current, [lead.id]: validationError }));
            return;
        }

        setReassigningLeadId(lead.id);
        const { error } = await reassignLead(lead.id, selectedBrokerId, leadReassignReason);
        setReassigningLeadId(null);

        if (error) {
            setLeadReassignErrors((current) => ({ ...current, [lead.id]: error }));
            showToastError(`Lead reassignment failed: ${error}`);
            return;
        }

        showToastSuccess(`${getAdminLeadDisplayNumber(lead)} reassigned successfully.`);
        setLeadBrokerSelections((current) => {
            const next = { ...current };
            delete next[lead.id];
            return next;
        });
        await fetchLeadReassignmentData();
    };

    const stats = [
        { label: 'Network Size', value: statsData?.total_users?.toLocaleString() || '0', icon: Users, color: 'text-blue-500' },
        { label: 'Active Leads', value: statsData?.active_leads?.toLocaleString() || '0', icon: TrendingUp, color: 'text-orange-500' },
        { label: 'Total Brokers', value: statsData?.total_brokers?.toLocaleString() || '0', icon: UserCheck, color: 'text-emerald-500' },
        { label: 'Total Properties', value: statsData?.total_properties?.toLocaleString() || '0', icon: Shield, color: 'text-indigo-500' },
    ];

    const filteredUsers = useMemo(() => sortAdminUsers(users, sortBy), [users, sortBy]);
    const totalItems = pagination?.total ?? filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedUsers = filteredUsers;
    const normalizedSearchQuery = normalizeAdminUserSearch(searchQuery);
    const statusMessage = loading
        ? 'Loading admin user registry'
        : `${totalItems} ${totalItems === 1 ? 'user' : 'users'} found${normalizedSearchQuery ? ` for ${normalizedSearchQuery}` : ''} in ${activeTab === 'all' ? 'all roles' : activeTab} sorted by ${adminUserSortLabels[sortBy]}.`;

    const handleExportCSV = () => {
        if (filteredUsers.length === 0) {
            showToastError('No users to export.');
            return;
        }
        const csv = buildAdminUsersCsv(filteredUsers);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToastSuccess(`Exported ${filteredUsers.length} users to CSV.`);
    };

    const handleUserSearchChange = (value: string) => {
        const normalizedValue = normalizeAdminUserSearchInput(value);
        setCurrentPage(1);
        setLeadPage(1);
        setSearchQuery(normalizedValue);
        setLeadSearchQuery(normalizedValue);
    };

    const handleRoleTabChange = (tab: string) => {
        setCurrentPage(1);
        setActiveTab(tab);
    };

    const handleLeadSearchChange = (value: string) => {
        setLeadPage(1);
        setLeadSearchQuery(normalizeAdminUserSearchInput(value));
    };

    const handleLeadStatusFilterChange = (value: AdminLeadStatusFilter) => {
        setLeadPage(1);
        setLeadStatusFilter(value);
    };

    const handleLeadSortChange = (value: AdminLeadSortOption) => {
        setLeadPage(1);
        setLeadSortBy(value);
    };

    return (
        <div className="min-w-0 space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-emerald-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-700/20">Relationship Hub</span>
                        <span className="text-gray-400 text-xs font-bold">{getAdminUsersPageSubtitle()}</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        {getAdminUsersPageTitle()}
                    </h1>
                </div>
                <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
                    <div className="relative group w-full sm:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            aria-label={getAdminUsersGlobalSearchLabel()}
                            placeholder={getAdminUsersGlobalSearchPlaceholder()}
                            value={searchQuery}
                            onChange={(e) => handleUserSearchChange(e.target.value)}
                            maxLength={ADMIN_USER_SEARCH_MAX_LENGTH}
                            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm shadow-sm transition-all sm:w-64"
                        />
                    </div>
                    <button
                        onClick={() => navigate(getAdminAddUserPath())}
                        className="flex w-full items-center justify-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl sm:w-auto"
                    >
                        <UserPlus size={18} /> Add User
                    </button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="min-w-0 bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none flex items-center gap-4 sm:gap-6 group hover:translate-y-[-4px] transition-all">
                        <div className={`p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-1 mb-2 uppercase tracking-widest leading-none">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {loadError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                    {loadError}
                </div>
            )}

            <section className="min-w-0 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border dark:border-gray-700 overflow-hidden">
                <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Lead Reassignment</h2>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">Admin broker routing</p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchLeadReassignmentData}
                        disabled={adminLeadLoading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500 transition-all hover:text-gray-900 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
                    >
                        <RefreshCw size={16} className={adminLeadLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                <div className="grid gap-4 border-b px-8 py-5 dark:border-gray-700 md:grid-cols-2 xl:grid-cols-4">
                    <label className="relative block">
                        <span className="sr-only">Search reassignment leads</span>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            aria-label="Search reassignment leads"
                            placeholder="Search leads..."
                            value={leadSearchQuery}
                            onChange={(event) => handleLeadSearchChange(event.target.value)}
                            maxLength={ADMIN_USER_SEARCH_MAX_LENGTH}
                            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </label>
                    <label className="relative block">
                        <span className="sr-only">Filter reassignment leads</span>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            aria-label="Filter reassignment leads"
                            value={leadStatusFilter}
                            onChange={(event) => handleLeadStatusFilterChange(event.target.value as AdminLeadStatusFilter)}
                            className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        >
                            {Object.entries(adminLeadStatusLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="sr-only">Sort reassignment leads</span>
                        <select
                            aria-label="Sort reassignment leads"
                            value={leadSortBy}
                            onChange={(event) => handleLeadSortChange(event.target.value as AdminLeadSortOption)}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        >
                            {Object.entries(adminLeadSortLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="sr-only">Reassignment reason</span>
                        <input
                            type="text"
                            aria-label="Reassignment reason"
                            value={leadReassignReason}
                            onChange={(event) => setLeadReassignReason(event.target.value.slice(0, ADMIN_LEAD_REASSIGN_REASON_MAX_LENGTH))}
                            maxLength={ADMIN_LEAD_REASSIGN_REASON_MAX_LENGTH}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </label>
                </div>

                {adminLeadError && (
                    <div className="mx-8 mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                        {adminLeadError}
                    </div>
                )}

                <div className="relative max-w-full overflow-x-auto overflow-y-hidden [contain:paint]" tabIndex={0} aria-label="Scrollable lead reassignment table">
                    <table className="w-full min-w-[760px] text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Broker</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">New Broker</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {adminLeadLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center text-sm font-bold text-gray-500">
                                        Loading lead reassignment queue...
                                    </td>
                                </tr>
                            ) : visibleReassignableLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center">
                                        <p className="text-base font-black text-gray-900 dark:text-white">No open leads ready for reassignment</p>
                                    </td>
                                </tr>
                            ) : (
                                visibleReassignableLeads.map((lead) => {
                                    const selectedBrokerId = leadBrokerSelections[lead.id] || '';
                                    const selectedBrokerName = brokerNameById.get(selectedBrokerId) || 'selected broker';
                                    const isBusy = reassigningLeadId === lead.id;
                                    const rowError = leadReassignErrors[lead.id];
                                    const currentBrokerName = brokerNameById.get(String(lead.broker_id || '').trim()) || lead.matched_broker?.name || lead.broker_id || 'Unassigned';
                                    const selectionError = validateAdminLeadReassignSelection(lead, selectedBrokerId);
                                    const isActionDisabled = isAdminLeadReassignActionDisabled(lead, selectedBrokerId, adminBrokers.length, isBusy);
                                    const actionLabel = selectionError || buildAdminLeadReassignLabel(lead, selectedBrokerName, isBusy);

                                    return (
                                        <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                            <td className="px-8 py-5 align-top">
                                                <p className="max-w-md break-words text-sm font-black text-gray-900 dark:text-white">
                                                    {buildAdminLeadOptionLabel(lead)}
                                                </p>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {lead.status || 'pending'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 align-top">
                                                <p className="max-w-xs break-words text-sm font-bold text-gray-600 dark:text-gray-300">
                                                    {currentBrokerName}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 align-top">
                                                <label htmlFor={`admin-lead-reassign-${lead.id}`} className="sr-only">
                                                    Choose broker for {getAdminLeadDisplayNumber(lead)}
                                                </label>
                                                <select
                                                    id={`admin-lead-reassign-${lead.id}`}
                                                    aria-label={`Choose broker for ${getAdminLeadDisplayNumber(lead)}`}
                                                    value={selectedBrokerId}
                                                    onChange={(event) => handleLeadBrokerSelection(lead.id, event.target.value)}
                                                    className="w-full min-w-64 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                                >
                                                    <option value="">Choose broker</option>
                                                    {adminBrokers.map((broker) => (
                                                        <option key={broker.user_id} value={broker.user_id}>
                                                            {getAdminBrokerDisplayName(broker)}
                                                        </option>
                                                    ))}
                                                </select>
                                                {rowError && (
                                                    <p role="alert" className="mt-2 max-w-sm break-words text-xs font-semibold text-red-600">
                                                        {rowError}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right align-top">
                                                <button
                                                    type="button"
                                                    aria-label={actionLabel}
                                                    title={selectionError || undefined}
                                                    onClick={() => handleLeadReassign(lead)}
                                                    disabled={isActionDisabled}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 disabled:opacity-60 dark:bg-white dark:text-gray-900"
                                                >
                                                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                                    Reassign
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="border-t bg-gray-50/50 px-8 py-5 dark:border-gray-700 dark:bg-gray-900/20">
                    <PaginationBar
                        currentPage={safeLeadPage}
                        totalPages={leadTotalPages}
                        onPageChange={setLeadPage}
                        totalItems={leadTotalItems}
                        pageSize={ADMIN_LEAD_QUEUE_PAGE_SIZE}
                        currentItemCount={visibleReassignableLeads.length}
                        itemLabel="leads"
                    />
                </div>
            </section>

            {/* Main Registry Table */}
            <div className="min-w-0 bg-white dark:bg-gray-800 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-6 sm:px-10 sm:py-8 border-b dark:border-gray-700 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex max-w-full gap-4 overflow-x-auto sm:gap-8">
                        {['all', 'admin', 'manager', 'user'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleRoleTabChange(tab)}
                                className={`text-xs font-black uppercase tracking-widest pb-2 transition-all border-b-2 ${activeTab === tab ? 'border-emerald-50 text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="admin-user-sort"
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                            >
                                {getAdminUserSortControlLabel()}
                            </label>
                        <select
                            id="admin-user-sort"
                            aria-label={getAdminUserSortControlLabel()}
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as AdminUsersSortOption)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500 outline-none transition-all hover:text-gray-900 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="name_asc">Name A-Z</option>
                            <option value="email_asc">Email A-Z</option>
                            <option value="status">Active status</option>
                        </select>
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                        >
                            <Download size={16} /> Export CSV
                        </button>
                    </div>
                </div>

                <p
                    role="status"
                    aria-live="polite"
                    aria-label="Admin users status"
                    className="sr-only"
                >
                    {statusMessage}
                </p>

                <div className="relative max-w-full overflow-x-auto overflow-y-hidden [contain:paint]" tabIndex={0} aria-label={getAdminUsersRegistryTableScrollLabel()}>
                    <table className="w-full min-w-[980px] text-left">
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
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-14 text-center text-sm font-bold text-gray-500">
                                        Loading user registry...
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-16 text-center">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{getAdminUserEmptyStateTitle()}</h3>
                                        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-gray-500 dark:text-gray-400">
                                            {getAdminUserEmptyStateBody()}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user) => {
                                    const displayName = getAdminUserDisplayName(user);
                                    const statusId = `admin-user-status-${user.id}`;
                                    const actionBusy = actionUserId === user.id;

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <Avatar
                                                        userId={user.id}
                                                        src={user.avatar_url || user.avatar}
                                                        name={displayName}
                                                        size="lg"
                                                        shape="rounded"
                                                        fallbackClassName="from-emerald-500 to-teal-600"
                                                    />
                                                    <div>
                                                        <p className="font-black text-gray-900 dark:text-white text-sm">
                                                            {displayName}
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
                                                <span
                                                    id={statusId}
                                                    aria-label={`${displayName} is ${user.is_active ? 'active' : 'deactivated'}`}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}
                                                >
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
                                                        type="button"
                                                        aria-label={`Review ${displayName} (${user.email}) verification`}
                                                        onClick={() => handleReviewVerification(user)}
                                                        disabled={user.role === 'admin'}
                                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 hover:text-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                                                    >
                                                        <Eye size={16} />
                                                        Review
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label={buildAdminUserActionLabel(user, actionBusy)}
                                                        aria-describedby={statusId}
                                                        onClick={() => handleToggleUserState(user)}
                                                        disabled={actionBusy}
                                                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                                                            user.is_active
                                                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        } disabled:opacity-60`}
                                                    >
                                                        {actionBusy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t bg-gray-50/50 px-4 py-6 sm:px-10 sm:py-8 dark:border-gray-700 dark:bg-gray-900/20">
                    <PaginationBar
                        currentPage={safeCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalItems}
                        pageSize={PAGE_SIZE}
                        currentItemCount={paginatedUsers.length}
                        itemLabel="members"
                    />
                </div>
            </div>

            {stateChangeUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-user-state-dialog-title"
                        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="space-y-2">
                            <h2 id="admin-user-state-dialog-title" className="text-xl font-black text-gray-900 dark:text-white">
                                {buildAdminUserStateDialogTitle(stateChangeUser)}
                            </h2>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                Record the admin reason before changing access for {stateChangeUser.email}.
                            </p>
                        </div>

                        <div className="mt-6 space-y-2">
                            <label htmlFor="admin-user-state-reason" className="text-xs font-black uppercase tracking-widest text-gray-500">
                                Audit reason
                            </label>
                            <textarea
                                id="admin-user-state-reason"
                                aria-label={`Reason for changing ${getAdminUserDisplayName(stateChangeUser)} account state`}
                                aria-invalid={Boolean(stateChangeError)}
                                aria-describedby={stateChangeError ? 'admin-user-state-reason-error' : undefined}
                                value={stateChangeReason}
                                onChange={(event) => {
                                    setStateChangeReason(event.target.value);
                                    setStateChangeError(null);
                                }}
                                rows={4}
                                maxLength={500}
                                className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                placeholder="Example: Duplicate account verified during support review"
                            />
                            {stateChangeError && (
                                <p id="admin-user-state-reason-error" role="alert" className="text-sm font-semibold text-red-600">
                                    {stateChangeError}
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelUserStateChange}
                                disabled={Boolean(actionUserId)}
                                className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-600 transition-all hover:text-gray-900 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                aria-label={`Confirm ${stateChangeUser.is_active ? 'deactivate' : 'activate'} ${getAdminUserDisplayName(stateChangeUser)} with audit reason`}
                                onClick={handleConfirmUserStateChange}
                                disabled={actionUserId === stateChangeUser.id}
                                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-60 ${
                                    stateChangeUser.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {actionUserId === stateChangeUser.id && <Loader2 size={16} className="animate-spin" />}
                                Confirm {stateChangeUser.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default function AdminUserManagementPage() {
    return (
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading user directory..." />}>
            <UserManagementContent />
        </Suspense>
    );
}
