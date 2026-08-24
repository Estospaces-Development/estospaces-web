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

export interface PropertyLocationLookup {
    postalCode: string;
    countryCode: string;
}

export interface ResolvedMapCoordinates {
    latitude: number;
    longitude: number;
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

const parseProviderCoordinate = (
    value: unknown,
    minimum: number,
    maximum: number,
): number | null => {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '' || (typeof normalized === 'string' && !/^-?\d+(?:\.\d+)?$/.test(normalized))) {
        return null;
    }
    const coordinate = Number(normalized);
    return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
        ? coordinate
        : null;
};

/**
 * Fetch coordinates from a PIN-only directory sourced from India Post data.
 * No street, manager, or property information is sent to the provider.
 */
const fetchIndianPinCoords = async (pinCode: string) => {
    try {
        const response = await fetch(
            `https://api.pincodeapi.in/api/v1/pincode/${encodeURIComponent(pinCode)}`,
            { cache: 'force-cache' },
        );
        if (response.ok) {
            const data = await response.json();
            const providerData = data?.data;
            const offices = Array.isArray(providerData)
                ? providerData
                : data?.success === true &&
                    String(providerData?.pincode || '').trim() === pinCode &&
                    Array.isArray(providerData?.post_offices)
                    ? providerData.post_offices
                    : [];
            for (const entry of offices) {
                if (!entry || typeof entry !== 'object') continue;
                const record = entry as Record<string, unknown>;
                const latitude = parseProviderCoordinate(record.latitude, -90, 90);
                const longitude = parseProviderCoordinate(record.longitude, -180, 180);
                if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
                    continue;
                }
                return {
                    latitude,
                    longitude,
                    postcode: pinCode,
                    city: String(record.district || record.state || record.statename || ''),
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
 * Resolve the PIN/postcode portion of the entered property address to a map
 * area. Exact street details never leave the application; managers refine the
 * initial postal position using the map or their current location.
 */
export const getCoordinatesFromAddress = async (
    location: PropertyLocationLookup,
): Promise<ResolvedMapCoordinates | null> => {
    const coordinates = await getCoordinatesFromPostcode(location.postalCode);
    const latitude = Number(coordinates?.latitude);
    const longitude = Number(coordinates?.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        (latitude === 0 && longitude === 0)
    ) {
        return null;
    }

    return { latitude, longitude };
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
