export const LAUNCH_COUNTRY_CODE = "IN";
export const LAUNCH_COUNTRY_NAME = "India";
export const LAUNCH_CURRENCY_CODE = "INR";
export const LAUNCH_CURRENCY_SYMBOL = "\u20b9";
export const LAUNCH_LOCALE = "en-IN";
export const LAUNCH_DEFAULT_CITY = "Chennai";
export const UK_COUNTRY_CODE = "GB";
export const UK_COUNTRY_NAME = "United Kingdom";

const LEGACY_UK_POSTCODE_PATTERN = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi;
const LEGACY_UK_LOCATION_PATTERN =
  /\b(London|Westminster|Edinburgh|Preston|Manchester|Birmingham|Leeds|Liverpool|Oxford|Cambridge|Bristol|Belfast|Glasgow|Cardiff|England|Scotland|Wales|Northern Ireland|United Kingdom|UK)\b/gi;
const LEGACY_POUND_PATTERN = /\u00c2\u00a3|\u00a3/g;

export function formatLaunchCurrency(
  amount: number | null | undefined,
  options: { monthly?: boolean; showCode?: boolean } = {},
): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }

  const formatted = new Intl.NumberFormat(LAUNCH_LOCALE, {
    maximumFractionDigits: 0,
  }).format(amount);
  const suffix = options.monthly ? "/mo" : "";
  const code = options.showCode ? ` ${LAUNCH_CURRENCY_CODE}` : "";
  return `${LAUNCH_CURRENCY_SYMBOL}${formatted}${code}${suffix}`;
}

export function normalizeLaunchCurrencyText(value: string): string {
  return value
    .replace(/\bGBP\b/g, LAUNCH_CURRENCY_CODE)
    .replace(LEGACY_POUND_PATTERN, LAUNCH_CURRENCY_SYMBOL);
}

export function formatLaunchPropertyLocation(
  value: string | Array<string | null | undefined> | null | undefined,
): string {
  const raw = Array.isArray(value)
    ? value.filter(Boolean).join(", ")
    : String(value || "").trim();

  if (!raw) {
    return LAUNCH_COUNTRY_NAME;
  }

  const sanitized = raw
    .replace(LEGACY_UK_POSTCODE_PATTERN, "")
    .replace(LEGACY_UK_LOCATION_PATTERN, LAUNCH_DEFAULT_CITY)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, parts) => part.toLowerCase() !== parts[index - 1]?.toLowerCase())
    .join(", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return sanitized || LAUNCH_COUNTRY_NAME;
}

export function formatLaunchPropertyText(value: string | null | undefined, fallback = "Property"): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  const sanitized = raw
    .replace(LEGACY_UK_POSTCODE_PATTERN, "")
    .replace(LEGACY_UK_LOCATION_PATTERN, LAUNCH_DEFAULT_CITY)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  return sanitized || fallback;
}

