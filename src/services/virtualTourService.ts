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
    try {
        const url = `${CORE_URL()}/api/v1/tours/property/${propertyId}`;
        const data = await apiFetch<VirtualTour>(url);
        return { data, error: null };
    } catch (error: any) {
        console.error('[virtualTourService] getVirtualTourByPropertyId error:', error.message);
        return { data: null, error: error.message };
    }
};
