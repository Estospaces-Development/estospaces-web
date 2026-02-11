"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2, Clock, MapPin, ChevronDown, Activity, FileText,
    Loader2, Eye, MessageCircle, ArrowRight,
    Phone, AlertCircle, Info, ExternalLink, Send
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
        city: string;
        price: number;
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
}

// --- Constants & Config ---

const BUY_STAGES: Stage[] = [
    { name: 'Application Submitted', description: 'Your buying application has been received.', icon: Send, color: 'blue', tips: ['Ensure documents ready'] },
    { name: 'Document Verification', description: 'Verifying identity and funds.', icon: FileText, color: 'purple', tips: ['Upload ID'], requiredDocs: ['ID', 'Proof of Funds'] },
    { name: 'Property Inspection', description: 'Schedule viewing.', icon: Eye, color: 'orange', tips: ['Check structure'] },
    { name: 'Offer Negotiation', description: 'Offer under review.', icon: MessageCircle, color: 'yellow', tips: ['Set budget'] },
    { name: 'Completion', description: 'Finalize contracts.', icon: CheckCircle2, color: 'green', tips: ['Sign contracts'] }
];

const RENT_STAGES: Stage[] = [
    { name: 'Interest Registered', description: 'Interest shown.', icon: ArrowRight, color: 'blue', tips: ['Broker will contact'] },
    { name: 'Documents Submitted', description: 'Docs under review.', icon: FileText, color: 'purple', tips: ['Employment proof'], requiredDocs: ['ID', 'References'] },
    { name: 'Viewing Scheduled', description: 'Viewing arranged.', icon: Clock, color: 'orange', tips: ['Ask about utilities'] },
    { name: 'Tenancy Agreement', description: 'Sign agreement.', icon: CheckCircle2, color: 'green', tips: ['Read terms'] }
];

const SELL_STAGES: Stage[] = [
    { name: 'Property Listed', description: 'Listing prepared.', icon: FileText, color: 'blue' },
    { name: 'Photos & Valuation', description: 'Photos in progress.', icon: Eye, color: 'purple' },
    { name: 'Published & Live', description: 'Property is live.', icon: Activity, color: 'green' },
    { name: 'Viewings & Offers', description: ' receiving offers.', icon: MessageCircle, color: 'orange' },
    { name: 'Sale Completed', description: 'Sale complete.', icon: CheckCircle2, color: 'green' }
];

// --- Mock Data ---

const MOCK_APPLICATIONS: ApplicationItem[] = [
    {
        id: 'app-1',
        type: 'buy',
        currentStage: 'Document Verification',
        currentStageNumber: 2,
        totalStages: 5,
        progress: 40,
        lastUpdated: new Date(Date.now() - 7200000),
        nextAction: 'Upload remaining documents',
        estimatedCompletion: '3-5 business days',
        property: {
            id: 'prop-1',
            title: 'Modern 3BR Apartment',
            city: 'Canary Wharf, London',
            price: 450000,
            image_urls: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400']
        },
        broker: {
            name: 'Sarah Mitchell',
            phone: '+44 7700 900123',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100'
        },
        stages: BUY_STAGES.map((s, i) => ({ ...s, status: i < 1 ? 'completed' : i === 1 ? 'current' : 'upcoming', completedAt: i < 1 ? new Date() : null })),
        timeline: [
            { date: new Date(Date.now() - 86400000), event: 'Application submitted', type: 'milestone' },
            { date: new Date(Date.now() - 7200000), event: 'Awaiting: Proof of funds', type: 'action' }
        ]
    },
    {
        id: 'app-2',
        type: 'rent',
        currentStage: 'Viewing Scheduled',
        currentStageNumber: 3,
        totalStages: 4,
        progress: 75,
        lastUpdated: new Date(Date.now() - 1800000),
        nextAction: 'Attend scheduled viewing',
        viewingDate: new Date(Date.now() + 172800000),
        estimatedCompletion: '1-2 weeks',
        property: {
            id: 'prop-2',
            title: 'Luxury Studio Flat',
            city: 'Manchester City Centre',
            price: 1500,
            image_urls: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400']
        },
        broker: {
            name: 'James Wilson',
            phone: '+44 7700 900456',
            avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'
        },
        stages: RENT_STAGES.map((s, i) => ({ ...s, status: i < 2 ? 'completed' : i === 2 ? 'current' : 'upcoming', completedAt: i < 2 ? new Date() : null })),
        timeline: [
            { date: new Date(Date.now() - 1800000), event: 'Viewing scheduled for tomorrow', type: 'action' }
        ]
    }
];

