import { getCurrentLocationFix, LIVE_CURRENT_LOCATION_ID } from "./current-location";
import { isMapTilerPlaceId } from "./live-places";
import { services } from "./services";
import type { Place, TripEndpoint } from "./types";

export type EndpointResolution =
  | { status: "resolved"; place: Place }
  | { status: "missing-current-location" }
  | { status: "invalid-endpoint" };

export function tripEndpointFromPlace(place: Place): TripEndpoint {
  if (place.id === LIVE_CURRENT_LOCATION_ID) {
    return { type: "current-location", id: LIVE_CURRENT_LOCATION_ID };
  }
  if (isMapTilerPlaceId(place.id)) {
    return {
      type: "geocoded",
      id: place.id,
      provider: "maptiler",
      name: place.name,
      kind: place.kind,
      area: place.area,
      lat: place.lat,
      lng: place.lng,
    };
  }
  return { type: "seeded", id: place.id };
}

export function resolveTripEndpoint(endpoint: TripEndpoint): EndpointResolution {
  if (endpoint.type === "current-location") {
    const place = getCurrentLocationFix()?.place;
    return place ? { status: "resolved", place } : { status: "missing-current-location" };
  }
  if (endpoint.type === "geocoded") {
    return {
      status: "resolved",
      place: {
        id: endpoint.id,
        name: endpoint.name,
        kind: endpoint.kind,
        area: endpoint.area,
        lat: endpoint.lat,
        lng: endpoint.lng,
      },
    };
  }
  const place = services.geocoding.byId(endpoint.id);
  return place ? { status: "resolved", place } : { status: "invalid-endpoint" };
}

export function validateTripEndpoint(value: unknown): TripEndpoint | null {
  if (!isRecord(value)) return null;
  const { id, type, provider, name, kind, area, lat, lng } = value;
  if (typeof id !== "string" || !id.trim()) return null;
  if (type === "current-location") {
    return id === LIVE_CURRENT_LOCATION_ID
      ? { type: "current-location", id: LIVE_CURRENT_LOCATION_ID }
      : null;
  }
  if (type === "seeded") {
    return services.geocoding.byId(id) && !isMapTilerPlaceId(id) ? { type: "seeded", id } : null;
  }
  if (
    type === "geocoded" &&
    provider === "maptiler" &&
    isMapTilerPlaceId(id) &&
    usableText(name) &&
    usableText(kind) &&
    usableText(area) &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    validCoordinates(lat, lng)
  ) {
    return {
      type: "geocoded",
      id,
      provider: "maptiler",
      name,
      kind,
      area,
      lat,
      lng,
    };
  }
  return null;
}

/** Migrates an ID-only endpoint when its data is still locally resolvable. */
export function migrateLegacyTripEndpoint(id: unknown): TripEndpoint | null {
  if (id === LIVE_CURRENT_LOCATION_ID) {
    return { type: "current-location", id: LIVE_CURRENT_LOCATION_ID };
  }
  if (typeof id !== "string" || !id) return null;
  const place = services.geocoding.byId(id);
  if (!place) return null;
  return tripEndpointFromPlace(place);
}

export function resolvedPlace(result: EndpointResolution) {
  return result.status === "resolved" ? result.place : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function usableText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validCoordinates(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
