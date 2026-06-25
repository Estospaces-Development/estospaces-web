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

// Launch static data. India remains first so create flows keep the India default, while UK is selectable when the location is UK-based.
const COUNTRIES: Country[] = [
    { id: '2', name: 'India', code: 'IN', phone_code: '+91', currency_code: 'INR' },
    { id: '1', name: 'United Kingdom', code: 'GB', phone_code: '+44', currency_code: 'GBP' },
];

const STATES: Record<string, State[]> = {
    '1': [
        { id: '101', name: 'England', code: 'ENG', country_id: '1' },
        { id: '102', name: 'Scotland', code: 'SCT', country_id: '1' },
        { id: '103', name: 'Wales', code: 'WLS', country_id: '1' },
        { id: '104', name: 'Northern Ireland', code: 'NIR', country_id: '1' },
    ],
    '2': [
        { id: '201', name: 'Tamil Nadu', code: 'TN', country_id: '2' },
        { id: '202', name: 'Karnataka', code: 'KA', country_id: '2' },
        { id: '203', name: 'Telangana', code: 'TS', country_id: '2' },
        { id: '204', name: 'Maharashtra', code: 'MH', country_id: '2' },
        { id: '205', name: 'Delhi', code: 'DL', country_id: '2' },
        { id: '206', name: 'Kerala', code: 'KL', country_id: '2' },
    ],
};

const CITIES: Record<string, City[]> = {
    '101': [
        { id: '1001', name: 'London', state_id: '101', postal_code: 'SW1A 1AA' },
        { id: '1002', name: 'Manchester', state_id: '101', postal_code: 'M1 1AE' },
        { id: '1003', name: 'Birmingham', state_id: '101', postal_code: 'B1 1AA' },
    ],
    '102': [
        { id: '1010', name: 'Edinburgh', state_id: '102', postal_code: 'EH1 1AA' },
        { id: '1011', name: 'Glasgow', state_id: '102', postal_code: 'G1 1AA' },
    ],
    '103': [
        { id: '1020', name: 'Cardiff', state_id: '103', postal_code: 'CF10 1EP' },
    ],
    '104': [
        { id: '1030', name: 'Belfast', state_id: '104', postal_code: 'BT1 5GS' },
    ],
    '201': [
        { id: '2001', name: 'Chennai', state_id: '201', postal_code: '600001' },
        { id: '2002', name: 'Coimbatore', state_id: '201', postal_code: '641001' },
        { id: '2003', name: 'Madurai', state_id: '201', postal_code: '625001' },
    ],
    '202': [
        { id: '2010', name: 'Bengaluru', state_id: '202', postal_code: '560001' },
        { id: '2011', name: 'Mysuru', state_id: '202', postal_code: '570001' },
        { id: '2012', name: 'Mangaluru', state_id: '202', postal_code: '575001' },
    ],
    '203': [
        { id: '2020', name: 'Hyderabad', state_id: '203', postal_code: '500001' },
        { id: '2021', name: 'Warangal', state_id: '203', postal_code: '506002' },
    ],
    '204': [
        { id: '2030', name: 'Mumbai', state_id: '204', postal_code: '400001' },
        { id: '2031', name: 'Pune', state_id: '204', postal_code: '411001' },
        { id: '2032', name: 'Nagpur', state_id: '204', postal_code: '440001' },
    ],
    '205': [
        { id: '2040', name: 'New Delhi', state_id: '205', postal_code: '110001' },
        { id: '2041', name: 'Dwarka', state_id: '205', postal_code: '110075' },
    ],
    '206': [
        { id: '2050', name: 'Kochi', state_id: '206', postal_code: '682001' },
        { id: '2051', name: 'Thiruvananthapuram', state_id: '206', postal_code: '695001' },
    ],
};

export async function getCountries(): Promise<{ data: Country[] | null; error: string | null }> {
    return { data: COUNTRIES, error: null };
}

export async function getStatesByCountry(countryId: string): Promise<{ data: State[] | null; error: string | null }> {
    return { data: STATES[countryId] || [], error: null };
}

export async function getCitiesByState(stateId: string): Promise<{ data: City[] | null; error: string | null }> {
    return { data: CITIES[stateId] || [], error: null };
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
    // Find country
    const country = COUNTRIES.find(c =>
        (countryName && c.name.toLowerCase() === countryName.toLowerCase()) ||
        (countryCode && c.code.toLowerCase() === countryCode.toLowerCase())
    );
    if (!country) return { countryId: null, stateId: null, cityId: null, error: null };

    const countryId = country.id;
    const countryStates = STATES[countryId] || [];
    let stateId: string | null = null;
    let cityId: string | null = null;
    let resolvedState: State | undefined;

    // Find state
    if (stateName && countryStates.length > 0) {
        resolvedState = countryStates.find(
            (state) => state.name.toLowerCase() === stateName.toLowerCase(),
        );
        if (resolvedState) {
            stateId = resolvedState.id;
        }
    }

    // Some persisted listings only carry city and country.
    // Infer the missing region from the city so edit flows can rehydrate correctly.
    if (!resolvedState && cityName) {
        for (const state of countryStates) {
            const cities = CITIES[state.id] || [];
            const city = cities.find((entry) => entry.name.toLowerCase() === cityName.toLowerCase());
            if (city) {
                resolvedState = state;
                stateId = state.id;
                cityId = city.id;
                break;
            }
        }
    }

    if (resolvedState && cityName && !cityId) {
        const cities = CITIES[resolvedState.id] || [];
        const city = cities.find((entry) => entry.name.toLowerCase() === cityName.toLowerCase());
        if (city) {
            cityId = city.id;
        }
    }

    return { countryId, stateId, cityId, error: null };
}
