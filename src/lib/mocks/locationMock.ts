// Mock data for property location and street view verification

export type VerificationStatus = 'unverified' | 'under_review' | 'verified';

export interface PropertyLocation {
    propertyId: string;
    address: string;
    latitude: number;
    longitude: number;
    streetViewUrl: string;
    nearbyLandmarks: string[];
    neighborhoodType: 'Residential' | 'Commercial' | 'Mixed-Use' | 'Industrial';
    roadAccess: 'Excellent' | 'Good' | 'Average' | 'Poor';
    noiseLevel: 'Low' | 'Moderate' | 'High';
    verificationStatus: VerificationStatus;
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
}

// Mock location data with different verification states
export const locationMockData: PropertyLocation[] = [
    {
        propertyId: 'property-001',
        address: 'Whitefield Main Road, Bengaluru, Karnataka 560066',
        latitude: 12.9698,
        longitude: 77.7500,
        streetViewUrl: 'https://www.google.com/maps/embed?pb=!4v1614080000000!6m8!1m7!1sCAoSLEFGMVFpcE42WTI5c3l4LWd3eXl5aVE!2m2!1d12.9698!2d77.7500!3f270!4f0!5f0.7820865974627469',
        nearbyLandmarks: [
            'Metro Station – 500m',
            'Phoenix Marketcity Mall – 1.2km',
            'Manipal Hospital – 800m',
            'ITPL Tech Park – 2km'
        ],
        neighborhoodType: 'Mixed-Use',
        roadAccess: 'Excellent',
        noiseLevel: 'Moderate',
        verificationStatus: 'unverified'
    },
    {
        propertyId: 'property-002',
        address: 'Koramangala 5th Block, Bengaluru, Karnataka 560095',
        latitude: 12.9352,
        longitude: 77.6245,
        streetViewUrl: 'https://www.google.com/maps/embed?pb=!4v1614080000000!6m8!1m7!1sCAoSLEFGMVFpcE42WTI5c3l4LWd3eXl5aVE!2m2!1d12.9352!2d77.6245!3f270!4f0!5f0.7820865974627469',
        nearbyLandmarks: [
            'Forum Mall – 600m',
            'St. Johns Hospital – 1.5km',
            'Koramangala Indoor Stadium – 400m',
            'Jyoti Nivas College – 1km'
        ],
        neighborhoodType: 'Commercial',
        roadAccess: 'Good',
        noiseLevel: 'High',
        verificationStatus: 'under_review',
        notes: 'Pending verification - need to confirm road access during peak hours'
    },
    {
        propertyId: 'property-003',
        address: 'Indiranagar 100 Feet Road, Bengaluru, Karnataka 560038',
        latitude: 12.9784,
        longitude: 77.6408,
        streetViewUrl: 'https://www.google.com/maps/embed?pb=!4v1614080000000!6m8!1m7!1sCAoSLEFGMVFpcE42WTI5c3l4LWd3eXl5aVE!2m2!1d12.9784!2d77.6408!3f270!4f0!5f0.7820865974627469',
        nearbyLandmarks: [
            'Indiranagar Metro Station – 300m',
            'CMH Road Shopping Area – 200m',
            'Defence Colony Park – 500m',
            'HAL Airport Road – 1km'
        ],
        neighborhoodType: 'Residential',
        roadAccess: 'Excellent',
        noiseLevel: 'Low',
        verificationStatus: 'verified',
        verifiedAt: '2026-01-15T10:30:00Z',
        verifiedBy: 'Manager John',
        notes: 'Prime location with excellent connectivity. All landmarks verified.'
    },
    {
        propertyId: 'ff1f8dbb-1761-4a1c-9cda-d0e68',
        address: 'Electronic City Phase 1, Bengaluru, Karnataka 560100',
        latitude: 12.8456,
        longitude: 77.6603,
        streetViewUrl: 'https://www.google.com/maps/embed?pb=!4v1614080000000!6m8!1m7!1sCAoSLEFGMVFpcE42WTI5c3l4LWd3eXl5aVE!2m2!1d12.8456!2d77.6603!3f270!4f0!5f0.7820865974627469',
        nearbyLandmarks: [
            'Infosys Campus – 500m',
            'Wipro Campus – 800m',
            'Electronic City Metro Station – 1km',
            'Electronic City Flyover – 200m'
        ],
        neighborhoodType: 'Commercial',
        roadAccess: 'Good',
        noiseLevel: 'Moderate',
        verificationStatus: 'unverified'
    }
];

// Helper function to get location by property ID
export const getLocationByPropertyId = (propertyId: string): PropertyLocation | undefined => {
    return locationMockData.find(loc => loc.propertyId === propertyId);
};

// Helper function to get a default location if property not found
export const getLocationOrDefault = (propertyId: string): PropertyLocation => {
    const location = getLocationByPropertyId(propertyId);
    if (location) return location;

    // Return a default location with working street view instead of map embed
    return {
        propertyId,
        address: 'MG Road, Bengaluru, Karnataka 560001',
        latitude: 12.9716,
        longitude: 77.5946,
        streetViewUrl: 'https://www.google.com/maps/embed?pb=!4v1614080000000!6m8!1m7!1sCAoSLEFGMVFpcE42WTI5c3l4LWd3eXl5aVE!2m2!1d12.9716!2d77.5946!3f270!4f0!5f0.7820865974627469',
        nearbyLandmarks: [
            'MG Road Metro Station – 200m',
            'Brigade Road – 500m',
            'Cubbon Park – 800m'
        ],
        neighborhoodType: 'Commercial',
        roadAccess: 'Excellent',
        noiseLevel: 'Moderate',
        verificationStatus: 'unverified'
    };
};

// Simulated update function (in real app, this would call an API)
export const updateLocationVerification = (
    propertyId: string,
    status: VerificationStatus,
    note?: string
): PropertyLocation | undefined => {
    const locationIndex = locationMockData.findIndex(loc => loc.propertyId === propertyId);

    if (locationIndex === -1) return undefined;

    const updatedLocation = { ...locationMockData[locationIndex] };
    updatedLocation.verificationStatus = status;

    if (status === 'verified') {
        updatedLocation.verifiedAt = new Date().toISOString();
        updatedLocation.verifiedBy = 'Current Manager';
    }

    if (note) {
        updatedLocation.notes = note;
    }

    locationMockData[locationIndex] = updatedLocation;
    return updatedLocation;
};

// Get status display info
export const getStatusDisplayInfo = (status: VerificationStatus) => {
    switch (status) {
        case 'verified':
            return {
                label: 'Verified',
                color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                borderColor: 'border-green-500'
            };
        case 'under_review':
            return {
                label: 'Under Review',
                color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                borderColor: 'border-yellow-500'
            };
        default:
            return {
                label: 'Unverified',
                color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                borderColor: 'border-gray-400'
            };
    }
};
