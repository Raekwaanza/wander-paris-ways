import { createServerFn } from "@tanstack/react-start";
import { distanceKm, routeGeometrySignature } from "./geo";
import type { LatLng } from "./types";
import {
  fixturePedestrianCandidates,
  fixtureViaCandidate,
  isScenicE2EFixtureMode,
} from "./e2e-provider-fixtures.server";

export const OPENROUTESERVICE_ENDPOINT =
  "https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson";
export const OPENROUTESERVICE_TIMEOUT_MS = 8_000;
export const OPENROUTESERVICE_CACHE_LIMIT = 32;
export const OPENROUTESERVICE_ALTERNATIVE_ROUTES = {
  target_count: 3,
  share_factor: 0.6,
  weight_factor: 1.4,
} as const;
const OPENROUTESERVICE_CACHE_VERSION = "alternatives-v1";

export interface PedestrianRouteResult {
  providerRank: number;
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  /** Geometric distance from the requested point, not ORS Snap API distance. */
  startOffsetMeters?: number;
  /** Geometric distance from the requested point, not ORS Snap API distance. */
  endOffsetMeters?: number;
  attribution?: string;
}

export type PedestrianRouteResponse =
  { status: "success"; candidates: PedestrianRouteResult[] } | { status: "unavailable" };

interface RoutingInput {
  from: LatLng;
  to: LatLng;
}

interface ViaRoutingInput {
  points: LatLng[];
}

const VIA_CACHE_VERSION = "wander-via-v1";
const viaRouteCache = new Map<string, PedestrianRouteResult>();
const viaInFlight = new Map<string, Promise<PedestrianRouteResult | null>>();

const routeCache = new Map<string, PedestrianRouteResult[]>();
const inFlight = new Map<string, Promise<PedestrianRouteResult[]>>();
let warnedMissingKey = false;
let warnedProviderFailure = false;

function validCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function normalizeOpenRouteServiceResponse(
  payload: unknown,
  requestedEndpoints?: RoutingInput,
): PedestrianRouteResult[] {
  if (!payload || typeof payload !== "object") return [];
  const response = payload as Record<string, unknown>;
  if (!Array.isArray(response["features"])) return [];

  const candidates: PedestrianRouteResult[] = [];
  const geometrySignatures = new Set<string>();
  const metadata = response["metadata"] as Record<string, unknown> | undefined;
  const attribution =
    typeof metadata?.["attribution"] === "string" ? metadata["attribution"].trim() : "";

  for (const [providerRank, rawFeature] of response["features"].entries()) {
    if (!rawFeature || typeof rawFeature !== "object") continue;
    const feature = rawFeature as Record<string, unknown>;
    const geometry = feature["geometry"] as Record<string, unknown> | undefined;
    const properties = feature["properties"] as Record<string, unknown> | undefined;
    const summary = properties?.["summary"] as Record<string, unknown> | undefined;
    if (geometry?.["type"] !== "LineString" || !Array.isArray(geometry["coordinates"])) continue;
    const coordinates = geometry["coordinates"];
    if (coordinates.length < 2 || !coordinates.every(validCoordinatePair)) continue;
    const distance = summary?.["distance"];
    const duration = summary?.["duration"];
    if (
      typeof distance !== "number" ||
      !Number.isFinite(distance) ||
      distance < 0 ||
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration < 0
    )
      continue;
    const path = coordinates.map(([lng, lat]) => ({ lat, lng }));
    const signature = routeGeometrySignature(path);
    if (geometrySignatures.has(signature)) continue;
    geometrySignatures.add(signature);
    candidates.push({
      providerRank,
      path,
      distanceMeters: distance,
      durationSeconds: duration,
      ...(requestedEndpoints
        ? {
            startOffsetMeters: distanceKm(requestedEndpoints.from, path[0]!) * 1_000,
            endOffsetMeters: distanceKm(path[path.length - 1]!, requestedEndpoints.to) * 1_000,
          }
        : {}),
      ...(attribution ? { attribution } : {}),
    });
  }
  return candidates;
}

function validateRoutingInput(input: RoutingInput): RoutingInput {
  if (!input || !validPoint(input.from) || !validPoint(input.to)) {
    throw new Error("Invalid routing coordinates");
  }
  return input;
}

