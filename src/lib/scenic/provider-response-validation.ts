import type {
  ForwardGeocodeResult,
  PedestrianRouteResponse,
  ReverseGeocodeResult,
  WalkingMatrixResponse,
} from "./provider-contracts";
import type { LatLng, Place } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPoint(value: unknown): value is LatLng {
  if (!isRecord(value)) return false;
  return (
    typeof value["lat"] === "number" &&
    Number.isFinite(value["lat"]) &&
    value["lat"] >= -90 &&
    value["lat"] <= 90 &&
    typeof value["lng"] === "number" &&
    Number.isFinite(value["lng"]) &&
    value["lng"] >= -180 &&
    value["lng"] <= 180
  );
}

export function parsePedestrianRouteResponse(value: unknown): PedestrianRouteResponse | null {
  if (!isRecord(value)) return null;
  if (value["status"] === "unavailable") return { status: "unavailable" };
  if (value["status"] !== "success" || !Array.isArray(value["candidates"])) return null;
  for (const candidate of value["candidates"]) {
    if (!isRecord(candidate) || !Array.isArray(candidate["path"])) return null;
    if (candidate["path"].length < 2 || !candidate["path"].every(isPoint)) return null;
    if (
      typeof candidate["providerRank"] !== "number" ||
      !Number.isInteger(candidate["providerRank"]) ||
      candidate["providerRank"] < 0 ||
      typeof candidate["distanceMeters"] !== "number" ||
      !Number.isFinite(candidate["distanceMeters"]) ||
      candidate["distanceMeters"] < 0 ||
      typeof candidate["durationSeconds"] !== "number" ||
      !Number.isFinite(candidate["durationSeconds"]) ||
      candidate["durationSeconds"] < 0
    )
      return null;
  }
  return value as unknown as PedestrianRouteResponse;
}

export function parseWalkingMatrixResponse(value: unknown): WalkingMatrixResponse | null {
  if (!isRecord(value)) return null;
  if (value["status"] === "unavailable") return { status: "unavailable" };
  if (value["status"] !== "success" || !Array.isArray(value["durationsSeconds"])) return null;
  const rows = value["durationsSeconds"];
  if (
    rows.length < 2 ||
    !rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === rows.length &&
        row.every(
          (entry) =>
            entry === null || (typeof entry === "number" && Number.isFinite(entry) && entry >= 0),
        ),
    )
  )
    return null;
  return value as unknown as WalkingMatrixResponse;
}

function isPlace(value: unknown): value is Place {
  if (!isRecord(value)) return false;
  return (
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["kind"] === "string" &&
    typeof value["area"] === "string" &&
    isPoint(value)
  );
}

export function parseForwardGeocodeResult(value: unknown): ForwardGeocodeResult | null {
  if (!isRecord(value)) return null;
  if (value["status"] === "unavailable" && Array.isArray(value["places"])) {
    return { status: "unavailable", places: [] };
  }
  if (
    value["status"] !== "success" ||
    !Array.isArray(value["places"]) ||
    !value["places"].every(isPlace)
  )
    return null;
  return value as unknown as ForwardGeocodeResult;
}

export function parseReverseGeocodeResult(value: unknown): ReverseGeocodeResult | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || typeof value["label"] !== "string" || !value["label"].trim())
    return undefined;
  for (const key of ["fullLabel", "featureId", "attribution"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") return undefined;
  }
  return value as unknown as ReverseGeocodeResult;
}
