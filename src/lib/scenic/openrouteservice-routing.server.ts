import { createServerFn } from "@tanstack/react-start";
import type { LatLng } from "./types";

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
  attribution?: string;
}

export type PedestrianRouteResponse =
  { status: "success"; candidates: PedestrianRouteResult[] } | { status: "unavailable" };

interface RoutingInput {
  from: LatLng;
  to: LatLng;
}

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

export function normalizeOpenRouteServiceResponse(payload: unknown): PedestrianRouteResult[] {
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
    const signature = coordinates
      .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
      .join(";");
    if (geometrySignatures.has(signature)) continue;
    geometrySignatures.add(signature);
    candidates.push({
      providerRank,
      path: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: distance,
      durationSeconds: duration,
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
    return normalizeOpenRouteServiceResponse(await response.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export const routeWithOpenRouteService = createServerFn({ method: "POST" })
  .validator(validateRoutingInput)
  .handler(async ({ data }): Promise<PedestrianRouteResponse> => {
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
