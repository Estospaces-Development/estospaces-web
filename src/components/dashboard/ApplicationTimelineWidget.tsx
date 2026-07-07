"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Clock, MapPin, ChevronDown, Activity, FileText,
    Eye, MessageCircle, ArrowRight,
    ExternalLink, Send, Radio, UserCheck, Search, SlidersHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    getApplicationTimelineTimestamp,
    getBrokerRequestTrackingSummary,
    getStableActivityTimestamp,
    getMissingTimelinePropertyCopy,
    hasStableActivityTimestamp,
    hasTimelinePropertyDetails,
    isLiveBrokerRequest,
    resolveTimelinePropertyContext,
    type TimelinePropertyContext,
} from '@/lib/applicationTracking';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';
import { getPropertyImages } from '@/lib/propertyImages';
import PaginationBar from '@/components/ui/PaginationBar';
import { formatLaunchCurrencyForCountry } from '@/lib/launchLocale';

// --- Types & Interfaces ---

interface Stage {
    name: string;
    description: string;
    icon: any;
    color: string;
    tips?: string[];
    requiredDocs?: string[];
    status?: 'completed' | 'current' | 'upcoming';
    completedAt?: Date | null;
}

interface TimelineEventType {
    date: Date;
    event: string;
    type: 'milestone' | 'success' | 'action' | 'info';
}

interface ApplicationItem {
    id: string;
    source?: 'application' | 'viewing' | 'contract' | 'broker_request' | 'listing' | 'sale_progression';
    type: 'buy' | 'rent' | 'sell';
    currentStage: string;
    currentStageNumber: number;
    totalStages: number;
    progress: number;
    lastUpdated: Date;
    nextAction: string;
    viewingDate?: Date;
    estimatedCompletion?: string;
    property: {
        id: string;
        title: string;
        city: string | null;
        price: number | null;
        priceLabel?: string;
        country?: string | null;
        currency?: string | null;
        image_urls: string[];
    };
    broker?: {
        name: string;
        phone: string;
        avatar: string;
    };
    stages?: Stage[];
    timeline?: TimelineEventType[];
    stats?: { views: number; inquiries: number; saved: number };
    primaryActionPath?: string;
    primaryActionLabel?: string;
}

// --- Constants & Config ---

const RENT_STAGES: Stage[] = [
    { name: 'Choose your home', description: 'You picked a home and your guided journey is live.', icon: ArrowRight, color: 'blue' },
    { name: 'Book your viewing', description: 'Your viewing time is being arranged.', icon: Clock, color: 'orange' },
    { name: 'Review in progress', description: 'Your documents and checks are being reviewed.', icon: FileText, color: 'purple' },
    { name: 'Sign the agreement', description: 'Everything is ready for the agreement step.', icon: CheckCircle2, color: 'green' },
    { name: 'Move-in ready', description: 'The renting journey is complete.', icon: CheckCircle2, color: 'green' }
];

const SALE_STAGES: Stage[] = [
    { name: 'Offer sent', description: 'Your offer is recorded against the home.', icon: Send, color: 'blue' },
    { name: 'Offer accepted', description: 'The sale is agreed in principle.', icon: CheckCircle2, color: 'green' },
    { name: 'Legal steps started', description: 'The sale memo and legal steps are underway.', icon: FileText, color: 'purple' },
    { name: 'Checks in progress', description: 'Legal work and checks are moving forward.', icon: MessageCircle, color: 'orange' },
    { name: 'Ready to complete', description: 'The purchase is close to completion.', icon: CheckCircle2, color: 'green' }
];

const BROKER_REQUEST_STAGES: Stage[] = [
    { name: 'Agent request sent', description: 'Your nearest property agent request is live.', icon: Send, color: 'blue', tips: ['Keep this page open for updates'] },
    { name: 'Nearby agents contacted', description: 'We are contacting nearby property agents now.', icon: Radio, color: 'orange', tips: ['Closest available property agents are contacted first'] },
    { name: 'Agent found', description: 'A property agent accepted your request.', icon: UserCheck, color: 'green', tips: ['The same property agent stays with you until you pick a home'] },
    { name: 'Home choices shared', description: 'Your property agent shared matching homes.', icon: Eye, color: 'purple', tips: ['Choose one home to start your 24-hour journey'] },
    { name: 'Home selected', description: 'A home is selected and your journey can continue.', icon: CheckCircle2, color: 'green', tips: ['Your chosen home now carries the next step'] },
];

const getRentStageSummary = (application: any) => {
    switch (application.status) {
        case 'completed':
            return { currentStage: 'Move-in ready', currentStageNumber: 5, totalStages: 5, progress: 100, nextAction: 'Open agreement' };
        case 'ready_for_contract':
        case 'approved':
            return { currentStage: 'Sign the agreement', currentStageNumber: 4, totalStages: 5, progress: 80, nextAction: 'Review agreement' };
        case 'under_review':
        case 'referencing':
        case 'right_to_rent_pending':
        case 'documents_requested':
        case 'viewing_completed':
            return { currentStage: 'Review in progress', currentStageNumber: 3, totalStages: 5, progress: 60, nextAction: 'Wait for the next update' };
        case 'viewing_scheduled':
        case 'appointment_booked':
            return { currentStage: 'Book your viewing', currentStageNumber: 2, totalStages: 5, progress: 40, nextAction: 'Attend the viewing' };
        default:
            return { currentStage: 'Choose your home', currentStageNumber: 1, totalStages: 5, progress: 20, nextAction: 'Wait for the next step' };
    }
};

