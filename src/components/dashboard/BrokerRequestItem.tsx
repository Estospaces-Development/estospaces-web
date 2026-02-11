"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, MapPin, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ClientProfileModal from './ClientProfileModal';

export type RequestStatus = 'pending' | 'responded' | 'expired';

export interface BrokerRequest {
    id: string;
    propertyName: string;
    brokerName: string;
    brokerAvatar?: string;
    distance: string;
    timestamp: Date;
    status: RequestStatus;
}

interface BrokerRequestItemProps {
    request: BrokerRequest;
    onRespond: (id: string) => void;
}

const BrokerRequestItem: React.FC<BrokerRequestItemProps> = ({ request, onRespond }) => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Initialize seconds remaining based on 10 minutes minus time elapsed since timestamp
    const [secondsRemaining, setSecondsRemaining] = useState(() => {
        if (request.status !== 'pending') return 0;
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - request.timestamp.getTime()) / 1000);
        const remaining = 600 - elapsed;
        return remaining > 0 ? remaining : 0;
    });

    const [currentStatus, setCurrentStatus] = useState<RequestStatus>(request.status);

    useEffect(() => {
        if (currentStatus !== 'pending') return;

        if (secondsRemaining <= 0) {
            setCurrentStatus('expired');
            return;
        }

        const timer = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    setCurrentStatus('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsRemaining, currentStatus]);

    useEffect(() => {
        if (request.status !== 'pending') {
            setCurrentStatus(request.status);
        }
    }, [request.status]);

    const handleRespond = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentStatus('responded');
        onRespond(request.id);
        router.push('/manager/messages'); // Redirect to messages
    };

    const handleViewProperty = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Navigate to a property detail or list for now
        router.push(`/manager/properties`);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressColor = () => {
        if (secondsRemaining < 60) return 'bg-red-500';
        if (secondsRemaining < 300) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusBadge = () => {
        switch (currentStatus) {
            case 'responded':
                return (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Responded
                    </span>
                );
            case 'expired':
                return (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        Expired
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                );
        }
    };

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer ${currentStatus === 'expired'
                    ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 opacity-75'
                    : 'bg-white border-gray-200 dark:bg-black dark:border-gray-800 hover:shadow-md hover:scale-[1.01]'
                    }`}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {request.brokerAvatar ? (
                                <img src={request.brokerAvatar} alt={request.brokerName} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                                    <User className="w-5 h-5" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-0.5">
                                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-black ${currentStatus === 'responded' ? 'bg-green-500' : currentStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                                    }`}></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm hover:text-orange-500 transition-colors">{request.brokerName}</h4>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{request.distance}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {getStatusBadge()}
                    </div>
                </div>

                <div className="mb-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{request.propertyName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Requested {request.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                {currentStatus === 'pending' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className={`${secondsRemaining < 60 ? 'text-red-600 animate-pulse' : 'text-gray-600 dark:text-gray-300'}`}>
                                Response required in:
                            </span>
                            <span className={`font-mono text-sm ${secondsRemaining < 60 ? 'text-red-600 font-bold' : 'text-gray-800 dark:text-white'}`}>
                                {formatTime(secondsRemaining)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
                                style={{ width: `${(secondsRemaining / 600) * 100}%` }}
                            ></div>
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleRespond}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1 group relative z-10"
                            >
                                <span>Respond Now</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                            </button>
                            <button
                                onClick={handleViewProperty}
                                className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-200 dark:border-gray-700 relative z-10"
                            >
                                View Properties
                            </button>
                        </div>
                    </div>
                )}

                {currentStatus !== 'pending' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                            {currentStatus === 'responded' ? 'Response sent' : 'Time limit exceeded'}
                        </span>
                        <button
                            onClick={handleViewProperty}
                            className="text-orange-500 hover:underline relative z-10"
                        >
                            View Properties
                        </button>
                    </div>
                )}
            </div>

            <ClientProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                clientName={request.brokerName}
                avatar={request.brokerAvatar}
            />
        </>
    );
};

export default BrokerRequestItem;
