import {
  LAUNCH_COUNTRY_CODE,
  UK_COUNTRY_CODE,
  getSupportedLaunchCountry,
  isLaunchIndiaCountry,
  isLaunchUKCountry,
  type SupportedLaunchCountryCode,
} from '@/lib/launchLocale';
import { inferSearchMarketFromText } from '@/lib/propertySearchControls';

export interface StoredMapLocationLike {
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null;
  city?: string | null;
  postcode?: string | null;
  postalCode?: string | null;
  postal_code?: string | null;
  zipCode?: string | null;
  zip_code?: string | null;
  address?: string | null;
  address_line_1?: string | null;
  addressLine1?: string | null;
  location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    lat?: number | string | null;
    lng?: number | string | null;
    country?: string | null;
    countryCode?: string | null;
    country_code?: string | null;
    city?: string | null;
    postcode?: string | null;
    postalCode?: string | null;
    postal_code?: string | null;
    address?: string | null;
    address_line_1?: string | null;
    addressLine1?: string | null;
  } | null;
}

export interface VerifiedMapCoordinates {
  latitude: number;
  longitude: number;
}

interface MapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

const INDIA_MAP_BOUNDS: MapBounds = {
  minLatitude: 6,
  maxLatitude: 38,
  minLongitude: 68,
  maxLongitude: 98,
};

const UK_MAP_BOUNDS: MapBounds = {
  minLatitude: 49,
  maxLatitude: 61,
  minLongitude: -11,
  maxLongitude: 3,
};

const MAP_BOUNDS_BY_MARKET: Record<SupportedLaunchCountryCode, MapBounds> = {
  [LAUNCH_COUNTRY_CODE]: INDIA_MAP_BOUNDS,
  [UK_COUNTRY_CODE]: UK_MAP_BOUNDS,
};

export const normalizeMapCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const isValidGeographicCoordinates = (
  latitude: unknown,
  longitude: unknown,
): latitude is number => (
  typeof latitude === 'number'
  && Number.isFinite(latitude)
  && latitude >= -85
  && latitude <= 85
  && typeof longitude === 'number'
  && Number.isFinite(longitude)
  && longitude >= -180
  && longitude <= 180
  && !(latitude === 0 && longitude === 0)
);

const isInsideBounds = (
  coordinates: VerifiedMapCoordinates,
  bounds: MapBounds,
) => (
  coordinates.latitude >= bounds.minLatitude
  && coordinates.latitude <= bounds.maxLatitude
  && coordinates.longitude >= bounds.minLongitude
  && coordinates.longitude <= bounds.maxLongitude
);

export const areCoordinatesInsideLaunchMarket = (
  latitude: number,
  longitude: number,
  market: SupportedLaunchCountryCode,
) => (
  isValidGeographicCoordinates(latitude, longitude)
  && isInsideBounds({ latitude, longitude }, MAP_BOUNDS_BY_MARKET[market])
);

const getExplicitCountry = (value: StoredMapLocationLike) => ({
  code: value.location?.countryCode
    || value.location?.country_code
    || value.countryCode
    || value.country_code,
  name: value.location?.country || value.country,
});

const isExplicitIndiaCountry = (code?: string | null, name?: string | null) => (
  isLaunchIndiaCountry(code, name) || isLaunchIndiaCountry(name, name)
);

const isExplicitUKCountry = (code?: string | null, name?: string | null) => (
  isLaunchUKCountry(code, name) || isLaunchUKCountry(name, name)
);

const inferPropertyMarket = (
  value: StoredMapLocationLike,
): SupportedLaunchCountryCode | null => {
  const country = getExplicitCountry(value);
  const hasExplicitCountry = Boolean(String(country.code || country.name || '').trim());
  if (hasExplicitCountry) {
    if (isExplicitIndiaCountry(country.code, country.name)) {
      return LAUNCH_COUNTRY_CODE;
    }
    if (isExplicitUKCountry(country.code, country.name)) {
      return UK_COUNTRY_CODE;
    }
    return null;
  }

  const postcode = value.location?.postalCode
    || value.location?.postcode
    || value.location?.postal_code
    || value.postalCode
    || value.postcode
    || value.postal_code
    || value.zipCode
    || value.zip_code;
  const postcodeMarket = getSupportedLaunchCountry(undefined, undefined, postcode);
  if (postcodeMarket) {
    return postcodeMarket;
  }

  return inferSearchMarketFromText(value.location?.city || value.city)
    || inferSearchMarketFromText(
      value.location?.addressLine1
      || value.location?.address_line_1
      || value.location?.address
      || value.addressLine1
      || value.address_line_1
      || value.address,
    );
};

export const getVerifiedPropertyMapCoordinates = (
  value: StoredMapLocationLike | null | undefined,
): VerifiedMapCoordinates | null => {
  if (!value) {
    return null;
  }

  const latitude = normalizeMapCoordinate(
    value.location?.latitude ?? value.location?.lat ?? value.latitude ?? value.lat,
  );
  const longitude = normalizeMapCoordinate(
    value.location?.longitude ?? value.location?.lng ?? value.longitude ?? value.lng,
  );
  if (latitude === null || longitude === null || !isValidGeographicCoordinates(latitude, longitude)) {
    return null;
  }

  const coordinates = { latitude, longitude };
  const explicitCountry = getExplicitCountry(value);
  const hasUnsupportedExplicitCountry = Boolean(
    String(explicitCountry.code || explicitCountry.name || '').trim(),
  ) && !isExplicitIndiaCountry(explicitCountry.code, explicitCountry.name)
    && !isExplicitUKCountry(explicitCountry.code, explicitCountry.name);
  if (hasUnsupportedExplicitCountry) {
    return null;
  }

  const market = inferPropertyMarket(value);
  if (market) {
    return isInsideBounds(coordinates, MAP_BOUNDS_BY_MARKET[market])
      ? coordinates
      : null;
  }

  const isInsideAnyLaunchMarket = Object.values(MAP_BOUNDS_BY_MARKET)
    .some((bounds) => isInsideBounds(coordinates, bounds));
  return isInsideAnyLaunchMarket ? coordinates : null;
};
