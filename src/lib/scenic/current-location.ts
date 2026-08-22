import { services } from "./services";
import type { Place } from "./types";
import type { ReverseGeocodeResult } from "./provider-contracts";
import { isInParisMvpBounds } from "./paris-bounds";
import type { ScenicLocationOptions } from "./location-contracts";
import { ScenicLocationError } from "./location-contracts";
import { scenicLocationProvider } from "./location-provider";

export { isInParisMvpBounds } from "./paris-bounds";

/** Persistable sentinel for a fix whose coordinates deliberately remain in memory only. */
export const LIVE_CURRENT_LOCATION_ID = "live-current-location";

export const CURRENT_LOCATION_OPTIONS: ScenicLocationOptions = {
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
  unsupported: "Location isn't available on this device. Enter a starting point instead.",
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

let currentFix: CurrentLocationFix | null = null;
let pendingRequest: Promise<CurrentLocationFix> | null = null;

export function getCurrentLocationFix() {
  return currentFix;
}

export function isLiveCurrentLocationId(id: string | null | undefined) {
  return id === LIVE_CURRENT_LOCATION_ID;
}

function normalizeError(error: unknown) {
  if (error instanceof ScenicLocationError && error.code in ERROR_MESSAGES) {
    return new CurrentLocationError(error.code);
  }
  return new CurrentLocationError("unexpected");
}

export function requestCurrentLocation(): Promise<CurrentLocationFix> {
  if (pendingRequest) return pendingRequest;
  pendingRequest = scenicLocationProvider
    .getCurrentPosition(CURRENT_LOCATION_OPTIONS)
    .then(async (measurement) => {
      const { latitude: lat, longitude: lng } = measurement;
      if (!isInParisMvpBounds(lat, lng)) throw new CurrentLocationError("outside-paris");
      const fix: CurrentLocationFix = {
        place: {
          id: LIVE_CURRENT_LOCATION_ID,
          name: "Current location",
          kind: "Live location",
          area: "GPS position",
          lat,
          lng,
        },
        accuracy: measurement.accuracyMeters,
        timestamp: measurement.timestamp,
      };
      currentFix = fix;

      // The valid GPS fix is stored first. Label enrichment is deliberately
      // best-effort and never changes its adapter-supplied coordinates.
      const reverseGeocode = await services.reverseGeocoding
        .reverse({ lat, lng })
        .catch(() => null);
      if (reverseGeocode) {
        fix.place = { ...fix.place, area: reverseGeocode.label };
        fix.reverseGeocode = reverseGeocode;
      }
      return fix;
    })
    .catch((error) => {
      if (error instanceof CurrentLocationError) throw error;
      throw normalizeError(error);
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function currentLocationErrorMessage(error: unknown) {
  return error instanceof CurrentLocationError ? error.message : ERROR_MESSAGES.unexpected;
}
