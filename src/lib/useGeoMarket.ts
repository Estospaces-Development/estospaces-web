import { useEffect, useMemo, useState } from "react";

import {
  fetchClientGeoHint,
  getBrowserGeoMarketSignals,
  getGeoMarketSignalsFromUser,
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
  const initialMarket = useMemo(() => resolveGeoMarket({
    ...getBrowserGeoMarketSignals(),
    ...stableSignals,
  }), [stableSignals]);
  const [market, setMarket] = useState<GeoMarketCode>(initialMarket);

  useEffect(() => {
    let cancelled = false;

    const syncMarket = async () => {
      const browserSignals = getBrowserGeoMarketSignals();
      const fallbackSignals = {
        ...browserSignals,
        ...stableSignals,
      };
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
