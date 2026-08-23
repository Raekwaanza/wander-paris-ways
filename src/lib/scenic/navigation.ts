import type { ScenicRoute } from "./types";
import { getRenderableRouteGeometry } from "./route-geometry";

/** Only provider-supplied pedestrian-network geometry may enter route navigation. */
export function isNetworkNavigableRoute(route: ScenicRoute): boolean {
  return route.routingSource === "openrouteservice" && getRenderableRouteGeometry(route) !== null;
}
