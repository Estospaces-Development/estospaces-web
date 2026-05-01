import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import {
    getAdminPropertyById,
    getPropertyById,
    type Property,
    type VirtualTourRequest,
    type VirtualTourStatus,
} from '@/services/propertyService';

const CORE_URL = () => getServiceUrl('core');

export interface PropertyVirtualTourState {
    property_id: string;
    property_title: string;
    status: VirtualTourStatus;
    virtual_tour_url?: string;
    active_request?: VirtualTourRequest | null;
}

export interface VirtualTourHotspot {
    id: string;
    label?: string;
    title?: string;
    targetSceneId?: string;
    position: {
        x: number;
        y: number;
    };
}

export type Hotspot = VirtualTourHotspot;

export interface TourScene {
    id: string;
    name: string;
    panoramaUrl: string;
    type?: string;
    hotspots: VirtualTourHotspot[];
    initialRotation?: {
        x: number;
        y: number;
    };
}

export type VirtualTourScene = TourScene;

export interface VirtualTour {
    id?: string;
    tourName: string;
    scenes: TourScene[];
}

export interface RequestVirtualTourInput {
    request_note?: string;
}

export interface FulfillVirtualTourInput {
    status?: VirtualTourStatus;
    virtual_tour_url?: string;
    fulfillment_note?: string;
}

const mapPropertyToVirtualTourState = (property: Property): PropertyVirtualTourState => ({
    property_id: property.id,
    property_title: property.title,
    status: property.virtual_tour_status || (property.virtual_tour_url ? 'ready' : 'unavailable'),
    virtual_tour_url: property.virtual_tour_url,
    active_request: property.active_virtual_tour_request || null,
});

export const getVirtualTourByPropertyId = async (
    propertyId: string,
    adminView: boolean = false,
): Promise<{ data: PropertyVirtualTourState | null; error: string | null }> => {
    const result = adminView ? await getAdminPropertyById(propertyId) : await getPropertyById(propertyId);
    if (result.error || !result.data) {
        return { data: null, error: result.error || 'Unable to load virtual tour state.' };
    }

    return { data: mapPropertyToVirtualTourState(result.data), error: null };
};

export const requestVirtualTour = async (
    propertyId: string,
    input: RequestVirtualTourInput = {},
): Promise<{ data: VirtualTourRequest | null; error: string | null }> => {
    try {
        const data = await apiFetch<VirtualTourRequest>(
            `${CORE_URL()}/api/v1/properties/${propertyId}/virtual-tour-requests`,
            {
                method: 'POST',
                suppressErrorToast: true,
                body: JSON.stringify(input),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const getManagerVirtualTourRequests = async (): Promise<{
    data: VirtualTourRequest[];
    error: string | null;
}> => {
    try {
        const response = await apiFetchEnvelope<VirtualTourRequest[]>(
            `${CORE_URL()}/api/v1/manager/virtual-tour-requests`,
            {
                suppressErrorToast: true,
            },
        );
        return { data: response.data || [], error: null };
    } catch (error: any) {
        return { data: [], error: getErrorMessage(error) };
    }
};

export const fulfillVirtualTourRequest = async (
    requestId: string,
    input: FulfillVirtualTourInput,
): Promise<{ data: VirtualTourRequest | null; error: string | null }> => {
    try {
        const data = await apiFetch<VirtualTourRequest>(
            `${CORE_URL()}/api/v1/manager/virtual-tour-requests/${requestId}/fulfill`,
            {
                method: 'POST',
                suppressErrorToast: true,
                body: JSON.stringify(input),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};
