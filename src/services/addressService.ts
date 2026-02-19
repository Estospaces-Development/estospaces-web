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

// UK-only static data
const COUNTRIES: Country[] = [
    { id: '1', name: 'United Kingdom', code: 'GB', phone_code: '+44', currency_code: 'GBP' },
];

const STATES: Record<string, State[]> = {
    '1': [ // UK regions / counties
        { id: '101', name: 'England', code: 'ENG', country_id: '1' },
        { id: '102', name: 'Scotland', code: 'SCT', country_id: '1' },
        { id: '103', name: 'Wales', code: 'WLS', country_id: '1' },
        { id: '104', name: 'Northern Ireland', code: 'NIR', country_id: '1' },
        { id: '105', name: 'Greater London', code: 'LND', country_id: '1' },
        { id: '106', name: 'South East England', code: 'SEE', country_id: '1' },
        { id: '107', name: 'South West England', code: 'SWE', country_id: '1' },
        { id: '108', name: 'East of England', code: 'EE', country_id: '1' },
        { id: '109', name: 'West Midlands', code: 'WM', country_id: '1' },
        { id: '110', name: 'East Midlands', code: 'EM', country_id: '1' },
        { id: '111', name: 'Yorkshire and The Humber', code: 'YH', country_id: '1' },
        { id: '112', name: 'North West England', code: 'NWE', country_id: '1' },
        { id: '113', name: 'North East England', code: 'NEE', country_id: '1' },
    ],
};

