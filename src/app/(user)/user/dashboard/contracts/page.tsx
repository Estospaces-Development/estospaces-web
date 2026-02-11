"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Download, Eye, CheckCircle, Clock, AlertCircle, FileCheck,
    Search, Filter, SortAsc, SortDesc, List, Grid, Calendar, MapPin,
    MoreVertical, Copy, Share2, X, ChevronRight, Loader2, TrendingUp, Bell, ArrowLeft
} from 'lucide-react';

const MOCK_CONTRACTS = [
    { id: 1, name: 'Lease Agreement', property: 'Modern Downtown Apartment', type: 'Lease Agreement', date: '2024-01-10', status: 'pending', amount: 1500, daysUntilExpiration: 300 },
    { id: 2, name: 'Service Agreement', property: 'Modern Downtown Apartment', type: 'Maintenance', date: '2024-02-15', status: 'signed', amount: 50 },
    { id: 3, name: 'Tenancy Deposit', property: 'Luxury Studio Flat', type: 'Deposit', date: '2024-03-01', status: 'signed', amount: 2400 },
];

export default function ContractsPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    const getStatusConfig = (status: string) => {
        const configs: any = {
            signed: { label: 'Signed', icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            pending: { label: 'Pending Signature', icon: Clock, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
            expired: { label: 'Expired', icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        };
        return configs[status] || { label: status, icon: FileText, color: 'text-gray-600 bg-gray-50' };
    };

    const formatCurrency = (amount: number) => `£${amount.toLocaleString('en-GB')}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                Contracts
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Review and sign your legal documents digitally
                            </p>
                        </div>

                        <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border dark:border-gray-700">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                <Grid size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                <List size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                    <div className="lg:col-span-8">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by property, contract type..."
                                className="w-full bg-white dark:bg-gray-800 border-2 border-transparent dark:border-gray-700 focus:border-orange-500 rounded-3xl pl-14 pr-6 py-5 outline-none font-bold text-gray-900 dark:text-white shadow-xl shadow-gray-200/50 dark:shadow-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-4 flex gap-4">
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl p-5 border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-500">
                                <FileCheck size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Signed</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">12</p>
                            </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl p-5 border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Due</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">1</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contracts Display */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {MOCK_CONTRACTS.map((contract) => {
                            const config = getStatusConfig(contract.status);
                            return (
                                <div key={contract.id} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden group hover:scale-[1.02] transition-all">
                                    <div className="p-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`p-4 rounded-2xl ${config.color}`}>
                                                <FileText size={28} />
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
                                                {config.label}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 truncate">{contract.property}</h3>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-6">{contract.type}</p>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex justify-between text-sm py-2 border-b dark:border-gray-700">
                                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Amount</span>
                                                <span className="text-gray-900 dark:text-white font-black">{formatCurrency(contract.amount)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm py-2 border-b dark:border-gray-700">
                                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Date</span>
                                                <span className="text-gray-900 dark:text-white font-bold">{contract.date}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                                                <Eye size={18} /> View
                                            </button>
                                            <button className="p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all shadow-lg shadow-orange-500/30 active:scale-95">
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Document</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {MOCK_CONTRACTS.map((contract) => {
                                        const config = getStatusConfig(contract.status);
                                        return (
                                            <tr key={contract.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                                <td className="px-10 py-7">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2.5 rounded-xl ${config.color}`}>
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white leading-none mb-1">{contract.name}</p>
                                                            <p className="text-xs text-gray-500 font-medium">{contract.type}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-7">
                                                    <p className="font-bold text-gray-600 dark:text-gray-300">{contract.property}</p>
                                                </td>
                                                <td className="px-10 py-7">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-7 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 transition-all">
                                                            <Eye size={18} />
                                                        </button>
                                                        <button className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg">
                                                            <Download size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
