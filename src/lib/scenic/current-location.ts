import { services } from "./services";
import type { Place } from "./types";
import type { ReverseGeocodeResult } from "./reverse-geocoding.server";

/** Persistable sentinel for a fix whose coordinates deliberately remain in memory only. */
export const LIVE_CURRENT_LOCATION_ID = "live-current-location";

export const CURRENT_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 30_000,
};

export interface CurrentLocationFix {
  place: Place;
  accuracy: number | null;
  timestamp: number;
  reverseGeocode?: ReverseGeocodeResult;
}

export type CurrentLocationErrorCode =
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "outside-paris"
  | "unexpected";

const ERROR_MESSAGES: Record<CurrentLocationErrorCode, string> = {
  unsupported: "Location isn't available in this browser. Enter a starting point instead.",
  "insecure-context": "Location requires a secure connection. Enter a starting point instead.",
  "permission-denied": "Location access is turned off. Choose a starting point instead.",
  "position-unavailable":
    "We couldn't determine your location. Try again or enter a starting point.",
  timeout: "Finding your location took too long. Try again or enter a starting point.",
  "outside-paris":
    "Scenic Route currently supports Paris. Enter a Paris starting point to explore the demo.",
  unexpected: "We couldn't use your location. Try again or enter a starting point.",
};

export class CurrentLocationError extends Error {
  constructor(public readonly code: CurrentLocationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "CurrentLocationError";
  }
}

// Generous MVP coverage for Paris and its near suburbs; intentionally not an
// arrondissement-level service-area definition.
export function isInParisMvpBounds(lat: number, lng: number) {
  return lat >= 48.75 && lat <= 49.0 && lng >= 2.15 && lng <= 2.55;
}

let currentFix: CurrentLocationFix | null = null;
let pendingRequest: Promise<CurrentLocationFix> | null = null;

export function getCurrentLocationFix() {
  return currentFix;
}

export function isLiveCurrentLocationId(id: string | null | undefined) {
  return id === LIVE_CURRENT_LOCATION_ID;
}

function normalizeError(error: GeolocationPositionError | unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as GeolocationPositionError).code;
    if (code === 1) return new CurrentLocationError("permission-denied");
    if (code === 2) return new CurrentLocationError("position-unavailable");
    if (code === 3) return new CurrentLocationError("timeout");
  }
  return new CurrentLocationError("unexpected");
}

export function requestCurrentLocation(): Promise<CurrentLocationFix> {
  if (pendingRequest) return pendingRequest;
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.reject(new CurrentLocationError("unsupported"));
  }
  if (!window.isSecureContext) {
    return Promise.reject(new CurrentLocationError("insecure-context"));
  }

  pendingRequest = new Promise<CurrentLocationFix>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        if (!isInParisMvpBounds(lat, lng)) {
          reject(new CurrentLocationError("outside-paris"));
          return;
        }
        const fix: CurrentLocationFix = {
          place: {
            id: LIVE_CURRENT_LOCATION_ID,
            name: "Current location",
            kind: "Live location",
            area: "GPS position",
            lat,
            lng,
          },
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          timestamp: position.timestamp,
        };
        currentFix = fix;

        // The valid GPS fix is stored first. Label enrichment is deliberately
        // best-effort and never changes its browser-supplied coordinates.
        const reverseGeocode = await services.reverseGeocoding
          .reverse({ lat, lng })
          .catch(() => null);
        if (reverseGeocode) {
          fix.place = { ...fix.place, area: reverseGeocode.label };
          fix.reverseGeocode = reverseGeocode;
        }
        resolve(fix);
      },
      (error) => reject(normalizeError(error)),
      CURRENT_LOCATION_OPTIONS,
    );
  }).finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}

export function currentLocationErrorMessage(error: unknown) {
  return error instanceof CurrentLocationError ? error.message : ERROR_MESSAGES.unexpected;
}
