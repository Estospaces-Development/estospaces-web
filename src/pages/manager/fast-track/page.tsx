"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FastTrackCase, getFastTrackCases, updateFastTrackCase } from '../../../services/fastTrackService';
import { Lead, getBrokerLeads, respondToLead } from '../../../services/leadsService';
import { getApplications, type Application } from '../../../services/applicationsService';
import { getViewings, type Viewing } from '../../../services/bookingsService';
import { getUserContracts } from '../../../services/contractsService';
import { getSaleProgressions, type SaleProgression } from '../../../services/salesService';
import {
    UserVerificationInfo,
    UserVerificationDetails,
    getPendingUserVerifications,
    getUserVerificationDetails,
} from '../../../services/userVerificationService';
import FastTrackCaseCard from '../../../components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '../../../components/manager/FastTrack/FastTrackCaseDetail';
import UserVerificationReviewModal from '../../../components/verification/UserVerificationReviewModal';
import { Zap, Clock, CheckCircle2, AlertOctagon, RefreshCw, FileUp, Search } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { messagesService } from '../../../services/messagesService';
import {
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    buildCaseKey,
    buildDocumentsFromDetails,
    buildDocumentsFromVerification,
    buildVerificationSummary,
    formatLeadStage,
    needsFastTrackCaseAttention,
    resolveLeadStage,
} from '../../../lib/fastTrackWorkflow';
import {
    buildManagerFastTrackSearchParams,
    resolveManagerFastTrackSelection,
} from '../../../lib/managerFastTrack';
import { resolveFastTrackLinkedJourney, type FastTrackLinkedJourney } from '../../../lib/fastTrackLinkedJourney';
import type { Contract } from '../../../types/booking';

type ManagerFastTrackCase = FastTrackCase & {
    matchingLead: Lead | null;
    verificationInfo: UserVerificationInfo | null;
    verificationSummary: string;
    leadStatusLabel: string;
    documentsReady: boolean;
    linkedJourney: FastTrackLinkedJourney;
};

const safeLoad = async <T,>(loader: () => Promise<T>) => {
    try {
        return { data: await loader(), error: null as string | null };
    } catch (error: any) {
        return { data: null as T | null, error: error?.message || 'Failed to load workflow records' };
    }
};

const FastTrackDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const [cases, setCases] = useState<ManagerFastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedVerificationUserId, setSelectedVerificationUserId] = useState<string | null>(null);
    const [selectedVerificationDetails, setSelectedVerificationDetails] = useState<UserVerificationDetails | null>(null);
    const [requestingLeadId, setRequestingLeadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

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
        const [
            applicationsResult,
            viewingsResult,
            contractsResult,
            saleProgressionsResult,
        ] = await Promise.all([
            getApplications({ suppressErrorToast: true }),
            safeLoad(() => getViewings()),
            safeLoad(async () => {
                const result = await getUserContracts();
                if (result.error) {
                    throw new Error(result.error);
                }

                return result.data || [];
            }),
            getSaleProgressions(),
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
        const applications = applicationsResult.data || [];
        const viewings = viewingsResult.data || [];
        const contracts = contractsResult.data || [];
        const saleProgressions = saleProgressionsResult.data || [];
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
            const documents = matchingLead?.documents_verified
                ? {
                    identityProof: 'verified' as const,
                    addressProof: 'verified' as const,
                }
                : buildDocumentsFromVerification(verificationInfo, caseItem.documents);

            return {
                ...caseItem,
                documents,
                matchingLead,
                verificationInfo,
                verificationSummary: buildVerificationSummary(verificationInfo, matchingLead, documents),
                leadStatusLabel: formatLeadStage(resolveLeadStage(matchingLead)),
                documentsReady: Object.values(documents).every((status) => status === 'verified'),
                linkedJourney: resolveFastTrackLinkedJourney(caseItem, {
                    applications: applications as Application[],
                    viewings: viewings as Viewing[],
                    contracts: contracts as Contract[],
                    saleProgressions: saleProgressions as SaleProgression[],
                }),
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
    const selectedCaseDocuments = useMemo(
        () => selectedCase
            ? buildDocumentsFromDetails(selectedVerificationDetails?.documents || [], selectedCase.documents)
            : null,
        [selectedCase, selectedVerificationDetails?.documents],
    );
    const selectedCaseDocumentItems = useMemo(
        () => buildFastTrackDocumentItems(selectedVerificationDetails?.documents || [], selectedCaseDocuments || {
            identityProof: 'pending',
            addressProof: 'pending',
        }),
        [selectedCaseDocuments, selectedVerificationDetails?.documents],
    );
    const selectedCaseVerificationContent = useMemo(
        () => buildFastTrackVerificationContent(selectedCaseDocumentItems),
        [selectedCaseDocumentItems],
    );
    const selectedCaseLeadStatusLabel = useMemo(
        () => selectedCase
            ? formatLeadStage(resolveLeadStage(selectedCase.matchingLead, selectedVerificationDetails?.documents || []))
            : '',
        [selectedCase, selectedVerificationDetails?.documents],
    );

    useEffect(() => {
        if (!selectedCase?.clientId) {
            setSelectedVerificationDetails(null);
            return;
        }

        let cancelled = false;
        const loadSelectedVerificationDetails = async () => {
            const { data } = await getUserVerificationDetails('manager', selectedCase.clientId);
            if (!cancelled) {
                setSelectedVerificationDetails(data);
            }
        };

        void loadSelectedVerificationDetails();

        return () => {
            cancelled = true;
        };
    }, [selectedCase?.clientId]);

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
                    nextAction: updatedCase.nextAction,
                    nextActionTarget: updatedCase.nextActionTarget,
                    statusReason: updatedCase.statusReason,
                    pendingRequirements: updatedCase.pendingRequirements,
                    completedRequirements: updatedCase.completedRequirements,
                    overrideReason: updatedCase.overrideReason,
                    overrideBy: updatedCase.overrideBy,
                    overrideAt: updatedCase.overrideAt,
                    documentsReady: Object.values(updatedCase.documents).every((status) => status === 'verified'),
                }
                : caseItem
        )));

        const { error: updateError } = await updateFastTrackCase(updatedCase.id, {
            current_step: updatedCase.currentStep,
            final_status: updatedCase.finalStatus,
            documents: updatedCase.documents,
            override_reason: updatedCase.overrideReason,
        });

        if (updateError) {
            toast.error('Failed to update case');
            void fetchCases();
            return;
        }

        toast.success('Case updated successfully');
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
            attention: cases.filter((caseItem) => needsFastTrackCaseAttention(caseItem)).length,
            reviewQueue: cases.filter((caseItem) => caseItem.finalStatus === 'in_progress' && !caseItem.documentsReady && caseItem.verificationSummary !== 'Awaiting user uploads').length,
        };
    }, [cases]);

    const filteredCases = useMemo(() => {
        if (!searchQuery.trim()) return cases;
        const query = searchQuery.toLowerCase();
        return cases.filter(caseItem => 
            caseItem.caseId.toLowerCase().includes(query) ||
            caseItem.clientName.toLowerCase().includes(query) ||
            caseItem.propertyTitle.toLowerCase().includes(query)
        );
    }, [cases, searchQuery]);

    const handleRequestDocuments = useCallback(async (caseItem: ManagerFastTrackCase) => {
        if (!caseItem.matchingLead?.id || !caseItem.matchingLead?.user_id) {
            toast.error('This fast-track case does not have a live user lead yet.');
            return;
        }

        const requestMessage = `Hi ${caseItem.clientName}, please upload your verification documents so we can keep your 24-hour fast-track moving without delay.`;

        setRequestingLeadId(caseItem.matchingLead.id);
        try {
            const response = await respondToLead(caseItem.matchingLead.id, 'request_docs', requestMessage);
            if (response.error) {
                throw new Error(response.error);
            }

            const conversation = await messagesService.upsertDirectConversation(caseItem.matchingLead.user_id, {
                propertyId: caseItem.propertyId,
                propertyTitle: caseItem.propertyTitle,
                senderName: user?.name || user?.email || 'Manager',
                senderEmail: user?.email || '',
                senderPhone: user?.phone || '',
                recipientName: caseItem.clientName,
            });

            await messagesService.sendMessage({
                conversationId: conversation.id,
                content: requestMessage,
                type: 'text',
            });

            toast.success('Document request sent and synced with the live case.');
            await fetchCases(true);
        } catch (error: any) {
            toast.error(error?.message || 'Unable to request documents for this case right now.');
        } finally {
            setRequestingLeadId(null);
        }
    }, [fetchCases, toast, user]);

    if (selectedCase) {
        return (
            <>
                <div className="h-[calc(100vh-100px)] min-h-0 overflow-hidden animate-in slide-in-from-right duration-300">
                    <FastTrackCaseDetail
                        caseData={selectedCaseDocuments ? { ...selectedCase, documents: selectedCaseDocuments } : selectedCase}
                        onClose={handleCloseSelectedCase}
                        onUpdate={handleUpdateCase}
                        verificationSummary={selectedVerificationDetails ? selectedCaseVerificationContent.summary : selectedCase.verificationSummary}
                        verificationReasonLines={selectedVerificationDetails ? selectedCaseVerificationContent.reasonLines : []}
                        leadStatusLabel={selectedVerificationDetails ? selectedCaseLeadStatusLabel : selectedCase.leadStatusLabel}
                        linkedJourney={selectedCase.linkedJourney}
                        onOpenVerificationReview={selectedCase.clientId ? () => setSelectedVerificationUserId(selectedCase.clientId) : undefined}
                        onRequestDocuments={selectedCase.matchingLead ? () => {
                            void handleRequestDocuments(selectedCase);
                        } : undefined}
                        isRequestingDocuments={requestingLeadId === selectedCase.matchingLead?.id}
                        isDocumentsVerifiedOverride={selectedVerificationDetails
                            ? selectedCaseDocumentItems.every((item) => item.status === 'verified')
                            : selectedCase.documentsReady}
                    />
                </div>
                {selectedVerificationUserId && (
                    <UserVerificationReviewModal
                        scope="manager"
                        userId={selectedVerificationUserId}
                        variant="fast_track"
                        onUpdated={async () => {
                            await fetchCases(true);
                            if (selectedCase.clientId) {
                                const { data } = await getUserVerificationDetails('manager', selectedCase.clientId);
                                setSelectedVerificationDetails(data);
                            }
                        }}
                        onClose={() => {
                            setSelectedVerificationUserId(null);
                            void fetchCases(true);
                        }}
                    />
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

                        <div className="relative w-full md:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by client or property..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            />
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
                        {filteredCases.map((caseItem) => (
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
                    ) : filteredCases.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-black rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                                <Zap size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No matching cases</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                {searchQuery 
                                    ? `We couldn't find any cases matching "${searchQuery}".`
                                    : "There are currently no fast track cases assigned to you. When new cases are created, they will appear here in the priority queue."}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default FastTrackDashboard;
