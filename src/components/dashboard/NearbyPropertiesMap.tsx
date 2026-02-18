'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, X, Navigation, ZoomIn, ZoomOut } from 'lucide-react';

interface UserLocation {
    latitude: number;
    longitude: number;
}

interface Property {
    id: string;
    title?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    price?: number;
    property_type?: string;
    latitude?: number;
    longitude?: number;
    bedrooms?: number;
    bathrooms?: number;
    distance?: number | null;
    category?: string;
}

interface MapBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

interface NearbyPropertiesMapProps {
    properties?: Property[];
    userLocation?: UserLocation | null;
    onPropertyClick?: ((property: Property) => void) | null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const NearbyPropertiesMap = ({
    properties = [],
    userLocation = null,
    onPropertyClick = null,
}: NearbyPropertiesMapProps) => {
    const navigate = useNavigate();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    const defaultLocation = { lat: 51.5074, lng: -0.1278 }; // London

    const [mapCenter, setMapCenter] = useState(() => {
        try {
            if (userLocation && userLocation.latitude && userLocation.longitude) {
                return { lat: userLocation.latitude, lng: userLocation.longitude };
            }
            return defaultLocation;
        } catch {
            return defaultLocation;
        }
    });
    const [zoom, setZoom] = useState(12);

    // Calculate distances and categorize properties
    const propertiesWithDistance = useMemo(() => {
        try {
            if (!properties || !Array.isArray(properties) || properties.length === 0) {
                return [];
            }

            if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
                return properties.map(p => ({ ...p, distance: null, category: 'other' }));
            }

            return properties.map(property => {
                if (!property || !property.latitude || !property.longitude) {
                    return { ...property, distance: null, category: 'other' };
                }

                try {
                    const distance = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        property.latitude,
                        property.longitude
                    );

                    let category = 'other';
                    if (distance <= 1) category = 'very-near';
                    else if (distance <= 3) category = 'near';
                    else if (distance <= 5) category = 'moderate';
                    else category = 'far';

                    return {
                        ...property,
                        distance: Math.round(distance * 10) / 10,
                        category,
                    };
                } catch {
                    return { ...property, distance: null, category: 'other' };
                }
            });
        } catch {
            return properties || [];
        }
    }, [properties, userLocation]);

    // Sort by distance (nearest first)
    const sortedProperties = useMemo(() => {
        return [...propertiesWithDistance].sort((a, b) => {
            if (a.distance === null || a.distance === undefined) return 1;
            if (b.distance === null || b.distance === undefined) return -1;
            return a.distance - b.distance;
        });
    }, [propertiesWithDistance]);

    // Filter properties with valid coordinates
    const propertiesWithCoords = sortedProperties.filter(
        p => p.latitude && p.longitude
    );

    // Calculate map bounds to fit all properties
    const mapBounds = useMemo<MapBounds | null>(() => {
        if (propertiesWithCoords.length === 0) return null;

        const lats = propertiesWithCoords.map(p => p.latitude!);
        const lngs = propertiesWithCoords.map(p => p.longitude!);

        return {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLng: Math.min(...lngs),
            maxLng: Math.max(...lngs),
        };
    }, [propertiesWithCoords]);

    // Adjust map center to fit all properties
    useEffect(() => {
        if (mapBounds && propertiesWithCoords.length > 0) {
            const centerLat = (mapBounds.minLat + mapBounds.maxLat) / 2;
            const centerLng = (mapBounds.minLng + mapBounds.maxLng) / 2;
            setMapCenter({ lat: centerLat, lng: centerLng });
        } else if (userLocation && userLocation.latitude) {
            setMapCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
        }
    }, [mapBounds, userLocation, propertiesWithCoords.length]);

    const handleMarkerClick = (property: Property) => {
        setSelectedProperty(property);
        if (onPropertyClick) {
            onPropertyClick(property);
        }
    };

    const handleViewDetails = (property: Property) => {
        navigate(`/user/dashboard/property/${property.id}`);
    };

    // Get marker color based on distance category
    const getMarkerColor = (category?: string) => {
        switch (category) {
            case 'very-near': return 'bg-green-500';
            case 'near': return 'bg-orange-500';
            case 'moderate': return 'bg-yellow-500';
            case 'far': return 'bg-gray-400';
            default: return 'bg-blue-500';
        }
    };

    // Convert lat/lng to percentage position (for placeholder map)
    const latLngToPosition = (lat: number, lng: number, bounds: MapBounds | null) => {
        if (!bounds) {
            const latOffset = ((lat - mapCenter.lat) * 100) / 0.1;
            const lngOffset = ((lng - mapCenter.lng) * 100) / 0.1;
            return {
                left: `${50 + lngOffset}%`,
                top: `${50 - latOffset}%`,
            };
        }

        const latRange = bounds.maxLat - bounds.minLat || 0.1;
        const lngRange = bounds.maxLng - bounds.minLng || 0.1;

        const left = ((lng - bounds.minLng) / lngRange) * 100;
        const top = ((bounds.maxLat - lat) / latRange) * 100;

        return {
            left: `${Math.max(5, Math.min(95, left))}%`,
            top: `${Math.max(5, Math.min(95, top))}%`,
        };
    };

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            {/* Map Container */}
            <div className="relative w-full h-full">
                {/* Google Maps Satellite Background */}
                <iframe
                    title="Map View"
                    width="100%"
                    height="100%"
                    frameBorder={0}
                    style={{ border: 0, position: 'absolute', inset: 0, zIndex: 0 }}
                    src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d${30000 / zoom}!2d${mapCenter.lng}!3d${mapCenter.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2suk!4v1640000000000!5m2!1sen!2suk`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>

                {/* Overlay for markers */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="relative w-full h-full pointer-events-auto">

                        {/* User Location Marker */}
                        {userLocation && userLocation.latitude && (
                            <div
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                                style={latLngToPosition(userLocation.latitude, userLocation.longitude, mapBounds)}
                            >
                                <div className="relative">
                                    <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                                        <Navigation size={14} className="text-white" />
                                    </div>
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg">
                                        Your Location
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Property Markers */}
                        {propertiesWithCoords.map((property) => {
                            const position = latLngToPosition(
                                property.latitude!,
                                property.longitude!,
                                mapBounds
                            );

                            return (
                                <div
                                    key={property.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                    style={position}
                                >
                                    <button
                                        onClick={() => handleMarkerClick(property)}
                                        className="relative group"
                                    >
                                        <div className={`w-10 h-10 ${getMarkerColor(property.category)} rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer`}>
                                            <Home size={20} className="text-white" />
                                        </div>

                                        {/* Distance Badge */}
                                        {property.distance !== null && property.distance !== undefined && (
                                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                {property.distance} mi
                                            </div>
                                        )}

                                        {/* Selected Property Popup */}
                                        {selectedProperty?.id === property.id && (
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-30">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                                                            {property.title || 'Property'}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                            {property.address_line_1 || property.city || 'UK'}
                                                        </p>
                                                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                                            £{property.price?.toLocaleString()}
                                                            {property.property_type === 'rent' && '/month'}
                                                        </p>
                                                        {property.distance !== null && property.distance !== undefined && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                {property.distance} miles away
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedProperty(null);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                                                    {property.bedrooms && property.bedrooms > 0 && (
                                                        <span>{property.bedrooms} Bed{property.bedrooms !== 1 ? 's' : ''}</span>
                                                    )}
                                                    {property.bathrooms && property.bathrooms > 0 && (
                                                        <span>{property.bathrooms} Bath{property.bathrooms !== 1 ? 's' : ''}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleViewDetails(property)}
                                                    className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-20">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Distance</p>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Very Near (&lt;1 mi)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Near (1-3 mi)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Moderate (3-5 mi)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Far (5+ mi)</span>
                                </div>
                            </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                            <button
                                onClick={() => setZoom(prev => Math.min(20, prev + 1))}
                                className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ZoomIn size={20} className="text-gray-700 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={() => setZoom(prev => Math.max(5, prev - 1))}
                                className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ZoomOut size={20} className="text-gray-700 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Properties Count */}
                        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 z-20">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {propertiesWithCoords.length} {propertiesWithCoords.length === 1 ? 'Property' : 'Properties'} Nearby
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties List Sidebar (Optional - can be toggled) */}
            {selectedProperty && (
                <div className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-30 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Property Details</h3>
                        <button
                            onClick={() => setSelectedProperty(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedProperty.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProperty.address_line_1}</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            £{selectedProperty.price?.toLocaleString()}
                            {selectedProperty.property_type === 'rent' && '/month'}
                        </p>
                        {selectedProperty.distance !== null && selectedProperty.distance !== undefined && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedProperty.distance} miles away
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NearbyPropertiesMap;

