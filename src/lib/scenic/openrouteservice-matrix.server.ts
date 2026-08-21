import { createServerFn } from "@tanstack/react-start";
import type { LatLng } from "./types";

export const OPENROUTESERVICE_MATRIX_ENDPOINT =
  "https://api.heigit.org/openrouteservice/v2/matrix/foot-walking";
export const WALKING_MATRIX_LOCATION_LIMIT = 20;
const MATRIX_CACHE_LIMIT = 32;
const MATRIX_TIMEOUT_MS = 8_000;
const MATRIX_CACHE_VERSION = "wander-matrix-v1";

interface WalkingMatrixInput {
  locations: LatLng[];
}

export interface WalkingDurationMatrix {
  durationsSeconds: Array<Array<number | null>>;
}

export type WalkingMatrixResponse =
  ({ status: "success" } & WalkingDurationMatrix) | { status: "unavailable" };

const cache = new Map<string, WalkingDurationMatrix>();
const inFlight = new Map<string, Promise<WalkingDurationMatrix | null>>();

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

function validateInput(input: WalkingMatrixInput): WalkingMatrixInput {
  if (
    !input ||
    !Array.isArray(input.locations) ||
    input.locations.length < 2 ||
    input.locations.length > WALKING_MATRIX_LOCATION_LIMIT ||
    !input.locations.every(validPoint)
  ) {
    throw new Error("Invalid walking matrix locations");
  }
  return input;
}

export function normalizeWalkingMatrix(
  payload: unknown,
  size: number,
): WalkingDurationMatrix | null {
  if (!payload || typeof payload !== "object") return null;
  const durations = (payload as Record<string, unknown>)["durations"];
  if (!Array.isArray(durations) || durations.length !== size) return null;
  const normalized: Array<Array<number | null>> = [];
  for (const row of durations) {
    if (!Array.isArray(row) || row.length !== size) return null;
    const values: Array<number | null> = [];
    for (const value of row) {
      if (value === null) values.push(null);
      else if (typeof value === "number" && Number.isFinite(value) && value >= 0)
        values.push(value);
      else return null;
    }
    normalized.push(values);
  }
  return { durationsSeconds: normalized };
}

async function requestMatrix(input: WalkingMatrixInput, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MATRIX_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTESERVICE_MATRIX_ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: input.locations.map(({ lng, lat }) => [lng, lat]),
        metrics: ["duration"],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return normalizeWalkingMatrix(await response.json(), input.locations.length);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const walkingDurationMatrix = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(async ({ data }): Promise<WalkingMatrixResponse> => {
    const apiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
    if (!apiKey) return { status: "unavailable" };
    const key = `${MATRIX_CACHE_VERSION}:${data.locations
      .map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
      .join(":")}`;
    const cached = cache.get(key);
    if (cached) return { status: "success", ...cached };
    let request = inFlight.get(key);
    if (!request) {
      request = requestMatrix(data, apiKey);
      inFlight.set(key, request);
    }
    try {
      const matrix = await request;
      if (!matrix) return { status: "unavailable" };
      if (cache.size >= MATRIX_CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      cache.set(key, matrix);
      return { status: "success", ...matrix };
    } finally {
      inFlight.delete(key);
    }
  });
