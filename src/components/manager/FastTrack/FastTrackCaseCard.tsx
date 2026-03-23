import React, { useState, useEffect } from 'react';
import { FastTrackCase, FastTrackStep } from '../../../services/fastTrackService';
import FastTrackProgress from './FastTrackProgress';
import FastTrackDocuments from './FastTrackDocuments';
import FastTrackActions from './FastTrackActions';
import { Clock, AlertTriangle, AlertCircle, BadgeCheck, FileClock } from 'lucide-react';

interface FastTrackCaseCardProps {
    caseData: FastTrackCase;
    onUpdate: (updatedCase: FastTrackCase) => void;
    verificationSummary?: string;
    leadStatusLabel?: string;
}

const FastTrackCaseCard: React.FC<FastTrackCaseCardProps> = ({
    caseData,
    onUpdate,
    verificationSummary,
    leadStatusLabel,
}) => {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);
    const [countdownExpired, setCountdownExpired] = useState(caseData.finalStatus === 'expired');

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (caseData.finalStatus === 'completed' || caseData.finalStatus === 'rejected') {
                setTimeLeft(null);
                return;
            }

            const submitTime = new Date(caseData.submittedAt).getTime();
            const targetTime = submitTime + 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            const diff = targetTime - now;

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0 });
                setCountdownExpired(true);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft({ hours, minutes });
            setCountdownExpired(caseData.finalStatus === ('expired' as string));
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(timer);
    }, [caseData.submittedAt, caseData.finalStatus]);

    const handleAdvanceStep = () => {
        let nextStep: FastTrackStep = caseData.currentStep;
        let nextStatus = caseData.finalStatus;

        switch (caseData.currentStep) {
            case 'documents': nextStep = 'owner_approval'; break;
            case 'owner_approval': nextStep = 'legal_check'; break;
            case 'legal_check': nextStep = 'payment_ready'; break;
            case 'payment_ready':
                nextStep = 'completed';
                nextStatus = 'completed';
                break;
        }

        onUpdate({ ...caseData, currentStep: nextStep, finalStatus: nextStatus });
    };

    const isDocsVerified = Object.values(caseData.documents).every(status => status === 'verified');
    const isAtRisk = timeLeft ? timeLeft.hours < 6 : false;
    const isRejected = caseData.finalStatus === 'rejected';
    const isLocked = countdownExpired || isRejected;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'rent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'lease': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'buy': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    return (
        <div className={`bg-white dark:bg-black border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col h-full
        ${isLocked ? 'border-red-200 dark:border-red-900/50 opacity-90' : 'border-gray-100 dark:border-zinc-800'}
    `}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getTypeColor(caseData.propertyType)}`}>
                            {caseData.propertyType}
                        </span>
                        {isAtRisk && !isLocked && caseData.finalStatus !== 'completed' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> At Risk
                            </span>
                        )}
                        {isRejected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Rejected
                            </span>
                        )}
                        {countdownExpired && !isRejected && caseData.finalStatus !== 'completed' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Expired
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1" title={caseData.propertyTitle}>
                        {caseData.propertyTitle}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Client: {caseData.clientName}</p>
                </div>

                {timeLeft && (
                    <div className={`flex flex-col items-end ${isAtRisk ? 'text-orange-600' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1 font-mono font-bold text-lg leading-none">
                            <Clock className="w-4 h-4" />
                            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <span className="text-[10px] opacity-70">remains</span>
                    </div>
                )}
            </div>

            <FastTrackProgress currentStep={caseData.currentStep} />

            {(verificationSummary || leadStatusLabel) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {verificationSummary && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-gray-300">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                <BadgeCheck className="w-3.5 h-3.5" />
                                Verification
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{verificationSummary}</p>
                        </div>
                    )}
                    {leadStatusLabel && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-gray-300">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                <FileClock className="w-3.5 h-3.5" />
                                Lead status
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{leadStatusLabel}</p>
                        </div>
                    )}
                </div>
            )}

            {caseData.currentStep === 'documents' && caseData.finalStatus !== 'completed' && !isLocked && (
                <FastTrackDocuments
                    documents={caseData.documents}
                />
            )}

            <div className="mt-auto">
                <FastTrackActions
                    currentStep={caseData.currentStep}
                    onAdvance={handleAdvanceStep}
                    isDocumentsVerified={isDocsVerified}
                    isReadOnly={isLocked && caseData.finalStatus !== 'completed'}
                />
            </div>
        </div>
    );
};

export default FastTrackCaseCard;