function validPoint(point: unknown): point is LatLng {
  if (!point || typeof point !== "object") return false;
  const { lat, lng } = point as LatLng;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function validateViaRoutingInput(input: ViaRoutingInput): ViaRoutingInput {
  if (
    !input ||
    !Array.isArray(input.points) ||
    input.points.length < 2 ||
    input.points.length > 4
  ) {
    throw new Error("Invalid waypoint count");
  }
  if (!input.points.every(validPoint)) throw new Error("Invalid routing coordinates");
  return input;
}

function cacheKey({ from, to }: RoutingInput) {
  return `${OPENROUTESERVICE_CACHE_VERSION}:${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
}

function remember(key: string, candidates: PedestrianRouteResult[]) {
  if (routeCache.size >= OPENROUTESERVICE_CACHE_LIMIT) {
    routeCache.delete(routeCache.keys().next().value as string);
  }
  routeCache.set(key, candidates);
}

async function requestRoute(input: RoutingInput, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTESERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTESERVICE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [input.from.lng, input.from.lat],
          [input.to.lng, input.to.lat],
        ],
        preference: "shortest",
        instructions: false,
        alternative_routes: OPENROUTESERVICE_ALTERNATIVE_ROUTES,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return normalizeOpenRouteServiceResponse(await response.json(), input);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function requestViaRoute(input: ViaRoutingInput, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTESERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTESERVICE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: input.points.map(({ lng, lat }) => [lng, lat]),
        preference: "shortest",
        instructions: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (
      normalizeOpenRouteServiceResponse(await response.json(), {
        from: input.points[0]!,
        to: input.points[input.points.length - 1]!,
      })[0] ?? null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fixed 2–4 point routing for Wander. It deliberately requests no alternatives. */
export const routeViaOpenRouteService = createServerFn({ method: "POST" })
  .validator(validateViaRoutingInput)
  .handler(async ({ data }): Promise<PedestrianRouteResponse> => {
    if (isScenicE2EFixtureMode()) {
      return { status: "success", candidates: [fixtureViaCandidate(data.points)] };
    }
    const apiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
    if (!apiKey) return { status: "unavailable" };
    const key = `${VIA_CACHE_VERSION}:${data.points
      .map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
      .join(":")}`;
    const cached = viaRouteCache.get(key);
    if (cached) return { status: "success", candidates: [cached] };
    let request = viaInFlight.get(key);
    if (!request) {
      request = requestViaRoute(data, apiKey);
      viaInFlight.set(key, request);
    }
    try {
      const candidate = await request;
      if (!candidate) return { status: "unavailable" };
      if (viaRouteCache.size >= OPENROUTESERVICE_CACHE_LIMIT) {
        viaRouteCache.delete(viaRouteCache.keys().next().value as string);
      }
      viaRouteCache.set(key, candidate);
      return { status: "success", candidates: [candidate] };
    } finally {
      viaInFlight.delete(key);
    }
  });

export const routeWithOpenRouteService = createServerFn({ method: "POST" })
  .validator(validateRoutingInput)
  .handler(async ({ data }): Promise<PedestrianRouteResponse> => {
    if (isScenicE2EFixtureMode()) {
      return {
        status: "success",
        candidates: fixturePedestrianCandidates(data.from, data.to),
      };
    }
    const apiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
    if (!apiKey) {
      if (!warnedMissingKey && process.env["NODE_ENV"] !== "production") {
        warnedMissingKey = true;
        console.warn("[Scenic Route] ORS key absent; using mock Fastest.");
      }
      return { status: "unavailable" };
    }

    const key = cacheKey(data);
    const cached = routeCache.get(key);
    if (cached) return { status: "success", candidates: cached };

    let request = inFlight.get(key);
    if (!request) {
      request = requestRoute(data, apiKey);
      inFlight.set(key, request);
    }
    try {
      const candidates = await request;
      if (candidates.length === 0) {
        if (!warnedProviderFailure && process.env["NODE_ENV"] !== "production") {
          warnedProviderFailure = true;
          console.warn("[Scenic Route] ORS request failed; using mock Fastest.");
        }
        return { status: "unavailable" };
      }
      remember(key, candidates);
      return { status: "success", candidates };
    } finally {
      inFlight.delete(key);
    }
  });
