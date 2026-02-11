export interface Country {
    id: string;
    name: string;
    code: string;
    phone_code: string | null;
    currency_code: string | null;
}

export interface State {
    id: string;
    name: string;
    code: string | null;
    country_id: string;
}

export interface City {
    id: string;
    name: string;
    state_id: string;
    postal_code: string | null;
}

export interface AddressData {
    countryId: string;
    countryName: string;
    countryCode: string;
    stateId: string;
    stateName: string;
    stateCode: string | null;
    cityId: string;
    cityName: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
}

// Mock Data
const MOCK_COUNTRIES: Country[] = [
    { id: '1', name: 'United States', code: 'US', phone_code: '+1', currency_code: 'USD' },
    { id: '2', name: 'United Kingdom', code: 'GB', phone_code: '+44', currency_code: 'GBP' },
    { id: '3', name: 'India', code: 'IN', phone_code: '+91', currency_code: 'INR' },
    { id: '4', name: 'Canada', code: 'CA', phone_code: '+1', currency_code: 'CAD' },
    { id: '5', name: 'Australia', code: 'AU', phone_code: '+61', currency_code: 'AUD' },
];

const MOCK_STATES: Record<string, State[]> = {
    '1': [ // US
        { id: '101', name: 'California', code: 'CA', country_id: '1' },
        { id: '102', name: 'New York', code: 'NY', country_id: '1' },
        { id: '103', name: 'Texas', code: 'TX', country_id: '1' },
    ],
    '2': [ // UK
        { id: '201', name: 'England', code: 'ENG', country_id: '2' },
        { id: '202', name: 'Scotland', code: 'SCT', country_id: '2' },
    ],
};

const MOCK_CITIES: Record<string, City[]> = {
    '101': [ // California
        { id: '1001', name: 'Los Angeles', state_id: '101', postal_code: '90001' },
        { id: '1002', name: 'San Francisco', state_id: '101', postal_code: '94101' },
    ],
    '102': [ // New York
        { id: '1003', name: 'New York City', state_id: '102', postal_code: '10001' },
    ],
};

export async function getCountries(): Promise<{ data: Country[] | null; error: string | null }> {
    return { data: MOCK_COUNTRIES, error: null };
}

export async function getStatesByCountry(countryId: string): Promise<{ data: State[] | null; error: string | null }> {
    return { data: MOCK_STATES[countryId] || [], error: null };
}

export async function getCitiesByState(stateId: string): Promise<{ data: City[] | null; error: string | null }> {
    return { data: MOCK_CITIES[stateId] || [], error: null };
}

export async function resolveAddressToIds(
    countryName: string | undefined,
    countryCode: string | undefined,
    stateName: string | undefined,
    cityName: string | undefined
): Promise<{
    countryId: string | null;
    stateId: string | null;
    cityId: string | null;
    error: string | null;
}> {
    return { countryId: null, stateId: null, cityId: null, error: null };
}
