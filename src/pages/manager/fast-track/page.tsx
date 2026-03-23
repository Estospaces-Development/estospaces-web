"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FastTrackCase, getFastTrackCases, updateFastTrackCase } from '../../../services/fastTrackService';
import { Lead, getBrokerLeads } from '../../../services/leadsService';
import {
    UserVerificationInfo,
    getPendingUserVerifications,
} from '../../../services/userVerificationService';
import FastTrackCaseCard from '../../../components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '../../../components/manager/FastTrack/FastTrackCaseDetail';
import { Zap, Clock, CheckCircle2, AlertOctagon, RefreshCw, FileUp } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import Toast from '../../../components/ui/Toast';
import {
    buildCaseKey,
    buildDocumentsFromVerification,
    buildVerificationSummary,
    formatLeadStatus,
} from '../../../lib/fastTrackWorkflow';
import {
    buildManagerFastTrackSearchParams,
    resolveManagerFastTrackSelection,
} from '../../../lib/managerFastTrack';

type ManagerFastTrackCase = FastTrackCase & {
    matchingLead: Lead | null;
    verificationInfo: UserVerificationInfo | null;
    verificationSummary: string;
    leadStatusLabel: string;
    documentsReady: boolean;
};

const FastTrackDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<ManagerFastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const [casesResult, leadsResult, verificationResult] = await Promise.all([
            getFastTrackCases(),
            getBrokerLeads(),
            getPendingUserVerifications('manager'),
        ]);

        if (casesResult.error || leadsResult.error || verificationResult.error) {
            if (!silent) {
                setError(casesResult.error || leadsResult.error || verificationResult.error || 'Failed to fetch cases');
            }
            if (!silent) {
                setLoading(false);
            }
            return;
        }

        const leads = leadsResult.data || [];
        const verificationInfos = verificationResult.data || [];
        const leadById = new Map<string, Lead>();
        const leadByCaseKey = new Map<string, Lead>();
        const verificationByUserId = new Map<string, UserVerificationInfo>();

        leads.forEach((lead) => {
            leadById.set(lead.id, lead);

            const key = buildCaseKey(lead.property_id, lead.user_id);
            const existing = leadByCaseKey.get(key);
            if (!existing || new Date(existing.updated_at).getTime() < new Date(lead.updated_at).getTime()) {
                leadByCaseKey.set(key, lead);
            }
        });

        verificationInfos.forEach((entry) => {
            verificationByUserId.set(entry.user_id, entry);
        });

        const nextCases = (casesResult.data || []).map((caseItem) => {
            const matchingLead = caseItem.leadId
                ? (leadById.get(caseItem.leadId) || null)
                : (leadByCaseKey.get(buildCaseKey(caseItem.propertyId, caseItem.clientId)) || null);
            const verificationInfo = verificationByUserId.get(caseItem.clientId) || null;
            const documents = buildDocumentsFromVerification(verificationInfo, caseItem.documents);

            return {
                ...caseItem,
                documents,
                matchingLead,
                verificationInfo,
                verificationSummary: buildVerificationSummary(verificationInfo, matchingLead, documents),
                leadStatusLabel: formatLeadStatus(matchingLead?.status),
                documentsReady: Object.values(documents).every((status) => status === 'verified'),
            };
        });

        setCases(nextCases);
        setError(null);

        if (!silent) {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            void fetchCases(true);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [fetchCases]);

    useEffect(() => {
        setSelectedCaseId((previous) => resolveManagerFastTrackSelection(
            cases,
            searchParams.get('case'),
            searchParams.get('lead'),
            previous,
        ));
    }, [cases, searchParams]);

    const selectedCase = useMemo(
        () => cases.find((caseItem) => caseItem.caseId === selectedCaseId) || null,
        [cases, selectedCaseId],
    );

    const handleSelectCase = useCallback((caseId: string) => {
        setSelectedCaseId(caseId);
        setSearchParams((previous) => buildManagerFastTrackSearchParams(previous, caseId));
    }, [setSearchParams]);

    const handleUpdateCase = async (updatedCase: FastTrackCase) => {
        setCases((previous) => previous.map((caseItem) => (
            caseItem.caseId === updatedCase.caseId
                ? {
                    ...caseItem,
                    currentStep: updatedCase.currentStep,
                    finalStatus: updatedCase.finalStatus,
                    documents: updatedCase.documents,
                    documentsReady: Object.values(updatedCase.documents).every((status) => status === 'verified'),
                }
                : caseItem
        )));

        const { error: updateError } = await updateFastTrackCase(updatedCase.id, {
            current_step: updatedCase.currentStep,
            final_status: updatedCase.finalStatus,
            documents: updatedCase.documents,
        });

        if (updateError) {
            setToast({ message: 'Failed to update case', type: 'error', visible: true });
            void fetchCases();
            return;
        }

        setToast({ message: 'Case updated successfully', type: 'success', visible: true });
        void fetchCases(true);
    };

    const handleCloseSelectedCase = () => {
        setSelectedCaseId(null);
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('case');
            next.delete('lead');
            next.delete('user');
            return next;
        });
    };

    const stats = useMemo(() => {
        return {
            active: cases.filter((caseItem) => caseItem.finalStatus === 'in_progress').length,
            completedToday: cases.filter((caseItem) => caseItem.finalStatus === 'completed').length,
            attention: cases.filter((caseItem) => caseItem.finalStatus === 'expired' || caseItem.finalStatus === 'rejected').length,
            reviewQueue: cases.filter((caseItem) => caseItem.finalStatus === 'in_progress' && !caseItem.documentsReady && caseItem.verificationSummary !== 'Awaiting user uploads').length,
        };
    }, [cases]);

    if (selectedCase) {
        return (
            <>
                <div className="h-[calc(100vh-100px)] animate-in slide-in-from-right duration-300">
                    <FastTrackCaseDetail
                        caseData={selectedCase}
                        onClose={handleCloseSelectedCase}
                        onUpdate={handleUpdateCase}
                        verificationSummary={selectedCase.verificationSummary}
                        leadStatusLabel={selectedCase.leadStatusLabel}
                        isDocumentsVerifiedOverride={selectedCase.documentsReady}
                    />
                </div>
                {toast.visible && (
                    <div className="fixed top-4 right-4 z-50">
                        <Toast
                            id="fast-track-toast"
                            message={toast.message}
                            type={toast.type}
                            isVisible={toast.visible}
                            onClose={() => setToast((previous) => ({ ...previous, visible: false }))}
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="relative h-full">
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col gap-2">
                    <BackButton />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl shadow-lg shadow-indigo-500/20">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">24-Hour Fast Track</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Live deal acceleration, admin-verified documents, and status handoff in one place</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Cases</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.active}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Review Queue</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.reviewQueue}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <FileUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Today</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.completedToday}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs Attention</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.attention}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        Priority Queue
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {cases.map((caseItem) => (
                            <div key={caseItem.caseId} onClick={() => handleSelectCase(caseItem.caseId)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                                <FastTrackCaseCard
                                    caseData={caseItem}
                                    onUpdate={handleUpdateCase}
                                    verificationSummary={caseItem.verificationSummary}
                                    leadStatusLabel={caseItem.leadStatusLabel}
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
                            <button onClick={() => void fetchCases()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">
                                Retry
                            </button>
                        </div>
                    ) : cases.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-black rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                                <Zap size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No active cases found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                There are currently no fast track cases assigned to you. When new cases are created, they will appear here in the priority queue.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
            {toast.visible && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        id="fast-track-toast"
                        message={toast.message}
                        type={toast.type}
                        isVisible={toast.visible}
                        onClose={() => setToast((previous) => ({ ...previous, visible: false }))}
                    />
                </div>
            )}
        </div>
    );
};

export default FastTrackDashboard;
