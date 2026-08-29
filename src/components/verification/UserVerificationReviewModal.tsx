"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    Check,
    CheckCircle,
    Clock,
    FileText,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    RefreshCw,
    X,
    XCircle,
} from 'lucide-react';
import {
    VerificationScope,
    UserDocument,
    UserVerificationDetails,
    getUserVerificationDetails,
    getVerificationLevelColor,
    getVerificationLevelLabel,
    reviewUserDocument,
    updateUserVerification,
} from '@/services/userVerificationService';
import { openDocumentAccessUrl } from '@/services/documentAccessService';
import { messagesService, type Conversation } from '@/services/messagesService';
import { useToast } from '@/contexts/ToastContext';
import Avatar from '@/components/ui/Avatar';
import {
    canCompleteFastTrackVerification,
    getLatestFastTrackReviewDocuments,
    latestDocumentByCategory,
} from '@/lib/fastTrackWorkflow';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';

interface UserVerificationReviewModalProps {
    scope: VerificationScope;
    userId: string;
    onClose: () => void;
    onUpdated?: () => void | Promise<void>;
    variant?: 'queue' | 'fast_track';
    missingUserContext?: UserVerificationReviewMissingUserContext;
}

export const USER_VERIFICATION_REVIEW_CLOSE_LABEL = 'Close verification review panel';
const VERIFICATION_NOTES_MAX_LENGTH = 1000;
const VERIFICATION_REASON_MAX_LENGTH = 500;
export const VERIFICATION_REASON_MIN_LENGTH = 20;
export const VERIFICATION_REASON_MIN_WORDS = 4;
export const VERIFICATION_DOCUMENT_ISSUES = [
    { value: 'unreadable', label: 'Image is blurry or unreadable' },
    { value: 'expired', label: 'Document is expired' },
    { value: 'cropped', label: 'Important details are cropped or missing' },
    { value: 'mismatch', label: 'Details do not match the account' },
    { value: 'unsupported', label: 'Document type is not accepted' },
    { value: 'other', label: 'Other document issue' },
] as const;
type VerificationDocumentFilter = 'all' | 'pending' | 'approved' | 'reupload_required' | 'rejected';
type VerificationSortMode = 'newest' | 'oldest' | 'status';
type VerificationRecentLead = UserVerificationDetails['recent_leads'][number];
type VerificationDirectConversation = Pick<Conversation, 'id' | 'updated_at' | 'last_message' | 'counterpart_name' | 'counterpart_email' | 'counterpart_agency' | 'property_title' | 'property_address'>;

export interface UserVerificationReviewMissingUserContext {
    name?: string | null;
    email?: string | null;
    source?: 'appointment' | 'verification';
}

export const getVerificationReviewErrorMessage = (
    error: string | null,
    missingUserContext?: UserVerificationReviewMissingUserContext,
) => {
    const normalizedError = (error || '').trim().toLowerCase();

    if (missingUserContext && normalizedError.includes('user not found')) {
        const label = missingUserContext.name || missingUserContext.email || 'this client';
        const sourceLabel = missingUserContext.source === 'appointment'
            ? 'This appointment'
            : 'This review';

        return `Verification record not available for ${label}. ${sourceLabel} is not linked to a core user profile yet, so document review cannot open here. Use the linked case file or messages while the user profile is connected.`;
    }

    if (
        missingUserContext?.source === 'appointment'
        && normalizedError.includes('properties assigned')
    ) {
        const label = missingUserContext.name || missingUserContext.email || 'this client';
        return `Document review is not available for ${label} from this appointment. The core verification service did not expose an assigned property review record for this client, so document review cannot open here yet. Use the linked case file or messages while the assignment is corrected.`;
    }

    return error || 'Failed to load user details';
};

export const getVerificationDocumentReviewReasonError = (reason: string) => {
    const normalizedReason = reason.trim().replace(/\s+/g, ' ');
    const words = normalizedReason.match(/[A-Za-z0-9]+/g) || [];
    const uniqueWords = new Set(words.map((word) => word.toLowerCase()));

    if (!normalizedReason) {
        return 'Enter a specific reason before continuing.';
    }

    if (normalizedReason.length < VERIFICATION_REASON_MIN_LENGTH) {
        return `Use at least ${VERIFICATION_REASON_MIN_LENGTH} characters so the user knows what to fix.`;
    }

    if (words.length < VERIFICATION_REASON_MIN_WORDS || uniqueWords.size < 3) {
        return `Write at least ${VERIFICATION_REASON_MIN_WORDS} clear words, such as "Document image is blurry and expired."`;
    }

    return null;
};

