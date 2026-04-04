"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FastTrackCase, getFastTrackCases, updateFastTrackCase, type DocStatus } from '../../../services/fastTrackService';
import { Lead, getBrokerLeads, respondToLead } from '../../../services/leadsService';
import { getApplications, type Application } from '../../../services/applicationsService';
import { getViewings, type Viewing } from '../../../services/bookingsService';
import { getUserContracts } from '../../../services/contractsService';
import { getManagerInvoices, getManagerPayments } from '../../../services/paymentsService';
import { getSaleProgressions, type SaleProgression } from '../../../services/salesService';
import {
    UserVerificationInfo,
    UserVerificationDetails,
    getPendingUserVerifications,
    getUserVerificationDetails,
} from '../../../services/userVerificationService';
import FastTrackCaseCard from '../../../components/manager/FastTrack/FastTrackCaseCard';
import FastTrackCaseDetail from '../../../components/manager/FastTrack/FastTrackCaseDetail';
import ManualFastTrackModal from '../../../components/manager/FastTrack/ManualFastTrackModal';
import UserVerificationReviewModal from '../../../components/verification/UserVerificationReviewModal';
import { Zap, Clock, CheckCircle2, AlertOctagon, RefreshCw, FileUp, Search, Plus } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '../../../contexts/WorkspaceSyncContext';
import { messagesService } from '../../../services/messagesService';
import { WORKSPACE_SYNC_TAGS } from '../../../lib/workspaceSync';
import {
    buildCaseDocumentsFromVerification,
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    buildCaseKey,
    buildDocumentsFromDetails,
    buildDocumentsFromVerification,
    buildVerificationSummary,
    canRequestLeadDocuments,
    deriveLiveFastTrackDocumentPhase,
    deriveLiveFastTrackCurrentStep,
    FAST_TRACK_STEP_META,
    filterDocumentsForLead,
    formatLeadStage,
    needsFastTrackCaseAttention,
    resolveLeadStage,
} from '../../../lib/fastTrackWorkflow';
import {
    buildManagerFastTrackSearchParams,
    resolveManagerFastTrackSelection,
} from '../../../lib/managerFastTrack';
import { DELETED_FAST_TRACK_CASE_MESSAGE } from '../../../lib/fastTrackCaseContext';
import { hasPendingRentFinanceTasks, resolveFastTrackStageGuidance } from '../../../lib/fastTrackStageGuidance';
import { resolveFastTrackLinkedJourney, type FastTrackLinkedJourney } from '../../../lib/fastTrackLinkedJourney';
import { resolveWorkspaceSection } from '@/lib/liveCaseWorkspace';
import type { Contract } from '../../../types/booking';

type ManagerFastTrackCase = FastTrackCase & {
    matchingLead: Lead | null;
    verificationInfo: UserVerificationInfo | null;
    verificationSummary: string;
    leadStatusLabel: string;
    documentsReady: boolean;
    linkedJourney: FastTrackLinkedJourney;
};

const toStoredFastTrackDocumentStatus = (status: 'missing' | 'uploaded' | 'verified' | 'reupload_required'): DocStatus => {
    switch (status) {
        case 'verified':
            return 'verified';
        case 'uploaded':
            return 'uploaded';
        case 'reupload_required':
            return 'reupload_required';
        default:
            return 'pending';
    }
};

