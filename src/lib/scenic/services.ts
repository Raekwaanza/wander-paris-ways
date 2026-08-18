/**
 * Service boundary.
 *
 * Every external dependency the production app will need is declared here as an
 * interface and implemented by a mock backed by the seeded Paris dataset.
 * To go live, write an adapter (Overpass / Wikidata / OpenTripMap / Foursquare /
 * Mapbox Directions / Google Routes) that satisfies the same interface and swap
 * it in `services` below. No UI or routing-engine code needs to change.
 */
import { buildRoutes, buildWander, type BuildOptions } from "./routing";
import { PLACES, placeById, searchPlaces } from "./places";
import { POIS, poiById } from "./pois";
import type { LatLng, Place, Poi, ScenicRoute } from "./types";

export interface GeocodingService {
  search(query: string): Promise<Place[]>;
  byId(id: string): Place | undefined;
  all(): Place[];
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

const mockGeocoding: GeocodingService = {
  async search(query) {
    await delay(90);
    return searchPlaces(query);
  },
  byId: placeById,
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

export const services = {
  geocoding: mockGeocoding,
  pois: mockPois,
  routing: mockRouting,
  /** Flip to true once real providers are wired in. */
  isLive: false,
};
