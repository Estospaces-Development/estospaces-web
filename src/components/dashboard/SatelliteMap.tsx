"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Home,
    Building2,
    Wrench,
    ShoppingCart,
    UtensilsCrossed,
    Zap,
    Car,
    Sofa,
    Filter,
    X
} from 'lucide-react';

// Dynamically import Leaflet components with ssr: false
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

// We need to import leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
// Since we are in Next.js, we might need to handle icons differently or just rely on CSS
// However, creating custom icons is safer.

import L from 'leaflet';

// Custom marker icons
const createCustomIcon = (color: string, symbol: string) => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') return null;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: 16px;
        font-weight: bold;
        line-height: 1;
      ">${symbol}</div>
    </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

interface Location {
    id: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
    address?: string;
    phone?: string;
}

// Dummy data for different location types
const dummyLocations: Location[] = [
    // Properties
    { id: '1', name: 'Modern Downtown Apartment', type: 'property', lat: 51.5074, lng: -0.1278, address: '123 Main St, London, UK' },
    { id: '2', name: 'Luxury Condo', type: 'property', lat: 51.5155, lng: -0.0932, address: '456 Oak Ave, City of London, UK' },
    { id: '3', name: 'Spacious Penthouse', type: 'property', lat: 51.5033, lng: -0.1195, address: '789 South Bank, London, UK' },

    // Estate Agents
    { id: '6', name: 'Prime Real Estate', type: 'estate_agent', lat: 51.5100, lng: -0.1300, address: '100 Broadway, London, UK', phone: '(555) 123-4567' },
    { id: '7', name: 'Elite Properties', type: 'estate_agent', lat: 51.5200, lng: -0.1000, address: '200 Sunset Blvd, London, UK', phone: '(555) 234-5678' },

    // Supermarkets
    { id: '11', name: 'Tesco Express', type: 'supermarket', lat: 51.5050, lng: -0.1250, address: '700 6th Ave, London, UK', phone: '(555) 333-4444' },

    // Restaurants
    { id: '14', name: 'The Grill House', type: 'restaurant', lat: 51.5080, lng: -0.1280, address: '123 5th Ave, London, UK', phone: '(555) 666-7777' },
];

const filterOptions = [
    { id: 'property', label: 'Properties', icon: Home, color: '#3b82f6' },
    { id: 'estate_agent', label: 'Estate Agents', icon: Building2, color: '#10b981' },
    { id: 'locksmith', label: 'Locksmiths', icon: Wrench, color: '#f59e0b' },
    { id: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, color: '#ef4444' },
    { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed, color: '#8b5cf6' },
    { id: 'electrical', label: 'Electrical Shops', icon: Zap, color: '#ec4899' },
    { id: 'mechanic', label: 'Mechanic Shops', icon: Car, color: '#06b6d4' },
    { id: 'furniture', label: 'Furniture Shops', icon: Sofa, color: '#84cc16' },
    { id: 'household', label: 'Household Shops', icon: ShoppingCart, color: '#f97316' },
];

function MapController({ center }: { center: [number, number] }) {
    // We need to access useMap inside MapContainer
    // Since we dynamic import components, we might face issues accessing useMap directly if not careful
    // But useMap is a hook from react-leaflet, which we installed.
    // Ideally we should import useMap from react-leaflet directly, but we need to handle SSR.

    // Actually, useMap is a hook, so it must be used inside a component.
    // We need to import useMap dynamically or just import normally?
    // Hooks can be imported normally.

    const { useMap } = require('react-leaflet');
    const map = useMap();

    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);

    return null;
}

const SatelliteMap = () => {
    const [activeFilters, setActiveFilters] = useState<string[]>(['property', 'estate_agent', 'restaurant', 'supermarket']);
    const [showFilters, setShowFilters] = useState(true);
    const [mapCenter] = useState<[number, number]>([51.5074, -0.1278]); // London
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const toggleFilter = (filterId: string) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
        );
    };

    const filteredLocations = dummyLocations.filter(loc => activeFilters.includes(loc.type));

    const getIconForType = (type: string) => {
        const filter = filterOptions.find(f => f.id === type);
        if (!filter) return null;

        const symbols: Record<string, string> = {
            property: '🏠',
            estate_agent: '🏢',
            locksmith: '🔒',
            supermarket: '🛒',
            restaurant: '🍽️',
            electrical: '⚡',
            mechanic: '🔧',
            furniture: '🛋️',
            household: '🏪'
        };

        return createCustomIcon(filter.color, symbols[type] || '📍');
    };

    if (!isMounted) {
        return <div className="w-full h-full bg-gray-100 dark:bg-gray-900 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Loading Map...</span>
        </div>;
    }

    return (
        <div className="relative w-full h-full min-h-[500px]">
            {/* Filter Panel */}
            {showFilters && (
                <div className="absolute top-4 left-4 z-[500] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h3 className="font-semibold text-gray-800 dark:text-white">Filters</h3>
                        </div>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {filterOptions.map((filter) => {
                            const Icon = filter.icon;
                            const isActive = activeFilters.includes(filter.id);
                            const count = dummyLocations.filter(loc => loc.type === filter.id).length;

                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => toggleFilter(filter.id)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${isActive
                                            ? 'bg-gray-100 dark:bg-gray-700 border-2 border-primary'
                                            : 'bg-transparent border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: isActive ? filter.color : '#e5e7eb' }}
                                    >
                                        <Icon
                                            className="w-4 h-4"
                                            style={{ color: isActive ? 'white' : '#6b7280' }}
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-medium text-gray-800 dark:text-white">
                                            {filter.label}
                                        </div>
                                        {count > 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {count} locations
                                            </div>
                                        )}
                                    </div>
                                    {isActive && (
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: filter.color }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Toggle Filters Button */}
            {!showFilters && (
                <button
                    onClick={() => setShowFilters(true)}
                    className="absolute top-4 left-4 z-[500] bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
                </button>
            )}

            {/* Map Container */}
            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 0, borderRadius: '0.75rem' }}
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <MapController center={mapCenter} />

                {/* Satellite Tile Layer (Esri World Imagery) */}
                <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Markers */}
                {filteredLocations.map((location) => {
                    const icon = getIconForType(location.type);
                    if (!icon) return null;
                    return (
                        <Marker
                            key={location.id}
                            position={[location.lat, location.lng]}
                            icon={icon}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-semibold text-gray-800 mb-1">{location.name}</h3>
                                    {location.address && (
                                        <p className="text-sm text-gray-600 mb-1">{location.address}</p>
                                    )}
                                    {location.phone && (
                                        <p className="text-sm text-gray-600">{location.phone}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    );
};

export default SatelliteMap;
