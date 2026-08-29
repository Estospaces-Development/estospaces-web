"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Building2,
    FileText,
    Eye,
    Download,
    RefreshCw,
    AlertCircle,
    Calendar,
    Hash,
    Mail,
    MapPin,
    Phone,
    Globe,
    ChevronDown,
    ChevronUp,
    History,
    Shield,
    Briefcase,
    Sparkles,
    type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as managerVerificationService from '@/services/managerVerificationService';
import { openDocumentAccessUrl } from '@/services/documentAccessService';
import Avatar from '@/components/ui/Avatar';
import {
    ManagerProfile,
    ManagerDocument,
    AuditLogEntry,
    type DocumentStatus,
    type VerificationStatus,
} from '@/services/managerVerificationService';

// ============================================================================
// Types
// ============================================================================

interface ManagerReviewModalProps {
    managerId: string;
    onClose: () => void;
}

interface ReviewDetails {
    profile: ManagerProfile | null;
    documents: ManagerDocument[];
    auditLog: AuditLogEntry[];
    userInfo: { email?: string; full_name?: string } | null;
}

export const MANAGER_REVIEW_CLOSE_LABEL = 'Close manager verification review panel';
const MANAGER_REVIEW_NOTES_MAX_LENGTH = 1000;
const MANAGER_REVIEW_REASON_MAX_LENGTH = 500;
export const MANAGER_REVIEW_REASON_MIN_LENGTH = 20;
export const MANAGER_REVIEW_REASON_MIN_WORDS = 4;

interface ManagerProfessionalDetail {
    icon: LucideIcon;
    label: string;
    value?: string | null;
    href?: string;
}

const formatProfileList = (values?: string[]): string | undefined => {
    const normalizedValues = values?.map((value) => value.trim()).filter(Boolean) ?? [];
    return normalizedValues.length > 0 ? normalizedValues.join(', ') : undefined;
};

const getSafeProfileUrl = (value?: string): string | undefined => {
    if (!value) return undefined;

    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
    } catch {
        return undefined;
    }
};

export const getManagerProfessionalDetails = (
    profile: ManagerProfile,
): ManagerProfessionalDetail[] => {
    const certificateUrl = getSafeProfileUrl(profile.cmp_certificate_url);
    const websiteUrl = getSafeProfileUrl(profile.website);
    const handlesClientMoney = Boolean(
        profile.has_client_money
        || profile.cmp_provider?.trim()
        || profile.cmp_certificate_url?.trim(),
    );
    const certificateValue = !handlesClientMoney
        ? 'Not applicable'
        : certificateUrl
            ? 'View certificate'
            : profile.cmp_certificate_url
                ? 'Invalid certificate link'
                : undefined;

    return [
        { icon: Building2, label: 'Company Name', value: profile.company_name },
        { icon: Briefcase, label: 'Branch Name', value: profile.branch_name },
        { icon: Phone, label: 'Business Phone', value: profile.business_phone },
        {
            icon: Globe,
            label: 'Website',
            value: websiteUrl ? 'Visit website' : profile.website ? 'Invalid website link' : undefined,
            href: websiteUrl,
        },
        { icon: Hash, label: 'Tax ID', value: profile.tax_id },
        { icon: MapPin, label: 'Company Address', value: profile.company_address },
        { icon: MapPin, label: 'Registered Office Address', value: profile.registered_office_address },
        { icon: Mail, label: 'Complaints Contact', value: profile.complaints_contact },
        { icon: Shield, label: 'Redress Scheme', value: profile.redress_scheme_name },
        { icon: Hash, label: 'Redress Membership Number', value: profile.redress_membership_number },
        { icon: FileText, label: 'Company Description', value: profile.company_description },
        { icon: MapPin, label: 'Service Areas', value: formatProfileList(profile.service_areas) },
        { icon: Hash, label: 'Dispatch PIN Codes', value: formatProfileList(profile.dispatch_pincodes) },
        { icon: Shield, label: 'Handles Client Money', value: handlesClientMoney ? 'Yes' : 'No' },
        {
            icon: Shield,
            label: 'Client Money Protection Provider',
            value: handlesClientMoney ? profile.cmp_provider : 'Not applicable',
        },
        {
            icon: FileText,
            label: 'Client Money Protection Certificate',
            value: certificateValue,
            href: certificateUrl,
        },
    ];
};

