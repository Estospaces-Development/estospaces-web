'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Layers3, LocateFixed, Navigation, X } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from '@/lib/leafletReact';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { formatLaunchPropertyLocation, getLaunchLocationCodeLabel } from '@/lib/launchLocale';
import { formatMapPropertyPrice } from '@/lib/mapCurrency';
import { isListingClosedForNewJourneys } from '@/lib/propertyAvailability';
import { STANDARD_MAP_TILE_LAYER } from '@/lib/mapTiles';
import {
    calculateMapDistanceKm,
    getCompactNearbyMapStatus,
    getNearbyMapDefaultView,
    getNearbyMapEmptyState,
    hasValidMapCoordinates,
    groupNearbyMapMarkers,
    hasVerifiedPropertyMapCoordinates,
    selectDashboardNearbyProperties,
    shouldRenderNearbyMap,
} from '@/lib/nearbyMap';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useUserGeoMarket } from '@/lib/useGeoMarket';
import type { FastTrackRequestStatus } from '@/lib/propertyFastTrackRequest';

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
    latitude?: number | null;
    longitude?: number | null;
    bedrooms?: number;
    bathrooms?: number;
    distance?: number | null;
    category?: string;
    status?: string;
}

interface NearbyPropertiesMapProps {
    properties?: Property[];
    userLocation?: UserLocation | null;
    onPropertyClick?: ((property: Property) => void) | null;
    onOpenWorkspace?: ((property: Property) => void) | null;
    onStartFastTrack?: ((property: Property) => void) | null;
    getFastTrackRequestStatus?: ((propertyID: string) => FastTrackRequestStatus) | null;
    compact?: boolean;
}

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

const userLocationIcon = L.divIcon({
    className: 'nearby-user-location-marker',
    html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(-9px,-9px);">
        <span style="width:18px;height:18px;flex:none;border-radius:999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #1d4ed8;"></span>
        <span style="padding:2px 8px;border-radius:999px;background:#fff;color:#1e3a8a;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(15,23,42,0.18);">You are here</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -12],
});

// Zoom buttons sit where no overlay covers them: bottom-right on the dashboard
// preview, top-right on Discover (its selected-home card owns bottom-right).
function MapZoomControl({ position }: { position: L.ControlPosition }) {
    const map = useMap();
    useEffect(() => {
        const control = L.control.zoom({ position }).addTo(map);
        return () => {
            control.remove();
        };
    }, [map, position]);
    return null;
}

function MapAutoFit({
    userLocation,
    properties,
    fitSignal,
    fallbackView,
}: {
    userLocation: UserLocation | null;
    properties: Property[];
    fitSignal: number;
    fallbackView: ReturnType<typeof getNearbyMapDefaultView>;
}) {
    const map = useMap();
    const pointsKey = [
        hasValidMapCoordinates(userLocation) ? `${userLocation.latitude},${userLocation.longitude}` : '',
        ...properties.map((property) => `${property.latitude},${property.longitude}`),
    ].join('|');

    const apply = useCallback(() => {
        try {
            const points: [number, number][] = [];

            map.closePopup();
            if (fitSignal > 0) {
                map.invalidateSize();
            }

            if (hasValidMapCoordinates(userLocation)) {
                points.push([userLocation.latitude, userLocation.longitude]);
            }

            properties.forEach((property) => {
                if (hasVerifiedPropertyMapCoordinates(property)) {
                    points.push([property.latitude, property.longitude]);
                }
            });

            if (points.length === 0) {
                map.setView(fallbackView.center, fallbackView.zoom);
                return;
            }

            if (points.length === 1) {
                map.setView(points[0], 14);
                return;
            }

            map.invalidateSize();
            // Extra top padding keeps price pins clear of the overlay controls.
            map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [44, 96], paddingBottomRight: [56, 44], maxZoom: 15 });

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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the plotted points change, so parent re-renders don't undo the user's zoom or pan
    }, [fallbackView, fitSignal, map, pointsKey]);

    // Re-apply the bounds fit on every meaningful data change.
    useEffect(() => {
        apply();
    }, [apply, fitSignal]);

    // Re-apply fit once tiles finish their first batch.
    useMapEvent('load', apply);

    return null;
}

function TileErrorWatcher({ onTileError, onTileLoad }: { onTileError: () => void; onTileLoad: () => void }) {
    const map = useMap();
    useEffect(() => {
        const attach = (layer: L.Layer) => {
            if (layer instanceof L.TileLayer) {
                layer.on('tileerror', onTileError);
                layer.on('tileload', onTileLoad);
            }
        };
        map.eachLayer(attach);
        const onLayerAdd = (event: L.LayerEvent) => attach(event.layer);
        map.on('layeradd', onLayerAdd);
        return () => {
            map.off('layeradd', onLayerAdd);
            map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer) {
                    layer.off('tileerror', onTileError);
                    layer.off('tileload', onTileLoad);
                }
            });
        };
    }, [map, onTileError, onTileLoad]);
    return null;
}

