import { isInParisMvpBounds } from "./paris-bounds";
import type { LatLng } from "./types";

export const NAVIGATION_LOCATION_OPTIONS: PositionOptions = {
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

export function navigationFixFromPosition(position: GeolocationPosition): NavigationLocationFix {
  const accuracy = position.coords.accuracy;
  return {
    point: { lat: position.coords.latitude, lng: position.coords.longitude },
    accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: position.timestamp,
  };
}

export function navigationFixStatus(fix: NavigationLocationFix): NavigationLocationStatus {
  if (!isInParisMvpBounds(fix.point.lat, fix.point.lng)) return "outside-supported-area";
  if (fix.accuracyMeters === null || fix.accuracyMeters > NAVIGATION_MAX_USABLE_ACCURACY_METERS) {
    return "low-accuracy";
  }
  return "tracking";
}

export function navigationErrorStatus(error: GeolocationPositionError): NavigationLocationStatus {
  return error.code === error.PERMISSION_DENIED ? "permission-denied" : "unavailable";
}
