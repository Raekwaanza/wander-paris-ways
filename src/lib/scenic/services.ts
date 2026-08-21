/**
 * Service boundary.
 *
 * Every external dependency the production app will need is declared here as an
 * interface and implemented by a mock backed by the seeded Paris dataset.
 * To go live, write an adapter (Overpass / Wikidata / OpenTripMap / Foursquare /
 * a future provider) that satisfies the same interface and add its provider set
 * to `createScenicServices` below. No UI or routing-engine code needs to change.
 */
import { buildRoutes, buildWander, type BuildOptions } from "./routing";
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

const mockRouting: RoutingService = {
  async routes(from, to, opts) {
    await delay(140);
    return buildRoutes(from, to, opts);
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

const mockProviderSet = {
  geocoding: hybridGeocoding,
  pois: mockPois,
  routing: mockRouting,
};

export function createScenicServices(config = scenicConfig): ScenicServices {
  if (config.providerMode === "live") {
    // Live is a recognized future mode, but must never be reported as active
    // until a complete live provider set is implemented.
    console.warn("[Scenic Route] Live providers are not implemented; using the mock provider set.");
  }

  return {
    ...mockProviderSet,
    reverseGeocoding: mapTilerReverseGeocoding,
    provider: {
      configuredMode: config.providerMode,
      activeMode: "mock",
    },
  };
}

/** The single application-wide Scenic service initialization point. */
export const services = createScenicServices();