const NearbyPropertiesMap = ({
    properties = [],
    userLocation = null,
    onPropertyClick = null,
    onOpenWorkspace = null,
    onStartFastTrack = null,
    getFastTrackRequestStatus = null,
    compact = false,
}: NearbyPropertiesMapProps) => {
    const navigate = useNavigate();
    const authContext = useOptionalAuth();
    const user = authContext?.user || null;
    const geoMarket = useUserGeoMarket(user);
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedPropertyID, setSelectedPropertyID] = useState<string | null>(null);
    // A failed tile server left a blank grey map with no hint (MB-0218); count failures and say so.
    const [tileErrors, setTileErrors] = useState(0);
    const handleTileError = useCallback(() => setTileErrors((count) => count + 1), []);
    const handleTileLoad = useCallback(() => setTileErrors(0), []);

    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false);
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
    const [fitSignal, setFitSignal] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatPropertyPrice = formatMapPropertyPrice;

    const visibleProperties = useMemo(() => (
        compact
            ? selectDashboardNearbyProperties(properties, userLocation)
            : properties.filter(hasVerifiedPropertyMapCoordinates)
    ), [compact, properties, userLocation]);

    const propertiesWithDistance = useMemo(() => {
        if (visibleProperties.length === 0) {
            return [];
        }

        if (!hasValidMapCoordinates(userLocation)) {
            return visibleProperties.map((property) => ({ ...property, distance: null, category: 'other' }));
        }

        return visibleProperties.map((property) => {
            const distance = calculateMapDistanceKm(userLocation, property as { latitude: number; longitude: number });

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
    }, [userLocation, visibleProperties]);

    const sortedProperties = useMemo(() => (
        [...propertiesWithDistance].sort((left, right) => {
            if (left.distance === null || left.distance === undefined) return 1;
            if (right.distance === null || right.distance === undefined) return -1;
            return left.distance - right.distance;
        })
    ), [propertiesWithDistance]);

    const propertiesWithCoords = useMemo(() => (
        sortedProperties.filter(hasVerifiedPropertyMapCoordinates)
    ), [sortedProperties]);
    const markerGroups = useMemo(() => groupNearbyMapMarkers(propertiesWithCoords), [propertiesWithCoords]);
    const compactMapStatus = getCompactNearbyMapStatus({
        pinnedCount: propertiesWithCoords.length,
        unlocatedCount: properties.filter((property) => !hasVerifiedPropertyMapCoordinates(property)).length,
    });

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
    const selectedFastTrackStatus = selectedProperty && getFastTrackRequestStatus
        ? getFastTrackRequestStatus(selectedProperty.id)
        : 'idle';
    const fallbackView = useMemo(() => getNearbyMapDefaultView(geoMarket), [geoMarket]);
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
            hasValidMapCoordinates(userLocation)
        ) {
            points.push([userLocation.latitude, userLocation.longitude]);
        }

        for (const property of propertiesWithCoords) {
            if (
                hasVerifiedPropertyMapCoordinates(property)
            ) {
                points.push([property.latitude, property.longitude]);
            }
        }

        if (points.length === 0) {
            return fallbackView;
        }

        if (points.length === 1) {
            return { center: points[0], zoom: 14 };
        }

        const bounds = L.latLngBounds(points);
        const center = bounds.getCenter();
        return { center: [center.lat, center.lng] as [number, number], zoom: 12 };
    }, [fallbackView, propertiesWithCoords, userLocation]);

    const hasMapData = Boolean(
        hasValidMapCoordinates(userLocation) || propertiesWithCoords.length > 0,
    );
    const emptyState = getNearbyMapEmptyState(properties, compact, locationCodeLabel);
    const shouldRenderMap = shouldRenderNearbyMap({
        hasCoordinates: hasMapData,
        compact,
        matchingPropertyCount: properties.length,
    });
    const showUnlocatedResultsNotice = !hasMapData && !compact && properties.length > 0;

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

    if (!shouldRenderMap) {
        return (
            <div className={`relative h-full w-full overflow-hidden rounded-lg ${compact ? 'bg-gradient-to-br from-white via-orange-50/35 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950' : 'bg-white dark:bg-gray-800'}`}>
                <div className={`flex h-full w-full ${compact ? 'items-start justify-start p-6 text-left sm:p-8' : 'items-center justify-center p-8 text-center'}`}>
                    <div className={compact ? 'max-w-md' : 'max-w-sm'}>
                        <div className={`flex items-center justify-center rounded-full ${compact ? 'mb-4 h-12 w-12 bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' : 'mx-auto mb-4 h-14 w-14 bg-gray-100 dark:bg-gray-700'}`}>
                            <Navigation size={24} className={compact ? '' : 'text-gray-400 dark:text-gray-500'} />
                        </div>
                        <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? 'mb-2 text-lg' : 'mb-2 text-lg'}`}>{emptyState.title}</h3>
                        <p className={`text-gray-500 dark:text-gray-400 ${compact ? 'max-w-sm text-sm leading-6' : 'text-sm'}`}>
                            {emptyState.description}
                        </p>
                        {emptyState.action && emptyState.actionLabel && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (emptyState.action === 'open-property' && properties[0]) {
                                        handleOpenWorkspace(properties[0]);
                                        return;
                                    }
                                    navigate('/user/dashboard/settings?tab=search');
                                }}
                                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                            >
                                {emptyState.actionLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!isMounted) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <BrandLoadingScreen variant="panel" label="Loading nearby map..." />
            </div>
        );
    }

    return (
        <div
            className="relative isolate h-full w-full overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-gray-800 dark:bg-gray-950"
            data-nearby-map-compact={compact ? 'true' : 'false'}
            data-nearby-map-style={mapStyle}
        >
            {tileErrors >= 3 && (
                // Above every overlay (controls and Leaflet corners are z 1000) and below the top control row (MB-0218).
                <div role="alert" className="pointer-events-none absolute inset-x-3 top-20 z-[1100] lg:top-32 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow dark:border-amber-900/40 dark:bg-amber-950/80 dark:text-amber-100">
                    The map could not load. Switch to Cards to see these homes.
                </div>
            )}
            <MapContainer
                key={mapKey}
                center={initialView.center}
                zoom={initialView.zoom}
                minZoom={2}
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1}
                worldCopyJump
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                zoomControl={false}
                fadeAnimation={false}
                markerZoomAnimation={false}
                zoomAnimation={false}
            >
                <MapAutoFit userLocation={userLocation} properties={propertiesWithCoords} fitSignal={fitSignal} fallbackView={fallbackView} />
                <MapZoomControl position={compact ? 'bottomright' : 'topright'} />
                <TileErrorWatcher onTileError={handleTileError} onTileLoad={handleTileLoad} />
                {mapStyle === 'standard' ? (
                    <TileLayer
                        attribution={STANDARD_MAP_TILE_LAYER.attribution}
                        url={STANDARD_MAP_TILE_LAYER.url}
                        noWrap
                    />
                ) : (
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        noWrap
                    />
                )}

                {hasValidMapCoordinates(userLocation) ? (
                    <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={userLocationIcon}
                    >
                        <Popup>
                            <div className="min-w-[160px]">
                                <p className="text-sm font-semibold text-slate-900">You are here</p>
                                <p className="mt-1 text-xs text-slate-500">Nearby property ranking starts from here.</p>
                            </div>
                        </Popup>
                    </Marker>
                ) : null}

                {markerGroups.map((group) => {
                    if (group.properties.length > 1) {
                        const isSelected = group.properties.some((property) => property.id === selectedPropertyID);
                        return (
                            <Marker
                                key={group.key}
                                position={[group.latitude, group.longitude]}
                                icon={createPropertyIcon(`${group.properties.length} homes`, getMarkerColor(group.properties[0].category), isSelected)}
                                eventHandlers={{
                                    click: () => {
                                        setIsSelectionDismissed(false);
                                        setSelectedPropertyID(group.properties[0].id);
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="w-[220px] max-w-full" data-nearby-map-shared-pin>
                                        <h4 className="text-sm font-semibold text-slate-900">
                                            {group.properties.length} homes at this location
                                        </h4>
                                        <ul className="mt-1.5 max-h-36 divide-y divide-stone-100 overflow-y-auto">
                                            {group.properties.map((property) => (
                                                <li key={property.id} className="flex items-center justify-between gap-2 py-1.5">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-slate-900">{property.title || 'Property'}</p>
                                                        <p className="text-xs font-bold text-orange-600">
                                                            {formatPropertyPrice(property)}
                                                            {property.property_type === 'rent' ? '/month' : ''}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => (onPropertyClick || handleOpenWorkspace)(property)}
                                                        className="shrink-0 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50"
                                                    >
                                                        Open
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }

                    const property = group.properties[0];
                    const isSelected = property.id === selectedPropertyID;

                    return (
                        <Marker
                            key={property.id}
                            position={[property.latitude as number, property.longitude as number]}
                            icon={createPropertyIcon(formatMapPropertyPrice(property, 'View'), getMarkerColor(property.category), isSelected)}
                            eventHandlers={{
                                click: () => {
                                    // Tapping a marker selects it and shows its popup/panel;
                                    // navigation happens from "Open property" (QA-MB-20260923-01-031).
                                    setIsSelectionDismissed(false);
                                    setSelectedPropertyID(property.id);
                                },
                            }}
                        >
                            {/* The full map shows the Selected property card instead (QA-MB-20260923-01-031). */}
                            {compact ? (
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
                                            onClick={() => (onPropertyClick || handleOpenWorkspace)(property)}
                                            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Open property
                                        </button>
                                        {!isListingClosedForNewJourneys(property.status) && (
                                            <button
                                                type="button"
                                                onClick={() => handleStartFastTrack(property)}
                                                className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                                            >
                                                Request fast-track
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                            ) : null}
                        </Marker>
                    );
                })}
            </MapContainer>

            {showUnlocatedResultsNotice ? (
                <div className="absolute left-4 right-4 top-[4.5rem] z-[1000] flex justify-center" role="status" aria-live="polite">
                    <div className="max-w-lg rounded-2xl bg-white/95 px-4 py-3 text-left shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/95">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{emptyState.title}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">{emptyState.description}</p>
                        {emptyState.action === 'open-property' && emptyState.actionLabel && properties[0] ? (
                            <button
                                type="button"
                                onClick={() => handleOpenWorkspace(properties[0])}
                                className="pointer-events-auto mt-3 inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                            >
                                {emptyState.actionLabel}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className={`absolute z-[1000] ${compact ? 'right-2 top-2 sm:right-4 sm:top-4' : 'left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap items-start gap-3'}`}>
                <div className={`rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90 ${compact ? 'hidden' : 'hidden lg:block'}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Nearby map</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {propertiesWithCoords.length} {propertiesWithCoords.length === 1 ? 'property' : 'properties'} nearby
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Price markers, live property actions, and fast-track access stay here.
                    </p>
                </div>

                <div className={`${compact ? 'flex gap-1 rounded-xl p-1 sm:gap-2 sm:rounded-2xl sm:p-1.5' : 'flex items-center gap-2 rounded-2xl p-2'} bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90`}>
                    <button
                        type="button"
                        data-nearby-map-standard
                        onClick={() => setMapStyle('standard')}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors sm:rounded-xl sm:px-3 sm:text-xs sm:font-semibold ${
                            mapStyle === 'standard'
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Layers3 size={14} />
                        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{compact ? 'Map' : 'Standard'}</span>
                    </button>
                    <button
                        type="button"
                        data-nearby-map-satellite
                        onClick={() => setMapStyle('satellite')}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors sm:rounded-xl sm:px-3 sm:text-xs sm:font-semibold ${
                            mapStyle === 'satellite'
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Globe size={14} />
                        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{compact ? 'Photo' : 'Satellite'}</span>
                    </button>
                    <button
                        type="button"
                        data-nearby-map-recenter
                        onClick={() => {
                            setMapStyle('standard');
                            setIsSelectionDismissed(false);
                            setSelectedPropertyID(propertiesWithCoords[0]?.id || null);
                            setFitSignal((value) => value + 1);
                        }}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300 sm:rounded-xl sm:px-3 sm:text-xs sm:font-semibold"
                    >
                        <LocateFixed size={14} />
                        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{compact ? 'Reset' : 'Recenter'}</span>
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
                            onClick={() => (onPropertyClick || handleOpenWorkspace)(selectedProperty)}
                            className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
                        >
                            Open property
                        </button>
                        {!isListingClosedForNewJourneys(selectedProperty.status) && (
                        <button
                            type="button"
                            data-nearby-open-fast-track
                            onClick={() => handleStartFastTrack(selectedProperty)}
                            disabled={selectedFastTrackStatus !== 'idle'}
                            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-200"
                        >
                            {selectedFastTrackStatus === 'requesting'
                                ? 'Requesting...'
                                : selectedFastTrackStatus === 'requested'
                                    ? 'Fast Track requested'
                                    : 'Request fast-track'}
                        </button>
                        )}
                    </div>
                </div>
            ) : null}

            {compact ? (
                <p
                    className="pointer-events-none absolute left-2 top-2 z-[650] max-w-[calc(100%-10.5rem)] sm:left-4 sm:top-4 sm:max-w-[calc(100%-20rem)] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-gray-700 shadow ring-1 ring-black/5 dark:bg-gray-900/90 dark:text-gray-200"
                    role="status"
                    aria-live="polite"
                    data-nearby-map-status
                >
                    {compactMapStatus}
                </p>
            ) : null}
        </div>
    );
};

export default NearbyPropertiesMap;
