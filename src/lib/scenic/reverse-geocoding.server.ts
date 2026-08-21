import { createServerFn } from "@tanstack/react-start";

export const MAPTILER_REVERSE_GEOCODING_TIMEOUT_MS = 4_000;

export interface ReverseGeocodeResult {
  label: string;
  fullLabel?: string;
  featureId?: string;
  attribution?: string;
}

interface MapTilerFeature {
  id?: unknown;
  text?: unknown;
  place_name?: unknown;
  place_type?: unknown;
}

interface MapTilerResponse {
  features?: unknown;
  attribution?: unknown;
}

const LOCAL_TYPE_PRIORITY = [
  "address",
  "street",
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

function validateCoordinates(input: { lat: number; lng: number }) {
  if (
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

export const reverseGeocodeWithMapTiler = createServerFn({ method: "POST" })
  .validator(validateCoordinates)
  .handler(async ({ data }) => {
    const apiKey = process.env["MAPTILER_API_KEY"]?.trim();
    if (!apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAPTILER_REVERSE_GEOCODING_TIMEOUT_MS);
    try {
      const coordinates = `${encodeURIComponent(data.lng)},${encodeURIComponent(data.lat)}`;
      const params = new URLSearchParams({ key: apiKey, language: "fr" });
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${coordinates}.json?${params.toString()}`,
        { signal: controller.signal },
      );
      if (!response.ok) return null;
      return normalizeMapTilerReverseResult(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
