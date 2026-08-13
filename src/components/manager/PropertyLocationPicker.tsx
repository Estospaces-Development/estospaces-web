import { useEffect, useMemo } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  LocateFixed,
  MapPin,
} from "lucide-react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface PropertyLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  countryCode?: string;
  busy: boolean;
  disabled?: boolean;
  statusMessage?: string;
  errorMessage?: string;
  onFindAddress: () => void;
  onUseCurrentLocation: () => void;
  onLocationChange: (latitude: number, longitude: number) => void;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const UK_CENTER: [number, number] = [54.5, -3.4];
const PIN_NUDGE_DEGREES = 0.0001;

const markerIcon = L.divIcon({
  className: "property-location-marker",
  html: '<div aria-hidden="true" style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f97316;border:3px solid white;box-shadow:0 6px 18px rgba(15,23,42,.28)"><div style="transform:rotate(45deg);color:white;text-align:center;line-height:28px;font-weight:800">P</div></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MapPositionController({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 16);
  }, [map, position]);

  return null;
}

function MapClickHandler({
  onLocationChange,
  disabled,
}: Pick<PropertyLocationPickerProps, "onLocationChange"> & {
  disabled: boolean;
}) {
  useMapEvents({
    click: (event) => {
      if (!disabled) {
        onLocationChange(event.latlng.lat, event.latlng.lng);
      }
    },
  });
  return null;
}

export default function PropertyLocationPicker({
  latitude,
  longitude,
  countryCode,
  busy,
  disabled = false,
  statusMessage,
  errorMessage,
  onFindAddress,
  onUseCurrentLocation,
  onLocationChange,
}: PropertyLocationPickerProps) {
  const hasLocation = latitude !== null && longitude !== null;
  const fallbackCenter = useMemo<[number, number]>(
    () => (countryCode?.toUpperCase() === "GB" ? UK_CENTER : INDIA_CENTER),
    [countryCode],
  );
  const position = useMemo<[number, number]>(
    () => (hasLocation ? [latitude, longitude] : fallbackCenter),
    [fallbackCenter, hasLocation, latitude, longitude],
  );

  return (
    <section
      aria-labelledby="property-location-map-heading"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      data-property-location-picker
      data-has-property-location={hasLocation ? "true" : "false"}
    >
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2
            id="property-location-map-heading"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Place the property on the map
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Find the entered PIN or postcode, use your current location, then
            click or drag the marker to the exact building.
          </p>
          <p className="mt-1 max-w-3xl text-xs text-gray-500 dark:text-gray-400">
            Street details stay private during postal lookup. Current location
            is requested only when you choose it and is saved as the property pin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="manager-property-latitude"
            type="button"
            onClick={onFindAddress}
            disabled={busy || disabled}
            aria-describedby={
              errorMessage ? "manager-property-latitude-error" : undefined
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {busy ? "Finding location..." : "Find entered address"}
          </button>
          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={busy || disabled}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-950 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-orange-50 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
          >
            <LocateFixed className="h-4 w-4" />
            Use my current location
          </button>
        </div>
      </div>

      <div
        className="relative h-[320px] bg-gray-100 sm:h-[360px] dark:bg-gray-950"
        role="region"
        aria-label="Interactive property location map"
        aria-describedby="property-location-map-instructions"
      >
        <p id="property-location-map-instructions" className="sr-only">
          Click the map or drag the marker with a pointer. Keyboard users can
          use the direction buttons to move the pin in small steps.
        </p>
        <MapContainer
          center={position}
          zoom={hasLocation ? 16 : 5}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler
            onLocationChange={onLocationChange}
            disabled={!hasLocation || disabled || busy}
          />
          {hasLocation && (
            <>
              <MapPositionController position={position} />
              <Marker
                position={position}
                icon={markerIcon}
                draggable={!disabled && !busy}
                eventHandlers={{
                  dragend: (event) => {
                    const nextPosition = event.target.getLatLng();
                    onLocationChange(nextPosition.lat, nextPosition.lng);
                  },
                }}
              />
            </>
          )}
        </MapContainer>
        {!hasLocation && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-4 py-3 text-sm font-medium text-gray-700 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200">
            <Crosshair className="h-4 w-4 shrink-0 text-orange-500" />
            <span>
              Find the entered address or use your current location to place
              the marker.
            </span>
          </div>
        )}
        {hasLocation && (
          <div
            className="absolute bottom-5 left-5 z-[500] grid grid-cols-3 gap-1 rounded-xl bg-white p-2 shadow-lg dark:bg-gray-900"
            role="group"
            aria-label="Fine-tune the property pin"
          >
            <span aria-hidden="true" />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() =>
                onLocationChange(latitude + PIN_NUDGE_DEGREES, longitude)
              }
              aria-label="Move property pin north by about 10 metres"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-orange-950 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:text-orange-50 dark:hover:bg-orange-950/40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <span aria-hidden="true" />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() =>
                onLocationChange(latitude, longitude - PIN_NUDGE_DEGREES)
              }
              aria-label="Move property pin west by about 10 metres"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-orange-950 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:text-orange-50 dark:hover:bg-orange-950/40"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() =>
                onLocationChange(latitude - PIN_NUDGE_DEGREES, longitude)
              }
              aria-label="Move property pin south by about 10 metres"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-orange-950 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:text-orange-50 dark:hover:bg-orange-950/40"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() =>
                onLocationChange(latitude, longitude + PIN_NUDGE_DEGREES)
              }
              aria-label="Move property pin east by about 10 metres"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-orange-950 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:text-orange-50 dark:hover:bg-orange-950/40"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-12 px-5 py-3 text-sm" aria-live="polite">
        {errorMessage ? (
          <p
            id="manager-property-latitude-error"
            role="alert"
            className="font-medium text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">
            {statusMessage ||
              (hasLocation
                ? "Property location is pinned and will be saved with the listing."
                : "A real map position is required before continuing.")}
          </p>
        )}
      </div>
    </section>
  );
}
