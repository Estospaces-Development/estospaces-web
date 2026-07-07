import { getLaunchCityFromPinCode } from './launchLocale';

export const normalizeSavedPropertyId = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

export const isSameSavedPropertyId = (left: unknown, right: unknown) =>
  normalizeSavedPropertyId(left) !== '' && normalizeSavedPropertyId(left) === normalizeSavedPropertyId(right);

export type SavedPropertySortOption = 'newest' | 'price_asc' | 'price_desc' | 'title_asc';

const firstText = (...values: unknown[]) =>
  values
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .find(Boolean) || '';

const getLocationObject = (property: any) =>
  property?.location && typeof property.location === 'object'
    ? property.location
    : {};

export function getSavedPropertyLocationCode(property: any): string {
  const location = getLocationObject(property);
  return firstText(
    property?.postcode,
    property?.postalCode,
    location?.postcode,
    location?.postalCode,
  );
}

export function getSavedPropertyLocationCity(property: any): string {
  const location = getLocationObject(property);
  const locationCode = getSavedPropertyLocationCode(property);
  const country = firstText(
    property?.country,
    property?.countryCode,
    property?.country_code,
    location?.country,
    location?.countryCode,
    location?.country_code,
  );

  return getLaunchCityFromPinCode(locationCode, country, country)
    || firstText(property?.city, location?.city);
}

export function getSavedPropertyLocationLabel(property: any): string {
  const location = property?.location;
  if (typeof location === 'string' && location.trim()) {
    return location.trim();
  }
  const locationObject = getLocationObject(property);

  const locationParts = [
    property?.address,
    property?.address_line_1,
    locationObject?.addressLine1,
    locationObject?.address_line_1,
    getSavedPropertyLocationCity(property),
    getSavedPropertyLocationCode(property),
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());

  return Array.from(new Set(locationParts)).join(', ') || 'Location unavailable';
}

const getSavedPropertyTimestamp = (property: any) => {
  const value = property?.saved_at || property?.created_at || property?.updated_at;
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getSavedPropertyPrice = (property: any) => {
  const value = Number(property?.price ?? 0);
  return Number.isFinite(value) ? value : 0;
};

export function filterAndSortSavedProperties(
  properties: any[],
  filterText: string,
  sortBy: SavedPropertySortOption,
) {
  const query = filterText.trim().toLowerCase();
  const filtered = query
    ? properties.filter((property) => [
      property?.title,
      property?.property_type,
      property?.listing_type,
      property?.city,
      property?.postcode,
      getSavedPropertyLocationLabel(property),
    ].join(' ').toLowerCase().includes(query))
    : [...properties];

  return filtered.sort((left, right) => {
    switch (sortBy) {
      case 'price_asc':
        return getSavedPropertyPrice(left) - getSavedPropertyPrice(right);
      case 'price_desc':
        return getSavedPropertyPrice(right) - getSavedPropertyPrice(left);
      case 'title_asc':
        return String(left?.title || '').localeCompare(String(right?.title || ''));
      case 'newest':
      default:
        return getSavedPropertyTimestamp(right) - getSavedPropertyTimestamp(left);
    }
  });
}
