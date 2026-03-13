"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Filter, Loader2 } from 'lucide-react';
import UserCard from '../../../components/dashboard/UserCard';
import Select from '../../../components/ui/Select';
import BackButton from '../../../components/ui/BackButton';
import { getUserLeads, Lead } from '@/services/leadsService';

const ClientsPage = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error: err } = await getUserLeads();
            if (err) throw new Error(err);
            if (data) setLeads(data);
        } catch (err: any) {
            console.error('Error fetching clients:', err);
            setError(err.message || 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const filtered = useMemo(() => {
        return leads.filter(l => {
            const name = l.name || l.email || '';
            const email = l.email || '';
            if (query && !name.toLowerCase().includes(query.toLowerCase()) && !email.toLowerCase().includes(query.toLowerCase())) return false;
            if (statusFilter && l.status !== statusFilter) return false;
            return true;
        });
    }, [leads, query, statusFilter]);

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
                        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? '...' : leads.length} leads registered</p>
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
            </div>

            {/* Client List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(l => (
                        <UserCard 
                            key={l.id} 
                            name={l.name || l.email || 'Lead'}
                            email={l.email || ''}
                            phone={l.phone || ''}
                            role="user"
                            verified={true}
                            status={(l.status === 'active' || l.status === 'pending' || l.status === 'suspended') ? l.status : 'active'}
                            joinedDate={new Date(l.created_at).toLocaleDateString()}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientsPage;
