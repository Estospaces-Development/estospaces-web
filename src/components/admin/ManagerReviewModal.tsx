"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
    Loader2,
    Calendar,
    Hash,
    Mail,
    ChevronDown,
    ChevronUp,
    History,
    Shield,
    Briefcase,
    Sparkles,
    type LucideIcon
} from 'lucide-react';
import * as managerVerificationService from '@/services/managerVerificationService';
import { useAuth } from '@/contexts/AuthContext';
import {
    ManagerProfile,
    ManagerDocument,
    AuditLogEntry,
    DocumentType
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
    const [showReuploadForm, setShowReuploadForm] = useState<DocumentType | null>(null);
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

                // Auto-start review if status is 'submitted'
                if (result.data.profile?.verification_status === 'submitted' && user?.id) {
                    await managerVerificationService.startReview(managerId, user.id);
                    const updatedResult = await managerVerificationService.getManagerVerificationDetails(managerId);
                    if (updatedResult.data) {
                        setDetails(updatedResult.data);
                    }
                }
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [managerId, user?.id]);

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
        if (!user?.id || !rejectReason.trim()) return;

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
            console.error('Revocation attempted by non-admin user:', { userId: user.id, role: userRole });
            return;
        }

        if (!revokeReason.trim()) {
            setError('Please provide a reason for revocation');
            return;
        }

        setActionLoading('revoke');
        setError(null);
        try {
            console.log('Revoking manager approval:', {
                managerId,
                adminId: user.id,
                reasonLength: revokeReason.length,
                userRole: user.user_metadata?.role || 'unknown'
            });

            const result = await managerVerificationService.revokeManagerApproval(managerId, user.id, revokeReason);

            if (result.error) {
                console.error('Revocation error:', result.error);
                // Keep the form open so user can see the error and try again
                setError(result.error || 'Failed to revoke approval. Please try again.');
                // Don't close the form on error - let user see the error message
            } else {
                console.log('Revocation successful:', result.data);
                // Clear the form
                setRevokeReason('');
                setShowRevokeConfirm(false);
                // Refresh the details to show updated status
                await fetchDetails();
                // Close the modal and refresh the parent list
                onClose();
            }
        } catch (err) {
            console.error('Revocation exception:', err);
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

    const handleRequestReupload = async (documentType: DocumentType) => {
        if (!user?.id || !reuploadReason.trim()) return;

        setActionLoading(`reupload-${documentType}`);
        try {
            const result = await managerVerificationService.requestDocumentReupload(
                managerId,
                user.id,
                documentType,
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
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-lg">
                        <Loader2 className="animate-spin text-white" size={28} />
                    </div>
                    <p className="text-gray-600 font-medium">Loading verification details...</p>
                </div>
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
    const isBroker = profile.profile_type === 'broker';
    const statusConfig = getStatusConfig(profile.verification_status);

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
                            <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${isBroker
                                ? 'bg-gradient-to-br from-orange-400 to-red-500'
                                : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                }`}>
                                {isBroker ? (
                                    <User className="text-white" size={28} />
                                ) : (
                                    <Building2 className="text-white" size={28} />
                                )}
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
                    <div className="grid grid-cols-2 gap-4">
                        {isBroker ? (
                            <>
                                <InfoItem icon={Hash} label="License Number" value={profile.license_number} />
                                <InfoItem icon={Calendar} label="License Expiry" value={profile.license_expiry_date} />
                                <InfoItem icon={Shield} label="Association ID" value={profile.association_membership_id} />
                            </>
                        ) : (
                            <>
                                <InfoItem icon={Hash} label="Registration Number" value={profile.company_registration_number} />
                                <InfoItem icon={Hash} label="Tax ID" value={profile.tax_id} />
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
                            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <Sparkles className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-sm text-gray-500">No documents uploaded yet</p>
                            </div>
                        ) : (
                            documents.map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    onRequestReupload={() => setShowReuploadForm(doc.document_type)}
                                    showReuploadForm={showReuploadForm === doc.document_type}
                                    reuploadReason={reuploadReason}
                                    setReuploadReason={setReuploadReason}
                                    onSubmitReupload={() => handleRequestReupload(doc.document_type)}
                                    onCancelReupload={() => {
                                        setShowReuploadForm(null);
                                        setReuploadReason('');
                                    }}
                                    actionLoading={actionLoading === `reupload-${doc.document_type}`}
                                    disabled={profile.verification_status === 'approved'}
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
                                {auditLog.length}
                            </span>
                        </span>
                        {showAuditLog ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {showAuditLog && (
                        <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                            {auditLog.length === 0 ? (
                                <p className="text-sm text-gray-500 italic py-2">No activity recorded</p>
                            ) : (
                                <div className="space-y-3">
                                    {auditLog.map((entry) => (
                                        <div key={entry.id} className="flex gap-3 text-sm">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{formatActionType(entry.action_type)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                    {entry.actor_role && ` • ${entry.actor_role}`}
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
                {profile.verification_status === 'approved' ? (
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
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    rows={3}
                                    autoFocus
                                />
                                {!revokeReason.trim() && (
                                    <p className="text-xs text-gray-500 mt-1">Please provide a reason for revocation</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRevokeApproval}
                                    disabled={!revokeReason.trim() || actionLoading === 'revoke'}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
                                >
                                    {actionLoading === 'revoke' && <Loader2 className="animate-spin" size={16} />}
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
                                    console.log('Revoke button clicked');
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
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Explain why this verification is being rejected..."
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || actionLoading === 'reject'}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
                            >
                                {actionLoading === 'reject' && <Loader2 className="animate-spin" size={16} />}
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
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading === 'approve'}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {actionLoading === 'approve' && <Loader2 className="animate-spin" size={16} />}
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
                            disabled={documents.length === 0}
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
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Premium Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal with slide-up animation */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                {children}
            </div>
        </div>
    );
};

// ============================================================================
// Info Item Component
// ============================================================================

const InfoItem: React.FC<{
    icon: LucideIcon;
    label: string;
    value?: string | null;
}> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
        <div className="p-2 bg-gray-100 rounded-lg">
            <Icon size={14} className="text-gray-600" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900 truncate">
                {value || <span className="text-gray-400 italic font-normal">Not provided</span>}
            </p>
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
}) => {
        const docStatusConfig = getDocStatusConfig(document.verification_status);

        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${docStatusConfig.bgColor}`}>
                            <FileText className={docStatusConfig.textColor} size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                                {managerVerificationService.getDocumentTypeName(document.document_type)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {document.document_name || 'Document uploaded'}
                                {document.expiry_date && ` • Expires: ${new Date(document.expiry_date).toLocaleDateString()}`}
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

                {document.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        <strong>Rejection reason:</strong> {document.rejection_reason}
                    </div>
                )}

                {showReuploadForm ? (
                    <div className="mt-4 space-y-3">
                        <textarea
                            value={reuploadReason}
                            onChange={(e) => setReuploadReason(e.target.value)}
                            placeholder="Explain what's wrong with this document..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none transition-all"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={onSubmitReupload}
                                disabled={!reuploadReason.trim() || actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                {actionLoading && <Loader2 className="animate-spin" size={12} />}
                                Request Re-upload
                            </button>
                            <button
                                onClick={onCancelReupload}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex items-center gap-2">
                        <a
                            href={document.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                            <Eye size={12} />
                            View
                        </a>
                        <a
                            href={document.document_url}
                            download
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                            <Download size={12} />
                            Download
                        </a>
                        {!disabled && document.verification_status !== 'rejected' && document.verification_status !== 'reupload_required' && (
                            <button
                                onClick={onRequestReupload}
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
            return {
                label: 'Pending',
                icon: Clock,
                bgColor: 'bg-amber-100',
                textColor: 'text-amber-700',
                dotColor: 'bg-amber-500',
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
    return map[actionType] || actionType;
};

export default ManagerReviewModal;
