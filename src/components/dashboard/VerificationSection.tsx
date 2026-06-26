"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Shield,
    Upload,
    X,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    Info,
    Mail,
    Phone,
    CreditCard,
    MapPin,
    ArrowRight,
    Trash2,
} from 'lucide-react';
import {
    getMissingVerificationBundleFileKeys,
    shouldRequireFirstTimeVerificationBundle,
    USER_FIRST_TIME_VERIFICATION_REQUIREMENTS,
} from '@/lib/verificationUploadGate';
import { leadsService, type UserDocument } from '@/services/leadsService';

interface VerificationSectionProps {
    userId?: string;
    currentUser?: any;
}

type StepKey = 'email' | 'phone' | 'identity' | 'address';
type StepStatus = 'pending' | 'submitted' | 'verified' | 'reupload_required';
type UserVerificationDocumentStep = (typeof USER_FIRST_TIME_VERIFICATION_REQUIREMENTS)[number];

type StepState = {
    status: StepStatus;
};

const documentTypeByStep: Partial<Record<StepKey, string>> = {
    identity: 'identity',
    address: 'address',
};
const VERIFICATION_DOCUMENT_ACCEPT = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';
const firstTimeDocumentLabels: Record<UserVerificationDocumentStep, string> = {
    identity: 'Identity document',
    address: 'Proof of address',
};
const verificationDocumentGuidance: Record<UserVerificationDocumentStep, string> = {
    identity: 'Aadhaar, PAN, passport, voter ID, or driving licence',
    address: 'Recent utility bill, bank statement, rent agreement, property tax receipt, or government address document',
};

const mapDocumentStatus = (status?: string): StepStatus => {
    switch (status) {
        case 'approved':
            return 'verified';
        case 'rejected':
        case 'reupload_required':
            return 'reupload_required';
        case 'pending':
        case 'under_review':
            return 'submitted';
        default:
            return 'pending';
    }
};

