"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Clock, MapPin, ChevronDown, Activity, FileText,
    Eye, MessageCircle, ArrowRight,
    ExternalLink, Send, Radio, UserCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getBrokerRequestTrackingSummary, isLiveBrokerRequest } from '@/lib/applicationTracking';
import { buildBrokerRequestWorkspacePath } from '@/lib/brokerRequestWorkspace';
import PaginationBar from '@/components/ui/PaginationBar';

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
    source?: 'application' | 'broker_request' | 'listing' | 'sale_progression';
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
    { name: 'Property Selected', description: 'A specific property is now linked to your live journey.', icon: ArrowRight, color: 'blue' },
    { name: 'Viewing Scheduled', description: 'A real viewing appointment is booked.', icon: Clock, color: 'orange' },
    { name: 'Application Review', description: 'Referencing and legal compliance checks are being reviewed.', icon: FileText, color: 'purple' },
    { name: 'Ready for Contract', description: 'The tenancy is approved and ready for the agreement stage.', icon: CheckCircle2, color: 'green' },
    { name: 'Active Tenancy', description: 'The tenancy is complete and active.', icon: CheckCircle2, color: 'green' }
];

const SALE_STAGES: Stage[] = [
    { name: 'Offer Submitted', description: 'Your offer is now recorded against the property.', icon: Send, color: 'blue' },
    { name: 'Offer Accepted', description: 'The sale is agreed in principle.', icon: CheckCircle2, color: 'green' },
    { name: 'Memorandum Issued', description: 'The sale memo and next legal steps are underway.', icon: FileText, color: 'purple' },
    { name: 'Conveyancing', description: 'Legal work and checks are progressing.', icon: MessageCircle, color: 'orange' },
    { name: 'Exchange & Completion', description: 'The purchase is approaching completion.', icon: CheckCircle2, color: 'green' }
];

const BROKER_REQUEST_STAGES: Stage[] = [
    { name: 'Request Sent', description: 'Your 10-minute broker request is live.', icon: Send, color: 'blue', tips: ['Keep this live workspace open for updates'] },
    { name: 'Nearby Brokers Pinged', description: 'Ranked brokers are being notified in dispatch waves.', icon: Radio, color: 'orange', tips: ['Nearby available brokers are being contacted first'] },
    { name: 'Broker Matched', description: 'A broker accepted your request and the live queue is now locked.', icon: UserCheck, color: 'green', tips: ['The same broker stays attached until the property handoff is complete'] },
    { name: 'Properties Shared', description: 'The broker has shared a shortlist of matching properties.', icon: Eye, color: 'purple', tips: ['Choose one property to start the 24-hour fast-track'] },
    { name: 'Property Selected', description: 'A specific property is selected and the live fast-track can continue.', icon: CheckCircle2, color: 'green', tips: ['The selected property now owns the next 24-hour workflow'] },
];

const getRentStageSummary = (application: any) => {
    switch (application.status) {
        case 'completed':
            return { currentStage: 'Active Tenancy', currentStageNumber: 5, totalStages: 5, progress: 100, nextAction: 'Open contract' };
        case 'ready_for_contract':
        case 'approved':
            return { currentStage: 'Ready for Contract', currentStageNumber: 4, totalStages: 5, progress: 80, nextAction: 'Review contract' };
        case 'under_review':
        case 'referencing':
        case 'right_to_rent_pending':
        case 'documents_requested':
        case 'viewing_completed':
            return { currentStage: 'Application Review', currentStageNumber: 3, totalStages: 5, progress: 60, nextAction: 'Wait for review update' };
        case 'viewing_scheduled':
        case 'appointment_booked':
            return { currentStage: 'Viewing Scheduled', currentStageNumber: 2, totalStages: 5, progress: 40, nextAction: 'Attend the viewing' };
        default:
            return { currentStage: 'Property Selected', currentStageNumber: 1, totalStages: 5, progress: 20, nextAction: 'Schedule a viewing' };
    }
};

const getSaleStageSummary = (currentStage?: string, status?: string) => {
    if (currentStage === 'completion' || status === 'completed') {
        return { currentStage: 'Exchange & Completion', currentStageNumber: 5, totalStages: 5, progress: 100, nextAction: 'Review completion updates' };
    }
    if (currentStage === 'exchange' || currentStage === 'conveyancing') {
        return { currentStage: 'Conveyancing', currentStageNumber: 4, totalStages: 5, progress: 80, nextAction: 'Track legal progress' };
    }
    if (currentStage === 'memorandum_issued' || currentStage === 'sale_agreed') {
        return { currentStage: 'Memorandum Issued', currentStageNumber: 3, totalStages: 5, progress: 60, nextAction: 'Monitor the sale memo' };
    }
    if (currentStage === 'offer_accepted') {
        return { currentStage: 'Offer Accepted', currentStageNumber: 2, totalStages: 5, progress: 40, nextAction: 'Wait for the memorandum stage' };
    }
    return { currentStage: 'Offer Submitted', currentStageNumber: 1, totalStages: 5, progress: 20, nextAction: 'Wait for review' };
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



// --- Subcomponents ---

const StageIcon: React.FC<{ stage: Stage; size?: number }> = ({ stage, size = 20 }) => {
    const IconComponent = stage.icon || CheckCircle2;
    return <IconComponent size={size} />;
};

const formatPropertyPrice = (price: number | null | undefined) => {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return 'Price unavailable';
    }

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
    }).format(price);
};

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
                {formatDistanceToNow(event.date, { addSuffix: true })}
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
import { getViewings } from '../../services/bookingsService';
import { getSaleProgressions } from '../../services/salesService';
import { getUserProperties } from '../../services/userPropertiesService';
import { getUserBrokerRequests } from '../../services/leadsService';

