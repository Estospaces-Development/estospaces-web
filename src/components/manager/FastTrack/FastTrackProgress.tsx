import React from 'react';
import { FastTrackStep } from '../../../services/fastTrackService';
import { FileText, Home, Scale, CreditCard, CheckCircle2 } from 'lucide-react';

interface FastTrackProgressProps {
    currentStep: FastTrackStep;
}

const steps: { id: FastTrackStep; label: string; icon: React.ElementType }[] = [
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'owner_approval', label: 'Owner', icon: Home },
    { id: 'legal_check', label: 'Legal', icon: Scale },
    { id: 'payment_ready', label: 'Pay', icon: CreditCard },
    { id: 'completed', label: 'Ready', icon: CheckCircle2 },
];

const FastTrackProgress: React.FC<FastTrackProgressProps> = ({ currentStep }) => {
    const getCurrentStepIndex = () => {
        return steps.findIndex((s) => s.id === currentStep);
    };

    const currentIndex = getCurrentStepIndex();

    return (
        <div className="w-full relative mt-4 mb-6">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-zinc-800 -translate-y-1/2 rounded-full -z-10" />
            <div className="flex justify-between items-center w-full px-2">
                {steps.map((step, index) => {
                    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
                    if (index < currentIndex) status = 'completed';
                    else if (index === currentIndex) status = 'current';

                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                  ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${status === 'current' ? 'bg-orange-500 border-orange-500 text-white scale-110 shadow-lg ring-4 ring-orange-100 dark:ring-orange-900/30' : ''}
                  ${status === 'upcoming' ? 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600' : ''}
                `}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <span
                                className={`text-[10px] sm:text-xs mt-2 font-medium tracking-tight transition-colors duration-300 absolute -bottom-6
                  ${status === 'current' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}
                  ${status === 'completed' ? 'text-green-600 dark:text-green-500' : ''}
                  ${status === 'upcoming' ? 'text-gray-300 dark:text-gray-600' : ''}
                `}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="h-6" aria-hidden="true" />
        </div>
    );
};

export default FastTrackProgress;
