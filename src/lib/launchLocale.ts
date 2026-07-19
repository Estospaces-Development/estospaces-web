export const LAUNCH_COUNTRY_CODE = "IN";
export const LAUNCH_COUNTRY_NAME = "India";
export const LAUNCH_CURRENCY_CODE = "INR";
export const LAUNCH_CURRENCY_SYMBOL = "\u20b9";
export const LAUNCH_LOCALE = "en-IN";
export const LAUNCH_DEFAULT_CITY = "Chennai";
export const UK_COUNTRY_CODE = "GB";
export const UK_COUNTRY_NAME = "United Kingdom";
const LAUNCH_CITY_BY_PIN_CODE: Record<string, string> = {
  "600001": LAUNCH_DEFAULT_CITY,
  "641001": "Coimbatore",
  "625001": "Madurai",
  "560001": "Bengaluru",
  "570001": "Mysuru",
  "575001": "Mangaluru",
  "500001": "Hyderabad",
  "506002": "Warangal",
  "400001": "Mumbai",
  "411001": "Pune",
  "440001": "Nagpur",
  "110001": "New Delhi",
  "110075": "Dwarka",
  "682001": "Kochi",
  "695001": "Thiruvananthapuram",
};

export function formatLaunchCurrency(
  amount: number | null | undefined,
  options: { monthly?: boolean; showCode?: boolean; currencyCode?: string } = {},
): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }

  const currency = String(options.currencyCode || "").trim().toUpperCase();
  const locale = currency === "GBP" ? "en-GB" : LAUNCH_LOCALE;
  const symbol = currency === "GBP" ? "£" : LAUNCH_CURRENCY_SYMBOL;
  const code = currency || LAUNCH_CURRENCY_CODE;

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);
  const suffix = options.monthly ? "/mo" : "";
  const codeSuffix = options.showCode ? ` ${code}` : "";
  return `${symbol}${formatted}${codeSuffix}${suffix}`;
}

export function formatLaunchCurrencyForCountry(
  amount: number | null | undefined,
  options: {
    countryCode?: string | null;
    countryName?: string | null;
    currencyCode?: string | null;
    monthly?: boolean;
    showCode?: boolean;
  } = {},
): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }

  const country = getSupportedLaunchCountry(options.countryCode, options.countryName);
  const requestedCurrency = String(options.currencyCode || "").trim().toUpperCase();
  const currency = requestedCurrency || (country === UK_COUNTRY_CODE ? "GBP" : LAUNCH_CURRENCY_CODE);
  const locale = currency === "GBP" ? "en-GB" : LAUNCH_LOCALE;
  const suffix = options.monthly ? "/mo" : "";
  const code = options.showCode ? ` ${currency}` : "";

  try {
    return `${new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount)}${code}${suffix}`;
  } catch {
    return formatLaunchCurrency(amount, {
      monthly: options.monthly,
      showCode: options.showCode,
      currencyCode: options.currencyCode || undefined,
    });
  }
}

export function normalizeLaunchCurrencyText(value: string): string {
  return value.replace(/\u00c2?\u00a3/g, "\u00a3");
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

export function getLaunchCityFromPinCode(
  value?: string | null,
  countryCode?: string | null,
  countryName?: string | null,
): string | null {
  const normalized = normalizeLaunchPinCode(value);
  if (!isValidLaunchPinCode(normalized)) {
    return null;
  }

  const country = getSupportedLaunchCountry(countryCode, countryName, normalized);
  if (country !== LAUNCH_COUNTRY_CODE) {
    return null;
  }

  return LAUNCH_CITY_BY_PIN_CODE[normalized] || null;
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

export function formatLaunchLocationCodeSentenceLabel(label: string): string {
  return label === "PIN code" ? label : label.toLowerCase();
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
  locationCode?: string | null,
): string {
  const country = getSupportedLaunchCountry(countryCode, countryName, locationCode);
  if (country === UK_COUNTRY_CODE) {
    return "Please enter a valid UK postcode";
  }
  if (country === LAUNCH_COUNTRY_CODE) {
    return "Please enter a valid 6-digit Indian PIN code";
  }
  return "Please enter a valid PIN code or postcode";
}

export function normalizeLaunchLocationCodeErrorMessage(
  message?: string | null,
  locationCode?: string | null,
): string {
  const fallback = "Please enter a valid PIN code or postcode";
  const rawMessage = String(message || "").trim();
  if (!rawMessage) {
    return fallback;
  }

  if (!/(location_postcode|postcode|pin code)/i.test(rawMessage)) {
    return rawMessage;
  }

  const country = getLaunchCountryFromLocationCode(locationCode);
  if (country === LAUNCH_COUNTRY_CODE) {
    return "Please enter a valid 6-digit Indian PIN code";
  }
  if (country === UK_COUNTRY_CODE) {
    return "Please enter a valid UK postcode";
  }
  return fallback;
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

const LAUNCH_PIN_PREFIX_STATE_CODE: Record<string, string> = {
  "600": "TN", "641": "TN", "625": "TN",
  "560": "KA", "570": "KA", "575": "KA",
  "500": "TS", "506": "TS",
  "400": "MH", "411": "MH", "440": "MH",
  "110": "DL",
  "682": "KL", "695": "KL",
};

export function getLaunchStateCodeFromPinPrefix(pinCode?: string | null): string | null {
  const normalized = normalizeLaunchPinCode(pinCode);
  if (!isValidLaunchPinCode(normalized)) return null;
  const prefix = normalized.slice(0, 3);
  return LAUNCH_PIN_PREFIX_STATE_CODE[prefix] || null;
}

export function getLaunchCityFromPin(pinCode?: string | null): string | null {
  const normalized = normalizeLaunchPinCode(pinCode);
  if (!isValidLaunchPinCode(normalized)) return null;
  return LAUNCH_CITY_BY_PIN_CODE[normalized] || null;
}
