import type { ListingType } from "@/contexts/PropertyContext";
import {
  getLaunchLocationCodeErrorMessage,
  getLaunchLocationCodeLabel,
  getLaunchCityFromPin,
  getLaunchStateCodeFromPinPrefix,
  isLaunchIndiaCountry,
  isLaunchUKCountry,
  isValidLaunchLocationCodeForCountry,
  LAUNCH_COUNTRY_NAME,
} from "@/lib/launchLocale";

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
  minimumLease: number;
  deposit: number;
  maintenanceCharges: number;
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
      const pinCityName = getLaunchCityFromPin(values.postalCode);
      if (pinCityName && values.city && values.city.trim() && values.city.trim().toLowerCase() !== pinCityName.toLowerCase()) {
        return `PIN code does not match the selected city (${pinCityName})`;
      }
      return null;
    case "latitude":
      return validateCoordinate(values.latitude, -90, 90, "Latitude");
    case "longitude":
      return validateCoordinate(values.longitude, -180, 180, "Longitude");
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
      return validateWholeNumber(values.bedrooms, "Bedrooms", true);
    case "bathrooms":
      return validateWholeNumber(values.bathrooms, "Bathrooms", true);
    case "balconies":
      return validateWholeNumber(values.balconies, "Balconies", true);
    case "parkingSpaces":
      return validateWholeNumber(values.parkingSpaces, "Parking spaces", true);
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
    return null;
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
