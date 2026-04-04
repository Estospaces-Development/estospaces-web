"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Home,
    Loader2,
    Shield,
    Upload,
} from 'lucide-react';
import { FastTrackCase, getFastTrackCases } from '@/services/fastTrackService';
import { BrokerRequestRecord, Lead, getUserBrokerRequests, getUserDocuments, getUserLeads, UserDocument } from '@/services/leadsService';
import { getApplications, type Application } from '@/services/applicationsService';
import { getViewings, type Viewing } from '@/services/bookingsService';
import { getUserContracts } from '@/services/contractsService';
import { getPayments, getInvoices, type Invoice, type Payment } from '@/services/paymentsService';
import { getSaleProgressions, type SaleProgression } from '@/services/salesService';
import FastTrackProgress from '@/components/manager/FastTrack/FastTrackProgress';
import {
    buildFastTrackVerificationContent,
    deriveLiveFastTrackDocumentPhase,
    deriveLiveFastTrackCurrentStep,
    filterDocumentsForLead,
    isEnglandJurisdiction,
    normalizeWorkspaceDocuments,
    type FastTrackDocumentItem,
} from '@/lib/fastTrackWorkflow';
import {
    buildUserFastTrackDocumentItems,
    getOutstandingDocumentNames,
    resolveUserFastTrackSelection,
} from '@/lib/userFastTrack';
import {
    selectPrimaryBrokerRequestBy,
} from '@/lib/brokerRequestSelection';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';
import { DELETED_FAST_TRACK_CASE_MESSAGE } from '@/lib/fastTrackCaseContext';
import {
    resolveFastTrackLinkedJourney,
    resolveFastTrackPrimaryLaneLabel,
    formatWorkflowStatusLabel,
} from '@/lib/fastTrackLinkedJourney';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import { resolveWorkspaceSection } from '@/lib/liveCaseWorkspace';
import type { Contract } from '@/types/booking';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { messagesService } from '@/services/messagesService';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import CaseFileWorkspace from '@/components/case-file/CaseFileWorkspace';

const statusMeta: Record<FastTrackCase['finalStatus'], { label: string; tone: string; note: string }> = {
    in_progress: {
        label: 'In progress',
        tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        note: 'Your case is still inside the live 24-hour fast-track window.',
    },
    completed: {
        label: 'Completed',
        tone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        note: 'The fast-track process is complete and ready for the next operational step.',
    },
    expired: {
        label: 'Expired',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'The 24-hour window has expired, so follow-up will continue manually.',
    },
    rejected: {
        label: 'Rejected',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'This fast-track case was rejected and will not auto-progress further.',
    },
};

const formatDeadlineLabel = (deadline?: string) => {
    if (!deadline) {
        return '10-minute broker response';
    }

    const remainingMs = new Date(deadline).getTime() - Date.now();
    if (!Number.isFinite(remainingMs)) {
        return '10-minute broker response';
    }

    const minutes = Math.max(Math.ceil(remainingMs / 60000), 0);
    if (minutes === 0) {
        return 'Response window ending now';
    }

    return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
};

const stepDescriptions: Record<FastTrackCase['currentStep'], string> = {
    property_selected: 'The property is now locked into this fast-track workspace and ready for document follow-up.',
    documents_requested: 'The matched broker or manager has requested the client verification documents for this property.',
    documents_verified: 'The verification documents are approved and the case is ready for viewing logistics.',
    viewing_scheduled: 'A real viewing is booked and tracked from the appointments workflow.',
    viewing_completed: 'The viewing is complete and the downstream review can continue.',
    application_in_review: 'The linked referencing, compliance, or offer journey is being reviewed now.',
    ready_for_contract: 'The workflow is ready for tenancy signatures, billing handoff, or legal completion.',
    completed: 'Everything required for this fast-track case is complete.',
};

const safeLoad = async <T,>(loader: () => Promise<T>) => {
    try {
        return { data: await loader(), error: null as string | null };
    } catch (error: any) {
        return { data: null as T | null, error: error?.message || 'Unable to load linked workflow records.' };
    }
};

