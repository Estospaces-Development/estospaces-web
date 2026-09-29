interface PinAddress {
  countryCode: string;
  postalCode: string;
}

const normalizePostalCode = (value: string) => value.replace(/\s+/g, "").toUpperCase();

/**
 * A saved map pin is the manager's exact building position. Only a new
 * country or PIN/postcode moves the listing to another area and makes that
 * pin wrong. Correcting the street, city spelling, state, neighbourhood or
 * landmark must keep it, otherwise the pin is silently dropped and the next
 * draft save loses it (web-app#656).
 */
export const shouldResetPropertyPinForAddressChange = (
  previous: PinAddress,
  next: PinAddress,
): boolean =>
  previous.countryCode.trim().toUpperCase() !== next.countryCode.trim().toUpperCase() ||
  normalizePostalCode(previous.postalCode) !== normalizePostalCode(next.postalCode);
