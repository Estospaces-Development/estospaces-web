"use client";

import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Filter } from 'lucide-react';
import UserCard from '../../../../components/dashboard/UserCard';
import Select from '../../../../components/ui/Select';
import BackButton from '../../../../components/ui/BackButton';

const mockClients = [
    { id: 'c1', name: 'James Thompson', email: 'james.t@email.com', phone: '+44 7700 100001', role: 'user' as const, verified: true, status: 'active' as const, joinedDate: 'Jan 2026' },
    { id: 'c2', name: 'Sophia Martinez', email: 'sophia.m@email.com', phone: '+44 7700 100002', role: 'user' as const, verified: true, status: 'active' as const, joinedDate: 'Dec 2025' },
    { id: 'c3', name: 'Liam Chen', email: 'liam.c@email.com', phone: '+44 7700 100003', role: 'user' as const, verified: false, status: 'pending' as const, joinedDate: 'Feb 2026' },
    { id: 'c4', name: 'Olivia Williams', email: 'olivia.w@email.com', phone: '+44 7700 100004', role: 'broker' as const, verified: true, status: 'active' as const, joinedDate: 'Nov 2025' },
    { id: 'c5', name: 'Noah Patel', email: 'noah.p@email.com', phone: '+44 7700 100005', role: 'user' as const, verified: true, status: 'active' as const, joinedDate: 'Jan 2026' },
    { id: 'c6', name: 'Emma Anderson', email: 'emma.a@email.com', phone: '+44 7700 100006', role: 'user' as const, verified: false, status: 'suspended' as const, joinedDate: 'Oct 2025' },
];

const ClientsPage = () => {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const filtered = useMemo(() => {
        return mockClients.filter(c => {
            if (query && !c.name.toLowerCase().includes(query.toLowerCase()) && !c.email.toLowerCase().includes(query.toLowerCase())) return false;
            if (statusFilter && c.status !== statusFilter) return false;
            if (roleFilter && c.role !== roleFilter) return false;
            return true;
        });
    }, [query, statusFilter, roleFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{mockClients.length} clients registered</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-md">
                    <Plus className="w-4 h-4" /> Add Client
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search clients..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <Select
                    options={[
                        { value: 'active', label: 'Active' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'suspended', label: 'Suspended' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                    className="w-full sm:w-44"
                />
                <Select
                    options={[
                        { value: 'user', label: 'Users' },
                        { value: 'broker', label: 'Brokers' },
                    ]}
                    value={roleFilter}
                    onChange={setRoleFilter}
                    placeholder="All Roles"
                    className="w-full sm:w-40"
                />
            </div>

            {/* Client List */}
            {filtered.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(c => (
                        <UserCard key={c.id} {...c} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientsPage;
