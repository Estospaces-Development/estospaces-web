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
  latitude?: number | string | null;
  longitude?: number | string | null;
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

const toFiniteNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const directLat = toFiniteNumber(property.location?.latitude ?? property.latitude);
  const directLng = toFiniteNumber(property.location?.longitude ?? property.longitude);
  if (directLat === null || directLng === null) {
    return null;
  }
  const coordinates: [number, number] = [directLat, directLng];

  return {
    id: String(property.id || property.title || `${coordinates[0]}:${coordinates[1]}`),
    name: property.title || 'Property listing',
    type: 'property',
    lat: coordinates[0],
    lng: coordinates[1],
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
