"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getBrokerLeads, getUserLeads, Lead as BackendLead } from '../services/leadsService';

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

export const STATUS_CONFIG: Record<string, { label: string, color: string, bgColor: string, textColor: string }> = {
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

export const ApplicationsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

    const fetchApplications = async () => {
        if (!user) return;

        if (user.role === 'admin') {
            setApplications([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const endpointResult = user.role === 'manager'
            ? await getBrokerLeads()
            : await getUserLeads();

        const { data, error: fetchError } = endpointResult;

        if (fetchError) {
            setError(fetchError);
            setIsLoading(false);
            return;
        }

        if (data) {
            const transformed = data.map((lead: BackendLead) => ({
                id: lead.id,
                referenceId: lead.lead_number,
                propertyId: lead.property_id,
                userId: lead.user_id,
                status: lead.status as ApplicationStatus,
                createdAt: lead.created_at,
                updatedAt: lead.updated_at,
                propertyTitle: lead.property?.title || 'Property',
                propertyAddress: lead.property?.address_line_1 || 'UK',
                propertyImage: lead.property?.image_urls ? JSON.parse(lead.property.image_urls)[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
                propertyPrice: lead.property?.price || 0,
                propertyType: lead.property?.property_type || 'apartment',
                agentName: lead.property?.agent_name || 'Agent',
                agentAgency: 'Premier Estates',
                agentEmail: 'agent@example.com',
                agentPhone: '+44 7700 900000',
                listingType: lead.property?.property_type === 'rent' ? 'rent' : 'sale',
                submittedDate: lead.created_at,
                lastUpdated: lead.updated_at || lead.created_at,
                requiresAction: lead.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED,
                hasAppointment: false,
            }));
            setApplications(transformed);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user && pathname.startsWith(`/${user.role === 'manager' ? 'manager' : user.role === 'user' ? 'user' : 'admin'}`)) {
            fetchApplications();
        } else if (!user || user.role === 'admin') {
            setApplications([]);
            setError(null);
            setIsLoading(false);
        }
    }, [pathname, user]);

    const createApplication = async () => {
        return { success: true };
    };

    const withdrawApplication = async (id: string) => {
        setApplications((previous) => previous.map((application) =>
            application.id === id ? { ...application, status: APPLICATION_STATUS.WITHDRAWN } : application,
        ));
        return { success: true };
    };

    const updateApplicationStatus = async (id: string, status: string) => {
        setApplications((previous) => previous.map((application) =>
            application.id === id ? { ...application, status: status as ApplicationStatus } : application,
        ));
        return { success: true };
    };

    const filteredApplications = React.useMemo(() => {
        let filtered = [...applications];

        if (statusFilter !== 'all') {
            filtered = filtered.filter((application) => application.status === statusFilter);
        }

        if (propertyTypeFilter !== 'all') {
            filtered = filtered.filter((application) => application.propertyType === propertyTypeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((application) =>
                application.propertyTitle?.toLowerCase().includes(query) ||
                application.propertyAddress?.toLowerCase().includes(query) ||
                application.referenceId?.toLowerCase().includes(query),
            );
        }

        return filtered.sort((left, right) => new Date(right.lastUpdated || right.createdAt).getTime() - new Date(left.lastUpdated || left.createdAt).getTime());
    }, [applications, propertyTypeFilter, searchQuery, statusFilter]);

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
