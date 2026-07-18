import { LAUNCH_COUNTRY_NAME, UK_COUNTRY_NAME } from "@/lib/launchLocale";

// Curated, representative pincode/postcode -> area name pairs (not a full national postal
// directory) used by the manager "Dispatch service areas" picker. Codes here must stay in sync
// with the backend catalog at estospaces-core-service/internal/leads/service_area_catalog.go.
export interface ServiceAreaOption {
  code: string;
  area: string;
}

export const INDIA_SERVICE_AREAS: ServiceAreaOption[] = [
  { code: "600001", area: "Chennai" },
  { code: "641001", area: "Coimbatore" },
  { code: "625001", area: "Madurai" },
  { code: "560001", area: "Bengaluru" },
  { code: "570001", area: "Mysuru" },
  { code: "575001", area: "Mangaluru" },
  { code: "500001", area: "Hyderabad" },
  { code: "506002", area: "Warangal" },
  { code: "400001", area: "Mumbai" },
  { code: "411001", area: "Pune" },
  { code: "440001", area: "Nagpur" },
  { code: "110001", area: "New Delhi" },
  { code: "110075", area: "Dwarka, New Delhi" },
  { code: "682001", area: "Kochi" },
  { code: "695001", area: "Thiruvananthapuram" },
];

export const UK_SERVICE_AREAS: ServiceAreaOption[] = [
  { code: "SW1A1AA", area: "Westminster, London" },
  { code: "EC1A1BB", area: "City of London" },
  { code: "M11AE", area: "Manchester City Centre" },
  { code: "B11AA", area: "Birmingham City Centre" },
  { code: "LS11AA", area: "Leeds City Centre" },
  { code: "L18JQ", area: "Liverpool City Centre" },
  { code: "G11AA", area: "Glasgow City Centre" },
  { code: "EH11AA", area: "Edinburgh City Centre" },
  { code: "CF101AA", area: "Cardiff City Centre" },
  { code: "BT11AA", area: "Belfast City Centre" },
  { code: "BS11AA", area: "Bristol City Centre" },
  { code: "NE11AA", area: "Newcastle City Centre" },
  { code: "S11AA", area: "Sheffield City Centre" },
  { code: "OX11AA", area: "Oxford City Centre" },
  { code: "CB11AA", area: "Cambridge City Centre" },
];

export function getServiceAreasForCountry(countryName?: string | null): ServiceAreaOption[] {
  if (countryName === UK_COUNTRY_NAME) {
    return UK_SERVICE_AREAS;
  }
  if (countryName === LAUNCH_COUNTRY_NAME) {
    return INDIA_SERVICE_AREAS;
  }
  return [];
}

export function normalizeServiceAreaCode(value?: string | null): string {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function findServiceAreaLabel(code: string, countryName?: string | null): string | null {
  const normalized = normalizeServiceAreaCode(code);
  const match = getServiceAreasForCountry(countryName).find(
    (option) => option.code === normalized,
  );
  return match?.area ?? null;
}
