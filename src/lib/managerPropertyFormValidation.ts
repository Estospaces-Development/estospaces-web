import type { ListingType, PropertyType } from "@/contexts/PropertyContext";
import {
  getLaunchLocationCodeErrorMessage,
  getLaunchLocationCodeLabel,
  getLaunchStateCodeFromPinPrefix,
  getSupportedLaunchCountry,
  isLaunchIndiaCountry,
  isLaunchUKCountry,
  isValidLaunchLocationCodeForCountry,
  LAUNCH_COUNTRY_NAME,
} from "@/lib/launchLocale";
import { areCoordinatesInsideLaunchMarket } from "@/lib/mapCoordinates";

export const PROPERTY_NUMERIC_LIMITS = {
  moneyMax: 9999999999.99,
  areaMax: 99999999.99,
  moneyScale: 2,
  areaScale: 2,
  coordinateScale: 8,
  yearBuiltMin: 1800,
} as const;
export const PROPERTY_DESCRIPTION_MAX_LENGTH = 1000;

const STEP_FIELDS: Record<number, string[]> = {
  1: ["title", "priceAmount"],
  2: [
    "addressLine1",
    "country",
    "state",
    "city",
    "postalCode",
    "latitude",
    "longitude",
  ],
  3: [
    "totalArea",
    "carpetArea",
    "bedrooms",
    "bathrooms",
    "balconies",
    "parkingSpaces",
    "floorNumber",
    "totalFloors",
    "yearBuilt",
    "facing",
    "description",
  ],
  4: ["images"],
  5: [
    "contactName",
    "contactEmail",
    "contactPhone",
    "alternatePhone",
    "availableFrom",
    "minimumLease",
    "deposit",
    "maintenanceCharges",
  ],
};

const FIELD_STEP_MAP = Object.entries(STEP_FIELDS).reduce<
  Record<string, number>
>(
  (fieldStepMap, [step, fields]) => {
    fields.forEach((field) => {
      fieldStepMap[field] = Number(step);
    });
    return fieldStepMap;
  },
  {
    inclusions: 5,
    exclusions: 5,
    licenseNumber: 5,
    preferredContactMethod: 5,
  },
);

export interface ManagerPropertyValidationValues {
  title: string;
  priceAmount: number;
  addressLine1: string;
  country: string;
  countryId: string;
  countryCode: string;
  state: string;
  stateId: string;
  stateCode: string;
  city: string;
  cityId: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  totalArea: number | undefined;
  carpetArea: number | undefined;
  bedrooms: number | undefined;
  bathrooms: number | undefined;
  balconies: number | undefined;
  parkingSpaces: number | undefined;
  floorNumber: number | undefined;
  totalFloors: number | undefined;
  yearBuilt: number;
  facing?: string;
  description: string;
  hasImages: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  alternatePhone: string;
  availableFrom: string;
  listingType: ListingType;
  /** Missing means residential, the create-form default. */
  propertyType?: PropertyType;
  minimumLease: number;
  deposit: number;
  maintenanceCharges: number;
}

export type ManagerPropertyTypeCategory =
  | "residential"
  | "non_residential"
  | "land";

const NON_RESIDENTIAL_PROPERTY_TYPES: ReadonlySet<string> = new Set([
  "commercial",
  "industrial",
  "office",
]);

// Fields that do not describe the category at all. They are hidden, never
// validated and not sent as room metadata.
const NOT_APPLICABLE_FIELDS: Record<ManagerPropertyTypeCategory, ReadonlySet<string>> = {
  residential: new Set(),
  non_residential: new Set(),
  land: new Set([
    "bedrooms",
    "bathrooms",
    "balconies",
    "parkingSpaces",
    "floorNumber",
    "totalFloors",
  ]),
};

// Fields that are shown and validated when entered, but not required.
const OPTIONAL_FIELDS: Record<ManagerPropertyTypeCategory, ReadonlySet<string>> = {
  residential: new Set(),
  non_residential: new Set(["bedrooms", "bathrooms", "balconies"]),
  land: new Set(),
};

const PROPERTY_TYPE_DEPENDENT_FIELDS = [
  "bedrooms",
  "bathrooms",
  "balconies",
  "parkingSpaces",
  "floorNumber",
  "totalFloors",
];