export const buildVerificationDocumentReviewReason = (issue: string, detail: string) => {
    const issueLabel = VERIFICATION_DOCUMENT_ISSUES.find((option) => option.value === issue)?.label;
    return issueLabel ? issueLabel + ': ' + detail.trim() : detail.trim();
};

const normalizeVerificationDocumentDuplicatePart = (value?: string | null) => (
    String(value || '').trim().toLowerCase()
);

const getVerificationDocumentUploadDay = (createdAt?: string | null) => {
    const timestamp = Date.parse(String(createdAt || ''));
    return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10);
};

const getVerificationDocumentDuplicateKey = (document: UserDocument) => {
    const fileName = normalizeVerificationDocumentDuplicatePart(document.file_name);
    const documentType = normalizeVerificationDocumentDuplicatePart(document.document_type);
    const documentCategory = normalizeVerificationDocumentDuplicatePart(document.document_category);
    const uploadDay = getVerificationDocumentUploadDay(document.created_at);

    if (!fileName || !documentType || !documentCategory || !uploadDay) {
        return '';
    }

    return [
        normalizeVerificationDocumentDuplicatePart(document.user_id),
        fileName,
        documentType,
        documentCategory,
        uploadDay,
    ].join('|');
};

export const dedupeVerificationReviewDocuments = (documents: UserDocument[]) => {
    const seenIds = new Set<string>();
    const seenUploadKeys = new Set<string>();
    const newestFirst = [...documents].sort((left, right) => (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    ));

    return newestFirst.filter((document) => {
        const id = String(document.id || '').trim();
        if (id && seenIds.has(id)) {
            return false;
        }
        if (id) {
            seenIds.add(id);
        }

        const uploadKey = getVerificationDocumentDuplicateKey(document);
        if (uploadKey && seenUploadKeys.has(uploadKey)) {
            return false;
        }
        if (uploadKey) {
            seenUploadKeys.add(uploadKey);
        }

        return true;
    });
};

const isVerificationDocumentApproved = (document: UserDocument | undefined) => {
    const status = String(document?.status || '').trim().toLowerCase();
    return status === 'approved' || status === 'verified';
};

const formatVerificationDocumentStatus = (status?: string | null) => (
    String(status || 'not uploaded')
        .trim()
        .toLowerCase()
        .split(/[_-]+/)
        .filter(Boolean)
        .map((word, index) => (
            index === 0
                ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
                : word
        ))
        .join(' ') || 'Not uploaded'
);

export const getVerificationApprovalBlocker = (documents: UserDocument[]) => {
    const latestDocuments = latestDocumentByCategory(documents);
    const missingApprovals = [
        { label: 'identity proof', document: latestDocuments.get('identity') },
        { label: 'address proof', document: latestDocuments.get('address') },
    ].filter(({ document }) => !isVerificationDocumentApproved(document));

    if (missingApprovals.length === 0) {
        return null;
    }

    const labels = missingApprovals
        .map(({ label, document }) => `${label} (${formatVerificationDocumentStatus(document?.status)})`)
        .join(', ');
    const noun = missingApprovals.length === 1 ? 'document approval is' : 'document approvals are';

    return `${missingApprovals.length} required ${noun} still needed before approving: ${labels}.`;
};

export const formatVerificationLeadStatus = (status?: string | null) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    switch (normalizedStatus) {
        case 'pending_broker_response':
            return 'Waiting for broker response';
        case 'broker_responded':
            return 'Broker has responded';
        default:
            return normalizedStatus
                .split(/[_-]+/)
                .filter(Boolean)
                .map((word, index) => (
                    index === 0
                        ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
                        : word
                ))
                .join(' ') || 'Status unavailable';
    }
};

const formatShortReference = (value?: string | null) => {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
        return '';
    }

    return normalizedValue.length > 12
        ? normalizedValue.slice(0, 8).toUpperCase()
        : normalizedValue;
};

