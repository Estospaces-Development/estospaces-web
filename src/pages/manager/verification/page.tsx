"use client";

import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Building2, User } from 'lucide-react';
import VerificationModal from '@/components/ui/VerificationModal';
import { useState } from 'react';

export default function VerificationPage() {
    const { user } = useAuth();
    const { verificationStatus, isLoading, submitForVerification, missingDocuments, isVerified } = useManagerVerification();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const steps = [
        {
            id: 'identity',
            title: 'Identity Verification',
            description: 'Upload valid government ID (Passport, Driving License)',
            icon: User,
            status: !missingDocuments.includes('government_id' as any) ? 'completed' : 'pending'
        },
        {
            id: 'company',
            title: 'Company Details',
            description: 'Provide registration number and business address',
            icon: Building2,
            status: !missingDocuments.includes('company_registration' as any) ? 'completed' : 'pending'
        },
        {
            id: 'license',
            title: 'Professional License',
            description: 'Upload your real estate license or certification',
            icon: FileText,
            status: !missingDocuments.includes('trading_license' as any) ? 'completed' : 'pending'
        }
    ];

    const getStatusColor = (status: string | null) => {
        if (!status) return 'bg-gray-300 dark:bg-gray-700';
        switch (status) {
            case 'approved': return 'bg-green-500';
            case 'rejected': return 'bg-red-500';
            case 'submitted':
            case 'under_review': return 'bg-yellow-500';
            default: return 'bg-gray-300 dark:bg-gray-700';
        }
    };

    const getStatusText = (status: string | null) => {
        if (!status) return 'Verification Required';
        switch (status) {
            case 'approved': return 'Verified & Approved';
            case 'rejected': return 'Verification Failed';
            case 'submitted':
            case 'under_review': return 'Under Review';
            default: return 'Verification Required';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Verification</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Complete these steps to unlock full platform access</p>
                </div>
                <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-white font-medium shadow-lg ${getStatusColor(verificationStatus)}`}>
                    <Shield className="w-5 h-5" />
                    <span>{getStatusText(verificationStatus)}</span>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-black rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`relative p-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-md group`}
                        >
                            <div className="absolute top-4 right-4">
                                {step.status === 'completed' ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400 font-medium">
                                        {index + 1}
                                    </div>
                                )}
                            </div>

                            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                                <step.icon className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800">
                    {!isVerified && (verificationStatus === null || verificationStatus === 'rejected' || verificationStatus === 'incomplete') ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                        >
                            <Upload className="w-5 h-5" />
                            Submit Documents
                        </button>
                    ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Verification status last updated: {new Date().toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Why Verify Section */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Build Trust</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Verified managers receive 3x more inquiries from potential tenants.</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 p-6 rounded-xl border border-purple-100 dark:border-purple-800">
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Premium Badge</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Get a distinctive verified badge on your profile and listings.</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-orange-900/10 p-6 rounded-xl border border-orange-100 dark:border-orange-800">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Fast Track Access</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Unlock 24h fast-track processing for all your property listings.</p>
                </div>
            </div>

            <VerificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onVerified={() => {
                    submitForVerification();
                    setIsModalOpen(false);
                }}
                email={user?.email || ''}
            />
        </div>
    );
}

function Clock({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
