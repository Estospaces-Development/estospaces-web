"use client";

import React, { useEffect, useState } from 'react';
import { MapPin, Star, ChevronRight, Building, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { userService, Agency } from '@/services/userService';
import { useToast } from '@/contexts/ToastContext';

const NearbyAgenciesList = () => {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const fetchAgencies = async () => {
            try {
                const { data, error } = await userService.getAgencies();
                if (error) {
                    throw new Error(error);
                }
                setAgencies(data || []);
            } catch (err: any) {
                console.error('Failed to fetch agencies:', err);
                toast.error('Failed to load nearby agencies');
            } finally {
                setLoading(false);
            }
        };

        fetchAgencies();
    }, [toast]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Building size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Top Rated Agencies</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nearby professionals</p>
                    </div>
                </div>
                <Link
                    to="/user/dashboard/agencies"
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
                >
                    View All <ChevronRight size={14} />
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
            ) : agencies.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No agencies found nearby.
                </div>
            ) : (
                <div className="space-y-4">
                    {agencies.map((agency) => (
                        <div key={agency.id} className="flex items-center gap-4 group cursor-pointer">
                            <img
                                src={agency.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80'}
                                alt={agency.name}
                                className="w-12 h-12 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80';
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-orange-600 transition-colors">
                                        {agency.name}
                                    </h4>
                                    {agency.verified && (
                                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">
                                            Verified
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center text-xs font-medium text-gray-900 dark:text-white">
                                        <Star size={12} className="text-yellow-400 fill-yellow-400 mr-0.5" />
                                        {agency.rating}
                                        <span className="text-gray-400 dark:text-gray-500 font-normal ml-0.5">({agency.reviewCount})</span>
                                    </div>
                                    <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                        <MapPin size={10} className="mr-0.5" />
                                        {agency.distance || 'Unknown distance'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="w-full mt-6 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium">
                Find Agent by Postcode
            </button>
        </div>
    );
};

export default NearbyAgenciesList;