export const formatVerificationLeadReference = (
    lead: Pick<VerificationRecentLead, 'id' | 'lead_number'>,
) => {
    const leadNumber = String(lead.lead_number || '').trim();
    return leadNumber || formatShortReference(lead.id) || 'Unassigned lead';
};

export const formatVerificationLeadPropertyLabel = (
    lead: Pick<VerificationRecentLead, 'property' | 'property_id' | 'property_name'>,
) => {
    const propertyTitle = String(lead.property?.title || lead.property_name || '').trim();

    if (propertyTitle) {
        return propertyTitle;
    }

    return formatShortReference(lead.property_id) || 'Property context pending';
};

export const formatVerificationLeadPropertyAddress = (
    lead: Pick<VerificationRecentLead, 'property'>,
) => (
    [
        lead.property?.address_line_1,
        lead.property?.city,
        lead.property?.postcode,
    ]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ')
);

export const formatVerificationConversationTitle = (conversation: VerificationDirectConversation) => (
    String(conversation.property_title || conversation.counterpart_name || conversation.counterpart_agency || '').trim()
    || 'Direct agent conversation'
);

export const formatVerificationConversationSubtitle = (conversation: VerificationDirectConversation) => (
    String(conversation.property_address || conversation.counterpart_agency || conversation.counterpart_email || '').trim()
    || 'Property context pending'
);

export const formatVerificationConversationLastMessage = (conversation: VerificationDirectConversation) => (
    String(conversation.last_message?.content || '').trim() || 'No message preview available'
);

export const formatVerificationConversationReference = (conversation: Pick<VerificationDirectConversation, 'id'>) => (
    formatShortReference(conversation.id) || 'Conversation'
);
export const canCompleteUserVerification = (documents: UserDocument[]) => {
    const latestDocuments = latestDocumentByCategory(documents);
    return isVerificationDocumentApproved(latestDocuments.get('identity'))
        && isVerificationDocumentApproved(latestDocuments.get('address'));
};

