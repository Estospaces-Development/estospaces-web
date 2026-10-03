// Display labels for the amenity codes the property editor stores.
const AMENITY_LABELS: Record<string, string> = {
    ac: 'Air Conditioning',
    heating: 'Central Heating',
    fireplace: 'Fireplace',
    walk_in_closet: 'Walk-in Closet',
    hardwood_floors: 'Hardwood Floors',
    high_ceiling: 'High Ceilings',
    balcony: 'Balcony',
    garden: 'Garden',
    terrace: 'Terrace',
    patio: 'Patio',
    deck: 'Deck',
    rooftop: 'Rooftop Access',
    pool: 'Swimming Pool',
    gym: 'Gym / Fitness Center',
    clubhouse: 'Clubhouse',
    playground: 'Playground',
    tennis_court: 'Tennis Court',
    sports_facility: 'Sports Facility',
    '24hr_security': '24/7 Security',
    cctv: 'CCTV Surveillance',
    gated_community: 'Gated Community',
    intercom: 'Intercom System',
    fire_alarm: 'Fire Alarm',
    smart_locks: 'Smart Locks',
    wifi: 'WiFi Included',
    cable_tv: 'Cable TV',
    water_supply: '24/7 Water Supply',
    power_backup: 'Power Backup',
    gas_pipeline: 'Gas Pipeline',
    waste_disposal: 'Waste Disposal',
};

export const getKnownAmenityLabel = (value: string): string | undefined => (
    AMENITY_LABELS[value.trim().toLowerCase().replace(/[\s-]+/g, '_')]
);

// Known codes get their editor label; anything else is shown as readable words.
export const formatAmenityLabel = (value: string): string => {
    const known = getKnownAmenityLabel(value);
    if (known) {
        return known;
    }
    return value
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\p{Ll}/gu, (letter) => letter.toUpperCase());
};

// Editor codes in display order; the search filter offers exactly these.
export const AMENITY_CODES = Object.keys(AMENITY_LABELS);
const MAX_AMENITY_FILTERS = 20;

// Reads the `amenities=wifi,pool` URL value. Unknown codes are dropped so every
// active filter has a checkbox that can clear it.
export const parseAmenityParam = (value: string | null | undefined): string[] => {
    const requested = new Set((value ?? '').split(',').map((code) => code.trim().toLowerCase()));
    return AMENITY_CODES.filter((code) => requested.has(code)).slice(0, MAX_AMENITY_FILTERS);
};

export const serializeAmenityParam = (codes: readonly string[]): string => (
    parseAmenityParam(codes.join(',')).join(',')
);

export const toggleAmenityParam = (value: string, code: string): string => {
    const selected = parseAmenityParam(value);
    return serializeAmenityParam(
        selected.includes(code) ? selected.filter((selectedCode) => selectedCode !== code) : [...selected, code],
    );
};
