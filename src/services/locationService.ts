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

type GeolocationPolicyDocument = Document & {
    permissionsPolicy?: {
        allowsFeature?: (feature: string) => boolean;
    };
    featurePolicy?: {
        allowsFeature?: (feature: string) => boolean;
    };
};

const isGeolocationAllowedByPolicy = (): boolean => {
    if (typeof document === 'undefined') {
        return true;
    }

    const policyHost = document as GeolocationPolicyDocument;
    const policy = policyHost.permissionsPolicy || policyHost.featurePolicy;
    const allowsFeature = policy?.allowsFeature;
    if (typeof allowsFeature !== 'function') {
        return true;
    }

    return allowsFeature.call(policy, 'geolocation');
};

/**
 * Get user location from browser geolocation
 */
export const getUserGeolocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        if (!isGeolocationAllowedByPolicy()) {
            reject(new Error('Geolocation is blocked by this page permissions policy'));
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

const INDIA_PIN_CODE_PATTERN = /^[1-9]\d{5}$/;
const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;

/**
 * Check if a location code is an Indian PIN code.
 */
const isIndianPinCode = (code: string): boolean => INDIA_PIN_CODE_PATTERN.test(code);

/**
 * Check if a location code is a UK postcode.
 */
const isUkPostcode = (code: string): boolean => UK_POSTCODE_PATTERN.test(code);

/**
 * Fetch coordinates for an Indian PIN code from the India Post API.
 * Falls back to a free geocoding service (BigDataCloud) if the India Post API is unavailable.
 */
const fetchIndianPinCoords = async (pinCode: string) => {
    // Try India Post API first
    try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pinCode)}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
                const postOffice = data[0].PostOffice[0];
                return {
                    latitude: parseFloat(postOffice.Latitude || '0') || null,
                    longitude: parseFloat(postOffice.Longitude || '0') || null,
                    postcode: pinCode,
                    city: postOffice.District || postOffice.State || '',
                };
            }
        }
    } catch {
        // Fall through to BigDataCloud
    }

    // Fallback: BigDataCloud free geocoding API (works for India)
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=&longitude=&localityLanguage=en&limit=1`);
        if (response.ok) {
            const data = await response.json();
            if (data) {
                return {
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    postcode: pinCode,
                    city: data.city || data.principalSubdivision || data.countryName || '',
                };
            }
        }
    } catch {
        // Final fallback: return null
    }

    return null;
};

const normalizeLocationCode = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export const validateLocationCode = (postcode: string): string | null => {
    if (!postcode) return null;

    const normalized = normalizeLocationCode(postcode);
    if (INDIA_PIN_CODE_PATTERN.test(normalized)) {
        return normalized;
    }
    if (UK_POSTCODE_PATTERN.test(normalized)) {
        return normalized.slice(0, -3) + ' ' + normalized.slice(-3);
    }

    return null;
};

/**
 * Get location code from coordinates when a supported reverse geocoder is available.
 */
export const getPostcodeFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        // Primary: try UK postcodes.io first
        const response = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`
        );

        if (response.ok) {
            const data = await response.json();
            if (data.result && data.result.length > 0) {
                return data.result[0].postcode;
            }
        }

        // Fallback: try India Post API for Indian coordinates
        // India Post has a nearest pincode lookup by coordinates
        try {
            const indiaResponse = await fetch(
                `https://api.postalpincode.in/pincode/hemlat/${latitude}/${longitude}`
            );
            if (indiaResponse.ok) {
                const indiaData = await indiaResponse.json();
                if (indiaData && indiaData[0] && indiaData[0].Status === 'Success' && indiaData[0].PostOffice && indiaData[0].PostOffice.length > 0) {
                    return indiaData[0].PostOffice[0].Pincode || null;
                }
            }
        } catch {
            // Ignore India Post errors, continue to final fallback
        }

        return null;
    } catch (error) {
        console.error('Error getting location code from coordinates:', error);
        return null;
    }
};

/**
 * Get coordinates from a supported location code.
 */
export const getCoordinatesFromPostcode = async (postcode: string): Promise<any | null> => {
    try {
        const validatedPostcode = validateLocationCode(postcode);
        if (!validatedPostcode) {
            throw new Error('Invalid location code format');
        }

        if (isIndianPinCode(validatedPostcode)) {
            const indiaCoords = await fetchIndianPinCoords(validatedPostcode);
            if (indiaCoords) {
                return indiaCoords;
            }
            // If India Post API fails, still return the PIN code as postcode
            // so the search can proceed without coordinates
            return {
                latitude: 0,
                longitude: 0,
                postcode: validatedPostcode,
                city: '',
            };
        }

        if (isUkPostcode(validatedPostcode)) {
            const response = await fetch(
                `https://api.postcodes.io/postcodes/${encodeURIComponent(validatedPostcode)}`
            );

            if (!response.ok) {
                throw new Error('Failed to get coordinates from location code');
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
        }

        // If we reach here, the validated postcode format wasn't recognized
        return null;
    } catch (error) {
        console.error('Error getting coordinates from location code:', error);
        return null;
    }
};

/**
 * Parse address string to extract a PIN code or postcode.
 */
export const extractPostcodeFromAddress = (address: string): string | null => {
    if (!address) return null;

    const match = address.match(/\b([1-9]\d{5}|[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b/i);
    if (match) {
        return validateLocationCode(match[1]);
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
}: GetUserLocationParams): Promise<LocationData | null> => {
    let location: LocationData | null = null;

    // Priority 1: Search input (PIN code, postcode, or address)
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
        } catch {
        }
    }

    return null;
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
