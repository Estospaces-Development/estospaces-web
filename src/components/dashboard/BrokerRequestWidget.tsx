"use client";

import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, MapPin, Building, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BrokerRequestWidget = () => {
    const { user } = useAuth();
    const [requestType, setRequestType] = useState('buy'); // buy, rent, sell, let
    const [details, setDetails] = useState('');
    const [location, setLocation] = useState('');
    const [budget, setBudget] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verification logic logic (e.g. check if user has verified phone)
            // For now, just succeed
            setSuccess(true);
            setDetails('');
            setLocation('');
            setBudget('');
        } catch (err: any) {
            setError('Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Request Sent!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-w-xs">
                    Your request has been broadcasted to verified top-rated brokers in your area. You'll receive proposals shortly.
                </p>
                <button
                    onClick={() => setSuccess(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                    Send Another Request
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Send size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Request a Broker</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Get proposals from top-rated agents</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Request Type Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                    {['buy', 'rent', 'sell'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setRequestType(type)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${requestType === type
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Preferred Location
                        </label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Downtown, West End"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Budget / Price Range
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">£</span>
                            <input
                                type="text"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="e.g. 500k - 600k"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Requirements
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="e.g. 2 bedrooms, balcony, pet friendly..."
                            rows={3}
                            className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send size={16} />
                    )}
                    {loading ? 'Broadcasting...' : 'Broadcast Request'}
                </button>

                <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                    Your request will be sent to verified brokers only.
                </p>
            </form>
        </div>
    );
};

export default BrokerRequestWidget;
