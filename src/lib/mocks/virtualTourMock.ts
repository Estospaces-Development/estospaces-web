// Import EXR assets
// Note: In a real app, you might want to lazy load these or handle them differently
// but for this mock setup we import them to get the resolved Vite URL
// immport blueStudioExr from '../assets/virtual-data/blue_photo_studio_4k.exr';
const blueStudioExr = '/assets/virtual-data/blue_photo_studio_4k.exr';
const brownStudioExr = '/assets/virtual-data/brown_photostudio_02_4k.exr';
const neonStudioExr = '/assets/virtual-data/neon_photostudio_4k.exr';
const photoStudioExr = '/assets/virtual-data/photo_studio_01_4k.exr';
const provenceStudioExr = '/assets/virtual-data/provence_studio_4k.exr';

// Mock data for virtual tours
export interface VirtualTourHotspot {
    id: string;
    label: string;
    targetSceneId: string;
    position: {
        x: number; // percentage from left (0-100)
        y: number; // percentage from top (0-100)
    };
    targetRotation?: {
        x: number;
        y: number;
    };
}

export interface VirtualTourScene {
    id: string;
    name: string;
    panoramaUrl: string;
    type: 'image' | 'exr'; // Added type to distinguish assets
    initialRotation?: {
        x: number;
        y: number;
    };
    hotspots: VirtualTourHotspot[];
}

export interface VirtualTour {
    tourId: string;
    propertyId: string;
    tourName: string;
    status: 'approved' | 'pending' | 'not_added';
    scenes: VirtualTourScene[];
    createdAt: string;
    approvedAt?: string;
    experienceReady?: boolean;
}

// Default scenes using the new EXR assets
const defaultScenes: VirtualTourScene[] = [
    {
        id: 'main-studio',
        name: 'Main Photo Studio',
        panoramaUrl: photoStudioExr,
        type: 'exr',
        initialRotation: { x: 0, y: 0 },
        hotspots: [
            {
                id: 'to-neon',
                label: 'Go to Neon Studio',
                targetSceneId: 'neon-studio',
                position: { x: 20, y: 50 }
            },
            {
                id: 'to-blue',
                label: 'Go to Blue Studio',
                targetSceneId: 'blue-studio',
                position: { x: 80, y: 50 }
            }
        ]
    },
    {
        id: 'neon-studio',
        name: 'Neon Studio',
        panoramaUrl: neonStudioExr,
        type: 'exr',
        hotspots: [
            {
                id: 'to-main',
                label: 'Back to Main Studio',
                targetSceneId: 'main-studio',
                position: { x: 50, y: 50 }
            },
            {
                id: 'to-brown',
                label: 'Go to Brown Studio',
                targetSceneId: 'brown-studio',
                position: { x: 90, y: 50 }
            }
        ]
    },
    {
        id: 'blue-studio',
        name: 'Blue Photo Studio',
        panoramaUrl: blueStudioExr,
        type: 'exr',
        hotspots: [
            {
                id: 'to-main',
                label: 'Back to Main Studio',
                targetSceneId: 'main-studio',
                position: { x: 10, y: 50 }
            }
        ]
    },
    {
        id: 'brown-studio',
        name: 'Brown Photo Studio',
        panoramaUrl: brownStudioExr,
        type: 'exr',
        hotspots: [
            {
                id: 'to-neon',
                label: 'Back to Neon Studio',
                targetSceneId: 'neon-studio',
                position: { x: 40, y: 50 }
            },
            {
                id: 'to-provence',
                label: 'Go to Provence',
                targetSceneId: 'provence-studio',
                position: { x: 70, y: 50 }
            }
        ]
    },
    {
        id: 'provence-studio',
        name: 'Provence Studio',
        panoramaUrl: provenceStudioExr,
        type: 'exr',
        hotspots: [
            {
                id: 'to-brown',
                label: 'Back to Brown Studio',
                targetSceneId: 'brown-studio',
                position: { x: 30, y: 50 }
            }
        ]
    }
];

// Mock virtual tours data
export const virtualTours: VirtualTour[] = [
    {
        tourId: 'tour-001',
        propertyId: 'property-001',
        tourName: 'Premium Virtual Experience',
        status: 'approved',
        experienceReady: true,
        createdAt: '2026-01-01T00:00:00Z',
        approvedAt: '2026-01-02T00:00:00Z',
        scenes: defaultScenes
    }
];

// Default/fallback tour for properties without specific tours
// This ensures "all property list example" works - every property gets a tour
export const defaultVirtualTour: VirtualTour = {
    tourId: 'default-tour',
    propertyId: '', // Dynamic
    tourName: '360° Virtual Tour',
    status: 'approved',
    experienceReady: true,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    scenes: defaultScenes
};

// Helper function to get tour by property ID
export const getTourByPropertyId = (propertyId: string): VirtualTour | undefined => {
    const specificTour = virtualTours.find(tour => tour.propertyId === propertyId);

    if (specificTour) {
        return specificTour;
    }

    // Return default tour for any property that doesn't have one
    // creating a copy to assign the correct propertyId
    return {
        ...defaultVirtualTour,
        propertyId: propertyId
    };
};

// Helper function to get tour by tour ID
export const getTourById = (tourId: string): VirtualTour | undefined => {
    if (tourId === 'default-tour') return defaultVirtualTour;
    return virtualTours.find(tour => tour.tourId === tourId);
};
