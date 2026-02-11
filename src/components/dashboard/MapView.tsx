"use client";

import React, { useState } from 'react';
import { MapPin, Home, Building2, X, Layers, Globe } from 'lucide-react';

interface MapViewProps {
    houses?: any[];
    agencies?: any[];
}

const MapView: React.FC<MapViewProps> = ({ houses = [], agencies = [] }) => {
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
    const [selectedMarker, setSelectedMarker] = useState<any>(null);

    // Map styles configuration
    const mapStyles = {
        standard: {
            bg: 'bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 dark:from-blue-900/10 dark:via-green-900/10 dark:to-blue-900/10',
            pattern: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
            opacity: 0.2
        },
        satellite: {
            bg: 'bg-gray-900',
            pattern: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            opacity: 0.15,
            overlay: 'linear-gradient(to bottom right, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.8))'
        }
    };

    const currentStyle = mapStyles[mapStyle];

    const handleMarkerClick = (item: any, type: string) => {
        setSelectedMarker({ ...item, type });
    };

    const closePopup = () => {
        setSelectedMarker(null);
    };

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {/* View Toggle Control */}
            <div className="absolute top-4 right-4 z-20 flex bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-1">
                <button
                    onClick={() => setMapStyle('standard')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mapStyle === 'standard'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <Layers size={16} />
                    Standard
                </button>
                <button
                    onClick={() => setMapStyle('satellite')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mapStyle === 'satellite'
                        ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <Globe size={16} />
                    Satellite
                </button>
            </div>

            {/* Map Background */}
            <div className={`relative w-full h-full transition-colors duration-500 ${currentStyle.bg}`}>
                {/* Pattern Overlay */}
                <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: currentStyle.opacity }}>
                    <div className="w-full h-full" style={{
                        backgroundImage: currentStyle.pattern,
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>

                {/* Center Message */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                        <MapPin size={48} className="mx-auto mb-2 text-orange-500" />
                        <p className="text-gray-700 dark:text-gray-200 font-medium text-lg">Interactive Map View</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click markers to view details</p>
                    </div>
                </div>

                {/* Markers Container */}
                <div className="absolute inset-0">
                    {/* House Markers */}
                    {houses.map((house, idx) => {
                        // Simulated positioning for demo
                        const positions = [
                            { left: '25%', top: '35%' },
                            { left: '65%', top: '45%' },
                            { left: '45%', top: '65%' },
                            { left: '15%', top: '75%' },
                            { left: '85%', top: '25%' },
                        ];
                        const pos = positions[idx % positions.length];

                        return (
                            <div
                                key={`house-${house.id}`}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                style={pos}
                            >
                                <button
                                    onClick={() => handleMarkerClick(house, 'house')}
                                    className="relative group focus:outline-none"
                                >
                                    <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                                        <Home size={20} className="text-white" />
                                    </div>
                                    {selectedMarker?.id === house.id && selectedMarker?.type === 'house' && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-20 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{house.name || house.title}</h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closePopup();
                                                    }}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">{house.address}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{house.price}</p>
                                        </div>
                                    )}
                                </button>
                            </div>
                        );
                    })}

                    {/* Agency Markers */}
                    {agencies.map((agency, idx) => {
                        const positions = [
                            { left: '50%', top: '30%' },
                            { left: '30%', top: '60%' },
                            { left: '70%', top: '55%' },
                        ];
                        const pos = positions[idx % positions.length];

                        return (
                            <div
                                key={`agency-${agency.id}`}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                style={pos}
                            >
                                <button
                                    onClick={() => handleMarkerClick(agency, 'agency')}
                                    className="relative group focus:outline-none"
                                >
                                    <div className="w-10 h-10 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                                        <Building2 size={20} className="text-white" />
                                    </div>
                                    {selectedMarker?.id === agency.id && selectedMarker?.type === 'agency' && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-20 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{agency.name}</h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closePopup();
                                                    }}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{agency.address}</p>
                                        </div>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 z-10">
                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Properties</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Agencies</span>
                        </div>
                    </div>
                </div>

                {/* Click outside to close popup */}
                {selectedMarker && (
                    <div
                        className="absolute inset-0 z-0"
                        onClick={closePopup}
                    />
                )}
            </div>
        </div>
    );
};

export default MapView;
