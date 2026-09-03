import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Home, X } from 'lucide-react';
import { getUserProperties } from '@/services/userPropertiesService';
import {
    getManagerPropertyMapCenter,
    resolveManagerPropertyMapLocation,
    type ManagerPropertyMapLocation,
} from '@/lib/managerPropertyMap';
import { useMap, MapContainer, TileLayer, Marker, Popup } from '@/lib/leafletReact';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

const createCustomIcon = (color: string, symbol: string) => {
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
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
      ">${symbol}</div>
    </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

interface Location extends ManagerPropertyMapLocation {}

const filterOptions = [
    { id: 'property', label: 'Properties', icon: Home, color: '#3b82f6' },
];

function MapController({
    center,
    locations,
}: {
    center: [number, number];
    locations: Location[];
}) {
    const map = useMap();

    useEffect(() => {
        try {
            map.closePopup();
            if (locations.length > 1) {
                map.fitBounds(
                    locations.map((location) => [location.lat, location.lng] as [number, number]),
                    { padding: [36, 36], maxZoom: 13 },
                );
                return;
            }
            map.setView(center, locations.length === 1 ? 13 : 5);
        } catch {
            // Ignore transient Leaflet teardown errors during view resets.
        }
    }, [center, locations, map]);

    return null;
}

const SatelliteMap = () => {
    const [activeFilters, setActiveFilters] = useState<string[]>(['property']);
    const [showFilters, setShowFilters] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [mapProperties, setMapProperties] = useState<any[]>([]);
    const [loadingProperties, setLoadingProperties] = useState(true);
    const [propertyError, setPropertyError] = useState<string | null>(null);

    const loadMapProperties = useCallback(async () => {
        setLoadingProperties(true);
        setPropertyError(null);

        try {
            const response = await getUserProperties({ limit: 100 });
            if (response.error) {
                setPropertyError(response.error.message);
                setMapProperties([]);
                return;
            }
            setMapProperties(response.data || []);
        } finally {
            setLoadingProperties(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        void loadMapProperties();
    }, [loadMapProperties]);

    const activateFilter = (filterId: string) => {
        setActiveFilters((previous) => (
            previous.includes(filterId) ? previous : [...previous, filterId]
        ));
    };

    const propertyLocations: Location[] = useMemo(() => (
        mapProperties
            .map((property) => resolveManagerPropertyMapLocation(property))
            .filter((location): location is Location => Boolean(location))
    ), [mapProperties]);

    const allLocations = propertyLocations;
    const filteredLocations = allLocations.filter((location) => activeFilters.includes(location.type));
    const mapCenter = getManagerPropertyMapCenter(filteredLocations.length > 0 ? filteredLocations : allLocations);
    const mapKey = [
        mapCenter.join(':'),
        activeFilters.join(':'),
        ...filteredLocations.map((location) => `${location.id}:${location.lat}:${location.lng}`),
    ].join('|');

    const getIconForType = (type: string) => {
        const filter = filterOptions.find((option) => option.id === type);
        if (!filter) return null;
        return createCustomIcon(filter.color, 'P');
    };

    if (!isMounted) {
        return <div className="w-full h-full bg-gray-100 dark:bg-gray-900 animate-pulse rounded-lg flex items-center justify-center">
            <BrandLoadingScreen variant="panel" label="Loading map..." />
        </div>;
    }

    return (
        <div
            className="relative w-full h-full min-h-[500px]"
            data-manager-dashboard-map="properties"
            data-manager-map-property-count={propertyLocations.length}
            data-manager-map-marker-count={filteredLocations.length}
        >
            {showFilters && (
                <div className="absolute top-4 left-4 z-[500] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-4 max-w-xs max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h3 className="font-semibold text-gray-800 dark:text-white">Filters</h3>
                        </div>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            aria-label="Close map filters"
                        >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {filterOptions.map((filter) => {
                            const Icon = filter.icon;
                            const isActive = activeFilters.includes(filter.id);
                            const count = allLocations.filter((location) => location.type === filter.id).length;

                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => activateFilter(filter.id)}
                                    aria-pressed={isActive}
                                    data-manager-map-filter={filter.id}
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
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {count} {count === 1 ? 'location' : 'locations'}
                                        </div>
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

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" data-manager-map-location-summary>
                        Showing {filteredLocations.length} of {propertyLocations.length} property locations
                    </p>
                </div>
            )}

            {!showFilters && (
                <button
                    onClick={() => setShowFilters(true)}
                    className="absolute top-4 left-4 z-[500] bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
                </button>
            )}

            {(loadingProperties || propertyError || propertyLocations.length === 0) && (
                <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-lg border border-gray-100 bg-white/95 px-4 py-3 text-sm text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200" data-manager-map-state>
                    {loadingProperties
                        ? <BrandLoadingScreen variant="panel" label="Loading property locations..." />
                        : propertyError
                            ? propertyError
                            : 'No property locations with saved latitude and longitude are available yet. Add the exact coordinates to a property to show its marker here.'}
                </div>
            )}

            <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={filteredLocations.length === 1 ? 13 : 5}
                minZoom={2}
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1}
                worldCopyJump
                style={{ height: '100%', width: '100%', zIndex: 0, borderRadius: '0.75rem' }}
                zoomControl={true}
                scrollWheelZoom={true}
                fadeAnimation={false}
                markerZoomAnimation={false}
                zoomAnimation={false}
            >
                <MapController center={mapCenter} locations={filteredLocations} />

                <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    noWrap
                />

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
                                    {location.status && (
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{location.status}</p>
                                    )}
                                    {location.phone && (
                                        <p className="text-sm text-gray-600">{location.phone}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default SatelliteMap;
