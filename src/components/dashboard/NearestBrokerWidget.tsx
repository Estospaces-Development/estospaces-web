'use client';

import { useState, useEffect } from 'react';
import { MapPin, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NearestBrokerWidget = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [progress, setProgress] = useState(0);

    const broker = {
        name: 'Sarah Johnson',
        agency: 'Prime Realty Group',
        distance: '0.8 miles',
        phone: '+1 (555) 123-4567',
    };

    useEffect(() => {
        if (status === 'connecting') {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setStatus('connected');
                        return 100;
                    }
                    return prev + 2;
                });
            }, 50);
            return () => clearInterval(interval);
        }
    }, [status]);

    const handleConnect = () => {
        setStatus('connecting');
        setProgress(0);
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Nearest Broker</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Based on your current location</p>
                </div>
                <div className={`p-2 rounded-full ${status === 'connected' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                    {status === 'connected' ? (
                        <CheckCircle className="text-green-500 dark:text-green-400" size={16} />
                    ) : (
                        <MapPin className="text-orange-500 dark:text-orange-400" size={16} />
                    )}
                </div>
            </div>

            {/* Broker Info */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                            {broker.name.charAt(0)}
                        </div>
                        {status === 'idle' && (
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{broker.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{broker.agency}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 py-1.5 px-3 rounded-lg w-fit">
                    <MapPin size={12} className="text-orange-500" />
                    <span>{broker.distance} away</span>
                </div>
            </div>

            {/* Status & Actions */}
            <div className="space-y-3">
                {status === 'idle' && (
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Available Now</span>
                    </div>
                )}

                {status === 'connecting' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Connecting...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-75 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="flex items-center gap-2 mb-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-800/30">
                        <CheckCircle className="text-green-500" size={14} />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Connected successfully</span>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                    {status === 'idle' ? (
                        <button
                            onClick={handleConnect}
                            className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Connect Now
                        </button>
                    ) : status === 'connected' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => alert(`Calling ${broker.name}...`)}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-xs transition-colors"
                            >
                                Call
                            </button>
                            <button
                                onClick={() => navigate(`/user/dashboard/messages?newConversationWith=${encodeURIComponent(broker.name)}`)}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-xs transition-colors shadow-sm"
                            >
                                Message
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled
                            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl font-medium text-sm cursor-not-allowed"
                        >
                            Connecting...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NearestBrokerWidget;