const CITIES: Record<string, City[]> = {
    '101': [ // England (general)
        { id: '1001', name: 'Bristol', state_id: '101', postal_code: 'BS1' },
        { id: '1002', name: 'Norwich', state_id: '101', postal_code: 'NR1' },
    ],
    '102': [ // Scotland
        { id: '1010', name: 'Edinburgh', state_id: '102', postal_code: 'EH1' },
        { id: '1011', name: 'Glasgow', state_id: '102', postal_code: 'G1' },
        { id: '1012', name: 'Aberdeen', state_id: '102', postal_code: 'AB10' },
        { id: '1013', name: 'Dundee', state_id: '102', postal_code: 'DD1' },
        { id: '1014', name: 'Inverness', state_id: '102', postal_code: 'IV1' },
    ],
    '103': [ // Wales
        { id: '1020', name: 'Cardiff', state_id: '103', postal_code: 'CF10' },
        { id: '1021', name: 'Swansea', state_id: '103', postal_code: 'SA1' },
        { id: '1022', name: 'Newport', state_id: '103', postal_code: 'NP20' },
    ],
    '104': [ // Northern Ireland
        { id: '1030', name: 'Belfast', state_id: '104', postal_code: 'BT1' },
        { id: '1031', name: 'Derry', state_id: '104', postal_code: 'BT48' },
    ],
    '105': [ // Greater London
        { id: '1040', name: 'Central London', state_id: '105', postal_code: 'WC1' },
        { id: '1041', name: 'Westminster', state_id: '105', postal_code: 'SW1' },
        { id: '1042', name: 'Camden', state_id: '105', postal_code: 'NW1' },
        { id: '1043', name: 'Islington', state_id: '105', postal_code: 'N1' },
        { id: '1044', name: 'Hackney', state_id: '105', postal_code: 'E8' },
        { id: '1045', name: 'Tower Hamlets', state_id: '105', postal_code: 'E1' },
        { id: '1046', name: 'Southwark', state_id: '105', postal_code: 'SE1' },
        { id: '1047', name: 'Lambeth', state_id: '105', postal_code: 'SW9' },
        { id: '1048', name: 'Greenwich', state_id: '105', postal_code: 'SE10' },
        { id: '1049', name: 'Lewisham', state_id: '105', postal_code: 'SE13' },
        { id: '1050', name: 'Kensington and Chelsea', state_id: '105', postal_code: 'W8' },
        { id: '1051', name: 'Hammersmith and Fulham', state_id: '105', postal_code: 'W6' },
        { id: '1052', name: 'Wandsworth', state_id: '105', postal_code: 'SW18' },
        { id: '1053', name: 'Richmond upon Thames', state_id: '105', postal_code: 'TW9' },
        { id: '1054', name: 'Barnet', state_id: '105', postal_code: 'EN5' },
        { id: '1055', name: 'Ealing', state_id: '105', postal_code: 'W5' },
        { id: '1056', name: 'Croydon', state_id: '105', postal_code: 'CR0' },
        { id: '1057', name: 'Bromley', state_id: '105', postal_code: 'BR1' },
    ],
    '106': [ // South East England
        { id: '1060', name: 'Brighton', state_id: '106', postal_code: 'BN1' },
        { id: '1061', name: 'Oxford', state_id: '106', postal_code: 'OX1' },
        { id: '1062', name: 'Reading', state_id: '106', postal_code: 'RG1' },
        { id: '1063', name: 'Southampton', state_id: '106', postal_code: 'SO14' },
        { id: '1064', name: 'Portsmouth', state_id: '106', postal_code: 'PO1' },
        { id: '1065', name: 'Canterbury', state_id: '106', postal_code: 'CT1' },
        { id: '1066', name: 'Guildford', state_id: '106', postal_code: 'GU1' },
        { id: '1067', name: 'Milton Keynes', state_id: '106', postal_code: 'MK9' },
    ],
    '107': [ // South West England
        { id: '1070', name: 'Bath', state_id: '107', postal_code: 'BA1' },
        { id: '1071', name: 'Exeter', state_id: '107', postal_code: 'EX1' },
        { id: '1072', name: 'Plymouth', state_id: '107', postal_code: 'PL1' },
        { id: '1073', name: 'Bournemouth', state_id: '107', postal_code: 'BH1' },
    ],
    '108': [ // East of England
        { id: '1080', name: 'Cambridge', state_id: '108', postal_code: 'CB1' },
        { id: '1081', name: 'Ipswich', state_id: '108', postal_code: 'IP1' },
        { id: '1082', name: 'Colchester', state_id: '108', postal_code: 'CO1' },
    ],
    '109': [ // West Midlands
        { id: '1090', name: 'Birmingham', state_id: '109', postal_code: 'B1' },
        { id: '1091', name: 'Coventry', state_id: '109', postal_code: 'CV1' },
        { id: '1092', name: 'Wolverhampton', state_id: '109', postal_code: 'WV1' },
    ],
    '110': [ // East Midlands
        { id: '1100', name: 'Nottingham', state_id: '110', postal_code: 'NG1' },
        { id: '1101', name: 'Leicester', state_id: '110', postal_code: 'LE1' },
        { id: '1102', name: 'Derby', state_id: '110', postal_code: 'DE1' },
    ],
    '111': [ // Yorkshire and The Humber
        { id: '1110', name: 'Leeds', state_id: '111', postal_code: 'LS1' },
        { id: '1111', name: 'Sheffield', state_id: '111', postal_code: 'S1' },
        { id: '1112', name: 'York', state_id: '111', postal_code: 'YO1' },
        { id: '1113', name: 'Bradford', state_id: '111', postal_code: 'BD1' },
        { id: '1114', name: 'Hull', state_id: '111', postal_code: 'HU1' },
    ],
    '112': [ // North West England
        { id: '1120', name: 'Manchester', state_id: '112', postal_code: 'M1' },
        { id: '1121', name: 'Liverpool', state_id: '112', postal_code: 'L1' },
        { id: '1122', name: 'Chester', state_id: '112', postal_code: 'CH1' },
        { id: '1123', name: 'Preston', state_id: '112', postal_code: 'PR1' },
        { id: '1124', name: 'Blackpool', state_id: '112', postal_code: 'FY1' },
    ],
    '113': [ // North East England
        { id: '1130', name: 'Newcastle upon Tyne', state_id: '113', postal_code: 'NE1' },
        { id: '1131', name: 'Sunderland', state_id: '113', postal_code: 'SR1' },
        { id: '1132', name: 'Durham', state_id: '113', postal_code: 'DH1' },
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
    let stateId: string | null = null;
    let cityId: string | null = null;

    // Find state
    if (stateName && STATES[countryId]) {
        const state = STATES[countryId].find(s => s.name.toLowerCase() === stateName.toLowerCase());
        if (state) {
            stateId = state.id;
            // Find city
            if (cityName && CITIES[stateId]) {
                const city = CITIES[stateId].find(c => c.name.toLowerCase() === cityName.toLowerCase());
                if (city) cityId = city.id;
            }
        }
    }

    return { countryId, stateId, cityId, error: null };
}
