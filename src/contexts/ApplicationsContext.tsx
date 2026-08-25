"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    Application as BackendApplication,
    type AMLReview,
    type BuyerQualification,
    createApplication as createBackendApplication,
    getApplications as getBackendApplications,
    updateApplicationStatus as updateBackendApplicationStatus,
    withdrawApplication as withdrawBackendApplication,
} from '@/services/applicationsService';
import { getViewings, type Viewing } from '@/services/bookingsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { getPropertyById } from '@/services/propertyService';
import { getSaleProgressions, type SaleProgression, updateSaleProgression } from '@/services/salesService';
import { buildApplicationPropertySnapshot, findRelatedViewing } from '@/lib/applicationWorkflow';
import { getRentalApplicationFastTrackBlocker } from '@/lib/rentalApplicationGate';
import {
    attachLinkedFastTrackCase,
    applicationStatusToFastTrackDecisionOutcome,
    findLinkedFastTrackCase,
    syncFastTrackCompanionAction,
} from '@/lib/fastTrackCompanion';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import { getSaleJourneyStageLabel, getSaleJourneySummary, resolveSaleJourneyDisplayStage, saleProgressionStageForStatus, shouldUseSaleProgressionStatusUpdate, isSaleProgressionRecord } from '@/lib/saleJourney';
import { findLinkedSaleProgression } from '@/lib/workspaceLinks';
import type { JourneyAction, JourneyBlocker, JourneyDeadline, JourneyRequirement } from '@/types/journey';
import { usePublishWorkspaceSync, useWorkspaceRefresh } from './WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { LAUNCH_CURRENCY_CODE } from '@/lib/launchLocale';
import {
    getApplicationPropertyDisplayTitle,
    isApplicationWorkflowTitle,
    isApplicationWorkflowStatusTitle,
    isInternalApplicationTitle,
} from '@/lib/applicationDisplayTitle';

