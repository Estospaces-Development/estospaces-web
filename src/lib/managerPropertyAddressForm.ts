import type { AddressFormData } from "@/components/ui/AddressSection";
import type { Property } from "@/contexts/PropertyContext";
import { shouldResetPropertyPinForAddressChange } from "@/lib/managerPropertyPinReset";

/** The address and pin fields of the manager listing form. */
export interface PropertyFormAddressFields {
  countryId: string;
  country: string;
  countryCode: string;
  stateId: string;
  state: string;
  stateCode: string;
  cityId: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  neighborhood: string;
  landmark: string;
  latitude: string;
  longitude: string;
}

/**
 * Applies an AddressSection change to the listing form. The pin is kept
 * unless the PIN/postcode or country changed (web-app#656).
 */
export function applyAddressSectionChange<T extends PropertyFormAddressFields>(
  formData: T,
  addressData: AddressFormData,
): { next: T; addressChanged: boolean; pinReset: boolean } {
  const addressChanged =
    addressData.countryCode !== formData.countryCode ||
    addressData.stateName !== formData.state ||
    addressData.cityName !== formData.city ||
    addressData.addressLine1 !== formData.addressLine1 ||
    addressData.addressLine2 !== formData.addressLine2 ||
    addressData.postalCode !== formData.postalCode ||
    addressData.neighborhood !== formData.neighborhood ||
    addressData.landmark !== formData.landmark;
  const resetPin = shouldResetPropertyPinForAddressChange(formData, addressData);
  const hadPin = Boolean(formData.latitude || formData.longitude);

  return {
    next: {
      ...formData,
      countryId: addressData.countryId,
      country: addressData.countryName,
      countryCode: addressData.countryCode,
      stateId: addressData.stateId,
      state: addressData.stateName,
      stateCode: addressData.stateCode,
      cityId: addressData.cityId,
      city: addressData.cityName,
      addressLine1: addressData.addressLine1,
      addressLine2: addressData.addressLine2,
      postalCode: addressData.postalCode,
      neighborhood: addressData.neighborhood,
      landmark: addressData.landmark,
      latitude: resetPin ? "" : formData.latitude,
      longitude: resetPin ? "" : formData.longitude,
    },
    addressChanged,
    pinReset: resetPin && hadPin,
  };
}

const parseCoordinate = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const hasPin = (fields: Pick<PropertyFormAddressFields, "latitude" | "longitude">) =>
  parseCoordinate(fields.latitude) !== undefined && parseCoordinate(fields.longitude) !== undefined;

/**
 * Builds the location sent on save. Omitted coordinates keep the stored pin
 * on the server, so a pin that was loaded and then cleared is sent as an
 * explicit clearLocation instead of being silently kept.
 */
export function buildPropertyLocationPayload(
  formData: PropertyFormAddressFields,
  loadedFormData: Pick<PropertyFormAddressFields, "latitude" | "longitude"> | null,
): NonNullable<Property["location"]> {
  const latitude = parseCoordinate(formData.latitude);
  const longitude = parseCoordinate(formData.longitude);
  const clearLocation = Boolean(loadedFormData && hasPin(loadedFormData) && !hasPin(formData));

  return {
    addressLine1: formData.addressLine1,
    addressLine2: formData.addressLine2,
    city: formData.city,
    cityId: formData.cityId,
    state: formData.state,
    stateId: formData.stateId,
    stateCode: formData.stateCode,
    postalCode: formData.postalCode,
    country: formData.country,
    countryCode: formData.countryCode,
    countryId: formData.countryId,
    latitude: clearLocation ? undefined : latitude,
    longitude: clearLocation ? undefined : longitude,
    ...(clearLocation ? { clearLocation: true } : {}),
    neighborhood: formData.neighborhood,
    landmark: formData.landmark,
  };
}
