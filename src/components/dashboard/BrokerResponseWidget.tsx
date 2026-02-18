"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, ArrowRight, MoreHorizontal, Info, BellRing } from 'lucide-react';
import BrokerRequestItem, { BrokerRequest } from './BrokerRequestItem';

const BrokerResponseWidget: React.FC = () => {
    const navigate = useNavigate();
    // Generate mock data with timestamps relative to now for realistic countdowns
    const [requests, setRequests] = useState<BrokerRequest[]>(() => {
        // Safe to run in hydration? We need consistent initial state.
        // We will hydrate with empty or fixed date, then update in useEffect
        return [];
    });

    useEffect(() => {
        const now = new Date();
        setRequests([
            {
                id: '1',
                propertyName: 'Sunset Villa, Mumbai',
                brokerName: 'Rajesh Kumar',
                distance: '1.2 km away',
                timestamp: new Date(now.getTime() - 1000 * 60 * 2),
                status: 'pending'
            },
            {
                id: '2',
                propertyName: 'Green Heights Apt 4B',
                brokerName: 'Priya Sharma',
                distance: '0.8 km away',
                timestamp: new Date(now.getTime() - 1000 * 60 * 8),
                status: 'pending'
            },
            {
                id: '3',
                propertyName: 'Commercial Hub Office',
                brokerName: 'Amit Patel',
                distance: '3.5 km away',
                timestamp: new Date(now.getTime() - 1000 * 60 * 1),
                status: 'pending'
            },
            {
                id: '4',
                propertyName: 'Lakeview Penthouse',
                brokerName: 'Sneha Gupta',
                distance: '2.1 km away',
                timestamp: new Date(now.getTime() - 1000 * 60 * 12),
                status: 'expired'
            }
        ]);
    }, []);

    const handleRespond = (id: string) => {
        setRequests(prev => prev.map(req => {
            if (req.id === id) {
                // If this was a user request, notify them back (mock logic)
                if (req.propertyName === 'User Location Request') {
                    // Logic for responding to user
                }
                return { ...req, status: 'responded' };
            }
            return req;
        }));
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 ring-2 ring-blue-500/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg animate-pulse">
                        <BellRing className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="section-heading text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-500">Live</span> Response Tracker
                            {pendingCount > 0 && (
                                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                                    {pendingCount} URGENT
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Real-time emergency assistance requests</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {requests.map(request => (
                    <BrokerRequestItem
                        key={request.id}
                        request={request}
                        onRespond={handleRespond}
                    />
                ))}
            </div>

            <div className="mt-6 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    <span>USP: Guaranteed 10-minute response time active.</span>
                </div>
                <button
                    onClick={() => navigate('/manager/messages')}
                    className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium group"
                >
                    View All Requests
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
};

export default BrokerResponseWidget;