const UserVerificationReviewModal: React.FC<UserVerificationReviewModalProps> = ({
    scope,
    userId,
    onClose,
    onUpdated,
    variant = 'queue',
    missingUserContext,
}) => {
    const isAdmin = scope === 'admin';
    const isFastTrackReview = variant === 'fast_track';
    const [details, setDetails] = useState<UserVerificationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
    const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
    const [verificationActionLoading, setVerificationActionLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const [documentFilter, setDocumentFilter] = useState<VerificationDocumentFilter>('all');
    const [documentSortMode, setDocumentSortMode] = useState<VerificationSortMode>('newest');
    const [leadStatusFilter, setLeadStatusFilter] = useState('all');
    const [leadSortMode, setLeadSortMode] = useState<VerificationSortMode>('newest');
    const [directConversations, setDirectConversations] = useState<Conversation[]>([]);
    const [directConversationsLoading, setDirectConversationsLoading] = useState(false);
    const [directConversationsError, setDirectConversationsError] = useState<string | null>(null);
    const toast = useToast();

    const fetchDetails = useCallback(async () => {
        setLoading(true);
        const { data, error: loadError } = await getUserVerificationDetails(scope, userId);
        if (data?.user.user_id && data.user.user_id !== userId) {
            setDetails(null);
            setError('Verification detail did not match the selected user. Refresh the queue and try again.');
            setLoading(false);
            return;
        }
        setDetails(data);
        setError(loadError);
        setLoading(false);
    }, [scope, userId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    useEffect(() => {
        if (!isAdmin) {
            setDirectConversations([]);
            setDirectConversationsError(null);
            return undefined;
        }

        let cancelled = false;
        setDirectConversationsLoading(true);
        setDirectConversationsError(null);

        void messagesService.getAdminUserDirectConversations(userId, 5)
            .then((conversations) => {
                if (cancelled) {
                    return;
                }
                setDirectConversations(conversations);
            })
            .catch((loadError: any) => {
                if (cancelled) {
                    return;
                }
                setDirectConversations([]);
                setDirectConversationsError(loadError?.message || 'Direct agent messages unavailable');
            })
            .finally(() => {
                if (!cancelled) {
                    setDirectConversationsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isAdmin, userId]);
    const reviewDocuments = useMemo(
        () => isFastTrackReview
            ? getLatestFastTrackReviewDocuments(details?.documents || [])
            : dedupeVerificationReviewDocuments(details?.documents || []),
        [details?.documents, isFastTrackReview],
    );
    const visibleReviewDocuments = useMemo(() => {
        const filteredDocuments = reviewDocuments.filter((document) => (
            documentFilter === 'all' || document.status === documentFilter
        ));

        return [...filteredDocuments].sort((left, right) => {
            if (documentSortMode === 'status') {
                return left.status.localeCompare(right.status)
                    || new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            }

            const direction = documentSortMode === 'oldest' ? 1 : -1;
            return direction * (new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
        });
    }, [documentFilter, documentSortMode, reviewDocuments]);

    const verificationLevel = details?.user.verification_level || 'basic';
    const isVerificationApproved = verificationLevel === 'verified' || verificationLevel === 'fully_verified';
    const canApprove = !isVerificationApproved && (isFastTrackReview
        ? canCompleteFastTrackVerification(details?.documents || [])
        : canCompleteUserVerification(details?.documents || []));
    const approvalBlocker = !isVerificationApproved && !canApprove
        ? getVerificationApprovalBlocker(reviewDocuments)
        : null;

    const getDocumentReviewSuccessMessage = (
        status: 'approved' | 'reupload_required' | 'rejected',
    ) => {
        if (isFastTrackReview) {
            if (status === 'approved') {
                return 'Document approved. Fast-track status has been refreshed.';
            }
            return status === 'rejected'
                ? 'Document rejected. The fast-track case now reflects the decision.'
                : 'Replacement requested. The fast-track case now reflects the requested re-upload.';
        }

        if (status === 'approved') {
            return 'Document approved successfully.';
        }
        return status === 'rejected'
            ? 'Document rejected successfully.'
            : 'Replacement requested successfully.';
    };

    const getVerificationSuccessMessage = (status: 'verified' | 'rejected') => {
        if (isFastTrackReview) {
            return status === 'verified'
                ? 'Fast-track verification completed successfully.'
                : 'Fast-track verification revoked successfully.';
        }

        return status === 'verified'
            ? 'User verification approved successfully.'
            : 'User verification revoked successfully.';
    };

    const refreshAfterSuccessfulAction = useCallback(async () => {
        await fetchDetails();

        if (!onUpdated) {
            return;
        }

        try {
            await onUpdated();
        } catch (refreshError) {
            console.error('Verification review refresh failed after a successful action.', refreshError);
            toast.warning('Saved successfully, but the fast-track view could not refresh automatically. Please reopen the review if the status looks stale.');
        }
    }, [fetchDetails, onUpdated, toast]);

    const handleDocumentReview = async (
        documentId: string,
        status: 'approved' | 'reupload_required' | 'rejected',
        rejectReason?: string,
    ) => {
        setActiveDocumentId(documentId);
        const { error: reviewError } = await reviewUserDocument(scope, documentId, status, rejectReason);
        setActiveDocumentId(null);

        if (reviewError) {
            setError(reviewError);
            return;
        }

        toast.success(getDocumentReviewSuccessMessage(status));
        await refreshAfterSuccessfulAction();
    };

    const handleVerificationUpdate = async (status: 'verified' | 'rejected') => {
        if (status === 'verified' && isVerificationApproved) {
            setError('This verification is already approved. Revoke it before approving again.');
            return;
        }
        if (status === 'rejected' && !notes.trim()) {
            setError('Add verification notes before revoking this verification.');
            return;
        }

        setVerificationActionLoading(true);
        const { error: updateError } = await updateUserVerification(scope, userId, status, notes);
        setVerificationActionLoading(false);

        if (updateError) {
            setError(updateError);
            return;
        }

        toast.success(getVerificationSuccessMessage(status));
        await refreshAfterSuccessfulAction();
        onClose();
    };

    const handleOpenDocument = useCallback(async (documentId: string) => {
        setOpeningDocumentId(documentId);
        const { error: accessError } = await openDocumentAccessUrl(documentId);
        if (accessError) {
            toast.error(accessError);
        }
        setOpeningDocumentId((current) => current === documentId ? null : current);
    }, [toast]);

    if (loading) {
        return (
            <ModalWrapper onClose={onClose}>
                <BrandLoadingScreen
                    variant="panel"
                    label={isFastTrackReview ? 'Loading fast-track review...' : 'Loading user details...'}
                />
            </ModalWrapper>
        );
    }

    if (error || !details) {
        return (
            <ModalWrapper onClose={onClose}>
                <div className="text-center py-16">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
                    <p className="text-gray-600">{getVerificationReviewErrorMessage(error, missingUserContext)}</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-xl font-medium">
                        Close
                    </button>
                </div>
            </ModalWrapper>
        );
    }

    const levelConfig = getVerificationLevelColor(details.user.verification_level);
    const levelLabel = getVerificationLevelLabel(details.user.verification_level);
    const leadStatusOptions = Array.from(new Set((details.recent_leads || [])
        .map((lead) => String(lead.status || '').trim())
        .filter(Boolean)))
        .sort((left, right) => left.localeCompare(right));
    const recentLeads = (() => {
        const filteredLeads = (details.recent_leads || []).filter((lead) => (
            leadStatusFilter === 'all' || lead.status === leadStatusFilter
        ));
        const sortedLeads = [...filteredLeads].sort((left, right) => {
            if (leadSortMode === 'status') {
                return formatVerificationLeadStatus(left.status).localeCompare(formatVerificationLeadStatus(right.status))
                    || new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            }

            const direction = leadSortMode === 'oldest' ? 1 : -1;
            return direction * (new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
        });

        return sortedLeads.slice(0, 5);
    })();
    const reviewDocumentKeyFor = createDuplicateSafeKeyResolver('verification-review-document');
    const recentLeadKeyFor = createDuplicateSafeKeyResolver('verification-recent-lead');

    return (
        <ModalWrapper onClose={onClose}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Avatar
                        userId={details.user.user_id}
                        src={details.user.avatar}
                        name={details.user.full_name}
                        size="xl"
                        shape="rounded"
                        fallbackClassName={isAdmin ? 'from-orange-500 to-amber-600' : 'from-blue-500 to-indigo-600'}
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white break-words [overflow-wrap:anywhere]">
                            {isFastTrackReview ? `Fast-track review for ${details.user.full_name}` : details.user.full_name}
                        </h2>
                        <div className="flex min-w-0 flex-wrap items-center gap-3 mt-1">
                            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${levelConfig.bg} ${levelConfig.text}`}>
                                {levelLabel}
                            </span>
                            <span className="min-w-0 text-sm text-gray-500 break-all">{details.user.email}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={USER_VERIFICATION_REVIEW_CLOSE_LABEL}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">User Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem icon={Mail} label="Email" value={details.user.email} />
                        <InfoItem icon={Phone} label="Phone" value={details.user.phone} />
                        <InfoItem icon={MapPin} label="Address" value={details.user.address ? `${details.user.address}, ${details.user.postcode || ''}`.trim() : 'Not provided'} />
                        <InfoItem icon={Clock} label="Lead Count" value={String(details.user.lead_count)} />
                    </div>
                </div>

                {isFastTrackReview && (
                    <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-200">
                        <p>
                            Review each uploaded fast-track document separately. Approving one file updates only that document and the live case status refreshes after every review action.
                        </p>
                        <p>
                            Only the latest identity proof and latest address proof are shown here, so older rejected uploads do not override the current fast-track state.
                        </p>
                    </div>
                )}

                <div>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isFastTrackReview ? 'Fast-track documents' : 'Verification Documents'}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <label className="sr-only" htmlFor="verification-document-filter">Filter verification documents</label>
                            <select
                                id="verification-document-filter"
                                aria-label="Filter verification documents"
                                value={documentFilter}
                                onChange={(event) => setDocumentFilter(event.target.value as VerificationDocumentFilter)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <option value="all">All documents</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="reupload_required">Re-upload required</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <label className="sr-only" htmlFor="verification-document-sort">Sort verification documents</label>
                            <select
                                id="verification-document-sort"
                                aria-label="Sort verification documents"
                                value={documentSortMode}
                                onChange={(event) => setDocumentSortMode(event.target.value as VerificationSortMode)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <option value="newest">Newest documents</option>
                                <option value="oldest">Oldest documents</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {visibleReviewDocuments.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200">
                                <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-sm text-gray-500">
                                    {reviewDocuments.length === 0 ? 'No documents uploaded' : 'No documents match this filter'}
                                </p>
                                <p className="mt-2 text-xs text-gray-400">
                                    Document review and re-upload actions appear here after a user uploads identity or address proof.
                                </p>
                            </div>
                        ) : (
                            visibleReviewDocuments.map((document, documentIndex) => (
                                <DocumentReviewCard
                                    key={reviewDocumentKeyFor(document.id, documentIndex)}
                                document={document}
                                onApprove={() => handleDocumentReview(document.id, 'approved')}
                                onRequestChanges={(reason) => handleDocumentReview(document.id, 'reupload_required', reason)}
                                onReject={(reason) => handleDocumentReview(document.id, 'rejected', reason)}
                                loading={activeDocumentId === document.id}
                                onView={() => handleOpenDocument(document.id)}
                                viewLoading={openingDocumentId === document.id}
                                disabled={Boolean(activeDocumentId) || verificationActionLoading || isVerificationApproved}
                            />
                        ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Leads</h3>
                        <div className="flex flex-wrap gap-2">
                            <label className="sr-only" htmlFor="verification-lead-filter">Filter recent leads</label>
                            <select
                                id="verification-lead-filter"
                                aria-label="Filter recent leads"
                                value={leadStatusFilter}
                                onChange={(event) => setLeadStatusFilter(event.target.value)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <option value="all">All leads</option>
                                {leadStatusOptions.map((status) => (
                                    <option key={status} value={status}>{formatVerificationLeadStatus(status)}</option>
                                ))}
                            </select>
                            <label className="sr-only" htmlFor="verification-lead-sort">Sort recent leads</label>
                            <select
                                id="verification-lead-sort"
                                aria-label="Sort recent leads"
                                value={leadSortMode}
                                onChange={(event) => setLeadSortMode(event.target.value as VerificationSortMode)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <option value="newest">Newest leads</option>
                                <option value="oldest">Oldest leads</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                    </div>
                    {recentLeads.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                            No recent leads available for this verification.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentLeads.map((lead, leadIndex) => (
                                <div
                                    key={recentLeadKeyFor(lead.id, leadIndex)}
                                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 break-words [overflow-wrap:anywhere] dark:text-white">
                                            {formatVerificationLeadPropertyLabel(lead)}
                                        </p>
                                        {formatVerificationLeadPropertyAddress(lead) && (
                                            <p className="mt-1 text-xs text-gray-500 break-words [overflow-wrap:anywhere] dark:text-gray-400">
                                                {formatVerificationLeadPropertyAddress(lead)}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Lead {formatVerificationLeadReference(lead)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{formatVerificationLeadStatus(lead.status)}</p>
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Direct agent messages</h3>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-200">
                                {directConversationsLoading ? 'Loading' : `${directConversations.length} threads`}
                            </span>
                        </div>
                        {directConversationsLoading ? (
                            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                                <ActionSpinner size={16} aria-hidden />
                                Loading direct agent messages
                            </div>
                        ) : directConversationsError ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                {directConversationsError}
                            </div>
                        ) : directConversations.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                                No direct Contact Agent messages for this user.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {directConversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <div className="flex min-w-0 items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle className="h-4 w-4 shrink-0 text-orange-500" />
                                                    <p className="font-semibold text-gray-900 break-words [overflow-wrap:anywhere] dark:text-white">
                                                        {formatVerificationConversationTitle(conversation)}
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500 break-words [overflow-wrap:anywhere] dark:text-gray-400">
                                                    {formatVerificationConversationSubtitle(conversation)}
                                                </p>
                                                <p className="mt-2 line-clamp-2 text-xs text-gray-700 break-words [overflow-wrap:anywhere] dark:text-gray-300">
                                                    {formatVerificationConversationLastMessage(conversation)}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Conversation {formatVerificationConversationReference(conversation)}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{new Date(conversation.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div>
                    <label htmlFor="verification-review-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verification Notes
                    </label>
                    <textarea
                        id="verification-review-notes"
                        value={notes}
                        onChange={(event) => {
                            setNotes(event.target.value);
                            setError(null);
                        }}
                        required
                        maxLength={VERIFICATION_NOTES_MAX_LENGTH}
                        placeholder={isFastTrackReview
                            ? 'Add case notes for the live fast-track review...'
                            : isAdmin
                                ? 'Add approval or revoke notes...'
                                : 'Add review notes for this user...'}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                        rows={3}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                {isVerificationApproved ? (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                                <CheckCircle className="text-emerald-600" size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Verification approved</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Revoke this verification before approving it again.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleVerificationUpdate('rejected')}
                            disabled={verificationActionLoading || Boolean(activeDocumentId)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50"
                        >
                            {verificationActionLoading ? <ActionSpinner size={16} className="" /> : <XCircle size={16} />}
                            Revoke
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                    <button
                        onClick={() => handleVerificationUpdate('rejected')}
                        disabled={verificationActionLoading || Boolean(activeDocumentId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
                    >
                        {verificationActionLoading ? <ActionSpinner size={16} className="" /> : <XCircle size={16} />}
                        Revoke
                    </button>
                    <button
                        onClick={() => handleVerificationUpdate('verified')}
                        disabled={verificationActionLoading || Boolean(activeDocumentId) || !canApprove}
                        aria-describedby={approvalBlocker ? 'verification-approval-blocker' : undefined}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium disabled:opacity-50 transition-all ${isAdmin ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {verificationActionLoading ? <ActionSpinner size={16} className="" /> : <CheckCircle size={16} />}
                        {isFastTrackReview ? 'Complete fast-track verification' : 'Approve Verification'}
                    </button>
                    </div>
                )}
                {approvalBlocker && (
                    <div
                        id="verification-approval-blocker"
                        className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200"
                    >
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{approvalBlocker}</p>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

const DocumentReviewCard: React.FC<{
    document: UserDocument;
    onApprove: () => void;
    onRequestChanges: (reason: string) => void;
    onReject: (reason: string) => void;
    onView: () => void;
    loading: boolean;
    viewLoading?: boolean;
    disabled?: boolean;
}> = ({ document, onApprove, onRequestChanges, onReject, onView, loading, viewLoading = false, disabled = false }) => {
    const [reviewMode, setReviewMode] = useState<'reupload' | 'reject' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reviewIssue, setReviewIssue] = useState('');

    const config = (() => {
        switch (document.status) {
            case 'approved':
                return { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle };
            case 'rejected':
                return { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
            case 'reupload_required':
                return { label: 'Re-upload Required', bg: 'bg-amber-100', text: 'text-amber-700', icon: RefreshCw };
            case 'under_review':
                return { label: 'Under Review', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock };
            default:
                return { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };
        }
    })();

    const StatusIcon = config.icon;
    const canEdit = (
        document.status === 'pending'
        || document.status === 'under_review'
        || document.status === 'approved'
        || document.status === 'rejected'
        || document.status === 'reupload_required'
    );
    const isApprovedDocument = document.status === 'approved';
    const reviewReasonError = reviewMode ? getVerificationDocumentReviewReasonError(rejectReason) : null;
    const visibleReviewReasonError = rejectReason.trim() ? reviewReasonError : null;
    const reviewReasonHelpId = `document-review-reason-help-${document.id}`;
    const reviewReasonErrorId = `document-review-reason-error-${document.id}`;

    return (
        <div className={`rounded-xl border p-4 ${
            isApprovedDocument
                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
        }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${config.bg}`}>
                        <StatusIcon className={config.text} size={18} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{document.file_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {document.document_category} - {new Date(document.created_at).toLocaleDateString()}
                        </p>
                        {document.reject_reason && (
                            <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                                Reason: {document.reject_reason}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                </span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {reviewMode ? (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                            Document issue
                            <select
                                value={reviewIssue}
                                onChange={(event) => setReviewIssue(event.target.value)}
                                aria-label={'Document issue for ' + document.file_name}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                                <option value="">Select the issue found</option>
                                {VERIFICATION_DOCUMENT_ISSUES.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            placeholder={reviewMode === 'reject' ? 'Reason for rejecting this document...' : 'Reason for requesting a re-upload...'}
                            aria-label={reviewMode === 'reject' ? `Reject reason for ${document.file_name}` : `Re-upload reason for ${document.file_name}`}
                            required
                            minLength={VERIFICATION_REASON_MIN_LENGTH}
                            maxLength={VERIFICATION_REASON_MAX_LENGTH}
                            aria-invalid={Boolean(visibleReviewReasonError)}
                            aria-describedby={`${reviewReasonHelpId}${visibleReviewReasonError ? ` ${reviewReasonErrorId}` : ''}`}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
                            rows={2}
                        />
                        <p id={reviewReasonHelpId} className="text-xs text-gray-500 dark:text-gray-400">
                            Use at least {VERIFICATION_REASON_MIN_WORDS} clear words and {VERIFICATION_REASON_MIN_LENGTH} characters. Include what is wrong and what the user should upload next.
                        </p>
                        {visibleReviewReasonError && (
                            <p id={reviewReasonErrorId} className="text-xs font-medium text-red-600 dark:text-red-300">
                                {reviewReasonError}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const reason = buildVerificationDocumentReviewReason(reviewIssue, rejectReason);
                                    return reviewMode === 'reject' ? onReject(reason) : onRequestChanges(reason);
                                }}
                                disabled={loading || disabled || !reviewIssue || Boolean(reviewReasonError)}
                                aria-label={reviewMode === 'reject' ? `Confirm rejection for ${document.file_name}` : `Request re-upload for ${document.file_name}`}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {reviewMode === 'reject' ? 'Confirm Reject' : 'Request Re-upload'}
                            </button>
                            <button
                                onClick={() => {
                                    setReviewMode(null);
                                    setRejectReason('');
                                    setReviewIssue('');
                                }}
                                aria-label={`Cancel document review action for ${document.file_name}`}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {isApprovedDocument ? (
                            <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 dark:border-emerald-900/50 dark:bg-gray-900/40 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle size={14} />
                                    Approved document - correction actions
                                </div>
                                <div className="flex flex-wrap gap-2 sm:ml-3">
                                    <button
                                        onClick={() => setReviewMode('reupload')}
                                        disabled={disabled}
                                        aria-label={`Request re-upload for approved ${document.file_name}`}
                                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900/50 dark:bg-gray-900 dark:text-amber-300"
                                    >
                                        <RefreshCw size={12} className="inline-block mr-1" /> Request Re-upload
                                    </button>
                                    <button
                                        onClick={() => setReviewMode('reject')}
                                        disabled={disabled}
                                        aria-label={`Reject approved ${document.file_name}`}
                                        className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300"
                                    >
                                        <X size={12} className="inline-block mr-1" /> Reject
                                    </button>
                                </div>
                            </div>
                        ) : canEdit && (
                            <>
                                <button
                                    onClick={onApprove}
                                    disabled={loading || disabled}
                                    aria-label={`Approve ${document.file_name}`}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                    <Check size={12} /> Approve
                                </button>
                                <button
                                    onClick={() => setReviewMode('reupload')}
                                    disabled={disabled}
                                    aria-label={`Request re-upload for ${document.file_name}`}
                                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 flex items-center gap-1"
                                >
                                    <RefreshCw size={12} /> Request Re-upload
                                </button>
                                <button
                                    onClick={() => setReviewMode('reject')}
                                    disabled={disabled}
                                    aria-label={`Reject ${document.file_name}`}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                    <X size={12} /> Reject
                                </button>
                            </>
                        )}
                        <button
                            onClick={onView}
                            disabled={viewLoading}
                            aria-label={`View ${document.file_name}`}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1 sm:ml-auto"
                        >
                            {viewLoading ? <ActionSpinner size={12} className="" /> : <FileText size={12} />}
                            View
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ElementType; label: string; value?: string | null }> = ({ icon: Icon, label, value }) => (
    <div className="flex min-w-0 items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <div className="shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon size={14} className="text-gray-600 dark:text-gray-400" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white break-words [overflow-wrap:anywhere]">
                {value || <span className="text-gray-400 italic">Not provided</span>}
            </p>
        </div>
    </div>
);

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
            previousFocusRef.current?.focus();
        };
    }, [onClose]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div
                data-testid="user-verification-review-modal"
                role="dialog"
                aria-modal="true"
                aria-label="User verification review"
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default UserVerificationReviewModal;
