"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { FastTrackCase, getFastTrackCases, updateFastTrackCase, createFastTrackCase } from '../../../services/fastTrackService';
import FastTrackCaseCard from '../../../components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '../../../components/manager/FastTrack/FastTrackCaseDetail';
import { Zap, Clock, CheckCircle2, AlertOctagon, RefreshCw } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import Toast from '../../../components/ui/Toast';

const FastTrackDashboard = () => {
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Add toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false
    });

    const fetchCases = async () => {
        setLoading(true);
        const { data, error } = await getFastTrackCases();
        if (data) {
            setCases(data);
            // If selected case exists, update it
            if (selectedCaseId) {
                const updatedSelected = data.find(c => c.caseId === selectedCaseId);
                if (!updatedSelected && selectedCaseId) {
                    // Case might have been removed or ID changed (unlikely)
                    setSelectedCaseId(null);
                }
            }
        } else {
            setError(error || 'Failed to fetch cases');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleUpdateCase = async (updatedCase: FastTrackCase) => {
        // Optimistic update
        setCases(prev => prev.map(c => c.caseId === updatedCase.caseId ? updatedCase : c));

        const { error } = await updateFastTrackCase(updatedCase.id, {
            current_step: updatedCase.currentStep,
            final_status: updatedCase.finalStatus,
            documents: updatedCase.documents
        });

        if (error) {
            setToast({ message: 'Failed to update case', type: 'error', visible: true });
            // Revert or fetch again
            fetchCases();
        } else {
            setToast({ message: 'Case updated successfully', type: 'success', visible: true });
        }
    };

    // Temporary helper to seed data if empty (for demo continuity)
    const handleSeedData = async () => {
        const seed = {
            property_id: "prop-seed-" + Date.now(),
            client_id: "client-seed-" + Date.now(),
            client_name: "Demo Client",
            property_title: "Demo Property " + Date.now(),
            property_type: "rent" as const
        };
        await createFastTrackCase(seed);
        fetchCases();
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
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">24-Hour Fast Track</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manager-led deal acceleration & readiness workflow</p>
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

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <p className="text-red-500 dark:text-red-400">{error}</p>
                            <button onClick={fetchCases} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">
                                Retry
                            </button>
                        </div>
                    ) : cases.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-black/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No active fast track cases.</p>
                            <button
                                onClick={handleSeedData}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 mx-auto"
                            >
                                <Zap className="w-4 h-4" />
                                Generate Demo Case
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default FastTrackDashboard;