export const getManagerReviewReasonError = (
    reason: string,
    label: string,
): string | null => {
    const normalizedReason = reason.trim().replace(/\s+/g, ' ');
    if (!normalizedReason) {
        return `Please provide a ${label}`;
    }
    if (normalizedReason.length < MANAGER_REVIEW_REASON_MIN_LENGTH) {
        return `Use at least ${MANAGER_REVIEW_REASON_MIN_LENGTH} characters for the ${label}.`;
    }

    const words = normalizedReason.split(' ').filter(Boolean);
    const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
    if (words.length < MANAGER_REVIEW_REASON_MIN_WORDS || uniqueWords.size < 3) {
        return `Use at least ${MANAGER_REVIEW_REASON_MIN_WORDS} clear words for the ${label}.`;
    }

    return null;
};

export const getEffectiveManagerDocumentStatus = (
    documentStatus: DocumentStatus,
    profileStatus?: VerificationStatus,
): DocumentStatus => {
    if (profileStatus === 'approved' && documentStatus !== 'approved') {
        return 'approved';
    }

    if (
        profileStatus === 'rejected'
        && documentStatus !== 'rejected'
        && documentStatus !== 'reupload_required'
    ) {
        return 'reupload_required';
    }

    return documentStatus;
};

export const getManagerReviewAuditLog = (
    _profile: ManagerProfile,
    auditLog: AuditLogEntry[],
): AuditLogEntry[] => {
    return auditLog;
};

// ============================================================================
// Main Component
// ============================================================================

