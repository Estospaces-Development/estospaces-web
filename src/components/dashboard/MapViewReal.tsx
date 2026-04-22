'use client';

import MapView from '@/components/dashboard/MapView';

interface House {
    id: number | string;
    title?: string;
    name?: string;
    lat: number;
    lng: number;
    price?: string;
    address?: string;
}

interface Agency {
    id: number | string;
    name: string;
    lat: number;
    lng: number;
    address?: string;
}

interface MapViewRealProps {
    houses?: House[];
    agencies?: Agency[];
    onOpenProperty?: ((property: House) => void) | null;
    onStartFastTrack?: ((property: House) => void) | null;
}

const MapViewReal = ({
    houses = [],
    agencies = [],
    onOpenProperty = null,
    onStartFastTrack = null,
}: MapViewRealProps) => {
    return (
        <MapView
            houses={houses}
            agencies={agencies}
            onOpenProperty={onOpenProperty}
            onStartFastTrack={onStartFastTrack}
        />
    );
};

export default MapViewReal;
