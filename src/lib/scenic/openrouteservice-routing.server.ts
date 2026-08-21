import { createServerFn } from "@tanstack/react-start";
import type { LatLng } from "./types";

export const OPENROUTESERVICE_ENDPOINT =
  "https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson";
export const OPENROUTESERVICE_TIMEOUT_MS = 8_000;
export const OPENROUTESERVICE_CACHE_LIMIT = 32;

export interface PedestrianRouteResult {
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  attribution?: string;
}

export type PedestrianRouteResponse =
  { status: "success"; route: PedestrianRouteResult } | { status: "unavailable" };

interface RoutingInput {
  from: LatLng;
  to: LatLng;
}

const routeCache = new Map<string, PedestrianRouteResult>();
const inFlight = new Map<string, Promise<PedestrianRouteResult | null>>();
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

export function normalizeOpenRouteServiceResponse(payload: unknown): PedestrianRouteResult | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as Record<string, unknown>;
  if (!Array.isArray(response["features"])) return null;

  for (const rawFeature of response["features"]) {
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
    const metadata = response["metadata"] as Record<string, unknown> | undefined;
    const attribution =
      typeof metadata?.["attribution"] === "string" ? metadata["attribution"].trim() : "";
    return {
      path: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: distance,
      durationSeconds: duration,
      ...(attribution ? { attribution } : {}),
    };
  }
  return null;
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
  return `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
}

function remember(key: string, route: PedestrianRouteResult) {
  if (routeCache.size >= OPENROUTESERVICE_CACHE_LIMIT) {
    routeCache.delete(routeCache.keys().next().value as string);
  }
  routeCache.set(key, route);
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
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return normalizeOpenRouteServiceResponse(await response.json());
  } catch {
    return null;
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
    if (cached) return { status: "success", route: cached };

    let request = inFlight.get(key);
    if (!request) {
      request = requestRoute(data, apiKey);
      inFlight.set(key, request);
    }
    try {
      const route = await request;
      if (!route) {
        if (!warnedProviderFailure && process.env["NODE_ENV"] !== "production") {
          warnedProviderFailure = true;
          console.warn("[Scenic Route] ORS request failed; using mock Fastest.");
        }
        return { status: "unavailable" };
      }
      remember(key, route);
      return { status: "success", route };
    } finally {
      inFlight.delete(key);
    }
  });
