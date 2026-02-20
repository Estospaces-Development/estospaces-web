/**
 * Location Service
 * Handles user location detection via geolocation or search input
 */

interface LocationData {
    type: 'geolocation' | 'search' | 'profile' | 'default';
    postcode: string;
    latitude: number;
    longitude: number;
    city: string;
    source: string;
}

interface ProfileLocation {
    postcode?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
}

interface GetUserLocationParams {
    searchInput?: string | null;
    profileLocation?: ProfileLocation | null;
    useGeolocation?: boolean;
}

/**
 * Get user location from browser geolocation
 */
export const getUserGeolocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(position.coords);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    });
};

/**
 * Get postcode from coordinates (reverse geocoding)
 * Uses a free UK postcode API
 */
export const getPostcodeFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        // Using postcodes.io - free UK postcode API
        const response = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`
        );

        if (!response.ok) {
            throw new Error('Failed to get postcode from coordinates');
        }

        const data = await response.json();
        if (data.result && data.result.length > 0) {
            return data.result[0].postcode;
        }
        return null;
    } catch (error) {
        console.error('Error getting postcode from coordinates:', error);
        return null;
    }
};

/**
 * Validate and normalize UK postcode
 */
export const validateUKPostcode = (postcode: string): string | null => {
    if (!postcode) return null;

    // Remove spaces and convert to uppercase
    const normalized = postcode.replace(/\s+/g, '').toUpperCase();

    // UK postcode regex pattern
    const postcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;

    if (postcodePattern.test(normalized)) {
        // Format with space: AB1 2CD
        return normalized.slice(0, -3) + ' ' + normalized.slice(-3);
    }

    return null;
};

/**
 * Get coordinates from postcode (geocoding)
 */
export const getCoordinatesFromPostcode = async (postcode: string): Promise<any | null> => {
    try {
        const validatedPostcode = validateUKPostcode(postcode);
        if (!validatedPostcode) {
            throw new Error('Invalid UK postcode format');
        }

        // Using postcodes.io
        const response = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(validatedPostcode)}`
        );

        if (!response.ok) {
            throw new Error('Failed to get coordinates from postcode');
        }

        const data = await response.json();
        if (data.result) {
            return {
                latitude: data.result.latitude,
                longitude: data.result.longitude,
                postcode: data.result.postcode,
                city: data.result.admin_district || data.result.region || '',
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting coordinates from postcode:', error);
        return null;
    }
};

/**
 * Parse address string to extract postcode
 */
export const extractPostcodeFromAddress = (address: string): string | null => {
    if (!address) return null;

    // UK postcode pattern
    const postcodePattern = /\b([A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2})\b/i;
    const match = address.match(postcodePattern);

    if (match) {
        return validateUKPostcode(match[1]);
    }

    return null;
};

/**
 * Get user location from multiple sources
 * Priority: 1. Search input, 2. Profile location, 3. Browser geolocation
 */
export const getUserLocation = async ({
    searchInput = null,
    profileLocation = null,
    useGeolocation = true,
}: GetUserLocationParams): Promise<LocationData> => {
    let location: LocationData | null = null;

    // Priority 1: Search input (postcode or address)
    if (searchInput) {
        const postcode = extractPostcodeFromAddress(searchInput) || searchInput;
        const coords = await getCoordinatesFromPostcode(postcode);
        if (coords) {
            location = {
                type: 'search',
                postcode: coords.postcode,
                latitude: coords.latitude,
                longitude: coords.longitude,
                city: coords.city,
                source: 'search_input',
            };
            return location;
        }
    }

    // Priority 2: Profile location
    if (profileLocation) {
        if (profileLocation.postcode) {
            const coords = await getCoordinatesFromPostcode(profileLocation.postcode);
            if (coords) {
                location = {
                    type: 'profile',
                    postcode: coords.postcode,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    city: coords.city as string,
                    source: 'profile',
                };
                return location;
            }
        } else if (profileLocation.latitude && profileLocation.longitude) {
            const postcode = await getPostcodeFromCoordinates(
                profileLocation.latitude,
                profileLocation.longitude
            );
            location = {
                type: 'profile',
                postcode: postcode || '',
                latitude: profileLocation.latitude,
                longitude: profileLocation.longitude,
                city: profileLocation.city || '',
                source: 'profile',
            };
            return location;
        }
    }

    // Priority 3: Browser geolocation
    if (useGeolocation) {
        try {
            const geo = await getUserGeolocation();
            const postcode = await getPostcodeFromCoordinates(geo.latitude, geo.longitude);
            location = {
                type: 'geolocation',
                postcode: postcode || '',
                latitude: geo.latitude,
                longitude: geo.longitude,
                city: '',
                source: 'browser_geolocation',
            };
            return location;
        } catch (error) {
            console.warn('Geolocation not available:', error);
        }
    }

    // Default: London coordinates if nothing else works
    return {
        type: 'default',
        postcode: 'SW1A 1AA',
        latitude: 51.5074,
        longitude: -0.1278,
        city: 'London',
        source: 'default',
    };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
