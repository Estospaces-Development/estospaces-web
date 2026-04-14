'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, X } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface NearbyPropertiesMapProps {
    properties?: Property[];
    userLocation?: UserLocation | null;
    onPropertyClick?: ((property: Property) => void) | null;
    onOpenWorkspace?: ((property: Property) => void) | null;
    onStartFastTrack?: ((property: Property) => void) | null;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const radiusMiles = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radiusMiles * c;
};

const createPropertyIcon = (color: string, selected: boolean) => L.divIcon({
    className: 'nearby-property-marker',
    html: `<div style="
        background:${color};
        width:${selected ? 42 : 36}px;
        height:${selected ? 42 : 36}px;
        border-radius:999px;
        border:3px solid white;
        box-shadow:0 12px 24px rgba(15,23,42,0.28);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:700;
        font-size:16px;
    ">&#8962;</div>`,
    iconSize: [selected ? 42 : 36, selected ? 42 : 36],
    iconAnchor: [selected ? 21 : 18, selected ? 42 : 36],
    popupAnchor: [0, selected ? -34 : -30],
});

function MapAutoFit({
    userLocation,
    properties,
}: {
    userLocation: UserLocation | null;
    properties: Property[];
}) {
    const map = useMap();

    useEffect(() => {
        try {
            const points: [number, number][] = [];

            map.closePopup();

            if (userLocation?.latitude && userLocation?.longitude) {
                points.push([userLocation.latitude, userLocation.longitude]);
            }

            properties.forEach((property) => {
                if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
                    points.push([property.latitude, property.longitude]);
                }
            });

            if (points.length === 0) {
                map.setView([54.5, -3], 5);
                return;
            }

            if (points.length === 1) {
                map.setView(points[0], 14);
                return;
            }

            map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 15 });
        } catch {
            // Ignore transient Leaflet teardown errors during route or data changes.
        }
    }, [map, properties, userLocation]);

    return null;
}

