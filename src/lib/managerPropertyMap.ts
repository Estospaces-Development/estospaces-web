export interface ManagerMapProperty {
  id?: string;
  title?: string;
  status?: string;
  listing_type?: string;
  property_type?: string;
  city?: string;
  country?: string;
  postcode?: string;
  postal_code?: string;
  zip_code?: string;
  address_line_1?: string;
  phone?: string;
  phone_number?: string;
  location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
  };
}

export interface ManagerPropertyMapLocation {
  id: string;
  name: string;
  type: 'property';
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  status?: string;
  listingType?: string;
}

const DEFAULT_MANAGER_MAP_CENTER: [number, number] = [20.5937, 78.9629];

const CITY_COORDINATES: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  madras: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  hyderabad: [17.385, 78.4867],
  pune: [18.5204, 73.8567],
  kolkata: [22.5726, 88.3639],
  guwahati: [26.1445, 91.7362],
  london: [51.5074, -0.1278],
  edinburgh: [55.9533, -3.1883],
  glasgow: [55.8642, -4.2518],
  manchester: [53.4808, -2.2426],
  birmingham: [52.4862, -1.8904],
  leeds: [53.8008, -1.5491],
  bristol: [51.4545, -2.5879],
};

const INDIA_PIN_PREFIX_COORDINATES: Array<[string, [number, number]]> = [
  ['600', [13.0827, 80.2707]],
  ['560', [12.9716, 77.5946]],
  ['400', [19.076, 72.8777]],
  ['110', [28.6139, 77.209]],
  ['500', [17.385, 78.4867]],
  ['700', [22.5726, 88.3639]],
  ['411', [18.5204, 73.8567]],
  ['781', [26.1445, 91.7362]],
];

const UK_POSTCODE_PREFIX_COORDINATES: Array<[string, [number, number]]> = [
  ['SW1A', [51.501, -0.1416]],
  ['SW', [51.5074, -0.1278]],
  ['W', [51.5074, -0.1278]],
  ['EC', [51.5155, -0.0922]],
  ['E', [51.5074, -0.1278]],
  ['N', [51.5074, -0.1278]],
  ['SE', [51.5074, -0.1278]],
  ['NW', [51.5074, -0.1278]],
  ['EH', [55.9533, -3.1883]],
  ['G', [55.8642, -4.2518]],
  ['M', [53.4808, -2.2426]],
  ['B', [52.4862, -1.8904]],
  ['LS', [53.8008, -1.5491]],
  ['BS', [51.4545, -2.5879]],
];

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

const toFiniteNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePostcode = (property: ManagerMapProperty) => String(
  property.location?.postalCode
  || property.postcode
  || property.postal_code
  || property.zip_code
  || '',
).trim().toUpperCase();

const isIndiaContext = (country: string, postcode: string) => (
  country === 'india'
  || country === 'in'
  || /^\d{6}$/.test(postcode)
);

const isUkContext = (country: string, postcode: string) => (
  country === 'uk'
  || country === 'gb'
  || country === 'united kingdom'
  || country === 'england'
  || country === 'scotland'
  || country === 'wales'
  || /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postcode)
);

const resolveByPrefix = (
  value: string,
  table: Array<[string, [number, number]]>,
) => table.find(([prefix]) => value.startsWith(prefix))?.[1] || null;

const resolveFallbackCoordinates = (property: ManagerMapProperty): [number, number] | null => {
  const country = normalizeText(property.location?.country || property.country);
  const city = normalizeText(property.location?.city || property.city);
  const postcode = normalizePostcode(property);

  if (isIndiaContext(country, postcode)) {
    return resolveByPrefix(postcode, INDIA_PIN_PREFIX_COORDINATES)
      || CITY_COORDINATES[city]
      || null;
  }

  if (isUkContext(country, postcode)) {
    return resolveByPrefix(postcode.replace(/\s+/g, ''), UK_POSTCODE_PREFIX_COORDINATES)
      || CITY_COORDINATES[city]
      || null;
  }

  return CITY_COORDINATES[city] || null;
};

const buildAddress = (property: ManagerMapProperty) => [
  property.location?.addressLine1 || property.address_line_1,
  property.location?.city || property.city,
  property.location?.postalCode || property.postcode || property.postal_code || property.zip_code,
  property.location?.country || property.country,
].map((part) => String(part || '').trim()).filter(Boolean).join(', ');

export const resolveManagerPropertyMapLocation = (
  property: ManagerMapProperty,
): ManagerPropertyMapLocation | null => {
  const directLat = toFiniteNumber(property.location?.latitude);
  const directLng = toFiniteNumber(property.location?.longitude);
  const fallbackCoordinates = directLat !== null && directLng !== null
    ? [directLat, directLng] as [number, number]
    : resolveFallbackCoordinates(property);

  if (!fallbackCoordinates) {
    return null;
  }

  return {
    id: String(property.id || property.title || `${fallbackCoordinates[0]}:${fallbackCoordinates[1]}`),
    name: property.title || 'Property listing',
    type: 'property',
    lat: fallbackCoordinates[0],
    lng: fallbackCoordinates[1],
    address: buildAddress(property) || undefined,
    phone: property.phone || property.phone_number || property.contact?.phone,
    status: property.status,
    listingType: property.listing_type || property.property_type,
  };
};

export const getManagerPropertyMapCenter = (
  locations: ManagerPropertyMapLocation[],
): [number, number] => {
  if (locations.length === 0) {
    return DEFAULT_MANAGER_MAP_CENTER;
  }

  const totals = locations.reduce((acc, location) => ({
    lat: acc.lat + location.lat,
    lng: acc.lng + location.lng,
  }), { lat: 0, lng: 0 });

  return [totals.lat / locations.length, totals.lng / locations.length];
};
