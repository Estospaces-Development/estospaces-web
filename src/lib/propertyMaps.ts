export type MapsProvider = "apple" | "google";

export interface PropertyMapLocationLike {
  location?: {
    addressLine1?: string | null;
    address_line_1?: string | null;
    addressLine2?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    postcode?: string | null;
    country?: string | null;
    latitude?: number | string | null;
    lat?: number | string | null;
    longitude?: number | string | null;
    lng?: number | string | null;
  } | null;
  address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  postcode?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  lat?: number | string | null;
  longitude?: number | string | null;
  lng?: number | string | null;
}

export interface PropertyMapState {
  provider: MapsProvider;
  hasCoordinates: boolean;
  hasAddress: boolean;
  displayAddress: string;
  coordinates: { latitude: number; longitude: number } | null;
  embedUrl: string | null;
  externalUrl: string | null;
  statusTitle: string;
  statusDescription: string;
}

const APPLE_DEVICE_PATTERN = /\b(iPhone|iPad|iPod|Macintosh)\b/i;

const normalizeCoordinate = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const joinAddressParts = (parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const normalizedParts: string[] = [];

  parts.forEach((part) => {
    const trimmed = typeof part === "string" ? part.trim() : "";
    if (!trimmed) {
      return;
    }

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalizedParts.push(trimmed);
  });

  return normalizedParts.join(", ");
};

const buildGoogleEmbedUrl = (latitude: number, longitude: number) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=15&output=embed`;

const buildGoogleMapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const buildAppleMapsUrl = (query: string, latitude?: number, longitude?: number) => {
  if (typeof latitude === "number" && typeof longitude === "number") {
    const params = new URLSearchParams({
      ll: `${latitude},${longitude}`,
      q: query,
    });
    return `https://maps.apple.com/?${params.toString()}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
};

export const getPreferredMapsProvider = (
  userAgent?: string | null,
): MapsProvider => {
  if (!userAgent) {
    return "google";
  }

  return APPLE_DEVICE_PATTERN.test(userAgent) ? "apple" : "google";
};

export const getPropertyMapCoordinates = (
  property: PropertyMapLocationLike,
) => {
  const latitude = normalizeCoordinate(
    property.location?.latitude ??
      property.location?.lat ??
      property.latitude ??
      property.lat,
  );
  const longitude = normalizeCoordinate(
    property.location?.longitude ??
      property.location?.lng ??
      property.longitude ??
      property.lng,
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
};

export const getPropertyDisplayAddress = (
  property: PropertyMapLocationLike,
) =>
  joinAddressParts([
    property.location?.addressLine1,
    property.location?.address_line_1,
    property.address_line_1,
    property.location?.addressLine2,
    property.location?.address_line_2,
    property.address_line_2,
    property.address,
    property.location?.city,
    property.city,
    property.location?.state,
    property.state,
    property.location?.postalCode,
    property.location?.postcode,
    property.postcode,
    property.zipCode,
    property.location?.country,
    property.country,
  ]);

export const getPropertyMapState = (
  property: PropertyMapLocationLike,
  options?: { userAgent?: string | null; displayAddress?: string | null },
): PropertyMapState => {
  const provider = getPreferredMapsProvider(options?.userAgent);
  const coordinates = getPropertyMapCoordinates(property);
  const overrideDisplayAddress =
    typeof options?.displayAddress === "string"
      ? options.displayAddress.trim()
      : "";
  const displayAddress = overrideDisplayAddress || getPropertyDisplayAddress(property);

  if (coordinates) {
    const pinQuery = `${coordinates.latitude},${coordinates.longitude}`;
    const externalQuery = displayAddress || pinQuery;

    return {
      provider,
      hasCoordinates: true,
      hasAddress: Boolean(displayAddress),
      displayAddress,
      coordinates,
      embedUrl: buildGoogleEmbedUrl(coordinates.latitude, coordinates.longitude),
      externalUrl:
        provider === "apple"
          ? buildAppleMapsUrl(
              externalQuery,
              coordinates.latitude,
              coordinates.longitude,
            )
          : buildGoogleMapsUrl(pinQuery),
      statusTitle: "Saved pin available",
      statusDescription:
        "Click the map to open the saved property pin in Maps.",
    };
  }

  if (displayAddress) {
    return {
      provider,
      hasCoordinates: false,
      hasAddress: true,
      displayAddress,
      coordinates: null,
      embedUrl: null,
      externalUrl:
        provider === "apple"
          ? buildAppleMapsUrl(displayAddress)
          : buildGoogleMapsUrl(displayAddress),
      statusTitle: "Exact pin unavailable",
      statusDescription:
        "This property does not have saved coordinates yet. Open the address in Maps to continue.",
    };
  }

  return {
    provider,
    hasCoordinates: false,
    hasAddress: false,
    displayAddress: "",
    coordinates: null,
    embedUrl: null,
    externalUrl: null,
    statusTitle: "Location unavailable",
    statusDescription:
      "This property does not have enough saved location data to open in Maps yet.",
  };
};
