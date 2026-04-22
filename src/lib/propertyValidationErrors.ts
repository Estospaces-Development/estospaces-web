const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

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

export function isValidUkPostcode(value: string): boolean {
  return UK_POSTCODE_REGEX.test(value.trim());
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
