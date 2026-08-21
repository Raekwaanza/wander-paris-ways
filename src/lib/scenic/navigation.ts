import type { ScenicRoute } from "./types";

/** Only provider-supplied pedestrian-network geometry may enter route navigation. */
export function isNetworkNavigableRoute(route: ScenicRoute): boolean {
  return route.routingSource === "openrouteservice";
}
