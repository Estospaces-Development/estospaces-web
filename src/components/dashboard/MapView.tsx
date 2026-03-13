"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Home, Building2, X, Layers, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icons
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
    houses?: any[];
    agencies?: any[];
}

// Custom marker icons
const createCustomIcon = (color: string, iconType: 'house' | 'agency') => {
    if (typeof window === 'undefined') return null;

    const symbol = iconType === 'house' ? '🏠' : '🏢';

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        font-size: 18px;
        line-height: 1;
      ">${symbol}</div>
    </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });
};

const houseIcon = createCustomIcon('#ef4444', 'house');
const agencyIcon = createCustomIcon('#3b82f6', 'agency');

function MapAutoCenter({ houses }: { houses: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (houses.length > 0) {
            const bounds = L.latLngBounds(houses.map(h => [h.lat, h.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [houses, map]);

    return null;
}

const MapView: React.FC<MapViewProps> = ({ houses = [], agencies = [] }) => {
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                <span className="text-gray-400">Loading map component...</span>
            </div>
        );
    }

    // Filter out items without coordinates
    const validHouses = houses.filter(h => h.lat != null && h.lng != null);
    const validAgencies = agencies.filter(a => a.lat != null && a.lng != null);

    // Center on London by default if no houses
    const defaultCenter: [number, number] = [51.5074, -0.1278];

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {/* View Toggle Control */}
            <div className="absolute top-4 right-4 z-[1000] flex bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-1">
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

            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <MapAutoCenter houses={validHouses} />

                {mapStyle === 'standard' ? (
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
                    />
                ) : (
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                )}

                {/* House Markers */}
                {validHouses.map((house) => (
                    <Marker
                        key={`house-${house.id}`}
                        position={[house.lat, house.lng]}
                        icon={houseIcon as L.DivIcon}
                    >
                        <Popup>
                            <div className="p-1 min-w-[200px]">
                                <h4 className="font-bold text-gray-900 mb-1">{house.title}</h4>
                                <p className="text-xs text-gray-600 mb-2">{house.address}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-orange-600">{house.price}</span>
                                    <button
                                        className="text-[10px] uppercase font-bold text-gray-400 hover:text-orange-500 transition-colors"
                                        onClick={() => window.location.href = `/user/properties/${house.id}`}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Agency Markers */}
                {validAgencies.map((agency) => (
                    <Marker
                        key={`agency-${agency.id}`}
                        position={[agency.lat, agency.lng]}
                        icon={agencyIcon as L.DivIcon}
                    >
                        <Popup>
                            <div className="p-1">
                                <h4 className="font-bold text-gray-900 mb-1">{agency.name}</h4>
                                <p className="text-xs text-gray-600">{agency.address}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 z-[1000]">
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
        </div>
    );
};

export default MapView;
