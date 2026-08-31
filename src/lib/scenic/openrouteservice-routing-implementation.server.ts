import { distanceKm, routeGeometrySignature } from "./geo";
import type {
  PedestrianRouteResponse,
  PedestrianRouteResult,
  PedestrianRoutingInput,
  ViaRoutingInput,
} from "./provider-contracts";
import type { LatLng, RouteInstruction, RouteInstructionManeuver } from "./types";
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
const OPENROUTESERVICE_CACHE_VERSION = "alternatives-instructions-v2";
const VIA_CACHE_VERSION = "wander-via-instructions-v2";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function providerText(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string") return;
  const withoutControlCharacters = [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
    .join("");
  const text = withoutControlCharacters
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, maximumLength) : undefined;
}

export function maneuverForOpenRouteServiceType(type: number): RouteInstructionManeuver {
  return (
    (
      {
        0: "left",
        1: "right",
        2: "sharp-left",
        3: "sharp-right",
        4: "slight-left",
        5: "slight-right",
        6: "straight",
        7: "roundabout",
        8: "roundabout-exit",
        9: "u-turn",
        10: "arrive",
        11: "depart",
        12: "keep-left",
        13: "keep-right",
      } as Record<number, RouteInstructionManeuver>
    )[type] ?? "unknown"
  );
}

function cumulativePathDistances(path: LatLng[]): number[] {
  const distances = [0];
  for (let index = 1; index < path.length; index += 1) {
    distances.push(distances[index - 1]! + distanceKm(path[index - 1]!, path[index]!) * 1_000);
  }
  return distances;
}

function normalizeInstructions(properties: Record<string, unknown> | undefined, path: LatLng[]) {
  const segments = properties?.["segments"];
  if (!Array.isArray(segments)) return undefined;
  const distances = cumulativePathDistances(path);
  const instructions: RouteInstruction[] = [];
  for (const segment of segments) {
    if (!isRecord(segment) || !Array.isArray(segment["steps"])) continue;
    for (const step of segment["steps"]) {
      if (!isRecord(step)) continue;
      const instruction = providerText(step["instruction"], 500);
      const type = step["type"];
      const distance = step["distance"];
      const duration = step["duration"];
      const wayPoints = step["way_points"];
      if (
        !instruction ||
        typeof type !== "number" ||
        !Number.isInteger(type) ||
        type < 0 ||
        typeof distance !== "number" ||
        !Number.isFinite(distance) ||
        distance < 0 ||
        typeof duration !== "number" ||
        !Number.isFinite(duration) ||
        duration < 0 ||
        !Array.isArray(wayPoints) ||
        wayPoints.length < 2 ||
        !wayPoints.every((index) => typeof index === "number" && Number.isInteger(index))
      ) {
        continue;
      }
      const fromPathIndex = wayPoints[0]!;
      const toPathIndex = wayPoints[1]!;
      if (
        fromPathIndex < 0 ||
        toPathIndex < fromPathIndex ||
        fromPathIndex >= path.length ||
        toPathIndex >= path.length
      ) {
        continue;
      }
      const streetName = providerText(step["name"], 200);
      instructions.push({
        providerType: type,
        maneuver: maneuverForOpenRouteServiceType(type),
        instruction,
        ...(streetName ? { streetName } : {}),
        distanceMeters: distance,
        durationSeconds: duration,
        fromPathIndex,
        toPathIndex,
        position: path[fromPathIndex]!,
        distanceAlongRouteMeters: distances[fromPathIndex]!,
      });
    }
  }
  return instructions.length > 0 ? instructions : undefined;
}

export function normalizeOpenRouteServiceResponse(
  payload: unknown,
  requestedEndpoints?: PedestrianRoutingInput,
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
    const instructions = normalizeInstructions(properties, path);
    const signature = routeGeometrySignature(path);
    if (geometrySignatures.has(signature)) continue;
    geometrySignatures.add(signature);
    candidates.push({
      providerRank,
      path,
      distanceMeters: distance,
      durationSeconds: duration,
      ...(instructions ? { instructions } : {}),
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

export function buildOpenRouteServiceRouteBody(coordinates: number[][], alternatives: boolean) {
  return {
    coordinates,
    preference: "shortest",
    instructions: true,
    instructions_format: "text",
    ...(alternatives ? { alternative_routes: OPENROUTESERVICE_ALTERNATIVE_ROUTES } : {}),
  };
}

export function validProviderPoint(point: unknown): point is LatLng {
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

export function validateRoutingInput(input: PedestrianRoutingInput): PedestrianRoutingInput {
  if (!input || !validProviderPoint(input.from) || !validProviderPoint(input.to)) {
    throw new Error("Invalid routing coordinates");
  }
  return input;
}

export function validateViaRoutingInput(input: ViaRoutingInput): ViaRoutingInput {
  if (
    !input ||
    !Array.isArray(input.points) ||
    input.points.length < 2 ||
    input.points.length > 4
  ) {
    throw new Error("Invalid waypoint count");
  }
  if (!input.points.every(validProviderPoint)) throw new Error("Invalid routing coordinates");
  return input;
}

function cacheKey({ from, to }: PedestrianRoutingInput) {
  return `${OPENROUTESERVICE_CACHE_VERSION}:${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
}

function remember(key: string, candidates: PedestrianRouteResult[]) {
  if (routeCache.size >= OPENROUTESERVICE_CACHE_LIMIT) {
    routeCache.delete(routeCache.keys().next().value as string);
  }
  routeCache.set(key, candidates);
}

async function requestRoute(input: PedestrianRoutingInput, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTESERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTESERVICE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(
        buildOpenRouteServiceRouteBody(
          [
            [input.from.lng, input.from.lat],
            [input.to.lng, input.to.lat],
          ],
          true,
        ),
      ),
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
      body: JSON.stringify(
        buildOpenRouteServiceRouteBody(
          input.points.map(({ lng, lat }) => [lng, lat]),
          false,
        ),
      ),
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

export async function routeViaOpenRouteServiceImplementation(
  input: ViaRoutingInput,
): Promise<PedestrianRouteResponse> {
  if (isScenicE2EFixtureMode()) {
    return { status: "success", candidates: [fixtureViaCandidate(input.points)] };
  }
  const apiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
  if (!apiKey) return { status: "unavailable" };
  const key = `${VIA_CACHE_VERSION}:${input.points
    .map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
    .join(":")}`;
  const cached = viaRouteCache.get(key);
  if (cached) return { status: "success", candidates: [cached] };
  let request = viaInFlight.get(key);
  if (!request) {
    request = requestViaRoute(input, apiKey);
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
}

export async function routeWithOpenRouteServiceImplementation(
  input: PedestrianRoutingInput,
): Promise<PedestrianRouteResponse> {
  if (isScenicE2EFixtureMode()) {
    return { status: "success", candidates: fixturePedestrianCandidates(input.from, input.to) };
  }
  const apiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
  if (!apiKey) {
    if (!warnedMissingKey && process.env["NODE_ENV"] !== "production") {
      warnedMissingKey = true;
      console.warn("[Scenic Route] ORS key absent; using mock Fastest.");
    }
    return { status: "unavailable" };
  }

  const key = cacheKey(input);
  const cached = routeCache.get(key);
  if (cached) return { status: "success", candidates: cached };
  let request = inFlight.get(key);
  if (!request) {
    request = requestRoute(input, apiKey);
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
}