const VerificationSection: React.FC<VerificationSectionProps> = ({ userId, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState<StepKey | null>(null);
    const [showFirstTimeUploadModal, setShowFirstTimeUploadModal] = useState(false);
    const [firstTimeUploadFiles, setFirstTimeUploadFiles] = useState<Partial<Record<UserVerificationDocumentStep, File | null>>>({});
    const [uploadingFile, setUploadingFile] = useState(false);
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
    const documentVaultRef = useRef<HTMLDivElement | null>(null);
    const [verificationSteps, setVerificationSteps] = useState<Record<StepKey, StepState>>({
        email: { status: 'pending' },
        phone: { status: 'pending' },
        identity: { status: 'pending' },
        address: { status: 'pending' },
    });

    useEffect(() => {
        setVerificationSteps((prev) => ({
            ...prev,
            email: { status: currentUser?.email ? 'verified' : 'pending' },
            phone: { status: currentUser?.phone ? 'verified' : 'pending' },
        }));
    }, [currentUser]);

    const syncDocuments = useCallback(async () => {
        if (!userId) return;

        const { data, error: documentsError } = await leadsService.getUserDocuments();
        if (documentsError) {
            setError(documentsError);
            return;
        }

        setDocuments(data);
        const identityDocument = data.find((document) => document.document_category === 'identity');
        const addressDocument = data.find((document) => document.document_category === 'address');

        setVerificationSteps((prev) => ({
            ...prev,
            identity: { status: mapDocumentStatus(identityDocument?.status) },
            address: { status: mapDocumentStatus(addressDocument?.status) },
        }));
    }, [userId]);

    useEffect(() => {
        syncDocuments();
    }, [syncDocuments]);

    const documentMetrics = useMemo(() => {
        const pending = documents.filter((document) => document.status === 'pending').length;
        const underReview = documents.filter((document) => document.status === 'under_review').length;
        const approved = documents.filter((document) => document.status === 'approved').length;

        return { pending, underReview, approved };
    }, [documents]);

    const completedSteps = Object.values(verificationSteps).filter(
        (step) => step.status === 'verified' || step.status === 'submitted',
    ).length;
    const totalSteps = Object.keys(verificationSteps).length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
    const needsFirstTimeDocumentBundle = useMemo(() => (
        shouldRequireFirstTimeVerificationBundle(documents, USER_FIRST_TIME_VERIFICATION_REQUIREMENTS)
    ), [documents]);

    const missingFirstTimeFiles = useMemo(() => (
        getMissingVerificationBundleFileKeys(firstTimeUploadFiles, USER_FIRST_TIME_VERIFICATION_REQUIREMENTS)
    ), [firstTimeUploadFiles]);

    const openDocumentUpload = (step: UserVerificationDocumentStep) => {
        setError(null);
        if (needsFirstTimeDocumentBundle) {
            setShowFirstTimeUploadModal(true);
            return;
        }

        setShowUploadModal(step);
    };

    const handleDocumentUpload = async (step: StepKey, file: File) => {
        if (!file || !userId) return;

        const uploadType = documentTypeByStep[step];
        if (!uploadType) return;

        setUploadingFile(true);
        setError(null);

        try {
            const { success: uploaded, error: uploadError } = await leadsService.uploadDocument(uploadType, file);
            if (!uploaded) {
                throw new Error(uploadError || 'Failed to submit document for review');
            }

            setVerificationSteps((prev) => ({
                ...prev,
                [step]: { status: 'submitted' },
            }));
            setSuccess(`Your ${step === 'identity' ? 'identity document' : 'proof of address'} has been submitted for review.`);
            setShowUploadModal(null);
            await syncDocuments();
            requestAnimationFrame(() => documentVaultRef.current?.focus());
        } catch (err: any) {
            setError(err.message || 'Failed to upload document. Please try again.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleFirstTimeDocumentBundleUpload = async () => {
        if (!userId) return;

        if (missingFirstTimeFiles.length > 0) {
            setError(`Add ${missingFirstTimeFiles.map((key) => firstTimeDocumentLabels[key]).join(' and ')} before submitting first-time verification.`);
            return;
        }

        setUploadingFile(true);
        setError(null);

        try {
            for (const step of USER_FIRST_TIME_VERIFICATION_REQUIREMENTS) {
                const uploadType = documentTypeByStep[step];
                const file = firstTimeUploadFiles[step];
                if (!uploadType || !file) {
                    continue;
                }

                const { success: uploaded, error: uploadError } = await leadsService.uploadDocument(uploadType, file);
                if (!uploaded) {
                    throw new Error(uploadError || `Failed to submit ${firstTimeDocumentLabels[step].toLowerCase()} for review`);
                }
            }

            setVerificationSteps((prev) => ({
                ...prev,
                identity: { status: 'submitted' },
                address: { status: 'submitted' },
            }));
            setSuccess('Your identity document and proof of address have been submitted for admin review.');
            setFirstTimeUploadFiles({});
            setShowFirstTimeUploadModal(false);
            await syncDocuments();
            requestAnimationFrame(() => documentVaultRef.current?.focus());
        } catch (err: any) {
            setError(err.message || 'Failed to upload documents. Please try again.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleDeleteDocument = async (document: UserDocument) => {
        if (document.status !== 'pending') {
            setError('Only pending documents can be deleted before review starts.');
            return;
        }

        setDeletingDocumentId(document.id);
        setError(null);
        const { success: deleted, error: deleteError } = await leadsService.deleteDocument(document.id);
        setDeletingDocumentId(null);
        if (!deleted) {
            setError(deleteError || 'Failed to delete document.');
            return;
        }

        setSuccess(`${document.file_name} was removed from your document vault.`);
        await syncDocuments();
        requestAnimationFrame(() => documentVaultRef.current?.focus());
    };

    const handleEmailVerification = async () => {
        if (!currentUser?.email) return;
        setLoading(true);
        try {
            const { success: sent, error: resendError } = await leadsService.resendVerification(currentUser.email);
            if (!sent) throw new Error(resendError || 'Failed to send verification email');
            setSuccess('Verification email sent. Please check your inbox.');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification email.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneVerification = () => {
        setSuccess('Please add your phone number in the Personal Information section above.');
    };

    const formatDocumentStatus = (status: string) => (
        status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    );

    const VerificationStep = ({
        step,
        title,
        description,
        icon: Icon,
        actionLabel,
        onAction,
    }: {
        step: StepKey;
        title: string;
        description: string;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        actionLabel: string;
        onAction?: () => void;
    }) => {
        const status = verificationSteps[step]?.status || 'pending';
        const isVerified = status === 'verified';
        const isSubmitted = status === 'submitted';
        const needsReupload = status === 'reupload_required';

        const containerClass = isVerified
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            : isSubmitted
                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                : needsReupload
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/30';

        const iconClass = isVerified
            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
            : isSubmitted
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : needsReupload
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500';

        const titleClass = isVerified
            ? 'text-green-800 dark:text-green-300'
            : isSubmitted
                ? 'text-blue-800 dark:text-blue-300'
                : needsReupload
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-gray-900 dark:text-white';

        const subtitleClass = isVerified
            ? 'text-green-700 dark:text-green-300'
            : isSubmitted
                ? 'text-blue-600 dark:text-blue-400'
                : needsReupload
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400';

        const subtitle = isVerified
            ? 'Verification complete'
            : isSubmitted
                ? 'Submitted for admin review'
                : needsReupload
                    ? 'A fresh document is required before approval'
                    : description;

        return (
            <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${containerClass}`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconClass}`}>
                    {isVerified ? <CheckCircle size={18} /> : isSubmitted ? <Clock size={18} /> : needsReupload ? <AlertCircle size={18} /> : <Icon size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className={`font-bold text-sm ${titleClass}`}>{title}</h3>
                            <p className={`text-xs mt-0.5 ${subtitleClass}`}>{subtitle}</p>
                        </div>

                        {!isVerified && !isSubmitted && onAction && (
                            <button
                                onClick={onAction}
                                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
                            >
                                {needsReupload ? 'Re-upload' : actionLabel}
                                <ArrowRight size={14} />
                            </button>
                        )}

                        {isVerified && (
                            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                <CheckCircle size={12} />
                                Verified
                            </span>
                        )}

                        {isSubmitted && (
                            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                                <Clock size={12} />
                                Under Review
                            </span>
                        )}

                        {needsReupload && (
                            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                                <AlertCircle size={12} />
                                Action Needed
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border dark:border-gray-700">
            <div className="px-6 py-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm">
                            <Shield size={24} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account verification</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Gain trust and unlock premium features</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-orange-500">{completionPercentage}%</div>
                        <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Trust Score</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border dark:border-gray-700 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {success && (
                <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
                    <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium flex-1">{success}</p>
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
                        <X size={18} />
                    </button>
                </div>
            )}

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="p-6 space-y-4">
                <VerificationStep
                    step="email"
                    title="Email"
                    description="Verify your ownership"
                    icon={Mail}
                    actionLabel={loading ? 'Sending...' : 'Verify'}
                    onAction={loading ? undefined : handleEmailVerification}
                />
                <VerificationStep
                    step="phone"
                    title="Phone Number"
                    description="Secure your account"
                    icon={Phone}
                    actionLabel="Add"
                    onAction={handlePhoneVerification}
                />
                <VerificationStep
                    step="identity"
                    title="Identity Document"
                    description={verificationDocumentGuidance.identity}
                    icon={CreditCard}
                    actionLabel="Upload"
                    onAction={() => openDocumentUpload('identity')}
                />
                <VerificationStep
                    step="address"
                    title="Proof of Address"
                    description="Bank statement or utility bill"
                    icon={MapPin}
                    actionLabel="Upload"
                    onAction={() => openDocumentUpload('address')}
                />
            </div>

            <div
                id="document-vault"
                ref={documentVaultRef}
                tabIndex={-1}
                className="border-t border-gray-100 p-6 outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700"
            >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Document vault</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Pending files can be removed before review starts.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{documentMetrics.pending} pending</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{documentMetrics.underReview} review</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{documentMetrics.approved} approved</span>
                    </div>
                </div>

                {documents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                        No documents are stored yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((document) => {
                            const canDelete = document.status === 'pending';
                            const isDeleting = deletingDocumentId === document.id;

                            return (
                                <div
                                    key={document.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{document.file_name}</p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {formatDocumentStatus(document.document_category)} - {formatDocumentStatus(document.status)}
                                        </p>
                                        {document.reject_reason && (
                                            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                                {document.reject_reason}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteDocument(document)}
                                        disabled={!canDelete || isDeleting || Boolean(deletingDocumentId)}
                                        aria-label={`Delete ${document.file_name}`}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                                    >
                                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        Delete
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {showUploadModal === 'identity' ? 'Identity Verification' : 'Address Verification'}
                            </h3>
                            <button onClick={() => setShowUploadModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <label className="block border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl p-10 text-center hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    id={`${showUploadModal}-verification-document-upload`}
                                    name={`${showUploadModal}-verification-document`}
                                    aria-label={`Upload ${showUploadModal === 'identity' ? 'identity document' : 'proof of address'}`}
                                    className="sr-only"
                                    accept={VERIFICATION_DOCUMENT_ACCEPT}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleDocumentUpload(showUploadModal, file);
                                    }}
                                />
                                <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    {uploadingFile ? <Loader2 className="animate-spin text-orange-500" /> : <Upload className="text-orange-500" />}
                                </div>
                                <p className="font-bold text-gray-900 dark:text-white">Choose a file</p>
                                <p className="text-sm text-gray-500 mt-1">or drag and drop it here</p>
                                <p className="mx-auto mt-3 max-w-[26rem] text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    {showUploadModal === 'identity'
                                        ? `${verificationDocumentGuidance.identity}.`
                                        : `${verificationDocumentGuidance.address}.`}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-4">PDF, PNG, JPG (Max 10MB)</p>
                            </label>

                            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                <Info size={18} className="text-blue-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">What happens next?</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Your upload is submitted into the verification queue. Admin approval is still required before the step becomes verified.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFirstTimeUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">First-time verification</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload identity and address proof together for admin review.</p>
                            </div>
                            <button onClick={() => setShowFirstTimeUploadModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl" aria-label="Close first-time verification upload">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {USER_FIRST_TIME_VERIFICATION_REQUIREMENTS.map((step) => (
                                <label
                                    key={step}
                                    className="block rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900/40"
                                >
                                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{firstTimeDocumentLabels[step]}</span>
                                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                        {firstTimeUploadFiles[step]?.name || 'PDF, PNG or JPG'}
                                    </span>
                                    <span className="mt-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                                        {verificationDocumentGuidance[step]}.
                                    </span>
                                    <input
                                        type="file"
                                        name={`first-time-${step}-verification-document`}
                                        aria-label={`Upload ${firstTimeDocumentLabels[step].toLowerCase()}`}
                                        className="mt-3 block w-full text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-orange-700 hover:file:bg-orange-100 dark:text-gray-300 dark:file:bg-orange-900/30 dark:file:text-orange-300"
                                        accept={VERIFICATION_DOCUMENT_ACCEPT}
                                        disabled={uploadingFile}
                                        onChange={(event) => {
                                            const file = event.currentTarget.files?.[0] || null;
                                            setFirstTimeUploadFiles((prev) => ({ ...prev, [step]: file }));
                                        }}
                                    />
                                </label>
                            ))}

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowFirstTimeUploadModal(false)}
                                    disabled={uploadingFile}
                                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleFirstTimeDocumentBundleUpload()}
                                    disabled={uploadingFile || missingFirstTimeFiles.length > 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    Submit both documents
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificationSection;
