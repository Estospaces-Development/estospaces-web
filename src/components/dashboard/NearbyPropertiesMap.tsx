'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Layers3, LocateFixed, Navigation, X } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from '@/lib/leafletReact';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatLaunchPropertyLocation, getLaunchLocationCodeLabel } from '@/lib/launchLocale';
import { formatMapPropertyPrice } from '@/lib/mapCurrency';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

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
    currency?: string | null;
    country?: string | null;
    countryCode?: string | null;
    country_code?: string | null;
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
    compact?: boolean;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const radiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radiusKm * c;
};

const createPropertyIcon = (label: string, color: string, selected: boolean) => L.divIcon({
    className: 'nearby-property-marker',
    html: `<div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        transform:translateY(-8px);
    ">
        <div style="
            min-width:${selected ? 74 : 64}px;
            height:${selected ? 40 : 34}px;
            padding:0 12px;
            border-radius:999px;
            border:2px solid rgba(255,255,255,0.92);
            background:${selected ? '#111827' : color};
            box-shadow:0 16px 32px rgba(15,23,42,0.24);
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:800;
            font-size:${selected ? 13 : 12}px;
            letter-spacing:0.02em;
            white-space:nowrap;
        ">${label}</div>
        <div style="
            width:${selected ? 14 : 12}px;
            height:${selected ? 14 : 12}px;
            margin-top:-3px;
            background:${selected ? '#111827' : color};
            border-right:2px solid rgba(255,255,255,0.92);
            border-bottom:2px solid rgba(255,255,255,0.92);
            transform:rotate(45deg);
        "></div>
    </div>`,
    iconSize: [selected ? 74 : 64, selected ? 54 : 48],
    iconAnchor: [selected ? 37 : 32, selected ? 48 : 42],
    popupAnchor: [0, selected ? -42 : -36],
});

function MapAutoFit({
    userLocation,
    properties,
    fitSignal: _fitSignal,
}: {
    userLocation: UserLocation | null;
    properties: Property[];
    fitSignal: number;
}) {
    const map = useMap();

    const apply = useCallback(() => {
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
                map.setView([20.5937, 78.9629], 5);
                return;
            }

            if (points.length === 1) {
                map.setView(points[0], 14);
                return;
            }

            map.invalidateSize();
            map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 15 });

            // Leaflet may have already loaded the tile layer at the
            // initial zoom before fitBounds ran. Force a fresh tile
            // request at the new zoom by redrawing the tile layer.
            setTimeout(() => {
                map.eachLayer((layer) => {
                    if (
                        typeof (layer as any).redraw === 'function' &&
                        (layer as any)._url
                    ) {
                        (layer as any).redraw();
                    }
                });
            }, 150);
        } catch (err) {
            console.warn('[MapAutoFit] transient error:', err);
        }
    }, [map, properties, userLocation]);

    // Re-apply the bounds fit on every meaningful data change.
    useEffect(() => {
        apply();
    }, [apply]);

    // Re-apply fit once tiles finish their first batch.
    useMapEvent('load', apply);

    return null;
}

