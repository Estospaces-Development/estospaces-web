"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    Application as BackendApplication,
    createApplication as createBackendApplication,
    getApplications as getBackendApplications,
    updateApplicationStatus as updateBackendApplicationStatus,
    withdrawApplication as withdrawBackendApplication,
} from '@/services/applicationsService';
import { getViewings, type Viewing } from '@/services/bookingsService';
import { findRelatedViewing } from '@/lib/applicationWorkflow';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';

export const APPLICATION_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    SUBMITTED: 'submitted',
    APPOINTMENT_BOOKED: 'appointment_booked',
    VIEWING_SCHEDULED: 'viewing_scheduled',
    VIEWING_COMPLETED: 'viewing_completed',
    UNDER_REVIEW: 'under_review',
    DOCUMENTS_REQUESTED: 'documents_requested',
    VERIFICATION_IN_PROGRESS: 'verification_in_progress',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
    COMPLETED: 'completed',
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
    draft: { label: 'Draft', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
    pending: { label: 'Pending Review', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    submitted: { label: 'Submitted', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    appointment_booked: { label: 'Appointment Booked', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    viewing_scheduled: { label: 'Viewing Scheduled', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
    viewing_completed: { label: 'Viewing Completed', color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
    under_review: { label: 'Under Review', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
    documents_requested: { label: 'Documents Required', color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
    verification_in_progress: { label: 'Verification in Progress', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    approved: { label: 'Approved', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    rejected: { label: 'Rejected', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
    withdrawn: { label: 'Withdrawn', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
    completed: { label: 'Completed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

export interface Application {
    id: string;
    referenceId?: string;
    propertyId?: string;
    userId?: string;
    status: ApplicationStatus;
    createdAt: string;
    updatedAt?: string;
    property?: any;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyImage?: string;
    propertyPrice?: number;
    propertyType?: string;
    agentName?: string;
    agentAgency?: string;
    agentEmail?: string;
    agentPhone?: string;
    listingType?: string;
    submittedDate?: string;
    lastUpdated?: string;
    requiresAction?: boolean;
    hasAppointment?: boolean;
    deadline?: string;
    appointment?: {
        date: string;
        time: string;
    };
}

interface ApplicationsContextType {
    applications: Application[];
    createApplication: (data: any) => Promise<{ success: boolean; error?: any }>;
    isLoading: boolean;
    error: string | null;
    allApplications: Application[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    propertyTypeFilter: string;
    setPropertyTypeFilter: (type: string) => void;
    dateRangeFilter: { start: string | null; end: string | null };
    setDateRangeFilter: (range: { start: string | null; end: string | null }) => void;
    fetchApplications: () => Promise<void>;
    withdrawApplication: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
    updateApplicationStatus: (id: string, status: string) => Promise<{ success: boolean; error?: string }>;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

const buildReferenceId = (id: string) => `APP-${id.slice(0, 8).toUpperCase()}`;

const toImageUrl = (value?: string | null) => {
    if (!value) {
        return PROPERTY_PLACEHOLDER_IMAGE;
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0]) {
            return parsed[0];
        }
    } catch {
        // The backend may already return a plain URL.
    }

    return value;
};

const deriveAppointment = (viewing?: Viewing) => {
    if (!viewing?.scheduled_at) {
        return undefined;
    }

    const scheduledAt = new Date(viewing.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
        return undefined;
    }

    return {
        date: scheduledAt.toISOString(),
        time: scheduledAt.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
};

const deriveStatusFromViewing = (application: BackendApplication, viewing?: Viewing): ApplicationStatus => {
    if (application.status === APPLICATION_STATUS.APPROVED) return APPLICATION_STATUS.APPROVED;
    if (application.status === APPLICATION_STATUS.REJECTED) return APPLICATION_STATUS.REJECTED;
    if (application.status === APPLICATION_STATUS.WITHDRAWN) return APPLICATION_STATUS.WITHDRAWN;
    if (application.status === APPLICATION_STATUS.COMPLETED) return APPLICATION_STATUS.COMPLETED;
    if (application.status === APPLICATION_STATUS.VIEWING_SCHEDULED) return APPLICATION_STATUS.VIEWING_SCHEDULED;
    if (application.status === APPLICATION_STATUS.VIEWING_COMPLETED) return APPLICATION_STATUS.VIEWING_COMPLETED;
    if (application.status === APPLICATION_STATUS.APPOINTMENT_BOOKED) return APPLICATION_STATUS.APPOINTMENT_BOOKED;
    if (application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED) return APPLICATION_STATUS.DOCUMENTS_REQUESTED;
    if (application.status === APPLICATION_STATUS.UNDER_REVIEW) return APPLICATION_STATUS.UNDER_REVIEW;
    if (application.status === APPLICATION_STATUS.VERIFICATION_IN_PROGRESS) return APPLICATION_STATUS.VERIFICATION_IN_PROGRESS;
    if (application.status === APPLICATION_STATUS.DRAFT) return APPLICATION_STATUS.DRAFT;
    if (application.status === APPLICATION_STATUS.PENDING) return APPLICATION_STATUS.PENDING;

    if (viewing) {
        if (viewing.status === 'completed') {
            return APPLICATION_STATUS.VIEWING_COMPLETED;
        }
        if (viewing.status === 'pending' || viewing.status === 'confirmed' || viewing.status === 'rescheduled') {
            return APPLICATION_STATUS.VIEWING_SCHEDULED;
        }
    }

    return APPLICATION_STATUS.SUBMITTED;
};

const mapBackendApplication = (application: BackendApplication, relatedViewing?: Viewing): Application => ({
    id: application.id,
    referenceId: buildReferenceId(application.id),
    propertyId: application.property_id,
    userId: application.user_id,
    status: deriveStatusFromViewing(application, relatedViewing),
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    propertyTitle: application.property_title || 'Property',
    propertyAddress: application.property_address || 'Address unavailable',
    propertyImage: toImageUrl(application.property_image),
    propertyPrice: application.property_price,
    propertyType: application.property_type || 'property',
    agentName: application.agent_name || '',
    agentAgency: application.agent_agency || '',
    agentEmail: application.agent_email || '',
    agentPhone: application.agent_phone || '',
    listingType: application.listing_type || 'sale',
    submittedDate: application.created_at,
    lastUpdated: application.updated_at || application.created_at,
    requiresAction: application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED,
    hasAppointment: !!relatedViewing && relatedViewing.status !== 'cancelled',
    appointment: deriveAppointment(relatedViewing),
});

export const ApplicationsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

    const fetchApplications = async () => {
        if (!user) {
            setApplications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const [applicationsResult, viewingsResult] = await Promise.all([
            getBackendApplications(),
            getViewings().catch(() => [] as Viewing[]),
        ]);

        if (applicationsResult.error) {
            setError(applicationsResult.error);
            setApplications([]);
            setIsLoading(false);
            return;
        }

        const relatedViewings = Array.isArray(viewingsResult) ? viewingsResult : [];
        const mappedApplications = (applicationsResult.data || []).map((application) => (
            mapBackendApplication(application, findRelatedViewing(application, relatedViewings))
        ));

        setApplications(mappedApplications);
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchApplications();
            return;
        }

        setApplications([]);
        setIsLoading(false);
    }, [user]);

    const createApplication = async (data: any) => {
        const propertyId = data.property_id || data.propertyId;
        const managerId = data.manager_id || data.managerId;
        const moveInDate = data.move_in_date || data.moveInDate;

        if (!propertyId) {
            return { success: false, error: 'Property ID is required' };
        }
        if (!managerId) {
            return { success: false, error: 'Manager ID is required' };
        }
        if (!moveInDate) {
            return { success: false, error: 'Move-in date is required' };
        }

        const { data: application, error: createError } = await createBackendApplication({
            property_id: propertyId,
            manager_id: managerId,
            lead_id: data.lead_id || data.leadId,
            fast_track_case_id: data.fast_track_case_id || data.fastTrackCaseId,
            applicant_name: data.applicant_name || data.personal_info?.full_name || data.fullName,
            applicant_email: data.applicant_email || data.personal_info?.email || data.email,
            applicant_phone: data.applicant_phone || data.personal_info?.phone || data.phone,
            property_title: data.property_title,
            property_address: data.property_address,
            property_image: data.property_image,
            property_type: data.property_type,
            listing_type: data.listing_type,
            property_price: data.property_price,
            agent_name: data.agent_name,
            agent_email: data.agent_email,
            agent_phone: data.agent_phone,
            agent_agency: data.agent_agency,
            conversation_id: data.conversation_id,
            move_in_date: moveInDate,
            lease_duration_months: data.lease_duration_months,
            employment_status: data.employment_status || data.financial_info?.employment_status,
            employer_name: data.employer_name || data.financial_info?.employer,
            annual_income: data.annual_income || data.financial_info?.annual_income,
            current_address: data.current_address || data.personal_info?.address,
            message: data.message || data.notes,
        });

        if (createError || !application) {
            return { success: false, error: createError || 'Failed to submit application' };
        }

        await fetchApplications();
        return { success: true };
    };

    const withdrawApplication = async (id: string) => {
        const { data, error: updateError } = await withdrawBackendApplication(id);

        if (updateError || !data) {
            return { success: false, error: updateError || 'Failed to withdraw application' };
        }

        await fetchApplications();
        return { success: true };
    };

    const updateApplicationStatus = async (id: string, status: string) => {
        if (status === APPLICATION_STATUS.WITHDRAWN) {
            return withdrawApplication(id);
        }

        const { data, error: updateError } = await updateBackendApplicationStatus(id, status);

        if (updateError || !data) {
            return { success: false, error: updateError || 'Failed to update application status' };
        }

        await fetchApplications();
        return { success: true };
    };

    const filteredApplications = useMemo(() => {
        let filtered = [...applications];

        if (statusFilter !== 'all') {
            filtered = filtered.filter((application) => application.status === statusFilter);
        }

        if (propertyTypeFilter !== 'all') {
            filtered = filtered.filter((application) => application.propertyType === propertyTypeFilter);
        }

        if (dateRangeFilter.start) {
            const start = new Date(dateRangeFilter.start);
            filtered = filtered.filter((application) => new Date(application.createdAt) >= start);
        }

        if (dateRangeFilter.end) {
            const end = new Date(dateRangeFilter.end);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter((application) => new Date(application.createdAt) <= end);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((application) =>
                application.propertyTitle?.toLowerCase().includes(query) ||
                application.propertyAddress?.toLowerCase().includes(query) ||
                application.referenceId?.toLowerCase().includes(query),
            );
        }

        return filtered.sort(
            (left, right) =>
                new Date(right.lastUpdated || right.createdAt).getTime() -
                new Date(left.lastUpdated || left.createdAt).getTime(),
        );
    }, [applications, dateRangeFilter.end, dateRangeFilter.start, propertyTypeFilter, searchQuery, statusFilter]);

    return (
        <ApplicationsContext.Provider value={{
            applications: filteredApplications,
            allApplications: applications,
            createApplication,
            isLoading,
            error,
            searchQuery,
            setSearchQuery,
            statusFilter,
            setStatusFilter,
            propertyTypeFilter,
            setPropertyTypeFilter,
            dateRangeFilter,
            setDateRangeFilter,
            fetchApplications,
            withdrawApplication,
            updateApplicationStatus,
        }}>
            {children}
        </ApplicationsContext.Provider>
    );
};

export const useApplications = () => {
    const context = useContext(ApplicationsContext);
    if (context === undefined) {
        throw new Error('useApplications must be used within an ApplicationsProvider');
    }
    return context;
};
