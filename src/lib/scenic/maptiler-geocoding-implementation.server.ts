import type {
  ForwardGeocodeInput,
  ForwardGeocodeResult,
  ReverseGeocodeInput,
  ReverseGeocodeResult,
} from "./provider-contracts";
import type { LatLng, Place } from "./types";

export const MAPTILER_GEOCODING_TIMEOUT_MS = 4_000;
export const PARIS_SEARCH_BOUNDS = {
  west: 2.2241,
  south: 48.8156,
  east: 2.4699,
  north: 48.9022,
} as const;
export const PARIS_SEARCH_CENTER = { lng: 2.3522, lat: 48.8566 } as const;
export const MAPTILER_SEARCH_LIMIT = 8;
export const MAPTILER_SEARCH_TYPES = [
  "address",
  "road",
  "poi",
  "place",
  "neighbourhood",
  "locality",
  "municipal_district",
] as const;
export const MIN_LIVE_SEARCH_LENGTH = 2;
export const MAX_LIVE_SEARCH_LENGTH = 120;

interface MapTilerFeature {
  id?: unknown;
  text?: unknown;
  place_name?: unknown;
  place_type?: unknown;
  center?: unknown;
  context?: unknown;
}

interface MapTilerResponse {
  features?: unknown;
  attribution?: unknown;
}

const LOCAL_TYPE_PRIORITY = [
  "address",
  "street",
  "road",
  "poi",
  "neighbourhood",
  "neighborhood",
  "locality",
  "municipal_district",
  "district",
  "place",
];

function featureTypes(feature: MapTilerFeature): string[] {
  return Array.isArray(feature.place_type)
    ? feature.place_type.filter((value): value is string => typeof value === "string")
    : [];
}

/** Selects only a concise provider-supplied local name, never a feature centroid. */
export function normalizeMapTilerReverseResult(payload: unknown): ReverseGeocodeResult | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as MapTilerResponse;
  if (!Array.isArray(response.features)) return null;
  const candidates = response.features.filter(
    (feature): feature is MapTilerFeature =>
      !!feature &&
      typeof feature === "object" &&
      typeof (feature as MapTilerFeature).text === "string",
  );
  const feature = candidates
    .map((candidate, index) => {
      const priorities = featureTypes(candidate)
        .map((type) => LOCAL_TYPE_PRIORITY.indexOf(type))
        .filter((priority) => priority >= 0);
      return { candidate, index, priority: priorities.length ? Math.min(...priorities) : Infinity };
    })
    .filter(({ priority }) => Number.isFinite(priority))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)[0]?.candidate;
  if (!feature) return null;
  const label = (feature.text as string).trim();
  if (!label) return null;
  const fullLabel = typeof feature.place_name === "string" ? feature.place_name.trim() : "";
  const featureId = typeof feature.id === "string" ? feature.id : "";
  const attribution = typeof response.attribution === "string" ? response.attribution.trim() : "";
  return {
    label,
    ...(fullLabel ? { fullLabel } : {}),
    ...(featureId ? { featureId } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

function insideParis(lat: number, lng: number) {
  return (
    lng >= PARIS_SEARCH_BOUNDS.west &&
    lng <= PARIS_SEARCH_BOUNDS.east &&
    lat >= PARIS_SEARCH_BOUNDS.south &&
    lat <= PARIS_SEARCH_BOUNDS.north
  );
}

function stableFallbackId(name: string, lat: number, lng: number) {
  const value = `${name.toLocaleLowerCase("fr")}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(36)}`;
}

function kindFor(types: string[]) {
  if (types.includes("address")) return "Address";
  if (types.includes("road") || types.includes("street")) return "Street";
  if (types.includes("neighbourhood") || types.includes("neighborhood")) return "Neighborhood";
  if (types.includes("locality")) return "Locality";
  if (types.includes("municipal_district") || types.includes("district")) return "District";
  return "Place";
}

function contextText(feature: MapTilerFeature) {
  if (!Array.isArray(feature.context)) return "Paris";
  const values = feature.context
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => (typeof item["text"] === "string" ? item["text"].trim() : ""))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .filter((value) => value.toLocaleLowerCase("fr") !== "france")
    .slice(0, 2);
  if (!values.some((value) => value.toLocaleLowerCase("fr").includes("paris")))
    values.push("Paris");
  return values.slice(0, 2).join(" · ") || "Paris";
}

export function normalizeMapTilerForwardResult(payload: unknown): ForwardGeocodeResult | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as MapTilerResponse;
  if (!Array.isArray(response.features)) return null;
  const places = response.features.flatMap((raw): Place[] => {
    if (!raw || typeof raw !== "object") return [];
    const feature = raw as MapTilerFeature;
    const types = featureTypes(feature);
    if (!types.some((type) => LOCAL_TYPE_PRIORITY.includes(type))) return [];
    if (!Array.isArray(feature.center) || feature.center.length < 2) return [];
    const [lng, lat] = feature.center;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    )
      return [];
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || !insideParis(lat, lng)) return [];
    if (typeof feature.text !== "string" || !feature.text.trim()) return [];
    const name = feature.text.trim();
    const rawId = typeof feature.id === "string" ? feature.id.trim() : "";
    return [
      {
        id: `maptiler:${rawId || stableFallbackId(name, lat, lng)}`,
        name,
        kind: kindFor(types),
        area: contextText(feature),
        lat,
        lng,
      },
    ];
  });
  const attribution = typeof response.attribution === "string" ? response.attribution.trim() : "";
  return { status: "success", places, ...(attribution ? { attribution } : {}) };
}

