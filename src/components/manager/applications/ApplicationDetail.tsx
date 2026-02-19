import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowLeft,
    ExternalLink,
    MapPin,
    MessageSquare,
    XCircle,
    CheckCircle,
    Calendar,
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
    Upload,
    LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApplications, APPLICATION_STATUS, Application, ApplicationStatus } from '../../../contexts/ApplicationsContext';
import StatusTracker from './StatusTracker';
import CreateContractModal from '@/components/manager/contracts/CreateContractModal';

interface ApplicationDetailProps {
    applicationId: string;
    application?: Application;
    onClose: () => void;
    onUpdateStatus?: (id: string, status: ApplicationStatus) => void;
}

const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ applicationId, application: initialApplication, onClose, onUpdateStatus }) => {
    const navigate = useNavigate();
    const { allApplications, withdrawApplication } = useApplications();
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Find the application - prioritize the passed prop, fall back to context search
    const application = initialApplication || allApplications?.find(app => app.id === applicationId);

    if (!application) {
        return (
            <div className="min-h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-outfit">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Application Not Found
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        This application may have been removed or doesn't exist.
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

    const canWithdraw = ![APPLICATION_STATUS.WITHDRAWN as ApplicationStatus, APPLICATION_STATUS.APPROVED as ApplicationStatus, APPLICATION_STATUS.REJECTED as ApplicationStatus].includes(application.status);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatPrice = (price?: number) => {
        if (price === undefined) return 'Price on request';
        return `£${price.toLocaleString('en-GB')}`;
    };

    const handleWithdraw = async () => {
        if (onUpdateStatus) {
            onUpdateStatus(applicationId, APPLICATION_STATUS.WITHDRAWN as ApplicationStatus);
        } else {
            await withdrawApplication(applicationId);
        }
        setShowWithdrawConfirm(false);
    };

    const handleComplete = async () => {
        if (onUpdateStatus) {
            onUpdateStatus(applicationId, APPLICATION_STATUS.COMPLETED as ApplicationStatus);
            setShowCompleteConfirm(false);
        }
    };

    interface ActivityItem {
        id: number;
        type: string;
        title: string;
        description: string;
        date: string;
        icon: LucideIcon;
        color: 'blue' | 'orange' | 'green' | 'red' | 'yellow' | 'gray';
    }

    const getActivityHistory = (): ActivityItem[] => {
        const history: ActivityItem[] = [
            {
                id: 1,
                type: 'submitted',
                title: 'Application Submitted',
                description: 'Your application was successfully submitted',
                date: application.submittedDate || application.createdAt,
                icon: FileText,
                color: 'blue'
            }
        ];

        const submittedTime = new Date(application.submittedDate || application.createdAt).getTime();

        if (application.status !== APPLICATION_STATUS.PENDING && application.status !== APPLICATION_STATUS.SUBMITTED) {
            history.push({
                id: 2,
                type: 'review',
                title: 'Under Review',
                description: 'Agent started reviewing your application',
                date: new Date(submittedTime + 24 * 60 * 60 * 1000).toISOString(),
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
                date: new Date(submittedTime + 2 * 24 * 60 * 60 * 1000).toISOString(),
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
        <div className="min-h-full bg-gray-50 dark:bg-gray-900 font-outfit">
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 shadow-sm">
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
                                        {application.propertyTitle || 'Untitled Property'}
                                    </h1>

                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                                        <MapPin size={16} />
                                        <span>{application.propertyAddress || 'Address not specified'}</span>
                                    </div>

                                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {formatPrice(application.propertyPrice)}
                                        {application.listingType === 'rent' && (
                                            <span className="text-base font-normal text-gray-500 ml-1">/month</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/manager/dashboard/property/${application.propertyId}`)}
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
                                        {formatDate(application.submittedDate || application.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatDate(application.lastUpdated || application.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Property Type</p>
                                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                        {application.propertyType || 'N/A'}
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
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
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <User size={20} className="text-orange-500" />
                                        Agent Information
                                    </h3>
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
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
                                        onClick={() => navigate('/manager/messages')}
                                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-sm"
                                    >
                                        <MessageSquare size={18} />
                                        <span>Message Agent</span>
                                    </button>
                                </div>

                                {/* Application Summary */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Briefcase size={20} className="text-orange-500" />
                                        Application Summary
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400">Application ID</span>
                                            <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
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
                                                {application.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Next Steps & Approved Message */}
                                {application.status !== APPLICATION_STATUS.APPROVED &&
                                    application.status !== APPLICATION_STATUS.REJECTED &&
                                    application.status !== APPLICATION_STATUS.WITHDRAWN ? (
                                    <div className="lg:col-span-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 rounded-xl p-6 border border-orange-200 dark:border-orange-800/50">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ChevronRight size={20} className="text-orange-500" />
                                            What's Next?
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* ... existing next steps logic ... */}
                                            {application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED ? (
                                                <>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">1</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Upload Documents</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Submit the requested documents via the Documents tab</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 opacity-50">
                                                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Verification</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Our team will verify your submitted documents</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 opacity-50">
                                                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Final Decision</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Receive approval or feedback on your application</p>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                                            <CheckCircle size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Application Received</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your basic details have been submitted</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 ${application.status === APPLICATION_STATUS.UNDER_REVIEW ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold`}>2</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Agent Review</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Agent is reviewing your suitability</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 opacity-50">
                                                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">Final Decision</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Typically within 3-5 business days</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : application.status === APPLICATION_STATUS.APPROVED && (
                                    <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
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
                                                        onClick={() => navigate('/manager/messages')}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg font-medium transition-colors shadow-sm"
                                                    >
                                                        <MessageSquare size={18} />
                                                        <span>Contact Agent</span>
                                                    </button>

                                                    {application.listingType === 'rent' && (
                                                        <button
                                                            onClick={() => setShowContractModal(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                                        >
                                                            <FileText size={18} />
                                                            <span>Draft Contract</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setShowCompleteConfirm(true)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                                    >
                                                        <FileText size={18} />
                                                        <span>Sign & Complete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Completed Message */}
                                {application.status === APPLICATION_STATUS.COMPLETED && (
                                    <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                                <Key size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    Application Process Complete
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    Congratulations! The entire application process is complete. You have successfully {application.listingType === 'rent' ? 'rented' : 'purchased'} this property.
                                                </p>
                                                <button
                                                    onClick={() => navigate('/manager/dashboard')}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
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
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Shield size={20} className="text-orange-500" />
                                            Required Documents
                                        </h3>
                                        <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
                                            <Upload size={14} />
                                            Upload All
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {['Passport or ID Proof', 'Recent Utility Bill', 'Employment Contract', '3 Months Bank Statements'].map((doc, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 transition-all shadow-sm group">
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
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{doc}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {index < 2 ? 'Verified' : 'Pending upload'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className="p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                                                    {index < 2 ? <FileText size={18} /> : <Upload size={18} />}
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
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                                        <History size={20} className="text-orange-500" />
                                        Application Timeline
                                    </h3>
                                    <div className="relative ml-4">
                                        {activityHistory.map((activity, index) => {
                                            const Icon = activity.icon;
                                            const colorClasses = {
                                                blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                                                orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                                                green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                                                red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                                                yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
                                                gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                                            };

                                            return (
                                                <div key={activity.id} className="relative flex items-start pb-10 last:pb-2">
                                                    {index < activityHistory.length - 1 && (
                                                        <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700 -ml-px" />
                                                    )}
                                                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${colorClasses[activity.color]}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="ml-6 flex-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                {activity.title}
                                                            </h4>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {formatDate(activity.date)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={28} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Withdraw Application?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            This will remove your interest in the property. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowWithdrawConfirm(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Keep it
                            </button>
                            <button
                                onClick={handleWithdraw}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                            >
                                Confirm Withdraw
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Complete Confirmation Modal */}
            {showCompleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Key size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Finalize Handover?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            By confirming, you acknowledge that you have received the keys and the process is now complete.
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
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                            >
                                Complete Now
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Contract Creation Modal */}
            {showContractModal && (
                <CreateContractModal
                    applicationId={application.id}
                    propertyPrice={application.propertyPrice || 0}
                    onClose={() => setShowContractModal(false)}
                    onSuccess={() => {
                        // Ideally trigger a refresh
                    }}
                />
            )}
        </div>
    );
};

export default ApplicationDetail;
