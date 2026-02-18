'use client';

import { useState } from 'react';
import { DollarSign, Download, Eye } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface Invoice {
    id: string;
    invoiceId: string;
    property: string;
    project: string;
    amount: string;
    status: string;
    date: string;
}

export default function BillingPage() {
    const [selectedPeriod, setSelectedPeriod] = useState('Current Month');

    const invoices: Invoice[] = [
        {
            id: '1',
            invoiceId: 'INV-2026-001',
            property: 'Modern City Centre Flat',
            project: 'Property Management',
            amount: '£2,500.00',
            status: 'Paid',
            date: '2026-01-10',
        },
        {
            id: '2',
            invoiceId: 'INV-2026-002',
            property: 'Luxury Canary Wharf Apartment',
            project: 'Property Management',
            amount: '£3,200.00',
            status: 'Pending',
            date: '2026-01-12',
        },
        {
            id: '3',
            invoiceId: 'INV-2026-003',
            property: 'Spacious Kensington Penthouse',
            project: 'Property Management',
            amount: '£1,000.00',
            status: 'Overdue',
            date: '2026-01-05',
        },
        {
            id: '4',
            invoiceId: 'INV-2026-004',
            property: 'Modern City Centre Flat',
            project: 'Property Management',
            amount: '£2,500.00',
            status: 'Paid',
            date: '2026-01-08',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <div className="mb-4">
                    <BackButton />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Billing & Payments</h1>
            </div>

            {/* Revenue Overview */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Revenue Overview</h2>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option>Current Month</option>
                        <option>Last Month</option>
                        <option>Last 3 Months</option>
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500 rounded-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1">£2,500.00</h3>
                        <p className="text-sm text-green-600 dark:text-green-400">Total Revenue</p>
                    </div>

                    <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/40 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-primary rounded-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-primary dark:text-orange-400 mb-1">£3,200.00</h3>
                        <p className="text-sm text-primary/80 dark:text-orange-300">Pending Payments</p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-500 rounded-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-red-700 dark:text-red-400 mb-1">£1,000.00</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
                    </div>
                </div>
            </div>

            {/* Invoices */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Invoices ({invoices.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Invoice ID</th>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Property</th>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{invoice.property}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{invoice.project}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.amount}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'Paid'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : invoice.status === 'Pending'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }`}
                                        >
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300" title="View">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300" title="Download">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