function validParisPoint(input: unknown): input is LatLng {
  if (!input || typeof input !== "object") return false;
  const point = input as LatLng;
  return (
    Number.isFinite(point.lat) && Number.isFinite(point.lng) && insideParis(point.lat, point.lng)
  );
}

async function mapTilerRequest(path: string, params: URLSearchParams): Promise<unknown | null> {
  const apiKey = process.env["MAPTILER_API_KEY"]?.trim();
  if (!apiKey) return null;
  params.set("key", apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAPTILER_GEOCODING_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.maptiler.com/geocoding/${path}.json?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function validateReverseGeocodeInput(input: ReverseGeocodeInput): ReverseGeocodeInput {
  if (
    !input ||
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng) ||
    input.lat < -90 ||
    input.lat > 90 ||
    input.lng < -180 ||
    input.lng > 180
  ) {
    throw new Error("Invalid reverse-geocoding coordinates");
  }
  return input;
}

export function validateForwardGeocodeInput(input: ForwardGeocodeInput) {
  if (!input || typeof input.query !== "string") throw new Error("Invalid search query");
  const query = input.query.trim();
  if (
    query.length < MIN_LIVE_SEARCH_LENGTH ||
    query.length > MAX_LIVE_SEARCH_LENGTH ||
    Array.from(query).some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new Error("Invalid search query");
  }
  return {
    query,
    proximity: validParisPoint(input.proximity) ? input.proximity : PARIS_SEARCH_CENTER,
  };
}

export async function reverseGeocodeWithMapTilerImplementation(
  input: ReverseGeocodeInput,
): Promise<ReverseGeocodeResult | null> {
  const coordinates = `${encodeURIComponent(input.lng)},${encodeURIComponent(input.lat)}`;
  const payload = await mapTilerRequest(coordinates, new URLSearchParams({ language: "fr" }));
  return payload ? normalizeMapTilerReverseResult(payload) : null;
}

export async function searchParisWithMapTilerImplementation(
  rawInput: ForwardGeocodeInput,
): Promise<ForwardGeocodeResult> {
  const input = validateForwardGeocodeInput(rawInput);
  const params = new URLSearchParams({
    bbox: `${PARIS_SEARCH_BOUNDS.west},${PARIS_SEARCH_BOUNDS.south},${PARIS_SEARCH_BOUNDS.east},${PARIS_SEARCH_BOUNDS.north}`,
    country: "fr",
    language: "fr",
    autocomplete: "true",
    limit: String(MAPTILER_SEARCH_LIMIT),
    proximity: `${input.proximity.lng},${input.proximity.lat}`,
    types: MAPTILER_SEARCH_TYPES.join(","),
  });
  const payload = await mapTilerRequest(encodeURIComponent(input.query), params);
  if (payload === null) return { status: "unavailable", places: [] };
  return normalizeMapTilerForwardResult(payload) ?? { status: "unavailable", places: [] };
}
