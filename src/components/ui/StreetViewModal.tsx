"use client";

import React from 'react';
import { X } from 'lucide-react';

interface StreetViewModalProps {
    location: { lat: number; lng: number };
    onClose: () => void;
}

const StreetViewModal: React.FC<StreetViewModalProps> = ({ location, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">Step Inside with Street View</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Iframe Container */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 text-center">
                    <div>
                        <h4 className="text-xl font-bold text-gray-800 mb-2">Street View Integration Pending</h4>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Street View is not currently available for this property. We are working on integrating the mapping service. Coordinates: {location.lat}, {location.lng}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreetViewModal;
