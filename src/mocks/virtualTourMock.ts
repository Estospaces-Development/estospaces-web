
// Virtual Tour Types and Mock Data

// Use reliable placeholder images for mock data instead of local EXR files which might be missing
const PHOTO_STUDIO_URL = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
const NEON_STUDIO_URL = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
const BLUE_STUDIO_URL = 'https://images.unsplash.com/photo-1534234828569-1f48740c838e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
const BROWN_STUDIO_URL = 'https://images.unsplash.com/photo-1600607686527-6fb886090705?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
const PROVENCE_STUDIO_URL = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

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
    type: 'image' | 'exr';
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

// Default scenes using placeholders
const defaultScenes: VirtualTourScene[] = [
    {
        id: 'main-studio',
        name: 'Living Room',
        panoramaUrl: PHOTO_STUDIO_URL,
        type: 'image', // Changed to image for simplicity in web
        initialRotation: { x: 0, y: 0 },
        hotspots: [
            {
                id: 'to-neon',
                label: 'Go to Kitchen',
                targetSceneId: 'neon-studio',
                position: { x: 20, y: 50 }
            },
            {
                id: 'to-blue',
                label: 'Go to Bedroom',
                targetSceneId: 'blue-studio',
                position: { x: 80, y: 50 }
            }
        ]
    },
    {
        id: 'neon-studio',
        name: 'Kitchen',
        panoramaUrl: NEON_STUDIO_URL,
        type: 'image',
        hotspots: [
            {
                id: 'to-main',
                label: 'Back to Living Room',
                targetSceneId: 'main-studio',
                position: { x: 50, y: 50 }
            },
            {
                id: 'to-brown',
                label: 'Go to Bath',
                targetSceneId: 'brown-studio',
                position: { x: 90, y: 50 }
            }
        ]
    },
    {
        id: 'blue-studio',
        name: 'Master Bedroom',
        panoramaUrl: BLUE_STUDIO_URL,
        type: 'image',
        hotspots: [
            {
                id: 'to-main',
                label: 'Back to Living Room',
                targetSceneId: 'main-studio',
                position: { x: 10, y: 50 }
            }
        ]
    },
    {
        id: 'brown-studio',
        name: 'Bathroom',
        panoramaUrl: BROWN_STUDIO_URL,
        type: 'image',
        hotspots: [
            {
                id: 'to-neon',
                label: 'Back to Kitchen',
                targetSceneId: 'neon-studio',
                position: { x: 40, y: 50 }
            },
            {
                id: 'to-provence',
                label: 'Go to Balcony',
                targetSceneId: 'provence-studio',
                position: { x: 70, y: 50 }
            }
        ]
    },
    {
        id: 'provence-studio',
        name: 'Balcony',
        panoramaUrl: PROVENCE_STUDIO_URL,
        type: 'image',
        hotspots: [
            {
                id: 'to-brown',
                label: 'Back to Bathroom',
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
