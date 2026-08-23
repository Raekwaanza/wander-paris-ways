import { INTEREST_IDS } from "./interests";
import { isInParisMvpBounds } from "./paris-bounds";
import type {
  InterestId,
  Pace,
  Place,
  RouteProfile,
  ScenicRoute,
  TripPlan,
  WanderRoute,
} from "./types";

export const MAX_SHARED_ROUTE_TOKEN_LENGTH = 8_192;
const MAX_NAME_LENGTH = 120;
const MAX_ROUTE_ID_LENGTH = 160;
const MAX_DISCOVERIES = 8;

export interface SharedRouteEndpoint {
  name: string;
  lat: number;
  lng: number;
}

export interface SharedRoutePayloadV1 {
  v: 1;
  from: SharedRouteEndpoint;
  to: SharedRouteEndpoint;
  mode: "route" | "wander";
  profile: RouteProfile;
  routeId: string;
  interests: InterestId[];
  detourCap: number;
  pace: Pace;
  discoveryPoiIds: string[];
  expected: { minutes: number; km: number; extraMinutes: number };
  wander?: {
    requestedMinutes: number;
    fit: "targeted" | "direct-only" | "insufficient-time";
    waypointPoiIds: string[];
  };
}

export type SharedRouteResolution =
  { status: "exact"; route: ScenicRoute } | { status: "changed" } | { status: "unavailable" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finiteBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const uniqueStrings = (value: unknown, max: number): value is string[] =>
  Array.isArray(value) &&
  value.length <= max &&
  value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 160) &&
  new Set(value).size === value.length;

function endpoint(value: unknown): SharedRouteEndpoint | null {
  if (!isRecord(value)) return null;
  const { name, lat, lng } = value;
  if (
    typeof name !== "string" ||
    name.length > MAX_NAME_LENGTH ||
    !name.trim() ||
    !finiteBetween(lat, -90, 90) ||
    !finiteBetween(lng, -180, 180) ||
    !isInParisMvpBounds(lat, lng)
  )
    return null;
  return { name: name.trim(), lat, lng };
}

export function validateSharedRoutePayload(value: unknown): SharedRoutePayloadV1 | null {
  if (!isRecord(value) || value["v"] !== 1) return null;
  const from = endpoint(value["from"]);
  const to = endpoint(value["to"]);
  const mode = value["mode"];
  const profile = value["profile"];
  const routeId = value["routeId"];
  const interests = value["interests"];
  const detourCap = value["detourCap"];
  const pace = value["pace"];
  const discoveryPoiIds = value["discoveryPoiIds"];
  const expected = value["expected"];
  const profiles: RouteProfile[] = ["fastest", "scenic", "explorer"];
  const paces: Pace[] = ["strolling", "steady", "brisk"];
  if (
    !from ||
    !to ||
    (mode !== "route" && mode !== "wander") ||
    !profiles.includes(profile as RouteProfile) ||
    typeof routeId !== "string" ||
    !routeId.trim() ||
    routeId.length > MAX_ROUTE_ID_LENGTH ||
    !Array.isArray(interests) ||
    interests.length > INTEREST_IDS.length ||
    !interests.every((item) => INTEREST_IDS.includes(item as InterestId)) ||
    new Set(interests).size !== interests.length ||
    !finiteBetween(detourCap, 0, 120) ||
    !paces.includes(pace as Pace) ||
    !uniqueStrings(discoveryPoiIds, MAX_DISCOVERIES) ||
    !isRecord(expected) ||
    !finiteBetween(expected["minutes"], 0, 1_440) ||
    !finiteBetween(expected["km"], 0, 100) ||
    !finiteBetween(expected["extraMinutes"], 0, 1_440)
  )
    return null;

  const prefix = mode === "wander" ? "ors-wander-" : `ors-${profile}-`;
  if (!routeId.startsWith(prefix)) return null;
  if (mode === "route" && value["wander"] !== undefined) return null;
  if (mode === "wander") {
    const wander = value["wander"];
    if (!isRecord(wander)) return null;
    const requestedMinutes = wander["requestedMinutes"];
    const fit = wander["fit"];
    const waypointPoiIds = wander["waypointPoiIds"];
    if (
      !finiteBetween(requestedMinutes, 10, 120) ||
      (fit !== "targeted" && fit !== "direct-only" && fit !== "insufficient-time") ||
      !uniqueStrings(waypointPoiIds, 2) ||
      (fit === "targeted" ? waypointPoiIds.length === 0 : waypointPoiIds.length !== 0)
    )
      return null;
  }
  return value as unknown as SharedRoutePayloadV1;
}

function utf8ToBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToUtf8(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid token");
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, "="));
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

export function encodeSharedRoutePayload(payload: SharedRoutePayloadV1) {
  const valid = validateSharedRoutePayload(payload);
  if (!valid) throw new Error("Cannot encode an invalid shared route");
  return utf8ToBase64Url(JSON.stringify(valid));
}

export function decodeSharedRoutePayload(token: string): SharedRoutePayloadV1 | null {
  if (!token || token.length > MAX_SHARED_ROUTE_TOKEN_LENGTH) return null;
  try {
    return validateSharedRoutePayload(JSON.parse(base64UrlToUtf8(token)));
  } catch {
    return null;
  }
}

const roundedEndpoint = (place: Place, fallbackName: string): SharedRouteEndpoint => ({
  name: place.name.trim().toLowerCase() === "current location" ? fallbackName : place.name,
  lat: Number(place.lat.toFixed(6)),
  lng: Number(place.lng.toFixed(6)),
});

export function createSharedRoutePayload(args: {
  route: ScenicRoute;
  trip: TripPlan;
  from: Place;
  to: Place;
  pace: Pace;
}): SharedRoutePayloadV1 | null {
  const { route, trip, from, to, pace } = args;
  if (route.routingSource !== "openrouteservice") return null;
  const payload: SharedRoutePayloadV1 = {
    v: 1,
    from: roundedEndpoint(from, "Route start"),
    to: roundedEndpoint(to, "Route end"),
    mode: trip.mode,
    profile: route.profile,
    routeId: route.id,
    interests: [...new Set(trip.interests)],
    detourCap: trip.detourCap,
    pace,
    discoveryPoiIds: [...new Set(route.discoveries.map(({ id }) => id))],
    expected: { minutes: route.minutes, km: route.km, extraMinutes: route.extraMinutes },
    ...(trip.mode === "wander"
      ? {
          wander: {
            requestedMinutes: (route as WanderRoute).wander.requestedMinutes,
            fit: (route as WanderRoute).wander.fit as
              "targeted" | "direct-only" | "insufficient-time",
            waypointPoiIds: [...(route as WanderRoute).wander.waypointPoiIds],
          },
        }
      : {}),
  };
  return validateSharedRoutePayload(payload);
}

export function buildSharedRouteUrl(
  payload: SharedRoutePayloadV1,
  location: Pick<Location, "origin" | "pathname">,
) {
  const basePath = location.pathname
    .replace(/\/(complete|plan|navigate|wander)\/?$/, "")
    .replace(/\/$/, "");
  return `${location.origin}${basePath}/shared#r=${encodeSharedRoutePayload(payload)}`;
}
