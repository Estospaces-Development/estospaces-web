import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowLeft,
    ExternalLink,
    MapPin,
    MessageSquare,
    XCircle,
    CheckCircle,
    Clock,
    Phone,
    Mail,
    Building2,
    User,
    FileText,
    AlertCircle,
    ChevronRight,
    Home,
    Briefcase,
    History,
    Shield,
    Key,
    LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApplications, APPLICATION_STATUS, Application } from '@/contexts/ApplicationsContext';
import StatusTracker from './StatusTracker';
import UserContractModal from '@/components/dashboard/contracts/UserContractModal';
import { getUserContracts, Contract } from '@/services/contractsService';

interface ActivityItem {
    id: number;
    type: string;
    title: string;
    description: string;
    date: string;
    icon: LucideIcon;
    color: string;
}

interface ApplicationDetailProps {
    applicationId?: string;
    application?: Application;
    onClose: () => void;
    onUpdateStatus?: (id: string, status: string) => void;
}

const ApplicationDetail = ({ applicationId, application: initialApplication, onClose, onUpdateStatus }: ApplicationDetailProps) => {
    const navigate = useNavigate();
    const { allApplications, withdrawApplication, updateApplicationStatus } = useApplications();
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Contract state
    const [contract, setContract] = useState<Contract | null>(null);
    const [showContractModal, setShowContractModal] = useState(false);
    const [checkingContract, setCheckingContract] = useState(false);

    // Find the application - prioritize the passed prop, fall back to context search
    const application = initialApplication || allApplications?.find((app) => app.id === applicationId);

    // Fetch contract if application is approved
    useEffect(() => {
        const fetchContract = async () => {
            if (application?.status === APPLICATION_STATUS.APPROVED || application?.status === APPLICATION_STATUS.COMPLETED) {
                setCheckingContract(true);
                const { data } = await getUserContracts();
                if (data) {
                    const relevantContract = data.find(c => c.property_id === application.propertyId);
                    if (relevantContract) {
                        setContract(relevantContract);
                    }
                }
                setCheckingContract(false);
            }
        };

        if (application) {
            fetchContract();
        }
    }, [application?.status, application?.propertyId]);

    if (!application) {
        return (
            <div className="min-h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Application Not Found
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        This application may have been removed or doesn&apos;t exist.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Back to Applications
                    </button>
                </div>
            </div>
        );
    }

    const canWithdraw = !([APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED] as string[]).includes(application.status);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatPrice = (price?: number) => {
        if (!price) return 'Price on request';
        return `£${price.toLocaleString('en-GB')}`;
    };

    const handleWithdraw = async () => {
        if (onUpdateStatus && applicationId) {
            onUpdateStatus(applicationId, APPLICATION_STATUS.WITHDRAWN);
        } else if (applicationId) {
            await withdrawApplication(applicationId);
        }
        setShowWithdrawConfirm(false);
    };

    const handleComplete = async () => {
        if (onUpdateStatus && applicationId) {
            onUpdateStatus(applicationId, APPLICATION_STATUS.COMPLETED);
            setShowCompleteConfirm(false);
        }
    };

    // Generate activity history based on status
    const getActivityHistory = (): ActivityItem[] => {
        const history: ActivityItem[] = [
            {
                id: 1,
                type: 'submitted',
                title: 'Application Submitted',
                description: 'Your application was successfully submitted',
                date: application.submittedDate || new Date().toISOString(),
                icon: FileText,
                color: 'blue'
            }
        ];

        if (application.status !== APPLICATION_STATUS.PENDING && application.status !== APPLICATION_STATUS.SUBMITTED) {
            history.push({
                id: 2,
                type: 'review',
                title: 'Under Review',
                description: 'Agent started reviewing your application',
                date: new Date(new Date(application.submittedDate || Date.now()).getTime() + 24 * 60 * 60 * 1000).toISOString(),
                icon: Clock,
                color: 'orange'
            });
        }

        if (application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED) {
            history.push({
                id: 3,
                type: 'documents',
                title: 'Documents Requested',
                description: 'Additional documents are required',
                date: new Date(new Date(application.submittedDate || Date.now()).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                icon: AlertCircle,
                color: 'yellow'
            });
        }

        if (application.status === APPLICATION_STATUS.APPROVED) {
            history.push({
                id: 4,
                type: 'approved',
                title: 'Application Approved',
                description: 'Congratulations! Your application has been approved',
                date: application.lastUpdated || new Date().toISOString(),
                icon: CheckCircle,
                color: 'green'
            });
        }

        if (application.status === APPLICATION_STATUS.REJECTED) {
            history.push({
                id: 4,
                type: 'rejected',
                title: 'Application Not Approved',
                description: 'Unfortunately, your application was not approved',
                date: application.lastUpdated || new Date().toISOString(),
                icon: XCircle,
                color: 'red'
            });
        }

        if (application.status === APPLICATION_STATUS.COMPLETED) {
            history.push({
                id: 5,
                type: 'completed',
                title: application.listingType === 'rent' ? 'Keys Collected' : 'Handover Complete',
                description: application.listingType === 'rent' ? 'You have collected the keys and moved in' : 'Key handover completed successfully',
                date: application.lastUpdated || new Date().toISOString(),
                icon: Key,
                color: 'green'
            });
        }

        if (application.status === APPLICATION_STATUS.WITHDRAWN) {
            history.push({
                id: 4,
                type: 'withdrawn',
                title: 'Application Withdrawn',
                description: 'You withdrew this application',
                date: application.lastUpdated || new Date().toISOString(),
                icon: XCircle,
                color: 'gray'
            });
        }

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const activityHistory = getActivityHistory();

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'history', label: 'Activity', icon: History },
    ];

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back to Applications</span>
                        </button>

                        <div className="flex items-center gap-3">
                            {canWithdraw && (
                                <button
                                    onClick={() => setShowWithdrawConfirm(true)}
                                    className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    Withdraw
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
                {/* Property Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                    <div className="flex flex-col lg:flex-row">
                        {/* Property Image */}
                        <div className="lg:w-80 h-48 lg:h-auto flex-shrink-0">
                            <img
                                src={application.propertyImage}
                                alt={application.propertyTitle}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';
                                }}
                            />
                        </div>

                        {/* Property Info */}
                        <div className="flex-1 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${application.listingType === 'rent'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {application.listingType === 'rent' ? 'Rental' : 'Purchase'}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            Ref: {application.referenceId}
                                        </span>
                                    </div>

                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {application.propertyTitle}
                                    </h1>

                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                                        <MapPin size={16} />
                                        <span>{application.propertyAddress}</span>
                                    </div>

                                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {formatPrice(application.propertyPrice)}
                                        {application.listingType === 'rent' && (
                                            <span className="text-base font-normal text-gray-500">/month</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/user/dashboard/property/${application.propertyId}`)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    <span>View Property</span>
                                    <ExternalLink size={16} />
                                </button>
                            </div>

                            {/* Quick Info */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Submitted</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatDate(application.submittedDate)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatDate(application.lastUpdated)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Property Type</p>
                                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                        {application.propertyType}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Application Type</p>
                                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                        {application.listingType === 'rent' ? 'Rental' : 'Purchase'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Tracker */}
                <div className="mb-6">
                    <StatusTracker status={application.status} listingType={application.listingType} />
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex overflow-x-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Agent Information */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <User size={20} className="text-orange-500" />
                                        Agent Information
                                    </h3>
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                            {application.agentName?.charAt(0)?.toUpperCase() || 'A'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                {application.agentName}
                                            </h4>
                                            {application.agentAgency && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                    <Building2 size={14} />
                                                    {application.agentAgency}
                                                </p>
                                            )}
                                            {application.agentEmail && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                    <Mail size={14} />
                                                    {application.agentEmail}
                                                </p>
                                            )}
                                            {application.agentPhone && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                    <Phone size={14} />
                                                    {application.agentPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/user/dashboard/messages')}
                                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <MessageSquare size={18} />
                                        <span>Message Agent</span>
                                    </button>
                                </div>

                                {/* Application Summary */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Briefcase size={20} className="text-orange-500" />
                                        Application Summary
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400">Application ID</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {application.referenceId}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400">Type</span>
                                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                                                {application.listingType === 'rent' ? 'Rental Application' : 'Purchase Application'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400">Property Value</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {formatPrice(application.propertyPrice)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3">
                                            <span className="text-gray-500 dark:text-gray-400">Status</span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${application.status === APPLICATION_STATUS.APPROVED
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : application.status === APPLICATION_STATUS.REJECTED
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {application.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Next Steps */}
                                {application.status !== APPLICATION_STATUS.APPROVED &&
                                    application.status !== APPLICATION_STATUS.REJECTED &&
                                    application.status !== APPLICATION_STATUS.WITHDRAWN && (
                                        <div className="lg:col-span-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <ChevronRight size={20} className="text-orange-500" />
                                                What&apos;s Next?
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED ? (
                                                    <>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Upload Documents</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Submit the requested documents</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Verification</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Documents will be verified</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Final Decision</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Receive approval status</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                                                <CheckCircle size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Application Received</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Your application is being processed</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-8 h-8 ${application.status === APPLICATION_STATUS.UNDER_REVIEW ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'} rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold`}>2</div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Agent Review</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Agent will review your details</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">Final Decision</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Typically within 3-5 days</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Approved Message with Contract Integration */}
                                {application.status === APPLICATION_STATUS.APPROVED && (
                                    <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    Congratulations! Your Application is Approved
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    The agent has approved your application. Contact them to proceed with the next steps
                                                    {application.listingType === 'rent' ? ' including signing the tenancy agreement and arranging your move-in date.' : ' including contract signing and completion.'}
                                                </p>
                                                <div className="flex flex-wrap gap-3">
                                                    <button
                                                        onClick={() => navigate('/user/dashboard/messages')}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-green-700 hover:bg-green-50 border border-green-200 rounded-lg font-medium transition-colors"
                                                    >
                                                        <MessageSquare size={18} />
                                                        <span>Contact Agent</span>
                                                    </button>

                                                    {/* Contract Button */}
                                                    {contract && (
                                                        <button
                                                            onClick={() => setShowContractModal(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                                        >
                                                            <FileText size={18} />
                                                            <span>
                                                                {contract.user_signed_at ? 'View Contract' : 'Review & Sign Contract'}
                                                            </span>
                                                        </button>
                                                    )}

                                                    {!contract && !checkingContract && (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 text-sm italic">
                                                            Contract pending from agent
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={() => setShowCompleteConfirm(true)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                                    >
                                                        <Key size={18} />
                                                        <span>Complete Handover</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Completed Message */}
                                {application.status === APPLICATION_STATUS.COMPLETED && (
                                    <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                                <Key size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    Key Handover Complete!
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    Congratulations! The process is complete. You have successfully {application.listingType === 'rent' ? 'rented' : 'purchased'} this property.
                                                </p>
                                                <button
                                                    onClick={() => navigate('/user/dashboard')}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                                >
                                                    <Home size={18} />
                                                    <span>Back to Dashboard</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents Tab */}
                        {activeTab === 'documents' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Shield size={20} className="text-orange-500" />
                                        Required Documents
                                    </h3>
                                    <div className="space-y-4">
                                        {['ID Proof', 'Proof of Address', 'Employment Letter', 'Bank Statements'].map((doc, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${index < 2 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                                                        }`}>
                                                        {index < 2 ? (
                                                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <FileText size={20} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{doc}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {index < 2 ? 'Uploaded' : 'Pending upload'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className="px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                                                    {index < 2 ? 'View' : 'Upload'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Activity/History Tab */}
                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <History size={20} className="text-orange-500" />
                                        Application Activity
                                    </h3>
                                    <div className="relative">
                                        {activityHistory.map((activity, index) => {
                                            const Icon = activity.icon;
                                            const colorClasses: Record<string, string> = {
                                                blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                                                orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                                                green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                                                red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                                                yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
                                                gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                                            };

                                            return (
                                                <div key={activity.id} className="relative flex items-start pb-8 last:pb-0">
                                                    {index < activityHistory.length - 1 && (
                                                        <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700 -ml-px" />
                                                    )}
                                                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[activity.color]}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="ml-4 flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                {activity.title}
                                                            </h4>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {formatDate(activity.date)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {activity.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Withdraw Confirmation Modal */}
            {showWithdrawConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={28} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Withdraw Application?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to withdraw this application? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowWithdrawConfirm(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Keep Application
                            </button>
                            <button
                                onClick={handleWithdraw}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Yes, Withdraw
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Complete Confirmation Modal */}
            {showCompleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Key size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Complete Handover?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Confirm that you are ready to sign the contract and complete the key handover process.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCompleteConfirm(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleComplete}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Confirm &amp; Complete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Contract Modal */}
            {showContractModal && contract && (
                <UserContractModal
                    contract={contract}
                    onClose={() => setShowContractModal(false)}
                    onSigned={() => {
                        getUserContracts().then(({ data }) => {
                            if (data) {
                                const updated = data.find(c => c.id === contract.id);
                                if (updated) setContract(updated);
                            }
                        });
                    }}
                />
            )}
        </div>
    );
};

export default ApplicationDetail;
