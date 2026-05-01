"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, Clock, CheckCircle, XCircle, User, Building2,
  Search, RefreshCw, Eye, AlertCircle, TrendingUp, Sparkles,
  ArrowRight, Filter, Briefcase, ChevronRight, LayoutGrid, List, Loader2
} from 'lucide-react';
import ManagerReviewModal from '@/components/admin/ManagerReviewModal';
import UserVerificationQueue from '@/components/verification/UserVerificationQueue';
import Avatar from '@/components/ui/Avatar';
import { getManagerDisplayName, getManagers, ManagerProfile } from '@/services/managerVerificationService';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'all' | 'pending' | 'review' | 'approved' | 'rejected';

const getInitialEntityTab = (searchParams: URLSearchParams): 'user' | 'manager' => {
  const entity = searchParams.get('entity');
  if (entity === 'manager' || searchParams.get('managerId')) {
    return 'manager';
  }

  return 'user';
};

function VerificationsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entityTab, setEntityTab] = useState<'user' | 'manager'>(() => getInitialEntityTab(searchParams));
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [managers, setManagers] = useState<ManagerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchManagers = useCallback(async () => {
    try {
      const { data, error } = await getManagers();
      if (error) throw new Error(error);
      setManagers(data);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Verification queue is not available right now.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  useWorkflowWorkspaceRefresh({
    tags: [
      WORKSPACE_SYNC_TAGS.VERIFICATIONS,
      WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
      WORKSPACE_SYNC_TAGS.MANAGER_VERIFICATION,
      WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
    ],
    refresh: fetchManagers,
  });

  useEffect(() => {
    const entity = searchParams.get('entity');
    const managerId = searchParams.get('managerId');
    if (entity === 'user' || entity === 'manager') {
      setEntityTab(entity);
    } else if (managerId) {
      setEntityTab('manager');
    } else {
      setEntityTab('user');
    }

    if (managerId) {
      setSelectedManagerId(managerId);
    } else {
      setSelectedManagerId(null);
    }
  }, [searchParams]);

  const updateSearchParam = useCallback((key: string, value?: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleEntityTabChange = (tab: 'user' | 'manager') => {
    setEntityTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('entity', tab);
    if (tab === 'user') {
      next.delete('managerId');
    } else {
      next.delete('userId');
    }
    setSearchParams(next, { replace: true });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchManagers();
  };

  const isPending = (s: string) => ['submitted', 'pending', 'documents_submitted', 'verification_required', 'basic', 'incomplete'].includes(s);
  const isReview = (s: string) => s === 'under_review';
  const isApproved = (s: string) => ['approved', 'verified', 'fully_verified'].includes(s);
  const isRejected = (s: string) => s === 'rejected';

  const getStats = () => {
    const pending = managers.filter(m => isPending(m.verification_status)).length;
    const review = managers.filter(m => isReview(m.verification_status)).length;
    const approved = managers.filter(m => isApproved(m.verification_status)).length;
    const rejected = managers.filter(m => isRejected(m.verification_status)).length;

    return [
      { id: 'submitted', label: 'Pending', count: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'under_review', label: 'In Review', count: review, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'approved', label: 'Approved', count: approved, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'rejected', label: 'Rejected', count: rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    ];
  };

  const stats = getStats();

  const filteredManagers = managers.filter(m => {
    // Map internal status to tab types for filtering
    let mappedStatus = 'other';
    if (isPending(m.verification_status)) mappedStatus = 'pending';
    else if (isReview(m.verification_status)) mappedStatus = 'review';
    else if (isApproved(m.verification_status)) mappedStatus = 'approved';
    else if (isRejected(m.verification_status)) mappedStatus = 'rejected';

    if (activeTab !== 'all') {
        const tabToStatusMap: Record<string, string> = {
            'pending': 'pending',
            'review': 'review',
            'approved': 'approved',
            'rejected': 'rejected'
        };
        if (mappedStatus !== tabToStatusMap[activeTab]) return false;
    }
    
    const searchLower = searchQuery.toLowerCase();
    const displayName = getManagerDisplayName(m);
    const nameMatch = displayName.toLowerCase().includes(searchLower);
    const companyMatch = (m.company_name || '').toLowerCase().includes(searchLower);
    const emailMatch = (m.authorized_representative_email || '').toLowerCase().includes(searchLower);
    
    return !searchQuery || nameMatch || companyMatch || emailMatch;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => handleEntityTabChange('user')}
          aria-pressed={entityTab === 'user'}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${entityTab === 'user' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
        >
          User
        </button>
        <button
          onClick={() => handleEntityTabChange('manager')}
          aria-pressed={entityTab === 'manager'}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${entityTab === 'manager' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
        >
          Manager
        </button>
      </div>

      {entityTab === 'user' ? (
        <UserVerificationQueue
          scope="admin"
          initialSelectedUserId={entityTab === 'user' ? searchParams.get('userId') : null}
          onSelectionCleared={() => updateSearchParam('userId', null)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">Security Hub</span>
                <span className="text-gray-400 text-xs font-bold">Manager Verification Queue</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                Review Portfolios
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input
                  type="text"
                  aria-label="Search managers"
                  placeholder="Search managers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-orange-500/10 font-bold text-sm w-64 shadow-sm transition-all"
                />
              </div>
              <button
                onClick={handleRefresh}
                aria-label="Refresh manager verification queue"
                title="Refresh manager verification queue"
                className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 hover:scale-105 transition-all text-gray-600 dark:text-gray-400"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats Quick Filter */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setActiveTab(stat.id === 'submitted' ? 'pending' : stat.id === 'under_review' ? 'review' : stat.id as TabType)}
                aria-pressed={(activeTab === 'pending' && stat.id === 'submitted') ||
                  (activeTab === 'review' && stat.id === 'under_review') ||
                  activeTab === stat.id}
                aria-label={`${stat.label}: ${stat.count} managers`}
                className={`p-8 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${
                  (activeTab === 'pending' && stat.id === 'submitted') ||
                  (activeTab === 'review' && stat.id === 'under_review') ||
                  activeTab === stat.id
                  ? 'bg-white dark:bg-gray-800 border-orange-500 shadow-2xl scale-105 z-10'
                  : 'bg-gray-50/50 dark:bg-gray-900/50 border-transparent hover:bg-white dark:hover:bg-gray-800 shadow-sm'
                  }`}
              >
                <div className={`p-4 rounded-2xl ${stat.bg} dark:bg-gray-700 ${stat.color} w-fit mb-6 transition-transform group-hover:scale-110`}>
              <stat.icon size={28} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-2">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.count}</h3>
                {((activeTab === 'pending' && stat.id === 'submitted') || 
                  (activeTab === 'review' && stat.id === 'under_review') ||
                  activeTab === stat.id) && (
                  <div className="absolute top-4 right-4 text-orange-500">
                    <Sparkles size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
              {loadError}
            </div>
          )}

      {/* List Container */}
      <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border dark:border-gray-700 overflow-hidden relative">
        {/* Sub-Header / Tabs */}
        <div className="px-10 py-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`text-xs font-black uppercase tracking-widest pb-2 transition-all border-b-2 ${activeTab === 'all' ? 'border-orange-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              All Applications
            </button>
            <button className="text-xs font-black uppercase tracking-widest pb-2 border-b-2 border-transparent text-gray-400 hover:text-gray-600">Archived</button>
          </div>
          <div className="flex gap-2">
            <button aria-label="Show manager verifications as grid" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"><LayoutGrid size={18} /></button>
            <button aria-label="Show manager verifications as list" aria-pressed="true" className="p-2 text-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-all"><List size={18} /></button>
          </div>
        </div>

        {/* Grid/List */}
        <div className="p-4 sm:p-10">
          {loading ? (
             <div className="flex justify-center py-20">
               <Loader2 className="animate-spin text-orange-500" size={40} />
             </div>
          ) : filteredManagers.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredManagers.map((manager) => {
                const displayName = getManagerDisplayName(manager);
                return (
                <div
                  key={manager.id}
                  className="group p-8 rounded-[2rem] bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl"
                >
                  <div className="flex min-w-0 items-center gap-6">
                    <Avatar
                      userId={manager.id}
                      name={displayName}
                      size="xl"
                      shape="rounded"
                      fallbackClassName={manager.profile_type === 'broker' ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="min-w-0 text-lg font-black text-gray-900 dark:text-white tracking-tight break-words [overflow-wrap:anywhere]">{displayName}</h3>
                        <div className={`w-2 h-2 rounded-full ${isPending(manager.verification_status) ? 'bg-amber-500' :
                          isReview(manager.verification_status) ? 'bg-blue-500' : 
                          isApproved(manager.verification_status) ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{manager.profile_type}</span>
                        <span className="min-w-0 text-xs text-gray-500 font-bold break-all">- {manager.authorized_representative_email || 'No Email'}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isPending(manager.verification_status) ? 'bg-amber-100 text-amber-600' :
                          isReview(manager.verification_status) ? 'bg-blue-100 text-blue-600' :
                          isApproved(manager.verification_status) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {manager.verification_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Submitted</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {manager.submitted_at ? formatDistanceToNow(new Date(manager.submitted_at), { addSuffix: true }) : 'Unknown'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedManagerId(manager.id);
                        const next = new URLSearchParams(searchParams);
                        next.set('entity', 'manager');
                        next.set('managerId', manager.id);
                        next.delete('userId');
                        setSearchParams(next);
                      }}
                      aria-label={`Review profile for ${displayName}`}
                      className="px-10 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 group-hover:bg-orange-500 group-hover:text-white"
                    >
                      Review Profile <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400 font-bold">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="opacity-20" size={40} />
              </div>
              <p className="uppercase tracking-widest text-xs">Queue Clear - Good work!</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
          {selectedManagerId && (
            <ManagerReviewModal
              managerId={selectedManagerId}
              onClose={() => {
                  setSelectedManagerId(null);
                  updateSearchParam('managerId', null);
                  fetchManagers();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function VerificationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading Queue...</div>}>
      <VerificationsContent />
    </Suspense>
  );
}

