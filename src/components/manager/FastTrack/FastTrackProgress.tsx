import React from 'react';
import { FastTrackStep } from '../../../services/fastTrackService';
import { BadgeCheck, CalendarCheck2, CalendarClock, FileSearch, FileSignature, FileText, Home, ShieldCheck } from 'lucide-react';
import { CanonicalFastTrackStep, getFastTrackStepIndex } from '@/lib/fastTrackWorkflow';

interface FastTrackProgressProps {
    currentStep: FastTrackStep;
    journeyType?: 'rent' | 'buy';
    compact?: boolean;
}

const FastTrackProgress: React.FC<FastTrackProgressProps> = ({ currentStep, journeyType, compact = false }) => {
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

    const getDisplayLabel = (stepId: CanonicalFastTrackStep, label: string) => {
        if (!compact) {
            return label;
        }

        switch (stepId) {
            case 'property_selected':
                return 'Prop';
            case 'documents_requested':
                return 'Docs';
            case 'documents_verified':
                return 'Verify';
            case 'viewing_scheduled':
                return 'View';
            case 'viewing_completed':
                return 'Visit';
            case 'application_in_review':
                return journeyType === 'buy' ? 'Offer' : 'Check';
            case 'ready_for_contract':
                return journeyType === 'buy' ? 'Legal' : 'Lease';
            default:
                return label;
        }
    };

    return (
        <div className="relative mb-2 mt-4 w-full">
            <div className="absolute top-4 left-0 -z-10 h-[2px] w-full bg-gray-100 dark:bg-zinc-800" />
            <div className="grid w-full grid-cols-8 items-start justify-items-center gap-1 px-1 sm:px-2">
                {steps.map((step, index) => {
                    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
                    if (index < currentIndex) status = 'completed';
                    else if (index === currentIndex) status = 'current';

                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="relative flex w-full min-w-0 flex-col items-center text-center">
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
                                className={`mt-2 w-full ${
                                    compact
                                        ? 'block overflow-hidden text-ellipsis whitespace-nowrap px-0 text-[8px] font-semibold leading-tight tracking-normal sm:text-[9px]'
                                        : 'break-words px-0.5 text-[9px] font-medium leading-tight tracking-tight sm:text-xs'
                                } transition-colors duration-300
                  ${status === 'current' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}
                  ${status === 'completed' ? 'text-green-600 dark:text-green-500' : ''}
                  ${status === 'upcoming' ? 'text-gray-300 dark:text-gray-600' : ''}
                `}
                            >
                                {getDisplayLabel(step.id, step.label)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FastTrackProgress;
