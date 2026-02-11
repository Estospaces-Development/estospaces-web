"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserLeads, Lead as BackendLead } from '../services/leadsService';

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
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

export const ApplicationsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

    const fetchApplications = async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await getUserLeads();

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
                lastUpdated: lead.updated_at || lead.created_at,
                requiresAction: lead.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED,
                // In a real app, these would come from the lead data or another endpoint
                hasAppointment: false,
            }));
            setApplications(transformed);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchApplications();
        }
    }, [user]);

    const createApplication = async (data: any) => {
        // This should call a backend service to create a lead
        return { success: true };
    };

    // Filter logic
    const filteredApplications = React.useMemo(() => {
        let filtered = [...applications];

        if (statusFilter !== 'all') {
            filtered = filtered.filter((app) => app.status === statusFilter);
        }

        if (propertyTypeFilter !== 'all') {
            filtered = filtered.filter((app) => app.propertyType === propertyTypeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((app) =>
                app.propertyTitle?.toLowerCase().includes(query) ||
                app.propertyAddress?.toLowerCase().includes(query) ||
                app.referenceId?.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) => new Date(b.lastUpdated || b.createdAt).getTime() - new Date(a.lastUpdated || a.createdAt).getTime());
    }, [applications, statusFilter, propertyTypeFilter, searchQuery]);

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
            fetchApplications
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