const ManagerReviewModal: React.FC<ManagerReviewModalProps> = ({ managerId, onClose }) => {
    const { user, getRole } = useAuth();
    const [details, setDetails] = useState<ReviewDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showReuploadForm, setShowReuploadForm] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reuploadReason, setReuploadReason] = useState('');
    const [approveNotes, setApproveNotes] = useState('');
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    const [revokeReason, setRevokeReason] = useState('');
    const [showAuditLog, setShowAuditLog] = useState(false);

    // ========================================================================
    // Data Fetching
    // ========================================================================

    const fetchDetails = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await managerVerificationService.getManagerVerificationDetails(managerId);

            if (result.error) {
                setError(result.error);
            } else if (result.data) {
                setDetails(result.data);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [managerId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    // ========================================================================
    // Actions
    // ========================================================================

    const handleApprove = async () => {
        if (!user?.id) {
            setError('You must be logged in to approve');
            return;
        }
        const approvalBlocker = managerVerificationService.getManagerApprovalBlocker(
            details?.profile || null,
            details?.documents || [],
        );
        if (approvalBlocker) {
            setError(approvalBlocker);
            setShowApproveConfirm(false);
            return;
        }

        setActionLoading('approve');
        setError(null);
        try {
            const result = await managerVerificationService.approveManager(managerId, user.id, approveNotes);
            if (result.error) {
                setError(result.error);
                setShowApproveConfirm(false);
            } else {
                onClose();
            }
        } catch (err) {
            setError((err as Error).message);
            setShowApproveConfirm(false);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!user?.id) return;
        const reasonError = getManagerReviewReasonError(rejectReason, 'rejection reason');
        if (reasonError) {
            setError(reasonError);
            return;
        }

        setActionLoading('reject');
        try {
            const result = await managerVerificationService.rejectManager(managerId, user.id, rejectReason);
            if (result.error) {
                setError(result.error);
            } else {
                onClose();
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setActionLoading(null);
            setShowRejectForm(false);
        }
    };

    const handleRevokeApproval = async () => {
        if (!user?.id) {
            setError('You must be logged in to revoke approval');
            return;
        }

        // Verify admin role
        const userRole = getRole ? getRole() : user?.role; // Adapt for web context
        if (userRole !== 'admin') {
            setError(`Permission denied. Admin role required. Current role: ${userRole || 'none'}`);
            return;
        }

        const reasonError = getManagerReviewReasonError(revokeReason, 'reason for revocation');
        if (reasonError) {
            setError(reasonError);
            return;
        }

        setActionLoading('revoke');
        setError(null);
        try {

            const result = await managerVerificationService.revokeManagerApproval(managerId, user.id, revokeReason);

            if (result.error) {
                // Keep the form open so user can see the error and try again
                setError(result.error || 'Failed to revoke approval. Please try again.');
                // Don't close the form on error - let user see the error message
            } else {
                // Clear the form
                setRevokeReason('');
                setShowRevokeConfirm(false);
                // Refresh the details to show updated status
                await fetchDetails();
                // Close the modal and refresh the parent list
                onClose();
            }
        } catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : typeof err === 'string'
                    ? err
                    : 'An unexpected error occurred';
            setError(`Error: ${errorMessage}. Please check the console for details.`);
            // Keep form open on error
        } finally {
            setActionLoading(null);
        }
    };

    const handleRequestReupload = async (documentId: string) => {
        if (!user?.id) return;
        const reasonError = getManagerReviewReasonError(reuploadReason, 'reason for re-upload');
        if (reasonError) {
            setError(reasonError);
            return;
        }

        setActionLoading(`reupload-${documentId}`);
        try {
            const result = await managerVerificationService.requestDocumentReupload(
                managerId,
                user.id,
                documentId,
                reuploadReason
            );
            if (result.error) {
                setError(result.error);
            } else {
                await fetchDetails();
                setShowReuploadForm(null);
                setReuploadReason('');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    // ========================================================================
    // Render
    // ========================================================================

    if (loading) {
        return (
            <ModalWrapper onClose={onClose}>
                <BrandLoadingScreen variant="panel" label="Loading verification details..." />
            </ModalWrapper>
        );
    }

    if (!details || !details.profile) {
        return (
            <ModalWrapper onClose={onClose}>
                <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-gray-400" size={40} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Manager Not Found</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        {error || 'Unable to load verification details'}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </ModalWrapper>
        );
    }

    const { profile, documents, auditLog, userInfo } = details;
    const effectiveAuditLog = getManagerReviewAuditLog(profile, auditLog);
    const isBroker = profile.profile_type === 'broker';
    const effectiveDocuments = documents.map((document) => ({
        ...document,
        verification_status: getEffectiveManagerDocumentStatus(document.verification_status, profile.verification_status),
    }));
    const approvalBlocker = managerVerificationService.getManagerApprovalBlocker(profile, effectiveDocuments);
    const isApproved = profile.verification_status === 'approved' && approvalBlocker === null;
    const isRejected = profile.verification_status === 'rejected';
    const isClosed = isApproved || isRejected;
    const rejectionReason = profile.rejection_reason || profile.agency_verification_reason || profile.revision_notes;
    const revokeReasonError = showRevokeConfirm
        ? getManagerReviewReasonError(revokeReason, 'reason for revocation')
        : null;
    const rejectReasonError = showRejectForm
        ? getManagerReviewReasonError(rejectReason, 'rejection reason')
        : null;
    const effectiveStatus = profile.verification_status === 'approved' && approvalBlocker !== null
        ? 'verification_required'
        : profile.verification_status;
    const statusConfig = getStatusConfig(effectiveStatus);

    return (
        <ModalWrapper onClose={onClose}>
            {/* Premium Header */}
            <div className="relative overflow-hidden flex-shrink-0">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${isBroker
                    ? 'from-orange-500 via-red-500 to-rose-500'
                    : 'from-blue-500 via-indigo-500 to-purple-500'
                    } opacity-10`} />

                <div className="relative p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Premium Avatar */}
                            <div className="relative">
                                <Avatar
                                    userId={managerId}
                                    name={
                                        userInfo?.full_name ||
                                        userInfo?.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ||
                                        'Unknown Manager'
                                    }
                                    size="xl"
                                    shape="rounded"
                                    fallbackClassName={isBroker ? 'from-orange-400 to-red-500' : 'from-blue-400 to-indigo-500'}
                                />
                                {/* Status indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${statusConfig.dotColor}`}>
                                    <statusConfig.icon size={10} className="text-white" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {userInfo?.full_name ||
                                        userInfo?.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ||
                                        'Unknown Manager'}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Mail size={14} />
                                        {userInfo?.email || managerId.slice(0, 8) + '...'}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${isBroker
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {isBroker ? <Briefcase size={12} /> : <Building2 size={12} />}
                                        {isBroker ? 'Broker' : 'Company'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Status Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                <statusConfig.icon size={14} />
                                {statusConfig.label}
                            </span>
                            <button
                                onClick={onClose}
                                aria-label={MANAGER_REVIEW_CLOSE_LABEL}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                        <p className="text-sm text-red-700 break-words">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                        aria-label="Dismiss error"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
                {/* Profile Information Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-900 rounded-lg">
                            <FileText size={14} className="text-white" />
                        </div>
                        Profile Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {isBroker ? (
                            <>
                                <InfoItem icon={Hash} label="License Number" value={profile.license_number} />
                                <InfoItem icon={Calendar} label="License Expiry" value={profile.license_expiry_date} />
                                <InfoItem icon={Shield} label="Association ID" value={profile.association_membership_id} />
                            </>
                        ) : (
                            <>
                                <InfoItem icon={Hash} label="Registration Number" value={profile.company_registration_number} />
                                <InfoItem icon={User} label="Representative" value={profile.authorized_representative_name} />
                                <InfoItem icon={Mail} label="Representative Email" value={profile.authorized_representative_email} />
                            </>
                        )}
                        <InfoItem
                            icon={Calendar}
                            label="Submitted"
                            value={profile.submitted_at ? new Date(profile.submitted_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }) : undefined}
                        />
                    </div>
                </div>

                {/* Professional Details Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-900 rounded-lg">
                            <Briefcase size={14} className="text-white" />
                        </div>
                        Professional Details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {getManagerProfessionalDetails(profile).map((detail) => (
                            <InfoItem
                                key={detail.label}
                                icon={detail.icon}
                                label={detail.label}
                                value={detail.value}
                                href={detail.href}
                            />
                        ))}
                    </div>
                </div>

                {/* Documents Section */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-900 rounded-lg">
                            <FileText size={14} className="text-white" />
                        </div>
                        Documents
                        <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {documents.length} uploaded
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {documents.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                                <Sparkles className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-sm text-gray-500">No documents uploaded yet</p>
                            </div>
                        ) : (
                            effectiveDocuments.map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    onRequestReupload={() => setShowReuploadForm(doc.id)}
                                    showReuploadForm={showReuploadForm === doc.id}
                                    reuploadReason={reuploadReason}
                                    setReuploadReason={setReuploadReason}
                                    onSubmitReupload={() => handleRequestReupload(doc.id)}
                                    onCancelReupload={() => {
                                        setShowReuploadForm(null);
                                        setReuploadReason('');
                                    }}
                                    actionLoading={actionLoading === `reupload-${doc.id}`}
                                    disabled={isClosed}
                                    profileStatus={profile.verification_status}
                                    profileRejectionReason={rejectionReason}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Audit Log */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                        onClick={() => setShowAuditLog(!showAuditLog)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <History size={16} />
                            Activity Log
                            <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                                {effectiveAuditLog.length}
                            </span>
                        </span>
                        {showAuditLog ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {showAuditLog && (
                        <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                            {effectiveAuditLog.length === 0 ? (
                                <p className="text-sm text-gray-500 italic py-2">No activity recorded</p>
                            ) : (
                                <div className="space-y-3">
                                    {effectiveAuditLog.map((entry) => (
                                        <div key={entry.id} className="flex gap-3 text-sm">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{formatActionType(entry.action_type)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                    {entry.actor_id ? ` - Admin #${entry.actor_id.slice(0, 8)}` : ''}
                                                    {entry.actor_role ? ` (${entry.actor_role})` : ''}
                                                </p>
                                                {entry.notes && (
                                                    <p className="text-xs text-gray-600 mt-1 bg-white px-2 py-1 rounded border">{entry.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white flex-shrink-0">
                {!isRejected && approvalBlocker && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-900">Approval blocked</p>
                            <p className="text-sm text-amber-800 break-words">{approvalBlocker}</p>
                        </div>
                    </div>
                )}
                {isRejected ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <XCircle className="text-red-600" size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-red-950">Manager Rejected</p>
                            <p className="text-sm text-red-800">
                                This verification is closed. The manager must upload corrected documents before admin review can continue.
                            </p>
                            {rejectionReason && (
                                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-red-700">
                                    <strong>Reason:</strong> {rejectionReason}
                                </p>
                            )}
                        </div>
                    </div>
                ) : isApproved ? (
                    showRevokeConfirm ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Revocation Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={revokeReason}
                                    onChange={(e) => {
                                        setRevokeReason(e.target.value);
                                        setError(null); // Clear error when user types
                                    }}
                                    placeholder="Explain why this approval is being revoked..."
                                    required
                                    maxLength={MANAGER_REVIEW_REASON_MAX_LENGTH}
                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    rows={3}
                                    autoFocus
                                />
                                {revokeReasonError && (
                                    <p className="text-xs text-gray-500 mt-1">{revokeReasonError}</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRevokeApproval}
                                    disabled={Boolean(revokeReasonError) || actionLoading === 'revoke'}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
                                >
                                    {actionLoading === 'revoke' && <ActionSpinner className="" size={16} />}
                                    Confirm Revocation
                                </button>
                                <button
                                    onClick={() => { setShowRevokeConfirm(false); setRevokeReason(''); }}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle className="text-emerald-600" size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Verified Manager</p>
                                    <p className="text-xs text-gray-500">This account has been approved</p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowRevokeConfirm(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={actionLoading !== null}
                                type="button"
                            >
                                <XCircle size={16} />
                                Revoke Approval
                            </button>
                        </div>
                    )
                ) : showRejectForm ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => {
                                    setRejectReason(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Explain why this verification is being rejected..."
                                required
                                maxLength={MANAGER_REVIEW_REASON_MAX_LENGTH}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                rows={3}
                            />
                            {rejectReasonError && (
                                <p className="text-xs text-gray-500 mt-1">{rejectReasonError}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                disabled={Boolean(rejectReasonError) || actionLoading === 'reject'}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
                            >
                                {actionLoading === 'reject' && <ActionSpinner className="" size={16} />}
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : showApproveConfirm ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Approval Notes <span className="text-gray-400">(Optional)</span>
                            </label>
                            <textarea
                                value={approveNotes}
                                onChange={(e) => setApproveNotes(e.target.value)}
                                placeholder="Add any notes for this approval..."
                                maxLength={MANAGER_REVIEW_NOTES_MAX_LENGTH}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={approvalBlocker !== null || actionLoading === 'approve'}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {actionLoading === 'approve' && <ActionSpinner className="" size={16} />}
                                <CheckCircle size={16} />
                                Confirm Approval
                            </button>
                            <button
                                onClick={() => setShowApproveConfirm(false)}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowApproveConfirm(true)}
                            disabled={approvalBlocker !== null}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle size={18} />
                            Approve
                        </button>
                        <button
                            onClick={() => setShowRejectForm(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                        >
                            <XCircle size={18} />
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

// ============================================================================
// Modal Wrapper - Premium Glassmorphism Design
// ============================================================================

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({
    children,
    onClose
}) => {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
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
            {/* Premium Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal with slide-up animation */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Manager verification review"
                className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                {children}
            </div>
        </div>,
        document.body,
    );
};

// ============================================================================
// Info Item Component
// ============================================================================

const InfoItem: React.FC<{
    icon: LucideIcon;
    label: string;
    value?: string | null;
    href?: string;
}> = ({ icon: Icon, label, value, href }) => (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
        <div className="p-2 bg-gray-100 rounded-lg">
            <Icon size={14} className="text-gray-600" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            {href && value ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                >
                    {value}
                    <Eye size={14} aria-hidden="true" />
                </a>
            ) : (
                <p className="text-sm font-medium text-gray-900 break-words [overflow-wrap:anywhere]">
                    {value || <span className="text-gray-400 italic font-normal">Not provided</span>}
                </p>
            )}
        </div>
    </div>
);

// ============================================================================
// Document Card Component
// ============================================================================

const DocumentCard: React.FC<{
    document: ManagerDocument;
    onRequestReupload: () => void;
    showReuploadForm: boolean;
    reuploadReason: string;
    setReuploadReason: (value: string) => void;
    onSubmitReupload: () => void;
    onCancelReupload: () => void;
    actionLoading: boolean;
    disabled: boolean;
    profileStatus?: VerificationStatus;
    profileRejectionReason?: string;
}> = ({
    document,
    onRequestReupload,
    showReuploadForm,
    reuploadReason,
    setReuploadReason,
    onSubmitReupload,
    onCancelReupload,
    actionLoading,
    disabled,
    profileStatus,
    profileRejectionReason,
}) => {
        const toast = useToast();
        const [viewLoading, setViewLoading] = useState(false);
        const effectiveStatus = getEffectiveManagerDocumentStatus(document.verification_status, profileStatus);
        const docStatusConfig = getDocStatusConfig(effectiveStatus);
        const effectiveRejectionReason = document.rejection_reason || (
            profileStatus === 'rejected'
                ? profileRejectionReason || 'Manager verification was rejected. Upload corrected documents before resubmitting.'
                : undefined
        );
        const reuploadReasonError = showReuploadForm
            ? getManagerReviewReasonError(reuploadReason, 'reason for re-upload')
            : null;

        const handleOpenDocument = useCallback(async () => {
            setViewLoading(true);
            const { error } = await openDocumentAccessUrl(document.id);
            if (error) {
                toast.error(error);
            }
            setViewLoading(false);
        }, [document.id, toast]);

        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${docStatusConfig.bgColor}`}>
                            <FileText className={docStatusConfig.textColor} size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                                {managerVerificationService.getManagerDocumentTypeName(document.document_type)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {document.document_name || 'Document uploaded'}
                                {document.expiry_date && ` - Expires: ${new Date(document.expiry_date).toLocaleDateString()}`}
                            </p>
                            {document.document_number && (
                                <p className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    {document.document_number}
                                </p>
                            )}
                        </div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${docStatusConfig.bgColor} ${docStatusConfig.textColor}`}>
                        <docStatusConfig.icon size={12} />
                        {docStatusConfig.label}
                    </span>
                </div>

                {effectiveRejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        <strong>Rejection reason:</strong> {effectiveRejectionReason}
                    </div>
                )}

                {showReuploadForm ? (
                    <div className="mt-4 space-y-3">
                        <textarea
                            value={reuploadReason}
                            onChange={(e) => setReuploadReason(e.target.value)}
                            placeholder="Explain what's wrong with this document..."
                            required
                            maxLength={MANAGER_REVIEW_REASON_MAX_LENGTH}
                            aria-label={`Re-upload reason for ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                            className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none transition-all"
                            rows={2}
                        />
                        {reuploadReasonError && (
                            <p className="text-xs text-gray-500">{reuploadReasonError}</p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={onSubmitReupload}
                                disabled={Boolean(reuploadReasonError) || actionLoading}
                                aria-label={`Request re-upload for ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                {actionLoading && <ActionSpinner className="" size={12} />}
                                Request Re-upload
                            </button>
                            <button
                                onClick={onCancelReupload}
                                aria-label={`Cancel re-upload request for ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            onClick={handleOpenDocument}
                            disabled={viewLoading}
                            aria-label={`View ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                            {viewLoading ? <ActionSpinner className="" size={12} /> : <Eye size={12} />}
                            View
                        </button>
                        <button
                            onClick={handleOpenDocument}
                            disabled={viewLoading}
                            aria-label={`Download ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                            <Download size={12} />
                            Download
                        </button>
                        {!disabled && effectiveStatus !== 'rejected' && effectiveStatus !== 'reupload_required' && (
                            <button
                                onClick={onRequestReupload}
                                aria-label={`Request re-upload for ${managerVerificationService.getManagerDocumentTypeName(document.document_type)}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-200 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                            >
                                <RefreshCw size={12} />
                                Request Re-upload
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusConfig = (status: string): { label: string; icon: LucideIcon; bgColor: string; textColor: string; dotColor: string } => {
    switch (status) {
        case 'approved':
        case 'verified':
        case 'fully_verified':
            return {
                label: 'Approved',
                icon: CheckCircle,
                bgColor: 'bg-emerald-100',
                textColor: 'text-emerald-700',
                dotColor: 'bg-emerald-500',
            };
        case 'rejected':
            return {
                label: 'Rejected',
                icon: XCircle,
                bgColor: 'bg-red-100',
                textColor: 'text-red-700',
                dotColor: 'bg-red-500',
            };
        case 'under_review':
            return {
                label: 'In Review',
                icon: Eye,
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-700',
                dotColor: 'bg-blue-500',
            };
        case 'submitted':
        case 'pending':
        case 'documents_submitted':
        case 'basic':
            return {
                label: 'Pending Review',
                icon: Clock,
                bgColor: 'bg-amber-100',
                textColor: 'text-amber-700',
                dotColor: 'bg-amber-500',
            };
        case 'verification_required':
            return {
                label: 'Re-verification Req.',
                icon: RefreshCw,
                bgColor: 'bg-orange-100',
                textColor: 'text-orange-700',
                dotColor: 'bg-orange-500',
            };
        default:
            return {
                label: 'Incomplete',
                icon: FileText,
                bgColor: 'bg-gray-100',
                textColor: 'text-gray-700',
                dotColor: 'bg-gray-400',
            };
    }
};

const getDocStatusConfig = (status: string): { label: string; icon: LucideIcon; bgColor: string; textColor: string } => {
    switch (status) {
        case 'approved':
            return {
                label: 'Approved',
                icon: CheckCircle,
                bgColor: 'bg-emerald-100',
                textColor: 'text-emerald-600',
            };
        case 'rejected':
        case 'reupload_required':
            return {
                label: status === 'rejected' ? 'Rejected' : 'Re-upload',
                icon: XCircle,
                bgColor: 'bg-red-100',
                textColor: 'text-red-600',
            };
        case 'under_review':
            return {
                label: 'Reviewing',
                icon: Eye,
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600',
            };
        default:
            return {
                label: 'Pending',
                icon: Clock,
                bgColor: 'bg-amber-100',
                textColor: 'text-amber-600',
            };
    }
};

const formatActionType = (actionType: string): string => {
    const map: Record<string, string> = {
        'profile_created': 'Profile Created',
        'profile_updated': 'Profile Updated',
        'document_uploaded': 'Document Uploaded',
        'document_deleted': 'Document Deleted',
        'document_replaced': 'Document Replaced',
        'verification_submitted': 'Submitted for Verification',
        'review_started': 'Review Started',
        'document_approved': 'Document Approved',
        'document_rejected': 'Document Rejected',
        'document_reupload_requested': 'Re-upload Requested',
        'manager_approved': 'Manager Approved',
        'manager_rejected': 'Manager Rejected',
        'status_changed': 'Status Changed',
        'license_expired': 'License Expired',
        'critical_field_edited': 'Critical Field Edited',
        'approval_revoked': 'Approval Revoked',
    };
    return map[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default ManagerReviewModal;