const getSaleStageSummary = (currentStage?: string, status?: string) => {
    if (currentStage === 'completion' || status === 'completed') {
        return { currentStage: 'Ready to complete', currentStageNumber: 5, totalStages: 5, progress: 100, nextAction: 'Review the latest update' };
    }
    if (currentStage === 'exchange' || currentStage === 'conveyancing') {
        return { currentStage: 'Checks in progress', currentStageNumber: 4, totalStages: 5, progress: 80, nextAction: 'Track legal progress' };
    }
    if (currentStage === 'memorandum_issued' || currentStage === 'sale_agreed') {
        return { currentStage: 'Legal steps started', currentStageNumber: 3, totalStages: 5, progress: 60, nextAction: 'Review the latest update' };
    }
    if (currentStage === 'offer_accepted') {
        return { currentStage: 'Offer accepted', currentStageNumber: 2, totalStages: 5, progress: 40, nextAction: 'Wait for the next legal step' };
    }
    return { currentStage: 'Offer sent', currentStageNumber: 1, totalStages: 5, progress: 20, nextAction: 'Wait for an update' };
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

const TIMELINE_PAGE_SIZE = 4;
type TimelineTab = 'applications' | 'viewings' | 'contracts' | 'listings';
type TimelineSort = 'updated_desc' | 'updated_asc' | 'price_desc' | 'price_asc' | 'progress_desc';

const toPropertyImages = (value: unknown) => getPropertyImages({ image_urls: value });



// --- Subcomponents ---

const StageIcon: React.FC<{ stage: Stage; size?: number }> = ({ stage, size = 20 }) => {
    const IconComponent = stage.icon || CheckCircle2;
    return <IconComponent size={size} />;
};

const formatPropertyPrice = (
    price: number | null | undefined,
    property?: { country?: string | null; currency?: string | null },
) => {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return 'Price unavailable';
    }

    return formatLaunchCurrencyForCountry(price, {
        countryCode: property?.country,
        countryName: property?.country,
        currencyCode: property?.currency,
    });
};

const formatLastUpdatedLabel = (date: Date) => (
    hasStableActivityTimestamp(date)
        ? `Updated ${formatDistanceToNow(date, { addSuffix: true })}`
        : 'Updated date unavailable'
);

const TimelineEvent: React.FC<{ event: TimelineEventType }> = ({ event }) => {
    const typeStyles = {
        milestone: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
        action: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        info: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700'
    };

    return (
        <div className="flex items-start gap-3 text-sm">
            <div className="flex-shrink-0 w-20 text-right text-xs text-gray-400 pt-0.5">
                {hasStableActivityTimestamp(event.date)
                    ? formatDistanceToNow(event.date, { addSuffix: true })
                    : 'Date unavailable'}
            </div>
            <div className={`flex-1 px-3 py-2 rounded-lg border ${typeStyles[event.type] || typeStyles.info}`}>
                {event.event}
            </div>
        </div>
    );
};

