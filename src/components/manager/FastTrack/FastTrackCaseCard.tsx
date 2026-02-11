import React, { useState, useEffect } from 'react';
import { FastTrackCase, FastTrackStep, FastTrackDocuments as IFastTrackDocuments } from '../../../mocks/fastTrackCases';
import FastTrackProgress from './FastTrackProgress';
import FastTrackDocuments from './FastTrackDocuments';
import FastTrackActions from './FastTrackActions';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface FastTrackCaseCardProps {
    caseData: FastTrackCase;
    onUpdate: (updatedCase: FastTrackCase) => void;
}

const FastTrackCaseCard: React.FC<FastTrackCaseCardProps> = ({ caseData, onUpdate }) => {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);
    const [isExpired, setIsExpired] = useState(caseData.finalStatus === 'expired');

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (caseData.finalStatus === 'completed') {
                setTimeLeft(null);
                return;
            }

            const submitTime = new Date(caseData.submittedAt).getTime();
            const targetTime = submitTime + 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            const diff = targetTime - now;

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0 });
                setIsExpired(true);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft({ hours, minutes });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(timer);
    }, [caseData.submittedAt, caseData.finalStatus]);

    const handleVerifyDoc = (docType: keyof IFastTrackDocuments) => {
        const updatedDocs = { ...caseData.documents, [docType]: 'verified' as const };
        const updatedCase = { ...caseData, documents: updatedDocs };
        onUpdate(updatedCase);
    };

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
        ${isExpired ? 'border-red-200 dark:border-red-900/50 opacity-90' : 'border-gray-200 dark:border-zinc-800'}
    `}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getTypeColor(caseData.propertyType)}`}>
                            {caseData.propertyType}
                        </span>
                        {isAtRisk && !isExpired && caseData.finalStatus !== 'completed' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> At Risk
                            </span>
                        )}
                        {isExpired && caseData.finalStatus !== 'completed' && (
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

            {caseData.currentStep === 'documents' && caseData.finalStatus !== 'completed' && !isExpired && (
                <FastTrackDocuments
                    documents={caseData.documents}
                    onVerify={handleVerifyDoc}
                    isReadOnly={isExpired}
                />
            )}

            <div className="mt-auto">
                <FastTrackActions
                    currentStep={caseData.currentStep}
                    onAdvance={handleAdvanceStep}
                    isDocumentsVerified={isDocsVerified}
                    isReadOnly={isExpired && caseData.finalStatus !== 'completed'}
                />
            </div>
        </div>
    );
};

export default FastTrackCaseCard;