export function normalizeLaunchPinCode(value?: string | null): string {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function isValidLaunchPinCode(value?: string | null): boolean {
  return /^\d{6}$/.test(normalizeLaunchPinCode(value));
}

export function formatLaunchPinCode(value?: string | null): string {
  const normalized = normalizeLaunchPinCode(value);
  return isValidLaunchPinCode(normalized) ? normalized : "";
}

const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;
export type SupportedLaunchCountryCode = typeof LAUNCH_COUNTRY_CODE | typeof UK_COUNTRY_CODE;

function normalizeCountryCode(value?: string | null): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeCountryName(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

export function isLaunchIndiaCountry(countryCode?: string | null, countryName?: string | null): boolean {
  const code = normalizeCountryCode(countryCode);
  const name = normalizeCountryName(countryName);
  return code === LAUNCH_COUNTRY_CODE ||
    name === LAUNCH_COUNTRY_NAME.toLowerCase() ||
    name === "bharat";
}

export function isLaunchUKCountry(countryCode?: string | null, countryName?: string | null): boolean {
  const code = normalizeCountryCode(countryCode);
  const name = normalizeCountryName(countryName);
  return code === UK_COUNTRY_CODE ||
    code === "UK" ||
    code === "GBR" ||
    name === "uk" ||
    name === UK_COUNTRY_NAME.toLowerCase() ||
    name === "great britain" ||
    name === "england" ||
    name === "scotland" ||
    name === "wales" ||
    name === "northern ireland";
}


export function normalizeLaunchLocationCode(value?: string | null): string {
  const compact = String(value || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!compact) {
    return "";
  }
  if (/^\d+$/.test(compact)) {
    return compact.replace(/\D/g, "").slice(0, 6);
  }
  return compact.replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function isValidLaunchLocationCode(value?: string | null): boolean {
  const normalized = normalizeLaunchLocationCode(value);
  return isValidLaunchPinCode(normalized) || UK_POSTCODE_PATTERN.test(normalized);
}

export function getLaunchCountryFromLocationCode(value?: string | null): SupportedLaunchCountryCode | null {
  const normalized = normalizeLaunchLocationCode(value);
  if (isValidLaunchPinCode(normalized)) {
    return LAUNCH_COUNTRY_CODE;
  }
  if (UK_POSTCODE_PATTERN.test(normalized)) {
    return UK_COUNTRY_CODE;
  }
  return null;
}

export function getSupportedLaunchCountry(
  countryCode?: string | null,
  countryName?: string | null,
  locationCode?: string | null,
): SupportedLaunchCountryCode | null {
  if (isLaunchUKCountry(countryCode, countryName)) {
    return UK_COUNTRY_CODE;
  }
  if (isLaunchIndiaCountry(countryCode, countryName)) {
    return LAUNCH_COUNTRY_CODE;
  }
  return getLaunchCountryFromLocationCode(locationCode);
}

export function getLaunchLocationCodeLabel(
  countryCode?: string | null,
  countryName?: string | null,
  locationCode?: string | null,
): string {
  const country = getSupportedLaunchCountry(countryCode, countryName, locationCode);
  if (country === UK_COUNTRY_CODE) {
    return "Postcode";
  }
  if (country === LAUNCH_COUNTRY_CODE) {
    return "PIN code";
  }
  return "PIN code / postcode";
}

export function getLaunchLocationCodePlaceholder(
  countryCode?: string | null,
  countryName?: string | null,
  locationCode?: string | null,
): string {
  const country = getSupportedLaunchCountry(countryCode, countryName, locationCode);
  if (country === UK_COUNTRY_CODE) {
    return "e.g. SW1A 1AA";
  }
  if (country === LAUNCH_COUNTRY_CODE) {
    return "e.g. 600001";
  }
  return "e.g. 600001 or SW1A 1AA";
}

export function isValidLaunchLocationCodeForCountry(
  value?: string | null,
  countryCode?: string | null,
  countryName?: string | null,
): boolean {
  const country = getSupportedLaunchCountry(countryCode, countryName, value);
  if (country === UK_COUNTRY_CODE) {
    return UK_POSTCODE_PATTERN.test(normalizeLaunchLocationCode(value));
  }
  if (country === LAUNCH_COUNTRY_CODE) {
    return isValidLaunchPinCode(value);
  }
  return isValidLaunchLocationCode(value);
}

export function getLaunchLocationCodeErrorMessage(
  countryCode?: string | null,
  countryName?: string | null,
): string {
  const country = getSupportedLaunchCountry(countryCode, countryName);
  if (country === UK_COUNTRY_CODE) {
    return "Please enter a valid UK postcode";
  }
  if (country === LAUNCH_COUNTRY_CODE) {
    return "Please enter a valid 6-digit Indian PIN code";
  }
  return "Please enter a valid Indian PIN code or UK postcode";
}

export function formatLaunchLocationCode(value?: string | null): string {
  const normalized = normalizeLaunchLocationCode(value);
  if (isValidLaunchPinCode(normalized)) {
    return normalized;
  }
  if (UK_POSTCODE_PATTERN.test(normalized)) {
    return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`;
  }
  return "";
}