const buildFastTrackCaseDocumentUpdate = (
    caseItem: FastTrackCase,
    documents: UserVerificationDetails['documents'] = [],
) => {
    const items = buildFastTrackDocumentItems(documents, caseItem.documents);
    const nextDocuments = {
        identityProof: toStoredFastTrackDocumentStatus(items.find((item) => item.id === 'identity')?.status || 'missing'),
        addressProof: toStoredFastTrackDocumentStatus(items.find((item) => item.id === 'address')?.status || 'missing'),
    };
    const nextStep = items.every((item) => item.status === 'verified')
        ? 'documents_verified'
        : items.some((item) => item.status === 'uploaded' || item.status === 'reupload_required') || caseItem.currentStep === 'documents_requested'
            ? 'documents_requested'
            : 'property_selected';

    return {
        current_step: nextStep,
        documents: nextDocuments,
    };
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
    const [isRefreshingCases, setIsRefreshingCases] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isManualFastTrackOpen, setIsManualFastTrackOpen] = useState(false);
    const fetchInFlightRef = useRef(false);
    const queuedSilentRefreshRef = useRef(false);
    const manualModalWasOpenRef = useRef(false);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (fetchInFlightRef.current) {
            if (silent) {
                queuedSilentRefreshRef.current = true;
            }
            return;
        }

        fetchInFlightRef.current = true;
        setIsRefreshingCases(true);

        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const requestOptions = silent ? { suppressErrorToast: true } : {};
            const [casesResult, leadsResult, verificationResult] = await Promise.all([
                getFastTrackCases(requestOptions),
                getBrokerLeads(undefined, requestOptions),
                getPendingUserVerifications('manager', requestOptions),
            ]);
            const [
                applicationsResult,
                viewingsResult,
                contractsResult,
                saleProgressionsResult,
                paymentsResult,
                invoicesResult,
            ] = await Promise.all([
                getApplications(requestOptions),
                safeLoad(() => getViewings(requestOptions)),
                safeLoad(async () => {
                    const result = await getUserContracts(requestOptions);
                    if (result.error) {
                        throw new Error(result.error);
                    }

                    return result.data || [];
                }),
                getSaleProgressions(requestOptions),
                safeLoad(async () => {
                    const result = await getManagerPayments(requestOptions);
                    return Array.isArray(result?.data) ? result.data : [];
                }),
                safeLoad(async () => {
                    const result = await getManagerInvoices(requestOptions);
                    return Array.isArray(result?.data) ? result.data : [];
                }),
            ]);

            if (casesResult.error || leadsResult.error || verificationResult.error) {
                if (!silent) {
                    setError(casesResult.error || leadsResult.error || verificationResult.error || 'Failed to fetch cases');
                }
                return;
            }

            const leads = leadsResult.data || [];
            const verificationInfos = verificationResult.data || [];
            const applications = applicationsResult.data || [];
            const viewings = viewingsResult.data || [];
            const contracts = contractsResult.data || [];
            const saleProgressions = saleProgressionsResult.data || [];
            const payments = paymentsResult.data || [];
            const invoices = invoicesResult.data || [];
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
                const documents = buildCaseDocumentsFromVerification(
                    caseItem,
                    matchingLead?.documents_verified ? {
                        has_identity_doc: true,
                        has_address_doc: true,
                        documents_verified: true,
                    } : verificationInfo,
                    buildDocumentsFromVerification(null, caseItem.documents),
                );
                const documentsReady = Object.values(documents).every((status) => status === 'verified');
                const stageLead = documentsReady && matchingLead
                    ? { ...matchingLead, documents_verified: true }
                    : matchingLead;
                const linkedJourney = resolveFastTrackLinkedJourney(caseItem, {
                    applications: applications as Application[],
                    viewings: viewings as Viewing[],
                    contracts: contracts as Contract[],
                    saleProgressions: saleProgressions as SaleProgression[],
                    payments,
                    invoices,
                });
                const liveCurrentStep = deriveLiveFastTrackCurrentStep(
                    caseItem.currentStep,
                    [],
                    documents,
                    {
                        finalStatus: caseItem.finalStatus,
                        journeyType: caseItem.journeyType,
                        jurisdiction: caseItem.jurisdiction,
                        linkedJourney,
                        liveStage: caseItem.liveStage,
                    },
                );
                const documentPhase = deriveLiveFastTrackDocumentPhase([], documents, {
                    currentStep: liveCurrentStep,
                    backendPhase: caseItem.documentPhase,
                });
                const liveMeta = FAST_TRACK_STEP_META[liveCurrentStep];
                const preferredAction = caseItem.nextActions?.[0] || linkedJourney.nextActions?.[0] || null;
                const stageGuidance = resolveFastTrackStageGuidance({
                    currentStep: liveCurrentStep,
                    journeyType: caseItem.journeyType,
                    linkedJourney,
                    canScheduleViewing: caseItem.finalStatus === 'in_progress' && documentsReady && !linkedJourney.viewing,
                    hasPendingFinanceTasks: caseItem.journeyType !== 'buy' && hasPendingRentFinanceTasks(linkedJourney),
                });

                return {
                    ...caseItem,
                    currentStep: liveCurrentStep,
                    documents,
                    documentPhase,
                    matchingLead,
                    verificationInfo,
                    verificationSummary: buildVerificationSummary(verificationInfo, stageLead, documents),
                    leadStatusLabel: formatLeadStage(resolveLeadStage(stageLead)),
                    documentsReady,
                    nextAction: stageGuidance?.actionLabel || preferredAction?.label || linkedJourney.nextStep || caseItem.nextAction || liveMeta.label,
                    statusReason: stageGuidance?.description || caseItem.journeyStatusReason || linkedJourney.primarySummary || caseItem.statusReason || liveMeta.description,
                    linkedJourney,
                };
            });

            setCases(nextCases);
            setError(null);
        } finally {
            fetchInFlightRef.current = false;
            setIsRefreshingCases(false);

            if (!silent) {
                setLoading(false);
            }

            if (queuedSilentRefreshRef.current) {
                queuedSilentRefreshRef.current = false;
                void fetchCases(true);
            }
        }
    }, []);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.CASE_FILE,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
        ],
        refresh: () => fetchCases(true),
        enabled: !isManualFastTrackOpen,
    });

    useEffect(() => {
        if (isManualFastTrackOpen) {
            manualModalWasOpenRef.current = true;
            return;
        }

        if (manualModalWasOpenRef.current) {
            manualModalWasOpenRef.current = false;
            void fetchCases(true);
        }
    }, [fetchCases, isManualFastTrackOpen]);

    useEffect(() => {
        setSelectedCaseId((previous) => resolveManagerFastTrackSelection(
            cases,
            searchParams.get('case'),
            searchParams.get('lead'),
            previous,
        ));
    }, [cases, searchParams]);

    useEffect(() => {
        if (!selectedCaseId) {
            return;
        }

        const requestedCaseId = searchParams.get('case');
        const requestedLeadId = searchParams.get('lead');
        if (requestedCaseId === selectedCaseId && !requestedLeadId) {
            return;
        }

        setSearchParams((previous) => buildManagerFastTrackSearchParams(previous, selectedCaseId));
    }, [searchParams, selectedCaseId, setSearchParams]);

    useEffect(() => {
        const requestedCaseId = searchParams.get('case');
        if (loading || !requestedCaseId || selectedCaseId) {
            return;
        }

        if (cases.some((caseItem) => caseItem.caseId === requestedCaseId)) {
            return;
        }

        if (removedCaseNoticeRef.current !== requestedCaseId) {
            removedCaseNoticeRef.current = requestedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('case');
            return next;
        });
    }, [cases, loading, searchParams, selectedCaseId, setSearchParams, toast]);

    const selectedCase = useMemo(
        () => cases.find((caseItem) => caseItem.caseId === selectedCaseId) || null,
        [cases, selectedCaseId],
    );
    const selectedCaseVerificationDocuments = useMemo(
        () => filterDocumentsForLead(
            selectedVerificationDetails?.documents || [],
            selectedCase?.leadId || selectedCase?.matchingLead?.id,
        ),
        [selectedCase?.leadId, selectedCase?.matchingLead?.id, selectedVerificationDetails?.documents],
    );
    const selectedCaseDocuments = useMemo(
        () => selectedCase
            ? buildDocumentsFromDetails(
                selectedCaseVerificationDocuments,
                selectedCase.documents,
            )
            : null,
        [selectedCase, selectedCaseVerificationDocuments],
    );
    const selectedCaseDocumentItems = useMemo(
        () => buildFastTrackDocumentItems(
            selectedCaseVerificationDocuments,
            selectedCaseDocuments || {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        [selectedCaseDocuments, selectedCaseVerificationDocuments],
    );
    const selectedCaseVerificationContent = useMemo(
        () => buildFastTrackVerificationContent(selectedCaseDocumentItems),
        [selectedCaseDocumentItems],
    );
    const selectedCaseDetail = useMemo(() => {
        if (!selectedCase) {
            return null;
        }

        const documents = selectedCaseDocuments || selectedCase.documents;
        const documentsReady = Object.values(documents).every((status) => status === 'verified');
        const leadForStage = documentsReady && selectedCase.matchingLead
            ? { ...selectedCase.matchingLead, documents_verified: true }
            : selectedCase.matchingLead;
        const currentStep = deriveLiveFastTrackCurrentStep(
            selectedCase.currentStep,
            selectedCaseVerificationDocuments,
            documents,
            {
                finalStatus: selectedCase.finalStatus,
                journeyType: selectedCase.journeyType,
                jurisdiction: selectedCase.jurisdiction,
                linkedJourney: selectedCase.linkedJourney,
                liveStage: selectedCase.liveStage,
            },
        );
        const documentPhase = deriveLiveFastTrackDocumentPhase(
            selectedCaseVerificationDocuments,
            documents,
            {
                currentStep,
                backendPhase: selectedCase.documentPhase,
            },
        );
        const liveMeta = FAST_TRACK_STEP_META[currentStep];
        const preferredAction = selectedCase.nextActions?.[0] || selectedCase.linkedJourney.nextActions?.[0] || null;
        const stageGuidance = resolveFastTrackStageGuidance({
            currentStep,
            journeyType: selectedCase.journeyType,
            linkedJourney: selectedCase.linkedJourney,
            canScheduleViewing: selectedCase.finalStatus === 'in_progress' && documentsReady && !selectedCase.linkedJourney.viewing,
            hasPendingFinanceTasks: selectedCase.journeyType !== 'buy' && hasPendingRentFinanceTasks(selectedCase.linkedJourney),
        });
        let nextAction = preferredAction?.label || selectedCase.linkedJourney.nextStep || selectedCase.nextAction || liveMeta.label;
        let statusReason = selectedCase.journeyStatusReason || selectedCase.linkedJourney.primarySummary || selectedCase.statusReason || liveMeta.description;

        if (stageGuidance) {
            nextAction = stageGuidance.actionLabel || nextAction;
            statusReason = stageGuidance.description;
        } else if (currentStep === 'documents_requested') {
            if (documentPhase === 'uploaded_under_review') {
                nextAction = 'Review uploaded documents';
                statusReason = 'The user has uploaded the requested documents. Review the latest files and approve or request replacements.';
            } else if (documentPhase === 'replacement_required') {
                nextAction = 'Review replacement request';
                statusReason = 'At least one uploaded document needs a replacement before the case can be verified.';
            } else {
                nextAction = 'Waiting for user uploads';
                statusReason = 'Verification documents have been requested and the case is waiting for the user to upload them.';
            }
        } else if (currentStep === 'property_selected') {
            nextAction = canRequestLeadDocuments(selectedCase.matchingLead, selectedCaseVerificationDocuments)
                ? 'Request documents'
                : selectedCase.nextAction || 'Open the live workspace';
            statusReason = 'The property is selected and the 24-hour case is active, but verification documents have not been requested yet.';
        }

        return {
            ...selectedCase,
            currentStep,
            documents,
            documentPhase,
            documentsReady,
            verificationSummary: selectedVerificationDetails
                ? currentStep === 'property_selected'
                    ? 'Documents not requested yet'
                    : currentStep === 'documents_requested' && documentPhase === 'waiting_for_upload'
                        ? 'Documents requested. Waiting for user uploads.'
                        : selectedCaseVerificationContent.summary
                : buildVerificationSummary(selectedCase.verificationInfo, leadForStage, documents),
            leadStatusLabel: formatLeadStage(resolveLeadStage(leadForStage, selectedCaseVerificationDocuments)),
            nextAction,
            statusReason,
        };
    }, [
        selectedCase,
        selectedCaseDocuments,
        selectedCaseVerificationDocuments,
        selectedCaseVerificationContent.summary,
        selectedVerificationDetails,
    ]);

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

    const handleManualFastTrackCreated = useCallback(async (createdCase: FastTrackCase) => {
        publishWorkspaceSync({
            source: 'mutation',
            tags: [
                WORKSPACE_SYNC_TAGS.FAST_TRACK,
                WORKSPACE_SYNC_TAGS.LEADS,
                WORKSPACE_SYNC_TAGS.APPLICATIONS,
                WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            ],
            reason: 'Manager created fast-track case',
            ids: {
                caseId: createdCase.caseId,
                leadId: createdCase.leadId,
                propertyId: createdCase.propertyId,
            },
        });
        await fetchCases(true);
        handleSelectCase(createdCase.caseId);
    }, [fetchCases, handleSelectCase, publishWorkspaceSync]);

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
                    documentPhase: updatedCase.documentPhase,
                    documentPhaseReason: updatedCase.documentPhaseReason,
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

        publishWorkspaceSync({
            source: 'mutation',
            tags: [
                WORKSPACE_SYNC_TAGS.FAST_TRACK,
                WORKSPACE_SYNC_TAGS.CASE_FILE,
                WORKSPACE_SYNC_TAGS.APPLICATIONS,
                WORKSPACE_SYNC_TAGS.VIEWINGS,
                WORKSPACE_SYNC_TAGS.CONTRACTS,
                WORKSPACE_SYNC_TAGS.PAYMENTS,
                WORKSPACE_SYNC_TAGS.LEADS,
            ],
            reason: 'Manager updated fast-track case',
            ids: {
                caseId: updatedCase.caseId,
                leadId: updatedCase.leadId,
                propertyId: updatedCase.propertyId,
            },
        });
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
            reviewQueue: cases.filter((caseItem) => (
                caseItem.finalStatus === 'in_progress'
                && !caseItem.documentsReady
                && ['uploaded_under_review', 'replacement_required'].includes(caseItem.documentPhase || 'not_requested')
            )).length,
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
        if (!canRequestLeadDocuments(caseItem.matchingLead, selectedCaseVerificationDocuments)) {
            toast.error('This case has already moved beyond the live document-request stage.');
            return;
        }

        const requestMessage = `Hi ${caseItem.clientName}, please upload your verification documents so we can keep your 24-hour fast-track moving without delay.`;

        setRequestingLeadId(caseItem.matchingLead.id);
        try {
            const response = await respondToLead(caseItem.matchingLead.id, 'request_docs', requestMessage, undefined, {
                suppressErrorToast: true,
            });
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

            const { error: syncError } = await updateFastTrackCase(caseItem.id, {
                current_step: 'documents_requested',
                documents: {
                    identityProof: 'pending',
                    addressProof: 'pending',
                },
            });
            if (syncError) {
                toast.warning('Document request sent, but the fast-track stage could not refresh automatically.');
            }

            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.LEADS,
                    WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                    WORKSPACE_SYNC_TAGS.CASE_FILE,
                    WORKSPACE_SYNC_TAGS.MESSAGES,
                ],
                reason: 'Manager requested fast-track documents',
                ids: {
                    caseId: caseItem.caseId,
                    leadId: caseItem.matchingLead.id,
                    propertyId: caseItem.propertyId,
                },
            });
            toast.success('Document request sent and synced with the live case.');
            await fetchCases(true);
        } catch (error: any) {
            toast.error(error?.message || 'Unable to request documents for this case right now.');
        } finally {
            setRequestingLeadId(null);
        }
    }, [fetchCases, publishWorkspaceSync, selectedCaseVerificationDocuments, toast, user]);

    if (selectedCase && selectedCaseDetail) {
        return (
            <>
                <div className="h-[calc(100vh-100px)] min-h-0 overflow-hidden animate-in slide-in-from-right duration-300">
                    <FastTrackCaseDetail
                        caseData={selectedCaseDetail}
                        onClose={handleCloseSelectedCase}
                        onUpdate={handleUpdateCase}
                        verificationSummary={selectedCaseDetail.verificationSummary}
                        verificationReasonLines={selectedVerificationDetails ? selectedCaseVerificationContent.reasonLines : []}
                        leadStatusLabel={selectedCaseDetail.leadStatusLabel}
                        linkedJourney={selectedCaseDetail.linkedJourney}
                        workspaceSection={resolveWorkspaceSection(searchParams.get('section'), 'overview')}
                        onOpenVerificationReview={selectedCase.clientId ? () => setSelectedVerificationUserId(selectedCase.clientId) : undefined}
                        onRequestDocuments={selectedCase.matchingLead ? () => {
                            void handleRequestDocuments(selectedCase);
                        } : undefined}
                        onRefresh={() => fetchCases(true)}
                        canRequestDocuments={canRequestLeadDocuments(selectedCase.matchingLead, selectedCaseVerificationDocuments)}
                        isRequestingDocuments={requestingLeadId === selectedCase.matchingLead?.id}
                        isDocumentsVerifiedOverride={selectedVerificationDetails
                            ? selectedCaseDocumentItems.every((item) => item.status === 'verified')
                            : selectedCaseDetail.documentsReady}
                    />
                </div>
                {selectedVerificationUserId && (
                    <UserVerificationReviewModal
                        scope="manager"
                        userId={selectedVerificationUserId}
                        variant="fast_track"
                        onUpdated={async () => {
                            if (selectedCase.clientId) {
                                const { data } = await getUserVerificationDetails('manager', selectedCase.clientId);
                                setSelectedVerificationDetails(data);
                                if (data?.documents) {
                                    const scopedDocuments = filterDocumentsForLead(data.documents, selectedCase.leadId || selectedCase.matchingLead?.id);
                                    const { error: syncError } = await updateFastTrackCase(selectedCase.caseId, buildFastTrackCaseDocumentUpdate(selectedCase, scopedDocuments));
                                    if (syncError) {
                                        toast.warning('Verification was saved, but the fast-track stage could not refresh automatically.');
                                    }
                                    publishWorkspaceSync({
                                        source: 'mutation',
                                        tags: [
                                            WORKSPACE_SYNC_TAGS.FAST_TRACK,
                                            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
                                            WORKSPACE_SYNC_TAGS.CASE_FILE,
                                            WORKSPACE_SYNC_TAGS.LEADS,
                                        ],
                                        reason: 'Manager reviewed fast-track verification',
                                        ids: {
                                            caseId: selectedCase.caseId,
                                            leadId: selectedCase.leadId,
                                            propertyId: selectedCase.propertyId,
                                        },
                                    });
                                }
                            }
                            await fetchCases(true);
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

                        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                            <button
                                onClick={() => setIsManualFastTrackOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                <Plus size={16} />
                                Add 24h case
                            </button>

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
                            {!searchQuery && (
                                <button
                                    onClick={() => setIsManualFastTrackOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                                >
                                    <Plus size={16} />
                                    Add 24h case manually
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            <ManualFastTrackModal
                open={isManualFastTrackOpen}
                existingCases={cases}
                backgroundBusy={isRefreshingCases}
                onClose={() => setIsManualFastTrackOpen(false)}
                onCreated={handleManualFastTrackCreated}
            />
        </div>
    );
};

export default FastTrackDashboard;