export function getManagerPropertyTypeCategory(
  propertyType: PropertyType | string | undefined,
): ManagerPropertyTypeCategory {
  const normalized = (propertyType ?? "").trim().toLowerCase();
  if (normalized === "land") {
    return "land";
  }
  return NON_RESIDENTIAL_PROPERTY_TYPES.has(normalized)
    ? "non_residential"
    : "residential";
}

export function isManagerPropertyFieldApplicable(
  field: string,
  propertyType: PropertyType | string | undefined,
): boolean {
  return !NOT_APPLICABLE_FIELDS[getManagerPropertyTypeCategory(propertyType)].has(field);
}

export function isManagerPropertyFieldRequired(
  field: string,
  propertyType: PropertyType | string | undefined,
): boolean {
  const category = getManagerPropertyTypeCategory(propertyType);
  return !NOT_APPLICABLE_FIELDS[category].has(field) && !OPTIONAL_FIELDS[category].has(field);
}

export interface ManagerPropertyRoomValues {
  bedrooms: number | undefined;
  bathrooms: number | undefined;
  balconies: number | undefined;
  parkingSpaces: number | undefined;
  floorNumber: number | undefined;
  totalFloors: number | undefined;
}

/**
 * Room values to save for a property type. The form keeps residential values
 * across a type switch so switching back restores them, but a Land listing
 * saves no room counts (0) and omits floors, because core rejects
 * total_floors 0 on update and keeps an omitted value.
 */
export function getManagerPropertyRoomPayload(
  propertyType: PropertyType | string | undefined,
  values: ManagerPropertyRoomValues,
): ManagerPropertyRoomValues {
  const applies = (field: string) => isManagerPropertyFieldApplicable(field, propertyType);
  return {
    bedrooms: applies("bedrooms") ? values.bedrooms : 0,
    bathrooms: applies("bathrooms") ? values.bathrooms : 0,
    balconies: applies("balconies") ? values.balconies : 0,
    parkingSpaces: applies("parkingSpaces") ? values.parkingSpaces : 0,
    floorNumber: applies("floorNumber") ? values.floorNumber : undefined,
    totalFloors: applies("totalFloors") ? values.totalFloors : undefined,
  };
}

export function getManagerPropertyFirstErrorStep(
  errorFields: Record<string, string>,
): number {
  const steps = Object.keys(errorFields)
    .map((field) => FIELD_STEP_MAP[field])
    .filter((step): step is number => Number.isFinite(step));

  return steps.length > 0 ? Math.min(...steps) : 1;
}

