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
