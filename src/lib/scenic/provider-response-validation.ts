import type {
  ForwardGeocodeResult,
  PedestrianRouteResponse,
  PedestrianRouteResult,
  ReverseGeocodeResult,
  WalkingMatrixResponse,
} from "./provider-contracts";
import type { LatLng, Place, RouteInstruction, RouteInstructionManeuver } from "./types";

const MANEUVERS = new Set<RouteInstructionManeuver>([
  "depart",
  "straight",
  "left",
  "right",
  "sharp-left",
  "sharp-right",
  "slight-left",
  "slight-right",
  "roundabout",
  "roundabout-exit",
  "u-turn",
  "keep-left",
  "keep-right",
  "arrive",
  "unknown",
]);

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

function sanitizedText(value: unknown, maximumLength: number): string | undefined {
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

function parseRouteInstruction(value: unknown, path: LatLng[]): RouteInstruction | undefined {
  if (!isRecord(value)) return;
  const instruction = sanitizedText(value["instruction"], 500);
  const streetName = sanitizedText(value["streetName"], 200);
  const providerType = value["providerType"];
  const maneuver = value["maneuver"];
  const distanceMeters = value["distanceMeters"];
  const durationSeconds = value["durationSeconds"];
  const fromPathIndex = value["fromPathIndex"];
  const toPathIndex = value["toPathIndex"];
  const distanceAlongRouteMeters = value["distanceAlongRouteMeters"];
  if (
    !instruction ||
    typeof providerType !== "number" ||
    !Number.isInteger(providerType) ||
    providerType < 0 ||
    typeof maneuver !== "string" ||
    !MANEUVERS.has(maneuver as RouteInstructionManeuver) ||
    typeof distanceMeters !== "number" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0 ||
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0 ||
    typeof fromPathIndex !== "number" ||
    !Number.isInteger(fromPathIndex) ||
    typeof toPathIndex !== "number" ||
    !Number.isInteger(toPathIndex) ||
    fromPathIndex < 0 ||
    toPathIndex < fromPathIndex ||
    toPathIndex >= path.length ||
    typeof distanceAlongRouteMeters !== "number" ||
    !Number.isFinite(distanceAlongRouteMeters) ||
    distanceAlongRouteMeters < 0
  ) {
    return;
  }
  return {
    providerType,
    maneuver: maneuver as RouteInstructionManeuver,
    instruction,
    ...(streetName ? { streetName } : {}),
    distanceMeters,
    durationSeconds,
    fromPathIndex,
    toPathIndex,
    position: path[fromPathIndex]!,
    distanceAlongRouteMeters,
  };
}

export function parsePedestrianRouteResponse(value: unknown): PedestrianRouteResponse | null {
  if (!isRecord(value)) return null;
  if (value["status"] === "unavailable") return { status: "unavailable" };
  if (value["status"] !== "success" || !Array.isArray(value["candidates"])) return null;
  const candidates: PedestrianRouteResult[] = [];
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
    const path = candidate["path"] as LatLng[];
    const instructions = Array.isArray(candidate["instructions"])
      ? candidate["instructions"].flatMap((item) => {
          const parsed = parseRouteInstruction(item, path);
          return parsed ? [parsed] : [];
        })
      : undefined;
    candidates.push({
      providerRank: candidate["providerRank"],
      path,
      distanceMeters: candidate["distanceMeters"],
      durationSeconds: candidate["durationSeconds"],
      ...(instructions?.length ? { instructions } : {}),
      ...(typeof candidate["startOffsetMeters"] === "number" &&
      Number.isFinite(candidate["startOffsetMeters"]) &&
      candidate["startOffsetMeters"] >= 0
        ? { startOffsetMeters: candidate["startOffsetMeters"] }
        : {}),
      ...(typeof candidate["endOffsetMeters"] === "number" &&
      Number.isFinite(candidate["endOffsetMeters"]) &&
      candidate["endOffsetMeters"] >= 0
        ? { endOffsetMeters: candidate["endOffsetMeters"] }
        : {}),
      ...(typeof candidate["attribution"] === "string" && candidate["attribution"].trim()
        ? { attribution: candidate["attribution"].trim().slice(0, 500) }
        : {}),
    });
  }
  return { status: "success", candidates };
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
