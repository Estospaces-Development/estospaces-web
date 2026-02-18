"use client";

import React, { useState, useMemo } from 'react';
import { mockFastTrackCases, FastTrackCase } from '@/mocks/fastTrackCases';
import FastTrackCaseCard from '@/components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '@/components/manager/FastTrack/FastTrackCaseDetail';
import { Zap, Clock, CheckCircle2, AlertOctagon } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

const AdminFastTrackDashboard = () => {
    const [cases, setCases] = useState<FastTrackCase[]>(mockFastTrackCases);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    const handleUpdateCase = (updatedCase: FastTrackCase) => {
        setCases(prev => prev.map(c => c.caseId === updatedCase.caseId ? updatedCase : c));
    };

    const selectedCase = useMemo(() =>
        cases.find(c => c.caseId === selectedCaseId),
        [cases, selectedCaseId]);

    const stats = useMemo(() => {
        return {
            active: cases.filter(c => c.finalStatus === 'in_progress').length,
            completedToday: cases.filter(c => c.finalStatus === 'completed').length,
            expired: cases.filter(c => c.finalStatus === 'expired').length
        };
    }, [cases]);

    if (selectedCase) {
        return (
            <div className="h-[calc(100vh-100px)] animate-in slide-in-from-right duration-300">
                <FastTrackCaseDetail
                    caseData={selectedCase}
                    onClose={() => setSelectedCaseId(null)}
                    onUpdate={handleUpdateCase}
                />
            </div>
        );
    }

    return (
        <div className="relative h-full">
            {/* Main Content */}
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <BackButton />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fast Track Oversight</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and intervene in 24-hour fast track deals</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Cases</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.active}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Today</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.completedToday}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expired / Delayed</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.expired}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                {/* Case Grid */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        Priority Queue
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {cases.map(caseItem => (
                            <div key={caseItem.caseId} onClick={() => setSelectedCaseId(caseItem.caseId)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                                <FastTrackCaseCard
                                    caseData={caseItem}
                                    onUpdate={handleUpdateCase}
                                />
                            </div>
                        ))}
                    </div>

                    {cases.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 dark:bg-black/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">No active fast track cases.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminFastTrackDashboard;