const MOCK_LISTINGS: ApplicationItem[] = [
    {
        id: 'list-1',
        type: 'sell',
        currentStage: 'Published & Live',
        currentStageNumber: 3,
        totalStages: 5,
        progress: 60,
        lastUpdated: new Date(Date.now() - 3600000),
        nextAction: 'Review incoming inquiries',
        property: {
            id: 'prop-3',
            title: 'Victorian Townhouse',
            city: 'Cotswolds',
            price: 850000,
            image_urls: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=400']
        },
        stats: { views: 127, inquiries: 8, saved: 23 },
        stages: SELL_STAGES.map((s, i) => ({ ...s, status: i < 2 ? 'completed' : i === 2 ? 'current' : 'upcoming', completedAt: i < 2 ? new Date() : null })),
        timeline: [
            { date: new Date(Date.now() - 3600000), event: '8 new inquiries received', type: 'info' }
        ]
    }
];

// --- Subcomponents ---

const StageIcon: React.FC<{ stage: Stage; size?: number }> = ({ stage, size = 20 }) => {
    const IconComponent = stage.icon || CheckCircle2;
    return <IconComponent size={size} />;
};

const TimelineEvent: React.FC<{ event: TimelineEventType }> = ({ event }) => {
    const typeStyles = {
        milestone: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
        action: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        info: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
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

const ApplicationTimelineWidget = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'applications' | 'listings'>('applications');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    const dataToShow = activeTab === 'applications' ? MOCK_APPLICATIONS : MOCK_LISTINGS;

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
                        <button onClick={() => setActiveTab('applications')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'applications' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                            My Applications ({MOCK_APPLICATIONS.length})
                        </button>
                        <button onClick={() => setActiveTab('listings')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'listings' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                            My Listings ({MOCK_LISTINGS.length})
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No active {activeTab}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Start your property journey today</p>
                    </div>
                ) : (
                    dataToShow.map((item) => (
                        <div key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <div className="px-6 py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                                <div className="flex items-start gap-5">
                                    <div className="relative flex-shrink-0">
                                        <img src={item.property.image_urls[0]} alt={item.property.title} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-100 dark:bg-gray-700" />
                                        <span className={`absolute -bottom-1 -left-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase shadow-sm ${item.type === 'buy' ? 'bg-blue-500' : item.type === 'rent' ? 'bg-purple-500' : 'bg-green-500'} text-white`}>
                                            {item.type}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{item.property.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5"><MapPin size={14} />{item.property.city}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-gray-900 dark:text-white">£{item.property.price.toLocaleString()}</p>
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
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Activity size={16} className="text-orange-500" /> Complete Journey Progress</h4>
                                        <div className="relative space-y-4">
                                            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />
                                            {item.stages?.map((stage, idx) => (
                                                <div key={idx} className="relative flex items-start gap-4">
                                                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 ring-4 ring-gray-50 dark:ring-gray-800 ${getStageColor(stage.status, stage.color)}`}>
                                                        <StageIcon stage={stage} size={16} />
                                                    </div>
                                                    <div className="flex-1 pb-2">
                                                        <h5 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h5>
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
                                        <button onClick={() => router.push(`/user/dashboard/property/${item.property.id}`)} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2">View Property <ExternalLink size={14} /></button>
                                        <button className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold flex items-center gap-2"><MessageCircle size={14} /> Send Message</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ApplicationTimelineWidget;
