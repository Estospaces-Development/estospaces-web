"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {  Layers, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from '@/lib/leafletReact';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { getVerifiedPropertyMapCoordinates } from '@/lib/mapCoordinates';

// Fix for Leaflet marker icons
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
    houses?: any[];
    agencies?: any[];
    onOpenProperty?: ((property: any) => void) | null;
    onStartFastTrack?: ((property: any) => void) | null;
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

function MapAutoCenter({ locations }: { locations: any[] }) {
    const map = useMap();

    useEffect(() => {
        try {
            map.closePopup();
            if (locations.length > 0) {
                const bounds = L.latLngBounds(locations.map((location) => [location.lat, location.lng]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        } catch {
            // Keep the page usable when Leaflet tears down during route churn.
        }
    }, [locations, map]);

    return null;
}

const MapView: React.FC<MapViewProps> = ({ houses = [], agencies = [], onOpenProperty = null, onStartFastTrack = null }) => {
    const navigate = useNavigate();
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const validHouses = useMemo(() => houses.flatMap((house) => {
        const coordinates = getVerifiedPropertyMapCoordinates({
            ...house,
            latitude: house.lat,
            longitude: house.lng,
        });
        return coordinates ? [{ ...house, lat: coordinates.latitude, lng: coordinates.longitude }] : [];
    }), [houses]);
    const validAgencies = useMemo(() => agencies.flatMap((agency) => {
        const coordinates = getVerifiedPropertyMapCoordinates({
            ...agency,
            latitude: agency.lat,
            longitude: agency.lng,
            address: agency.address,
        });
        return coordinates ? [{ ...agency, lat: coordinates.latitude, lng: coordinates.longitude }] : [];
    }), [agencies]);
    const validLocations = useMemo(
        () => [...validHouses, ...validAgencies],
        [validAgencies, validHouses],
    );
    const mapKey = useMemo(() => [
        mapStyle,
        ...validHouses.map((house) => `house:${house.id}:${house.lat}:${house.lng}`),
        ...validAgencies.map((agency) => `agency:${agency.id}:${agency.lat}:${agency.lng}`),
    ].join('|'), [mapStyle, validAgencies, validHouses]);

    if (!isMounted) {
        return (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                <BrandLoadingScreen variant="panel" label="Loading map..." />
            </div>
        );
    }

    if (validLocations.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
                <div className="max-w-sm">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">No verified map locations</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Properties and agencies appear here only when their saved coordinates are valid for a supported market.
                    </p>
                </div>
            </div>
        );
    }

    const defaultCenter: [number, number] = [validLocations[0].lat, validLocations[0].lng];

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {/* View Toggle Control */}
            <div className="absolute top-4 right-4 z-[1000] flex bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 p-1">
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
                key={mapKey}
                center={defaultCenter}
                zoom={12}
                minZoom={2}
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1}
                worldCopyJump
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
                fadeAnimation={false}
                markerZoomAnimation={false}
                zoomAnimation={false}
            >
                <MapAutoCenter locations={validLocations} />

                {mapStyle === 'standard' ? (
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        noWrap
                    />
                ) : (
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        noWrap
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
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <button
                                        className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50"
                                        onClick={() => {
                                            if (onOpenProperty) {
                                                onOpenProperty(house);
                                                return;
                                            }
                                            navigate(`/user/properties/${house.id}`);
                                        }}
                                    >
                                        Open property
                                    </button>
                                    <button
                                        className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                                        onClick={() => {
                                            if (onStartFastTrack) {
                                                onStartFastTrack(house);
                                                return;
                                            }
                                            navigate(`/user/properties/${house.id}?fast-track=1`);
                                        }}
                                    >
                                        Request fast-track
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
            <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-100 dark:border-gray-700 z-[1000]">
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
