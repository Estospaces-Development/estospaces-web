"use client";

import { Zap } from 'lucide-react';
import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as leadsService from '@/services/leadsService';
import { getUserProperties } from '@/services/userPropertiesService';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

import BrandLoader from '@/components/ui/BrandLoader';

const SatelliteMap = lazy(() => import('./SatelliteMap'));

interface Activity {
    id: string;
    type: string;
    name: string;
    property: string;
    date: string;
    timestamp: Date;
    leadId?: string;
    propertyId?: string;
}

const RecentActivity = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const getActivityPath = (activity: Activity): string | null => {
        if (activity.type === 'New Lead' && activity.leadId) {
            return `/manager/leads/${activity.leadId}`;
        }
        if (activity.propertyId && (activity.type === 'Listing Published' || activity.type === 'Property Updated')) {
            return `/manager/dashboard/properties/${activity.propertyId}`;
        }
        return null;
    };

    const fetchActivities = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const [leadsRes, propertiesRes] = await Promise.all([
                leadsService.getBrokerLeads(),
                getUserProperties({ limit: 5 })
            ]);

            const integratedActivities: Activity[] = [];

            if (leadsRes.data) {
                leadsRes.data.forEach((lead: any) => {
                    integratedActivities.push({
                        id: `lead-${lead.id}`,
                        type: 'New Lead',
                        name: lead.name || 'Interested User',
                        property: lead.property?.title || lead.propertyInterested || 'General Interest',
                        date: new Date(lead.created_at).toLocaleDateString(),
                        timestamp: new Date(lead.created_at),
                        leadId: lead.id,
                    });
                });
            }

            if (propertiesRes.data) {
                propertiesRes.data.forEach((property: any) => {
                    integratedActivities.push({
                        id: `property-${property.id}`,
                        type: property.status === 'published' || property.status === 'online' ? 'Listing Published' : 'Property Updated',
                        name: property.agent_name || 'Your Portfolio',
                        property: property.title || 'Property Listing',
                        date: new Date(property.updated_at || property.created_at).toLocaleDateString(),
                        timestamp: new Date(property.updated_at || property.created_at),
                        propertyId: property.id,
                    });
                });
            }

            // Sort by most recent
            integratedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setActivities(integratedActivities.slice(0, 5));
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchActivities();
    }, [fetchActivities]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
        ],
        refresh: () => fetchActivities(true),
    });

    const handleActivityClick = (activity: Activity) => {
        const path = getActivityPath(activity);
        if (path) {
            navigate(path);
        }
    };

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:brightness-105 dark:hover:brightness-110">
            {/* Animated light overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-500 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    <h3 className="section-heading text-gray-800 dark:text-white transition-colors duration-300 group-hover:text-primary dark:group-hover:text-primary-light">Recent Activity</h3>
                </div>

                <div className="space-y-4 mb-6">
                    {loading ? (
                        <div className="flex justify-center py-4 text-gray-500 dark:text-gray-400">
                            <BrandLoader size="sm" label="Loading activities" showLabel />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">No recent activity</div>
                    ) : (
                        activities.map((activity) => {
                            const activityPath = getActivityPath(activity);
                            return (
                                <div
                                    key={activity.id}
                                    onClick={() => handleActivityClick(activity)}
                                    className={`flex items-start gap-3 p-2 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:scale-[1.02] ${activityPath ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 transition-all duration-300 group-hover/item:scale-150 group-hover/item:shadow-lg group-hover/item:shadow-blue-500/50"></div>
                                    <div className="flex-1">
                                        <p className="body-text font-medium text-gray-800 dark:text-white transition-colors duration-300 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400">{activity.type}</p>
                                        <p className="body-text text-gray-600 dark:text-gray-400 transition-colors duration-300 group-hover/item:text-gray-800 dark:group-hover/item:text-gray-300">
                                            {activity.name} - {activity.property}
                                        </p>
                                        {activity.date && (
                                            <p className="caption text-gray-500 dark:text-gray-500 mt-1">{activity.date}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Satellite Map */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg h-[500px] md:h-[650px] lg:h-[800px] relative overflow-hidden">
                    <Suspense fallback={<div className="flex h-full items-center justify-center"><BrandLoader size="md" label="Loading map" showLabel /></div>}>
                        <SatelliteMap />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default RecentActivity;
