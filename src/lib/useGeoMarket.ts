import { useEffect, useMemo, useState } from "react";

import {
  fetchClientGeoHint,
  getBrowserGeoMarketSignals,
  getCataloguePinnedMarket,
  getGeoMarketSignalsFromUser,
  mergeWithBrowserSignals,
  resolveGeoMarket,
  resolveGeoMarketFromClientHint,
  type GeoMarketCode,
  type GeoMarketSignals,
  type GeoMarketUserContext,
} from "@/lib/geoMarket";

export const useGeoMarket = (signals: GeoMarketSignals = {}): GeoMarketCode => {
  const { countryCode, countryName, locationCode, acceptLanguage, timeZone } = signals;
  const stableSignals = useMemo<GeoMarketSignals>(() => ({
    countryCode,
    countryName,
    locationCode,
    acceptLanguage,
    timeZone,
  }), [acceptLanguage, countryCode, countryName, locationCode, timeZone]);
  const initialMarket = useMemo(() => resolveGeoMarket(
    mergeWithBrowserSignals(getBrowserGeoMarketSignals(), stableSignals),
  ), [stableSignals]);
  const [market, setMarket] = useState<GeoMarketCode>(initialMarket);

  useEffect(() => {
    let cancelled = false;

    const syncMarket = async () => {
      const browserSignals = getBrowserGeoMarketSignals();
      const fallbackSignals = mergeWithBrowserSignals(browserSignals, stableSignals);
      const hint = await fetchClientGeoHint();
      const nextMarket = resolveGeoMarketFromClientHint(hint, fallbackSignals);

      if (!cancelled) {
        setMarket(nextMarket);
      }
    };

    setMarket(initialMarket);
    void syncMarket();

    return () => {
      cancelled = true;
    };
  }, [initialMarket, stableSignals]);

  return market;
};

export const useUserGeoMarket = (
  user?: GeoMarketUserContext | null,
  overrides: GeoMarketSignals = {},
): GeoMarketCode => useGeoMarket({
  ...getGeoMarketSignalsFromUser(user),
  ...overrides,
});

/**
 * Market for the property catalogue (dashboard, Discover, Search). A postcode or PIN the
 * person typed wins, then the account's declared country, so a saved city, a stored
 * postcode or browser language never moves an India account into the UK catalogue.
 * Accounts without a country fall back to the usual signals.
 */
export const useCatalogueGeoMarket = (
  user: GeoMarketUserContext | null | undefined,
  overrides: GeoMarketSignals = {},
  typedLocationCode?: string | null,
): GeoMarketCode => {
  const pinned = getCataloguePinnedMarket(user, typedLocationCode);
  return useUserGeoMarket(pinned ? null : user, pinned ? { countryCode: pinned } : overrides);
};