export function validateManagerPropertyField(
  field: string,
  values: ManagerPropertyValidationValues,
): string | null {
  if (!isManagerPropertyFieldApplicable(field, values.propertyType)) {
    return null;
  }
  switch (field) {
    case "title":
      return values.title.trim() ? null : "Property title is required";
    case "priceAmount":
      return validateScaledPositiveDecimal(
        values.priceAmount,
        "Price",
        PROPERTY_NUMERIC_LIMITS.moneyMax,
        PROPERTY_NUMERIC_LIMITS.moneyScale,
        true,
      );
    case "addressLine1":
      return values.addressLine1.trim() ? null : "Street address is required";
    case "country":
      if (!values.countryId && !values.country.trim() && !values.countryCode.trim()) {
        return "Country is required";
      }
      return isSupportedPropertyCountry(values.countryCode, values.country)
        ? null
        : `${LAUNCH_COUNTRY_NAME} and UK listings are supported for this launch`;
    case "state":
      return values.stateId || values.state.trim()
        ? null
        : "State/Province is required";
    case "city":
      return values.cityId || values.city.trim() ? null : "City is required";
    case "postalCode":
      if (!values.postalCode.trim()) {
        return postalCodeRequiredMessageForCountry(values.countryCode, values.country);
      }
      if (!isValidPostalCodeForCountry(values.postalCode, values.countryCode, values.country)) {
        return postalCodeMessageForCountry(values.countryCode, values.country);
      }
      const pinStateCode = getLaunchStateCodeFromPinPrefix(values.postalCode);
      if (pinStateCode && values.stateCode && values.stateCode.toUpperCase() !== pinStateCode) {
        return "PIN code does not match the selected state";
      }
      // PIN locality hints are not authoritative city boundaries or alias lists.
      return null;
    case "latitude": {
      const coordinateError = validateCoordinate(values.latitude, -90, 90, "Latitude");
      return coordinateError || validateCoordinateMarket(values);
    }
    case "longitude": {
      const coordinateError = validateCoordinate(values.longitude, -180, 180, "Longitude");
      return coordinateError || validateCoordinateMarket(values);
    }
    case "totalArea":
      return validateScaledPositiveDecimal(
        values.totalArea,
        "Total area",
        PROPERTY_NUMERIC_LIMITS.areaMax,
        PROPERTY_NUMERIC_LIMITS.areaScale,
        true,
      );
    case "carpetArea": {
      const carpetArea = values.carpetArea ?? 0;
      if (carpetArea < 0) {
        return "Carpet area cannot be negative";
      }
      if (carpetArea === 0) {
        return null;
      }
      const totalArea = values.totalArea ?? 0;
      if (carpetArea > totalArea && totalArea > 0) {
        return "Carpet area cannot exceed total area";
      }
      return null;
    }
    case "bedrooms":
      return validateWholeNumber(values.bedrooms, "Bedrooms", isManagerPropertyFieldRequired("bedrooms", values.propertyType));
    case "bathrooms":
      return validateWholeNumber(values.bathrooms, "Bathrooms", isManagerPropertyFieldRequired("bathrooms", values.propertyType));
    case "balconies":
      return validateWholeNumber(values.balconies, "Balconies", isManagerPropertyFieldRequired("balconies", values.propertyType));
    case "parkingSpaces":
      return validateWholeNumber(values.parkingSpaces, "Parking spaces", isManagerPropertyFieldRequired("parkingSpaces", values.propertyType));
    case "floorNumber": {
      const floorNumber = values.floorNumber ?? 0;
      const totalFloors = values.totalFloors ?? 0;
      if (!Number.isInteger(floorNumber) || floorNumber < 0) {
        return "Floor number must be a whole number";
      }
      if (totalFloors > 0 && floorNumber > totalFloors) {
        return "Floor number cannot exceed total floors";
      }
      return null;
    }
    case "totalFloors": {
      const totalFloors = values.totalFloors ?? 0;
      const floorNumber = values.floorNumber ?? 0;
      if (!Number.isInteger(totalFloors) || totalFloors < 1) {
        return "Total floors must be at least 1";
      }
      if (floorNumber > totalFloors) {
        return "Total floors must be greater than or equal to floor number";
      }
      return null;
    }
    case "yearBuilt":
      if (!values.yearBuilt) {
        return null;
      }
      if (!Number.isInteger(values.yearBuilt)) {
        return "Year built must be a whole number";
      }
      if (
        values.yearBuilt < PROPERTY_NUMERIC_LIMITS.yearBuiltMin ||
        values.yearBuilt > new Date().getFullYear()
      ) {
        return `Year built must be between ${PROPERTY_NUMERIC_LIMITS.yearBuiltMin} and the current year`;
      }
      return null;
    case "description":
      return values.description.length <= PROPERTY_DESCRIPTION_MAX_LENGTH
        ? null
        : `Full description must be ${PROPERTY_DESCRIPTION_MAX_LENGTH} characters or fewer`;
    case "images":
      return values.hasImages ? null : "At least one image is required";
    case "contactName":
      return values.contactName.trim() ? null : "Contact name is required";
    case "contactEmail":
      if (!values.contactEmail.trim()) {
        return "Email is required";
      }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)
        ? null
        : "Please enter a valid email address";
    case "contactPhone":
      if (!values.contactPhone.trim()) {
        return "Phone number is required";
      }
      return hasValidPhoneNumber(values.contactPhone)
        ? null
        : "Please enter a valid phone number";
    case "alternatePhone":
      return !values.alternatePhone.trim() ||
        hasValidPhoneNumber(values.alternatePhone)
        ? null
        : "Please enter a valid alternate phone number";
    case "availableFrom":
      return validateAvailableFrom(values.availableFrom);
    case "minimumLease":
      if (!requiresMinimumLease(values.listingType)) {
        return null;
      }
      if (!Number.isInteger(values.minimumLease) || values.minimumLease < 1) {
        return "Minimum lease must be at least 1 month";
      }
      return null;
    case "deposit":
      if (values.deposit < 0) {
        return "Security deposit cannot be negative";
      }
      if (values.deposit === 0) {
        return null;
      }
      return validateScaledPositiveDecimal(
        values.deposit,
        "Security deposit",
        PROPERTY_NUMERIC_LIMITS.moneyMax,
        PROPERTY_NUMERIC_LIMITS.moneyScale,
        false,
      );
    case "maintenanceCharges":
      if (values.maintenanceCharges < 0) {
        return "Maintenance charges cannot be negative";
      }
      if (values.maintenanceCharges === 0) {
        return null;
      }
      return validateScaledPositiveDecimal(
        values.maintenanceCharges,
        "Maintenance charges",
        PROPERTY_NUMERIC_LIMITS.moneyMax,
        PROPERTY_NUMERIC_LIMITS.moneyScale,
        false,
      );
    default:
      return null;
  }
}

