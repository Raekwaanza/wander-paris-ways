import type {
  ForwardGeocodeResult,
  PedestrianRouteResponse,
  ScenicProviderTransport,
  WalkingMatrixResponse,
} from "./provider-contracts";
import {
  parseForwardGeocodeResult,
  parsePedestrianRouteResponse,
  parseReverseGeocodeResult,
  parseWalkingMatrixResponse,
} from "./provider-response-validation";

export const NATIVE_PROVIDER_TIMEOUT_MS = 10_000;

const unavailableRoute = (): PedestrianRouteResponse => ({ status: "unavailable" });
const unavailableMatrix = (): WalkingMatrixResponse => ({ status: "unavailable" });
const unavailableGeocode = (): ForwardGeocodeResult => ({ status: "unavailable", places: [] });

export function buildScenicApiUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("Scenic API base URL must be a public HTTPS origin");
  }
  if (!path.startsWith("/api/v1/")) throw new Error("Invalid Scenic API path");
  return new URL(path, base.origin).toString();
}

type FetchLike = typeof fetch;

async function postJson(
  baseUrl: string | null,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<unknown | undefined> {
  if (!baseUrl) return undefined;
  let url: string;
  try {
    url = buildScenicApiUrl(baseUrl, path);
  } catch {
    return undefined;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export function createNativeScenicProviderTransport(
  baseUrl: string | null,
  fetchImpl: FetchLike = fetch,
  timeoutMs = NATIVE_PROVIDER_TIMEOUT_MS,
): ScenicProviderTransport {
  return {
    async route(input) {
      const payload = await postJson(
        baseUrl,
        "/api/v1/routing/routes",
        input,
        fetchImpl,
        timeoutMs,
      );
      return parsePedestrianRouteResponse(payload) ?? unavailableRoute();
    },
    async routeVia(input) {
      const payload = await postJson(baseUrl, "/api/v1/routing/via", input, fetchImpl, timeoutMs);
      return parsePedestrianRouteResponse(payload) ?? unavailableRoute();
    },
    async matrix(input) {
      const payload = await postJson(
        baseUrl,
        "/api/v1/routing/matrix",
        input,
        fetchImpl,
        timeoutMs,
      );
      return parseWalkingMatrixResponse(payload) ?? unavailableMatrix();
    },
    async forwardGeocode(input) {
      const payload = await postJson(
        baseUrl,
        "/api/v1/geocoding/search",
        input,
        fetchImpl,
        timeoutMs,
      );
      return parseForwardGeocodeResult(payload) ?? unavailableGeocode();
    },
    async reverseGeocode(input) {
      const payload = await postJson(
        baseUrl,
        "/api/v1/geocoding/reverse",
        input,
        fetchImpl,
        timeoutMs,
      );
      return parseReverseGeocodeResult(payload) ?? null;
    },
  };
}
