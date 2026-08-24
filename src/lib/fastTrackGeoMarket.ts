import {
  getGeoMarketSignalsFromUser,
  type GeoMarketSignals,
  type GeoMarketUserContext,
} from '@/lib/geoMarket';

export const getFastTrackGeoMarketSignals = (
  propertyCountry?: string | null,
  user?: GeoMarketUserContext | null,
): GeoMarketSignals => {
  const countryName = String(propertyCountry || '').trim();
  if (countryName) {
    return { countryName };
  }

  return getGeoMarketSignalsFromUser(user);
};