export default function UserFastTrackPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [brokerRequests, setBrokerRequests] = useState<BrokerRequestRecord[]>([]);
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [viewings, setViewings] = useState<Viewing[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [saleProgressions, setSaleProgressions] = useState<SaleProgression[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(searchParams.get('case'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openingConversation, setOpeningConversation] = useState(false);
    const removedCaseNoticeRef = useRef<string | null>(null);
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const [casesResult, leadsResult, documentsResult, brokerRequestsResult] = await Promise.all([
            getFastTrackCases(),
            getUserLeads(),
            getUserDocuments(),
            getUserBrokerRequests({ suppressErrorToast: true }),
        ]);
        const [
            applicationsResult,
            viewingsResult,
            contractsResult,
            saleProgressionsResult,
            paymentsResult,
            invoicesResult,
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
            safeLoad(async () => {
                const result = await getPayments();
                return Array.isArray(result?.data) ? result.data : [];
            }),
            safeLoad(async () => {
                const result = await getInvoices();
                return Array.isArray(result?.data) ? result.data : [];
            }),
        ]);

        if (casesResult.data) {
            setCases(casesResult.data);
        }

        if (leadsResult.data) {
            setLeads(leadsResult.data);
        }

        setUserDocuments(normalizeWorkspaceDocuments(documentsResult.data, documentsResult.error));
        setBrokerRequests(brokerRequestsResult.data || []);
        setApplications(applicationsResult.data || []);
        setViewings(viewingsResult.data || []);
        setContracts(contractsResult.data || []);
        setSaleProgressions(saleProgressionsResult.data || []);
        setPayments(paymentsResult.data || []);
        setInvoices(invoicesResult.data || []);

        const requestError = casesResult.error || leadsResult.error || documentsResult.error || brokerRequestsResult.error;
        if (casesResult.data || leadsResult.data) {
            setError(null);
            setSelectedCaseId((previous) => resolveUserFastTrackSelection(
                casesResult.data || [],
                searchParams.get('case'),
                searchParams.get('lead'),
                previous,
            ));
        } else if (!silent) {
            setError(requestError || 'Unable to load your fast-track cases.');
        }

        if (!silent) {
            setLoading(false);
        }
    }, [searchParams]);

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
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.MESSAGES,
        ],
        refresh: () => fetchCases(true),
    });

    useEffect(() => {
        if (!selectedCaseId) {
            if (!searchParams.get('case')) {
                return;
            }
            const removedCaseId = searchParams.get('case');
            if (removedCaseId && removedCaseNoticeRef.current !== removedCaseId) {
                removedCaseNoticeRef.current = removedCaseId;
                toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
            }
            setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.delete('case');
                return next;
            });
            return;
        }

        if (searchParams.get('case') === selectedCaseId) {
            return;
        }

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('case', selectedCaseId);
            next.delete('lead');
            return next;
        });
    }, [searchParams, selectedCaseId, setSearchParams]);

    const selectedCase = useMemo(
        () => cases.find((item) => item.caseId === selectedCaseId) || cases[0] || null,
        [cases, selectedCaseId],
    );

    const selectedLead = useMemo(
        () => leads.find((item) => item.id === selectedCase?.leadId || item.property_id === selectedCase?.propertyId) || null,
        [leads, selectedCase?.leadId, selectedCase?.propertyId],
    );
    const selectedLinkedJourney = useMemo(
        () => selectedCase
            ? resolveFastTrackLinkedJourney(selectedCase, {
                applications,
                viewings,
                contracts,
                saleProgressions,
                payments,
                invoices,
            })
            : null,
        [applications, contracts, invoices, payments, saleProgressions, selectedCase, viewings],
    );

    const stats = useMemo(() => ({
        active: cases.filter((item) => item.finalStatus === 'in_progress').length,
        completed: cases.filter((item) => item.finalStatus === 'completed').length,
        attention: cases.filter((item) => item.finalStatus === 'expired' || item.finalStatus === 'rejected').length,
    }), [cases]);
    const selectedCaseBrokerRequest = useMemo(
        () => selectedCase?.brokerRequestId
            ? selectPrimaryBrokerRequestBy(
                brokerRequests,
                (item) => item.id === selectedCase.brokerRequestId,
                selectedCase.brokerRequestId,
            )
            : null,
        [brokerRequests, selectedCase?.brokerRequestId],
    );
    const matchedPriorityRequest = useMemo(
        () => selectPrimaryBrokerRequestBy(brokerRequests, (item) => (
            Boolean(item.fast_track_enabled)
            && (
                item.dispatch_status === 'broker_matched'
                || item.status === 'matched'
                || Boolean(item.matched_broker)
                || item.handoff_status === 'awaiting_portfolio'
                || item.handoff_status === 'portfolio_shared'
                || item.handoff_status === 'property_selected'
            )
        )),
        [brokerRequests],
    );
    const activePriorityRequest = useMemo(
        () => selectPrimaryBrokerRequestBy(brokerRequests, (item) => (
            Boolean(item.fast_track_enabled)
            && item.dispatch_status !== 'expired'
            && item.status !== 'expired'
            && item.status !== 'cancelled'
        )),
        [brokerRequests],
    );
    const portfolioSharedRequest = useMemo(
        () => selectPrimaryBrokerRequestBy(
            brokerRequests,
            (item) => Boolean(item.fast_track_enabled) && (item.handoff_status === 'portfolio_shared' || (item.property_shares?.length || 0) > 0),
        ),
        [brokerRequests],
    );
    const selectedPriorityRequest = useMemo(
        () => selectPrimaryBrokerRequestBy(
            brokerRequests,
            (item) => Boolean(item.fast_track_enabled) && (item.handoff_status === 'property_selected' || Boolean(item.selected_property_id) || Boolean(item.selected_fast_track_case_id)),
        ),
        [brokerRequests],
    );
    const selectedConversationRequest = selectedCaseBrokerRequest
        || selectedPriorityRequest
        || portfolioSharedRequest
        || matchedPriorityRequest
        || activePriorityRequest
        || null;
    const selectedConversationRecipientId = selectedCase?.managerId
        || selectedLead?.matched_broker_id
        || selectedConversationRequest?.matched_broker_id
        || null;
    const selectedConversationRecipient = selectedLead?.matched_broker
        || selectedConversationRequest?.matched_broker
        || null;
    const selectedConversationPropertyTitle = selectedCase?.propertyTitle
        || selectedLead?.property?.title
        || selectedConversationRequest?.selected_property?.title
        || 'Fast-track case';
    const selectedConversationPropertyAddress = [
        selectedLead?.property?.address_line_1 || selectedConversationRequest?.selected_property?.address_line_1 || selectedConversationRequest?.location,
        selectedLead?.property?.city || selectedConversationRequest?.selected_property?.city,
        selectedLead?.property?.postcode || selectedConversationRequest?.selected_property?.postcode || selectedConversationRequest?.location_postcode,
    ].filter(Boolean).join(', ') || undefined;
    const selectedConversationListingType = selectedCase?.listingType
        || selectedLead?.property?.listing_type
        || selectedConversationRequest?.selected_property?.listing_type
        || (selectedCase?.journeyType === 'buy' || selectedConversationRequest?.request_type === 'buy' ? 'sale' : 'rent');
    const selectedCaseLeadDocuments = useMemo(
        () => filterDocumentsForLead(
            userDocuments,
            selectedCase?.leadId || selectedLead?.id,
        ),
        [selectedCase?.leadId, selectedLead?.id, userDocuments],
    );

    const handleOpenMessages = useCallback(async () => {
        if (!selectedConversationRecipientId || !user) {
            toast.error('The live broker conversation is not ready yet.');
            return;
        }

        setOpeningConversation(true);
        try {
            const conversation = await messagesService.upsertDirectConversation(selectedConversationRecipientId, {
                propertyId: selectedCase?.propertyId || selectedLead?.property?.id || selectedConversationRequest?.selected_property?.id,
                propertyTitle: selectedConversationPropertyTitle,
                propertyAddress: selectedConversationPropertyAddress,
                listingType: selectedConversationListingType,
                propertyPrice: selectedLead?.property?.price || selectedConversationRequest?.selected_property?.price,
                senderName: user.user_metadata?.full_name || user.name || user.email,
                senderEmail: user.email,
                senderPhone: user.phone || user.user_metadata?.phone || '',
                recipientName: selectedConversationRecipient?.name || '',
                recipientEmail: selectedConversationRecipient?.email || '',
                recipientPhone: selectedConversationRecipient?.phone || '',
                recipientAgency: selectedConversationRecipient?.company_name || '',
            });

            navigate(`/user/dashboard/messages?conversation=${conversation.id}`);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to open the message thread right now.');
        } finally {
            setOpeningConversation(false);
        }
    }, [
        navigate,
        selectedCase?.propertyId,
        selectedConversationListingType,
        selectedConversationPropertyAddress,
        selectedConversationPropertyTitle,
        selectedConversationRecipient?.company_name,
        selectedConversationRecipient?.email,
        selectedConversationRecipient?.name,
        selectedConversationRecipient?.phone,
        selectedConversationRecipientId,
        selectedConversationRequest?.selected_property?.id,
        selectedConversationRequest?.selected_property?.price,
        selectedLead?.property?.id,
        selectedLead?.property?.price,
        toast,
        user,
    ]);

    const requestedDocumentItems = useMemo(
        () => buildUserFastTrackDocumentItems(selectedCase?.documents || {
            identityProof: 'pending',
            addressProof: 'pending',
        }, selectedCaseLeadDocuments, {
            requestActive: Boolean(
                (selectedCase?.documentPhase && selectedCase.documentPhase !== 'not_requested')
                || selectedCase?.currentStep === 'documents_requested'
                || selectedCase?.currentStep === 'documents_verified'
                || selectedLead?.documents_requested
                || selectedLead?.documents_uploaded
                || selectedLead?.documents_verified
            ),
        }),
        [
            selectedCase?.currentStep,
            selectedCase?.documentPhase,
            selectedCase?.documents,
            selectedCaseLeadDocuments,
            selectedLead?.documents_requested,
            selectedLead?.documents_uploaded,
            selectedLead?.documents_verified,
        ],
    );
    const liveDocumentsRequirementLabel = 'Identity and legal compliance cleared';
    const liveDocumentsRequirementComplete = useMemo(
        () => requestedDocumentItems.length > 0 && requestedDocumentItems.every((item) => item.status === 'verified'),
        [requestedDocumentItems],
    );
    const selectedCasePendingRequirements = useMemo(() => {
        const baseRequirements = (selectedCase?.pendingRequirements || [])
            .filter((requirement) => requirement !== liveDocumentsRequirementLabel);

        if (!selectedCase || requestedDocumentItems.length === 0 || liveDocumentsRequirementComplete) {
            return baseRequirements;
        }

        return [...baseRequirements, liveDocumentsRequirementLabel];
    }, [liveDocumentsRequirementComplete, requestedDocumentItems.length, selectedCase]);
    const selectedCaseCompletedRequirements = useMemo(() => {
        const baseRequirements = (selectedCase?.completedRequirements || [])
            .filter((requirement) => requirement !== liveDocumentsRequirementLabel);

        if (!selectedCase || requestedDocumentItems.length === 0 || !liveDocumentsRequirementComplete) {
            return baseRequirements;
        }

        return [...baseRequirements, liveDocumentsRequirementLabel];
    }, [liveDocumentsRequirementComplete, requestedDocumentItems.length, selectedCase]);
    const verifiedDocumentCount = useMemo(
        () => requestedDocumentItems.filter((item) => item.status === 'verified').length,
        [requestedDocumentItems],
    );
    const verificationItems = useMemo<FastTrackDocumentItem[]>(
        () => requestedDocumentItems.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status === 'requested' || item.status === 'not_requested'
                ? 'missing'
                : item.status,
            statusLabel: item.statusLabel,
            fileName: item.fileName,
            reason: item.reason,
            reviewedAt: item.reviewedAt,
        })),
        [requestedDocumentItems],
    );
    const verificationContent = useMemo(
        () => buildFastTrackVerificationContent(verificationItems),
        [verificationItems],
    );
    const selectedLeadDeadline = formatDeadlineLabel(selectedLead?.response_deadline_at || selectedLead?.sla_deadline);
    const selectedLeadBroker = selectedLead?.matched_broker?.name || selectedLead?.matched_broker?.company_name || selectedLead?.matched_broker_id || 'No broker matched yet';
    const uploadActionItems = useMemo(
        () => requestedDocumentItems.filter((item) => item.status === 'requested' || item.status === 'reupload_required'),
        [requestedDocumentItems],
    );
    const allRequestedDocumentsVerified = useMemo(
        () => requestedDocumentItems.length > 0 && requestedDocumentItems.every((item) => item.status === 'verified'),
        [requestedDocumentItems],
    );
    const englandRentJourney = selectedCase?.journeyType !== 'buy' && isEnglandJurisdiction(selectedCase?.jurisdiction || selectedCase?.propertyCountry);
    const selectedCaseCurrentStep = useMemo(
        () => selectedCase
            ? deriveLiveFastTrackCurrentStep(
                selectedCase.currentStep,
                selectedCaseLeadDocuments,
                selectedCase.documents || {
                    identityProof: 'pending',
                    addressProof: 'pending',
                },
                {
                    finalStatus: selectedCase.finalStatus,
                    journeyType: selectedCase.journeyType,
                    jurisdiction: selectedCase.jurisdiction || selectedCase.propertyCountry,
                    linkedJourney: selectedLinkedJourney,
                    liveStage: selectedCase.liveStage,
                },
            )
            : null,
        [selectedCase, selectedCaseLeadDocuments, selectedLinkedJourney],
    );
    const selectedCaseDocumentPhase = useMemo(
        () => selectedCase
            ? deriveLiveFastTrackDocumentPhase(
                selectedCaseLeadDocuments,
                selectedCase.documents || {
                    identityProof: 'pending',
                    addressProof: 'pending',
                },
                {
                    currentStep: selectedCaseCurrentStep || selectedCase.currentStep,
                    backendPhase: selectedCase.documentPhase,
                },
            )
            : 'not_requested',
        [selectedCase, selectedCaseCurrentStep, selectedCaseLeadDocuments],
    );
    const waitingForDocumentReview = useMemo(
        () => !allRequestedDocumentsVerified
            && uploadActionItems.length === 0
            && requestedDocumentItems.some((item) => item.status === 'uploaded'),
        [allRequestedDocumentsVerified, requestedDocumentItems, uploadActionItems.length],
    );
    const outstandingDocumentNames = useMemo(
        () => getOutstandingDocumentNames(requestedDocumentItems),
        [requestedDocumentItems],
    );
    const selectedLeadDocuments = allRequestedDocumentsVerified
        ? 'All required documents approved'
        : selectedCaseDocumentPhase === 'uploaded_under_review'
            ? 'Uploaded and awaiting review'
            : selectedCaseDocumentPhase === 'replacement_required'
                ? 'Replacement requested'
                : selectedCaseDocumentPhase === 'waiting_for_upload'
                    ? 'Waiting for uploads'
                    : selectedLead?.documents_requested || selectedLead?.documents_uploaded || selectedLead?.documents_verified
            ? verificationContent.documentsLabel
            : 'No pending document request';
    const documentRequestLabel = outstandingDocumentNames.length > 0
        ? outstandingDocumentNames.join(', ')
        : 'Identity proof and address proof';
    const showActiveDocumentRequest = Boolean(
        selectedCaseDocumentPhase !== 'not_requested'
        && selectedCaseDocumentPhase !== 'verified'
        && !allRequestedDocumentsVerified,
    );
    const showRequestedDocumentsPanel = Boolean(
        selectedCase && (
            selectedCaseDocumentPhase !== 'not_requested'
            || selectedLead?.documents_requested
            || selectedLead?.documents_uploaded
            || selectedLead?.documents_verified
        ),
    );
    const selectedCaseStatusReason = useMemo(() => {
        if (!selectedCase) {
            return null;
        }

        if (
            selectedCaseCurrentStep === 'documents_verified'
            && selectedCase.currentStep !== selectedCaseCurrentStep
        ) {
            return selectedCase.journeyType === 'buy'
                ? 'Identity and address checks are complete. The next live step is the viewing appointment, then proof of funds and the live offer journey.'
                : englandRentJourney
                    ? 'Identity and address checks are complete. The next live step is the viewing appointment, then referencing and the England Right to Rent check.'
                    : 'Identity and address checks are complete. The next live step is the viewing appointment, then referencing and compliance review.';
        }

        if (selectedCaseCurrentStep === 'property_selected') {
            return 'The property is selected and the 24-hour case is active. The manager needs to request your verification documents before the review stage begins.';
        }

        if (selectedCaseCurrentStep === 'documents_requested') {
            if (selectedCaseDocumentPhase === 'uploaded_under_review') {
                return 'Your uploaded documents are waiting for review.';
            }
            if (selectedCaseDocumentPhase === 'replacement_required') {
                return 'One of your uploaded documents needs to be replaced before the case can be verified.';
            }
            return 'The manager has requested your verification documents. Upload them here to keep the case moving.';
        }

        return selectedCase.journeyStatusReason || selectedLinkedJourney?.primarySummary || selectedCase.statusReason || statusMeta[selectedCase.finalStatus].note;
    }, [englandRentJourney, selectedCase, selectedCaseCurrentStep, selectedCaseDocumentPhase, selectedLinkedJourney?.primarySummary]);
    const selectedCaseNextAction = useMemo(() => {
        if (!selectedCase) {
            return null;
        }

        if (
            selectedCaseCurrentStep === 'documents_verified'
            && selectedCase.currentStep !== selectedCaseCurrentStep
        ) {
            return selectedCase.journeyType === 'buy'
                ? 'Watch for the viewing schedule, then complete proof of funds or MIP before the live offer stage.'
                : englandRentJourney
                    ? 'Watch for the viewing schedule, then complete referencing and the England Right to Rent check.'
                    : 'Watch for the viewing schedule, then complete referencing and compliance review.';
        }

        if (selectedCaseCurrentStep === 'property_selected') {
            return 'Wait for the manager to request documents';
        }

        if (selectedCaseCurrentStep === 'documents_requested') {
            if (selectedCaseDocumentPhase === 'uploaded_under_review') {
                return 'Wait for document review';
            }
            if (selectedCaseDocumentPhase === 'replacement_required') {
                return 'Upload the requested replacement';
            }
            return 'Upload the requested documents';
        }

        return selectedCase.nextActions?.[0]?.description
            || selectedCase.nextActions?.[0]?.label
            || selectedLinkedJourney?.nextStep
            || selectedCase.nextAction
            || 'Open the live workspace';
    }, [englandRentJourney, selectedCase, selectedCaseCurrentStep, selectedCaseDocumentPhase, selectedLinkedJourney?.nextStep]);
    const linkedApplicationLabel = selectedCase && selectedLinkedJourney
        ? resolveFastTrackPrimaryLaneLabel(selectedCase.journeyType, selectedLinkedJourney)
        : 'Not created yet';
    const linkedViewingLabel = selectedLinkedJourney?.viewing
        ? formatWorkflowStatusLabel(selectedLinkedJourney.viewing.status)
        : 'Not scheduled yet';
    const linkedViewingDetail = selectedLinkedJourney?.viewing?.scheduled_at
        ? new Date(selectedLinkedJourney.viewing.scheduled_at).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : 'A confirmed viewing will appear here once the appointment is booked.';
    const linkedCompletionLabel = selectedCase?.journeyType === 'buy'
        ? (
            selectedLinkedJourney?.saleProgression
                ? formatWorkflowStatusLabel(selectedLinkedJourney.saleProgression.current_stage)
                : 'Offer journey not started'
        )
        : (
            selectedLinkedJourney?.contract
                ? formatWorkflowStatusLabel(selectedLinkedJourney.contract.status)
                : 'No contract drafted yet'
        );
    const linkedPaymentsLabel = selectedLinkedJourney
        ? `${selectedLinkedJourney.payments.length} payment${selectedLinkedJourney.payments.length === 1 ? '' : 's'} · ${selectedLinkedJourney.invoices.length} invoice${selectedLinkedJourney.invoices.length === 1 ? '' : 's'}`
        : 'No linked payments yet';
    const linkedPaymentsDetail = selectedLinkedJourney?.payments[0]
        ? `Latest payment is ${formatWorkflowStatusLabel(selectedLinkedJourney.payments[0].status)}.`
        : selectedLinkedJourney?.invoices[0]
            ? `Latest invoice is ${formatWorkflowStatusLabel(selectedLinkedJourney.invoices[0].status)}.`
            : selectedCase?.journeyType === 'buy'
                ? 'Purchase payments only appear once the sale progression reaches the relevant legal or completion stage.'
                : 'Deposit protection and first-rent records will appear here once the tenancy agreement reaches billing handoff.';
    const selectedJourneyBlockers = selectedLinkedJourney?.blockers?.length
        ? selectedLinkedJourney.blockers
        : (selectedCase?.blockers || []);
    const selectedJourneyDeadlines = selectedLinkedJourney?.deadlines?.length
        ? selectedLinkedJourney.deadlines
        : (selectedCase?.deadlines || []);
    const linkedApplicationsPath = useMemo(
        () => buildWorkspacePath('/user/applications', {
            applicationId: selectedLinkedJourney?.application?.id,
            caseId: selectedCase?.caseId,
            leadId: selectedCase?.leadId,
            propertyId: selectedCase?.propertyId,
        }),
        [selectedCase?.caseId, selectedCase?.leadId, selectedCase?.propertyId, selectedLinkedJourney?.application?.id],
    );
    const linkedViewingsPath = useMemo(
        () => buildWorkspacePath('/user/dashboard/viewings', {
            applicationId: selectedLinkedJourney?.application?.id,
            viewingId: selectedLinkedJourney?.viewing?.id,
            caseId: selectedCase?.caseId,
            leadId: selectedCase?.leadId,
            propertyId: selectedCase?.propertyId,
        }),
        [
            selectedCase?.caseId,
            selectedCase?.leadId,
            selectedCase?.propertyId,
            selectedLinkedJourney?.application?.id,
            selectedLinkedJourney?.viewing?.id,
        ],
    );
    const linkedContractsPath = useMemo(
        () => buildWorkspacePath('/user/dashboard/contracts', {
            applicationId: selectedLinkedJourney?.application?.id,
            contractId: selectedLinkedJourney?.contract?.id,
            caseId: selectedCase?.caseId,
            leadId: selectedCase?.leadId,
            propertyId: selectedCase?.propertyId,
        }),
        [
            selectedCase?.caseId,
            selectedCase?.leadId,
            selectedCase?.propertyId,
            selectedLinkedJourney?.application?.id,
            selectedLinkedJourney?.contract?.id,
        ],
    );
    const linkedPaymentsPath = useMemo(
        () => buildWorkspacePath('/user/dashboard/payments', {
            applicationId: selectedLinkedJourney?.application?.id,
            contractId: selectedLinkedJourney?.contract?.id,
            paymentId: selectedLinkedJourney?.payments[0]?.id,
            invoiceId: selectedLinkedJourney?.invoices[0]?.id,
            caseId: selectedCase?.caseId,
            leadId: selectedCase?.leadId,
            propertyId: selectedCase?.propertyId,
        }),
        [
            selectedCase?.caseId,
            selectedCase?.leadId,
            selectedCase?.propertyId,
            selectedLinkedJourney?.application?.id,
            selectedLinkedJourney?.contract?.id,
            selectedLinkedJourney?.invoices,
            selectedLinkedJourney?.payments,
        ],
    );
    const fastTrackDocumentsPath = useMemo(
        () => buildWorkspacePath('/user/dashboard/fast-track', {
            applicationId: selectedLinkedJourney?.application?.id,
            contractId: selectedLinkedJourney?.contract?.id,
            caseId: selectedCase?.caseId,
            leadId: selectedCase?.leadId,
            propertyId: selectedCase?.propertyId,
            section: 'documents',
        }),
        [
            selectedCase?.caseId,
            selectedCase?.leadId,
            selectedCase?.propertyId,
            selectedLinkedJourney?.application?.id,
            selectedLinkedJourney?.contract?.id,
        ],
    );

    return (
        <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-orange-50/70 via-white to-gray-50 pb-16 dark:bg-gray-900">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_28%)] opacity-90 dark:hidden" />
            <div className="relative mx-auto max-w-[94rem] px-4 py-8 lg:px-8">
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                <section className="relative overflow-hidden rounded-[32px] border border-orange-100/80 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/70 p-6 shadow-[0_30px_90px_-55px_rgba(249,115,22,0.55)] dark:border-gray-800 dark:bg-gray-900/90 lg:p-7">
                    <div className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-orange-200/40 blur-3xl dark:hidden" />
                    <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-blue-100/50 blur-3xl dark:hidden" />

                    <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)] xl:items-start">
                        <div>
                            <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-600 shadow-sm backdrop-blur dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                                Shared live workspace
                            </span>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">
                                24-Hour Fast Track
                            </h1>
                            <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300">
                                Keep every live case, requested document, broker update, viewing, and downstream milestone in one clearer workspace so you can move faster with less friction.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200">
                                    One place for documents, viewings, messages, and contracts
                                </div>
                                <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200">
                                    Faster decisions with less switching between pages
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Shield size={16} className="text-orange-500" />
                                <p className="text-sm font-medium">Live focus</p>
                            </div>
                            {selectedCase ? (
                                <>
                                    <p className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                                        {selectedCase.propertyTitle}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                        {selectedCaseNextAction || 'Stay in this workspace to keep the live case moving without extra handoffs.'}
                                    </p>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4 dark:border-orange-900/30 dark:bg-orange-950/20">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Current stage</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatWorkflowStatusLabel(selectedCaseCurrentStep || selectedCase.currentStep)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-500">Live window</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {selectedLeadDeadline}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    This workspace pulls live documents, tasks, messages, viewings, and contracts into one calmer dashboard so the next step is always clear.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="relative mt-6 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Clock size={16} className="text-orange-500" />
                                <p className="text-sm font-medium">Active cases</p>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <CheckCircle2 size={16} className="text-emerald-500" />
                                <p className="text-sm font-medium">Completed</p>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <AlertTriangle size={16} className="text-rose-500" />
                                <p className="text-sm font-medium">Needs attention</p>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{stats.attention}</p>
                        </div>
                    </div>
                </section>

                {loading && cases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-orange-500">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your fast-track cases...</p>
                    </div>
                ) : error ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 p-10 text-center">
                        <AlertTriangle className="mx-auto text-red-500 mb-4" size={36} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Unable to load fast-track cases</h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        <button
                            onClick={() => void fetchCases()}
                            className="mt-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
                        <Clock className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {(selectedCaseBrokerRequest?.selected_fast_track_case_id ? selectedCaseBrokerRequest : selectedPriorityRequest)
                                ? 'Selected property is ready to continue'
                                : matchedPriorityRequest
                                    ? 'Property handoff is still pending'
                                    : 'No fast-track cases yet'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {(selectedCaseBrokerRequest?.selected_fast_track_case_id ? selectedCaseBrokerRequest : selectedPriorityRequest)?.selected_fast_track_case_id
                                ? 'A property has already been selected from the broker workspace. Open the live fast-track case to continue.'
                                : portfolioSharedRequest
                                    ? 'Your broker has already shared property options. Choose one from the broker workspace to launch the 24-hour fast-track.'
                                    : matchedPriorityRequest
                                        ? 'Your broker is matched, but the 24-hour property fast-track has not started yet. It begins only after property options are shared and you choose one.'
                                        : activePriorityRequest
                                            ? 'Your live broker request is active. A 24-hour fast-track case will appear here only after a specific property is shared and selected.'
                                            : 'Start a 24-hour fast-track case from a selected property and it will appear here automatically.'}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            {(selectedCaseBrokerRequest || selectedPriorityRequest || matchedPriorityRequest || activePriorityRequest) ? (
                                <button
                                    onClick={() => navigate(
                                        (selectedCaseBrokerRequest?.selected_fast_track_case_id || selectedPriorityRequest?.selected_fast_track_case_id)
                                            ? `/user/dashboard/fast-track?case=${selectedCaseBrokerRequest?.selected_fast_track_case_id || selectedPriorityRequest?.selected_fast_track_case_id}`
                                            : buildBrokerRequestWorkspacePath((selectedCaseBrokerRequest || selectedPriorityRequest || matchedPriorityRequest || activePriorityRequest)?.id),
                                    )}
                                    className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-3 transition-colors"
                                >
                                    {(selectedCaseBrokerRequest?.selected_fast_track_case_id || selectedPriorityRequest?.selected_fast_track_case_id) ? 'Open live fast-track' : 'Open broker workspace'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/user/search')}
                                    className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold px-5 py-3 transition-colors"
                                >
                                    Explore properties
                                </button>
                            )}
                            <button
                                onClick={() => void handleOpenMessages()}
                                disabled={openingConversation}
                                className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                {openingConversation ? 'Opening thread...' : 'Open messages'}
                            </button>
                        </div>
                    </div>
                ) : selectedCase ? (
                    <div className="mt-8 space-y-6">
                        {cases.length > 1 ? (
                            <section className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
                                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Live cases</p>
                                        <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Switch between active workspaces without leaving the dashboard</h2>
                                    </div>
                                    <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300">
                                        {cases.length} live workspace{cases.length === 1 ? '' : 's'}
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {cases.map((item) => {
                                        const meta = statusMeta[item.finalStatus];
                                        const isSelected = item.caseId === selectedCase.caseId;
                                        return (
                                            <button
                                                key={item.caseId}
                                                type="button"
                                                onClick={() => setSelectedCaseId(item.caseId)}
                                                className={`w-full rounded-[26px] border p-5 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-white shadow-[0_18px_45px_-32px_rgba(249,115,22,0.75)] dark:border-orange-800 dark:bg-orange-950/20'
                                                        : 'border-gray-100 bg-gray-50/80 hover:border-orange-200 hover:bg-white dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-orange-900/60'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">{item.propertyTitle}</p>
                                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Case {item.caseId}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}>
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {item.finalStatus === 'in_progress' ? `${item.hoursRemaining}h remaining in the live window` : meta.note}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : (
                            <section className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Live case</p>
                                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Your shared workspace is open and ready for the next step.
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${statusMeta[selectedCase.finalStatus].tone}`}>
                                        {selectedCase.finalStatus === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                        <span>
                                            {selectedCase.finalStatus === 'in_progress'
                                                ? `${selectedCase.hoursRemaining}h remaining`
                                                : statusMeta[selectedCase.finalStatus].label}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_340px]">
                            <section className="space-y-6">
                                <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.22)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:p-7">
                                    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-orange-100/60 via-orange-50/20 to-blue-50/40 dark:hidden" />
                                    <div className="relative">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</h2>
                                            <span className="px-2.5 py-0.5 text-xs rounded-full font-medium border bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-200">
                                                {selectedCase.propertyType.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Submitted {new Date(selectedCase.submittedAt).toLocaleString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${statusMeta[selectedCase.finalStatus].tone}`}>
                                        {selectedCase.finalStatus === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                        <span>
                                            {selectedCase.finalStatus === 'in_progress'
                                                ? `${selectedCase.hoursRemaining}h remaining`
                                                : statusMeta[selectedCase.finalStatus].label}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-gray-700 dark:border-orange-900/30 dark:bg-orange-950/10 dark:text-gray-300">
                                    {selectedCaseStatusReason}
                                </div>

                                {(selectedCaseNextAction || selectedCasePendingRequirements.length || selectedCaseCompletedRequirements.length || selectedCase.overrideReason) && (
                                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Next action</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {selectedCaseNextAction}
                                            </p>
                                            {selectedCase.overrideReason ? (
                                                <p className="mt-2 text-xs text-orange-600 dark:text-orange-300">
                                                    Manager override: {selectedCase.overrideReason}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Case checklist</p>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                {selectedCasePendingRequirements.length > 0
                                                    ? `Still pending: ${selectedCasePendingRequirements.join(', ')}`
                                                    : 'No pending blockers are left on this case.'}
                                            </p>
                                            {selectedCaseCompletedRequirements.length > 0 ? (
                                                <p className="mt-2 text-xs text-green-600 dark:text-green-300">
                                                    Completed: {selectedCaseCompletedRequirements.join(', ')}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {selectedLead && (
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/20 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Live window</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadDeadline}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Fast-track stage</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{formatWorkflowStatusLabel(selectedCaseCurrentStep || selectedCase.currentStep)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Matched broker</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadBroker}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Documents</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedLeadDocuments}</p>
                                        </div>
                                    </div>
                                )}

                                {showActiveDocumentRequest && (
                                    <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/80 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Document request</p>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                            {selectedLeadBroker} asked for {documentRequestLabel}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            Upload the requested files from this case below. The live stage updates here as soon as the documents are submitted.
                                        </p>
                                        <div className="mt-3 rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-orange-900/30 dark:bg-black/20 dark:text-gray-200">
                                            {verificationContent.summary}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {uploadActionItems.length > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(fastTrackDocumentsPath)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                                >
                                                    <Upload size={15} />
                                                    <span>Open document workspace</span>
                                                </button>
                                            ) : (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                                                    {waitingForDocumentReview
                                                        ? 'All requested documents are uploaded. The case is now waiting for manager review.'
                                                        : 'All requested documents are approved. The journey can continue to the next live step.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {showActiveDocumentRequest && selectedCase.propertyId && (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            onClick={() => navigate(buildWorkspacePath(`/user/properties/${selectedCase.propertyId}`, {
                                                caseId: selectedCase.caseId,
                                                leadId: selectedCase.leadId,
                                                propertyId: selectedCase.propertyId,
                                                section: 'documents',
                                            }))}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                        >
                                            Open property workspace
                                        </button>
                                        <button
                                            onClick={() => navigate(buildWorkspacePath('/user/dashboard/fast-track', {
                                                caseId: selectedCase.caseId,
                                                leadId: selectedCase.leadId,
                                                propertyId: selectedCase.propertyId,
                                                section: 'overview',
                                            }))}
                                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            Refresh live status
                                        </button>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <FastTrackProgress currentStep={selectedCaseCurrentStep || selectedCase.currentStep} journeyType={selectedCase.journeyType} />
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Clock size={16} className="text-orange-500" />
                                            <p className="font-semibold">Current stage</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{stepDescriptions[selectedCaseCurrentStep || selectedCase.currentStep]}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Shield size={16} className="text-blue-500" />
                                            <p className="font-semibold">Document progress</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {verifiedDocumentCount} of {requestedDocumentItems.length} required items are verified.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <FileText size={16} className="text-indigo-500" />
                                            <p className="font-semibold">Next action</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {uploadActionItems.length > 0
                                                ? `Upload ${documentRequestLabel} from this case so ${selectedLeadBroker} can continue the live review.`
                                                : waitingForDocumentReview
                                                    ? `${selectedLeadBroker} is reviewing the files you already uploaded. The next live update will appear here as soon as review is complete.`
                                                    : allRequestedDocumentsVerified
                                                        ? selectedCase.journeyType === 'buy'
                                                            ? 'Documents are approved. The next live step is viewing logistics or the offer journey.'
                                                            : 'Documents are approved. The next live step is viewing logistics or tenancy review.'
                                                        : 'If documents are requested or re-uploads are needed, upload them from this case instead of using profile settings.'}
                                        </p>
                                    </div>
                                </div>

                                {selectedLinkedJourney && (
                                    <div className="mt-6 rounded-[28px] border border-gray-100 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/40">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Linked journey</p>
                                                <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                                                    {selectedLinkedJourney.primaryHeadline}
                                                </h3>
                                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {selectedLinkedJourney.primarySummary}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300">
                                                {selectedLinkedJourney.nextStep}
                                            </div>
                                        </div>

                                        {(selectedJourneyBlockers.length > 0 || selectedJourneyDeadlines.length > 0) ? (
                                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                                {selectedJourneyBlockers.length > 0 ? (
                                                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-950/20">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-300">Current blockers</p>
                                                        <div className="mt-3 space-y-2">
                                                            {selectedJourneyBlockers.slice(0, 3).map((item) => (
                                                                <div key={item.code} className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-orange-700 dark:border-orange-900/30 dark:bg-gray-900 dark:text-orange-200">
                                                                    <p className="font-semibold">{item.title}</p>
                                                                    {item.description ? (
                                                                        <p className="mt-1 text-xs text-orange-600 dark:text-orange-300">{item.description}</p>
                                                                    ) : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {selectedJourneyDeadlines.length > 0 ? (
                                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Deadlines</p>
                                                        <div className="mt-3 space-y-2">
                                                            {selectedJourneyDeadlines.slice(0, 3).map((item) => (
                                                                <div key={item.code} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-gray-900 dark:text-blue-200">
                                                                    <p className="font-semibold">{item.label}</p>
                                                                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                                                                        {item.due_at ? new Date(item.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date pending'}
                                                                        {item.status ? ` · ${item.status.replace(/_/g, ' ')}` : ''}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                                                    {selectedCase.journeyType === 'buy' ? 'Offer lane' : 'Application lane'}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{linkedApplicationLabel}</p>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {selectedCase.journeyType === 'buy'
                                                        ? 'Your purchase offer and sale progression stay linked to this fast-track case.'
                                                        : 'Your rental review and approval now continue through the linked application.'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Viewing</p>
                                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{linkedViewingLabel}</p>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{linkedViewingDetail}</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                                                    {selectedCase.journeyType === 'buy' ? 'Completion lane' : 'Contract lane'}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{linkedCompletionLabel}</p>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {selectedCase.journeyType === 'buy'
                                                        ? 'Purchase journeys continue through memorandum, conveyancing, exchange, and completion.'
                                                        : 'Tenancy contracts and signatures appear here once the application is approved.'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Payments</p>
                                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{linkedPaymentsLabel}</p>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{linkedPaymentsDetail}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                    </div>
                                </div>
                            </section>

                            <aside className="space-y-4 self-start 2xl:sticky 2xl:top-6">
                                <div className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Home className="text-blue-500" size={20} />
                                        <div>
                                            <h3 className="text-lg font-semibold">Quick actions</h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Jump straight into the exact live step you need.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                                        <button
                                            onClick={() => navigate(buildWorkspacePath('/user/dashboard/fast-track', {
                                                caseId: selectedCase.caseId,
                                                leadId: selectedCase.leadId,
                                                propertyId: selectedCase.propertyId,
                                                section: 'overview',
                                            }))}
                                            className="w-full rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700"
                                        >
                                            Open live workspace
                                        </button>
                                        <button
                                            onClick={() => navigate(fastTrackDocumentsPath)}
                                            className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300 dark:hover:bg-orange-950/30"
                                        >
                                            Open document section
                                        </button>
                                        <button
                                            onClick={() => void handleOpenMessages()}
                                            disabled={openingConversation}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            {openingConversation ? 'Opening thread...' : 'Open messages'}
                                        </button>
                                        <button
                                            onClick={() => navigate(linkedApplicationsPath)}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            {selectedCase.journeyType === 'buy' ? 'Open offer journey' : 'Open applications'}
                                        </button>
                                        <button
                                            onClick={() => navigate(linkedViewingsPath)}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            Open viewings
                                        </button>
                                        {selectedCase.journeyType !== 'buy' && (
                                            <button
                                                onClick={() => navigate(linkedContractsPath)}
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                            >
                                                Open contracts
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate(linkedPaymentsPath)}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                        >
                                            {selectedCase.journeyType === 'buy' ? 'Open payments' : 'Open billing tasks'}
                                        </button>
                                        {selectedCase.propertyId && (
                                            <button
                                                onClick={() => navigate(buildWorkspacePath(`/user/properties/${selectedCase.propertyId}`, {
                                                    caseId: selectedCase.caseId,
                                                    leadId: selectedCase.leadId,
                                                    propertyId: selectedCase.propertyId,
                                                    section: 'documents',
                                                }))}
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                            >
                                                Open property workspace
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[30px] border border-orange-200 bg-orange-50/80 p-5 shadow-sm dark:border-orange-900/30 dark:bg-orange-950/20">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-300">Live focus</p>
                                    <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                                        {selectedCaseNextAction || 'Keep the shared workspace updated so the case can move forward without extra follow-ups.'}
                                    </p>
                                    <p className="mt-3 text-sm leading-6 text-orange-700 dark:text-orange-200">
                                        {selectedCasePendingRequirements.length > 0
                                            ? `Pending now: ${selectedCasePendingRequirements.join(', ')}`
                                            : 'The case is clear on blockers right now. Use the shared workspace below for documents, tasks, and activity.'}
                                    </p>
                                </div>
                            </aside>
                        </div>

                        <CaseFileWorkspace
                            role="user"
                            caseId={selectedCase.caseId}
                            embedded
                            layout="stacked"
                            initialTab="documents"
                            requestedSection={resolveWorkspaceSection(searchParams.get('section'), 'documents')}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