const NearbyPropertiesMap = ({
    properties = [],
    userLocation = null,
    onPropertyClick = null,
    onOpenWorkspace = null,
    onStartFastTrack = null,
    compact = false,
}: NearbyPropertiesMapProps) => {
    const navigate = useNavigate();
    const authContext = useOptionalAuth();
    const user = authContext?.user || null;
    const geoMarket = useUserGeoMarket(user);
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket);
    const lowerLocationCodeLabel = locationCodeLabel.toLowerCase();
    const [isMounted, setIsMounted] = useState(false);
    const [selectedPropertyID, setSelectedPropertyID] = useState<string | null>(null);
    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false);
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
    const [fitSignal, setFitSignal] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatPropertyPrice = formatMapPropertyPrice;

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
    ].join('|'), [userLocation?.latitude, userLocation?.longitude]);

    // Compute an initial view from user/properties so the MapContainer
    // mounts at the right center/zoom on first render — this avoids the
    // Leaflet bug where fitBounds() runs before the tile layer is ready
    // and gets clobbered when initial tiles arrive.
    const initialView = useMemo(() => {
        const points: [number, number][] = [];

        if (
            typeof userLocation?.latitude === 'number' &&
            typeof userLocation?.longitude === 'number' &&
            // Skip the (0, 0) sentinel returned by locationService when geocoding fails.
            !(userLocation.latitude === 0 && userLocation.longitude === 0)
        ) {
            points.push([userLocation.latitude, userLocation.longitude]);
        }

        for (const property of propertiesWithCoords) {
            if (
                typeof property.latitude === 'number' &&
                typeof property.longitude === 'number' &&
                !(property.latitude === 0 && property.longitude === 0)
            ) {
                points.push([property.latitude, property.longitude]);
            }
        }

        if (points.length === 0) {
            return { center: [20.5937, 78.9629] as [number, number], zoom: 5 };
        }

        if (points.length === 1) {
            return { center: points[0], zoom: 14 };
        }

        const bounds = L.latLngBounds(points);
        const center = bounds.getCenter();
        return { center: [center.lat, center.lng] as [number, number], zoom: 12 };
    }, [propertiesWithCoords, userLocation?.latitude, userLocation?.longitude]);

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

        navigate(`/user/properties/${property.id}`, {
            state: {
                backTo: '/user/dashboard',
                backLabel: 'Back to Dashboard',
            },
        });
    };

    const handleStartFastTrack = (property: Property) => {
        if (onStartFastTrack) {
            onStartFastTrack(property);
            return;
        }

        navigate(`/user/properties/${property.id}?fast-track=1`, {
            state: {
                backTo: '/user/dashboard',
                backLabel: 'Back to Dashboard',
            },
        });
    };

    if (!hasMapData) {
        return (
            <div className={`relative h-full w-full overflow-hidden rounded-lg ${compact ? 'bg-gradient-to-br from-white via-orange-50/35 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950' : 'bg-white dark:bg-gray-800'}`}>
                <div className={`flex h-full w-full ${compact ? 'items-start justify-start p-6 text-left sm:p-8' : 'items-center justify-center p-8 text-center'}`}>
                    <div className={compact ? 'max-w-md' : 'max-w-sm'}>
                        <div className={`flex items-center justify-center rounded-full ${compact ? 'mb-4 h-12 w-12 bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' : 'mx-auto mb-4 h-14 w-14 bg-gray-100 dark:bg-gray-700'}`}>
                            <Navigation size={24} className={compact ? '' : 'text-gray-400 dark:text-gray-500'} />
                        </div>
                        <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? 'mb-2 text-lg' : 'mb-2 text-lg'}`}>Add a {lowerLocationCodeLabel} to unlock the map</h3>
                        <p className={`text-gray-500 dark:text-gray-400 ${compact ? 'max-w-sm text-sm leading-6' : 'text-sm'}`}>
                            Use your profile {lowerLocationCodeLabel} or search a location to see nearby homes without leaving the dashboard.
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
        <div
            className="relative isolate h-full w-full overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-gray-800 dark:bg-gray-950"
            data-nearby-map-style={mapStyle}
        >
            <MapContainer
                key={mapKey}
                center={initialView.center}
                zoom={initialView.zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                dragging={!compact}
                fadeAnimation={false}
                markerZoomAnimation={false}
                zoomAnimation={false}
            >
                <MapAutoFit userLocation={userLocation} properties={propertiesWithCoords} fitSignal={fitSignal} />
                {mapStyle === 'standard' ? (
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                ) : (
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                )}

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
                            icon={createPropertyIcon(formatMapPropertyPrice(property, 'View'), getMarkerColor(property.category), isSelected)}
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
                                        {formatLaunchPropertyLocation([property.address_line_1, property.city, property.postcode])}
                                    </p>
                                    <p className="mt-2 text-sm font-bold text-orange-600">
                                        {formatPropertyPrice(property)}
                                        {property.property_type === 'rent' ? '/month' : ''}
                                    </p>
                                    {property.distance !== null && property.distance !== undefined ? (
                                        <p className="mt-1 text-xs text-slate-500">{property.distance} km away</p>
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

            <div className="absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-wrap items-start gap-3">
                <div className={`rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90 ${compact ? 'hidden' : 'hidden lg:block'}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Nearby map</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {propertiesWithCoords.length} {propertiesWithCoords.length === 1 ? 'property' : 'properties'} nearby
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Price markers, live property actions, and fast-track access stay here.
                    </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90">
                    <button
                        type="button"
                        data-nearby-map-standard
                        onClick={() => setMapStyle('standard')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            mapStyle === 'standard'
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Layers3 size={14} />
                        {compact ? 'Map' : 'Standard'}
                    </button>
                    <button
                        type="button"
                        data-nearby-map-satellite
                        onClick={() => setMapStyle('satellite')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            mapStyle === 'satellite'
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Globe size={14} />
                        {compact ? 'Photo' : 'Satellite'}
                    </button>
                    <button
                        type="button"
                        data-nearby-map-recenter
                        onClick={() => setFitSignal((value) => value + 1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
                    >
                        <LocateFixed size={14} />
                        {compact ? 'Reset' : 'Recenter'}
                    </button>
                </div>
            </div>

            <div className={`absolute bottom-4 left-4 z-[1000] rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90 ${compact ? 'hidden' : 'hidden lg:block'}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Distance</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" />Very near</span>
                    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500" />Near</span>
                    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-500" />Moderate</span>
                    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" />Far</span>
                </div>
            </div>

            {selectedProperty && !compact ? (
                <div className="absolute bottom-4 right-4 z-[1000] w-[300px] max-w-[calc(100%-2rem)] rounded-[24px] bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/95 lg:w-[320px]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Selected property</p>
                            <h3 className="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedProperty.title || 'Property'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {formatLaunchPropertyLocation([selectedProperty.address_line_1, selectedProperty.city, selectedProperty.postcode])}
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
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-bold text-orange-600">{formatPropertyPrice(selectedProperty)}</p>
                            {selectedProperty.property_type ? (
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                                    {selectedProperty.property_type}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {selectedProperty.bedrooms ? <span>{selectedProperty.bedrooms} bed</span> : null}
                            {selectedProperty.bathrooms ? <span>{selectedProperty.bathrooms} bath</span> : null}
                            {selectedProperty.distance !== null && selectedProperty.distance !== undefined ? (
                                <span>{selectedProperty.distance} km away</span>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            data-nearby-open-property
                            onClick={() => handleOpenWorkspace(selectedProperty)}
                            className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
                        >
                            Open property
                        </button>
                        <button
                            type="button"
                            data-nearby-open-fast-track
                            onClick={() => handleStartFastTrack(selectedProperty)}
                            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                        >
                            Open fast-track
                        </button>
                    </div>
                </div>
            ) : null}

            {compact ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[999] bg-gradient-to-t from-white via-white/94 to-transparent px-4 pb-4 pt-10 dark:from-gray-950 dark:via-gray-950/92">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/92 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/92">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Dashboard preview</p>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                Browse the map here, then open Discover for the full browsing view.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-orange-600 dark:text-orange-300">
                            Scroll stays with the page
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default NearbyPropertiesMap;
