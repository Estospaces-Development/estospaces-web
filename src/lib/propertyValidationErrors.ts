const INDIA_PIN_CODE_REGEX = /^[1-9]\d{5}$/;
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;

const PROPERTY_FIELD_ERROR_MAP: Record<string, string> = {
  price: "priceAmount",
  deposit_amount: "deposit",
  maintenance_charges: "maintenanceCharges",
  address_line_1: "addressLine1",
  postcode: "postalCode",
  latitude: "latitude",
  longitude: "longitude",
  property_size_sqft: "totalArea",
  carpet_area: "carpetArea",
  total_floors: "totalFloors",
  floor_number: "floorNumber",
  parking_spaces: "parkingSpaces",
  year_built: "yearBuilt",
  minimum_lease: "minimumLease",
  available_from: "availableFrom",
  image_urls: "images",
  agent_name: "contactName",
  agent_email: "contactEmail",
  agent_phone: "contactPhone",
  alternate_phone: "alternatePhone",
  preferred_contact_method: "preferredContactMethod",
  license_number: "licenseNumber",
  inclusions: "inclusions",
  exclusions: "exclusions",
};

export function isValidLocationCode(value: string): boolean {
  const compact = value.trim().replace(/\s+/g, "").toUpperCase();
  return INDIA_PIN_CODE_REGEX.test(compact) || UK_POSTCODE_REGEX.test(compact);
}

export function mapPropertyMutationFieldErrors(
  fieldErrors?: Record<string, string> | null,
): Record<string, string> {
  if (!fieldErrors) {
    return {};
  }

  return Object.entries(fieldErrors).reduce<Record<string, string>>(
    (mapped, [field, message]) => {
      const targetField = PROPERTY_FIELD_ERROR_MAP[field] || field;
      mapped[targetField] = message;
      return mapped;
    },
    {},
  );
}

/**
 * Screens without the listing form (for example the property detail page)
 * cannot highlight fields, so the reasons are spelled out in the message
 * instead of "Please review the highlighted fields."
 */
type PropertyMutationErrorLike =
  | { message?: unknown; fieldErrors?: Record<string, unknown> | null }
  | null
  | undefined;

/** The distinct, non-empty field reasons a failed property save returned. */
export function getPropertyMutationFieldReasons(error: PropertyMutationErrorLike): string[] {
  return [...new Set(
    Object.values(error?.fieldErrors ?? {})
      .filter((reason): reason is string => typeof reason === "string")
      .map((reason) => reason.trim())
      .filter(Boolean),
  )];
}

export function describePropertyMutationError(
  error: PropertyMutationErrorLike,
  fallback: string,
): string {
  const reasons = getPropertyMutationFieldReasons(error);
  if (reasons.length > 0) {
    return reasons.map((reason) => (/[.!?]$/.test(reason) ? reason : `${reason}.`)).join(" ");
  }
  return (typeof error?.message === "string" && error.message.trim()) || fallback;
}
