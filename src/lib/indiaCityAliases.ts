// Official city names first, then former or common spellings managers still
// use. Keep in step with indiaCityAliasGroups in core-service
// internal/properties/address_verification.go, which enforces the same rule.
const INDIA_CITY_ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["bengaluru", "bangalore"],
  ["mumbai", "bombay"],
  ["chennai", "madras"],
  ["kolkata", "calcutta"],
  ["gurugram", "gurgaon"],
  ["mysuru", "mysore"],
  ["mangaluru", "mangalore"],
  ["belagavi", "belgaum"],
  ["pune", "poona"],
  ["kochi", "cochin"],
  ["thiruvananthapuram", "trivandrum"],
  ["puducherry", "pondicherry"],
  ["vadodara", "baroda"],
  ["prayagraj", "allahabad"],
  ["varanasi", "benares", "banaras"],
  ["visakhapatnam", "vizag"],
];

const CANONICAL_INDIA_CITY_NAMES = new Map(
  INDIA_CITY_ALIAS_GROUPS.flatMap((group) => group.map((name) => [name, group[0]] as const)),
);

const TRAILING_QUALIFIER = /\s+(urban|rural|suburban|city|district)$/;

/**
 * Reduces an Indian city or India Post district label to one comparable name:
 * "Bengaluru Urban", "Bangalore" and "Bengaluru" all become "bengaluru".
 */
export const canonicalIndiaCityName = (value: string): string => {
  let normalized = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^(city|district)\s+of\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  while (TRAILING_QUALIFIER.test(normalized)) {
    normalized = normalized.replace(TRAILING_QUALIFIER, "");
  }
  // Delhi's districts ("New Delhi", "South West Delhi") all belong to Delhi.
  if (normalized === "delhi" || normalized.endsWith(" delhi")) {
    return "delhi";
  }
  return CANONICAL_INDIA_CITY_NAMES.get(normalized) ?? normalized;
};

export const indiaCityNamesMatch = (expected: string, resolved: string): boolean => {
  const canonicalExpected = canonicalIndiaCityName(expected);
  return canonicalExpected !== "" && canonicalExpected === canonicalIndiaCityName(resolved);
};
