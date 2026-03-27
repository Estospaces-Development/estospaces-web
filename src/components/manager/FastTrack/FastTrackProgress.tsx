import React from 'react';
import { FastTrackStep } from '../../../services/fastTrackService';
import { BadgeCheck, CalendarCheck2, CalendarClock, FileSearch, FileSignature, FileText, Home, ShieldCheck } from 'lucide-react';
import { CanonicalFastTrackStep, getFastTrackStepIndex } from '@/lib/fastTrackWorkflow';

interface FastTrackProgressProps {
    currentStep: FastTrackStep;
    journeyType?: 'rent' | 'buy';
}

const FastTrackProgress: React.FC<FastTrackProgressProps> = ({ currentStep, journeyType }) => {
    const currentIndex = getFastTrackStepIndex(currentStep);
    const steps: { id: CanonicalFastTrackStep; label: string; icon: React.ElementType }[] = [
        { id: 'property_selected', label: 'Property', icon: Home },
        { id: 'documents_requested', label: 'Docs', icon: FileText },
        { id: 'documents_verified', label: 'Verified', icon: ShieldCheck },
        { id: 'viewing_scheduled', label: 'Viewing', icon: CalendarClock },
        { id: 'viewing_completed', label: 'Visited', icon: CalendarCheck2 },
        {
            id: 'application_in_review',
            label: journeyType === 'buy' ? 'Offer' : 'Checks',
            icon: FileSearch,
        },
        {
            id: 'ready_for_contract',
            label: journeyType === 'buy' ? 'Legal' : 'Tenancy',
            icon: FileSignature,
        },
        { id: 'completed', label: 'Done', icon: BadgeCheck },
    ];

    return (
        <div className="w-full relative mt-4 mb-2">
            <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-100 dark:bg-zinc-800 -z-10" />
            <div className="flex justify-between items-start w-full px-2">
                {steps.map((step, index) => {
                    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
                    if (index < currentIndex) status = 'completed';
                    else if (index === currentIndex) status = 'current';

                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center relative">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                  ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${status === 'current' ? 'bg-orange-500 border-orange-500 text-white scale-110 shadow-lg ring-4 ring-orange-100 dark:ring-orange-900/30' : ''}
                  ${status === 'upcoming' ? 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600' : ''}
                `}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <span
                                className={`text-[10px] sm:text-xs mt-2 font-medium tracking-tight transition-colors duration-300
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
        </div>
    );
};

export default FastTrackProgress;
