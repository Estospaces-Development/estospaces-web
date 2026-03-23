import { useNavigate } from 'react-router-dom';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Building2, User, Clock, ChevronRight, Loader2, RefreshCw, Eye, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ManagerDocumentType, ManagerProfileType } from '@/services/managerVerificationService';
import { getManagerDocumentTypeName } from '@/services/managerVerificationService';

export default function VerificationPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { 
        managerProfile, 
        verificationStatus, 
        isLoading, 
        error,
        refetch,
        submitForVerification, 
        requiredDocuments,
        documents,
        missingDocuments,
        isVerified,
        createProfile,
        getDocumentByType,
        getDocumentStatus,
        uploadDocument
    } = useManagerVerification();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRoleForProfile, setSelectedRoleForProfile] = useState<ManagerProfileType>('broker');
    const [actionError, setActionError] = useState<string | null>(null);
    const needsReverification = verificationStatus === 'rejected' || verificationStatus === 'verification_required';
    const canRequestReview = verificationStatus === 'incomplete'
        || verificationStatus === 'rejected'
        || verificationStatus === 'verification_required';

    const canUploadDocument = (status: string) => {
        if (isSubmitting) {
            return false;
        }

        if (needsReverification) {
            return true;
        }

        return status === 'not_uploaded' || status === 'rejected' || status === 'reupload_required';
    };

    // Restore missing functions
    const handleInitialRegistration = async () => {
        setIsSubmitting(true);
        try {
            const result = await createProfile(selectedRoleForProfile);
            setActionError(result.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitForReview = async () => {
        setIsSubmitting(true);
        try {
            const result = await submitForVerification();
            setActionError(result.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Map required documents to UI steps
    const steps = useMemo(() => {
        return requiredDocuments.map(docType => {
            const status = getDocumentStatus(docType);
            let icon = FileText;
            let description = `Please upload your ${getManagerDocumentTypeName(docType).toLowerCase()}`;

            if (docType === 'government_id' || docType === 'representative_id') {
                icon = User;
                description = "Valid government ID (Passport, Driving License)";
            } else if (docType === 'company_registration' || docType === 'business_license') {
                icon = Building2;
                description = "Official business registration documents";
            }

            return {
                id: docType,
                title: getManagerDocumentTypeName(docType),
                description,
                icon,
                status // 'not_uploaded' | 'pending' | 'approved' | 'rejected' | 'reupload_required'
            };
        });
    }, [requiredDocuments, getDocumentStatus]);

    const missingProfileFields = useMemo(() => {
        if (!managerProfile) {
            return [];
        }

        const missing: string[] = [];
        const companyName = (managerProfile.company_name || '').trim().toLowerCase();
        const licenseNumber = (managerProfile.company_registration_number || managerProfile.license_number || '').trim();

        if (!companyName || companyName === 'pending broker profile' || companyName === 'pending company profile') {
            missing.push('company name');
        }
        if (!(managerProfile.business_phone || '').trim()) {
            missing.push('business phone');
        }
        if (!(managerProfile.company_address || '').trim()) {
            missing.push('company address');
        }
        if (!licenseNumber) {
            missing.push(managerProfile.profile_type === 'company' ? 'company registration number' : 'broker license number');
        }

        return missing;
    }, [managerProfile]);

    const getStatusColor = (status: string | null) => {
        if (!status) return 'bg-gray-400';
        switch (status) {
            case 'approved': return 'bg-green-500';
            case 'rejected': return 'bg-red-500';
            case 'verification_required': return 'bg-amber-500';
            case 'submitted':
            case 'under_review': return 'bg-orange-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = (status: string | null) => {
        if (!status) return 'Verification Required';
        switch (status) {
            case 'approved': return 'Verified & Approved';
            case 'rejected': return 'Verification Failed';
            case 'verification_required': return 'Re-verification Required';
            case 'submitted':
            case 'under_review': return 'Under Review';
            case 'incomplete': return 'In-Progress';
            default: return 'Verification Required';
        }
    };

    const handleDocumentUpload = async (docType: ManagerDocumentType, file: File) => {
        setIsSubmitting(true);
        setActionError(null);
        try {
            const result = await uploadDocument(file, docType);
            if (result && result.error) {
                setActionError(result.error);
            } else {
                // Refresh to show the new document
                await refetch();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading verification status...</p>
            </div>
        );
    }

    if (!managerProfile) {
        if (error) {
            return (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
                    <div className="rounded-[2rem] border border-red-200 bg-red-50/80 p-8 text-center shadow-sm dark:border-red-900/30 dark:bg-red-900/10">
                        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Verification could not be loaded</h1>
                        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                        <button
                            onClick={() => void refetch()}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 dark:bg-orange-500"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Shield className="w-10 h-10 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Manager Verification</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Choose your profile type to begin the verification process</p>
                </div>

                {actionError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                        {actionError}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setSelectedRoleForProfile('broker')}
                        className={`p-8 rounded-3xl border-2 transition-all text-left group relative overflow-hidden ${
                            selectedRoleForProfile === 'broker' 
                            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/5 shadow-xl shadow-orange-500/10' 
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-100 dark:hover:border-gray-700'
                        }`}
                    >
                        {selectedRoleForProfile === 'broker' && (
                            <div className="absolute top-4 right-4 bg-orange-500 text-white rounded-full p-1 shadow-lg">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                            selectedRoleForProfile === 'broker' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                            <User className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Individual Broker</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            For independent real estate agents operating under their own name.
                        </p>
                    </button>

                    <button
                        onClick={() => setSelectedRoleForProfile('company')}
                        className={`p-8 rounded-3xl border-2 transition-all text-left group relative overflow-hidden ${
                            selectedRoleForProfile === 'company' 
                            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/5 shadow-xl shadow-orange-500/10' 
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-100 dark:hover:border-gray-700'
                        }`}
                    >
                        {selectedRoleForProfile === 'company' && (
                            <div className="absolute top-4 right-4 bg-orange-500 text-white rounded-full p-1 shadow-lg">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                            selectedRoleForProfile === 'company' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                            <Building2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Real Estate Company</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            For agencies and companies with multiple brokers or managers.
                        </p>
                    </button>
                </div>

                <div className="flex justify-center pt-8">
                    <button
                        onClick={handleInitialRegistration}
                        disabled={isSubmitting}
                        className="bg-gray-900 dark:bg-orange-500 hover:scale-105 active:scale-95 text-white px-12 py-4 rounded-2xl font-bold shadow-2xl transition-all disabled:opacity-50 flex items-center gap-3"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue to Verification"}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Manager Verification</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Verify your {managerProfile.profile_type} profile to unlock premium properties and features.
                    </p>
                </div>
                <div className={`px-5 py-2.5 rounded-3xl flex items-center gap-2.5 text-white font-bold shadow-xl transition-all duration-300 ${getStatusColor(verificationStatus)}`}>
                    <Shield className="w-5 h-5" />
                    <span>{getStatusText(verificationStatus)}</span>
                </div>
            </div>

            {actionError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {actionError}
                    </div>
                </div>
            )}

            {verificationStatus === 'rejected' && managerProfile.rejection_reason && (
                <div className="rounded-[2rem] border-2 border-red-200 bg-white dark:bg-red-900/5 p-8 shadow-xl shadow-red-500/5 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-start gap-5">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Verification Rejected</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                Your application was not approved for the following reason:
                            </p>
                            <div className="mt-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/30 text-red-700 dark:text-red-300 font-bold italic">
                                "{managerProfile.rejection_reason}"
                            </div>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Please address the issues above and update the required documents before resubmitting.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {missingProfileFields.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
                    Complete your professional profile before final review. Missing: {missingProfileFields.join(', ')}. You can update these details on the manager profile page.
                </div>
            )}

            {/* Main Verification Card */}
            <div className="bg-white dark:bg-[#0c0c0c] rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 dark:border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 rounded-full blur-[80px] -ml-40 -mb-40 pointer-events-none"></div>

                <div className="relative z-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {steps.length > 0 ? steps.map((step, index) => {
                        const isUploadEnabled = canUploadDocument(step.status);
                        const showReplacementHint = needsReverification
                            && step.status !== 'rejected'
                            && step.status !== 'reupload_required'
                            && isUploadEnabled;

                        const doc = getDocumentByType(step.id);
                        const hasDocument = !!doc;
                        const isRejected = step.status === 'rejected' || step.status === 'reupload_required';
                        const isImage = doc?.mime_type?.startsWith('image/') || 
                                       doc?.document_url?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);

                        return (
                        <div
                            key={`${step.id}-${doc?.id || 'empty'}`}
                            className={`relative p-8 rounded-3xl border transition-all duration-500 group overflow-hidden flex flex-col ${
                                step.status === 'approved' 
                                ? 'bg-green-50/30 dark:bg-green-500/5 border-green-100 dark:border-green-900/30 shadow-sm' 
                                : isRejected
                                ? 'bg-red-50/30 dark:bg-red-500/5 border-red-100 dark:border-red-900/30 shadow-sm'
                                : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50'
                            } ${isUploadEnabled ? 'hover:border-orange-500/30 hover:shadow-xl' : ''}`}
                        >
                            <div className="absolute top-6 right-6 z-20">
                                {step.status === 'approved' ? (
                                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                ) : step.status === 'pending' ? (
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center animate-pulse">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                ) : isRejected ? (
                                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 font-black">
                                        0{index + 1}
                                    </div>
                                )}
                            </div>

                            {/* Document Preview / Icon */}
                            <div className="relative mb-6">
                                {hasDocument && isImage ? (
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-md group-hover:scale-110 transition-transform duration-300">
                                        <img 
                                            src={doc.document_url} 
                                            alt={step.title} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // If image fails to load, fallback to icon
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100');
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm ${
                                        step.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-900 dark:bg-gray-800 text-white dark:text-orange-500'
                                    }`}>
                                        {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <step.icon className="w-7 h-7" />}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-2">{step.description}</p>
                            
                            {hasDocument && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded-lg w-fit">
                                    <FileText className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{doc.file_name || 'Document uploaded'}</span>
                                </div>
                            )}

                            <div className="mt-auto"></div>
                            
                            {isRejected && doc?.rejection_reason && (
                                <div className="mt-4 p-3 bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Reason for Rejection:</p>
                                    <p className="text-xs text-red-700 dark:text-red-300 font-bold italic">"{doc.rejection_reason}"</p>
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-2">
                                {isUploadEnabled && (
                                    <button
                                        disabled={isSubmitting}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*,.pdf';
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) handleDocumentUpload(step.id, file);
                                            };
                                            input.click();
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                            isRejected 
                                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20' 
                                            : 'bg-gray-900 dark:bg-orange-500 text-white hover:scale-105'
                                        }`}
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {hasDocument ? 'Replace File' : 'Upload File'}
                                    </button>
                                )}

                                {hasDocument && doc.document_url && (
                                    <a
                                        href={`${doc.document_url}${doc.document_url.includes('?') ? '&' : '?'}t=${new Date(doc.updated_at).getTime()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        View Current
                                    </a>
                                )}
                            </div>

                            {showReplacementHint && (
                                <p className="mt-4 text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                    You can update this even if it's already uploaded.
                                </p>
                            )}
                        </div>
                    )}) : (
                        <div className="col-span-full py-12 text-center">
                            <p className="text-gray-500 font-medium">No verification documents required for this profile type.</p>
                        </div>
                    )}
                </div>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500 font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Last updated: {new Date(managerProfile.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {!isVerified && canRequestReview ? (
                        <button
                            onClick={missingProfileFields.length > 0 ? () => navigate('/manager/profile') : handleSubmitForReview}
                            disabled={isSubmitting || (missingDocuments.length > 0 && missingProfileFields.length === 0)}
                            className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-bold shadow-2xl transition-all flex items-center justify-center gap-2.5 group ${
                                missingProfileFields.length > 0
                                ? 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 active:scale-95'
                                : 'bg-gray-900 dark:bg-orange-500 hover:scale-105 active:scale-95 text-white disabled:opacity-30 disabled:hover:scale-100'
                            }`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : missingProfileFields.length > 0 ? (
                                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            ) : (
                                <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            )}
                            
                            {missingProfileFields.length > 0
                                ? 'Complete profile details'
                                : missingDocuments.length > 0
                                    ? `Upload ${missingDocuments.length} more`
                                    : needsReverification
                                        ? 'Resubmit for Review'
                                        : 'Submit for Final Review'}
                            
                            {missingProfileFields.length > 0 && (
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isVerified ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {isVerified ? 'Your profile is fully verified' : 'We are currently reviewing your documents'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Why Verify Section - Premium Redesign */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="group bg-white dark:bg-gray-900/40 p-10 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">Maximize Visibility</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Verified managers receive priority placement and 3x more premium inquiries.</p>
                </div>
                
                <div className="group bg-white dark:bg-gray-900/40 p-10 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">Verified Badge</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Display a gold trust badge on all your listings to build instant client confidence.</p>
                </div>

                <div className="group bg-white dark:bg-gray-900/40 p-10 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">Fast Track Review</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Enjoy 24h express approval for all your property submissions and updates.</p>
                </div>
            </div>
        </div>
    );
}
