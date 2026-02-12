"use client";

import React from 'react';
import { X } from 'lucide-react';

interface StreetViewModalProps {
    location: { lat: number; lng: number };
    onClose: () => void;
}

const StreetViewModal: React.FC<StreetViewModalProps> = ({ location, onClose }) => {
    // In a real app, you would use a valid Google Maps API Key
    // flexible mode used here for demo purposes if possible, or standard embed format
    // For this demo, we'll construct a URL that tries to show the location
    const streetViewUrl = `https://www.google.com/maps/embed?pb=!4v1615456789012!6m8!1m7!1sCAoSLEFGMVFpcE5CZHZFc2c2b0w0d1J1Yk1Wc0tIS2ktY2c2Y2c2Y2c2Y2c2Y2c!2m2!1d${location.lat}!2d${location.lng}!3f0!4f0!5f0.7820865974627469`;

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
                <div className="flex-1 bg-gray-100 relative">
                    <iframe
                        src={streetViewUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Street View"
                    ></iframe>

                    {/* Fallback/Note for Demo */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-lg text-xs text-gray-500 text-center pointer-events-none">
                        Note: Street View availability depends on Google Maps coverage for the specific coordinates.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreetViewModal;
