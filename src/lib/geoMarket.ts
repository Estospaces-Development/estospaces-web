import {
  getLaunchCountryFromLocationCode,
  getSupportedLaunchCountry,
  LAUNCH_COUNTRY_CODE,
  UK_COUNTRY_CODE,
  type SupportedLaunchCountryCode,
} from "@/lib/launchLocale";

export type GeoMarketCode = SupportedLaunchCountryCode;

export interface GeoMarketSignals {
  countryCode?: string | null;
  countryName?: string | null;
  locationCode?: string | null;
  acceptLanguage?: string | null;
  timeZone?: string | null;
}

export interface ClientGeoHint {
  countryCode?: string | null;
  appEngineCountry?: string | null;
  cloudflareCountry?: string | null;
  acceptLanguage?: string | null;
}

export interface GeoMarketUserContext {
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null;
  postcode?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

const INDIA_LANGUAGE_PATTERN = /\b(en-IN|hi-IN|ta-IN|te-IN|kn-IN|ml-IN|bn-IN|mr-IN|gu-IN|pa-IN)\b/i;
const UK_LANGUAGE_PATTERN = /\b(en-GB|cy-GB|gd-GB)\b/i;

const INDIA_TIMEZONE_PATTERN = /\bAsia\/Kolkata\b/i;
const UK_TIMEZONE_PATTERN = /\bEurope\/London\b/i;

const normalizeCountrySignal = (value?: string | null): string => (
  String(value || "").trim().replace(/[\s_-]+/g, "").toUpperCase()
);

export const normalizeGeoCountryCode = (value?: string | null): GeoMarketCode | null => {
  const normalized = normalizeCountrySignal(value);
  if (!normalized) {
    return null;
  }

  if (["IN", "IND", "INDIA", "BHARAT"].includes(normalized)) {
    return LAUNCH_COUNTRY_CODE;
  }

  if (["GB", "GBR", "UK", "UNITEDKINGDOM", "GREATBRITAIN", "ENGLAND", "SCOTLAND", "WALES", "NORTHERNIRELAND"].includes(normalized)) {
    return UK_COUNTRY_CODE;
  }

  return null;
};

export const resolveGeoMarket = ({
  countryCode,
  countryName,
  locationCode,
  acceptLanguage,
  timeZone,
}: GeoMarketSignals = {}): GeoMarketCode => {
  const countryFromLocationCode = getLaunchCountryFromLocationCode(locationCode);
  if (countryFromLocationCode) {
    return countryFromLocationCode;
  }

  const explicitCountry = getSupportedLaunchCountry(countryCode, countryName);
  if (explicitCountry) {
    return explicitCountry;
  }

  const normalizedCountryCode = normalizeGeoCountryCode(countryCode);
  if (normalizedCountryCode) {
    return normalizedCountryCode;
  }

  const normalizedCountryName = normalizeGeoCountryCode(countryName);
  if (normalizedCountryName) {
    return normalizedCountryName;
  }

  const language = String(acceptLanguage || "").trim();
  if (INDIA_LANGUAGE_PATTERN.test(language)) {
    return LAUNCH_COUNTRY_CODE;
  }
  if (UK_LANGUAGE_PATTERN.test(language)) {
    return UK_COUNTRY_CODE;
  }

  const zone = String(timeZone || "").trim();
  if (INDIA_TIMEZONE_PATTERN.test(zone)) {
    return LAUNCH_COUNTRY_CODE;
  }
  if (UK_TIMEZONE_PATTERN.test(zone)) {
    return UK_COUNTRY_CODE;
  }

  return LAUNCH_COUNTRY_CODE;
};

export const resolveGeoMarketFromClientHint = (
  hint: ClientGeoHint | null | undefined,
  fallback: GeoMarketSignals = {},
): GeoMarketCode => {
  const hasUserMarketSignal = Boolean(
    getLaunchCountryFromLocationCode(fallback.locationCode)
      || getSupportedLaunchCountry(fallback.countryCode, fallback.countryName)
      || normalizeGeoCountryCode(fallback.countryCode)
      || normalizeGeoCountryCode(fallback.countryName),
  );

  if (hasUserMarketSignal) {
    return resolveGeoMarket(fallback);
  }

  return resolveGeoMarket({
    ...fallback,
    countryCode: hint?.countryCode || hint?.appEngineCountry || hint?.cloudflareCountry || fallback.countryCode,
    acceptLanguage: hint?.acceptLanguage || fallback.acceptLanguage,
  });
};

export const getGeoMarketSignalsFromUser = (user?: GeoMarketUserContext | null): GeoMarketSignals => {
  const metadata = user?.user_metadata || {};
  const metadataCountryCode = typeof metadata.countryCode === "string"
    ? metadata.countryCode
    : typeof metadata.country_code === "string"
      ? metadata.country_code
      : null;
  const metadataCountry = typeof metadata.country === "string" ? metadata.country : null;
  const metadataPostcode = typeof metadata.postcode === "string" ? metadata.postcode : null;

  return {
    countryCode: user?.countryCode || user?.country_code || metadataCountryCode,
    countryName: user?.country || metadataCountry,
    locationCode: user?.postcode || metadataPostcode,
  };
};

export const getBrowserGeoMarketSignals = (): GeoMarketSignals => {
  if (typeof window === "undefined") {
    return {};
  }

  const navigatorLanguage = [
    navigator.language,
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
  ].filter(Boolean).join(",");

  return {
    acceptLanguage: navigatorLanguage,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

export const fetchClientGeoHint = async (): Promise<ClientGeoHint | null> => {
  if (typeof fetch !== "function") {
    return null;
  }

  try {
    const response = await fetch("/client-geo.json", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return {
      countryCode: typeof payload?.countryCode === "string" ? payload.countryCode : null,
      appEngineCountry: typeof payload?.appEngineCountry === "string" ? payload.appEngineCountry : null,
      cloudflareCountry: typeof payload?.cloudflareCountry === "string" ? payload.cloudflareCountry : null,
      acceptLanguage: typeof payload?.acceptLanguage === "string" ? payload.acceptLanguage : null,
    };
  } catch {
    return null;
  }
};
