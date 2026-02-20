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
    LucideIcon
} from 'lucide-react';
import { APPLICATION_STATUS, ApplicationStatus } from '../../../contexts/ApplicationsContext';

interface StatusTrackerProps {
    status: ApplicationStatus;
    listingType?: string;
}

interface Stage {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    statuses: ApplicationStatus[];
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ status, listingType = 'sale' }) => {
    // Define stages based on listing type
    const getStages = (): Stage[] => {
        const baseStages: Stage[] = [
            {
                id: 'submitted',
                label: 'Application Submitted',
                description: 'Your application has been received',
                icon: FileText,
                statuses: [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.SUBMITTED]
            },
            {
                id: 'under_review',
                label: 'Under Review',
                description: 'Agent is reviewing your application',
                icon: Search,
                statuses: [APPLICATION_STATUS.UNDER_REVIEW]
            },
            {
                id: 'verification',
                label: listingType === 'rent' ? 'Tenant Verification' : 'Buyer Verification',
                description: listingType === 'rent'
                    ? 'Background & credit check in progress'
                    : 'Financial verification in progress',
                icon: UserCheck,
                statuses: [APPLICATION_STATUS.DOCUMENTS_REQUESTED]
            },
            {
                id: 'documents',
                label: 'Document Review',
                description: 'Final document verification',
                icon: FileCheck,
                statuses: []
            },
            {
                id: 'decision',
                label: 'Final Decision',
                description: status === APPLICATION_STATUS.APPROVED || status === APPLICATION_STATUS.COMPLETED
                    ? 'Congratulations! Your application is approved'
                    : status === APPLICATION_STATUS.REJECTED
                        ? 'Application was not approved'
                        : 'Awaiting final decision',
                icon: (status === APPLICATION_STATUS.APPROVED || status === APPLICATION_STATUS.COMPLETED) ? CheckCircle :
                    status === APPLICATION_STATUS.REJECTED ? XCircle : Clock,
                statuses: [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.COMPLETED]
            }
        ];

        // Add completion stage for approved/completed applications
        if (status === APPLICATION_STATUS.APPROVED || status === APPLICATION_STATUS.COMPLETED) {
            baseStages.push({
                id: 'completion',
                label: listingType === 'rent' ? 'Move In Ready' : 'Key Handover',
                description: status === APPLICATION_STATUS.COMPLETED
                    ? (listingType === 'rent' ? 'Keys collected & moved in' : 'Keys handed over & completed')
                    : (listingType === 'rent' ? 'Prepare for your move-in date' : 'Proceed to contract signing'),
                icon: listingType === 'rent' ? Key : Home,
                statuses: [APPLICATION_STATUS.COMPLETED]
            });
        }

        return baseStages;
    };

    const stages = getStages();

    // Determine current stage index
    const getCurrentStageIndex = () => {
        if (status === APPLICATION_STATUS.WITHDRAWN) return -1;
        if (status === APPLICATION_STATUS.REJECTED) return stages.length - 2; // Decision stage
        if (status === APPLICATION_STATUS.COMPLETED) return stages.length - 1; // Completion stage
        if (status === APPLICATION_STATUS.APPROVED) return stages.length - 1; // Also completion stage (but typically shows as current)
        if (status === APPLICATION_STATUS.DOCUMENTS_REQUESTED) return 2;
        if (status === APPLICATION_STATUS.UNDER_REVIEW) return 1;
        return 0;
    };

    const currentStageIndex = getCurrentStageIndex();

    // Get status color
    const getStatusColor = () => {
        switch (status) {
            case APPLICATION_STATUS.APPROVED:
                return 'text-green-600 bg-green-100 border-green-200';
            case APPLICATION_STATUS.REJECTED:
                return 'text-red-600 bg-red-100 border-red-200';
            case APPLICATION_STATUS.WITHDRAWN:
                return 'text-gray-600 bg-gray-100 border-gray-200';
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return 'text-orange-600 bg-orange-100 border-orange-200';
            default:
                return 'text-blue-600 bg-blue-100 border-blue-200';
        }
    };

    // Get status label
    const getStatusLabel = () => {
        switch (status) {
            case APPLICATION_STATUS.PENDING:
            case APPLICATION_STATUS.SUBMITTED:
                return 'Submitted';
            case APPLICATION_STATUS.UNDER_REVIEW:
                return 'Under Review';
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return 'Documents Needed';
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header with current status */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
                <div className="flex items-center justify-between font-outfit">
                    <div>
                        <h3 className="text-white text-lg font-semibold">Application Progress</h3>
                        <p className="text-orange-100 text-sm mt-1">
                            {listingType === 'rent' ? 'Rental Application' : 'Purchase Application'}
                        </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                        {getStatusLabel()}
                    </div>
                </div>
            </div>

            {/* Progress Timeline */}
            <div className="p-6">
                <div className="relative">
                    {stages.map((stage, index) => {
                        const Icon = stage.icon;
                        const isCompleted = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isPending = index > currentStageIndex;
                        const isRejected = status === APPLICATION_STATUS.REJECTED && index === currentStageIndex;

                        return (
                            <div key={stage.id} className="relative flex items-start pb-8 last:pb-0">
                                {/* Connecting Line */}
                                {index < stages.length - 1 && (
                                    <div
                                        className={`absolute left-6 top-12 w-0.5 h-full -ml-px ${isCompleted ? 'bg-green-500' :
                                            isCurrent && !isRejected ? 'bg-orange-300' :
                                                'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                    />
                                )}

                                {/* Stage Icon */}
                                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : isCurrent && !isRejected
                                        ? 'bg-orange-500 border-orange-500 text-white animate-pulse'
                                        : isRejected
                                            ? 'bg-red-500 border-red-500 text-white'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                    }`}>
                                    {isCompleted ? (
                                        <CheckCircle className="w-6 h-6" />
                                    ) : isRejected ? (
                                        <XCircle className="w-6 h-6" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Stage Content */}
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

                                    {/* Action prompt for current stage */}
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

            {/* Estimated Timeline */}
            {status !== APPLICATION_STATUS.APPROVED && status !== APPLICATION_STATUS.REJECTED && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 font-outfit">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={16} />
                        <span>Estimated processing time: <strong>3-5 business days</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusTracker;
