"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Download,
    Eye,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    Loader2,
    Calendar,
    ChevronRight,
    Search,
    PenTool
} from 'lucide-react';
import { isPendingUserSignature, normalizeContractStatus } from '@/lib/contractStatus';
import { getUserContracts, signContract } from '@/services/contractsService';
import { type Contract } from '@/types/booking';
import { useToast } from '@/contexts/ToastContext';

export default function ContractsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [signingId, setSigningId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await getUserContracts();
            if (error) throw new Error(error);
            setContracts(Array.isArray(data) ? data : []);
        } catch (error: any) {
            toast.error('Failed to load contracts');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSign = async (id: string) => {
        setSigningId(id);
        const { data, error } = await signContract(id, 'user');
        if (error) {
            toast.error(error);
        } else if (data) {
            toast.success('Contract signed successfully!');
            setContracts(prev => prev.map(c => c.id === id ? data : c));
        }
        setSigningId(null);
    };

    const getStatusStyles = (status: string) => {
        switch (normalizeContractStatus(status)) {
            case 'active':
                return 'bg-green-50 text-green-600 border-green-100';
            case 'pending_user_signature':
                return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'draft':
            case 'pending_manager_signature':
                return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'terminated':
                return 'bg-red-50 text-red-600 border-red-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            pending_user_signature: 'Awaiting Your Signature',
            pending_manager_signature: 'Awaiting Manager Signature',
            draft: 'Draft',
            active: 'Active',
            terminated: 'Terminated',
        };
        const normalizedStatus = normalizeContractStatus(status);
        return map[normalizedStatus] || normalizedStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    const filtered = contracts.filter(c =>
        (c.contract_type?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                        Legal &amp; Contracts
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Manage your rental agreements and legal documentation
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Main Contracts List */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl p-10">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">My Contracts</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search contracts..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>
                            </div>

                            {filtered.length > 0 ? (
                                <div className="space-y-4">
                                    {filtered.map((contract) => {
                                        const needsSignature = isPendingUserSignature(contract.status);
                                        return (
                                            <div
                                                key={contract.id}
                                                className={`p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border transition-all group ${needsSignature ? 'border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-orange-900/20 shadow-sm' : 'border-transparent hover:border-orange-500/20'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-orange-500">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                                {(contract.contract_type || 'Contract').charAt(0).toUpperCase() + (contract.contract_type || 'Contract').slice(1)} Agreement
                                                            </h4>
                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                                                <Calendar size={12} />
                                                                Starts: {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'TBD'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(contract.status || '')}`}>
                                                        {getStatusLabel(contract.status || '')}
                                                    </div>
                                                </div>

                                                {/* Signatures */}
                                                <div className="mt-4 flex items-center gap-6 text-xs">
                                                    <span className={`flex items-center gap-1 ${contract.user_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {contract.user_signed_at ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                        You {contract.user_signed_at ? 'signed' : 'not signed'}
                                                    </span>
                                                    <span className={`flex items-center gap-1 ${contract.manager_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {contract.manager_signed_at ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                        Manager {contract.manager_signed_at ? 'signed' : 'not signed'}
                                                    </span>
                                                    {contract.monthly_rent && (
                                                        <span className="text-gray-500 ml-auto font-semibold">
                                                            £{contract.monthly_rent.toLocaleString()}/mo
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-6 flex items-center gap-3">
                                                    {needsSignature && (
                                                        <button
                                                            onClick={() => handleSign(contract.id)}
                                                            disabled={signingId === contract.id}
                                                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                                        >
                                                            {signingId === contract.id
                                                                ? <><Loader2 size={14} className="animate-spin" /> Signing...</>
                                                                : <><PenTool size={14} /> Sign Contract</>
                                                            }
                                                        </button>
                                                    )}
                                                    <button className={`${needsSignature ? '' : 'flex-1'} py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2`}>
                                                        <Eye size={14} /> View Document
                                                    </button>
                                                    <button className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-orange-500 transition-colors">
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText size={32} className="text-gray-200" />
                                    </div>
                                    <p className="text-gray-500 font-medium italic">
                                        {searchQuery ? `No contracts found matching "${searchQuery}"` : 'No contracts yet. Contracts are created after an application is approved.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-gray-900 dark:bg-white rounded-[2.5rem] p-8 shadow-2xl text-white dark:text-gray-900 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <AlertCircle size={80} />
                            </div>
                            <h3 className="text-xl font-black mb-6 tracking-tight relative z-10">Documents</h3>
                            <p className="text-sm text-white/70 dark:text-gray-500 mb-6 relative z-10">
                                Upload your verification documents to progress your application.
                            </p>
                            <button
                                onClick={() => navigate('/user/dashboard/profile')}
                                className="w-full mt-2 py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all relative z-10"
                            >
                                Upload Documents
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-xl border dark:border-gray-700">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight">Support</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">Questions about your legal documents? Our specialists are here to help.</p>
                            <button
                                onClick={() => navigate('/user/dashboard/help')}
                                className="w-full py-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                            >
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