const TimelineSkeleton = () => (
    <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => (
            <div key={i} className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// --- Main Component ---

import { getApplications } from '../../services/applicationsService';
import { getContracts, getViewings } from '../../services/bookingsService';
import { getSaleProgressions } from '../../services/salesService';
import { getUserProperties } from '../../services/userPropertiesService';
import { getUserBrokerRequests } from '../../services/leadsService';
import { getPropertyById } from '../../services/propertyService';

const ApplicationTimelineWidget = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TimelineTab>('applications');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [viewingItems, setViewingItems] = useState<ApplicationItem[]>([]);
    const [contractItems, setContractItems] = useState<ApplicationItem[]>([]);
    const [listings, setListings] = useState<ApplicationItem[]>([]);
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
    const [applicationsPage, setApplicationsPage] = useState(1);
    const [viewingsPage, setViewingsPage] = useState(1);
    const [contractsPage, setContractsPage] = useState(1);
    const [listingsPage, setListingsPage] = useState(1);
    const [timelineFilter, setTimelineFilter] = useState('');
    const [timelineSort, setTimelineSort] = useState<TimelineSort>('updated_desc');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [appsRes, brokerRequestsRes, propsRes, saleProgressionsRes, viewingsRes, contractsRes] = await Promise.all([
                    getApplications({ suppressErrorToast: true }),
                    getUserBrokerRequests({ suppressErrorToast: true }),
                    getUserProperties({ limit: 50 }),
                    getSaleProgressions({ suppressErrorToast: true }),
                    getViewings({ suppressErrorToast: true }).catch(() => []),
                    getContracts().catch(() => []),
                ]);

                const viewings = Array.isArray(viewingsRes) ? viewingsRes : [];
                const contracts = Array.isArray(contractsRes) ? contractsRes : [];
                const propertyContextById = new Map<string, TimelinePropertyContext>();
                const unavailablePropertyIds = new Set<string>();
                const setPropertyContext = (
                    propertyId: string | null | undefined,
                    candidate: TimelinePropertyContext,
                    preferCandidate = false,
                ) => {
                    if (!propertyId || !hasTimelinePropertyDetails(candidate)) {
                        return;
                    }

                    const existing = propertyContextById.get(propertyId);
                    propertyContextById.set(
                        propertyId,
                        preferCandidate
                            ? resolveTimelinePropertyContext(candidate, existing)
                            : resolveTimelinePropertyContext(existing, candidate),
                    );
                };

                (appsRes.data || []).forEach((app: any) => {
                    setPropertyContext(app.property_id, {
                        title: app.property_title,
                        address: app.property_address,
                        price: app.property_price,
                        country: app.property_country,
                        currency: app.property_currency,
                        image: app.property_image,
                    });
                });

                viewings.forEach((viewing: any) => {
                    setPropertyContext(viewing.property_id, {
                        title: viewing.property_title,
                        address: viewing.property_address,
                        price: viewing.property_price,
                        country: viewing.property_country,
                        currency: viewing.property_currency,
                        image: viewing.property_image,
                    });
                });

                (propsRes.data || []).forEach((property: any) => {
                    setPropertyContext(property.id, buildPropertyContextFromProperty(property), true);
                });

                const propertyIdsNeedingHydration = Array.from(new Set([
                    ...(appsRes.data || []).map((app: any) => app.property_id),
                    ...viewings.map((viewing: any) => viewing.property_id),
                    ...contracts.map((contract: any) => contract.property_id),
                    ...(saleProgressionsRes.data || []).map((progression) => progression.property_id),
                ].filter(Boolean))).filter((propertyId) => !hasTimelinePropertyDetails(propertyContextById.get(propertyId)));

                await Promise.all(propertyIdsNeedingHydration.map(async (propertyId) => {
                    const { data: property, error } = await getPropertyById(propertyId);
                    if (!property && error) {
                        unavailablePropertyIds.add(propertyId);
                    }
                    setPropertyContext(propertyId, buildPropertyContextFromProperty(property), true);
                }));

                const saleProgressionKeys = new Set(
                    (saleProgressionsRes.data || []).map((progression) =>
                        buildJourneyKey({
                            propertyId: progression.property_id,
                            userId: progression.user_id,
                            leadId: progression.lead_id,
                            fastTrackCaseId: progression.fast_track_case_id,
                        }),
                    ),
                );

                const mappedApps: ApplicationItem[] = (appsRes.data || [])
                    .filter((app: any) => {
                        if (app.listing_type !== 'sale') {
                            return true;
                        }

                        return !saleProgressionKeys.has(
                            buildJourneyKey({
                                propertyId: app.property_id,
                                userId: app.user_id,
                                leadId: app.lead_id,
                                fastTrackCaseId: app.fast_track_case_id,
                            }),
                        );
                    })
                    .map((app: any) => {
                    const summary = app.listing_type === 'sale'
                        ? getSaleStageSummary(undefined, app.status)
                        : getRentStageSummary(app);
                    const stageIndex = Math.max(summary.currentStageNumber - 1, 0);
                    const stageList = app.listing_type === 'sale' ? SALE_STAGES : RENT_STAGES;
                    const propertyContext = propertyContextById.get(app.property_id);
                    const property = resolveTimelinePropertyContext(propertyContext, {
                        title: app.property_title,
                        address: app.property_address,
                        price: app.property_price,
                        country: app.property_country,
                        currency: app.property_currency,
                        image: app.property_image,
                    });
                    const missingPropertyCopy = getMissingTimelinePropertyCopy(
                        property,
                        Boolean(app.property_id && unavailablePropertyIds.has(app.property_id)),
                    );

                    return {
                        id: app.id,
                        source: 'application',
                        type: app.listing_type === 'sale' ? 'buy' : 'rent',
                        currentStage: summary.currentStage,
                        currentStageNumber: summary.currentStageNumber,
                        totalStages: summary.totalStages,
                        progress: summary.progress,
                        lastUpdated: getApplicationTimelineTimestamp(app),
                        nextAction: summary.nextAction,
                        estimatedCompletion: app.listing_type === 'sale' ? 'Purchase progression is live' : 'Tenancy review is live',
                        property: {
                            id: app.property_id,
                            title: String(property.title || missingPropertyCopy.title || 'Property application'),
                            city: String(property.address || missingPropertyCopy.address || '') || null,
                            price: typeof property.price === 'number' ? property.price : null,
                            priceLabel: missingPropertyCopy.priceLabel,
                            country: typeof property.country === 'string' ? property.country : null,
                            currency: typeof property.currency === 'string' ? property.currency : null,
                            image_urls: toPropertyImages(property.image),
                        },
                        stages: stageList.map((stage, index) => ({
                            ...stage,
                            status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                        })),
                    };
                });

                const mappedBrokerRequests: ApplicationItem[] = (brokerRequestsRes.data || [])
                    .filter((request) => isLiveBrokerRequest(request))
                    .map((request) => {
                        const summary = getBrokerRequestTrackingSummary(request);
                        const stageIndex = Math.max(summary.currentStageNumber - 1, 0);
                        const requestTimeline: TimelineEventType[] = [
                            {
                                date: getStableActivityTimestamp(request.created_at, request.updated_at),
                                event: 'Property agent help requested',
                                type: 'milestone',
                            },
                        ];

                        if (request.matched_broker?.name) {
                            requestTimeline.push({
                                date: getStableActivityTimestamp(request.matched_at, request.updated_at, request.created_at),
                                event: `${request.matched_broker.name} accepted your request`,
                                type: 'success',
                            });
                        } else {
                            requestTimeline.push({
                                date: getStableActivityTimestamp(request.updated_at, request.created_at),
                                event: 'We are checking nearby property agents for you',
                                type: 'info',
                            });
                        }

                        if ((request.property_shares?.length || 0) > 0) {
                            requestTimeline.push({
                                date: getStableActivityTimestamp(request.updated_at, request.created_at),
                                event: `${request.property_shares?.length || 0} home choice${request.property_shares?.length === 1 ? '' : 's'} ready to review`,
                                type: 'action',
                            });
                        }

                        if (request.selected_property?.title || request.selected_property_id) {
                            requestTimeline.push({
                                date: getStableActivityTimestamp(request.updated_at, request.created_at),
                                event: request.selected_property?.title
                                    ? `${request.selected_property.title} selected for the 24-hour journey`
                                    : 'A home has been selected for the 24-hour journey',
                                type: 'success',
                            });
                        }

                        return {
                            id: `broker-request-${request.id}`,
                            source: 'broker_request',
                            type: request.request_type === 'rent' ? 'rent' : request.request_type === 'sell' ? 'sell' : 'buy',
                            currentStage: summary.currentStage,
                            currentStageNumber: summary.currentStageNumber,
                            totalStages: summary.totalStages,
                            progress: summary.progress,
                            lastUpdated: getStableActivityTimestamp(request.updated_at, request.created_at),
                            nextAction: summary.nextAction,
                            estimatedCompletion: 'Property agent search is live',
                            property: {
                                id: request.id,
                                title: request.selected_property?.title || (request.location ? `Property agent request for ${request.location}` : 'Property agent request'),
                                city: request.selected_property?.city || request.location_postcode || request.location || null,
                                price: typeof request.selected_property?.price === 'number' ? request.selected_property.price : null,
                                country: request.selected_property?.country,
                                currency: (request.selected_property as any)?.currency || (request.selected_property as any)?.currency_code,
                                priceLabel: request.budget ? `Budget ${request.budget}` : 'Property agent request',
                                image_urls: toPropertyImages(request.selected_property?.image_urls),
                            },
                            broker: request.matched_broker ? {
                                name: request.matched_broker.name,
                                phone: request.matched_broker.phone || '',
                                avatar: '',
                            } : undefined,
                            stages: BROKER_REQUEST_STAGES.map((stage, index) => ({
                                ...stage,
                                status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                            })),
                            timeline: requestTimeline,
                            primaryActionPath: request.selected_fast_track_case_id
                                ? `/user/dashboard/fast-track?case=${request.selected_fast_track_case_id}`
                                : buildBrokerRequestWorkspacePath(request.id),
                            primaryActionLabel: request.selected_fast_track_case_id
                                ? 'Continue 24-hour journey'
                                : request.matched_broker
                                    ? 'Open agent request'
                                    : 'Track agent request',
                        };
                    });

                const mappedViewings: ApplicationItem[] = viewings.map((viewing: any) => {
                    const propertyContext = propertyContextById.get(viewing.property_id);
                    const status = String(viewing.status || '').toLowerCase();
                    const progress = status === 'completed' ? 100 : status === 'confirmed' ? 65 : status === 'cancelled' ? 0 : 35;
                    const currentStage = status === 'completed'
                        ? 'Viewing completed'
                        : status === 'confirmed'
                            ? 'Viewing confirmed'
                            : status === 'cancelled'
                                ? 'Viewing cancelled'
                                : 'Viewing requested';
                    const stageIndex = status === 'completed' ? 2 : status === 'confirmed' ? 1 : 0;

                    return {
                        id: `viewing-${viewing.id}`,
                        source: 'viewing',
                        type: viewing.listing_type === 'sale' ? 'buy' : 'rent',
                        currentStage,
                        currentStageNumber: Math.min(stageIndex + 1, 3),
                        totalStages: 3,
                        progress,
                        lastUpdated: getStableActivityTimestamp(viewing.scheduled_at, viewing.created_at),
                        viewingDate: viewing.scheduled_at ? new Date(viewing.scheduled_at) : undefined,
                        nextAction: status === 'confirmed' ? 'Attend the viewing' : status === 'completed' ? 'Review the next step' : 'Confirm viewing time',
                        estimatedCompletion: viewing.scheduled_at ? `Scheduled ${new Date(viewing.scheduled_at).toLocaleString('en-GB')}` : 'Viewing request is live',
                        property: {
                            id: viewing.property_id,
                            title: firstText(viewing.property_title, propertyContext?.title, 'Property viewing'),
                            city: buildLocationLabel(viewing.property_address) || propertyContext?.address || null,
                            price: parseMoney(viewing.property_price) || parseMoney(propertyContext?.price),
                            country: viewing.property_country || propertyContext?.country,
                            currency: viewing.property_currency || propertyContext?.currency,
                            image_urls: toPropertyImages(viewing.property_image || propertyContext?.image),
                        },
                        stages: [
                            { name: 'Viewing requested', description: 'Your viewing request is in the workspace.', icon: Send, color: 'blue' },
                            { name: 'Viewing confirmed', description: 'The time is confirmed with the property team.', icon: Eye, color: 'orange' },
                            { name: 'Viewing completed', description: 'The viewing has been completed.', icon: CheckCircle2, color: 'green' },
                        ].map((stage, index) => ({
                            ...stage,
                            status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                        })),
                        timeline: [
                            {
                                date: getStableActivityTimestamp(viewing.created_at, viewing.scheduled_at),
                                event: 'Viewing request created',
                                type: 'milestone',
                            },
                            {
                                date: getStableActivityTimestamp(viewing.scheduled_at, viewing.created_at),
                                event: currentStage,
                                type: status === 'completed' ? 'success' : 'info',
                            },
                        ],
                        primaryActionPath: '/user/dashboard/viewings',
                        primaryActionLabel: 'Open Viewings',
                    };
                });

                const mappedContracts: ApplicationItem[] = contracts.map((contract: any) => {
                    const propertyContext = propertyContextById.get(contract.property_id);
                    const status = String(contract.status || '').toLowerCase();
                    const signed = Boolean(contract.signed_at || contract.user_signed_at || status === 'signed' || status === 'completed');
                    const progress = status === 'completed' ? 100 : signed ? 80 : status === 'sent' || status === 'active' ? 55 : 25;
                    const currentStage = status === 'completed'
                        ? 'Contract completed'
                        : signed
                            ? 'Contract signed'
                            : status === 'sent' || status === 'active'
                                ? 'Contract ready to sign'
                                : 'Contract being prepared';
                    const stageIndex = status === 'completed' ? 3 : signed ? 2 : status === 'sent' || status === 'active' ? 1 : 0;
                    const monthlyRent = parseMoney(contract.monthly_rent);
                    const depositAmount = parseMoney(contract.deposit_amount);
                    const contractCountry = contract.property_country || contract.country || propertyContext?.country;
                    const contractCurrency = contract.currency || contract.property_currency || propertyContext?.currency;

                    return {
                        id: `contract-${contract.id}`,
                        source: 'contract',
                        type: String(contract.contract_type || contract.title || '').toLowerCase().includes('sale') ? 'buy' : 'rent',
                        currentStage,
                        currentStageNumber: Math.min(stageIndex + 1, 4),
                        totalStages: 4,
                        progress,
                        lastUpdated: getStableActivityTimestamp(contract.updated_at, contract.created_at),
                        nextAction: signed ? 'Keep contract for records' : 'Review and sign contract',
                        estimatedCompletion: contract.expires_at ? `Expires ${new Date(contract.expires_at).toLocaleDateString('en-GB')}` : 'Contract workflow is live',
                        property: {
                            id: contract.property_id,
                            title: firstText(contract.property, propertyContext?.title, contract.title, 'Property contract'),
                            city: propertyContext?.address || null,
                            price: monthlyRent || depositAmount || parseMoney(propertyContext?.price),
                            priceLabel: monthlyRent
                                ? `${formatPropertyPrice(monthlyRent, { country: contractCountry, currency: contractCurrency })}/mo`
                                : depositAmount
                                    ? `${formatPropertyPrice(depositAmount, { country: contractCountry, currency: contractCurrency })} deposit`
                                    : undefined,
                            country: contractCountry,
                            currency: contractCurrency,
                            image_urls: toPropertyImages(propertyContext?.image),
                        },
                        stages: [
                            { name: 'Draft prepared', description: 'The contract record has been created.', icon: FileText, color: 'blue' },
                            { name: 'Ready to sign', description: 'The contract is ready for review.', icon: ExternalLink, color: 'orange' },
                            { name: 'Signed', description: 'The contract has been signed.', icon: CheckCircle2, color: 'green' },
                            { name: 'Completed', description: 'The contract workflow is complete.', icon: CheckCircle2, color: 'green' },
                        ].map((stage, index) => ({
                            ...stage,
                            status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                        })),
                        timeline: [
                            {
                                date: getStableActivityTimestamp(contract.created_at, contract.updated_at),
                                event: 'Contract record created',
                                type: 'milestone',
                            },
                            {
                                date: getStableActivityTimestamp(contract.updated_at, contract.signed_at, contract.created_at),
                                event: currentStage,
                                type: signed ? 'success' : 'info',
                            },
                        ],
                        primaryActionPath: '/user/dashboard/contracts',
                        primaryActionLabel: 'Open Contracts',
                    };
                });

                const mappedSaleProgressions: ApplicationItem[] = (saleProgressionsRes.data || []).map((progression) => {
                    const summary = getSaleStageSummary(progression.current_stage, progression.status);
                    const stageIndex = Math.max(summary.currentStageNumber - 1, 0);
                    const propertyContext = propertyContextById.get(progression.property_id);

                    return {
                        id: `sale-progression-${progression.id}`,
                        source: 'sale_progression',
                        type: 'buy',
                        currentStage: summary.currentStage,
                        currentStageNumber: summary.currentStageNumber,
                        totalStages: summary.totalStages,
                        progress: summary.progress,
                        lastUpdated: getStableActivityTimestamp(progression.updated_at, progression.created_at),
                        nextAction: summary.nextAction,
                        estimatedCompletion: 'Purchase progression is live',
                        property: {
                            id: progression.property_id,
                            title: propertyContext?.title || 'Purchase progression',
                            city: propertyContext?.address || null,
                            price: typeof propertyContext?.price === 'number' ? propertyContext.price : null,
                            country: progression.property_country || propertyContext?.country,
                            currency: (progression as any).property_currency || propertyContext?.currency,
                            image_urls: toPropertyImages(propertyContext?.image),
                        },
                        stages: SALE_STAGES.map((stage, index) => ({
                            ...stage,
                            status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                        })),
                        timeline: [
                            {
                                date: getStableActivityTimestamp(progression.created_at, progression.updated_at),
                                event: 'Sale progression started',
                                type: 'milestone',
                            },
                            {
                                date: getStableActivityTimestamp(progression.updated_at, progression.created_at),
                                event: `Current sale stage: ${summary.currentStage}`,
                                type: progression.status === 'completed' ? 'success' : 'info',
                            },
                        ],
                        primaryActionPath: '/user/applications',
                        primaryActionLabel: 'Open Purchase Progress',
                    };
                });

                setApplications(
                    [...mappedBrokerRequests, ...mappedSaleProgressions, ...mappedApps].sort(
                        (left, right) => right.lastUpdated.getTime() - left.lastUpdated.getTime(),
                    ),
                );
                setViewingItems(mappedViewings.sort(
                    (left, right) => right.lastUpdated.getTime() - left.lastUpdated.getTime(),
                ));
                setContractItems(mappedContracts.sort(
                    (left, right) => right.lastUpdated.getTime() - left.lastUpdated.getTime(),
                ));

                const mappedProps: ApplicationItem[] = (propsRes.data || []).map((prop: any) => ({
                        source: 'listing',
                        id: prop.id,
                        type: prop.listing_type === 'rent' ? 'rent' : prop.status === 'sold' ? 'sell' : 'buy',
                        currentStage: ['published', 'active', 'online'].includes(prop.status) ? 'Published & Live' : prop.status === 'sold' ? 'Sale Completed' : 'Property Listed',
                        currentStageNumber: ['published', 'active', 'online'].includes(prop.status) ? 3 : prop.status === 'sold' ? 5 : 1,
                        totalStages: 5,
                        progress: ['published', 'active', 'online'].includes(prop.status) ? 60 : prop.status === 'sold' ? 100 : 20,
                        lastUpdated: getStableActivityTimestamp(prop.updated_at, prop.created_at),
                        nextAction: 'Manage listing',
                        property: {
                            id: prop.id,
                            title: prop.title,
                            city: prop.city || null,
                            price: typeof prop.price === 'number' ? prop.price : null,
                            country: prop.country,
                            currency: prop.currency,
                            image_urls: getPropertyImages(prop),
                        },
                        stats: { views: prop.view_count || 0, inquiries: 0, saved: prop.favorite_count || 0 },
                        stages: SALE_STAGES.map((s, i) => ({
                            ...s,
                            status: prop.status === 'sold'
                                ? 'completed'
                                : (['published', 'active', 'online'].includes(prop.status) && i < 3)
                                    ? 'completed'
                                    : (['published', 'active', 'online'].includes(prop.status) && i === 2)
                                        ? 'current'
                                        : 'upcoming'
                        }))
                    }));
                setListings(mappedProps);

            } catch (error) {
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const applicationsTotalPages = Math.max(1, Math.ceil(applications.length / TIMELINE_PAGE_SIZE));
        const viewingsTotalPages = Math.max(1, Math.ceil(viewingItems.length / TIMELINE_PAGE_SIZE));
        const contractsTotalPages = Math.max(1, Math.ceil(contractItems.length / TIMELINE_PAGE_SIZE));
        const listingsTotalPages = Math.max(1, Math.ceil(listings.length / TIMELINE_PAGE_SIZE));

        if (applicationsPage > applicationsTotalPages) {
            setApplicationsPage(applicationsTotalPages);
        }
        if (viewingsPage > viewingsTotalPages) {
            setViewingsPage(viewingsTotalPages);
        }
        if (contractsPage > contractsTotalPages) {
            setContractsPage(contractsTotalPages);
        }

        if (listingsPage > listingsTotalPages) {
            setListingsPage(listingsTotalPages);
        }
    }, [
        applications.length,
        applicationsPage,
        contractItems.length,
        contractsPage,
        listings.length,
        listingsPage,
        viewingItems.length,
        viewingsPage,
    ]);

    const sourceItems = activeTab === 'applications'
        ? applications
        : activeTab === 'viewings'
            ? viewingItems
            : activeTab === 'contracts'
                ? contractItems
                : listings;
    const dataToShow = useMemo(
        () => filterTimelineItems(sourceItems, timelineFilter, timelineSort),
        [sourceItems, timelineFilter, timelineSort],
    );
    const activePage = activeTab === 'applications'
        ? applicationsPage
        : activeTab === 'viewings'
            ? viewingsPage
            : activeTab === 'contracts'
                ? contractsPage
                : listingsPage;
    const totalPages = Math.max(1, Math.ceil(dataToShow.length / TIMELINE_PAGE_SIZE));
    const currentPageItems = dataToShow.slice(
        (activePage - 1) * TIMELINE_PAGE_SIZE,
        activePage * TIMELINE_PAGE_SIZE,
    );

    useEffect(() => {
        if (activeTab === 'applications') {
            setApplicationsPage(1);
        } else if (activeTab === 'viewings') {
            setViewingsPage(1);
        } else if (activeTab === 'contracts') {
            setContractsPage(1);
        } else {
            setListingsPage(1);
        }
        setExpandedId(null);
    }, [activeTab, timelineFilter, timelineSort]);

    const handleTabChange = (tab: TimelineTab) => {
        setActiveTab(tab);
        setExpandedId(null);
    };

    const handlePageChange = (page: number) => {
        setExpandedId(null);
        if (activeTab === 'applications') {
            setApplicationsPage(page);
            return;
        }
        if (activeTab === 'viewings') {
            setViewingsPage(page);
            return;
        }
        if (activeTab === 'contracts') {
            setContractsPage(page);
            return;
        }

        setListingsPage(page);
    };

    const timelineTabs: Array<{ id: TimelineTab; label: string; count: number; itemLabel: string }> = [
        { id: 'applications', label: 'Applications', count: applications.length, itemLabel: 'applications' },
        { id: 'viewings', label: 'Viewings', count: viewingItems.length, itemLabel: 'viewings' },
        { id: 'contracts', label: 'Contracts', count: contractItems.length, itemLabel: 'contracts' },
        { id: 'listings', label: 'My homes', count: listings.length, itemLabel: 'listings' },
    ];
    const activeTabConfig = timelineTabs.find((tab) => tab.id === activeTab) || timelineTabs[0];
    const statusSummary = loading
        ? 'Loading portfolio journeys.'
        : `${dataToShow.length} ${activeTabConfig.itemLabel} shown, sorted by ${timelineSort.replace('_', ' ')}.`;

    const getStageColor = (status: string | undefined, color: string) => {
        if (status === 'completed') return 'bg-green-500 border-green-500 text-white';
        if (status === 'current') {
            const colors: any = {
                blue: 'bg-blue-500 border-blue-500',
                purple: 'bg-purple-500 border-purple-500',
                orange: 'bg-orange-500 border-orange-500',
                yellow: 'bg-yellow-500 border-yellow-500',
                green: 'bg-green-500 border-green-500'
            };
            return `${colors[color] || colors.orange} text-white ring-4 ring-orange-100 dark:ring-orange-900/30`;
        }
        return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400';
    };

    return (
        <div id="realtime-tracking-widget" className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-8 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <Activity size={28} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                Your journey progress
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-semibold rounded-full">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Live
                                </span>
                            </h2>
                            <p className="text-base text-gray-600 dark:text-gray-300 mt-1">
                                Follow each property step in one place.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 rounded-xl bg-gray-100 p-1.5 dark:bg-gray-800" role="tablist" aria-label="Portfolio journey groups">
                        {timelineTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                <p role="status" aria-live="polite" className="sr-only">
                    {statusSummary}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                        <label htmlFor="portfolio-journey-filter" className="sr-only">Filter portfolio journeys</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                id="portfolio-journey-filter"
                                aria-label="Filter portfolio journeys"
                                value={timelineFilter}
                                onChange={(event) => setTimelineFilter(event.target.value)}
                                placeholder="Filter by property, location, stage, or group"
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="portfolio-journey-sort" className="sr-only">Sort portfolio journeys</label>
                        <div className="relative">
                            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <select
                                id="portfolio-journey-sort"
                                aria-label="Sort portfolio journeys"
                                value={timelineSort}
                                onChange={(event) => setTimelineSort(event.target.value as TimelineSort)}
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
                            >
                                <option value="updated_desc">Recently updated</option>
                                <option value="updated_asc">Oldest updated</option>
                                <option value="price_desc">Price high to low</option>
                                <option value="price_asc">Price low to high</option>
                                <option value="progress_desc">Most progressed</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? <TimelineSkeleton /> : dataToShow.length === 0 ? (
                    <div role="status" aria-live="polite" className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {timelineFilter.trim() ? `No matching ${activeTabConfig.itemLabel}` : `No ${activeTabConfig.itemLabel} yet`}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {timelineFilter.trim() ? 'Try a different property, location, or stage.' : 'Start with one simple next step.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {currentPageItems.map((item) => (
                            <div key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="px-6 py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                                    <div className="flex items-start gap-5">
                                        <div className="relative flex-shrink-0">
                                            {item.property.image_urls[0] && !failedImages[item.id] ? (
                                                <img
                                                    src={item.property.image_urls[0]}
                                                    alt={item.property.title}
                                                    className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-100 dark:bg-gray-700"
                                                    onError={() => {
                                                        setFailedImages((previous) => ({ ...previous, [item.id]: true }));
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl shadow-sm bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                    <FileText size={24} />
                                                </div>
                                            )}
                                            <span className={`absolute -bottom-1 -left-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase shadow-sm ${item.type === 'buy' ? 'bg-blue-700' : item.type === 'rent' ? 'bg-purple-700' : 'bg-green-700'} text-white`}>
                                                {item.type}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{item.property.title}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5"><MapPin size={14} />{item.property.city || 'Location unavailable'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-xl text-gray-900 dark:text-white">
                                                        {item.property.priceLabel || formatPropertyPrice(item.property.price, item.property)}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">{formatLastUpdatedLabel(item.lastUpdated)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.progress >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                                                            {item.progress >= 75 ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{item.currentStage}</span>
                                                        <span className="text-sm text-gray-400">Step {item.currentStageNumber} of {item.totalStages}</span>
                                                    </div>
                                                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200 ${expandedId === item.id ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {expandedId === item.id && (
                                    <div className="px-6 pb-6 animate-fadeIn">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 mb-5">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Activity size={16} className="text-orange-500" /> Complete Journey Progress</h3>
                                            <div className="relative space-y-4">
                                                <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />
                                                {item.stages?.map((stage, idx) => (
                                                    <div key={idx} className="relative flex items-start gap-4">
                                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 ring-4 ring-gray-50 dark:ring-gray-800 ${getStageColor(stage.status, stage.color)}`}>
                                                            <StageIcon stage={stage} size={16} />
                                                        </div>
                                                        <div className="flex-1 pb-2">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{stage.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {item.timeline && (
                                            <div className="mb-5">
                                                <button onClick={(e) => { e.stopPropagation(); setShowTimeline(prev => ({ ...prev, [item.id]: !prev[item.id] })); }} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                    <span className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300"><Clock size={16} /> Activity Timeline</span>
                                                    <ChevronDown size={16} className={showTimeline[item.id] ? 'rotate-180' : ''} />
                                                </button>
                                                {showTimeline[item.id] && (
                                                    <div className="mt-3 space-y-2 pl-2">
                                                        {item.timeline.map((event, idx) => <TimelineEvent key={idx} event={event} />)}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => navigate(item.primaryActionPath || `/user/properties/${item.property.id}`)}
                                                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                                            >
                                                {item.primaryActionLabel || 'View Property'} <ExternalLink size={14} />
                                            </button>
                                            {item.source !== 'broker_request' && (
                                                <button className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold flex items-center gap-2"><MessageCircle size={14} /> Send Message</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="bg-gradient-to-r from-orange-50/50 via-white to-orange-50/50 px-6 py-5 dark:from-orange-950/10 dark:via-gray-900 dark:to-orange-950/10">
                            <PaginationBar
                                currentPage={activePage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalItems={dataToShow.length}
                                pageSize={TIMELINE_PAGE_SIZE}
                                currentItemCount={currentPageItems.length}
                                itemLabel={activeTabConfig.itemLabel}
                                className="border-orange-100/80 bg-white/90 shadow-lg shadow-orange-100/40 dark:border-orange-900/20 dark:bg-gray-900/90 dark:shadow-none"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const parseMoney = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
};

const firstText = (...values: unknown[]) => {
    for (const value of values) {
        const text = String(value || '').trim();
        if (text) {
            return text;
        }
    }
    return '';
};

const buildLocationLabel = (...values: unknown[]) => {
    const parts = values
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
};

const buildPropertyContextFromProperty = (property: any): TimelinePropertyContext => ({
    title: property?.title,
    address: buildLocationLabel(
        property?.address_line_1,
        property?.address_line_2,
        property?.city,
        property?.postcode,
        property?.country,
    ) || property?.location,
    price: property?.price,
    country: property?.country,
    currency: property?.currency,
    image: property?.image_urls || property?.images || property?.image_url,
});

const filterTimelineItems = (items: ApplicationItem[], filterText: string, sortBy: TimelineSort) => {
    const normalizedFilter = filterText.trim().toLowerCase();
    const filtered = normalizedFilter
        ? items.filter((item) => [
            item.property.title,
            item.property.city,
            item.property.priceLabel,
            item.currentStage,
            item.nextAction,
            item.type,
            item.source,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedFilter)))
        : [...items];

    return filtered.sort((left, right) => {
        if (sortBy === 'updated_asc') {
            return left.lastUpdated.getTime() - right.lastUpdated.getTime();
        }
        if (sortBy === 'price_desc') {
            return (right.property.price || 0) - (left.property.price || 0);
        }
        if (sortBy === 'price_asc') {
            return (left.property.price || 0) - (right.property.price || 0);
        }
        if (sortBy === 'progress_desc') {
            return right.progress - left.progress;
        }
        return right.lastUpdated.getTime() - left.lastUpdated.getTime();
    });
};

export default ApplicationTimelineWidget;

