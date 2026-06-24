export const LAUNCH_COUNTRY_CODE = "IN";
export const LAUNCH_COUNTRY_NAME = "India";
export const LAUNCH_CURRENCY_CODE = "INR";
export const LAUNCH_CURRENCY_SYMBOL = "\u20b9";
export const LAUNCH_LOCALE = "en-IN";
export const LAUNCH_DEFAULT_CITY = "Chennai";

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
