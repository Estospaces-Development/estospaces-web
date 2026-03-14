"use client";

import React, { useState, useEffect } from 'react';
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
    Search
} from 'lucide-react';
import { bookingsService, type Contract, type ContractTemplate } from '@/services/bookingsService';
import { useToast } from '@/contexts/ToastContext';

export default function ContractsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [contractsResult, templatesResult] = await Promise.all([
                    bookingsService.getContracts(),
                    bookingsService.getContractTemplates()
                ]);
                setContracts(contractsResult.data || []);
                setTemplates(templatesResult.data || []);
            } catch (error: any) {
                toast.error('Failed to load contract information');
                console.error('[ContractsPage] Load Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'signed':
                return 'bg-green-50 text-green-600 border-green-100';
            case 'draft':
            case 'sent':
                return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'expired':
            case 'terminated':
                return 'bg-red-50 text-red-600 border-red-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

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
                        Legal & Contracts
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
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Active Agreements</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search documents..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>
                            </div>

                            {contracts.length > 0 ? (
                                <div className="space-y-4">
                                    {contracts.map((contract) => (
                                        <div key={contract.id} className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-transparent hover:border-orange-500/20 transition-all group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-orange-500">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{contract.contract_type === 'rental' ? 'Rental Agreement' : 'Purchase Agreement'}</h4>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                                            <Calendar size={12} />
                                                            Starts: {new Date(contract.start_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(contract.status)}`}>
                                                    {contract.status}
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center gap-3">
                                                <button className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                    <Eye size={14} /> View Document
                                                </button>
                                                <button className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-orange-500 transition-colors">
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText size={32} className="text-gray-200" />
                                    </div>
                                    <p className="text-gray-500 font-medium italic">No active contracts found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Sidebar: Templates & Forms */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-gray-900 dark:bg-white rounded-[2.5rem] p-8 shadow-2xl text-white dark:text-gray-900 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <AlertCircle size={80} />
                            </div>
                            <h3 className="text-xl font-black mb-6 tracking-tight relative z-10">Required Forms</h3>
                            <div className="space-y-4 relative z-10">
                                {templates.map((template) => (
                                    <div key={template.id} className="flex items-center justify-between p-4 bg-white/10 dark:bg-gray-100 rounded-2xl backdrop-blur-md">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${template.isMandatory ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                                            <span className="text-sm font-bold">{template.name}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-white/40 dark:text-gray-400" />
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
                                Upload New Document
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-xl border dark:border-gray-700">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight">Support</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">Questions about your legal documents? Our legal specialists are here to help.</p>
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
