import { isInParisMvpBounds } from "./paris-bounds";
import type { LocationMeasurement, ScenicLocationOptions } from "./location-contracts";
import { ScenicLocationError } from "./location-contracts";
import type { LatLng } from "./types";

export const NAVIGATION_LOCATION_OPTIONS: ScenicLocationOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
};

export const NAVIGATION_MAX_USABLE_ACCURACY_METERS = 100;

export interface NavigationLocationFix {
  point: LatLng;
  accuracyMeters: number | null;
  timestamp: number;
}

export type NavigationLocationStatus =
  | "idle"
  | "requesting"
  | "tracking"
  | "low-accuracy"
  | "permission-denied"
  | "outside-supported-area"
  | "unavailable";

export function navigationFixFromMeasurement(
  measurement: LocationMeasurement,
): NavigationLocationFix {
  return {
    point: { lat: measurement.latitude, lng: measurement.longitude },
    accuracyMeters: measurement.accuracyMeters,
    timestamp: measurement.timestamp,
  };
}

export function navigationFixStatus(fix: NavigationLocationFix): NavigationLocationStatus {
  if (!isInParisMvpBounds(fix.point.lat, fix.point.lng)) return "outside-supported-area";
  if (fix.accuracyMeters === null || fix.accuracyMeters > NAVIGATION_MAX_USABLE_ACCURACY_METERS) {
    return "low-accuracy";
  }
  return "tracking";
}

export function navigationErrorStatus(error: unknown): NavigationLocationStatus {
  return error instanceof ScenicLocationError && error.code === "permission-denied"
    ? "permission-denied"
    : "unavailable";
}
