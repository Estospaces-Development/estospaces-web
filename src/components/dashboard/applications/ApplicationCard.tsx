"use client";

import React from 'react';
import {
    FileText,
    MapPin,
    User,
    Clock,
    AlertCircle,
    ChevronRight,
    CheckCircle,
    XCircle,
    Edit,
    Upload,
    MessageSquare,
    Calendar,
    Home,
    Building2,
    TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APPLICATION_STATUS, Application } from '@/contexts/ApplicationsContext';



interface ApplicationCardProps {
    application: Application;
    onClick: () => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onClick }) => {
    const router = useRouter();

    const getStatusConfig = (status: string) => {
        switch (status) {
            case APPLICATION_STATUS.DRAFT:
                return {
                    label: 'Draft',
                    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                    dotColor: 'bg-gray-400',
                    icon: Edit,
                };
            case APPLICATION_STATUS.PENDING:
                return {
                    label: 'Pending Review',
                    color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
                    dotColor: 'bg-yellow-500',
                    icon: Clock,
                };
            case APPLICATION_STATUS.SUBMITTED:
                return {
                    label: 'Submitted',
                    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                    dotColor: 'bg-blue-500',
                    icon: FileText,
                };
            case APPLICATION_STATUS.APPOINTMENT_BOOKED:
                return {
                    label: 'Appointment Booked',
                    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                    dotColor: 'bg-purple-500',
                    icon: Calendar,
                };
            case APPLICATION_STATUS.VIEWING_SCHEDULED:
                return {
                    label: 'Viewing Scheduled',
                    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
                    dotColor: 'bg-indigo-500',
                    icon: Calendar,
                };
            case APPLICATION_STATUS.VIEWING_COMPLETED:
                return {
                    label: 'Viewing Completed',
                    color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
                    dotColor: 'bg-cyan-500',
                    icon: CheckCircle,
                };
            case APPLICATION_STATUS.UNDER_REVIEW:
                return {
                    label: 'Under Review',
                    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                    dotColor: 'bg-amber-500',
                    icon: Clock,
                };
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return {
                    label: 'Documents Requested',
                    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                    dotColor: 'bg-orange-500',
                    icon: Upload,
                };
            case APPLICATION_STATUS.VERIFICATION_IN_PROGRESS:
                return {
                    label: 'Verification in Progress',
                    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                    dotColor: 'bg-blue-500',
                    icon: TrendingUp,
                };
            case APPLICATION_STATUS.APPROVED:
                return {
                    label: 'Approved',
                    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                    dotColor: 'bg-emerald-500',
                    icon: CheckCircle,
                };
            case APPLICATION_STATUS.REJECTED:
                return {
                    label: 'Rejected',
                    color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                    dotColor: 'bg-red-500',
                    icon: XCircle,
                };
            case APPLICATION_STATUS.WITHDRAWN:
                return {
                    label: 'Withdrawn',
                    color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                    dotColor: 'bg-gray-400',
                    icon: XCircle,
                };
            case APPLICATION_STATUS.COMPLETED:
                return {
                    label: 'Completed',
                    color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                    dotColor: 'bg-green-500',
                    icon: CheckCircle,
                };
            default:
                return {
                    label: status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown',
                    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                    dotColor: 'bg-gray-400',
                    icon: FileText,
                };
        }
    };

    const getPrimaryAction = () => {
        switch (application.status) {
            case APPLICATION_STATUS.DRAFT:
                return { label: 'Continue', action: 'edit' };
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED:
                return { label: 'Upload', action: 'upload' };
            case APPLICATION_STATUS.UNDER_REVIEW:
                return { label: 'View', action: 'view' };
            default:
                return { label: 'View', action: 'view' };
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatRelativeTime = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return formatDate(dateString);
    };

    const isDeadlineWarning = () => {
        if (!application.deadline) return false;
        const deadline = new Date(application.deadline);
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return deadline <= threeDaysFromNow && deadline > now;
    };

    const statusConfig = getStatusConfig(application.status);
    const primaryAction = getPrimaryAction();

    const handleMessageAgent = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push('/user/dashboard/messages');
    };

    // Get progress percentage based on status
    const getProgressPercentage = () => {
        switch (application.status) {
            case APPLICATION_STATUS.DRAFT: return 10;
            case APPLICATION_STATUS.PENDING:
            case APPLICATION_STATUS.SUBMITTED: return 20;
            case APPLICATION_STATUS.APPOINTMENT_BOOKED:
            case APPLICATION_STATUS.VIEWING_SCHEDULED: return 30;
            case APPLICATION_STATUS.VIEWING_COMPLETED: return 40;
            case APPLICATION_STATUS.UNDER_REVIEW: return 55;
            case APPLICATION_STATUS.DOCUMENTS_REQUESTED: return 65;
            case APPLICATION_STATUS.VERIFICATION_IN_PROGRESS: return 80;
            case APPLICATION_STATUS.APPROVED:
            case APPLICATION_STATUS.COMPLETED: return 100;
            case APPLICATION_STATUS.REJECTED:
            case APPLICATION_STATUS.WITHDRAWN: return 0;
            default: return 15;
        }
    };

    // Format appointment date/time
    const formatAppointment = () => {
        if (!application.appointment) return null;
        const { date, time } = application.appointment;
        if (!date) return null;

        const appointmentDate = new Date(date);
        const formattedDate = appointmentDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        return `${formattedDate}${time ? ` at ${time}` : ''}`;
    };

    const getPropertyTypeIcon = () => {
        const type = application.propertyType?.toLowerCase();
        if (type === 'apartment' || type === 'flat') return Building2;
        return Home;
    };

    const PropertyTypeIcon = getPropertyTypeIcon();

    return (
        <div
            onClick={onClick}
            className={`group bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg ${application.requiresAction
                ? 'border-orange-200 dark:border-orange-800 ring-1 ring-orange-100 dark:ring-orange-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800'
                }`}
        >
            <div className="flex">
                {/* Property Image */}
                <div className="relative flex-shrink-0 w-32 sm:w-40 lg:w-48">
                    <img
                        src={application.propertyImage}
                        alt={application.propertyTitle || 'Property'}
                        className="w-full h-full object-cover min-h-[160px]"
                    />
                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} backdrop-blur-sm`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}></span>
                            {statusConfig.label}
                        </span>
                    </div>
                    {/* Action Required Badge */}
                    {application.requiresAction && (
                        <div className="absolute top-3 right-3">
                            <span className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
                                <AlertCircle size={12} />
                                Action
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 lg:p-5 flex flex-col justify-between min-w-0">
                    {/* Top Section */}
                    <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-base lg:text-lg truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                    {application.propertyTitle}
                                </h3>
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    <MapPin size={13} className="flex-shrink-0" />
                                    <span className="truncate">{application.propertyAddress}</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0 mt-1" />
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mt-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <User size={14} className="flex-shrink-0 text-gray-400" />
                                <span className="truncate">{application.agentName || 'Agent'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Clock size={14} className="flex-shrink-0 text-gray-400" />
                                <span className="truncate">{formatRelativeTime(application.lastUpdated || application.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <FileText size={14} className="flex-shrink-0 text-gray-400" />
                                <span className="truncate font-mono text-xs">{application.referenceId || application.id.substring(0, 8)}</span>
                            </div>
                        </div>

                        {/* Appointment Info */}
                        {application.hasAppointment && formatAppointment() && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                                <Calendar size={14} className="text-purple-600 dark:text-purple-400" />
                                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                                    Appointment: {formatAppointment()}
                                </span>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {application.status !== APPLICATION_STATUS.REJECTED &&
                            application.status !== APPLICATION_STATUS.WITHDRAWN && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                            {getProgressPercentage()}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${application.status === APPLICATION_STATUS.APPROVED
                                                ? 'bg-green-500'
                                                : 'bg-gradient-to-r from-orange-400 to-orange-500'
                                                }`}
                                            style={{ width: `${getProgressPercentage()}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                        {/* Deadline Warning */}
                        {isDeadlineWarning() && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                                <Clock size={13} className="text-red-500" />
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                    Due: {formatDate(application.deadline)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Section - Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {/* Price */}
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                £{application.propertyPrice?.toLocaleString() || '0'}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {application.propertyType === 'rent' ? '/month' : ''}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMessageAgent}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Message Agent"
                            >
                                <MessageSquare size={18} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                                {primaryAction.label}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationCard;
