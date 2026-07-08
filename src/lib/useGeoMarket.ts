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
  const initialMarket = useMemo(() => resolveGeoMarket({
    ...getBrowserGeoMarketSignals(),
    ...signals,
  }), [signals.countryCode, signals.countryName, signals.locationCode]);
  const [market, setMarket] = useState<GeoMarketCode>(initialMarket);

  useEffect(() => {
    let cancelled = false;

    const syncMarket = async () => {
      const browserSignals = getBrowserGeoMarketSignals();
      const fallbackSignals = {
        ...browserSignals,
        ...signals,
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
  }, [initialMarket, signals.countryCode, signals.countryName, signals.locationCode]);

  return market;
};

export const useUserGeoMarket = (
  user?: GeoMarketUserContext | null,
  overrides: GeoMarketSignals = {},
): GeoMarketCode => useGeoMarket({
  ...getGeoMarketSignalsFromUser(user),
  ...overrides,
});
