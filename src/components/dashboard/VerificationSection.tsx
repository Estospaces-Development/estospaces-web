"use client";

import React, { useState, useEffect } from 'react';
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
    Building,
    ArrowRight
} from 'lucide-react';
import { useNotifications, NOTIFICATION_TYPES } from '@/contexts/NotificationsContext';

interface VerificationSectionProps {
    userId?: string;
    currentUser?: any;
}

const VerificationSection: React.FC<VerificationSectionProps> = ({ userId, currentUser }) => {
    const notifications = useNotifications();
    const createNotification = notifications?.createNotification;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [verificationSteps, setVerificationSteps] = useState({
        email: { completed: false, status: 'pending' },
        phone: { completed: false, status: 'pending' },
        identity: { completed: false, status: 'pending' },
        address: { completed: false, status: 'pending' },
    });

    useEffect(() => {
        if (currentUser) {
            setVerificationSteps(prev => ({
                ...prev,
                email: {
                    completed: !!currentUser.email,
                    status: currentUser.email ? 'verified' : 'pending'
                },
                phone: {
                    completed: !!currentUser.phone,
                    status: currentUser.phone ? 'verified' : 'pending'
                }
            }));
        }
    }, [currentUser]);

    const completedSteps = Object.values(verificationSteps).filter(step => step.completed).length;
    const totalSteps = Object.keys(verificationSteps).length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

    const handleDocumentUpload = async (type: string, file: File) => {
        if (!file || !userId) return;

        setUploadingFile(true);
        setError(null);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            setVerificationSteps(prev => ({
                ...prev,
                [type]: { completed: true, status: 'verified' }
            }));

            if (createNotification) {
                await createNotification(
                    NOTIFICATION_TYPES.DOCUMENT_VERIFIED,
                    '✅ Document Verified',
                    `Your ${type === 'identity' ? 'identity document' : 'proof of address'} has been verified successfully.`,
                    { verification_type: type }
                );
            }

            setSuccess(`Your ${type === 'identity' ? 'identity document' : 'proof of address'} has been verified!`);
            setShowUploadModal(null);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload document. Please try again.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleEmailVerification = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            setSuccess('Verification email sent! Please check your inbox.');
        } catch (err) {
            setError('Failed to send verification email.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneVerification = () => {
        setSuccess('Please add your phone number in the Personal Information section above.');
    };

    const VerificationStep = ({ step, title, description, icon: Icon, actionLabel, onAction }: any) => {
        const stepData = (verificationSteps as any)[step];
        const isCompleted = stepData?.completed;

        return (
            <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${isCompleted
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/30'
                }`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isCompleted
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}>
                    {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h4 className={`font-bold text-sm ${isCompleted ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                {title}
                            </h4>
                            <p className={`text-xs mt-0.5 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {isCompleted ? 'Verified Character' : description}
                            </p>
                        </div>

                        {!isCompleted && onAction && (
                            <button
                                onClick={onAction}
                                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
                            >
                                {actionLabel}
                                <ArrowRight size={14} />
                            </button>
                        )}

                        {isCompleted && (
                            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                <CheckCircle size={12} />
                                Verified
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
                    actionLabel="Verify"
                    onAction={handleEmailVerification}
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
                    description="Government issued Passport/ID"
                    icon={CreditCard}
                    actionLabel="Upload"
                    onAction={() => setShowUploadModal('identity')}
                />
                <VerificationStep
                    step="address"
                    title="Proof of Address"
                    description="Bank statement/Utility bill"
                    icon={MapPin}
                    actionLabel="Upload"
                    onAction={() => setShowUploadModal('address')}
                />
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
                            <label className="block border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-10 text-center hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
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
                                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-4">PDF, PNG, JPG (Max 10MB)</p>
                            </label>

                            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                <Info size={18} className="text-blue-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Why verify?</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Verified users are 3x more likely to be accepted by landlords and gaining access to premium listings.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificationSection;
