"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, ArrowRight, MoreHorizontal, Info, BellRing } from 'lucide-react';
import BrokerRequestItem, { BrokerRequest } from './BrokerRequestItem';
import * as leadsService from '@/services/leadsService';

const BrokerResponseWidget: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<BrokerRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await leadsService.getBrokerLeads('pending');
            if (res.data) {
                const mapped = res.data.map(lead => ({
                    id: lead.id,
                    propertyName: lead.property?.title || 'Unknown Property',
                    brokerName: lead.property?.agent_name || 'Assigned Broker',
                    distance: 'Nearby', // Distance not in lead model yet
                    timestamp: new Date(lead.created_at),
                    status: (lead.status as any) || 'pending'
                }));
                setRequests(mapped.slice(0, 4));
            }
        } catch (error) {
            console.error('Error fetching broker leads:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleRespond = async (id: string) => {
        try {
            // Default response for quick tracking
            const res = await leadsService.respondToLead(id, 'message', 'I am looking into your request.');
            if (res.data) {
                setRequests(prev => prev.map(req =>
                    req.id === id ? { ...req, status: 'responded' } : req
                ));
            }
        } catch (error) {
            console.error('Error responding to lead:', error);
        }
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
                {loading ? (
                    <div className="col-span-full py-8 text-center text-gray-400">Loading requests...</div>
                ) : requests.length > 0 ? (
                    requests.map(request => (
                        <BrokerRequestItem
                            key={request.id}
                            request={request}
                            onRespond={handleRespond}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center text-gray-400">No active requests.</div>
                )}
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