const ApplicationTimelineWidget = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'applications' | 'listings'>('applications');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [listings, setListings] = useState<ApplicationItem[]>([]);
    const [applicationsPage, setApplicationsPage] = useState(1);
    const [listingsPage, setListingsPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [appsRes, brokerRequestsRes, propsRes, saleProgressionsRes, viewingsRes] = await Promise.all([
                    getApplications({ suppressErrorToast: true }),
                    getUserBrokerRequests({ suppressErrorToast: true }),
                    getUserProperties({ limit: 50 }),
                    getSaleProgressions({ suppressErrorToast: true }),
                    getViewings({ suppressErrorToast: true }).catch(() => []),
                ]);

                const viewings = Array.isArray(viewingsRes) ? viewingsRes : [];
                const propertyContextById = new Map<string, {
                    title?: string;
                    address?: string;
                    price?: number;
                    image?: string;
                }>();

                (appsRes.data || []).forEach((app: any) => {
                    if (!app.property_id || propertyContextById.has(app.property_id)) {
                        return;
                    }

                    propertyContextById.set(app.property_id, {
                        title: app.property_title,
                        address: app.property_address,
                        price: app.property_price,
                        image: app.property_image,
                    });
                });

                viewings.forEach((viewing: any) => {
                    if (!viewing.property_id || propertyContextById.has(viewing.property_id)) {
                        return;
                    }

                    propertyContextById.set(viewing.property_id, {
                        title: viewing.property_title,
                        address: viewing.property_address,
                        price: viewing.property_price,
                        image: viewing.property_image,
                    });
                });

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

                    return {
                        id: app.id,
                        source: 'application',
                        type: app.listing_type === 'sale' ? 'buy' : 'rent',
                        currentStage: summary.currentStage,
                        currentStageNumber: summary.currentStageNumber,
                        totalStages: summary.totalStages,
                        progress: summary.progress,
                        lastUpdated: new Date(app.updated_at),
                        nextAction: summary.nextAction,
                        estimatedCompletion: app.listing_type === 'sale' ? 'Purchase progression is live' : 'Tenancy review is live',
                        property: {
                            id: app.property_id,
                            title: app.property_title || 'Property application',
                            city: app.property_address || null,
                            price: typeof app.property_price === 'number' ? app.property_price : null,
                            image_urls: app.property_image ? [app.property_image] : [],
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
                                date: new Date(request.created_at || request.updated_at || Date.now()),
                                event: '10-minute broker dispatch requested',
                                type: 'milestone',
                            },
                        ];

                        if (request.matched_broker?.name) {
                            requestTimeline.push({
                                date: new Date(request.matched_at || request.updated_at || request.created_at || Date.now()),
                                event: `${request.matched_broker.name} accepted the live request`,
                                type: 'success',
                            });
                        } else {
                            requestTimeline.push({
                                date: new Date(request.updated_at || request.created_at || Date.now()),
                                event: `Dispatch wave ${request.dispatch_wave || 1} is notifying nearby brokers`,
                                type: 'info',
                            });
                        }

                        if ((request.property_shares?.length || 0) > 0) {
                            requestTimeline.push({
                                date: new Date(request.updated_at || request.created_at || Date.now()),
                                event: `${request.property_shares?.length || 0} property option${request.property_shares?.length === 1 ? '' : 's'} shared by the broker`,
                                type: 'action',
                            });
                        }

                        if (request.selected_property?.title || request.selected_property_id) {
                            requestTimeline.push({
                                date: new Date(request.updated_at || request.created_at || Date.now()),
                                event: request.selected_property?.title
                                    ? `${request.selected_property.title} selected for the live fast-track`
                                    : 'A property has been selected for the live fast-track',
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
                            lastUpdated: new Date(request.updated_at || request.created_at || Date.now()),
                            nextAction: summary.nextAction,
                            estimatedCompletion: '10-minute live broker dispatch',
                            property: {
                                id: request.id,
                                title: request.selected_property?.title || (request.location ? `Live broker request for ${request.location}` : 'Live broker request'),
                                city: request.selected_property?.city || request.location_postcode || request.location || null,
                                price: typeof request.selected_property?.price === 'number' ? request.selected_property.price : null,
                                priceLabel: request.budget ? `Budget ${request.budget}` : '10-minute live dispatch',
                                image_urls: request.selected_property?.image_urls ? [request.selected_property.image_urls] : [],
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
                                ? 'Open Live Fast-Track'
                                : request.matched_broker
                                    ? 'Open Broker Workspace'
                                    : 'Track Live Dispatch',
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
                        lastUpdated: new Date(progression.updated_at),
                        nextAction: summary.nextAction,
                        estimatedCompletion: 'Purchase progression is live',
                        property: {
                            id: progression.property_id,
                            title: propertyContext?.title || 'Purchase progression',
                            city: propertyContext?.address || null,
                            price: typeof propertyContext?.price === 'number' ? propertyContext.price : null,
                            image_urls: propertyContext?.image ? [propertyContext.image] : [],
                        },
                        stages: SALE_STAGES.map((stage, index) => ({
                            ...stage,
                            status: index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming',
                        })),
                        timeline: [
                            {
                                date: new Date(progression.created_at),
                                event: 'Sale progression started',
                                type: 'milestone',
                            },
                            {
                                date: new Date(progression.updated_at),
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

                const mappedProps: ApplicationItem[] = (propsRes.data || []).map((prop: any) => ({
                        source: 'listing',
                        id: prop.id,
                        type: prop.listing_type === 'rent' ? 'rent' : prop.status === 'sold' ? 'sell' : 'buy',
                        currentStage: ['published', 'active', 'online'].includes(prop.status) ? 'Published & Live' : prop.status === 'sold' ? 'Sale Completed' : 'Property Listed',
                        currentStageNumber: ['published', 'active', 'online'].includes(prop.status) ? 3 : prop.status === 'sold' ? 5 : 1,
                        totalStages: 5,
                        progress: ['published', 'active', 'online'].includes(prop.status) ? 60 : prop.status === 'sold' ? 100 : 20,
                        lastUpdated: new Date(prop.updated_at),
                        nextAction: 'Manage listing',
                        property: {
                            id: prop.id,
                            title: prop.title,
                            city: prop.city || null,
                            price: typeof prop.price === 'number' ? prop.price : null,
                            image_urls: Array.isArray(prop.images)
                                ? prop.images.filter((image: unknown): image is string => typeof image === 'string' && image.trim().length > 0)
                                : [],
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
        const listingsTotalPages = Math.max(1, Math.ceil(listings.length / TIMELINE_PAGE_SIZE));

        if (applicationsPage > applicationsTotalPages) {
            setApplicationsPage(applicationsTotalPages);
        }

        if (listingsPage > listingsTotalPages) {
            setListingsPage(listingsTotalPages);
        }
    }, [applications.length, applicationsPage, listings.length, listingsPage]);

    const dataToShow = activeTab === 'applications' ? applications : listings;
    const activePage = activeTab === 'applications' ? applicationsPage : listingsPage;
    const totalPages = Math.max(1, Math.ceil(dataToShow.length / TIMELINE_PAGE_SIZE));
    const currentPageItems = dataToShow.slice(
        (activePage - 1) * TIMELINE_PAGE_SIZE,
        activePage * TIMELINE_PAGE_SIZE,
    );

    const handleTabChange = (tab: 'applications' | 'listings') => {
        setActiveTab(tab);
        setExpandedId(null);
    };

    const handlePageChange = (page: number) => {
        setExpandedId(null);
        if (activeTab === 'applications') {
            setApplicationsPage(page);
            return;
        }

        setListingsPage(page);
    };

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
                                Real-Time Tracking
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-semibold rounded-full">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Live
                                </span>
                            </h2>
                            <p className="text-base text-gray-600 dark:text-gray-300 mt-1">
                                Track every step of your property journey in real-time
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5">
                        <button onClick={() => handleTabChange('applications')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'applications' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                            My Applications ({applications.length})
                        </button>
                        <button onClick={() => handleTabChange('listings')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'listings' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                            My Listings ({listings.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? <TimelineSkeleton /> : dataToShow.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {activeTab === 'applications' ? 'No active applications or live broker requests' : 'No active listings'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Start your property journey today</p>
                    </div>
                ) : (
                    <>
                        {currentPageItems.map((item) => (
                            <div key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="px-6 py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                                    <div className="flex items-start gap-5">
                                        <div className="relative flex-shrink-0">
                                            {item.property.image_urls[0] ? (
                                                <img src={item.property.image_urls[0]} alt={item.property.title} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-100 dark:bg-gray-700" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl shadow-sm bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                    <FileText size={24} />
                                                </div>
                                            )}
                                            <span className={`absolute -bottom-1 -left-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase shadow-sm ${item.type === 'buy' ? 'bg-blue-500' : item.type === 'rent' ? 'bg-purple-500' : 'bg-green-500'} text-white`}>
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
                                                        {item.property.priceLabel || formatPropertyPrice(item.property.price)}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">Updated {formatDistanceToNow(item.lastUpdated, { addSuffix: true })}</p>
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
                                itemLabel={activeTab === 'applications' ? 'live journeys' : 'listings'}
                                className="border-orange-100/80 bg-white/90 shadow-lg shadow-orange-100/40 dark:border-orange-900/20 dark:bg-gray-900/90 dark:shadow-none"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ApplicationTimelineWidget;