const NearbyPropertiesMap = ({
    properties = [],
    userLocation = null,
    onPropertyClick = null,
    onOpenWorkspace = null,
    onStartFastTrack = null,
}: NearbyPropertiesMapProps) => {
    const navigate = useNavigate();
    const [isMounted, setIsMounted] = useState(false);
    const [selectedPropertyID, setSelectedPropertyID] = useState<string | null>(null);
    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatPropertyPrice = (price?: number) => {
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            return 'Price unavailable';
        }

        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0,
        }).format(price);
    };

    const propertiesWithDistance = useMemo(() => {
        if (!Array.isArray(properties) || properties.length === 0) {
            return [];
        }

        if (!userLocation?.latitude || !userLocation?.longitude) {
            return properties.map((property) => ({ ...property, distance: null, category: 'other' }));
        }

        return properties.map((property) => {
            if (typeof property.latitude !== 'number' || typeof property.longitude !== 'number') {
                return { ...property, distance: null, category: 'other' };
            }

            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                property.latitude,
                property.longitude,
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
        });
    }, [properties, userLocation]);

    const sortedProperties = useMemo(() => (
        [...propertiesWithDistance].sort((left, right) => {
            if (left.distance === null || left.distance === undefined) return 1;
            if (right.distance === null || right.distance === undefined) return -1;
            return left.distance - right.distance;
        })
    ), [propertiesWithDistance]);

    const propertiesWithCoords = useMemo(() => (
        sortedProperties.filter((property) => (
            typeof property.latitude === 'number' && typeof property.longitude === 'number'
        ))
    ), [sortedProperties]);

    useEffect(() => {
        if (propertiesWithCoords.length === 0) {
            if (selectedPropertyID !== null) {
                setSelectedPropertyID(null);
            }
            if (isSelectionDismissed) {
                setIsSelectionDismissed(false);
            }
            return;
        }

        if (!selectedPropertyID && !isSelectionDismissed && propertiesWithCoords[0]) {
            setSelectedPropertyID(propertiesWithCoords[0].id);
            return;
        }

        if (selectedPropertyID && !propertiesWithCoords.some((property) => property.id === selectedPropertyID)) {
            setIsSelectionDismissed(false);
            setSelectedPropertyID(propertiesWithCoords[0]?.id || null);
        }
    }, [isSelectionDismissed, propertiesWithCoords, selectedPropertyID]);

    const selectedProperty = useMemo(
        () => propertiesWithCoords.find((property) => property.id === selectedPropertyID) || null,
        [propertiesWithCoords, selectedPropertyID],
    );
    const mapKey = useMemo(() => [
        userLocation?.latitude ?? 'none',
        userLocation?.longitude ?? 'none',
        ...propertiesWithCoords.map((property) => `${property.id}:${property.latitude}:${property.longitude}`),
    ].join('|'), [propertiesWithCoords, userLocation?.latitude, userLocation?.longitude]);

    const hasMapData = Boolean(
        (userLocation?.latitude && userLocation?.longitude) || propertiesWithCoords.length > 0,
    );

    const getMarkerColor = (category?: string) => {
        switch (category) {
            case 'very-near':
                return '#16a34a';
            case 'near':
                return '#f97316';
            case 'moderate':
                return '#eab308';
            case 'far':
                return '#94a3b8';
            default:
                return '#2563eb';
        }
    };

    const handleOpenWorkspace = (property: Property) => {
        if (onOpenWorkspace) {
            onOpenWorkspace(property);
            return;
        }

        navigate(`/user/properties/${property.id}`);
    };

    const handleStartFastTrack = (property: Property) => {
        if (onStartFastTrack) {
            onStartFastTrack(property);
            return;
        }

        navigate(`/user/properties/${property.id}?fast-track=1`);
    };

    if (!hasMapData) {
        return (
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800">
                <div className="flex h-full w-full items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                            <Navigation size={24} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Map unavailable</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add a postcode to your profile or search for a location to view nearby properties.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isMounted) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading nearby map...</span>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800">
            <MapContainer
                key={mapKey}
                center={[54.5, -3]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
                fadeAnimation={false}
                markerZoomAnimation={false}
                zoomAnimation={false}
            >
                <MapAutoFit userLocation={userLocation} properties={propertiesWithCoords} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation?.latitude && userLocation?.longitude ? (
                    <CircleMarker
                        center={[userLocation.latitude, userLocation.longitude]}
                        radius={10}
                        pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9, weight: 3 }}
                    >
                        <Popup>
                            <div className="min-w-[160px]">
                                <p className="text-sm font-semibold text-slate-900">Your location</p>
                                <p className="mt-1 text-xs text-slate-500">Nearby property ranking starts from here.</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ) : null}

                {propertiesWithCoords.map((property) => {
                    const isSelected = property.id === selectedPropertyID;
                    return (
                        <Marker
                            key={property.id}
                            position={[property.latitude as number, property.longitude as number]}
                            icon={createPropertyIcon(getMarkerColor(property.category), isSelected)}
                            eventHandlers={{
                                click: () => {
                                    setIsSelectionDismissed(false);
                                    setSelectedPropertyID(property.id);
                                    onPropertyClick?.(property);
                                },
                            }}
                        >
                            <Popup>
                                <div className="min-w-[220px] p-1">
                                    <h4 className="text-sm font-semibold text-slate-900">
                                        {property.title || 'Property'}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {[property.address_line_1, property.city, property.postcode].filter(Boolean).join(', ') || 'UK'}
                                    </p>
                                    <p className="mt-2 text-sm font-bold text-orange-600">
                                        {formatPropertyPrice(property.price)}
                                        {property.property_type === 'rent' ? '/month' : ''}
                                    </p>
                                    {property.distance !== null && property.distance !== undefined ? (
                                        <p className="mt-1 text-xs text-slate-500">{property.distance} miles away</p>
                                    ) : null}
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenWorkspace(property)}
                                            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Open property
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStartFastTrack(property)}
                                            className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                                        >
                                            Start fast-track
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {propertiesWithCoords.length} {propertiesWithCoords.length === 1 ? 'Property' : 'Properties'} nearby
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Real map markers stay linked to the live property workspace.
                </p>
            </div>

            <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Distance</p>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-500" />
                        <span>Very near (&lt;1 mi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-orange-500" />
                        <span>Near (1-3 mi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span>Moderate (3-5 mi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-400" />
                        <span>Far (5+ mi)</span>
                    </div>
                </div>
            </div>

            {selectedProperty ? (
                <div className="absolute right-4 top-4 z-[1000] w-[320px] max-w-[calc(100%-2rem)] rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/95">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Selected property</p>
                            <h3 className="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedProperty.title || 'Property'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {[selectedProperty.address_line_1, selectedProperty.city, selectedProperty.postcode].filter(Boolean).join(', ') || 'UK'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSelectionDismissed(true);
                                setSelectedPropertyID(null);
                            }}
                            aria-label="Close selected property"
                            className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                        <p className="text-lg font-bold text-orange-600">{formatPropertyPrice(selectedProperty.price)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {selectedProperty.bedrooms ? <span>{selectedProperty.bedrooms} bed</span> : null}
                            {selectedProperty.bathrooms ? <span>{selectedProperty.bathrooms} bath</span> : null}
                            {selectedProperty.distance !== null && selectedProperty.distance !== undefined ? (
                                <span>{selectedProperty.distance} miles away</span>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => handleOpenWorkspace(selectedProperty)}
                            className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
                        >
                            Open property
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStartFastTrack(selectedProperty)}
                            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                        >
                            Resume live workspace
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default NearbyPropertiesMap;