export function validateManagerPropertyStep(
  step: number,
  values: ManagerPropertyValidationValues,
): Record<string, string> {
  return validateFields(STEP_FIELDS[step] ?? [], values);
}

export function validateManagerPropertyForm(
  values: ManagerPropertyValidationValues,
): Record<string, string> {
  return validateFields(Object.values(STEP_FIELDS).flat(), values);
}

// Value keys each validated field reads. A field is re-validated on edit when
// any of them changes, so cross-field rules (carpet vs total area, PIN vs
// state, pin inside the selected country) still apply to the edited side.
const FIELD_DEPENDENCIES: Record<string, (keyof ManagerPropertyValidationValues)[]> = {
  country: ["country", "countryId", "countryCode"],
  state: ["state", "stateId", "stateCode"],
  city: ["city", "cityId"],
  postalCode: ["postalCode", "countryCode", "country", "stateCode"],
  latitude: ["latitude", "longitude", "countryCode", "country"],
  longitude: ["latitude", "longitude", "countryCode", "country"],
  carpetArea: ["carpetArea", "totalArea"],
  floorNumber: ["floorNumber", "totalFloors", "propertyType"],
  totalFloors: ["floorNumber", "totalFloors", "propertyType"],
  images: ["hasImages"],
  minimumLease: ["minimumLease", "listingType"],
};

function getFieldDependencies(field: string): (keyof ManagerPropertyValidationValues)[] {
  const dependencies = FIELD_DEPENDENCIES[field] ?? [field as keyof ManagerPropertyValidationValues];
  return PROPERTY_TYPE_DEPENDENT_FIELDS.includes(field) && !dependencies.includes("propertyType")
    ? [...dependencies, "propertyType"]
    : dependencies;
}

/**
 * Lists the validated fields whose inputs differ from the saved listing.
 */
export function getManagerPropertyChangedFields(
  baseline: ManagerPropertyValidationValues,
  current: ManagerPropertyValidationValues,
): string[] {
  return Object.values(STEP_FIELDS)
    .flat()
    .filter((field) =>
      getFieldDependencies(field).some(
        (key) => !Object.is(normalizeComparable(baseline[key]), normalizeComparable(current[key])),
      ),
    );
}

export interface ManagerPropertySaveValidationOptions {
  /**
   * The listing as loaded for editing. Omit for a new listing.
   */
  baseline?: ManagerPropertyValidationValues | null;
  /**
   * True when the save moves the listing into review (create, draft or
   * rejected submission). Every current requirement then applies.
   */
  requiresCompleteListing: boolean;
}

/**
 * Validates a property save. New listings and submissions for review must meet
 * every current requirement. Saving an existing listing without changing its
 * status only validates what the manager changed, so a listing saved before a
 * newer requirement (map pin, State) is not blocked by a field nobody touched.
 * Core applies the same rule to updates.
 */
