import React from 'react';
import {
    FileText,
    Search,
    FileCheck,
    UserCheck,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Home,
    Key,
    Calendar,
    LucideIcon
} from 'lucide-react';
import { APPLICATION_STATUS, ApplicationStatus } from '../../../contexts/ApplicationsContext';
import { getSaleJourneyStageLabel, resolveSaleJourneyDisplayStage } from '@/lib/saleJourney';

interface StatusTrackerProps {
    status: ApplicationStatus;
    listingType?: string;
    liveStage?: string;
    source?: string;
    linkedViewingStatus?: string | null;
}

interface Stage {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    statuses: string[];
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ status, listingType = 'sale', liveStage, source, linkedViewingStatus }) => {
    const isSaleJourney = listingType !== 'rent';
    const saleDisplayStage = isSaleJourney
        ? resolveSaleJourneyDisplayStage({ source, status, liveStage })
        : null;

    const getStages = (): Stage[] => {
        if (isSaleJourney) {
            return [
                {
                    id: 'viewing_completed',
                    label: 'Viewing completed',
                    description: 'The property viewing is done and the purchase can now move into buyer qualification.',
                    icon: Calendar,
                    statuses: [APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.PENDING, APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.APPOINTMENT_BOOKED, APPLICATION_STATUS.VIEWING_SCHEDULED, APPLICATION_STATUS.VIEWING_COMPLETED],
                },
                {
                    id: 'buyer_qualification',
                    label: 'Buyer qualification',
                    description: 'Verify proof of funds or MIP and clear AML before the offer lane opens.',
                    icon: FileCheck,
                    statuses: [APPLICATION_STATUS.BUYER_QUALIFICATION],
                },
                {
                    id: 'offer',
                    label: 'Offer',
                    description: 'The first buyer offer is ready to be recorded and reviewed.',
                    icon: Search,
                    statuses: [APPLICATION_STATUS.OFFER_READY, APPLICATION_STATUS.OFFER_SUBMITTED, APPLICATION_STATUS.OFFER_UNDER_REVIEW],
                },
                {
                    id: 'sale_agreed',
                    label: 'Sale agreed',
                    description: 'The offer is accepted and the purchase is agreed in principle.',
                    icon: UserCheck,
                    statuses: [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.OFFER_ACCEPTED, APPLICATION_STATUS.SALE_AGREED],
                },
                {
                    id: 'memorandum',
                    label: 'Memorandum',
                    description: 'The memorandum is issued and legal coordination begins.',
                    icon: FileText,
                    statuses: [APPLICATION_STATUS.MEMORANDUM_ISSUED],
                },
                {
                    id: 'conveyancing',
                    label: 'Conveyancing',
                    description: 'Searches, legal packs, and solicitor milestones are underway.',
                    icon: FileCheck,
                    statuses: [APPLICATION_STATUS.CONVEYANCING],
                },
                {
                    id: 'exchange',
                    label: 'Exchange',
                    description: 'Contracts are close to exchange and completion is in sight.',
                    icon: Key,
                    statuses: [APPLICATION_STATUS.EXCHANGE],
                },
                {
                    id: 'completion',
                    label: 'Completion',
                    description: 'The purchase is completed and the handover is done.',
                    icon: Home,
                    statuses: [APPLICATION_STATUS.COMPLETED],
                },
            ];
        }

        return [
            {
                id: 'selected',
                label: 'Property Selected',
                description: 'A specific property is now linked to your live journey.',
                icon: FileText,
                statuses: [APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.PENDING, APPLICATION_STATUS.SUBMITTED],
            },
            {
                id: 'viewing',
                label: 'Viewing Scheduled',
                description: 'A real viewing appointment is booked for this property.',
                icon: Calendar,
                statuses: [APPLICATION_STATUS.APPOINTMENT_BOOKED, APPLICATION_STATUS.VIEWING_SCHEDULED],
            },            {
                id: 'documents',
                label: 'Documents & Compliance',
                description: 'Referencing and legal compliance follow-up are active now.',
                icon: FileCheck,
                statuses: [APPLICATION_STATUS.DOCUMENTS_REQUESTED],
            },

            {
                id: 'review',
                label: 'Application Review',
                description: 'The viewing is done and the application is being reviewed.',
                icon: Search,
                statuses: [APPLICATION_STATUS.VIEWING_COMPLETED, APPLICATION_STATUS.UNDER_REVIEW, APPLICATION_STATUS.VERIFICATION_IN_PROGRESS],
            },
            {
                id: 'contract',
                label: 'Ready For Contract',
                description: 'The tenancy is approved and ready for the agreement stage.',
                icon: Key,
                statuses: [APPLICATION_STATUS.APPROVED],
            },
            {
                id: 'completion',
                label: 'Active Tenancy',
                description: 'The contract is complete and the tenancy is now active.',
                icon: CheckCircle,
                statuses: [APPLICATION_STATUS.COMPLETED],
            },
        ];
    };

    const stages = getStages();

    const getCurrentStageIndex = () => {
        if (status === APPLICATION_STATUS.WITHDRAWN) return -1;
        if (status === APPLICATION_STATUS.REJECTED) {
            return Math.max(stages.findIndex((stage) => stage.id === (isSaleJourney ? 'offer' : 'review')), 1);
        }

        if (isSaleJourney && saleDisplayStage) {
            const matchedSaleIndex = stages.findIndex((stage) => {
                if (stage.id === saleDisplayStage) {
                    return true;
                }
                if (stage.id === 'offer' && ['offer_submitted', 'offer_under_review', 'offer'].includes(saleDisplayStage)) {
                    return true;
                }
                if (stage.id === 'sale_agreed' && ['offer_accepted', 'sale_agreed'].includes(saleDisplayStage)) {
                    return true;
                }
                if (stage.id === 'memorandum' && saleDisplayStage === 'memorandum_issued') {
                    return true;
                }
                return false;
            });
            if (matchedSaleIndex >= 0) {
                return matchedSaleIndex;
            }
        }

        const matchedIndex = stages.findIndex((stage) => stage.statuses.includes(status));
        const nextIndex = matchedIndex >= 0 ? matchedIndex : 0;
        const viewingIndex = stages.findIndex((stage) => stage.id === 'viewing');
        const viewingStillPending = !isSaleJourney
            && viewingIndex >= 0
            && Boolean(linkedViewingStatus)
            && String(linkedViewingStatus).trim().toLowerCase() !== 'completed';

        return viewingStillPending && nextIndex > viewingIndex ? viewingIndex : nextIndex;
    };

    const currentStageIndex = getCurrentStageIndex();

    const getStatusColor = () => {
        if (isSaleJourney && saleDisplayStage === 'buyer_qualification') {
            return 'text-orange-600 bg-orange-100 border-orange-200';
        }
        if (isSaleJourney && saleDisplayStage === 'offer') {
            return 'text-violet-600 bg-violet-100 border-violet-200';
        }

        switch (status) {
            case APPLICATION_STATUS.OFFER_ACCEPTED:
            case APPLICATION_STATUS.SALE_AGREED:
            case APPLICATION_STATUS.APPROVED:
                return 'text-green-600 bg-green-100 border-green-200';
            case APPLICATION_STATUS.REJECTED:
                return 'text-red-600 bg-red-100 border-red-200';
            case APPLICATION_STATUS.WITHDRAWN:
                return 'text-gray-600 bg-gray-100 border-gray-100';
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return 'text-orange-600 bg-orange-100 border-orange-200';
            case APPLICATION_STATUS.BUYER_QUALIFICATION:
                return 'text-orange-600 bg-orange-100 border-orange-200';
            case APPLICATION_STATUS.OFFER_READY:
                return 'text-violet-600 bg-violet-100 border-violet-200';
            case APPLICATION_STATUS.MEMORANDUM_ISSUED:
                return 'text-purple-600 bg-purple-100 border-purple-200';
            case APPLICATION_STATUS.CONVEYANCING:
            case APPLICATION_STATUS.EXCHANGE:
                return 'text-indigo-600 bg-indigo-100 border-indigo-200';
            default:
                return 'text-blue-600 bg-blue-100 border-blue-200';
        }
    };

    const getStatusLabel = () => {
        if (isSaleJourney && saleDisplayStage) {
            return getSaleJourneyStageLabel(saleDisplayStage);
        }

        switch (status) {
            case APPLICATION_STATUS.PENDING:
            case APPLICATION_STATUS.SUBMITTED:
                return 'Submitted';
            case APPLICATION_STATUS.UNDER_REVIEW:
                return 'Under Review';
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return 'Documents Needed';
            case APPLICATION_STATUS.OFFER_SUBMITTED:
                return 'Offer Submitted';
            case APPLICATION_STATUS.OFFER_UNDER_REVIEW:
                return 'Offer Under Review';
            case APPLICATION_STATUS.OFFER_ACCEPTED:
                return 'Offer Accepted';
            case APPLICATION_STATUS.SALE_AGREED:
                return 'Sale Agreed';
            case APPLICATION_STATUS.MEMORANDUM_ISSUED:
                return 'Memorandum Issued';
            case APPLICATION_STATUS.CONVEYANCING:
                return 'Conveyancing';
            case APPLICATION_STATUS.EXCHANGE:
                return 'Exchange';
            case APPLICATION_STATUS.APPROVED:
                return 'Approved';
            case APPLICATION_STATUS.REJECTED:
                return 'Not Approved';
            case APPLICATION_STATUS.WITHDRAWN:
                return 'Withdrawn';
            default:
                return 'Processing';
        }
    };

    if (status === APPLICATION_STATUS.WITHDRAWN) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <XCircle className="w-7 h-7 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Application Withdrawn
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            You have withdrawn this application
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
                <div className="flex items-center justify-between font-outfit">
                    <div>
                        <h3 className="text-white text-lg font-semibold">Application Progress</h3>
                        <p className="text-orange-100 text-sm mt-1">
                            {isSaleJourney ? 'Purchase Progression' : 'Rental Application'}
                        </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                        {getStatusLabel()}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="relative">
                    {stages.map((stage, index) => {
                        const Icon = stage.icon;
                        const isCompleted = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isRejected = status === APPLICATION_STATUS.REJECTED && index === currentStageIndex;

                        return (
                            <div key={stage.id} className="relative flex items-start pb-8 last:pb-0">
                                {index < stages.length - 1 && (
                                    <div
                                        className={`absolute left-6 top-12 w-0.5 h-full -ml-px ${isCompleted ? 'bg-green-500' :
                                            isCurrent && !isRejected ? 'bg-orange-300' :
                                                'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                    />
                                )}

                                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : isCurrent && !isRejected
                                        ? 'bg-orange-500 border-orange-500 text-white animate-pulse'
                                        : isRejected
                                            ? 'bg-red-500 border-red-500 text-white'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                                    }`}>
                                    {isCompleted ? (
                                        <CheckCircle className="w-6 h-6" />
                                    ) : isRejected ? (
                                        <XCircle className="w-6 h-6" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>

                                <div className="ml-4 flex-1 min-w-0 font-outfit">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-semibold ${isCompleted || isCurrent
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {stage.label}
                                        </h4>
                                        {isCurrent && !isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm mt-1 ${isCompleted || isCurrent
                                        ? 'text-gray-600 dark:text-gray-400'
                                        : 'text-gray-400 dark:text-gray-600'
                                        }`}>
                                        {stage.description}
                                    </p>

                                    {isCurrent && status === APPLICATION_STATUS.DOCUMENTS_REQUESTED && (
                                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                                <AlertCircle size={16} />
                                                <span className="text-sm font-medium">Action Required</span>
                                            </div>
                                            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                                Please upload the requested documents to proceed
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {status !== APPLICATION_STATUS.APPROVED && status !== APPLICATION_STATUS.REJECTED && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 font-outfit">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={16} />
                        <span>Estimated processing time: <strong>{isSaleJourney ? 'varies by legal milestones' : '3-5 business days'}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusTracker;
