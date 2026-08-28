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
        { id: '105', name: 'North East England', code: 'NEE', country_id: '1' },
        { id: '106', name: 'North West England', code: 'NWE', country_id: '1' },
        { id: '107', name: 'Yorkshire and the Humber', code: 'YH', country_id: '1' },
        { id: '108', name: 'East Midlands', code: 'EM', country_id: '1' },
        { id: '109', name: 'West Midlands', code: 'WM', country_id: '1' },
        { id: '110', name: 'East of England', code: 'EE', country_id: '1' },
        { id: '111', name: 'London', code: 'LON', country_id: '1' },
        { id: '112', name: 'South East England', code: 'SEE', country_id: '1' },
        { id: '113', name: 'South West England', code: 'SWE', country_id: '1' },
    ],
    '2': [
        { id: '201', name: 'Tamil Nadu', code: 'TN', country_id: '2' },
        { id: '202', name: 'Karnataka', code: 'KA', country_id: '2' },
        { id: '203', name: 'Telangana', code: 'TS', country_id: '2' },
        { id: '204', name: 'Maharashtra', code: 'MH', country_id: '2' },
        { id: '205', name: 'Delhi', code: 'DL', country_id: '2' },
        { id: '206', name: 'Kerala', code: 'KL', country_id: '2' },
        { id: '207', name: 'Andhra Pradesh', code: 'AP', country_id: '2' },
        { id: '208', name: 'Arunachal Pradesh', code: 'AR', country_id: '2' },
        { id: '209', name: 'Assam', code: 'AS', country_id: '2' },
        { id: '210', name: 'Bihar', code: 'BR', country_id: '2' },
        { id: '211', name: 'Chhattisgarh', code: 'CG', country_id: '2' },
        { id: '212', name: 'Goa', code: 'GA', country_id: '2' },
        { id: '213', name: 'Gujarat', code: 'GJ', country_id: '2' },
        { id: '214', name: 'Haryana', code: 'HR', country_id: '2' },
        { id: '215', name: 'Himachal Pradesh', code: 'HP', country_id: '2' },
        { id: '216', name: 'Jharkhand', code: 'JH', country_id: '2' },
        { id: '217', name: 'Madhya Pradesh', code: 'MP', country_id: '2' },
        { id: '218', name: 'Manipur', code: 'MN', country_id: '2' },
        { id: '219', name: 'Meghalaya', code: 'ML', country_id: '2' },
        { id: '220', name: 'Mizoram', code: 'MZ', country_id: '2' },
        { id: '221', name: 'Nagaland', code: 'NL', country_id: '2' },
        { id: '222', name: 'Odisha', code: 'OD', country_id: '2' },
        { id: '223', name: 'Punjab', code: 'PB', country_id: '2' },
        { id: '224', name: 'Rajasthan', code: 'RJ', country_id: '2' },
        { id: '225', name: 'Sikkim', code: 'SK', country_id: '2' },
        { id: '226', name: 'Tripura', code: 'TR', country_id: '2' },
        { id: '227', name: 'Uttar Pradesh', code: 'UP', country_id: '2' },
        { id: '228', name: 'Uttarakhand', code: 'UK', country_id: '2' },
        { id: '229', name: 'West Bengal', code: 'WB', country_id: '2' },
        { id: '230', name: 'Andaman and Nicobar Islands', code: 'AN', country_id: '2' },
        { id: '231', name: 'Chandigarh', code: 'CH', country_id: '2' },
        { id: '232', name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', country_id: '2' },
        { id: '233', name: 'Jammu and Kashmir', code: 'JK', country_id: '2' },
        { id: '234', name: 'Ladakh', code: 'LA', country_id: '2' },
        { id: '235', name: 'Lakshadweep', code: 'LD', country_id: '2' },
        { id: '236', name: 'Puducherry', code: 'PY', country_id: '2' },
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
    '105': [
        { id: '1040', name: 'Newcastle upon Tyne', state_id: '105', postal_code: 'NE1 1AA' },
        { id: '1041', name: 'Sunderland', state_id: '105', postal_code: 'SR1 1AA' },
    ],
    '106': [
        { id: '1050', name: 'Liverpool', state_id: '106', postal_code: 'L1 1AA' },
        { id: '1051', name: 'Preston', state_id: '106', postal_code: 'PR1 1AA' },
    ],
    '107': [
        { id: '1060', name: 'Leeds', state_id: '107', postal_code: 'LS1 1AA' },
        { id: '1061', name: 'Sheffield', state_id: '107', postal_code: 'S1 1AA' },
    ],
    '108': [
        { id: '1070', name: 'Nottingham', state_id: '108', postal_code: 'NG1 1AA' },
        { id: '1071', name: 'Leicester', state_id: '108', postal_code: 'LE1 1AA' },
    ],
    '109': [
        { id: '1080', name: 'Coventry', state_id: '109', postal_code: 'CV1 1AA' },
        { id: '1081', name: 'Wolverhampton', state_id: '109', postal_code: 'WV1 1AA' },
    ],
    '110': [
        { id: '1090', name: 'Cambridge', state_id: '110', postal_code: 'CB1 1AA' },
        { id: '1091', name: 'Norwich', state_id: '110', postal_code: 'NR1 1AA' },
    ],
    '111': [
        { id: '1100', name: 'London', state_id: '111', postal_code: 'SW1A 1AA' },
    ],
    '112': [
        { id: '1110', name: 'Oxford', state_id: '112', postal_code: 'OX1 1AA' },
        { id: '1111', name: 'Brighton and Hove', state_id: '112', postal_code: 'BN1 1AA' },
    ],
    '113': [
        { id: '1120', name: 'Bristol', state_id: '113', postal_code: 'BS1 1AA' },
        { id: '1121', name: 'Plymouth', state_id: '113', postal_code: 'PL1 1AA' },
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
    '207': [
        { id: '2060', name: 'Amaravati', state_id: '207', postal_code: '522020' },
        { id: '2061', name: 'Visakhapatnam', state_id: '207', postal_code: '530001' },
    ],
    '208': [
        { id: '2070', name: 'Itanagar', state_id: '208', postal_code: '791111' },
    ],
    '209': [
        { id: '2080', name: 'Guwahati', state_id: '209', postal_code: '781001' },
    ],
    '210': [
        { id: '2090', name: 'Patna', state_id: '210', postal_code: '800001' },
    ],
    '211': [
        { id: '2100', name: 'Raipur', state_id: '211', postal_code: '492001' },
    ],
    '212': [
        { id: '2110', name: 'Panaji', state_id: '212', postal_code: '403001' },
    ],
    '213': [
        { id: '2120', name: 'Ahmedabad', state_id: '213', postal_code: '380001' },
        { id: '2121', name: 'Surat', state_id: '213', postal_code: '395003' },
    ],
    '214': [
        { id: '2130', name: 'Gurugram', state_id: '214', postal_code: '122001' },
        { id: '2131', name: 'Faridabad', state_id: '214', postal_code: '121001' },
    ],
    '215': [
        { id: '2140', name: 'Shimla', state_id: '215', postal_code: '171001' },
    ],
    '216': [
        { id: '2150', name: 'Ranchi', state_id: '216', postal_code: '834001' },
    ],
    '217': [
        { id: '2160', name: 'Bhopal', state_id: '217', postal_code: '462001' },
        { id: '2161', name: 'Indore', state_id: '217', postal_code: '452001' },
    ],
    '218': [
        { id: '2170', name: 'Imphal', state_id: '218', postal_code: '795001' },
    ],
    '219': [
        { id: '2180', name: 'Shillong', state_id: '219', postal_code: '793001' },
    ],
    '220': [
        { id: '2190', name: 'Aizawl', state_id: '220', postal_code: '796001' },
    ],
    '221': [
        { id: '2200', name: 'Kohima', state_id: '221', postal_code: '797001' },
    ],
    '222': [
        { id: '2210', name: 'Bhubaneswar', state_id: '222', postal_code: '751001' },
        { id: '2211', name: 'Cuttack', state_id: '222', postal_code: '753001' },
    ],
    '223': [
        { id: '2220', name: 'Amritsar', state_id: '223', postal_code: '143001' },
        { id: '2221', name: 'Ludhiana', state_id: '223', postal_code: '141001' },
    ],
    '224': [
        { id: '2230', name: 'Jaipur', state_id: '224', postal_code: '302001' },
        { id: '2231', name: 'Jodhpur', state_id: '224', postal_code: '342001' },
    ],
    '225': [
        { id: '2240', name: 'Gangtok', state_id: '225', postal_code: '737101' },
    ],
    '226': [
        { id: '2250', name: 'Agartala', state_id: '226', postal_code: '799001' },
    ],
    '227': [
        { id: '2260', name: 'Lucknow', state_id: '227', postal_code: '226001' },
        { id: '2261', name: 'Noida', state_id: '227', postal_code: '201301' },
        { id: '2262', name: 'Varanasi', state_id: '227', postal_code: '221001' },
    ],
    '228': [
        { id: '2270', name: 'Dehradun', state_id: '228', postal_code: '248001' },
        { id: '2271', name: 'Haridwar', state_id: '228', postal_code: '249401' },
    ],
    '229': [
        { id: '2280', name: 'Kolkata', state_id: '229', postal_code: '700001' },
        { id: '2281', name: 'Siliguri', state_id: '229', postal_code: '734001' },
    ],
    '230': [
        { id: '2290', name: 'Port Blair', state_id: '230', postal_code: '744101' },
    ],
    '231': [
        { id: '2300', name: 'Chandigarh', state_id: '231', postal_code: '160001' },
    ],
    '232': [
        { id: '2310', name: 'Daman', state_id: '232', postal_code: '396210' },
        { id: '2311', name: 'Silvassa', state_id: '232', postal_code: '396230' },
    ],
    '233': [
        { id: '2320', name: 'Srinagar', state_id: '233', postal_code: '190001' },
        { id: '2321', name: 'Jammu', state_id: '233', postal_code: '180001' },
    ],
    '234': [
        { id: '2330', name: 'Leh', state_id: '234', postal_code: '194101' },
    ],
    '235': [
        { id: '2340', name: 'Kavaratti', state_id: '235', postal_code: '682555' },
    ],
    '236': [
        { id: '2350', name: 'Puducherry', state_id: '236', postal_code: '605001' },
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
