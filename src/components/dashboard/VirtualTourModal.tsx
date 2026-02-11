"use client";

import React from 'react';
import { X, Maximize2 } from 'lucide-react';

interface VirtualTourModalProps {
    property: {
        title: string;
        virtual_tour_url?: string;
    };
    onClose: () => void;
}

const VirtualTourModal: React.FC<VirtualTourModalProps> = ({ property, onClose }) => {
    // Mock tour URL if none provided
    const tourUrl = property?.virtual_tour_url || "https://my.matterport.com/show/?m=JGPnGQ6wM5l&play=1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            3D Virtual Tour
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{property?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.open(tourUrl, '_blank')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors hidden sm:block"
                            title="Open in new tab"
                        >
                            <Maximize2 size={20} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-100 dark:bg-black relative group">
                    <iframe
                        src={tourUrl}
                        className="w-full h-full border-0"
                        allow="fullscreen"
                        title={`Virtual Tour of ${property?.title}`}
                        loading="lazy"
                    />

                    {/* Overlay hint */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-white text-center text-sm font-medium">
                            Click and drag to look around • Use arrow keys to move
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualTourModal;
