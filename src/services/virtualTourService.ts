import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface Hotspot {
    id: string;
    type: 'info' | 'link' | 'scene';
    position: { x: number; y: number; z: number };
    title: string;
    label?: string; // For UI compatibility
    description?: string;
    targetSceneId?: string;
}

export type VirtualTourHotspot = Hotspot;

export interface TourScene {
    id: string;
    name: string;
    title: string;
    panoramaUrl: string;
    type?: 'exr' | 'image';
    initialRotation?: { x: number; y: number };
    hotspots: Hotspot[];
}

export type VirtualTourScene = TourScene;

export interface VirtualTour {
    id: string;
    propertyId: string;
    title: string;
    tourName: string;
    scenes: TourScene[];
    initialSceneId: string;
}

export const getVirtualTourByPropertyId = async (propertyId: string) => {
    console.warn(
        '[virtualTourService] Detailed virtual tour API is not available on develop. Use property.virtual_tour_url instead.',
        { propertyId },
    );
    return {
        data: null,
        error: 'Detailed virtual tour API is not available on develop. Use the property virtual tour URL instead.',
    };
};
