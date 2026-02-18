"use client";

import { Zap } from 'lucide-react';
import { useState, useEffect, Suspense, lazy } from 'react';

const SatelliteMap = lazy(() => import('./SatelliteMap'));

interface Activity {
    id: string;
    type: string;
    name: string;
    property: string;
    date: string;
}

const RecentActivity = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 800));

                const mockData: Activity[] = [
                    { id: '1', type: 'New Lead', name: 'John Doe', property: 'Sunset Villa', date: '2 mins ago' },
                    { id: '2', type: 'Viewing Request', name: 'Sarah Smith', property: 'Downtown Loft', date: '1 hour ago' },
                    { id: '3', type: 'Application Submitted', name: 'Mike Johnson', property: 'Seaside Condo', date: '3 hours ago' },
                    { id: '4', type: 'Message Received', name: 'Emily Davis', property: 'Mountain Cabin', date: '5 hours ago' },
                ];
                setActivities(mockData);
            } catch (error) {
                setActivities([]);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
        // Refresh every 30 seconds to match legacy behavior
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:brightness-105 dark:hover:brightness-110">
            {/* Animated light overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-500 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    <h3 className="section-heading text-gray-800 dark:text-white transition-colors duration-300 group-hover:text-primary dark:group-hover:text-primary-light">Recently Activity</h3>
                </div>

                <div className="space-y-4 mb-6">
                    {loading ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading activities...</div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">No recent activity</div>
                    ) : (
                        activities.map((activity, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:scale-[1.02] cursor-pointer group/item">
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
                        ))
                    )}
                </div>

                {/* Satellite Map */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg h-[500px] md:h-[650px] lg:h-[800px] relative overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading map...</div>}>
                        <SatelliteMap />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default RecentActivity;
