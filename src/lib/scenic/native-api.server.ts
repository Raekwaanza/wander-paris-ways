import { isInParisMvpBounds } from "./paris-bounds";
import type {
  ForwardGeocodeInput,
  PedestrianRoutingInput,
  ReverseGeocodeInput,
  ViaRoutingInput,
  WalkingMatrixInput,
} from "./provider-contracts";
import type { LatLng } from "./types";
import type { NativeApiRateLimitClass, NativeApiRateLimitOutcome } from "./native-api-rate-limit";

export const NATIVE_API_MAX_BODY_BYTES = 16_384;
export const DEFAULT_NATIVE_API_ORIGINS = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
] as const;

type NativeApiValidator<T> = (value: unknown) => T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function parseParisPoint(value: unknown): LatLng {
  if (!isRecord(value) || !hasOnlyKeys(value, ["lat", "lng"])) {
    throw new Error("Invalid coordinate object");
  }
  const lat = value["lat"];
  const lng = value["lng"];
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180 ||
    !isInParisMvpBounds(lat, lng)
  ) {
    throw new Error("Coordinates must be inside the supported Paris area");
  }
  return { lat, lng };
}

export const validateNativeRoutingInput: NativeApiValidator<PedestrianRoutingInput> = (value) => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["from", "to"])) {
    throw new Error("Invalid routing request");
  }
  return { from: parseParisPoint(value["from"]), to: parseParisPoint(value["to"]) };
};

export const validateNativeViaInput: NativeApiValidator<ViaRoutingInput> = (value) => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["points"]) || !Array.isArray(value["points"])) {
    throw new Error("Invalid via-routing request");
  }
  if (value["points"].length < 2 || value["points"].length > 4) {
    throw new Error("Waypoint count must be between 2 and 4");
  }
  return { points: value["points"].map(parseParisPoint) };
};

export const validateNativeMatrixInput: NativeApiValidator<WalkingMatrixInput> = (value) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["locations"]) ||
    !Array.isArray(value["locations"])
  ) {
    throw new Error("Invalid Matrix request");
  }
  if (value["locations"].length < 2 || value["locations"].length > 20) {
    throw new Error("Matrix location count must be between 2 and 20");
  }
  return { locations: value["locations"].map(parseParisPoint) };
};

export const validateNativeForwardGeocodeInput: NativeApiValidator<ForwardGeocodeInput> = (
  value,
) => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["query", "proximity"])) {
    throw new Error("Invalid geocoding request");
  }
  const query = value["query"];
  if (
    typeof query !== "string" ||
    query.trim().length < 2 ||
    query.trim().length > 120 ||
    Array.from(query).some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new Error("Search query must contain 2 to 120 valid characters");
  }
  return {
    query: query.trim(),
    ...(value["proximity"] !== undefined ? { proximity: parseParisPoint(value["proximity"]) } : {}),
  };
};

export const validateNativeReverseGeocodeInput: NativeApiValidator<ReverseGeocodeInput> = (value) =>
  parseParisPoint(value);

function configuredOrigins(): Set<string> {
  const configured = process.env["SCENIC_NATIVE_ALLOWED_ORIGINS"] ?? "";
  return new Set([
    ...DEFAULT_NATIVE_API_ORIGINS,
    ...configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]);
}

export function isAllowedNativeApiOrigin(origin: string | null, allowed = configuredOrigins()) {
  return origin === null || allowed.has(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      }
    : {};
}

function jsonResponse(
  value: unknown,
  status: number,
  origin: string | null,
  additionalHeaders?: HeadersInit,
) {
  const headers = new Headers(corsHeaders(origin));
  new Headers(additionalHeaders).forEach((headerValue, headerName) => {
    headers.set(headerName, headerValue);
  });
  return Response.json(value, { status, headers });
}

function rejectOrigin(origin: string | null) {
  return jsonResponse({ error: "origin_not_allowed" }, 403, null);
}

export function nativeApiOptions(request: Request): Response {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedNativeApiOrigin(origin)) return rejectOrigin(origin);
  const requestedMethod = request.headers.get("access-control-request-method");
  if (requestedMethod && requestedMethod.toUpperCase() !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, origin);
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) throw new Error("Content-Type must be JSON");
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > NATIVE_API_MAX_BODY_BYTES) {
    throw new Error("Request body is too large");
  }
  const text = await request.text();
  if (!text || new TextEncoder().encode(text).byteLength > NATIVE_API_MAX_BODY_BYTES) {
    throw new Error("Request body is empty or too large");
  }
  return JSON.parse(text) as unknown;
}

export function createNativeApiPostHandler<T>(
  endpointClass: NativeApiRateLimitClass,
  validate: NativeApiValidator<T>,
  operation: (input: T) => Promise<unknown>,
  enforceRateLimits: (
    request: Request,
    endpointClass: NativeApiRateLimitClass,
  ) => Promise<NativeApiRateLimitOutcome> = async (request, rateLimitClass) => {
    const { enforceNativeApiRateLimits } = await import("./native-api-rate-limit.server");
    return enforceNativeApiRateLimits(request, rateLimitClass);
  },
) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    const origin = request.headers.get("origin");
    if (!isAllowedNativeApiOrigin(origin)) return rejectOrigin(origin);
    const rateLimit = await enforceRateLimits(request, endpointClass);
    if (rateLimit.status === "limited") {
      return jsonResponse(
        { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
        429,
        origin,
        {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      );
    }
    if (rateLimit.status === "unavailable") {
      return jsonResponse({ status: "unavailable" }, 503, origin, {
        "Cache-Control": "no-store",
      });
    }
    let input: T;
    try {
      input = validate(await readBoundedJson(request));
    } catch (error) {
      return jsonResponse(
        {
          error: "invalid_request",
          message: error instanceof Error ? error.message : "Invalid request",
        },
        400,
        origin,
      );
    }
    try {
      const result = await operation(input);
      const unavailable = isRecord(result) && result["status"] === "unavailable";
      return jsonResponse(result, unavailable ? 503 : 200, origin);
    } catch {
      return jsonResponse({ status: "unavailable" }, 503, origin);
    }
  };
}
