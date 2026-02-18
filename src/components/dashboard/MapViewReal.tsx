'use client';

import { useState } from 'react';
import { Home, Building2 } from 'lucide-react';

/**
 * Real Mapbox Integration Component
 *
 * To use this component:
 * 1. Install: npm install react-map-gl mapbox-gl
 * 2. Get Mapbox token from: https://account.mapbox.com/
 * 3. Add to .env: NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
 * 4. Replace MapView with MapViewReal in Dashboard
 */

interface House {
    id: number;
    name: string;
    lat: number;
    lng: number;
    price: string;
    address: string;
}

interface Agency {
    id: number;
    name: string;
    lat: number;
    lng: number;
    address: string;
}

interface MapViewRealProps {
    houses?: House[];
    agencies?: Agency[];
}

const MapViewReal = ({ houses = [], agencies = [] }: MapViewRealProps) => {
    const [selectedMarker, setSelectedMarker] = useState<(House | Agency) & { type: string } | null>(null);
    const [viewState, setViewState] = useState({
        longitude: -122.4194,
        latitude: 37.7749,
        zoom: 13,
    });

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    if (!MAPBOX_TOKEN) {
        return (
            <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                <div className="text-center p-4">
                    <p className="text-gray-600 mb-2">Mapbox token required</p>
                    <p className="text-sm text-gray-500">
                        Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env file
                    </p>
                </div>
            </div>
        );
    }

    // Placeholder until Mapbox is installed
    return (
        <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
            <div className="text-center p-4">
                <p className="text-gray-600 mb-2">Install react-map-gl to enable map</p>
                <p className="text-sm text-gray-500">npm install react-map-gl mapbox-gl</p>
            </div>
        </div>
    );
};

export default MapViewReal;
