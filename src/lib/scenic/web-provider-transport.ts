import { searchParisWithMapTiler, reverseGeocodeWithMapTiler } from "./maptiler-geocoding.server";
import { walkingDurationMatrix } from "./openrouteservice-matrix.server";
import {
  routeViaOpenRouteService,
  routeWithOpenRouteService,
} from "./openrouteservice-routing.server";
import type { ScenicProviderTransport } from "./provider-contracts";

/** Browser transport: TanStack server functions retain their built-in CSRF protection. */
export const webScenicProviderTransport: ScenicProviderTransport = {
  route: (input) => routeWithOpenRouteService({ data: input }),
  routeVia: (input) => routeViaOpenRouteService({ data: input }),
  matrix: (input) => walkingDurationMatrix({ data: input }),
  forwardGeocode: (input) => searchParisWithMapTiler({ data: input }),
  reverseGeocode: (input) => reverseGeocodeWithMapTiler({ data: input }),
};
