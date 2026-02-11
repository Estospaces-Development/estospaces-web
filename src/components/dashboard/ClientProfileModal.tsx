"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Phone, Mail, MapPin, Calendar, Home } from 'lucide-react';

interface ClientProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    avatar?: string;
    clientId?: string;
}

const ClientProfileModal: React.FC<ClientProfileModalProps> = ({ isOpen, onClose, clientName, avatar, clientId = '1' }) => {
    const router = useRouter();

    if (!isOpen) return null;

    const handleViewHistory = () => {
        router.push(`/manager/leads`); // Using leads page as proxy for client history for now
    };

    const handleMessage = () => {
        router.push('/manager/messages');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
                {/* Header Background */}
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-1 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Profile Content */}
                <div className="px-6 pb-6 mt-[-3rem]">
                    <div className="flex flex-col items-center">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100 mb-4">
                            {avatar ? (
                                <img src={avatar} alt={clientName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-500">
                                    <User className="w-10 h-10" />
                                </div>
                            )}
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{clientName}</h2>
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-6">
                            <MapPin className="w-4 h-4" />
                            <span>Mumbai, India</span>
                        </div>

                        {/* Info Grid */}
                        <div className="w-full grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <Phone className="w-3 h-3" />
                                    <span>Phone</span>
                                </div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">+91 98765 43210</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <Mail className="w-3 h-3" />
                                    <span>Email</span>
                                </div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">client@example.com</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Member Since</span>
                                </div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">Jan 2024</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <Home className="w-3 h-3" />
                                    <span>Interested In</span>
                                </div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">Rent, Buy</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full flex gap-3">
                            <button
                                onClick={handleViewHistory}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-medium transition-colors"
                            >
                                View History
                            </button>
                            <button
                                onClick={handleMessage}
                                className="flex-1 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-medium transition-colors"
                            >
                                Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientProfileModal;
