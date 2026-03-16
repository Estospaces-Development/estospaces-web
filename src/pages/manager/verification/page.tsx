"use client";

import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Building2, User, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ManagerDocumentType, ManagerProfileType } from '@/services/managerVerificationService';
import { getManagerDocumentTypeName } from '@/services/managerVerificationService';

export default function VerificationPage() {
    const { user } = useAuth();
    const { 
        managerProfile, 
        verificationStatus, 
        isLoading, 
        submitForVerification, 
        requiredDocuments,
        documents,
        missingDocuments,
        isVerified,
        createProfile,
        getDocumentStatus,
        uploadDocument
    } = useManagerVerification();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRoleForProfile, setSelectedRoleForProfile] = useState<ManagerProfileType>('broker');

    // Restore missing functions
    const handleInitialRegistration = async () => {
        setIsSubmitting(true);
        try {
            await createProfile(selectedRoleForProfile);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitForReview = async () => {
        setIsSubmitting(true);
        try {
            await submitForVerification();
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

    const getStatusColor = (status: string | null) => {
        if (!status) return 'bg-gray-400';
        switch (status) {
            case 'approved': return 'bg-green-500';
            case 'rejected': return 'bg-red-500';
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
            case 'submitted':
            case 'under_review': return 'Under Review';
            case 'incomplete': return 'In-Progress';
            default: return 'Verification Required';
        }
    };

    const handleDocumentUpload = async (docType: ManagerDocumentType, file: File) => {
        setIsSubmitting(true);
        try {
            await uploadDocument(file, docType);
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
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Shield className="w-10 h-10 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Manager Verification</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Choose your profile type to begin the verification process</p>
                </div>

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

            {/* Main Verification Card */}
            <div className="bg-white dark:bg-[#0c0c0c] rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 dark:border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 rounded-full blur-[80px] -ml-40 -mb-40 pointer-events-none"></div>

                <div className="relative z-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {steps.length > 0 ? steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`relative p-8 rounded-3xl border transition-all duration-500 group overflow-hidden ${
                                step.status === 'approved' 
                                ? 'bg-green-50/30 dark:bg-green-500/5 border-green-100 dark:border-green-900/30 shadow-sm' 
                                : step.status === 'rejected'
                                ? 'bg-red-50/30 dark:bg-red-500/5 border-red-100 dark:border-red-900/30 shadow-sm'
                                : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:border-orange-500/30 hover:shadow-xl cursor-pointer'
                            }`}
                            onClick={() => {
                                if (step.status !== 'approved' && step.status !== 'pending' && !isSubmitting) {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*,.pdf';
                                    input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleDocumentUpload(step.id, file);
                                    };
                                    input.click();
                                }
                            }}
                        >
                            <div className="absolute top-6 right-6">
                                {step.status === 'approved' ? (
                                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                ) : step.status === 'pending' ? (
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center animate-pulse">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                ) : step.status === 'rejected' || step.status === 'reupload_required' ? (
                                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 font-black">
                                        0{index + 1}
                                    </div>
                                )}
                            </div>

                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 shadow-sm ${
                                step.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-900 dark:bg-gray-800 text-white dark:text-orange-500'
                            }`}>
                                {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <step.icon className="w-7 h-7" />}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{step.description}</p>
                            
                            {(step.status === 'rejected' || step.status === 'reupload_required') && (
                                <p className="mt-4 text-xs text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl">
                                    Needs Attention: Please click to re-upload.
                                </p>
                            )}

                            {step.status === 'not_uploaded' && (
                                <div className="mt-4 flex items-center gap-2 text-orange-500 text-xs font-bold uppercase tracking-wider">
                                    <Upload className="w-3 h-3" />
                                    Click to Upload
                                </div>
                            )}
                        </div>
                    )) : (
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

                    {!isVerified && (verificationStatus === 'incomplete' || verificationStatus === 'rejected') ? (
                        <button
                            onClick={handleSubmitForReview}
                            disabled={isSubmitting || missingDocuments.length > 0}
                            className="w-full sm:w-auto bg-gray-900 dark:bg-orange-500 hover:scale-105 active:scale-95 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-2.5 group"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                            {missingDocuments.length > 0 ? `Upload ${missingDocuments.length} more` : 'Submit for Final Review'}
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

// Icons
function TrendingUp(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

function Zap(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

