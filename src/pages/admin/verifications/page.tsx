"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Shield, Clock, CheckCircle, XCircle, User, Building2,
  Search, RefreshCw, Eye, AlertCircle, TrendingUp, Sparkles,
  ArrowRight, Filter, Briefcase, ChevronRight, LayoutGrid, List, Loader2
} from 'lucide-react';
import ManagerReviewModal from '@/components/admin/ManagerReviewModal';
import { getManagers, ManagerProfile } from '@/services/managerVerificationService';
import { useToast } from '@/contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'all' | 'pending' | 'review' | 'approved' | 'rejected';

function VerificationsContent() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [managers, setManagers] = useState<ManagerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchManagers = useCallback(async () => {
    try {
      const { data, error } = await getManagers();
      if (error) throw new Error(error);
      setManagers(data);
    } catch (err: any) {
      console.error('Error fetching managers:', err);
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchManagers();
  };

  const getStats = () => {
    const pending = managers.filter(m => m.verification_status === 'submitted').length;
    const review = managers.filter(m => m.verification_status === 'under_review').length;
    const approved = managers.filter(m => m.verification_status === 'approved').length;
    const rejected = managers.filter(m => m.verification_status === 'rejected').length;

    return [
      { id: 'submitted', label: 'Pending', count: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'under_review', label: 'In Review', count: review, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'approved', label: 'Approved', count: approved, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'rejected', label: 'Rejected', count: rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    ];
  };

  const stats = getStats();

  const filteredManagers = managers.filter(m => {
    // Map internal status to tab types
    const statusMap: Record<string, string> = {
        'submitted': 'pending',
        'under_review': 'review',
        'approved': 'approved',
        'rejected': 'rejected'
    };
    
    const mappedStatus = statusMap[m.verification_status] || m.verification_status;

    if (activeTab !== 'all' && mappedStatus !== activeTab) return false;
    
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = (m.company_name || m.authorized_representative_name || '').toLowerCase().includes(searchLower);
    const emailMatch = (m.authorized_representative_email || '').toLowerCase().includes(searchLower);
    
    return !searchQuery || nameMatch || emailMatch;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
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
              placeholder="Search managers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-orange-500/10 font-bold text-sm w-64 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleRefresh}
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
            <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"><LayoutGrid size={18} /></button>
            <button className="p-2 text-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-all"><List size={18} /></button>
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
              {filteredManagers.map((manager) => (
                <div
                  key={manager.id}
                  className="group p-8 rounded-[2rem] bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg ${manager.profile_type === 'broker' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                      {(manager.company_name || manager.authorized_representative_name || '?').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{manager.company_name || manager.authorized_representative_name}</h3>
                        <div className={`w-2 h-2 rounded-full ${manager.verification_status === 'submitted' ? 'bg-amber-500' :
                          manager.verification_status === 'under_review' ? 'bg-blue-500' : 
                          manager.verification_status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{manager.profile_type}</span>
                        <span className="text-xs text-gray-500 font-bold">• {manager.authorized_representative_email || 'No Email'}</span>
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
                      onClick={() => setSelectedManagerId(manager.id)}
                      className="px-10 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 group-hover:bg-orange-500 group-hover:text-white"
                    >
                      Review Profile <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400 font-bold">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="opacity-20" size={40} />
              </div>
              <p className="uppercase tracking-widest text-xs">Queue Clear • Good work!</p>
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
              fetchManagers(); // Refresh list on close in case status changed
          }}
        />
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