export function validateManagerPropertySave(
  values: ManagerPropertyValidationValues,
  options: ManagerPropertySaveValidationOptions,
): Record<string, string> {
  if (options.requiresCompleteListing || !options.baseline) {
    return validateManagerPropertyForm(values);
  }
  return validateFields(getManagerPropertyChangedFields(options.baseline, values), values);
}

function normalizeComparable(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || (typeof value === "number" && Number.isNaN(value))) {
    return undefined;
  }
  return value;
}

function validateFields(
  fields: string[],
  values: ManagerPropertyValidationValues,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((errors, field) => {
    const message = validateManagerPropertyField(field, values);
    if (message) {
      errors[field] = message;
    }
    return errors;
  }, {});
}

function validateScaledPositiveDecimal(
  value: number | undefined,
  label: string,
  max: number,
  scale: number,
  required: boolean,
): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return required ? `${label} is required` : null;
  }
  if (!Number.isFinite(value)) {
    return `${label} must be a valid number`;
  }
  if (value < 0) {
    return `${label} cannot be negative`;
  }
  if (required && value <= 0) {
    return `${label} must be greater than 0`;
  }
  if (!required && value === 0) {
    return null;
  }
  if (value > max) {
    return `${label} exceeds the supported numeric limit`;
  }
  if (!hasScale(value, scale)) {
    return `${label} can have at most ${scale} decimal places`;
  }
  return null;
}

function validateWholeNumber(value: number | undefined, label: string, required: boolean = true): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return required ? `${label} is required` : null;
  }
  if (!Number.isInteger(value) || value < 0) {
    return `${label} must be a whole number`;
  }
  return null;
}

function validateCoordinate(
  value: string,
  min: number,
  max: number,
  label: "Latitude" | "Longitude",
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Find the entered address or use your current location";
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return `${label} must be a valid number`;
  }
  if (parsed < min || parsed > max) {
    return `${label} must be between ${min} and ${max}`;
  }
  if (!hasStringScale(trimmed, PROPERTY_NUMERIC_LIMITS.coordinateScale)) {
    return `${label} can have at most ${PROPERTY_NUMERIC_LIMITS.coordinateScale} decimal places`;
  }

  return null;
}

function validateCoordinateMarket(
  values: ManagerPropertyValidationValues,
): string | null {
  const latitude = Number(values.latitude.trim());
  const longitude = Number(values.longitude.trim());
  const market = getSupportedLaunchCountry(values.countryCode, values.country, values.postalCode);
  if (!market || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return areCoordinatesInsideLaunchMarket(latitude, longitude, market)
    ? null
    : "Saved map position must be inside the selected country";
}

function validateAvailableFrom(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Available from must use YYYY-MM-DD format";
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? "Please enter a valid availability date"
    : null;
}

function isSupportedPropertyCountry(countryCode: string, countryName: string): boolean {
  const hasCountry = countryCode.trim() || countryName.trim();
  return !hasCountry || isLaunchIndiaCountry(countryCode, countryName) || isLaunchUKCountry(countryCode, countryName);
}

function isValidPostalCodeForCountry(value: string, countryCode: string, countryName: string): boolean {
  return isValidLaunchLocationCodeForCountry(value, countryCode, countryName);
}

function postalCodeMessageForCountry(countryCode: string, countryName: string): string {
  return getLaunchLocationCodeErrorMessage(countryCode, countryName);
}

function postalCodeRequiredMessageForCountry(countryCode: string, countryName: string): string {
  const label = getLaunchLocationCodeLabel(countryCode, countryName);
  return label === "PIN code / postcode"
    ? "PIN code or postcode is required"
    : `${label} is required`;
}

function requiresMinimumLease(listingType: ListingType): boolean {
  return listingType === "rent" || listingType === "lease";
}

function hasValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function hasScale(value: number, scale: number): boolean {
  const factor = Math.pow(10, scale);
  return Math.abs(value * factor - Math.round(value * factor)) <= 0.0000001;
}

function hasStringScale(value: string, scale: number): boolean {
  const [whole, decimals = ""] = value.replace(/^[+-]/, "").split(".");
  if (!whole || /[^0-9]/.test(whole) || /[^0-9]/.test(decimals)) {
    return false;
  }
  return decimals.length <= scale;
}
