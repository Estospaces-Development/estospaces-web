"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CreditCard,
    Clock,
    CheckCircle,
    AlertCircle,
    XCircle,
    Download,
    Search,
    FileText,
    Loader2,
    Receipt,
    Calendar,
    DollarSign,
    RefreshCw,
} from 'lucide-react';
import { getPayments, getInvoices, type Payment, type Invoice } from '@/services/paymentsService';

type TabType = 'payments' | 'invoices';

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('payments');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [paymentsRes, invoicesRes] = await Promise.all([
                getPayments().catch(() => ({ success: false, data: [] as Payment[] })),
                getInvoices().catch(() => ({ success: false, data: [] as Invoice[] })),
            ]);
            setPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
            setInvoices(Array.isArray(invoicesRes?.data) ? invoicesRes.data : []);
        } catch {
            setError('Failed to load payment data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getPaymentStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'refunded': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getPaymentStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} />;
            case 'pending': return <Clock size={14} />;
            case 'failed': return <XCircle size={14} />;
            case 'refunded': return <RefreshCw size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    const getInvoiceStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'open': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            case 'uncollectible': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'void': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatAmount = (amount: number, currency: string) => {
        const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
        return `${sym}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const filteredPayments = payments.filter(p =>
        !searchQuery || p.description?.toLowerCase().includes(searchQuery.toLowerCase()) || p.status.includes(searchQuery.toLowerCase())
    );
    const filteredInvoices = invoices.filter(i =>
        !searchQuery || i.status.includes(searchQuery.toLowerCase())
    );

    const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors group w-fit"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <CreditCard className="text-orange-500" />
                            Payments
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">View your payment history and invoices.</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <DollarSign size={18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(totalPaid, 'GBP')}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                <Clock size={18} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(pendingAmount, 'GBP')}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Invoices</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                    </div>
                </div>

                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center p-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm">
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'payments' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            <CreditCard size={16} className="inline mr-1.5 -mt-0.5" />
                            Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'invoices' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            <FileText size={16} className="inline mr-1.5 -mt-0.5" />
                            Invoices
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                        <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
                        <p className="text-gray-500 dark:text-gray-400">{error}</p>
                        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
                            Retry
                        </button>
                    </div>
                ) : activeTab === 'payments' ? (
                    filteredPayments.length > 0 ? (
                        <div className="space-y-3">
                            {filteredPayments.map(payment => (
                                <div key={payment.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                                <CreditCard size={20} className="text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{payment.description || 'Payment'}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(payment.created_at)}</span>
                                                    <span>{payment.payment_method}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(payment.amount, payment.currency)}</p>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPaymentStatusStyle(payment.status)}`}>
                                                {getPaymentStatusIcon(payment.status)}
                                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                            <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                                <CreditCard className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No payments yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                                Your payment history will appear here once you make your first transaction.
                            </p>
                        </div>
                    )
                ) : (
                    filteredInvoices.length > 0 ? (
                        <div className="space-y-3">
                            {filteredInvoices.map(invoice => (
                                <div key={invoice.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                                <FileText size={20} className="text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">Invoice #{invoice.id.substring(0, 8).toUpperCase()}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> Created: {formatDate(invoice.created_at)}</span>
                                                    {invoice.due_date && <span>Due: {formatDate(invoice.due_date)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(invoice.amount, invoice.currency)}</p>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getInvoiceStatusStyle(invoice.status)}`}>
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </div>
                                            <button className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Download">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                            <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                                <FileText className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No invoices yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                                Your invoices will appear here when generated.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
