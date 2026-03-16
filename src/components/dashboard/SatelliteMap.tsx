import { useEffect, useState, Suspense, lazy } from 'react';
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
import { useProperties } from '@/contexts/PropertyContext';
import { useMap, MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

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

const filterOptions = [
    { id: 'property', label: 'Properties', icon: Home, color: '#3b82f6' },
    /* Non-functional filters commented out
    { id: 'estate_agent', label: 'Estate Agents', icon: Building2, color: '#10b981' },
    { id: 'locksmith', label: 'Locksmiths', icon: Wrench, color: '#f59e0b' },
    { id: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, color: '#ef4444' },
    { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed, color: '#8b5cf6' },
    { id: 'electrical', label: 'Electrical Shops', icon: Zap, color: '#ec4899' },
    { id: 'mechanic', label: 'Mechanic Shops', icon: Car, color: '#06b6d4' },
    { id: 'furniture', label: 'Furniture Shops', icon: Sofa, color: '#84cc16' },
    { id: 'household', label: 'Household Shops', icon: ShoppingCart, color: '#f97316' },
    */
];

function MapController({ center }: { center: [number, number] }) {
    // We need to access useMap inside MapContainer
    // Since we dynamic import components, we might face issues accessing useMap directly if not careful
    // But useMap is a hook from react-leaflet, which we installed.
    // Ideally we should import useMap from react-leaflet directly, but we need to handle SSR.

    // Actually, useMap is a hook, so it must be used inside a component.
    // We need to import useMap dynamically or just import normally?
    // Hooks can be imported normally.

    const map = useMap();

    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);

    return null;
}

const SatelliteMap = () => {
    const { properties } = useProperties();
    const [activeFilters, setActiveFilters] = useState<string[]>(['property']);
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

    // Map properties to Location interface
    const propertyLocations: Location[] = properties
        .filter(p => p.location?.latitude && p.location?.longitude)
        .map(p => ({
            id: p.id,
            name: p.title,
            type: 'property',
            lat: p.location!.latitude!,
            lng: p.location!.longitude!,
            address: p.address || p.location?.addressLine1,
            phone: p.phoneNumber || p.contact?.phone
        }));

    // Currently we only have real data for properties
    const allLocations = [...propertyLocations];

    const filteredLocations = allLocations.filter(loc => activeFilters.includes(loc.type));

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
                            const count = allLocations.filter(loc => loc.type === filter.id).length;

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
