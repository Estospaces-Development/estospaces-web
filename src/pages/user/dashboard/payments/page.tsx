"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, Calendar, CheckCircle, Clock, AlertCircle, ArrowLeft,
    Download, Eye, X, ChevronRight, Home, Shield, Sparkles, TrendingUp,
    CreditCardIcon, Building, Receipt, Search, Filter, Plus, Trash2,
    MoreVertical, FileText, ArrowUpRight, ArrowDownLeft, Loader2
} from 'lucide-react';

// Services
import { paymentsService, Payment, Invoice } from '@/services/paymentsService';

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, iRes] = await Promise.all([
                paymentsService.getPayments(),
                paymentsService.getInvoices()
            ]);
            if (pRes.data) setPayments(pRes.data);
            if (iRes.data) setInvoices(iRes.data);
        } catch (err) {
            console.error('[Payments] Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const upcomingPayments = payments.filter(p => p.status === 'pending').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const nextPayment = upcomingPayments[0];
    const totalPaidAmount = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const totalPendingAmount = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

    const getTypeConfig = (type: string) => {
        const configs: any = {
            deposit: { label: 'Deposit', icon: Shield, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20' },
            rent: { label: 'Rent', icon: Home, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' },
            service_fee: { label: 'Service Fee', icon: FileText, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800/50' },
            electric: { label: 'Electric Bill', icon: Sparkles, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' },
            water: { label: 'Water Bill', icon: Sparkles, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/20' },
            gas: { label: 'Gas Bill', icon: Sparkles, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20' },
            internet: { label: 'Internet', icon: Sparkles, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20' },
            council_tax: { label: 'Council Tax', icon: Building, color: 'text-red-600 bg-red-100 dark:bg-red-900/20' },
        };
        // Normalize description/type
        const lowerDesc = type.toLowerCase();
        if (lowerDesc.includes('rent')) return configs.rent;
        if (lowerDesc.includes('deposit')) return configs.deposit;
        if (lowerDesc.includes('electric')) return configs.electric;

        return configs[type] || { label: 'Payment', icon: CreditCard, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800/50' };
    };

    const formatCurrency = (amount: number) => `£${amount.toLocaleString('en-GB')}`;

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

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

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                Payments
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Manage your rent, deposits, and monthly utility bills
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="px-5 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center gap-3">
                                <Shield size={20} className="text-green-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bank Grade Security</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-10 overflow-x-auto pb-4 scrollbar-hide">
                        {['overview', 'history', 'methods'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-8 py-3.5 rounded-2xl font-bold text-sm capitalize transition-all ${activeTab === tab
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'
                                    : 'bg-white dark:bg-gray-800 text-gray-500'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl shadow-gray-200/50 dark:shadow-none group hover:scale-[1.02] transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600">
                                    <TrendingUp size={28} />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(totalPaidAmount)}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                                <ArrowUpRight size={16} />
                                <span>100% of bills cleared</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl shadow-gray-200/50 dark:shadow-none group hover:scale-[1.02] transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                    <Clock size={28} />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Due Soon</p>
                                    <h3 className="text-3xl font-black text-orange-500">{formatCurrency(totalPendingAmount)}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                                <AlertCircle size={16} />
                                <span>{upcomingPayments.length} upcoming</span>
                            </div>
                        </div>

                        {nextPayment ? (
                            <div className="bg-gray-900 dark:bg-white rounded-3xl p-8 shadow-2xl overflow-hidden relative group hover:scale-[1.02] transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-gray-900/5 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Next Scheduled</p>
                                        <h3 className="text-2xl font-black text-white dark:text-gray-900">{formatCurrency(nextPayment.amount)}</h3>
                                        <p className="text-gray-400 dark:text-gray-500 text-sm font-bold mt-1">{getTypeConfig(nextPayment.description || '').label} • {formatDate(nextPayment.created_at)}</p>
                                    </div>
                                    <button className="w-full mt-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2">
                                        Pay Early <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <p className="font-bold text-gray-900 dark:text-white">All caught up!</p>
                                <p className="text-sm text-gray-500">No upcoming payments</p>
                            </div>
                        )}

                        {/* Recent Payments Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
                            <div className="px-10 py-8 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
                                <button onClick={() => setActiveTab('history')} className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-2">
                                    Full History <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="divide-y dark:divide-gray-700">
                                {payments.map((payment) => {
                                    const config = getTypeConfig(payment.description || '');
                                    return (
                                        <div key={payment.id} className="px-10 py-6 flex items-center gap-6 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                                <config.icon size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 dark:text-white truncate">{config.label}</h4>
                                                <p className="text-sm text-gray-500 font-medium truncate">{payment.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                                                <div className="flex items-center justify-end gap-2 mt-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${payment.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${payment.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                                                        {payment.status === 'completed' ? 'Completed' : 'Upcoming'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                            <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                                <div className="flex gap-2">
                                    {['all', 'rent', 'utilities'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setHistoryFilter(f)}
                                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${historyFilter === f
                                                ? 'bg-orange-500 text-white shadow-lg'
                                                : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search ref or property..."
                                        className="w-full md:w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl pl-12 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 font-medium text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Payment For</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Reference</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeConfig(p.description || '').color}`}>
                                                            {React.createElement(getTypeConfig(p.description || '').icon, { size: 16 })}
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-white">{getTypeConfig(p.description || '').label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-sm text-gray-500 font-medium">{formatDate(p.created_at)}</td>
                                                <td className="px-8 py-6 text-xs font-mono text-gray-400 font-bold">{p.id.substring(0, 8)}</td>
                                                <td className="px-8 py-6 text-right font-black text-gray-900 dark:text-white">{formatCurrency(p.amount)}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="p-2 text-gray-400 hover:text-orange-500 transition-colors">
                                                        <Download size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'methods' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Saved Cards</h2>
                                    <button className="p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg">
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl group transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-white text-[10px] font-black tracking-widest italic">VISA</div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Visa ending in 4242</p>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Expires 12/28</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Primary</span>
                                            <button className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center text-center py-16">
                                <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-full text-orange-500 mb-6">
                                    <Building size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Bank Accounts</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs font-medium">Link your bank account for easier Direct Debit payments.</p>
                                <button className="mt-8 px-10 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-2xl font-black transition-all">
                                    Add Bank Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const ArrowRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