export type PropertyContext = {
    title?: string;
    address?: string;
    image?: string;
    price?: number;
    country?: string;
    currency?: string;
    propertyType?: string;
    agentName?: string;
    agentAgency?: string;
    agentEmail?: string;
    agentPhone?: string;
};

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
    BUYER_QUALIFICATION: 'buyer_qualification',
    OFFER_READY: 'offer_ready',
    OFFER_SUBMITTED: 'offer_submitted',
    OFFER_UNDER_REVIEW: 'offer_under_review',
    OFFER_ACCEPTED: 'offer_accepted',
    SALE_AGREED: 'sale_agreed',
    MEMORANDUM_ISSUED: 'memorandum_issued',
    CONVEYANCING: 'conveyancing',
    EXCHANGE: 'exchange',
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
    buyer_qualification: { label: 'Buyer Qualification', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
    offer_ready: { label: 'Offer Ready', color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
    offer_submitted: { label: 'Offer Submitted', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    offer_under_review: { label: 'Offer Under Review', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
    offer_accepted: { label: 'Offer Accepted', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    sale_agreed: { label: 'Sale Agreed', color: 'green', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    memorandum_issued: { label: 'Memorandum Issued', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    conveyancing: { label: 'Conveyancing', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
    exchange: { label: 'Exchange', color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
    approved: { label: 'Approved', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    rejected: { label: 'Rejected', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
    withdrawn: { label: 'Withdrawn', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
    completed: { label: 'Completed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

export interface Application {
    id: string;
    source?: 'application' | 'sale_progression';
    referenceId?: string;
    propertyId?: string;
    userId?: string;
    brokerRequestId?: string;
    leadId?: string;
    fastTrackCaseId?: string;
    managerId?: string;
    conversationId?: string;
    status: ApplicationStatus;
    createdAt: string;
    updatedAt?: string;
    property?: any;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyImage?: string;
    propertyPrice?: number;
    propertyCountry?: string;
    propertyCurrency?: string;
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
    liveStage?: string;
    stageGroup?: string;
    jurisdictionProfile?: string;
    journeyStatusReason?: string;
    blockers?: JourneyBlocker[];
    deadlines?: JourneyDeadline[];
    requiredEvidence?: JourneyRequirement[];
    nextActions?: JourneyAction[];
    buyerQualification?: BuyerQualification | null;
    amlReview?: AMLReview | null;
    journeyLabel?: string;
    journeySummary?: string;
    fastTrackCase?: FastTrackCase;
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
    updateApplicationStatus: (id: string, status: string, reviewNotes?: string) => Promise<{ success: boolean; error?: string }>;
    registerConsumer: () => () => void;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

export const isCurrentApplicationsFetch = (fetchRevision: number, currentRevision: number) => (
    fetchRevision === currentRevision
);

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

const buildJourneyKey = (payload: {
    propertyId?: string | null;
    userId?: string | null;
    leadId?: string | null;
    fastTrackCaseId?: string | null;
}) => {
    if (payload.fastTrackCaseId) {
        return `case:${payload.fastTrackCaseId}`;
    }
    if (payload.leadId) {
        return `lead:${payload.leadId}`;
    }
    return `property:${payload.propertyId || 'unknown'}:user:${payload.userId || 'unknown'}`;
};

const getPropertyAddress = (property: Awaited<ReturnType<typeof getPropertyById>>['data']) => {
    if (!property) {
        return undefined;
    }

    return [
        property.address_line_1,
        property.address_line_2,
        property.city,
        property.postcode,
        property.country,
    ].filter(Boolean).join(', ');
};

export const buildPropertyContextFromProperty = (
    property: Awaited<ReturnType<typeof getPropertyById>>['data'],
): PropertyContext | undefined => {
    if (!property) {
        return undefined;
    }

    return {
        title: property.title,
        address: getPropertyAddress(property),
        image: getPrimaryPropertyImage(property) || undefined,
        price: property.price,
        country: property.country,
        currency: property.currency,
        propertyType: property.property_type,
        agentName: property.agent_name,
        agentAgency: property.agent_company,
        agentEmail: property.agent_email,
        agentPhone: property.agent_phone,
    };
};

export const hydrateMissingSaleProgressionPropertyContexts = async (
    saleProgressions: SaleProgression[],
    propertyContextById: Map<string, PropertyContext>,
    fetchPropertyById = getPropertyById,
) => {
    const missingPropertyIds = Array.from(new Set(
        saleProgressions
            .map((progression) => progression.property_id)
            .filter((propertyId) => propertyId && !propertyContextById.has(propertyId)),
    ));

    await Promise.all(missingPropertyIds.map(async (propertyId) => {
        const { data: property } = await fetchPropertyById(propertyId);
        const propertyContext = buildPropertyContextFromProperty(property);
        if (propertyContext) {
            propertyContextById.set(propertyId, propertyContext);
        }
    }));
};

export const hydrateApplicationPropertyContexts = async (
    applications: Array<Pick<BackendApplication, 'property_id'>>,
    propertyContextById: Map<string, PropertyContext>,
    fetchPropertyById: (propertyId: string) => ReturnType<typeof getPropertyById> = (propertyId) =>
        getPropertyById(propertyId, { suppressErrorToast: true }),
) => {
    const propertyIds = Array.from(new Set(
        applications.map((application) => application.property_id).filter(Boolean),
    ));

    await Promise.all(propertyIds.map(async (propertyId) => {
        const { data: property } = await fetchPropertyById(propertyId);
        const propertyContext = buildPropertyContextFromProperty(property);
        if (propertyContext) {
            propertyContextById.set(propertyId, propertyContext);
        }
    }));
};

const hasUsableApplicationAddress = (address: unknown) => {
    const normalizedAddress = String(address || '').trim();

    return Boolean(normalizedAddress)
        && !/^(address unavailable|location unavailable|unknown address|n\/a|na)$/i.test(normalizedAddress)
        && !isInternalApplicationTitle(normalizedAddress);
};

const normalizeApplicationSnapshotText = (value: unknown) => String(value || '').trim();

const usablePropertyContextText = (value: unknown) => String(value || '').trim();

export const mergePropertyContexts = (
    primary: PropertyContext | undefined,
    fallback: PropertyContext | undefined,
): PropertyContext => ({
    title: usablePropertyContextText(primary?.title) && !isInternalApplicationTitle(primary?.title)
        ? primary?.title
        : fallback?.title,
    address: hasUsableApplicationAddress(primary?.address) ? primary?.address : fallback?.address,
    image: usablePropertyContextText(primary?.image) ? primary?.image : fallback?.image,
    price: Number.isFinite(primary?.price) && Number(primary?.price) > 0 ? primary?.price : fallback?.price,
    country: usablePropertyContextText(primary?.country) ? primary?.country : fallback?.country,
    currency: usablePropertyContextText(primary?.currency) ? primary?.currency : fallback?.currency,
    propertyType: usablePropertyContextText(primary?.propertyType) ? primary?.propertyType : fallback?.propertyType,
    agentName: usablePropertyContextText(primary?.agentName) ? primary?.agentName : fallback?.agentName,
    agentAgency: usablePropertyContextText(primary?.agentAgency) ? primary?.agentAgency : fallback?.agentAgency,
    agentEmail: usablePropertyContextText(primary?.agentEmail) ? primary?.agentEmail : fallback?.agentEmail,
    agentPhone: usablePropertyContextText(primary?.agentPhone) ? primary?.agentPhone : fallback?.agentPhone,
});

export const applicationNeedsCurrentPropertyContext = (application: Pick<
    BackendApplication,
    | 'property_title'
    | 'property_address'
    | 'property_country'
    | 'property_currency'
    | 'property_image'
    | 'property_price'
    | 'property_type'
    | 'agent_name'
> & Partial<Pick<BackendApplication, 'status' | 'liveStage'>>) => {
    return !String(application.property_title || '').trim()
        || isInternalApplicationTitle(application.property_title)
        || isApplicationWorkflowStatusTitle(application.property_title, application.status, application.liveStage)
        || !hasUsableApplicationAddress(application.property_address)
        || !String(application.property_image || '').trim()
        || !Number.isFinite(application.property_price)
        || Number(application.property_price) <= 0
        || !String(application.property_country || '').trim()
        || !String(application.property_currency || '').trim()
        || !String(application.property_type || '').trim()
        || !String(application.agent_name || '').trim();
};

const findRelatedSaleViewing = (
    progression: SaleProgression,
    viewings: Viewing[],
) => {
    const directMatch = viewings
        .filter((viewing) =>
            viewing.property_id === progression.property_id &&
            viewing.user_id === progression.user_id &&
            viewing.status !== 'cancelled',
        )
        .sort((left, right) => new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime())[0];

    return directMatch;
};

const mapSaleProgressionStatus = (progression: SaleProgression): ApplicationStatus => {
    switch (progression.current_stage) {
        case 'offer_under_review':
            return APPLICATION_STATUS.OFFER_UNDER_REVIEW;
        case 'offer_accepted':
            return APPLICATION_STATUS.OFFER_ACCEPTED;
        case 'sale_agreed':
            return APPLICATION_STATUS.SALE_AGREED;
        case 'memorandum_issued':
            return APPLICATION_STATUS.MEMORANDUM_ISSUED;
        case 'conveyancing':
            return APPLICATION_STATUS.CONVEYANCING;
        case 'exchange':
            return APPLICATION_STATUS.EXCHANGE;
        case 'completion':
            return APPLICATION_STATUS.COMPLETED;
        case 'offer_submitted':
        default:
            return APPLICATION_STATUS.OFFER_SUBMITTED;
    }
};

const getSaleJourneyCopy = (status: ApplicationStatus) => {
    switch (status) {
        case APPLICATION_STATUS.OFFER_UNDER_REVIEW:
            return {
                label: 'Offer Under Review',
                summary: 'The broker or manager is reviewing the submitted purchase offer.',
            };
        case APPLICATION_STATUS.OFFER_ACCEPTED:
            return {
                label: 'Offer Accepted',
                summary: 'The offer is accepted and the sale is moving toward the memorandum stage.',
            };
        case APPLICATION_STATUS.SALE_AGREED:
            return {
                label: 'Sale Agreed',
                summary: 'The purchase is agreed in principle and the deal pack is being prepared.',
            };
        case APPLICATION_STATUS.MEMORANDUM_ISSUED:
            return {
                label: 'Memorandum Issued',
                summary: 'The memorandum is issued and legal coordination is underway.',
            };
        case APPLICATION_STATUS.CONVEYANCING:
            return {
                label: 'Conveyancing',
                summary: 'Legal checks, searches, and document review are active now.',
            };
        case APPLICATION_STATUS.EXCHANGE:
            return {
                label: 'Exchange',
                summary: 'The purchase is approaching exchange and final completion.',
            };
        case APPLICATION_STATUS.COMPLETED:
            return {
                label: 'Completed',
                summary: 'The sale has completed successfully.',
            };
        case APPLICATION_STATUS.OFFER_SUBMITTED:
        default:
            return {
                label: 'Offer Submitted',
                summary: 'The purchase offer is now logged against the selected property.',
            };
    }
};

const deriveStatusFromViewing = (application: BackendApplication, viewing?: Viewing): ApplicationStatus => {
    if (application.status === APPLICATION_STATUS.APPROVED) return APPLICATION_STATUS.APPROVED;
    if (application.status === APPLICATION_STATUS.REJECTED) return APPLICATION_STATUS.REJECTED;
    if (application.status === APPLICATION_STATUS.WITHDRAWN) return APPLICATION_STATUS.WITHDRAWN;
    if (application.status === APPLICATION_STATUS.COMPLETED) return APPLICATION_STATUS.COMPLETED;
    if (application.status === APPLICATION_STATUS.BUYER_QUALIFICATION) return APPLICATION_STATUS.BUYER_QUALIFICATION;
    if (application.status === APPLICATION_STATUS.OFFER_READY) return APPLICATION_STATUS.OFFER_READY;
    if (application.status === APPLICATION_STATUS.OFFER_SUBMITTED) return APPLICATION_STATUS.OFFER_SUBMITTED;
    if (application.status === APPLICATION_STATUS.OFFER_UNDER_REVIEW) return APPLICATION_STATUS.OFFER_UNDER_REVIEW;
    if (application.status === APPLICATION_STATUS.OFFER_ACCEPTED) return APPLICATION_STATUS.OFFER_ACCEPTED;
    if (application.status === APPLICATION_STATUS.SALE_AGREED) return APPLICATION_STATUS.SALE_AGREED;
    if (application.status === APPLICATION_STATUS.MEMORANDUM_ISSUED) return APPLICATION_STATUS.MEMORANDUM_ISSUED;
    if (application.status === APPLICATION_STATUS.CONVEYANCING) return APPLICATION_STATUS.CONVEYANCING;
    if (application.status === APPLICATION_STATUS.EXCHANGE) return APPLICATION_STATUS.EXCHANGE;
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

export const mapBackendApplication = (
    application: BackendApplication,
    relatedViewing?: Viewing,
    propertyContext?: PropertyContext,
): Application => {
    const displayStage = resolveSaleJourneyDisplayStage({
        source: 'application',
        status: application.status,
        liveStage: application.liveStage,
    });
    const snapshotTitle = String(application.property_title || '').trim();
    const snapshotAddress = String(application.property_address || '').trim();
    const snapshotImage = String(application.property_image || '').trim();
    const snapshotPrice = Number(application.property_price);
    const snapshotTitleIsWorkflowStatus = isApplicationWorkflowTitle(snapshotTitle);
    const fallbackTitle = String(propertyContext?.title || '').trim();
    const fallbackTitleIsWorkflowStatus = isApplicationWorkflowTitle(fallbackTitle);
    const propertyAddress = hasUsableApplicationAddress(snapshotAddress)
        ? snapshotAddress
        : propertyContext?.address || 'Address unavailable';
    const propertyTitle = getApplicationPropertyDisplayTitle(
        snapshotTitle && !isInternalApplicationTitle(snapshotTitle) && !snapshotTitleIsWorkflowStatus
            ? snapshotTitle
            : fallbackTitle && !isInternalApplicationTitle(fallbackTitle) && !fallbackTitleIsWorkflowStatus
                ? fallbackTitle
                : undefined,
        propertyAddress,
        'Property',
    );

    return {
        id: application.id,
        source: 'application',
        referenceId: buildReferenceId(application.id),
        propertyId: application.property_id,
        userId: application.user_id,
        brokerRequestId: application.broker_request_id || undefined,
        leadId: application.lead_id || undefined,
        fastTrackCaseId: application.fast_track_case_id || undefined,
        managerId: application.manager_id || undefined,
        conversationId: application.conversation_id || undefined,
        status: deriveStatusFromViewing(application, relatedViewing),
        createdAt: application.created_at,
        updatedAt: application.updated_at,
        propertyTitle,
        propertyAddress,
        propertyImage: toImageUrl(snapshotImage || propertyContext?.image),
        propertyPrice: Number.isFinite(snapshotPrice) && snapshotPrice > 0
            ? snapshotPrice
            : propertyContext?.price ?? application.property_price,
        propertyCountry: normalizeApplicationSnapshotText(application.property_country) || propertyContext?.country,
        propertyCurrency: normalizeApplicationSnapshotText(application.property_currency) || propertyContext?.currency,
        propertyType: normalizeApplicationSnapshotText(application.property_type) || propertyContext?.propertyType || 'property',
        agentName: normalizeApplicationSnapshotText(application.agent_name) || propertyContext?.agentName || '',
        agentAgency: normalizeApplicationSnapshotText(application.agent_agency) || propertyContext?.agentAgency || '',
        agentEmail: normalizeApplicationSnapshotText(application.agent_email) || propertyContext?.agentEmail || '',
        agentPhone: normalizeApplicationSnapshotText(application.agent_phone) || propertyContext?.agentPhone || '',
        listingType: application.listing_type || 'sale',
        submittedDate: application.created_at,
        lastUpdated: application.updated_at || application.created_at,
        requiresAction: application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED,
        hasAppointment: !!relatedViewing && relatedViewing.status !== 'cancelled',
        appointment: deriveAppointment(relatedViewing),
        jurisdictionProfile: application.jurisdictionProfile,
        liveStage: application.liveStage,
        stageGroup: application.stageGroup,
        journeyStatusReason: application.journeyStatusReason,
        blockers: application.blockers || [],
        deadlines: application.deadlines || [],
        requiredEvidence: application.requiredEvidence || [],
        nextActions: application.nextActions || [],
        journeyLabel: displayStage ? getSaleJourneyStageLabel(displayStage) : undefined,
        journeySummary: displayStage ? getSaleJourneySummary(displayStage, application.journeyStatusReason) : application.journeyStatusReason,
    };
};

const mapSaleProgression = (
    progression: SaleProgression,
    propertyContext: PropertyContext | undefined,
    relatedViewing?: Viewing,
): Application => {
    const status = mapSaleProgressionStatus(progression);
    const journeyCopy = getSaleJourneyCopy(status);
    const propertyAddress = propertyContext?.address || 'Address unavailable';
    const propertyTitle = getApplicationPropertyDisplayTitle(propertyContext?.title, propertyAddress, 'Purchase progression');

    return {
        id: progression.id,
        source: 'sale_progression',
        referenceId: `PUR-${progression.id.slice(0, 8).toUpperCase()}`,
        propertyId: progression.property_id,
        userId: progression.user_id,
        leadId: progression.lead_id || undefined,
        fastTrackCaseId: progression.fast_track_case_id || undefined,
        managerId: progression.manager_id || undefined,
        status,
        createdAt: progression.created_at,
        updatedAt: progression.updated_at,
        propertyTitle,
        propertyAddress,
        propertyImage: toImageUrl(propertyContext?.image),
        propertyPrice: propertyContext?.price,
        propertyCountry: propertyContext?.country,
        propertyCurrency: propertyContext?.currency,
        propertyType: propertyContext?.propertyType || 'property',
        agentName: propertyContext?.agentName || relatedViewing?.agent_name || '',
        agentAgency: propertyContext?.agentAgency || relatedViewing?.agent_agency || '',
        agentEmail: propertyContext?.agentEmail || relatedViewing?.agent_email || '',
        agentPhone: propertyContext?.agentPhone || relatedViewing?.agent_phone || '',
        listingType: 'sale',
        submittedDate: progression.created_at,
        lastUpdated: progression.updated_at,
        requiresAction: false,
        hasAppointment: !!relatedViewing && relatedViewing.status !== 'cancelled',
        journeyLabel: journeyCopy.label,
        journeySummary: journeyCopy.summary,
        appointment: deriveAppointment(relatedViewing),
        jurisdictionProfile: progression.jurisdictionProfile,
        liveStage: progression.liveStage,
        stageGroup: progression.stageGroup,
        journeyStatusReason: progression.journeyStatusReason,
        blockers: progression.blockers || [],
        deadlines: progression.deadlines || [],
        requiredEvidence: progression.requiredEvidence || [],
        nextActions: progression.nextActions || [],
    };
};

export const ApplicationsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
    const syncTags = useMemo(() => [
        WORKSPACE_SYNC_TAGS.APPLICATIONS,
        WORKSPACE_SYNC_TAGS.VIEWINGS,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.CONTRACTS,
        WORKSPACE_SYNC_TAGS.PAYMENTS,
    ], []);
    const [consumerCount, setConsumerCount] = useState(0);
    const registerConsumer = useCallback(() => {
        setConsumerCount((count) => count + 1);
        let registered = true;

        return () => {
            if (!registered) {
                return;
            }
            registered = false;
            setConsumerCount((count) => Math.max(0, count - 1));
        };
    }, []);
    const fetchRevisionRef = useRef(0);

    const fetchApplications = useCallback(async () => {
        const fetchRevision = ++fetchRevisionRef.current;
        const isCurrentFetch = () => isCurrentApplicationsFetch(fetchRevision, fetchRevisionRef.current);
        if (!user) {
            setApplications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const [fastTrackCasesResult, applicationsResult, viewingsResult, saleProgressionsResult] = await Promise.all([
            getFastTrackCases({ suppressErrorToast: true }),
            getBackendApplications({ suppressErrorToast: true }),
            getViewings().catch(() => [] as Viewing[]),
            getSaleProgressions({ suppressErrorToast: true }),
        ]);

        if (!isCurrentFetch()) {
            return;
        }

        if (applicationsResult.error) {
            setError(applicationsResult.error);
            setApplications([]);
            setIsLoading(false);
            return;
        }

        const relatedViewings = Array.isArray(viewingsResult) ? viewingsResult : [];
        const propertyContextById = new Map<string, PropertyContext>();
        const refreshedApplicationPropertyContextById = new Map<string, PropertyContext>();

        (applicationsResult.data || []).forEach((application) => {
            if (!application.property_id) {
                return;
            }

            propertyContextById.set(application.property_id, {
                title: application.property_title,
                address: application.property_address,
                image: application.property_image,
                price: application.property_price,
                country: application.property_country,
                currency: application.property_currency,
                propertyType: application.property_type,
                agentName: application.agent_name,
                agentAgency: application.agent_agency,
                agentEmail: application.agent_email,
                agentPhone: application.agent_phone,
            });
        });

        relatedViewings.forEach((viewing) => {
            if (!viewing.property_id) {
                return;
            }

            propertyContextById.set(
                viewing.property_id,
                mergePropertyContexts(propertyContextById.get(viewing.property_id), {
                    title: viewing.property_title,
                    address: viewing.property_address,
                    image: viewing.property_image,
                    price: viewing.property_price,
                    country: (viewing as any).property_country,
                    currency: (viewing as any).property_currency,
                    propertyType: viewing.listing_type,
                    agentName: viewing.agent_name,
                    agentAgency: viewing.agent_agency,
                    agentEmail: viewing.agent_email,
                    agentPhone: viewing.agent_phone,
                }),
            );
        });

        const backendApplications = applicationsResult.data || [];
        const saleProgressions = saleProgressionsResult.data || [];
        if (!isCurrentFetch()) {
            return;
        }
        await hydrateMissingSaleProgressionPropertyContexts(saleProgressions, propertyContextById);

        if (!isCurrentFetch()) {
            return;
        }

        const saleProgressionKeys = new Set(
            saleProgressions.map((progression) =>
                buildJourneyKey({
                    propertyId: progression.property_id,
                    userId: progression.user_id,
                    leadId: progression.lead_id,
                    fastTrackCaseId: progression.fast_track_case_id,
                }),
            ),
        );

        const fastTrackCases = fastTrackCasesResult.data || [];
        const publishApplications = () => {
            if (!isCurrentFetch()) {
                return;
            }

            const mappedApplications = backendApplications
                .filter((application) => {
                    if (application.listing_type !== 'sale') {
                        return true;
                    }

                    return !saleProgressionKeys.has(
                        buildJourneyKey({
                            propertyId: application.property_id,
                            userId: application.user_id,
                            leadId: application.lead_id,
                            fastTrackCaseId: application.fast_track_case_id,
                        }),
                    );
                })
                .map((application) => (
                    mapBackendApplication(
                        application,
                        findRelatedViewing(application, relatedViewings),
                        refreshedApplicationPropertyContextById.get(application.property_id)
                            || propertyContextById.get(application.property_id),
                    )
                ));
            const mappedSaleProgressions = saleProgressions.map((progression) =>
                mapSaleProgression(
                    progression,
                    refreshedApplicationPropertyContextById.get(progression.property_id)
                        || propertyContextById.get(progression.property_id),
                    findRelatedSaleViewing(progression, relatedViewings),
                ),
            );

            setApplications(
                [...mappedApplications, ...mappedSaleProgressions]
                .map((application) => attachLinkedFastTrackCase(application, fastTrackCases))
                .sort(
                    (left, right) =>
                        new Date(right.lastUpdated || right.createdAt).getTime() -
                        new Date(left.lastUpdated || left.createdAt).getTime(),
                ),
            );
        };

        publishApplications();
        setIsLoading(false);

        const applicationsNeedingRefresh = backendApplications.filter(applicationNeedsCurrentPropertyContext);
        if (applicationsNeedingRefresh.length > 0) {
            void hydrateApplicationPropertyContexts(applicationsNeedingRefresh, refreshedApplicationPropertyContextById)
                .then(() => {
                    if (isCurrentFetch()) {
                        publishApplications();
                    }
                })
                .catch(() => {
                    // Initial application snapshots remain usable when a background refresh fails.
                });
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            fetchRevisionRef.current += 1;
            setApplications([]);
            setIsLoading(false);
            return;
        }

        if (consumerCount === 0) {
            fetchRevisionRef.current += 1;
            setIsLoading(false);
            return;
        }

        fetchApplications();
    }, [consumerCount, fetchApplications, user]);

    useWorkspaceRefresh({
        tags: syncTags,
        refresh: fetchApplications,
        enabled: Boolean(user) && consumerCount > 0,
    });

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

        const missingPropertySnapshot = [
            'property_title',
            'property_address',
            'property_image',
            'property_type',
            'listing_type',
            'property_price',
            'property_country',
            'agent_name',
            'agent_email',
            'agent_phone',
            'agent_agency',
        ].some((key) => data[key] === undefined || data[key] === null || data[key] === '');
        let propertySnapshot: Record<string, any> = {};

        if (missingPropertySnapshot) {
            const { data: property } = await getPropertyById(propertyId);
            propertySnapshot = buildApplicationPropertySnapshot(property);
        }

        const listingType = String(data.listing_type || propertySnapshot.listing_type || data.property_type || '').trim().toLowerCase();
        if (listingType === 'rent') {
            const fastTrackCasesResult = await getFastTrackCases({ suppressErrorToast: true });
            const linkedFastTrackCase = findLinkedFastTrackCase(fastTrackCasesResult.data || [], {
                caseId: data.fast_track_case_id || data.fastTrackCaseId,
                fastTrackCaseId: data.fast_track_case_id || data.fastTrackCaseId,
                leadId: data.lead_id || data.leadId,
                propertyId,
            });
            const fastTrackBlocker = getRentalApplicationFastTrackBlocker(linkedFastTrackCase);

            if (fastTrackBlocker) {
                return { success: false, error: fastTrackBlocker };
            }
        }

        const { data: application, error: createError } = await createBackendApplication({
            property_id: propertyId,
            manager_id: managerId,
            lead_id: data.lead_id || data.leadId,
            fast_track_case_id: data.fast_track_case_id || data.fastTrackCaseId,
            applicant_name: data.applicant_name || data.personal_info?.full_name || data.fullName,
            applicant_email: data.applicant_email || data.personal_info?.email || data.email,
            applicant_phone: data.applicant_phone || data.personal_info?.phone || data.phone,
            property_title: data.property_title || propertySnapshot.property_title,
            property_address: data.property_address || propertySnapshot.property_address,
            property_image: data.property_image || propertySnapshot.property_image,
            property_country: data.property_country || propertySnapshot.property_country,
            property_type: data.property_type || propertySnapshot.property_type,
            listing_type: data.listing_type || propertySnapshot.listing_type,
            property_price: data.property_price ?? propertySnapshot.property_price,
            agent_name: data.agent_name || propertySnapshot.agent_name,
            agent_email: data.agent_email || propertySnapshot.agent_email,
            agent_phone: data.agent_phone || propertySnapshot.agent_phone,
            agent_agency: data.agent_agency || propertySnapshot.agent_agency,
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
        publishWorkspaceSync({
            key: `applications:create:${application.id}`,
            source: 'mutation',
            tags: syncTags,
            reason: 'application-created',
            ids: {
                applicationId: application.id,
                propertyId: application.property_id,
                leadId: application.lead_id,
                caseId: application.fast_track_case_id,
            },
        });
        return { success: true };
    };

    const withdrawApplication = async (id: string, reason = 'Withdrawn by applicant') => {
        const application = applications.find((item) => item.id === id);
        if (isSaleProgressionRecord(application)) {
            return { success: false, error: 'Purchase progressions cannot be withdrawn from the applications workspace' };
        }

        const { data, error: updateError } = await withdrawBackendApplication(id, reason);

        if (updateError || !data) {
            return { success: false, error: updateError || 'Failed to withdraw application' };
        }

        await fetchApplications();
        publishWorkspaceSync({
            key: `applications:withdraw:${id}`,
            source: 'mutation',
            tags: syncTags,
            reason: 'application-withdrawn',
            ids: { applicationId: id },
        });
        return { success: true };
    };

    const updateApplicationStatus = async (id: string, status: string, reviewNotes?: string) => {
        if (status === APPLICATION_STATUS.WITHDRAWN) {
            return withdrawApplication(id, reviewNotes || 'Withdrawn by applicant');
        }

        const application = applications.find((item) => item.id === id);
        const fastTrackDecisionOutcome = applicationStatusToFastTrackDecisionOutcome(status);
        let syncedFastTrack = false;
        const stage = shouldUseSaleProgressionStatusUpdate(application, status)
            ? saleProgressionStageForStatus(status)
            : null;
        const progressionTarget = isSaleProgressionRecord(application)
            ? application
            : (application && stage ? findLinkedSaleProgression(applications, application) : null);

        if (progressionTarget) {
            if (!stage) {
                return { success: false, error: 'This purchase step cannot be updated from here yet' };
            }

            const { data, error: updateError } = await updateSaleProgression(progressionTarget.id, stage, reviewNotes);
            if (updateError || !data) {
                return { success: false, error: updateError || 'Failed to update purchase progression' };
            }

            if (fastTrackDecisionOutcome && application?.fastTrackCase) {
                const syncResult = await syncFastTrackCompanionAction({
                    fastTrackCase: application.fastTrackCase,
                    request: {
                        action: 'record_decision',
                        payload: {
                            outcome: fastTrackDecisionOutcome,
                            amount: application.fastTrackCase.decision.amount,
                            currency: LAUNCH_CURRENCY_CODE,
                        },
                    },
                    publishWorkspaceSync,
                    reason: `Applications companion decision: ${status}`,
                });
                if (syncResult.error || !syncResult.data) {
                    return { success: false, error: syncResult.error || 'Failed to sync fast-track decision' };
                }
                syncedFastTrack = true;
            }

            await fetchApplications();
            if (!syncedFastTrack) {
                publishWorkspaceSync({
                    key: `applications:progression:${progressionTarget.id}:${stage}`,
                    source: 'mutation',
                    tags: syncTags,
                    reason: 'sale-progression-updated',
                    ids: {
                        applicationId: application?.id,
                        caseId: progressionTarget.fastTrackCaseId,
                        leadId: progressionTarget.leadId,
                        propertyId: progressionTarget.propertyId,
                    },
                });
            }
            return { success: true };
        }

        if (application && stage) {
            return { success: false, error: 'The live purchase progression is not ready yet for this case' };
        }

        const { data, error: updateError } = await updateBackendApplicationStatus(id, status, reviewNotes);

        if (updateError || !data) {
            return { success: false, error: updateError || 'Failed to update application status' };
        }

        if (fastTrackDecisionOutcome && application?.fastTrackCase) {
            const syncResult = await syncFastTrackCompanionAction({
                fastTrackCase: application.fastTrackCase,
                request: {
                    action: 'record_decision',
                    payload: {
                        outcome: fastTrackDecisionOutcome,
                    },
                },
                publishWorkspaceSync,
                reason: `Applications companion decision: ${status}`,
            });
            if (syncResult.error || !syncResult.data) {
                return { success: false, error: syncResult.error || 'Failed to sync fast-track decision' };
            }
            syncedFastTrack = true;
        }

        await fetchApplications();
        if (!syncedFastTrack) {
            publishWorkspaceSync({
                key: `applications:update:${id}:${status}`,
                source: 'mutation',
                tags: syncTags,
                reason: 'application-status-updated',
                ids: { applicationId: id },
            });
        }
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
            registerConsumer,
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

    const { registerConsumer } = context;
    useEffect(() => registerConsumer(), [registerConsumer]);

    return context;
};
