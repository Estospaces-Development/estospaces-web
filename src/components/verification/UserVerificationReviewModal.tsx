"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    Mail,
    MapPin,
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

interface UserVerificationReviewModalProps {
    scope: VerificationScope;
    userId: string;
    onClose: () => void;
}

const getLatestDocumentsByCategory = (documents: UserDocument[]) => {
    const latest = new Map<string, UserDocument>();
    for (const document of documents) {
        if (!latest.has(document.document_category)) {
            latest.set(document.document_category, document);
        }
    }
    return latest;
};

const UserVerificationReviewModal: React.FC<UserVerificationReviewModalProps> = ({ scope, userId, onClose }) => {
    const isAdmin = scope === 'admin';
    const [details, setDetails] = useState<UserVerificationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [notes, setNotes] = useState('');

    const fetchDetails = useCallback(async () => {
        setLoading(true);
        const { data, error: loadError } = await getUserVerificationDetails(scope, userId);
        setDetails(data);
        setError(loadError);
        setLoading(false);
    }, [scope, userId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const latestDocuments = useMemo(
        () => getLatestDocumentsByCategory(details?.documents || []),
        [details?.documents],
    );

    const canApprove = latestDocuments.has('identity') && latestDocuments.has('address');

    const handleDocumentReview = async (
        documentId: string,
        status: 'approved' | 'reupload_required',
        rejectReason?: string,
    ) => {
        setActionLoading(true);
        const { error: reviewError } = await reviewUserDocument(scope, documentId, status, rejectReason);
        setActionLoading(false);

        if (reviewError) {
            setError(reviewError);
            return;
        }

        await fetchDetails();
    };

    const handleVerificationUpdate = async (status: 'verified' | 'rejected') => {
        setActionLoading(true);
        const { error: updateError } = await updateUserVerification(scope, userId, status, notes);
        setActionLoading(false);

        if (updateError) {
            setError(updateError);
            return;
        }

        onClose();
    };

    if (loading) {
        return (
            <ModalWrapper onClose={onClose}>
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className={`animate-spin ${isAdmin ? 'text-orange-500' : 'text-blue-500'}`} size={40} />
                    <p className="text-gray-600 mt-4 font-medium">Loading user details...</p>
                </div>
            </ModalWrapper>
        );
    }

    if (error || !details) {
        return (
            <ModalWrapper onClose={onClose}>
                <div className="text-center py-16">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
                    <p className="text-gray-600">{error || 'Failed to load user details'}</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-xl font-medium">
                        Close
                    </button>
                </div>
            </ModalWrapper>
        );
    }

    const levelConfig = getVerificationLevelColor(details.user.verification_level);
    const levelLabel = getVerificationLevelLabel(details.user.verification_level);

    return (
        <ModalWrapper onClose={onClose}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white ${isAdmin ? 'bg-gradient-to-br from-orange-500 to-amber-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {details.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{details.user.full_name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${levelConfig.bg} ${levelConfig.text}`}>
                                {levelLabel}
                            </span>
                            <span className="text-sm text-gray-500">{details.user.email}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">User Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={Mail} label="Email" value={details.user.email} />
                        <InfoItem icon={Phone} label="Phone" value={details.user.phone} />
                        <InfoItem icon={MapPin} label="Address" value={details.user.address ? `${details.user.address}, ${details.user.postcode || ''}`.trim() : 'Not provided'} />
                        <InfoItem icon={Clock} label="Lead Count" value={String(details.user.lead_count)} />
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Verification Documents</h3>
                    <div className="space-y-3">
                        {details.documents.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200">
                                <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-sm text-gray-500">No documents uploaded</p>
                            </div>
                        ) : (
                            details.documents.map((document) => (
                                <DocumentReviewCard
                                    key={document.id}
                                    document={document}
                                    onApprove={() => handleDocumentReview(document.id, 'approved')}
                                    onRequestChanges={(reason) => handleDocumentReview(document.id, 'reupload_required', reason)}
                                    loading={actionLoading}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verification Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder={isAdmin ? 'Add approval or revoke notes...' : 'Add review notes for this user...'}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                        rows={3}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                <button
                    onClick={() => handleVerificationUpdate('rejected')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Revoke
                </button>
                <button
                    onClick={() => handleVerificationUpdate('verified')}
                    disabled={actionLoading || !canApprove}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium disabled:opacity-50 transition-all ${isAdmin ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve Verification
                </button>
            </div>
        </ModalWrapper>
    );
};

const DocumentReviewCard: React.FC<{
    document: UserDocument;
    onApprove: () => void;
    onRequestChanges: (reason: string) => void;
    loading: boolean;
}> = ({ document, onApprove, onRequestChanges, loading }) => {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const config = (() => {
        switch (document.status) {
            case 'approved':
                return { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle };
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${config.bg}`}>
                        <StatusIcon className={config.text} size={18} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{document.file_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {document.document_category} • {new Date(document.created_at).toLocaleDateString()}
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
                {showRejectForm ? (
                    <div className="space-y-2">
                        <textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            placeholder="Reason for requesting a re-upload..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => onRequestChanges(rejectReason)}
                                disabled={loading || !rejectReason.trim()}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setShowRejectForm(false)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        {canEdit && (
                            <>
                                <button
                                    onClick={onApprove}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                    <Check size={12} /> Approve
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 flex items-center gap-1"
                                >
                                    <X size={12} /> Request Changes
                                </button>
                            </>
                        )}
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1 ml-auto"
                        >
                            <FileText size={12} /> View
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ElementType; label: string; value?: string | null }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon size={14} className="text-gray-600 dark:text-gray-400" />
        </div>
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
                {value || <span className="text-gray-400 italic">Not provided</span>}
            </p>
        </div>
    </div>
);

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    useEffect(() => {
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
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                {children}
            </div>
        </div>
    );
};

export default UserVerificationReviewModal;
