/**
 * Service boundary.
 *
 * Every external dependency the production app will need is declared here as an
 * interface and implemented by the current hybrid provider stack.
 * To go live, write an adapter (Overpass / Wikidata / OpenTripMap / Foursquare /
 * a future provider) that satisfies the same interface and add its provider set
 * to `createScenicServices` below. No UI or routing-engine code needs to change.
 */
import { applyPaceMultiplier, buildRoutes, buildWander, type BuildOptions } from "./routing";
import {
  routeWithOpenRouteService,
  type PedestrianRouteResponse,
} from "./openrouteservice-routing.server";
import { PLACES, placeById, searchPlaces } from "./places";
import { POIS, poiById } from "./pois";
import { scenicConfig, type ScenicProviderMode } from "./config";
import { reverseGeocodeWithMapTiler, type ReverseGeocodeResult } from "./reverse-geocoding.server";
import { searchParisWithMapTiler, type ForwardGeocodeResult } from "./maptiler-geocoding.server";
import { livePlaceById, registerLivePlaces } from "./live-places";
import type { LatLng, Place, Poi, ScenicRoute } from "./types";

export interface GeocodingService {
  search(query: string, proximity?: LatLng): Promise<GeocodingSearchResult>;
  byId(id: string): Place | undefined;
  all(): Place[];
}

export interface GeocodingSearchResult {
  places: Place[];
  source: "maptiler" | "seeded";
  fallback: boolean;
  attribution?: string;
}

export interface ReverseGeocodingService {
  reverse(point: LatLng): Promise<ReverseGeocodeResult | null>;
}

export interface PoiService {
  near(point: LatLng, radiusKm: number): Promise<Poi[]>;
  byId(id: string): Poi | undefined;
  all(): Poi[];
}

export interface RoutingService {
  routes(from: LatLng, to: LatLng, opts: BuildOptions): Promise<ScenicRoute[]>;
  wander(from: LatLng, to: LatLng, minutes: number, opts: BuildOptions): Promise<ScenicRoute>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seededSearch = async (query: string): Promise<GeocodingSearchResult> => {
  await delay(90);
  return { places: searchPlaces(query), source: "seeded", fallback: false };
};

const hybridGeocoding: GeocodingService = {
  async search(query, proximity) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return seededSearch(trimmed);
    let result: ForwardGeocodeResult;
    try {
      result = await searchParisWithMapTiler({
        data: { query: trimmed, ...(proximity ? { proximity } : {}) },
      });
    } catch {
      result = { status: "unavailable", places: [] };
    }
    if (result.status === "unavailable") {
      const seeded = await seededSearch(trimmed);
      return { ...seeded, fallback: true };
    }
    registerLivePlaces(result.places);
    return {
      places: result.places,
      source: "maptiler",
      fallback: false,
      ...(result.attribution ? { attribution: result.attribution } : {}),
    };
  },
  byId: (id) => livePlaceById(id) ?? placeById(id),
  all: () => PLACES,
};

const mockPois: PoiService = {
  async near(point, radiusKm) {
    await delay(60);
    return POIS.filter(
      (p) => Math.hypot((p.lng - point.lng) * 73.4, (p.lat - point.lat) * 111.2) <= radiusKm,
    );
  },
  byId: poiById,
  all: () => POIS,
};

function stableFastestId(from: LatLng, to: LatLng) {
  const value = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ors-fastest-${(hash >>> 0).toString(36)}`;
}

const routeResponseCache = new Map<string, PedestrianRouteResponse>();
const routeResponseInFlight = new Map<string, Promise<PedestrianRouteResponse>>();
const SESSION_ROUTE_CACHE_LIMIT = 32;

function routeCoordinateKey(from: LatLng, to: LatLng) {
  return `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
}

async function cachedOpenRouteServiceRoute(from: LatLng, to: LatLng) {
  const key = routeCoordinateKey(from, to);
  const cached = routeResponseCache.get(key);
  if (cached) return cached;
  const existing = routeResponseInFlight.get(key);
  if (existing) return existing;

  const request = routeWithOpenRouteService({ data: { from, to } });
  routeResponseInFlight.set(key, request);
  try {
    const response = await request;
    if (response.status === "success") {
      if (routeResponseCache.size >= SESSION_ROUTE_CACHE_LIMIT) {
        routeResponseCache.delete(routeResponseCache.keys().next().value as string);
      }
      routeResponseCache.set(key, response);
    }
    return response;
  } finally {
    routeResponseInFlight.delete(key);
  }
}

const hybridRouting: RoutingService = {
  async routes(from, to, opts) {
    const mockRoutes = buildRoutes(from, to, opts);
    let response;
    try {
      response = await cachedOpenRouteServiceRoute(from, to);
    } catch {
      return mockRoutes;
    }
    if (response.status !== "success") return mockRoutes;

    const provider = response.route;
    const providerMinutes = provider.durationSeconds / 60;
    const pacedMinutes = applyPaceMultiplier(providerMinutes, opts.pace ?? "steady");
    const minutes = provider.durationSeconds > 0 ? Math.max(1, Math.round(pacedMinutes)) : 0;
    const fastest: ScenicRoute = {
      id: stableFastestId(from, to),
      profile: "fastest",
      title: "Fastest",
      blurb: "The most direct walking route.",
      minutes,
      km: Math.round((provider.distanceMeters / 1_000) * 10) / 10,
      extraMinutes: 0,
      discoveries: [],
      path: provider.path,
      matchedInterests: [],
      reasons: [],
      routingSource: "openrouteservice",
      ...(provider.attribution ? { attribution: provider.attribution } : {}),
    };
    return [
      fastest,
      ...mockRoutes.slice(1).map((route) => ({
        ...route,
        extraMinutes: Math.max(0, route.minutes - fastest.minutes),
      })),
    ];
  },
  async wander(from, to, minutes, opts) {
    await delay(140);
    return buildWander(from, to, minutes, opts);
  },
};

const mapTilerReverseGeocoding: ReverseGeocodingService = {
  reverse: (point) => reverseGeocodeWithMapTiler({ data: point }),
};

interface ScenicServices {
  geocoding: GeocodingService;
  pois: PoiService;
  routing: RoutingService;
  reverseGeocoding: ReverseGeocodingService;
  provider: {
    configuredMode: ScenicProviderMode;
    activeMode: ScenicProviderMode;
  };
}

const hybridProviderSet = {
  geocoding: hybridGeocoding,
  pois: mockPois,
  routing: hybridRouting,
};

export function createScenicServices(config = scenicConfig): ScenicServices {
  if (config.providerMode === "live") {
    // Live is a recognized future mode, but must never be reported as active
    // until a complete live provider set is implemented.
    console.warn(
      "[Scenic Route] Full live mode is not implemented; using the hybrid provider set.",
    );
  }

  return {
    ...hybridProviderSet,
    reverseGeocoding: mapTilerReverseGeocoding,
    provider: {
      configuredMode: config.providerMode,
      activeMode: "mock",
    },
  };
}

/** The single application-wide Scenic service initialization point. */
export const services = createScenicServices();
